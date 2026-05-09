import { requireEnv } from '@/lib/env'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apiKey = requireEnv('ELEVENLABS_API_KEY')

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${id}/audio`, {
    headers: {
      'xi-api-key': apiKey,
    },
  })

  if (!res.ok) {
    return new Response('Failed to fetch audio', { status: res.status })
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
