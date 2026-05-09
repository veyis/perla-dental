'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useChatContext } from './chat-provider'

const CHIPS = [
  { key: 'chipImplants', emoji: '🦷' },
  { key: 'chipVeneers', emoji: '✨' },
  { key: 'chipDentalHoliday', emoji: '✈️' },
  { key: 'chipDoctors', emoji: '👨‍⚕️' },
] as const

export function ChatGreeting() {
  const t = useTranslations('chat')
  const { sendMessage, status } = useChatContext()
  const disabled = status === 'streaming' || status === 'submitted'

  return (
    <div className="flex flex-col items-center text-center gap-6 py-10 px-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm text-text-muted text-sm leading-relaxed"
      >
        {t('greeting')}
      </motion.div>
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map((chip, i) => (
          <motion.button
            key={chip.key}
            type="button"
            disabled={disabled}
            onClick={() => sendMessage({ text: t(chip.key) })}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
            className="px-3 py-2 text-xs font-medium rounded-full bg-white border border-black/10 hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-50"
          >
            <span className="mr-1.5" aria-hidden>
              {chip.emoji}
            </span>
            {t(chip.key)}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
