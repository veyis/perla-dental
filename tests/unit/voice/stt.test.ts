import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/env', () => ({ env: { ELEVENLABS_API_KEY: 'k' } }))

import { transcribe } from '@/lib/voice/stt'

beforeEach(() => fetchMock.mockReset())

describe('transcribe (ElevenLabs Scribe v2)', () => {
  it('POSTs to the Scribe endpoint with the audio blob and api key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'hello world', language_code: 'en' }),
    })
    const result = await transcribe(new ArrayBuffer(8), 'audio/webm')
    expect(result).toEqual({ text: 'hello world', language: 'en' })
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.elevenlabs.io/v1/speech-to-text')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe('k')
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('returns empty text + en fallback when the response omits fields', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) })
    const result = await transcribe(new ArrayBuffer(8), 'audio/webm')
    expect(result).toEqual({ text: '', language: 'en' })
  })

  it('throws on non-OK', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: async () => 'err' })
    await expect(transcribe(new ArrayBuffer(8), 'audio/webm')).rejects.toThrow(
      /ElevenLabs Scribe 500/,
    )
  })
})
