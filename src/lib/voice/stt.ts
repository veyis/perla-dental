import { env } from '@/lib/env'

export type TranscriptionResult = { text: string; language: string }

export async function transcribe(
  audio: ArrayBuffer,
  mimeType: string,
): Promise<TranscriptionResult> {
  const url =
    'https://api.deepgram.com/v1/listen?model=nova-3&detect_language=true&smart_format=true&punctuate=true'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
      'Content-Type': mimeType,
    },
    body: audio,
  })
  if (!res.ok) {
    throw new Error(`Deepgram ${res.status}: ${await res.text()}`)
  }
  const json = (await res.json()) as {
    results: {
      channels: Array<{ alternatives: Array<{ transcript: string }> }>
      language?: string
    }
  }
  return {
    text: json.results.channels[0]?.alternatives[0]?.transcript ?? '',
    language: json.results.language ?? 'en',
  }
}
