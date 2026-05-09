import { anthropic } from '@ai-sdk/anthropic'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from 'ai'
import type { Locale } from '@/i18n/config'
import { buildSystemPrompt, staticSystemBlocks } from '@/lib/agent/prompt'
import { buildTools } from '@/lib/agent/tools'
import type { ConversationState } from '@/lib/agent/types'
import { isAgentDisabled } from '@/lib/env'
import { submitLead } from '@/lib/leads/submit-lead'
import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'
import { sanitizeForTTS } from '@/lib/voice/sanitize'
import { sentenceFlush } from '@/lib/voice/sentence-splitter'
import { synthesizeAndStoreSentence } from '@/lib/voice/tts'

export const maxDuration = 60

type ChatBody = {
  messages: UIMessage[]
  conversationId: string
  language: Locale
  state: Pick<ConversationState, 'step' | 'captured' | 'turnCount'>
  voiceEnabled?: boolean
}

const CONSENT_TEXT =
  'I agree to share my contact info and health details with Perla Dental Clinics for the purpose of medical consultation.'

export async function POST(req: Request) {
  if (isAgentDisabled()) {
    return new Response('Agent disabled', { status: 503 })
  }

  const body = (await req.json()) as ChatBody
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const country = req.headers.get('x-vercel-ip-country') ?? undefined

  const stateForPrompt: ConversationState = {
    conversationId: body.conversationId,
    language: body.language,
    step: body.state.step,
    captured: body.state.captured,
    turnCount: body.state.turnCount,
  }

  const staticBlocks = staticSystemBlocks()
  // Dynamic portion (STATE + LANGUAGE) — everything after the cached static block.
  const dynamicBlocks = buildSystemPrompt(stateForPrompt).slice(staticBlocks.length).trimStart()

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const tools = buildTools({
        onSubmitLead: async (input) => {
          const result = await submitLead({
            ip,
            conversationId: body.conversationId,
            input,
            consentText: CONSENT_TEXT,
            countryCode: country,
            source: 'direct',
          })
          if (result.success) {
            await audit({
              kind: 'lead_submitted',
              leadId: result.leadId,
              conversationId: body.conversationId,
            })
            return { leadId: result.leadId }
          }
          throw new Error(`submitLead failed: ${result.reason}`)
        },
        onEscalateEmergency: async (input) => {
          await audit({
            kind: 'emergency_escalated',
            conversationId: body.conversationId,
            summary: input.summary,
          })
          return { ack: true }
        },
      })

      console.log('[chat] request', {
        conversationId: body.conversationId,
        language: body.language,
        voiceEnabled: body.voiceEnabled,
        msgCount: body.messages.length,
      })

      // TTS calls run in PARALLEL (faster) — each audio part includes a
      // sequence index so the client can play them in order regardless of
      // synthesis-completion order.
      let nextIndex = 0
      const pending: Promise<void>[] = []

      const splitter = sentenceFlush({
        onSentence: (sentence) => {
          const cleaned = sanitizeForTTS(sentence)
          console.log('[chat] sentence flushed', {
            voiceEnabled: body.voiceEnabled,
            preview: cleaned.slice(0, 60),
          })
          if (!body.voiceEnabled) return
          // Skip TTS for empty / single-character fragments after sanitizing.
          // Saves an API call and avoids audible artifacts.
          if (cleaned.length < 2) return

          const index = nextIndex++
          pending.push(
            (async () => {
              try {
                const url = await synthesizeAndStoreSentence(cleaned, body.language)
                console.log('[chat] writing data-audio part', { index, url })
                writer.write({ type: 'data-audio', transient: true, data: { index, url } })
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error('[chat] TTS sentence synthesis failed:', msg)
                logger.error({ err }, 'TTS sentence synthesis failed')
              }
            })(),
          )
        },
      })

      const result = streamText({
        model: anthropic('claude-haiku-4-5'),
        // We split the system prompt: static cacheable block (gets 1h
        // ephemeral cache) + dynamic state/language block. AI SDK 6 wants
        // explicit acknowledgment for system-as-message; passing
        // `allowSystemInMessages: true` is the documented escape hatch.
        allowSystemInMessages: true,
        messages: [
          {
            role: 'system',
            content: staticBlocks,
            providerOptions: {
              anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
            },
          } as never,
          {
            role: 'system',
            content: dynamicBlocks,
          } as never,
          ...(await convertToModelMessages(body.messages)),
        ],
        tools,
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta') splitter.push(chunk.text)
        },
        onFinish: async () => {
          splitter.flush()
          // Wait for all parallel TTS calls to finish before the response
          // closes — otherwise the last audio chunks never reach the client.
          await Promise.allSettled(pending)
        },
      })

      result.consumeStream()
      writer.merge(result.toUIMessageStream())
    },
  })

  return createUIMessageStreamResponse({ stream })
}
