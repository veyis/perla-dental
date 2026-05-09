import type { Locale } from '@/i18n/config'
import { requireEnv } from '@/lib/env'
import { getServerClient } from '@/lib/supabase'

const BUCKET = 'perla-tts'

/**
 * Synthesize a sentence with ElevenLabs and store the resulting MP3 in
 * Supabase Storage. Returns the public URL.
 *
 * Endpoint: POST /v1/text-to-speech/{voice_id}  (non-streaming)
 *   We deliberately do NOT use /stream — we need the full MP3 to upload
 *   to Storage, and the non-streaming endpoint is one less moving part.
 *
 * Model: eleven_flash_v2_5 — fastest multilingual.
 *
 * Locales we send: 'en' / 'tr' / 'ru' / 'de' (ISO-639-1, Flash v2.5 accepts).
 */
export async function synthesizeAndStoreSentence(text: string, language: Locale): Promise<string> {
  const voiceId = requireEnv('ELEVENLABS_VOICE_ID')
  const apiKey = requireEnv('ELEVENLABS_API_KEY')
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`

  console.log('[tts] synth start', { len: text.length, language })

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8_000)

  const res = await fetch(url, {
    method: 'POST',
    signal: ac.signal,
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      language_code: language,
      voice_settings: {
        stability: 0.4,
        similarity_boost: 0.85,
        style: 0.05,
        use_speaker_boost: true,
      },
    }),
  }).finally(() => clearTimeout(timer))

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[tts] ElevenLabs error', { status: res.status, body: body.slice(0, 500) })
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`)
  }
  const audio = await res.arrayBuffer()
  console.log('[tts] synth ok', { bytes: audio.byteLength })

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
  const path = `${language}/${id}`

  const sb = getServerClient()
  const { error } = await sb.storage.from(BUCKET).upload(path, audio, {
    contentType: 'audio/mpeg',
    upsert: false,
  })
  if (error) {
    console.error('[tts] storage upload failed', error.message)
    throw new Error(`Supabase storage upload failed: ${error.message}`)
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
  console.log('[tts] uploaded', data.publicUrl)
  return data.publicUrl
}
