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
      ip_address: lead.ipAddress ?? null,
      city: lead.city ?? null,
      region: lead.region ?? null,
      postal_code: lead.postalCode ?? null,
      continent: lead.continent ?? null,
      timezone: lead.timezone ?? null,
      latitude: lead.latitude ?? null,
      longitude: lead.longitude ?? null,
      referrer: lead.referrer ?? null,
      accept_language: lead.acceptLanguage ?? null,
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

export async function getAuditEvents(kind?: string) {
  const sb = getServerClient()
  let query = sb.from('audit_events').select('*').order('created_at', { ascending: false })
  if (kind) {
    query = query.eq('kind', kind)
  }
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch audit events: ${error.message}`)
  return data
}

export async function getLeads() {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Failed to fetch leads: ${error.message}`)
  return data
}

export async function getLeadById(id: string) {
  const sb = getServerClient()
  const { data, error } = await sb.from('leads').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to fetch lead: ${error.message}`)
  return data
}

export async function appendChatMessage(args: {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  language?: string | null
}): Promise<void> {
  const sb = getServerClient()
  const { error } = await sb.from('chat_messages').insert({
    conversation_id: args.conversationId,
    role: args.role,
    content: args.content,
    language: args.language ?? null,
  })
  if (error) throw new Error(`Chat message insert failed: ${error.message}`)
}

export async function getChatMessages(conversationId?: string) {
  const sb = getServerClient()
  let query = sb.from('chat_messages').select('*').order('created_at', { ascending: false })
  if (conversationId) {
    query = query.eq('conversation_id', conversationId)
  }
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch chat messages: ${error.message}`)
  return data
}
