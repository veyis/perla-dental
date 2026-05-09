import { describe, expect, it } from 'vitest'
import { escalateEmergencyParams, submitLeadParams } from '@/lib/agent/tools'

describe('submitLead schema', () => {
  it('accepts a valid payload', () => {
    const result = submitLeadParams.safeParse({
      fullName: 'Anna Müller',
      phone: '+49 30 123 456 78',
      email: 'anna@example.de',
      chronicIllnesses: 'Type 2 diabetes',
      interest: 'all-on-4',
      preferredLanguage: 'de',
      consentGiven: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects when consentGiven is false', () => {
    const result = submitLeadParams.safeParse({
      fullName: 'Anna',
      phone: '+49 30 12345',
      email: 'a@b.de',
      chronicIllnesses: null,
      interest: 'implants',
      preferredLanguage: 'de',
      consentGiven: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects malformed phone', () => {
    const result = submitLeadParams.safeParse({
      fullName: 'Anna',
      phone: 'not-a-phone',
      email: 'a@b.de',
      chronicIllnesses: null,
      interest: 'implants',
      preferredLanguage: 'de',
      consentGiven: true,
    })
    expect(result.success).toBe(false)
  })

  it('accepts null chronicIllnesses', () => {
    const result = submitLeadParams.safeParse({
      fullName: 'Anna',
      phone: '+49 30 1234567',
      email: 'a@b.de',
      chronicIllnesses: null,
      interest: 'implants',
      preferredLanguage: 'de',
      consentGiven: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('escalateEmergency schema', () => {
  it('accepts a summary', () => {
    const r = escalateEmergencyParams.safeParse({
      summary: 'Severe swelling on left jaw 12 hours.',
      contactInfo: '+49 30 12345',
    })
    expect(r.success).toBe(true)
  })
})
