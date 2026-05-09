import { type CountryCode, parsePhoneNumber } from 'libphonenumber-js'
import type { LeadRecord } from '@/lib/agent/types'

export const SHEET_COLUMNS = [
  'timestamp_utc',
  'lead_id',
  'conversation_id',
  'full_name',
  'phone',
  'email',
  'preferred_language',
  'interest',
  'chronic_illnesses',
  'summary',
  'consent_text',
  'consent_given_at',
  'source',
  'country_code',
  'user_agent_short',
  'status',
  'clinic_notes',
] as const

export function normalizePhone(raw: string, country?: CountryCode): string {
  try {
    const parsed = parsePhoneNumber(raw, country)
    return parsed?.isValid() ? parsed.format('E.164') : raw
  } catch {
    return raw
  }
}

export type LeadRowInput = Pick<
  LeadRecord,
  | 'leadId'
  | 'conversationId'
  | 'fullName'
  | 'phone'
  | 'email'
  | 'preferredLanguage'
  | 'interest'
  | 'chronicIllnesses'
  | 'consentText'
  | 'consentGivenAt'
  | 'countryCode'
  | 'source'
  | 'userAgentShort'
  | 'summary'
> & { timestampUtc: string }

export function leadToSheetRow(lead: LeadRowInput): string[] {
  const map: Record<(typeof SHEET_COLUMNS)[number], string> = {
    timestamp_utc: lead.timestampUtc,
    lead_id: lead.leadId,
    conversation_id: lead.conversationId,
    full_name: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    preferred_language: lead.preferredLanguage,
    interest: lead.interest,
    chronic_illnesses: lead.chronicIllnesses ?? '',
    summary: lead.summary ?? '',
    consent_text: lead.consentText,
    consent_given_at: lead.consentGivenAt,
    source: lead.source ?? 'direct',
    country_code: lead.countryCode ?? '',
    user_agent_short: lead.userAgentShort ?? '',
    status: 'new',
    clinic_notes: '',
  }
  return SHEET_COLUMNS.map((c) => map[c])
}
