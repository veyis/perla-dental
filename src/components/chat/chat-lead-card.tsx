'use client'

import { Loader2, Mail, Phone, ShieldCheck, Stethoscope, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { SubmitLeadInput } from '@/lib/agent/tools'
import { type LeadCardState, useChatContext } from './chat-provider'

export function ChatLeadCard({
  toolCallId,
  fields,
  fingerprint,
}: {
  toolCallId: string
  fields: SubmitLeadInput
  fingerprint: string
}) {
  const t = useTranslations('chat')
  const tConsent = useTranslations('consent')
  const tErrors = useTranslations('errors')
  const { conversationId, leadCardState, setLeadCardState, sendMessage } = useChatContext()
  const state: LeadCardState = leadCardState[toolCallId] ?? { phase: 'pending' }
  const [localError, setLocalError] = useState<string | null>(null)

  async function onAccept() {
    setLeadCardState(toolCallId, { phase: 'submitting' })
    setLocalError(null)
    try {
      const res = await fetch('/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId, fields, fingerprint }),
      })
      if (!res.ok) {
        setLeadCardState(toolCallId, {
          phase: 'error',
          message: tErrors('leadSubmitFailed'),
        })
        return
      }
      const json = (await res.json()) as { leadId: string }
      setLeadCardState(toolCallId, { phase: 'success', leadId: json.leadId })
      sendMessage({
        text: '[system] Lead confirmed by user — please close the conversation per step 6.',
        // biome-ignore lint/suspicious/noExplicitAny: AI SDK metadata pass-through
        metadata: { hidden: true } as any,
      } as never)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'submit_error')
      setLeadCardState(toolCallId, {
        phase: 'error',
        message: tErrors('leadSubmitFailed'),
      })
    }
  }

  function onCancel() {
    setLeadCardState(toolCallId, { phase: 'cancelled' })
    sendMessage({
      text: '[system] User wants to revise their details — please ask again.',
      // biome-ignore lint/suspicious/noExplicitAny: AI SDK metadata pass-through
      metadata: { hidden: true } as any,
    } as never)
  }

  if (state.phase === 'cancelled') return null

  if (state.phase === 'success') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>{t('leadConfirmed')}</span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-primary/20 shadow-premium p-4 space-y-3">
      <h3 className="font-bold text-sm">{tConsent('leadModalTitle')}</h3>
      <dl className="text-xs space-y-1.5 text-text-muted">
        <Row icon={<User className="w-3.5 h-3.5" />}>{fields.fullName}</Row>
        <Row icon={<Phone className="w-3.5 h-3.5" />}>{fields.phone}</Row>
        <Row icon={<Mail className="w-3.5 h-3.5" />}>{fields.email}</Row>
        <Row icon={<Stethoscope className="w-3.5 h-3.5" />}>
          {fields.interest}
          {fields.chronicIllnesses ? ` · ${fields.chronicIllnesses}` : ''}
        </Row>
      </dl>
      <p className="text-[11px] leading-snug text-text-muted">{tConsent('leadModalAgree')}</p>
      {state.phase === 'error' && <p className="text-[11px] text-red-600">{state.message}</p>}
      {localError && <p className="text-[11px] text-red-600">{localError}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={state.phase === 'submitting'}
          className="px-3 py-1.5 text-xs font-medium border border-black/10 rounded-full hover:bg-black/5 transition disabled:opacity-50"
        >
          {tConsent('leadModalCancel')}
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={state.phase === 'submitting'}
          className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-full hover:bg-primary-light transition disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {state.phase === 'submitting' && <Loader2 className="w-3 h-3 animate-spin" />}
          {tConsent('leadModalSend')}
        </button>
      </div>
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
