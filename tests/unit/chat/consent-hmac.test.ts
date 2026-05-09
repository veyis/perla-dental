import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => {
  const fakeEnv: Record<string, string> = {
    LEAD_HMAC_SECRET: 'a'.repeat(64),
  }
  return {
    env: fakeEnv,
    requireEnv: (key: string) => {
      const v = fakeEnv[key]
      if (!v) throw new Error(`Missing required env var: ${key}`)
      return v
    },
    isAgentDisabled: () => false,
  }
})

import { signFields, verifyFields } from '@/lib/leads/consent-hmac'

const SAMPLE_FIELDS = {
  fullName: 'Jane Doe',
  phone: '+15551234567',
  email: 'jane@example.com',
  chronicIllnesses: null,
  interest: 'implants' as const,
  preferredLanguage: 'en' as const,
  consentGiven: true as const,
}

describe('consent-hmac', () => {
  beforeEach(() => {
    process.env.LEAD_HMAC_SECRET = 'a'.repeat(64)
  })

  it('round-trips: signed fields verify under the same conversationId', () => {
    const sig = signFields('conv-1', SAMPLE_FIELDS)
    expect(verifyFields('conv-1', SAMPLE_FIELDS, sig)).toBe(true)
  })

  it('rejects when the conversationId differs', () => {
    const sig = signFields('conv-1', SAMPLE_FIELDS)
    expect(verifyFields('conv-2', SAMPLE_FIELDS, sig)).toBe(false)
  })

  it('rejects when any field is tampered with', () => {
    const sig = signFields('conv-1', SAMPLE_FIELDS)
    const tampered = { ...SAMPLE_FIELDS, email: 'attacker@evil.com' }
    expect(verifyFields('conv-1', tampered, sig)).toBe(false)
  })

  it('rejects on a malformed signature', () => {
    expect(verifyFields('conv-1', SAMPLE_FIELDS, 'not-a-real-hex')).toBe(false)
  })
})
