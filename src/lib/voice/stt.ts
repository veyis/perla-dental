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

export async function transcribe(
  audio: ArrayBuffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const form = new FormData()
  form.append('file', new Blob([audio], { type: mimeType }), 'audio')
  form.append('model_id', MODEL_ID)
  // language_code = 'auto' lets Scribe auto-detect; we get the detected
  // ISO-639-1 code back in the response.
  form.append('language_code', 'auto')

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
  return {
    text: json.text ?? '',
    language: json.language_code ?? 'en',
  }
}
