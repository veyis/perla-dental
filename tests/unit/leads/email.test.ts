import { describe, expect, it } from 'vitest'
import { renderClinicEmail, renderPatientEmail } from '@/lib/leads/email'

const lead = {
  fullName: 'Anna Müller',
  phone: '+493012345678',
  email: 'anna@example.de',
  preferredLanguage: 'de' as const,
  interest: 'all-on-4' as const,
  chronicIllnesses: 'Type 2 diabetes',
  summary: 'Six upper teeth missing, plans October travel.',
  leadId: 'lead_abc',
  consentText: 'I agree...',
  consentGivenAt: '2026-05-08T14:32:09Z',
}

describe('renderClinicEmail', () => {
  it('subject has the lead name and interest', () => {
    const e = renderClinicEmail(lead)
    expect(e.subject).toContain('Anna Müller')
    expect(e.subject).toContain('all-on-4')
  })

  it('body includes phone, email, summary, consent', () => {
    const e = renderClinicEmail(lead)
    expect(e.text).toContain('+493012345678')
    expect(e.text).toContain('anna@example.de')
    expect(e.text).toContain('Six upper teeth')
    expect(e.text).toContain('I agree')
  })

  it('reply-to is the patient email', () => {
    expect(renderClinicEmail(lead).replyTo).toBe('anna@example.de')
  })
})

describe('renderPatientEmail', () => {
  it('uses preferred language', () => {
    const en = renderPatientEmail({ ...lead, preferredLanguage: 'en' })
    const de = renderPatientEmail({ ...lead, preferredLanguage: 'de' })
    expect(en.text).toContain('Thank you')
    expect(de.text).toContain('Vielen Dank')
  })
})
