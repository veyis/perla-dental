'use client'

import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/config'
import { About } from './about'
import { ChatLauncher, ChatProvider, InlineChatSection } from './chat'
import { Contact } from './contact'
import { Hero } from './hero'
import { Navbar } from './navbar'
import { Services } from './services'
import { TrustStrip } from './trust-strip'

export function LandingPage({ locale, agentId }: { locale: Locale; agentId?: string }) {
  const t = useTranslations('ui')
  return (
    <ChatProvider locale={locale}>
      <div className="bg-white">
        <Navbar locale={locale} />
        <main>
          <Hero
            title={t('subtitle')}
            subtitle={t('subcopy')}
            status="idle"
            locale={locale}
            agentId={agentId}
          />
          <Services />
          <About />
          <InlineChatSection />
          <Contact />
        </main>
        <TrustStrip />
        <ChatLauncher />
      </div>
    </ChatProvider>
  )
}
