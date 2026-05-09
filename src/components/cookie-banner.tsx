'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

export function CookieBanner() {
  const t = useTranslations('consent')
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    setVisible(localStorage.getItem('perla-cookie-ack') !== '1')
  }, [])
  if (!visible) return null
  return (
    <div className="fixed bottom-0 inset-x-0 bg-text text-surface p-3 flex justify-between gap-4 text-sm">
      <span>{t('cookieBanner')}</span>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem('perla-cookie-ack', '1')
          setVisible(false)
        }}
        className="underline"
      >
        {t('cookieAccept')}
      </button>
    </div>
  )
}
