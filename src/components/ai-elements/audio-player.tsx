'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

export type AudioChunk = { index: number; url: string }

export type AudioPlayerHandle = {
  /** Stop currently-playing audio and reset playback head. Called when the user
   *  starts a new turn (mic tap or text send) to interrupt the agent. */
  stop: () => void
}

/**
 * Plays audio chunks in INDEX order, regardless of arrival order.
 *
 * The server runs TTS calls in parallel, so chunks may arrive out of order
 * (sentence 3's audio might be ready before sentence 1's). Each chunk
 * carries its sentence index; we play `index === playedRef.current` next,
 * waiting for late-arriving chunks if needed.
 */
export const AudioPlayer = forwardRef<AudioPlayerHandle, { chunks: AudioChunk[] }>(
  function AudioPlayer({ chunks }, ref) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const playedRef = useRef(0) // next index to play
    const playingRef = useRef(false)
    const unlockedRef = useRef(false)

    useImperativeHandle(ref, () => ({
      stop: () => {
        const a = audioRef.current
        if (!a) return
        if (!a.paused) {
          a.pause()
        }
        a.currentTime = 0
        playingRef.current = false
        playedRef.current = 0
        console.log('[AudioPlayer] stopped (interrupted)')
      },
    }))

    // Unlock playback on the first user gesture so the browser doesn't block
    // subsequent .play() calls under autoplay policy.
    useEffect(() => {
      function unlock() {
        const a = audioRef.current
        if (!a || unlockedRef.current) return
        unlockedRef.current = true
        a.src = SILENT_WAV
        a.muted = true
        a.play()
          .then(() => {
            a.pause()
            a.currentTime = 0
            a.muted = false
            console.log('[AudioPlayer] unlocked via user gesture')
          })
          .catch((err) => {
            console.warn('[AudioPlayer] unlock attempt failed (non-fatal):', err.message ?? err)
            a.muted = false
          })
      }
      document.addEventListener('pointerdown', unlock, { once: true })
      document.addEventListener('keydown', unlock, { once: true })
      return () => {
        document.removeEventListener('pointerdown', unlock)
        document.removeEventListener('keydown', unlock)
      }
    }, [])

    // Try to play whenever the chunk queue grows.
    // biome-ignore lint/correctness/useExhaustiveDependencies: tryPlayNext reads refs only
    useEffect(() => {
      tryPlayNext()
    }, [chunks])

    function tryPlayNext() {
      const a = audioRef.current
      if (!a || playingRef.current) return
      const next = chunks.find((c) => c.index === playedRef.current)
      if (!next) return // waiting for the in-order chunk to arrive
      playingRef.current = true
      console.log('[AudioPlayer] playing index', next.index, next.url)
      a.src = next.url
      a.play().catch((err) => {
        console.error('[AudioPlayer] play() failed:', err.message ?? err)
        playingRef.current = false
      })
    }

    function onEnded() {
      playingRef.current = false
      playedRef.current += 1
      tryPlayNext()
    }

    function onError(e: React.SyntheticEvent<HTMLAudioElement>) {
      const a = e.currentTarget
      if (!a.error) return
      console.error('[AudioPlayer] audio element error:', {
        code: a.error.code,
        message: a.error.message,
        src: a.currentSrc,
      })
      playingRef.current = false
      playedRef.current += 1
      tryPlayNext()
    }

    return (
      <audio ref={audioRef} onEnded={onEnded} onError={onError} className="hidden">
        <track kind="captions" />
      </audio>
    )
  },
)
