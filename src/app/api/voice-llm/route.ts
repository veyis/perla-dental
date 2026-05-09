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
import { type ModelMessage, streamText } from 'ai'
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

  // Verbose request log so we can see exactly what ElevenLabs sends.
  // Keep msgs trimmed; never log API keys.
  console.log('[voice-llm] request', {
    conversationId,
    streamRequested: body.stream,
    model: body.model,
    msgCount: body.messages?.length,
    hasTools: Array.isArray(body.tools) ? (body.tools as unknown[]).length : 0,
    lastMsgRole: body.messages?.[body.messages.length - 1]?.role,
    lastMsgPreview:
      typeof body.messages?.[body.messages.length - 1]?.content === 'string'
        ? (body.messages[body.messages.length - 1].content as string).slice(0, 80)
        : null,
    userAgent: req.headers.get('user-agent')?.slice(0, 60),
  })

  const messages = convertOpenAIMessagesToModelMessages(body.messages ?? [])

  const tools = buildTools({
    onProposeLead: async (input) => {
      // Voice flow: verbal consent obtained mid-call, write the row
      // immediately and return the `saved` discriminator so the model
      // moves to the closing step. The chat-side `pending_consent`
      // semantics don't apply — there's no card to render in voice.
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
        return { status: 'saved' as const, fields: input, leadId: result.leadId }
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

      let textBytes = 0
      let chunkCount = 0
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
            textBytes += part.text.length
            chunkCount++
            send({
              id,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [{ index: 0, delta: { content: part.text }, finish_reason: null }],
            })
          } else if (part.type === 'error') {
            const err = part.error
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error('[voice-llm] stream error part:', errMsg)
            // Surface as SSE error so ElevenLabs sees "the LLM errored" rather
            // than waiting for a stream that never comes.
            send({
              error: { message: errMsg, type: 'server_error' },
            })
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

        // Usage chunk — required by some OpenAI-compat clients (incl.
        // ElevenLabs Custom LLM) when stream_options.include_usage is set.
        // Cheap proxy from byte counts since AI SDK doesn't surface tokens here.
        send({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: chunkCount,
            total_tokens: chunkCount,
          },
        })

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        console.log('[voice-llm] stream done', { chunks: chunkCount, bytes: textBytes })
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
        role: 'tool' as const,
        content: [
          {
            type: 'tool-result' as const,
            toolCallId: m.tool_call_id ?? '',
            toolName: m.name ?? '',
            output: { type: 'json' as const, value: tryParseJson(m.content ?? '') },
          },
        ],
      } as ModelMessage)
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
      out.push({ role: 'assistant' as const, content: parts } as unknown as ModelMessage)
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
