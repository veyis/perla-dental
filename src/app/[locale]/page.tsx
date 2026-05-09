import { LandingPage } from '@/components/landing-page'
import type { Locale } from '@/i18n/config'

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  return <LandingPage locale={locale} />
}
