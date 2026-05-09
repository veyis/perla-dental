'use client'

import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { useChatContext } from './chat-provider'

const MAX_CHARS = 1000

export function ChatComposer() {
  const t = useTranslations('chat')
  const { sendMessage, status } = useChatContext()
  const [value, setValue] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = status === 'streaming' || status === 'submitted'
  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !isStreaming

  function autoGrow() {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = '0px'
    ta.style.height = `${Math.min(ta.scrollHeight, 5 * 24 + 16)}px`
  }

  function submit() {
    if (!canSend) return
    sendMessage({ text: trimmed.slice(0, MAX_CHARS) })
    setValue('')
    requestAnimationFrame(autoGrow)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="p-3 border-t border-black/5 bg-white/80 backdrop-blur"
    >
      <div className="relative">
        <textarea
          ref={taRef}
          value={value}
          rows={1}
          onChange={(e) => {
            setValue(e.target.value.slice(0, MAX_CHARS))
            autoGrow()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t('placeholder')}
          aria-label={t('composerLabel')}
          className="w-full resize-none rounded-2xl bg-accent/20 border border-transparent focus:border-primary/30 focus:bg-white transition px-4 py-3 pr-14 text-sm leading-6 outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="absolute right-1.5 top-1.5 w-9 h-9 grid place-items-center rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-light transition"
          aria-label={t('send')}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {value.length >= 800 && (
        <div className="text-right text-[10px] text-text-muted mt-1 tabular-nums">
          {t('charCounter', { count: value.length })}
        </div>
      )}
    </form>
  )
}
