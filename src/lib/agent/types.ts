import type { Locale } from '@/i18n/config'

export type ConversationStep =
  | 'greeting'
  | 'needs_analysis'
  | 'value_prop'
  | 'lead_capture'
  | 'health_check'
  | 'closing'

export type CapturedFields = {
  fullName?: string
  phone?: string
  email?: string
  chronicIllnesses?: string
  interest?: 'implants' | 'veneers' | 'all-on-4' | 'all-on-6' | 'smile-makeover' | 'other'
}

export type ConversationState = {
  conversationId: string
  language: Locale
  step: ConversationStep
  captured: CapturedFields
  turnCount: number
}

export type LeadRecord = Required<
  Pick<CapturedFields, 'fullName' | 'phone' | 'email' | 'interest'>
> & {
  chronicIllnesses: string | null
  preferredLanguage: Locale
  consentGiven: true
  consentText: string
  consentGivenAt: string
  conversationId: string
  leadId: string
  countryCode?: string
  source?: string
  userAgentShort?: string
  summary?: string
}
