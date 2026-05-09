import { beforeEach, describe, expect, it, vi } from 'vitest'

const { appendLeadRow, sendEmail, allowLead } = vi.hoisted(() => ({
  appendLeadRow: vi.fn(),
  sendEmail: vi.fn(),
  allowLead: vi.fn(),
}))

vi.mock('@/lib/leads/sheets', () => ({ appendLeadRow }))
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
  appendLeadRow.mockReset()
  sendEmail.mockReset()
  allowLead.mockReset()
})

describe('submitLead', () => {
  it('appends to Sheet and sends emails when allowed', async () => {
    allowLead.mockResolvedValue(true)
    appendLeadRow.mockResolvedValue(undefined)
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
    expect(appendLeadRow).toHaveBeenCalledOnce()
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
    expect(appendLeadRow).not.toHaveBeenCalled()
  })

  it('still emails clinic when Sheet append fails', async () => {
    allowLead.mockResolvedValue(true)
    appendLeadRow.mockRejectedValue(new Error('sheets down'))
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
