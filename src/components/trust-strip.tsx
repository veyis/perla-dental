'use client'

import { useTranslations } from 'next-intl'

export function TrustStrip() {
  const t = useTranslations('trust')
  const f = useTranslations('footer')
  return (
    <footer className="border-t mt-auto px-6 py-4 text-sm text-gray-600 flex flex-col md:flex-row gap-2 justify-between">
      <div className="flex gap-4">
        <span>✓ {t('ministry')}</span>
        <span>✓ {t('iso')}</span>
        <span>✓ {t('specialists', { count: 7 })}</span>
      </div>
      <div className="flex gap-4">
        <span>{f('address')}</span>
        <span>·</span>
        <a href={`tel:${f('phone')}`}>{f('phone')}</a>
      </div>
    </footer>
  )
}
