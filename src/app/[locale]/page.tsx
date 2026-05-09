import { LandingPage } from '@/components/landing-page'
import type { Locale } from '@/i18n/config'

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  // Read at request time on the server so it's NOT inlined into the client
  // bundle. Surviving a Vercel build that ran before the env var was set
  // is the whole point — no rebuild required when the env var changes.
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  return <LandingPage locale={locale} agentId={agentId} />
}
