'use client'

import { useTranslations } from 'next-intl'
import { ChatComposer } from './chat-composer'
import { ChatGreeting } from './chat-greeting'
import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { useChatContext } from './chat-provider'

export function ChatPanel({ inline = false }: { inline?: boolean }) {
  const t = useTranslations('chat')
  const { messages } = useChatContext()
  const isEmpty = messages.length === 0

  return (
    <div
      className={`flex flex-col bg-white/90 backdrop-blur ${
        inline
          ? 'h-full rounded-[40px] overflow-hidden border border-white/40 shadow-premium'
          : 'h-full'
      }`}
    >
      <ChatHeader showClose={!inline} />
      {isEmpty ? (
        <div className="flex-1 overflow-y-auto">
          <ChatGreeting />
        </div>
      ) : (
        <ChatMessages />
      )}
      <ChatComposer />
      <div className="px-4 py-2 border-t border-black/5 text-[10px] text-text-muted flex items-center justify-center gap-2">
        <span>🔒</span>
        <a href="/privacy" className="underline-offset-2 hover:underline">
          {t('privacyLink')}
        </a>
      </div>
    </div>
  )
}
