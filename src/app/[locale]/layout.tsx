import type { Metadata } from 'next'
import { Outfit, Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { CookieBanner } from '@/components/cookie-banner'
import { locales } from '@/i18n/config'
import '../globals.css'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic'],
  variable: '--font-body',
})
const heading = Outfit({
  subsets: ['latin'],
  variable: '--font-heading',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Perla Dental Clinics | Ultra-Modern Dental Care in Antalya',
  description: 'Experience premium dental care in Antalya, Turkey. Our AI-powered clinic offers world-class treatments, from cosmetic dentistry to oral surgery, with bilingual support.',
  openGraph: {
    title: 'Perla Dental Clinics | Ultra-Modern Dental Care',
    description: 'World-class dental treatments in Antalya. AI-guided consultations and expert care.',
    images: ['/images/hero.png'],
  },
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(locales, locale)) notFound()
  const messages = await getMessages()
  return (
    <html lang={locale} className={`${inter.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <div className="grain" />
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
