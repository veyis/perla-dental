import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: { LEAD_HMAC_SECRET: 'a'.repeat(64) },
  requireEnv: (key: string) => {
    if (key === 'LEAD_HMAC_SECRET') return 'a'.repeat(64)
    throw new Error(`unexpected requireEnv call: ${key}`)
  },
  isAgentDisabled: () => false,
}))

vi.mock('@/lib/leads/submit-lead', () => ({
  submitLead: vi.fn(async () => ({ success: true, leadId: 'lead-xyz' })),
}))

vi.mock('@/lib/observability/audit', () => ({
  audit: vi.fn(async () => undefined),
}))

const FIELDS = {
  fullName: 'Jane Doe',
  phone: '+15551234567',
  email: 'jane@example.com',
  chronicIllnesses: null,
  interest: 'implants' as const,
  preferredLanguage: 'en' as const,
  consentGiven: true as const,
}

describe('/api/lead/submit', () => {
  let signFields: typeof import('@/lib/leads/consent-hmac').signFields
  let POST: typeof import('@/app/api/lead/submit/route').POST

  beforeEach(async () => {
    ;({ signFields } = await import('@/lib/leads/consent-hmac'))
    ;({ POST } = await import('@/app/api/lead/submit/route'))
  })
  afterEach(() => vi.clearAllMocks())

  it('writes the lead and returns leadId on a valid signed payload', async () => {
    const fingerprint = signFields('conv-1', FIELDS)
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', fields: FIELDS, fingerprint }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { leadId: string }
    expect(body.leadId).toBe('lead-xyz')
  })

  it('rejects 400 when the fingerprint does not match the fields', async () => {
    const fingerprint = signFields('conv-1', FIELDS)
    const tampered = { ...FIELDS, email: 'attacker@evil.com' }
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', fields: tampered, fingerprint }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('rejects 400 on malformed JSON', async () => {
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not-json',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('rejects 400 when fields fail Zod validation', async () => {
    const fingerprint = signFields('conv-1', FIELDS)
    const bad = { ...FIELDS, email: 'not-an-email' }
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', fields: bad, fingerprint }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
