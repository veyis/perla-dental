'use client'

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { AudioPlayer } from '@/components/ai-elements'
import type { AudioPlayerHandle } from '@/components/ai-elements/audio-player'
import type { Locale } from '@/i18n/config'
import { useChatConversation } from './use-chat-conversation'

type AudioChunk = { index: number; url: string }

/** Per-message-id audio chunk keys. Each assistant turn restarts indexes
 *  from 0 server-side; we namespace by message id so dedup doesn't block
 *  later turns. */
function chunkKey(messageId: string, index: number): string {
  return `${messageId}#${index}`
}

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
  setMessages: ReturnType<typeof useChatConversation>['setMessages']
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
  // Initialize false on both server and client to avoid hydration mismatch;
  // hydrate the saved value in an effect.
  const [isLauncherOpen, setLauncherOpen] = useState<boolean>(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(LAUNCHER_OPEN_KEY) === 'true') {
      setLauncherOpen(true)
    }
  }, [])
  const [isInlineVisible, setInlineVisible] = useState(false)
  const [leadCardState, setLeadCardStateMap] = useState<Record<string, LeadCardState>>({})

  const { messages, status, sendMessage, setMessages, conversationId } = useChatConversation({
    locale,
    ttsEnabled,
  })

  const audioPlayerRef = useRef<AudioPlayerHandle>(null)
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])
  const seenChunkKeys = useRef<Set<string>>(new Set())

  // Surface streaming TTS audio chunks to the player when ttsEnabled.
  // Indexes restart at 0 each assistant turn server-side, so dedup must
  // be namespaced by message id — otherwise the second turn's audio is
  // silently dropped because index 0 was "already seen" from turn 1.
  useEffect(() => {
    if (!ttsEnabled) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    for (const part of lastMsg.parts ?? []) {
      // biome-ignore lint/suspicious/noExplicitAny: AI SDK part shape varies by version
      const p = part as any
      if (p.type === 'data-audio' && p.data?.url && typeof p.data.index === 'number') {
        const key = chunkKey(lastMsg.id, p.data.index)
        if (seenChunkKeys.current.has(key)) continue
        seenChunkKeys.current.add(key)
        setAudioChunks((prev) => [...prev, { index: prev.length, url: p.data.url }])
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
    setMessages,
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
