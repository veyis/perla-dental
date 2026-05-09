'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useParams, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { Locale } from '@/i18n/config'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'

const FLAGS: Record<Locale, string> = { en: '🇬🇧', tr: '🇹🇷', ru: '🇷🇺', de: '🇩🇪' }
const NAMES: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  ru: 'Русский',
  de: 'Deutsch',
}

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter()
  const pathname = usePathname() // locale-stripped (e.g. '/contact' even when on /tr/contact)
  const params = useParams()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function switchTo(locale: Locale) {
    setOpen(false)
    if (locale === current) return

    // Preserve search params; the next-intl router doesn't auto-carry them.
    const qs = searchParams.toString()
    const pathWithQuery = qs ? `${pathname}?${qs}` : pathname

    startTransition(() => {
      router.replace(
        // Dynamic-segment overload: pass `params` so /[slug] etc. survive the swap.
        // biome-ignore lint/suspicious/noExplicitAny: next-intl typed overload requires this shape
        { pathname: pathWithQuery, params } as any,
        { locale, scroll: false },
      )
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${NAMES[current]}`}
        className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium border border-black/10 bg-white/60 hover:bg-white transition-colors disabled:opacity-50"
      >
        <span className="text-base leading-none" aria-hidden>
          {FLAGS[current]}
        </span>
        <span>{NAMES[current]}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Choose language"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-44 rounded-2xl bg-white shadow-xl border border-black/5 py-1.5 z-50 overflow-hidden"
          >
            {routing.locales.map((l) => {
              const isActive = l === current
              return (
                <li key={l}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => switchTo(l)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/5 text-primary font-semibold'
                        : 'hover:bg-accent/40 text-text'
                    }`}
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {FLAGS[l]}
                    </span>
                    <span className="flex-1 text-left">{NAMES[l]}</span>
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
