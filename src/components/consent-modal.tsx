'use client'

import { useTranslations } from 'next-intl'
import type { CapturedFields } from '@/lib/agent/types'

export function ConsentModal({
  fields,
  onAccept,
  onCancel,
}: {
  fields: Required<CapturedFields>
  onAccept: () => void
  onCancel: () => void
}) {
  const t = useTranslations('consent')
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 grid place-items-center p-4"
    >
      <div className="bg-surface text-text rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="font-heading text-xl">{t('leadModalTitle')}</h2>
        <dl className="text-sm space-y-1">
          <div>👤 {fields.fullName}</div>
          <div>📞 {fields.phone}</div>
          <div>✉️ {fields.email}</div>
          <div>💬 {fields.interest}</div>
          {fields.chronicIllnesses && <div>🩺 {fields.chronicIllnesses}</div>}
        </dl>
        <p className="text-sm">{t('leadModalAgree')}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">
            {t('leadModalCancel')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            {t('leadModalSend')}
          </button>
        </div>
      </div>
    </div>
  )
}
