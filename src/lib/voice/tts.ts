import type { Locale } from '@/i18n/config'
import { env } from '@/lib/env'
import { getServerClient } from '@/lib/supabase'

const BUCKET = 'perla-tts'

export async function synthesizeAndStoreSentence(text: string, language: Locale): Promise<string> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${env.ELEVENLABS_VOICE_ID}/stream?output_format=mp3_44100_128`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      language_code: language,
    }),
  })
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}`)
  const audio = await res.arrayBuffer()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
  const path = `${language}/${id}`

  // sb.storage is a separate API and isn't affected by the perla schema
  // override on the same client.
  const sb = getServerClient()
  const { error } = await sb.storage.from(BUCKET).upload(path, audio, {
    contentType: 'audio/mpeg',
    upsert: false,
  })
  if (error) throw new Error(`Supabase storage upload failed: ${error.message}`)

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
