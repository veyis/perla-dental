// Speech-to-text via ElevenLabs Scribe v2 (batch).
//
// We use the batch endpoint (not Realtime) because PTT delivers a complete
// audio blob on release — streaming buys nothing for ≤30s utterances and
// batch is cheaper ($0.22/hr vs $0.39/hr).
//
// Vendor consolidation note: ElevenLabs is already our TTS provider. Same
// account, single DPA, shared credit pool. Deepgram fallback preserved at
// `./stt-deepgram.ts` if a real-audio bake-off shows TR/RU regression.

import { env } from '@/lib/env'

export type TranscriptionResult = { text: string; language: string }

const SCRIBE_URL = 'https://api.elevenlabs.io/v1/speech-to-text'
const MODEL_ID = 'scribe_v2'

// ElevenLabs Scribe returns ISO-639-3 (e.g. "eng"); the rest of this app
// uses ISO-639-1 (e.g. "en"). Map only the four locales we support.
const ISO6393_TO_LOCALE: Record<string, string> = {
  eng: 'en',
  tur: 'tr',
  rus: 'ru',
  deu: 'de',
}

function filenameFor(mimeType: string): string {
  if (mimeType.includes('webm')) return 'audio.webm'
  if (mimeType.includes('mp4') || mimeType.includes('mp4a')) return 'audio.mp4'
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'audio.mp3'
  if (mimeType.includes('wav')) return 'audio.wav'
  if (mimeType.includes('ogg')) return 'audio.ogg'
  return 'audio.webm'
}

export async function transcribe(
  audio: ArrayBuffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const form = new FormData()
  form.append('file', new Blob([audio], { type: mimeType }), filenameFor(mimeType))
  form.append('model_id', MODEL_ID)
  // language_code omitted to allow ElevenLabs to auto-detect.

  const res = await fetch(SCRIBE_URL, {
    method: 'POST',
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
    body: form,
  })
  if (!res.ok) {
    throw new Error(`ElevenLabs Scribe ${res.status}: ${await res.text()}`)
  }
  const json = (await res.json()) as {
    text?: string
    language_code?: string
  }
  const iso3 = (json.language_code ?? '').toLowerCase()
  return {
    text: json.text ?? '',
    language: ISO6393_TO_LOCALE[iso3] ?? 'en',
  }
}
