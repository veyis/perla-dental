import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'tr', 'ru', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})

// Re-export the locale type for convenience so call sites can keep using
// `import { Locale } from '@/i18n/config'` or switch to importing from here.
export type Locale = (typeof routing.locales)[number]
