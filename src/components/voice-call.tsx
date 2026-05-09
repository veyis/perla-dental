'use client'

import {
  ConversationProvider,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react'
import { motion } from 'framer-motion'
import { Loader2, Phone, PhoneOff, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { Locale } from '@/i18n/config'

const LOCALE_TO_LANG: Record<Locale, 'en' | 'tr' | 'ru' | 'de'> = {
  en: 'en',
  tr: 'tr',
  ru: 'ru',
  de: 'de',
}

/**
 * Phone-call style voice agent backed by ElevenLabs Conversational AI.
 *
 * The Agent is configured in the ElevenLabs dashboard with our system
 * prompt, voice ID, and a "Custom LLM" pointing to our voice-llm route
 * (base URL /api/voice-llm; ElevenLabs auto-appends /chat/completions),
 * which proxies to Claude Haiku 4.5. Barge-in, VAD, end-of-utterance
 * detection, and reconnection are handled by the SDK + WebSocket transport.
 */
export function VoiceCall({ locale, agentId: propAgentId }: { locale: Locale; agentId?: string }) {
  // Prefer the prop (server-rendered, request-time) over the build-time
  // inlined env var. This is what makes the page survive a Vercel build
  // that ran before NEXT_PUBLIC_ELEVENLABS_AGENT_ID was set — the prop is
  // read on the server at request time, not bundled at build.
  const agentId = propAgentId ?? process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) {
    return (
      <div className="text-sm text-text-muted italic">
        Voice unavailable — set <code>NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code> in
        <code>.env.local</code> after creating an Agent in the ElevenLabs dashboard.
      </div>
    )
  }

  return <VoiceCallStateful agentId={agentId} locale={locale} />
}

function VoiceCallStateful({ agentId, locale }: { agentId: string; locale: Locale }) {
  const tErrors = useTranslations('errors')
  const [callError, setCallError] = useState<string | null>(null)

  return (
    <ConversationProvider
      onError={(err: unknown, ctx?: unknown) => {
        console.error('[VoiceCall] error:', err, ctx)
        const msg = err instanceof Error ? err.message : String(err)
        setCallError(msg)
      }}
      onConnect={({ conversationId }) => {
        console.log('[VoiceCall] connected:', conversationId)
        setCallError(null)
      }}
      onDisconnect={(details?: unknown) => {
        console.log('[VoiceCall] disconnected — full details:', JSON.stringify(details, null, 2))
      }}
      onModeChange={({ mode }) => {
        console.log('[VoiceCall] mode:', mode)
      }}
      onDebug={(event: unknown) => {
        console.log('[VoiceCall] debug:', JSON.stringify(event))
      }}
    >
      <VoiceCallUI
        agentId={agentId}
        locale={locale}
        callError={callError}
        setCallError={setCallError}
        tErrors={tErrors}
      />
    </ConversationProvider>
  )
}

function VoiceCallUI({
  agentId,
  locale,
  callError,
  setCallError,
  tErrors,
}: {
  agentId: string
  locale: Locale
  callError: string | null
  setCallError: (err: string | null) => void
  tErrors: (key: string) => string
}) {
  const { startSession, endSession } = useConversationControls()
  const { status } = useConversationStatus()
  const { isSpeaking, isListening } = useConversationMode()
  const { isMuted, setMuted } = useConversationInput()

  const isConnecting = status === 'connecting'
  const isConnected = status === 'connected'
  const callActive = isConnected || isConnecting

  async function handleStart() {
    setCallError(null)
    try {
      // Acquire mic permission EXPLICITLY before startSession. This is the
      // pattern in ElevenLabs's own integration docs and prevents a race
      // where the SDK's internal mic acquisition can collide with audio
      // track negotiation (resulting in 0s ASR + 0s TTS sessions even
      // though signaling completes).
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Use WebSocket transport. Empirically, WebRTC via LiveKit fails on
      // some networks even with the livekit-client@2.16.1 pin
      // (elevenlabs/packages#645). WebSocket is a slight quality drop but
      // reliable across all networks. Barge-in still works (VAD client-side).
      await startSession({
        agentId,
        connectionType: 'websocket',
        overrides: {
          agent: { language: LOCALE_TO_LANG[locale] },
          conversation: { textOnly: false },
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[VoiceCall] start failed:', msg)
      setCallError(
        msg.includes('Permission') || msg.includes('NotAllowed') ? tErrors('micDenied') : msg,
      )
    }
  }

  function handleEnd() {
    endSession()
  }

  if (!callActive) {
    return (
      <div className="flex flex-col items-center gap-3">
        <motion.button
          type="button"
          onClick={handleStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-4 px-8 py-5 rounded-full font-bold transition-all shadow-xl bg-primary text-white"
        >
          {callError ? <RefreshCw className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          <span className="text-lg tracking-tight">{callError ? 'Try again' : 'Start call'}</span>
        </motion.button>
        {callError && <p className="text-sm text-red-500 max-w-xs text-center">{callError}</p>}
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className="flex items-center gap-4 px-8 py-5 rounded-full bg-primary/10 text-primary font-bold">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Connecting…</span>
      </div>
    )
  }

  const statusLabel = isSpeaking ? 'Agent speaking' : isListening ? 'Listening…' : 'Connected'

  return (
    <div className="relative flex items-center gap-4">
      {/* Pulsing aura while listening or speaking */}
      <motion.div
        animate={{
          scale: isListening || isSpeaking ? [1, 1.3, 1] : 1,
          opacity: isListening || isSpeaking ? [0.4, 0, 0.4] : 0,
        }}
        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        className="absolute inset-0 rounded-full bg-primary/20 -z-10"
      />

      <motion.button
        type="button"
        onClick={handleEnd}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-3 px-6 py-4 rounded-full font-bold shadow-xl bg-red-500 text-white"
      >
        <PhoneOff className="w-5 h-5" />
        <span>End call</span>
      </motion.button>

      <button
        type="button"
        onClick={() => setMuted(!isMuted)}
        className="px-4 py-2 rounded-full text-sm font-medium border border-primary/20 hover:bg-primary/5 transition"
      >
        {isMuted ? 'Unmute' : 'Mute'}
      </button>

      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-widest text-primary">
          {statusLabel}
        </span>
        <span className="text-xs text-text-muted">Speak anytime — interrupt freely.</span>
      </div>
    </div>
  )
}
