'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { ChatPanel } from './chat-panel'
import { useChatContext } from './chat-provider'

export function InlineChatSection() {
  const t = useTranslations('chat')
  const { setInlineVisible } = useChatContext()
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setInlineVisible(entry.isIntersecting && entry.intersectionRatio >= 0.4),
      { threshold: [0, 0.4, 1] },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [setInlineVisible])

  return (
    <section id="chat" ref={sectionRef} className="py-24 relative overflow-hidden bg-white">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-30 -z-10" />
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              {t('sectionTitle')}
            </h2>
            <p className="text-text-muted">{t('sectionSubtitle')}</p>
          </motion.div>

          <div className="h-[640px] md:h-[640px] max-h-[70vh]">
            <ChatPanel inline />
          </div>
        </div>
      </div>
    </section>
  )
}
