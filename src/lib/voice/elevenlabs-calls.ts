import { requireEnv } from '@/lib/env'

export type ElevenLabsConversation = {
  conversation_id: string
  agent_id: string
  status: 'processing' | 'completed'
  start_time_unix_ms: number
  duration_seconds: number
  transcript: Array<{
    role: 'user' | 'agent'
    message: string
    time_in_call_secs: number
  }>
  metadata: {
    caller_id?: string
  }
}

export async function getElevenLabsConversations() {
  const apiKey = requireEnv('ELEVENLABS_API_KEY')
  const agentId = requireEnv('NEXT_PUBLIC_ELEVENLABS_AGENT_ID')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}`, {
    signal: ac.signal,
    headers: {
      'xi-api-key': apiKey,
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
  }).finally(() => clearTimeout(timer))

  if (!res.ok) {
    const error = await res.text()
    console.error('[elevenlabs] Failed to fetch conversations', error)
    return []
  }

  const data = await res.json()
  return data.conversations || []
}

export async function getElevenLabsConversation(conversationId: string) {
  const apiKey = requireEnv('ELEVENLABS_API_KEY')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    signal: ac.signal,
    headers: {
      'xi-api-key': apiKey,
    },
  }).finally(() => clearTimeout(timer))

  if (!res.ok) {
    return null
  }

  return res.json() as Promise<ElevenLabsConversation>
}

export async function getElevenLabsRecordingUrl(conversationId: string) {
  const apiKey = requireEnv('ELEVENLABS_API_KEY')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
    {
      signal: ac.signal,
      headers: {
        'xi-api-key': apiKey,
      },
    },
  ).finally(() => clearTimeout(timer))

  if (!res.ok) {
    return null
  }

  // The API returns the audio file directly or a URL?
  // Usually it returns the audio stream. We might want to proxy it.
  return `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`
}
