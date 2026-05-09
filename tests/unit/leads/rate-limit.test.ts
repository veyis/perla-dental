import { beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  getServerClient: () => ({ rpc: rpcMock }),
}))

import { allowLead } from '@/lib/leads/rate-limit'

beforeEach(() => {
  rpcMock.mockReset()
})

describe('allowLead', () => {
  it('allows the first request', async () => {
    rpcMock.mockResolvedValue({ data: 1, error: null })
    expect(await allowLead('1.2.3.4')).toBe(true)
    expect(rpcMock).toHaveBeenCalledWith('touch_rate_limit', {
      p_key: 'lead:1.2.3.4',
      p_window_seconds: 60 * 60,
    })
  })

  it('allows up to 3 within an hour', async () => {
    rpcMock.mockResolvedValue({ data: 3, error: null })
    expect(await allowLead('1.2.3.4')).toBe(true)
  })

  it('rejects the 4th', async () => {
    rpcMock.mockResolvedValue({ data: 4, error: null })
    expect(await allowLead('1.2.3.4')).toBe(false)
  })
})
