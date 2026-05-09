import { transcribe } from '@/lib/voice/stt'

export const maxDuration = 30

export async function POST(req: Request) {
  console.log('[/api/voice/stt] incoming request')
  const contentType = req.headers.get('content-type') ?? 'audio/webm'
  const buffer = await req.arrayBuffer()
  console.log('[/api/voice/stt] buffer size:', buffer.byteLength, 'content-type:', contentType)

  if (buffer.byteLength === 0) {
    return Response.json({ error: 'empty audio' }, { status: 400 })
  }
  if (buffer.byteLength < 1024) {
    return Response.json({ error: 'audio too short' }, { status: 400 })
  }
  if (buffer.byteLength > 25 * 1024 * 1024) {
    return Response.json({ error: 'audio too large' }, { status: 413 })
  }

  try {
    const { text, language } = await transcribe(buffer, contentType)
    console.log('[/api/voice/stt] success:', { text, language })
    return Response.json({ text, language })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[/api/voice/stt] transcription failed:', { message, stack })
    return Response.json({ error: 'transcription failed', detail: message, stack }, { status: 502 })
  }
}
