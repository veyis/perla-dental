'use client'

import { Volume2, VolumeX, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Persona } from '@/components/ai-elements'
import { useChatContext } from './chat-provider'

export function ChatHeader({ showClose = false }: { showClose?: boolean }) {
  const t = useTranslations('chat')
  const { ttsEnabled, setTtsEnabled, status, closeLauncher } = useChatContext()
  const personaState =
    status === 'streaming' ? 'speaking' : status === 'submitted' ? 'thinking' : 'idle'

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="scale-50 -m-6">
          <Persona state={personaState} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm">{t('headerTitle')}</span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t('headerOnline')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className="p-2 rounded-full hover:bg-black/5 transition"
          aria-label={ttsEnabled ? t('muteOff') : t('muteOn')}
          title={ttsEnabled ? t('muteOff') : t('muteOn')}
        >
          {ttsEnabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-text-muted" />
          )}
        </button>
        {showClose && (
          <button
            type="button"
            onClick={closeLauncher}
            className="p-2 rounded-full hover:bg-black/5 transition"
            aria-label={t('closeLauncher')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
