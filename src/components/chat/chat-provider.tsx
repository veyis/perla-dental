'use client'

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { AudioPlayer } from '@/components/ai-elements'
import type { AudioPlayerHandle } from '@/components/ai-elements/audio-player'
import type { Locale } from '@/i18n/config'
import { useChatConversation } from './use-chat-conversation'

type AudioChunk = { index: number; url: string }

export type LeadCardState =
  | { phase: 'pending' }
  | { phase: 'submitting' }
  | { phase: 'success'; leadId: string }
  | { phase: 'error'; message: string }
  | { phase: 'cancelled' }

type ChatContextValue = {
  locale: Locale
  conversationId: string
  messages: ReturnType<typeof useChatConversation>['messages']
  status: ReturnType<typeof useChatConversation>['status']
  sendMessage: ReturnType<typeof useChatConversation>['sendMessage']
  ttsEnabled: boolean
  setTtsEnabled: (v: boolean) => void
  isLauncherOpen: boolean
  openLauncher: () => void
  closeLauncher: () => void
  /** When true, the floating launcher hides (inline section is on screen). */
  isInlineVisible: boolean
  setInlineVisible: (v: boolean) => void
  /** Per-toolCallId state map for lead consent cards. */
  leadCardState: Record<string, LeadCardState>
  setLeadCardState: (id: string, state: LeadCardState) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

const LAUNCHER_OPEN_KEY = 'perla.chat.launcherOpen'

export function ChatProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [isLauncherOpen, setLauncherOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(LAUNCHER_OPEN_KEY) === 'true'
  })
  const [isInlineVisible, setInlineVisible] = useState(false)
  const [leadCardState, setLeadCardStateMap] = useState<Record<string, LeadCardState>>({})

  const { messages, status, sendMessage, conversationId } = useChatConversation({
    locale,
    ttsEnabled,
  })

  const audioPlayerRef = useRef<AudioPlayerHandle>(null)
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])

  // Surface streaming TTS audio chunks to the player when ttsEnabled.
  useEffect(() => {
    if (!ttsEnabled) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return
    for (const part of lastMsg.parts ?? []) {
      // biome-ignore lint/suspicious/noExplicitAny: AI SDK part shape varies by version
      const p = part as any
      if (p.type === 'data-audio' && p.data?.url && typeof p.data.index === 'number') {
        setAudioChunks((prev) =>
          prev.some((c) => c.index === p.data.index)
            ? prev
            : [...prev, { index: p.data.index, url: p.data.url }],
        )
      }
    }
  }, [messages, ttsEnabled])

  function openLauncher() {
    setLauncherOpen(true)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAUNCHER_OPEN_KEY, 'true')
    }
  }
  function closeLauncher() {
    setLauncherOpen(false)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAUNCHER_OPEN_KEY, 'false')
    }
  }
  function setLeadCardState(id: string, state: LeadCardState) {
    setLeadCardStateMap((m) => ({ ...m, [id]: state }))
  }

  // React Compiler (babel-plugin-react-compiler) auto-memoizes this object.
  const value: ChatContextValue = {
    locale,
    conversationId,
    messages,
    status,
    sendMessage,
    ttsEnabled,
    setTtsEnabled,
    isLauncherOpen,
    openLauncher,
    closeLauncher,
    isInlineVisible,
    setInlineVisible,
    leadCardState,
    setLeadCardState,
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
      <AudioPlayer ref={audioPlayerRef} chunks={audioChunks} />
    </ChatContext.Provider>
  )
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used inside <ChatProvider>')
  return ctx
}
