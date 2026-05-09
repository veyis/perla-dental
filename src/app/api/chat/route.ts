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
import { signFields } from '@/lib/leads/consent-hmac'
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

export async function POST(req: Request) {
  if (isAgentDisabled()) {
    return new Response('Agent disabled', { status: 503 })
  }

  const body = (await req.json()) as ChatBody

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
        onProposeLead: async (input) => {
          const fingerprint = signFields(body.conversationId, input)
          await audit({
            kind: 'lead_consent_pending',
            conversationId: body.conversationId,
            // Short fingerprint hint helps correlate later /api/lead/submit
            // attempts back to which proposal they're referencing without
            // logging the full HMAC (which could enable replay analysis).
            fingerprintHint: fingerprint.slice(0, 8),
          })
          return { status: 'pending_consent' as const, fields: input, fingerprint }
        },
        onEscalateEmergency: async (input) => {
          await audit({
            kind: 'emergency_escalated',
            conversationId: body.conversationId,
            summary: input.summary,
          })
          return { ack: true }
        },
        onEscalateToHuman: async (input) => {
          await audit({
            kind: 'guardrail_event',
            conversationId: body.conversationId,
            detail: `escalate_to_human: ${input.reason}${
              input.contactInfo ? ` (contact: ${input.contactInfo})` : ''
            }`,
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

      // Log the last user message — use Vercel Logs (free, searchable),
      // not the Supabase audit_events table (which is reserved for
      // regulated events: leads, emergencies, guardrail trips).
      const lastUserMessage = body.messages[body.messages.length - 1]
      if (lastUserMessage && lastUserMessage.role === 'user') {
        const userText = lastUserMessage.parts
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join(' ')
        logger.info(
          { conversationId: body.conversationId, role: 'user', text: userText.slice(0, 500) },
          'chat_message',
        )
      }

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
        onFinish: async (event) => {
          splitter.flush()
          if (event.text) {
            logger.info(
              {
                conversationId: body.conversationId,
                role: 'assistant',
                text: event.text.slice(0, 500),
              },
              'chat_message',
            )
          }
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
