'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { AudioPlayer, Conversation, Message } from '@/components/ai-elements'
import type { AudioPlayerHandle } from '@/components/ai-elements/audio-player'
import type { Locale } from '@/i18n/config'
import { TrustStrip } from './trust-strip'
import { Navbar } from './navbar'
import { Hero } from './hero'
import { Services } from './services'
import { About } from './about'
import { Contact } from './contact'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Send } from 'lucide-react'

type UseChatArgs = Parameters<typeof useChat>[0]

type AudioChunk = { index: number; url: string }

export function LandingPage({ locale }: { locale: Locale }) {
  const t = useTranslations('ui')
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])
  const [input, setInput] = useState('')
  const conversationIdRef = useRef<string>(crypto.randomUUID())
  const audioPlayerRef = useRef<AudioPlayerHandle>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const transport = new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages: msgs, body }) => {
      // Number of user messages so far = the agent's current turn. More
      // meaningful than msgs.length (which double-counts user+assistant).
      const turnCount = (msgs as Array<{ role: string }>).filter((m) => m.role === 'user').length
      return {
        body: {
          ...body,
          messages: msgs,
          conversationId: conversationIdRef.current,
          language: locale,
          // captured fields are inferred by the model from conversation history.
          state: { step: 'greeting', captured: {}, turnCount },
          voiceEnabled: true,
        },
      }
    },
  })

  /** Called whenever the user starts a new turn — interrupt any agent audio. */
  function startNewTurn() {
    audioPlayerRef.current?.stop()
    setAudioChunks([])
  }

  const { messages, sendMessage, status } = useChat({
    transport,
    onData: (part: { type: string; data?: unknown }) => {
      console.log('[landing-page] onData part:', part.type, part.data)
      if (
        part.type === 'data-audio' &&
        part.data &&
        typeof part.data === 'object' &&
        'url' in part.data &&
        typeof (part.data as { url: unknown }).url === 'string'
      ) {
        const data = part.data as { url: string; index?: number }
        const chunk: AudioChunk = {
          index: typeof data.index === 'number' ? data.index : Number.MAX_SAFE_INTEGER,
          url: data.url,
        }
        console.log('[landing-page] queueing audio chunk:', chunk)
        setAudioChunks((prev) => [...prev, chunk])
      }
    },
  } as unknown as UseChatArgs)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'streaming') return
    startNewTurn()
    void sendMessage({ text })
    setInput('')
  }

  return (
    <div className="bg-white">
      <Navbar locale={locale} />
      
      <main>
        <Hero
          title={t('subtitle')}
          subtitle={t('subcopy')}
          status={status}
          locale={locale}
        />

        <Services />

        <About />

        <section id="chat" className="py-24 relative overflow-hidden bg-white">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-30 -z-10" />
          
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Personal Dental Concierge</h2>
                <p className="text-text-muted">Experience our AI assistant for instant answers about treatments, pricing, and scheduling.</p>
              </div>

              <div className="glass rounded-[40px] shadow-premium border border-white/40 overflow-hidden flex flex-col h-[600px]">
                <div className="p-6 border-b flex items-center justify-between bg-white/50">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-bold">Live AI Assistant</span>
                  </div>
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-accent/5" ref={scrollRef}>
                  <AnimatePresence mode="wait">
                    {messages.length === 0 ? (
                      <motion.div 
                        key="empty-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-full text-center text-text-muted"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <MessageSquare className="w-8 h-8 text-primary" />
                        </div>
                        <p className="max-w-xs text-sm">
                          Start a conversation by typing below or clicking the microphone above.
                        </p>
                      </motion.div>
                    ) : (
                      <Conversation key="conversation-list">
                      {messages.map((m, index) => (
                        <Message key={m.id || index} role={m.role}>
                          {m.parts.map((p, i) =>
                            p.type === 'text' ? (
                              <span key={`${m.id}-${i}`}>{p.text}</span>
                            ) : null,
                          )}
                        </Message>
                      ))}
                      </Conversation>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-6 bg-white/80">
                  <form
                    onSubmit={handleSubmit}
                    className="relative"
                  >
                    <input
                      className="w-full bg-accent/20 border-none rounded-2xl px-6 py-4 pr-16 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      placeholder="Type your message here..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={!input || status === 'streaming'}
                      className="absolute right-2 top-2 bottom-2 aspect-square bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-light transition-all disabled:opacity-50"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Contact />
      </main>

      <AudioPlayer ref={audioPlayerRef} chunks={audioChunks} />
      <TrustStrip />
    </div>
  )
}
