import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const { putMock } = vi.hoisted(() => ({ putMock: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: putMock }))

vi.mock('@/lib/env', () => ({
  env: { ELEVENLABS_API_KEY: 'k', ELEVENLABS_VOICE_ID: 'v', BLOB_READ_WRITE_TOKEN: 't' },
}))

import { synthesizeAndStoreSentence } from '@/lib/voice/tts'

beforeEach(() => {
  fetchMock.mockReset()
  putMock.mockReset()
})

describe('synthesizeAndStoreSentence', () => {
  it('generates audio and uploads to Blob', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })
    putMock.mockResolvedValue({ url: 'https://blob/abc.mp3' })

    const url = await synthesizeAndStoreSentence('Hello world.', 'en')
    expect(url).toBe('https://blob/abc.mp3')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(putMock).toHaveBeenCalledOnce()
  })
})
