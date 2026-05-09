import { beforeEach, describe, expect, it, vi } from 'vitest'

const { insertLead, sendEmail, allowLead } = vi.hoisted(() => ({
  insertLead: vi.fn(),
  sendEmail: vi.fn(),
  allowLead: vi.fn(),
}))

vi.mock('@/lib/leads/supabase-leads', () => ({ insertLead }))
vi.mock('@/lib/leads/rate-limit', () => ({ allowLead }))
vi.mock('@/lib/leads/email-sender', () => ({ sendEmail }))
vi.mock('@/lib/env', () => ({
  env: {
    LEAD_NOTIFICATION_EMAIL: 'clinic@p.com',
    LEAD_FROM_EMAIL: 'leads@p.com',
    LOG_LEVEL: 'silent',
  },
}))

import { submitLead } from '@/lib/leads/submit-lead'

beforeEach(() => {
  insertLead.mockReset()
  sendEmail.mockReset()
  allowLead.mockReset()
})

describe('submitLead', () => {
  it('inserts to Supabase and sends emails when allowed', async () => {
    allowLead.mockResolvedValue(true)
    insertLead.mockResolvedValue({ id: 'uuid-1' })
    sendEmail.mockResolvedValue({ id: 'e1' })

    const result = await submitLead({
      ip: '1.2.3.4',
      conversationId: 'c1',
      input: {
        fullName: 'Anna Müller',
        phone: '+493012345678',
        email: 'a@b.de',
        chronicIllnesses: null,
        interest: 'all-on-4',
        preferredLanguage: 'de',
        consentGiven: true,
      },
      consentText: 'I agree',
    })

    expect(result.success).toBe(true)
    if (result.success === true) {
      expect(result.leadId).toBe('uuid-1')
    }
    expect(insertLead).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledTimes(2) // clinic + patient
  })

  it('rejects when rate-limited', async () => {
    allowLead.mockResolvedValue(false)
    const result = await submitLead({
      ip: '1.2.3.4',
      conversationId: 'c1',
      input: {
        fullName: 'A',
        phone: '+11',
        email: 'a@b.c',
        chronicIllnesses: null,
        interest: 'implants',
        preferredLanguage: 'en',
        consentGiven: true,
      },
      consentText: 'ok',
    })
    expect(result.success).toBe(false)
    if (result.success === false) {
      expect(result.reason).toBe('rate_limited')
    }
    expect(insertLead).not.toHaveBeenCalled()
  })

  it('still emails clinic when Supabase insert fails', async () => {
    allowLead.mockResolvedValue(true)
    insertLead.mockRejectedValue(new Error('supabase down'))
    sendEmail.mockResolvedValue({ id: 'e1' })

    const result = await submitLead({
      ip: '1.2.3.4',
      conversationId: 'c1',
      input: {
        fullName: 'A',
        phone: '+11',
        email: 'a@b.c',
        chronicIllnesses: null,
        interest: 'implants',
        preferredLanguage: 'en',
        consentGiven: true,
      },
      consentText: 'ok',
    })
    expect(result.success).toBe(true)
    if (result.success === true) {
      expect(result.degraded).toBe(true)
    }
    expect(sendEmail).toHaveBeenCalled()
  })
})
