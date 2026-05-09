import { transcribe } from '@/lib/voice/stt'

export const maxDuration = 30
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? 'audio/webm'
  const buffer = await req.arrayBuffer()
  if (buffer.byteLength === 0) {
    return Response.json({ error: 'empty audio' }, { status: 400 })
  }
  if (buffer.byteLength > 25 * 1024 * 1024) {
    return Response.json({ error: 'audio too large' }, { status: 413 })
  }
  try {
    const { text, language } = await transcribe(buffer, contentType)
    return Response.json({ text, language })
  } catch {
    return Response.json({ error: 'transcription failed' }, { status: 502 })
  }
}
