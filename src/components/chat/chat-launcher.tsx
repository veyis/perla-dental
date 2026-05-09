'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { ChatPanel } from './chat-panel'
import { useChatContext } from './chat-provider'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ChatLauncher() {
  const t = useTranslations('chat')
  const { isLauncherOpen, openLauncher, closeLauncher, isInlineVisible } = useChatContext()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Esc closes; Tab cycles focus inside the panel.
  useEffect(() => {
    if (!isLauncherOpen) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeLauncher()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('inert') && el.offsetParent !== null,
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isLauncherOpen, closeLauncher])

  // On open: remember the previously-focused element, move focus to the
  // composer textarea (or first focusable). On close: restore.
  useEffect(() => {
    if (!isLauncherOpen) {
      previouslyFocusedRef.current?.focus?.()
      previouslyFocusedRef.current = null
      return
    }
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    // Defer to after the panel mounts.
    const id = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const textarea = panel.querySelector<HTMLTextAreaElement>('textarea')
      if (textarea) {
        textarea.focus()
        return
      }
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      firstFocusable?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [isLauncherOpen])

  const hideBubble = isInlineVisible

  return (
    <>
      <AnimatePresence>
        {!isLauncherOpen && !hideBubble && (
          <motion.button
            type="button"
            onClick={openLauncher}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ delay: 1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-[0_12px_40px_rgba(30,95,116,0.35)] grid place-items-center"
            aria-label={t('openLauncher')}
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLauncherOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 sm:hidden"
              onClick={closeLauncher}
            />

            <motion.div
              key="panel"
              ref={panelRef}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              style={{ transformOrigin: 'bottom right' }}
              className="fixed z-50 bg-white rounded-[28px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-black/5 bottom-4 right-4 left-4 top-4 sm:left-auto sm:top-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[min(640px,calc(100vh-96px))]"
              role="dialog"
              aria-modal="true"
              aria-label={t('headerTitle')}
            >
              <ChatPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
