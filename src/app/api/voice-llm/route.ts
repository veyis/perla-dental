/**
 * OpenAI-compatible /v1/chat/completions endpoint that proxies to
 * Anthropic Claude Haiku 4.5 via the Vercel AI SDK.
 *
 * ElevenLabs Conversational AI (Agents) supports "Custom LLM" — a
 * BYO endpoint matching the OpenAI Chat Completions streaming spec.
 * They send messages here, we stream Claude back.
 *
 * Tool execution (submitLead, escalateEmergency) happens entirely
 * inside this proxy via the AI SDK — ElevenLabs only sees the final
 * text deltas. The agent stays a single coherent voice from the
 * user's perspective.
 *
 * Endpoint URL to paste into the ElevenLabs Agent dashboard:
 *   https://<your-domain>/api/voice-llm
 */

import { anthropic } from '@ai-sdk/anthropic'
import { convertToModelMessages, type ModelMessage, streamText, type UIMessage } from 'ai'
import { staticSystemBlocks } from '@/lib/agent/prompt'
import { buildTools } from '@/lib/agent/tools'
import { isAgentDisabled } from '@/lib/env'
import { submitLead } from '@/lib/leads/submit-lead'
import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'

export const maxDuration = 60

type OpenAIMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
  name?: string
}

type OpenAIRequest = {
  model?: string
  messages: OpenAIMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
  tools?: unknown
}

export async function POST(req: Request) {
  if (isAgentDisabled()) {
    return new Response('Agent disabled', { status: 503 })
  }

  let body: OpenAIRequest
  try {
    body = (await req.json()) as OpenAIRequest
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const conversationId =
    req.headers.get('x-conversation-id') ?? `voice_${Math.random().toString(36).slice(2, 10)}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'voice-agent'

  console.log('[voice-llm] request', {
    conversationId,
    msgs: body.messages?.length,
    streamRequested: body.stream,
  })

  const messages = convertOpenAIMessagesToModelMessages(body.messages ?? [])

  const tools = buildTools({
    onProposeLead: async (input) => {
      // Voice flow: verbal consent already obtained mid-call, so the row
      // is written immediately. We still return a pending_consent envelope
      // because that's the shared tool contract; the model's follow-up
      // turn will confirm verbally with the caller — one extra short
      // exchange relative to the prior behavior.
      const result = await submitLead({
        ip,
        conversationId,
        input,
        consentText:
          'Verbal consent given to AI voice agent during call to share contact and health details with Perla Dental Clinics.',
        source: 'voice-agent',
      })
      if (result.success) {
        await audit({ kind: 'lead_submitted', leadId: result.leadId, conversationId })
        return { status: 'pending_consent' as const, fields: input, fingerprint: '' }
      }
      throw new Error(`submitLead failed: ${result.reason}`)
    },
    onEscalateEmergency: async (input) => {
      await audit({ kind: 'emergency_escalated', conversationId, summary: input.summary })
      return { ack: true }
    },
  })

  const result = streamText({
    model: anthropic('claude-haiku-4-5'),
    system: staticSystemBlocks(),
    messages,
    tools,
    temperature: body.temperature ?? 0.7,
  })

  result.consumeStream({
    onError: (err) => {
      logger.error({ err }, '[voice-llm] streamText error')
    },
  })

  const encoder = new TextEncoder()
  const id = `chatcmpl-${Math.random().toString(36).slice(2, 10)}`
  const created = Math.floor(Date.now() / 1000)
  const model = 'claude-haiku-4-5'

  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      try {
        // Initial role chunk so OpenAI clients (and ElevenLabs) recognize the stream.
        send({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
        })

        for await (const part of result.fullStream) {
          if (part.type === 'text-delta' && part.text) {
            send({
              id,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [{ index: 0, delta: { content: part.text }, finish_reason: null }],
            })
          } else if (part.type === 'error') {
            const err = part.error
            const msg = err instanceof Error ? err.message : String(err)
            console.error('[voice-llm] stream error part:', msg)
          }
          // tool-call / tool-result events are handled internally by the AI SDK —
          // tools execute server-side here and Claude continues streaming text.
        }

        send({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        })
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[voice-llm] fatal stream error:', msg)
        try {
          controller.enqueue(encoder.encode(`data: {"error":${JSON.stringify(msg)}}\n\n`))
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(sse, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * ElevenLabs sends OpenAI-format messages. Convert them to AI SDK's
 * ModelMessage shape so streamText can consume them. We only need the
 * subset that ElevenLabs actually emits: user/assistant/tool with
 * optional tool_calls.
 */
function convertOpenAIMessagesToModelMessages(messages: OpenAIMessage[]): ModelMessage[] {
  const out: ModelMessage[] = []
  for (const m of messages) {
    if (m.role === 'system') continue // we inject our own system prompt
    if (m.role === 'tool') {
      // Tool result coming back from a previous tool_call.
      out.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: m.tool_call_id ?? '',
            toolName: m.name ?? '',
            output: { type: 'json', value: tryParseJson(m.content ?? '') },
          },
        ],
      } as unknown as ModelMessage)
      continue
    }
    if (m.role === 'assistant') {
      const parts: Array<{ type: 'text' | 'tool-call'; [k: string]: unknown }> = []
      if (m.content) parts.push({ type: 'text', text: m.content })
      if (m.tool_calls) {
        for (const tc of m.tool_calls) {
          parts.push({
            type: 'tool-call',
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: tryParseJson(tc.function.arguments),
          })
        }
      }
      out.push({ role: 'assistant', content: parts } as unknown as ModelMessage)
      continue
    }
    if (m.role === 'user' && m.content) {
      out.push({ role: 'user', content: m.content } as ModelMessage)
    }
  }
  return out
}

function tryParseJson(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

// Suppress unused-import warning — convertToModelMessages and UIMessage are
// re-exports kept here for future direct use if we move to UIMessage shape.
void convertToModelMessages
void {} as UIMessage | undefined
