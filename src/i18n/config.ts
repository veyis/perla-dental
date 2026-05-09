export const locales = ['en', 'tr', 'ru', 'de'] as const
export const defaultLocale = 'en' as const
export type Locale = (typeof locales)[number]
