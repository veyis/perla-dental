import { type CountryCode, parsePhoneNumber } from 'libphonenumber-js'
import type { LeadRecord } from '@/lib/agent/types'

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
> & {
  ipAddress?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  continent?: string | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
  referrer?: string | null
  acceptLanguage?: string | null
}
