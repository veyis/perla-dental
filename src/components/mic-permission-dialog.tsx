'use client'

import { useTranslations } from 'next-intl'

export function MicPermissionDialog({
  onAccept,
  onDecline,
}: {
  onAccept: () => void
  onDecline: () => void
}) {
  const t = useTranslations('consent')
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 grid place-items-center p-4"
    >
      <div className="bg-surface rounded-lg max-w-md w-full p-6 space-y-4">
        <h2 className="font-heading text-xl">{t('micPermissionTitle')}</h2>
        <p>{t('micPermissionBody')}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onDecline} className="px-4 py-2 border rounded">
            {t('micPermissionDecline')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            {t('micPermissionContinue')}
          </button>
        </div>
      </div>
    </div>
  )
}
