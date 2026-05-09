import { describe, it, expect, vi, beforeEach } from 'vitest'

const incrMock = vi.fn()
const expireMock = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: class {
    incr = incrMock
    expire = expireMock
  },
}))

vi.mock('@/lib/env', () => ({
  env: { UPSTASH_REDIS_REST_URL: 'http://x', UPSTASH_REDIS_REST_TOKEN: 'y' },
}))

import { allowLead } from '@/lib/leads/rate-limit'

beforeEach(() => {
  incrMock.mockReset()
  expireMock.mockReset()
})

describe('allowLead', () => {
  it('allows the first request', async () => {
    incrMock.mockResolvedValue(1)
    expect(await allowLead('1.2.3.4')).toBe(true)
  })

  it('allows up to 3 within an hour', async () => {
    incrMock.mockResolvedValue(3)
    expect(await allowLead('1.2.3.4')).toBe(true)
  })

  it('rejects the 4th', async () => {
    incrMock.mockResolvedValue(4)
    expect(await allowLead('1.2.3.4')).toBe(false)
  })
})
