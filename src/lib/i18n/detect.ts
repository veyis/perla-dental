import { franc } from 'franc-min'
import { defaultLocale, type Locale, locales } from '@/i18n/config'

const ISO_TO_LOCALE: Record<string, Locale> = {
  eng: 'en',
  tur: 'tr',
  rus: 'ru',
  deu: 'de',
}

export function detectLanguage(text: string): Locale {
  if (text.trim().length < 10) return defaultLocale
  const iso6393 = franc(text, { minLength: 10, only: Object.keys(ISO_TO_LOCALE) })
  const locale = ISO_TO_LOCALE[iso6393]
  return locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale
}
