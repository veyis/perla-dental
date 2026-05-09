/**
 * OpenAI-compatible /chat/completions endpoint that proxies to
 * Anthropic Claude Haiku 4.5 via the Vercel AI SDK.
 *
 * ElevenLabs Conversational AI (Agents) supports "Custom LLM" — a
 * BYO endpoint matching the OpenAI Chat Completions streaming spec.
 * In `chat_completions` mode ElevenLabs auto-appends `/chat/completions`
 * to whatever base URL you paste in the dashboard, so this handler must
 * live at that suffix.
 *
 * Tool execution (submitLead, escalateEmergency) happens entirely
 * inside this proxy via the AI SDK — ElevenLabs only sees the final
 * text deltas. The agent stays a single coherent voice from the
 * user's perspective.
 *
 * Base URL to paste into the ElevenLabs Agent dashboard:
 *   https://<your-domain>/api/voice-llm
 * ElevenLabs will call:
 *   https://<your-domain>/api/voice-llm/chat/completions
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

const VOICE_OUTPUT_RULES = `
[VOICE OUTPUT — STRICT]
This is a live voice call. The text you produce is read aloud by a TTS engine.
- Plain spoken language only. No markdown whatsoever: no **, no __, no ##, no -, no *, no numbered lists, no headings, no symbols, no parenthetical asides with slashes.
- Maximum 2 short sentences per turn. Never lecture. Never list items.
- Say numbers as words: "nine to six" not "9-6", "all on four" not "All-on-4", spell phone digits in pairs.
- Ask exactly one question per turn. Wait for the answer before continuing.
- Mirror the caller's language. If they switch to Turkish, German, or Russian, switch immediately and stay there.
`.trim()

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
  console.log('[voice-llm] HIT', {
    ua: req.headers.get('user-agent')?.slice(0, 60),
    ct: req.headers.get('content-type'),
    cl: req.headers.get('content-length'),
  })

  if (isAgentDisabled()) {
    return new Response('Agent disabled', { status: 503 })
  }

  const raw = await req.text()
  console.log('[voice-llm] RAW BODY (first 600 chars):', raw.slice(0, 600))

  let body: OpenAIRequest
  try {
    body = JSON.parse(raw) as OpenAIRequest
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[voice-llm] JSON parse failed:', msg, 'rawHead:', raw.slice(0, 200))
    return new Response('Invalid JSON', { status: 400 })
  }

  const conversationId =
    req.headers.get('x-conversation-id') ?? `voice_${Math.random().toString(36).slice(2, 10)}`
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'voice-agent'

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
    // Voice path: never throw out of a tool. AI SDK propagates execute()
    // throws as `error` parts in the stream, which ElevenLabs surfaces as
    // `custom_llm_error` and ends the call. Return a discriminated error
    // result so the model can apologize and continue instead.
    onProposeLead: async (input) => {
      try {
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
        logger.warn({ conversationId, reason: result.reason }, '[voice-llm] submitLead failed')
        return { status: 'error' as const, reason: result.reason }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error({ err: msg, conversationId }, '[voice-llm] submitLead threw')
        return { status: 'error' as const, reason: msg }
      }
    },
    onEscalateEmergency: async (input) => {
      try {
        await audit({ kind: 'emergency_escalated', conversationId, summary: input.summary })
      } catch (err) {
        logger.error({ err, conversationId }, '[voice-llm] escalateEmergency audit threw')
      }
      return { ack: true }
    },
    onEscalateToHuman: async (input) => {
      try {
        await audit({
          kind: 'guardrail_event',
          conversationId,
          detail: `escalate_to_human: ${input.reason}${
            input.contactInfo ? ` (contact: ${input.contactInfo})` : ''
          }`,
        })
      } catch (err) {
        logger.error({ err, conversationId }, '[voice-llm] escalateToHuman audit threw')
      }
      return { ack: true }
    },
  })

  // Pin to versioned ID (not alias) so behavior is deterministic and we
  // pay the prompt-cache price only once per 1h TTL window. 1-hour
  // ephemeral cache on the static system prompt drops TTFT from ~2-3s
  // to ~300ms after the first call, keeping us under ElevenLabs's
  // cascade_timeout (15s in our config).
  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    allowSystemInMessages: true,
    messages: [
      {
        role: 'system',
        content: staticSystemBlocks(),
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
        },
      } as never,
      {
        role: 'system',
        content: VOICE_OUTPUT_RULES,
      } as never,
      ...messages,
    ],
    tools,
    temperature: body.temperature ?? 0.7,
    maxOutputTokens: 400,
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

  // Generic spoken fallback the agent uses when the stream errors mid-turn.
  // Plain text only, mirrors caller language sloppily — better than silence
  // or a hard `custom_llm_error` that ends the call.
  const FALLBACK_TEXT = "I'm sorry, could you repeat that?"

  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(payload: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
      }

      let textBytes = 0
      let chunkCount = 0
      let recovered = false

      function emitFallback(reason: string) {
        if (textBytes > 0) return // Already produced text — don't overwrite.
        recovered = true
        logger.warn({ conversationId, reason }, '[voice-llm] emitting fallback text')
        send({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: { content: FALLBACK_TEXT }, finish_reason: null }],
        })
        textBytes += FALLBACK_TEXT.length
        chunkCount++
      }

      try {
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
          } else if (part.type === 'tool-call') {
            console.log('[voice-llm] tool-call', {
              conversationId,
              toolName: (part as { toolName?: string }).toolName,
              input: JSON.stringify((part as { input?: unknown }).input ?? {}).slice(0, 300),
            })
          } else if (part.type === 'tool-result') {
            console.log('[voice-llm] tool-result', {
              conversationId,
              toolName: (part as { toolName?: string }).toolName,
              output: JSON.stringify((part as { output?: unknown }).output ?? {}).slice(0, 300),
            })
          } else if (part.type === 'error') {
            const err = part.error
            const errMsg = err instanceof Error ? err.message : String(err)
            console.error('[voice-llm] stream error part:', errMsg)
            // Don't forward as OpenAI `error` chunk — that ends the call.
            // If we already streamed some text, just stop cleanly. Otherwise
            // emit a graceful fallback so the agent stays alive.
            emitFallback(errMsg)
          }
        }

        send({
          id,
          object: 'chat.completion.chunk',
          created,
          model,
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
        })

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
        console.log('[voice-llm] stream done', {
          conversationId,
          chunks: chunkCount,
          bytes: textBytes,
          recovered,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[voice-llm] fatal stream error:', msg)
        // Even on fatal error, complete the SSE stream cleanly with a
        // fallback so ElevenLabs plays something instead of dropping the
        // call with custom_llm_error.
        try {
          if (textBytes === 0) {
            send({
              id,
              object: 'chat.completion.chunk',
              created,
              model,
              choices: [{ index: 0, delta: { content: FALLBACK_TEXT }, finish_reason: null }],
            })
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

function convertOpenAIMessagesToModelMessages(messages: OpenAIMessage[]): ModelMessage[] {
  const out: ModelMessage[] = []
  for (const m of messages) {
    if (m.role === 'system') continue
    if (m.role === 'tool') {
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
