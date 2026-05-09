import { getServerClient } from '@/lib/supabase'
import type { LeadRowInput } from './schema'

export type LeadInsertResult = { id: string }

export async function insertLead(lead: LeadRowInput): Promise<LeadInsertResult> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('leads')
    .insert({
      conversation_id: lead.conversationId,
      full_name: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      preferred_language: lead.preferredLanguage,
      interest: lead.interest,
      chronic_illnesses: lead.chronicIllnesses,
      summary: lead.summary ?? null,
      consent_text: lead.consentText,
      consent_given_at: lead.consentGivenAt,
      source: lead.source ?? 'direct',
      country_code: lead.countryCode ?? null,
      user_agent_short: lead.userAgentShort ?? null,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Lead insert failed: ${error.message}`)
  return { id: (data as { id: string }).id }
}

export async function appendAuditEvent(args: {
  kind:
    | 'lead_submitted'
    | 'lead_consent_pending'
    | 'emergency_escalated'
    | 'guardrail_event'
    | 'rate_limited'
  conversationId?: string | null
  detail: Record<string, unknown>
}): Promise<void> {
  const sb = getServerClient()
  const { error } = await sb.from('audit_events').insert({
    kind: args.kind,
    conversation_id: args.conversationId ?? null,
    detail: args.detail,
  })
  if (error) throw new Error(`Audit insert failed: ${error.message}`)
}
