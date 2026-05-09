'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n/config'

const STORAGE_KEY = 'perla.chat.conversationId'

function readOrMintConversationId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = window.sessionStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const fresh = crypto.randomUUID()
  window.sessionStorage.setItem(STORAGE_KEY, fresh)
  return fresh
}

/**
 * Wraps useChat for the Perla chat surface. Owns:
 *  - sessionStorage-backed conversationId so reload = same convo within tab
 *  - the request-body shape /api/chat expects
 *  - the ttsEnabled flag flowing into voiceEnabled on each turn
 */
export function useChatConversation(args: { locale: Locale; ttsEnabled: boolean }) {
  const [conversationId] = useState<string>(() => readOrMintConversationId())

  const transport = new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages, body }) => {
      // turnCount is the only non-derived state the server uses; step and
      // captured fields are inferred by the model from conversation history
      // (see prompt.ts comment about hardcoded `step: 'greeting'` causing
      // re-greets). Keeping the request body minimal avoids dead fields
      // that look load-bearing but aren't.
      const turnCount = (messages as Array<{ role: string }>).filter(
        (m) => m.role === 'user',
      ).length
      return {
        body: {
          ...body,
          messages,
          conversationId,
          language: args.locale,
          state: { step: 'greeting', captured: {}, turnCount },
          voiceEnabled: args.ttsEnabled,
        },
      }
    },
  })

  const chat = useChat({ transport } as never)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(STORAGE_KEY) !== conversationId) {
      window.sessionStorage.setItem(STORAGE_KEY, conversationId)
    }
  }, [conversationId])

  return { ...chat, conversationId }
}
