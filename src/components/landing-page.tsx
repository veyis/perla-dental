'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { AudioPlayer, Conversation, Message, Persona } from '@/components/ai-elements'
import type { Locale } from '@/i18n/config'
import { LanguageSwitcher } from './language-switcher'
import { MicButton } from './mic-button'
import { TrustStrip } from './trust-strip'

// `@ai-sdk/react@2` is internally pinned to `ai@5`, while this project depends on `ai@6`.
// Both versions share the same runtime contract for transports/data parts, but the
// TypeScript metadata diverges (V2 vs V3 ProviderMetadata). We cast `useChat`'s options
// once at the boundary to bridge the two structural type universes.
type UseChatArgs = Parameters<typeof useChat>[0]

export function LandingPage({ locale }: { locale: Locale }) {
  const t = useTranslations('ui')
  const [audioUrls, setAudioUrls] = useState<string[]>([])
  const conversationIdRef = useRef<string>(crypto.randomUUID())

  const transport = new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages, body }) => ({
      body: {
        ...body,
        messages,
        conversationId: conversationIdRef.current,
        language: locale,
        state: { step: 'greeting', captured: {}, turnCount: messages.length },
        voiceEnabled: false,
      },
    }),
  })

  const { messages, sendMessage, status } = useChat({
    transport,
    onData: (part: { type: string; data?: unknown }) => {
      if (
        part.type === 'data-audio' &&
        part.data &&
        typeof part.data === 'object' &&
        'url' in part.data &&
        typeof (part.data as { url: unknown }).url === 'string'
      ) {
        const url = (part.data as { url: string }).url
        setAudioUrls((prev) => [...prev, url])
      }
    },
  } as unknown as UseChatArgs)

  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex justify-between items-center px-6 py-4 border-b">
        <span className="font-heading text-xl">Perla Dental Clinics</span>
        <LanguageSwitcher current={locale} />
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 gap-6">
        <h1 className="font-heading text-3xl md:text-5xl max-w-2xl">{t('subtitle')}</h1>
        <p className="text-lg max-w-xl">{t('subcopy')}</p>

        <div className="my-4">
          <Persona state={status === 'streaming' ? 'thinking' : 'idle'} />
        </div>

        <MicButton
          onTranscript={(text) => {
            void sendMessage({ text })
          }}
          disabled={status === 'streaming'}
        />
        <span className="text-sm text-gray-500">— {t('orTypeBelow')} —</span>
      </section>

      <section className="px-4 py-6 max-w-2xl mx-auto w-full">
        <Conversation>
          {messages.map((m) => (
            <Message key={m.id} role={m.role}>
              {m.parts.map((p, i) =>
                p.type === 'text' ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: parts within a message are append-only and order-stable
                  <span key={`${m.id}-${i}`}>{p.text}</span>
                ) : null,
              )}
            </Message>
          ))}
        </Conversation>
      </section>

      <AudioPlayer urls={audioUrls} />
      <TrustStrip />
    </main>
  )
}
