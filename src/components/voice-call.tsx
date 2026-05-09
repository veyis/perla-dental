'use client'

import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { motion } from 'framer-motion'
import { Loader2, Phone, PhoneOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
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
 * prompt, voice ID, and a "Custom LLM" pointing to our /api/voice-llm
 * route which proxies to Claude Haiku 4.5. Barge-in, VAD, end-of-utterance
 * detection, and reconnection are handled by the SDK + WebRTC transport.
 */
export function VoiceCall({ locale }: { locale: Locale }) {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  if (!agentId) {
    return (
      <div className="text-sm text-text-muted italic">
        Voice unavailable — set <code>NEXT_PUBLIC_ELEVENLABS_AGENT_ID</code> in
        <code>.env.local</code> after creating an Agent in the ElevenLabs dashboard.
      </div>
    )
  }
  return (
    <ConversationProvider>
      <VoiceCallInner agentId={agentId} locale={locale} />
    </ConversationProvider>
  )
}

function VoiceCallInner({ agentId, locale }: { agentId: string; locale: Locale }) {
  const tErrors = useTranslations('errors')

  const {
    startSession,
    endSession,
    status,
    isSpeaking,
    isListening,
    isMuted,
    setMuted,
  } = useConversation({
    onError: (err) => {
      console.error('[VoiceCall] error:', err)
    },
    onConnect: ({ conversationId }) => {
      console.log('[VoiceCall] connected:', conversationId)
    },
    onDisconnect: () => {
      console.log('[VoiceCall] disconnected')
    },
    onModeChange: ({ mode }) => {
      console.log('[VoiceCall] mode:', mode)
    },
  })

  const isConnecting = status === 'connecting'
  const isConnected = status === 'connected'
  const callActive = isConnected || isConnecting

  async function handleStart() {
    try {
      // Use WebRTC for full-duplex with barge-in (the recommended transport
      // as of ElevenLabs Agents 2026).
      await startSession({
        agentId,
        connectionType: 'webrtc',
        overrides: {
          agent: { language: LOCALE_TO_LANG[locale] },
        },
      })
    } catch (err) {
      console.error('[VoiceCall] start failed:', err)
      alert(tErrors('micDenied'))
    }
  }

  function handleEnd() {
    endSession()
  }

  if (!callActive) {
    return (
      <motion.button
        type="button"
        onClick={handleStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-4 px-8 py-5 rounded-full font-bold transition-all shadow-xl bg-primary text-white"
      >
        <Phone className="w-6 h-6" />
        <span className="text-lg tracking-tight">Start call</span>
      </motion.button>
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

  const statusLabel = isSpeaking
    ? 'Agent speaking'
    : isListening
      ? 'Listening…'
      : 'Connected'

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
