import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/env', () => ({ env: { DEEPGRAM_API_KEY: 'k' } }))

import { transcribe } from '@/lib/voice/stt'

beforeEach(() => fetchMock.mockReset())

describe('transcribe', () => {
  it('POSTs to Deepgram with the audio buffer', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: {
          channels: [{ alternatives: [{ transcript: 'hello world' }] }],
          language: 'en',
        },
      }),
    })
    const result = await transcribe(new ArrayBuffer(8), 'audio/webm')
    expect(result.text).toBe('hello world')
    expect(fetchMock).toHaveBeenCalledOnce()
    const url = fetchMock.mock.calls[0][0] as string
    expect(url).toContain('api.deepgram.com')
    expect(url).toContain('model=nova-3')
  })

  it('throws on non-OK', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'err' })
    await expect(transcribe(new ArrayBuffer(8), 'audio/webm')).rejects.toThrow()
  })
})
