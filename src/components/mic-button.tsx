'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

type State = 'idle' | 'acquiring' | 'recording' | 'transcribing'

export function MicButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void
  disabled?: boolean
}) {
  const tUi = useTranslations('ui')
  const tErrors = useTranslations('errors')
  const [state, setState] = useState<State>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function start() {
    if (state !== 'idle') return
    setState('acquiring')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      recorderRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        void transcribeAndSend(mime)
      }
      rec.start(100)
      setState('recording')
    } catch {
      alert(tErrors('micDenied'))
      setState('idle')
    }
  }

  function stop() {
    if (state !== 'recording') return
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => {
      t.stop()
    })
    setState('transcribing')
  }

  async function transcribeAndSend(mime: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mime })
      const buffer = await blob.arrayBuffer()
      const res = await fetch('/api/voice/stt', {
        method: 'POST',
        headers: { 'Content-Type': mime },
        body: buffer,
      })
      const json = (await res.json()) as { text?: string }
      if (json.text) onTranscript(json.text)
    } catch {
      alert(tErrors('transcriptionFailed'))
    } finally {
      setState('idle')
    }
  }

  const label: Record<State, string> = {
    idle: `🎤 ${tUi('holdToSpeak')}`,
    acquiring: '⏳',
    recording: '🔴 …',
    transcribing: '💭',
  }

  return (
    <button
      type="button"
      disabled={disabled || state === 'transcribing'}
      onMouseDown={start}
      onMouseUp={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      onKeyDown={(e) => {
        if (e.key === ' ' && state === 'idle') {
          e.preventDefault()
          void start()
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' && state === 'recording') {
          e.preventDefault()
          stop()
        }
      }}
      className="px-8 py-4 rounded-full bg-primary text-white text-lg shadow-lg active:scale-95 disabled:opacity-50"
    >
      {label[state]}
    </button>
  )
}
