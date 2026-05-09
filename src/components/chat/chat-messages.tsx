'use client'

import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useRef } from 'react'
import { ChatLeadCard } from './chat-lead-card'
import { useChatContext } from './chat-provider'
import { renderMarkdownLite } from './markdown-lite'

const NEAR_BOTTOM_PX = 150

export function ChatMessages() {
  const t = useTranslations('chat')
  const { messages, status } = useChatContext()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new content, but only when the user is already near the
  // bottom — never hijack a scroll-up to read earlier messages.
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger on changes; body reads scroll geometry, not the deps
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, status])

  const lastMessage = messages[messages.length - 1]
  const showTyping =
    status === 'submitted' || (status === 'streaming' && lastMessage?.role === 'user')

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((m) =>
        // biome-ignore lint/suspicious/noExplicitAny: metadata shape evolves with AI SDK
        (m as any).metadata?.hidden ? null : (
          <div key={m.id} className="space-y-2">
            {m.parts?.map((p, i) => renderPart(m.id, m.role, p, i, t))}
          </div>
        ),
      )}
      {showTyping && <TypingIndicator label={t('typingLabel')} />}
    </div>
  )
}

function renderPart(
  msgId: string,
  role: 'user' | 'assistant' | 'system',
  // biome-ignore lint/suspicious/noExplicitAny: AI SDK part shape varies
  part: any,
  i: number,
  t: ReturnType<typeof useTranslations<'chat'>>,
): ReactNode {
  if (part.type === 'text') {
    return (
      <Bubble key={`${msgId}-${i}`} role={role}>
        {role === 'assistant' ? renderMarkdownLite(part.text) : part.text}
      </Bubble>
    )
  }
  if (part.type === 'tool-result' || part.type === 'tool-call') {
    if (part.toolName === 'submitLead' && part.output?.status === 'pending_consent') {
      return (
        <ChatLeadCard
          key={`${msgId}-${i}`}
          toolCallId={part.toolCallId}
          fields={part.output.fields}
          fingerprint={part.output.fingerprint}
        />
      )
    }
    if (part.toolName === 'escalateEmergency') {
      return (
        <div
          key={`${msgId}-${i}`}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          <TriangleAlert className="w-4 h-4 shrink-0" />
          <span>{t('escalationBanner')}</span>
        </div>
      )
    }
  }
  return null
}

function Bubble({
  role,
  children,
}: {
  role: 'user' | 'assistant' | 'system'
  children: ReactNode
}) {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-white border border-black/5 text-text rounded-bl-md shadow-sm'
        }`}
      >
        {children}
      </div>
    </motion.div>
  )
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start" role="status" aria-live="polite" aria-label={label}>
      <div className="flex items-center gap-1 bg-white border border-black/5 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-muted/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
