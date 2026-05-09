import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const { uploadMock, getPublicUrlMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  getServerClient: () => ({
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  }),
}))

vi.mock('@/lib/env', () => {
  const fakeEnv: Record<string, string> = {
    ELEVENLABS_API_KEY: 'k',
    ELEVENLABS_VOICE_ID: 'v',
  }
  return {
    env: fakeEnv,
    requireEnv: (key: string) => {
      const v = fakeEnv[key]
      if (!v) throw new Error(`Missing required env var: ${key}`)
      return v
    },
  }
})

import { synthesizeAndStoreSentence } from '@/lib/voice/tts'

beforeEach(() => {
  fetchMock.mockReset()
  uploadMock.mockReset()
  getPublicUrlMock.mockReset()
})

describe('synthesizeAndStoreSentence', () => {
  it('generates audio and uploads to Supabase Storage', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })
    uploadMock.mockResolvedValue({ data: { path: 'en/abc.mp3' }, error: null })
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://supa/storage/v1/object/public/perla-tts/en/abc.mp3' },
    })

    const url = await synthesizeAndStoreSentence('Hello world.', 'en')
    expect(url).toBe('https://supa/storage/v1/object/public/perla-tts/en/abc.mp3')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(uploadMock).toHaveBeenCalledOnce()
    expect(getPublicUrlMock).toHaveBeenCalledOnce()
  })

  it('sends language_code in request body for non-English locales', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })
    uploadMock.mockResolvedValue({ data: { path: 'tr/abc.mp3' }, error: null })
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://supa/storage/v1/object/public/perla-tts/tr/abc.mp3' },
    })

    await synthesizeAndStoreSentence('Merhaba dünya.', 'tr')

    const [, initOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(initOptions.body as string)
    expect(body.language_code).toBe('tr')
  })

  it('sends language_code "en" for English locale', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })
    uploadMock.mockResolvedValue({ data: { path: 'en/abc.mp3' }, error: null })
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://supa/storage/v1/object/public/perla-tts/en/abc.mp3' },
    })

    await synthesizeAndStoreSentence('Hello world.', 'en')

    const [, initOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(initOptions.body as string)
    expect(body.language_code).toBe('en')
  })
})
