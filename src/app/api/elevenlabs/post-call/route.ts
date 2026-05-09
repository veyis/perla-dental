/**
 * ElevenLabs post-call webhook receiver.
 *
 * ElevenLabs POSTs a JSON envelope after each conversation ends with the
 * full transcript, evaluation results, and `data_collection` items. We
 * verify the HMAC signature, log the analysis as a structured audit
 * event, and ack with 200 immediately — webhooks are auto-disabled after
 * repeated failures, so any heavy work happens after the response.
 *
 * Configure in the ElevenLabs dashboard:
 *   Workspace → Webhooks → Post-call Transcription
 *   Secret → set ELEVENLABS_WEBHOOK_SECRET in Vercel
 *
 * Signature header format follows the standard `t=<unix>,v0=<hex>`
 * pattern. Signed payload is `<timestamp>.<raw_body>`.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'

export const maxDuration = 30

const MAX_TIMESTAMP_SKEW_SECS = 5 * 60

type PostCallEnvelope = {
  type?: string // "post_call_transcription" | "post_call_audio" | "call_initiation_failure"
  event_timestamp?: number
  data?: {
    agent_id?: string
    conversation_id?: string
    status?: string
    transcript?: unknown
    metadata?: Record<string, unknown>
    analysis?: {
      evaluation_criteria_results?: Record<string, { result?: string; rationale?: string }>
      data_collection_results?: Record<string, { value?: unknown; rationale?: string }>
      transcript_summary?: string
      call_successful?: string
    }
  }
}

function parseSignatureHeader(header: string | null): { timestamp: number; hash: string } | null {
  if (!header) return null
  let timestamp: number | null = null
  let hash: string | null = null
  for (const part of header.split(',')) {
    const [k, v] = part.split('=')
    if (!k || !v) continue
    if (k.trim() === 't') timestamp = Number(v.trim())
    else if (k.trim() === 'v0') hash = v.trim()
  }
  if (!timestamp || !hash || Number.isNaN(timestamp)) return null
  return { timestamp, hash }
}

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  const parsed = parseSignatureHeader(header)
  if (!parsed) return false

  const nowSecs = Math.floor(Date.now() / 1000)
  if (Math.abs(nowSecs - parsed.timestamp) > MAX_TIMESTAMP_SKEW_SECS) return false

  const expected = createHmac('sha256', secret)
    .update(`${parsed.timestamp}.${rawBody}`)
    .digest('hex')

  if (expected.length !== parsed.hash.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parsed.hash, 'hex'))
  } catch {
    return false
  }
}

export async function POST(req: Request): Promise<Response> {
  const secret = env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) {
    logger.warn({}, '[post-call] webhook hit but ELEVENLABS_WEBHOOK_SECRET not configured')
    return new Response('webhook secret not configured', { status: 503 })
  }

  const raw = await req.text()
  const sigHeader =
    req.headers.get('elevenlabs-signature') ?? req.headers.get('ElevenLabs-Signature')

  if (!verifySignature(raw, sigHeader, secret)) {
    logger.warn({ sigHeader: sigHeader?.slice(0, 40) }, '[post-call] signature verification failed')
    return new Response('invalid signature', { status: 401 })
  }

  let envelope: PostCallEnvelope
  try {
    envelope = JSON.parse(raw) as PostCallEnvelope
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error({ err: msg }, '[post-call] invalid JSON')
    return new Response('invalid json', { status: 400 })
  }

  const conversationId = envelope.data?.conversation_id ?? 'unknown'
  const eventType = envelope.type ?? 'unknown'

  logger.info(
    {
      type: eventType,
      conversationId,
      agentId: envelope.data?.agent_id,
      status: envelope.data?.status,
      summary: envelope.data?.analysis?.transcript_summary?.slice(0, 200),
      evals: envelope.data?.analysis?.evaluation_criteria_results,
      dataCollection: envelope.data?.analysis?.data_collection_results,
    },
    '[post-call] received',
  )

  // Persist a single guardrail_event row so we can join post-call analysis
  // back to mid-call audit rows by conversation_id.
  const dataCollection = envelope.data?.analysis?.data_collection_results ?? {}
  const evaluation = envelope.data?.analysis?.evaluation_criteria_results ?? {}
  const summary = [
    `type=${eventType}`,
    `success=${envelope.data?.analysis?.call_successful ?? 'unknown'}`,
    `lead_captured=${dataCollection.lead_captured?.value ?? 'unknown'}`,
    `emergency_flagged=${dataCollection.emergency_flagged?.value ?? 'unknown'}`,
    `pricing_pressed=${dataCollection.pricing_pressed?.value ?? 'unknown'}`,
    `pricing_held=${evaluation.pricing_guardrail_held?.result ?? 'unknown'}`,
  ].join(' ')

  await audit({ kind: 'guardrail_event', conversationId, detail: `post_call: ${summary}` })

  return new Response('ok', { status: 200 })
}
