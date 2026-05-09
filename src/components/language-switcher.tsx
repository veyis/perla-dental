'use client'

import { usePathname, useRouter } from 'next/navigation'
import type { Locale } from '@/i18n/config'

const FLAGS: Record<Locale, string> = { en: '🇬🇧', tr: '🇹🇷', ru: '🇷🇺', de: '🇩🇪' }
const NAMES: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  ru: 'Русский',
  de: 'Deutsch',
}

export function LanguageSwitcher({ current }: { current: Locale }) {
  const router = useRouter()
  const pathname = usePathname()

  function switchTo(locale: Locale) {
    const newPath = pathname.replace(/^\/(en|tr|ru|de)/, `/${locale}`) || `/${locale}`
    router.push(newPath)
  }

  return (
    <nav className="flex gap-1" aria-label="Language">
      {(Object.keys(FLAGS) as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          aria-current={l === current ? 'true' : undefined}
          aria-label={NAMES[l]}
          className={`px-2 py-1 rounded ${l === current ? 'bg-accent' : ''}`}
        >
          {FLAGS[l]}
        </button>
      ))}
    </nav>
  )
}
