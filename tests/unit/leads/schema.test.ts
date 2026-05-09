import { describe, it, expect } from 'vitest'
import { normalizePhone, leadToSheetRow, SHEET_COLUMNS } from '@/lib/leads/schema'

describe('normalizePhone', () => {
  it('converts to E.164', () => {
    expect(normalizePhone('+49 30 123 456 78', 'DE')).toBe('+493012345678')
  })
  it('returns input unchanged when invalid', () => {
    expect(normalizePhone('xxx', 'DE')).toBe('xxx')
  })
})

describe('leadToSheetRow', () => {
  it('produces a row in column order', () => {
    const row = leadToSheetRow({
      timestampUtc: '2026-05-08T14:32:11Z',
      leadId: 'lead_abc',
      conversationId: 'conv_xyz',
      fullName: 'Anna Müller',
      phone: '+493012345678',
      email: 'anna@example.de',
      preferredLanguage: 'de',
      interest: 'all-on-4',
      chronicIllnesses: 'Type 2 diabetes',
      summary: 'Patient missed 6 upper teeth.',
      consentText: 'I agree to share...',
      consentGivenAt: '2026-05-08T14:32:09Z',
      source: 'direct',
      countryCode: 'DE',
      userAgentShort: 'Chrome 138 / iOS',
    })
    expect(row).toHaveLength(SHEET_COLUMNS.length)
    expect(row[0]).toBe('2026-05-08T14:32:11Z')
    expect(row[3]).toBe('Anna Müller')
    expect(row[SHEET_COLUMNS.indexOf('status')]).toBe('new')
  })
})
