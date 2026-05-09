'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MessageSquareText, Mic, Square } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

type State = 'idle' | 'acquiring' | 'recording' | 'transcribing'

const MIN_RECORDING_MS = 500

export function MicButton({
  onTranscript,
  onMicPress,
  disabled,
}: {
  onTranscript: (text: string) => void
  /** Called the moment the user taps the mic — used to interrupt agent audio. */
  onMicPress?: () => void
  disabled?: boolean
}) {
  const tUi = useTranslations('ui')
  const tErrors = useTranslations('errors')
  const [state, setState] = useState<State>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)
  const mimeRef = useRef<string>('audio/webm;codecs=opus')

  // Clean up mic if component unmounts mid-recording.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => {
        t.stop()
      })
    }
  }, [])

  async function start() {
    setState('acquiring')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      mimeRef.current = mime || 'audio/webm'

      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recorderRef.current = rec
      chunksRef.current = []

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const elapsed = Date.now() - startedAtRef.current
        if (elapsed < MIN_RECORDING_MS || chunksRef.current.length === 0) {
          // Too short — likely an accidental tap. Silently reset.
          setState('idle')
          return
        }
        void transcribeAndSend(mimeRef.current)
      }

      startedAtRef.current = Date.now()
      rec.start(100)
      setState('recording')
    } catch (err) {
      console.error('[MicButton] mic permission denied or unavailable:', err)
      streamRef.current?.getTracks().forEach((t) => {
        t.stop()
      })
      streamRef.current = null
      setState('idle')
      alert(tErrors('micDenied'))
    }
  }

  function stop() {
    const rec = recorderRef.current
    if (!rec) {
      setState('idle')
      return
    }
    if (rec.state === 'recording') {
      rec.stop()
    }
    streamRef.current?.getTracks().forEach((t) => {
      t.stop()
    })
    streamRef.current = null
    setState('transcribing')
  }

  async function transcribeAndSend(mime: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mime })
      if (blob.size < 1024) {
        // Less than 1KB of audio = essentially nothing. Skip.
        console.warn('[MicButton] audio blob too small, skipping STT')
        setState('idle')
        return
      }
      const buffer = await blob.arrayBuffer()
      const res = await fetch('/api/voice/stt', {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: buffer,
      })
      const json = (await res.json()) as { text?: string; error?: string; detail?: string }
      if (!res.ok) {
        console.error('[MicButton] STT failed', res.status, json)
        alert(`${tErrors('transcriptionFailed')}\n\n${json.error ?? ''}\n${json.detail ?? ''}`)
        return
      }
      const text = (json.text ?? '').trim()
      if (text.length > 0) {
        onTranscript(text)
      } else {
        console.warn('[MicButton] STT returned empty text')
      }
    } catch (err) {
      console.error('[MicButton] STT request failed:', err)
      alert(tErrors('transcriptionFailed'))
    } finally {
      setState('idle')
    }
  }

  // Click-to-toggle: tap once to start, tap again to stop.
  function onClick() {
    if (disabled) return
    if (state === 'idle') {
      // Fire onMicPress FIRST so any in-flight agent audio is silenced
      // immediately, before the user starts speaking over it.
      onMicPress?.()
      void start()
    } else if (state === 'recording') {
      stop()
    }
    // 'acquiring' and 'transcribing' are intermediate; ignore clicks.
  }

  const isBusy = state === 'transcribing' || state === 'acquiring'

  return (
    <div className="relative group">
      {/* Ripple effect when recording */}
      <AnimatePresence>
        {state === 'recording' && (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-primary/20 -z-10"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
              className="absolute inset-0 rounded-full bg-primary/10 -z-10"
            />
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        disabled={disabled || isBusy}
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-pressed={state === 'recording'}
        className={`
          relative flex items-center gap-4 px-8 py-5 rounded-full font-bold transition-all shadow-xl
          ${state === 'recording' ? 'bg-red-500 text-white' : 'bg-primary text-white'}
          ${state === 'transcribing' ? 'bg-primary-light' : ''}
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <div className="relative w-6 h-6 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {state === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Mic className="w-6 h-6" />
              </motion.div>
            )}
            {state === 'acquiring' && (
              <motion.div
                key="acquiring"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="w-6 h-6 animate-spin" />
              </motion.div>
            )}
            {state === 'recording' && (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Square className="w-6 h-6 fill-current" />
              </motion.div>
            )}
            {state === 'transcribing' && (
              <motion.div
                key="transcribing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <MessageSquareText className="w-6 h-6 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <span className="text-lg tracking-tight">
          {state === 'idle'
            ? tUi('holdToSpeak')
            : state === 'acquiring'
              ? '...'
              : state === 'recording'
                ? 'Tap to stop'
                : 'Thinking...'}
        </span>
      </motion.button>
    </div>
  )
}
