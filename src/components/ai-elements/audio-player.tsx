'use client'

import { useEffect, useRef } from 'react'

export function AudioPlayer({ urls }: { urls: string[] }) {
  const ref = useRef<HTMLAudioElement>(null)
  const playedRef = useRef(0)

  useEffect(() => {
    const a = ref.current
    if (!a) return
    if (urls.length > playedRef.current && a.paused) {
      a.src = urls[playedRef.current]
      a.play().catch(() => {})
    }
  }, [urls])

  function onEnded() {
    playedRef.current += 1
    const a = ref.current
    if (a && playedRef.current < urls.length) {
      a.src = urls[playedRef.current]
      a.play().catch(() => {})
    }
  }

  return (
    <audio ref={ref} onEnded={onEnded} className="hidden">
      <track kind="captions" />
    </audio>
  )
}
