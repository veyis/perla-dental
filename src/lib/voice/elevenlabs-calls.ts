import { requireEnv } from '@/lib/env'

export type ElevenLabsCallStatus = 'initiated' | 'in-progress' | 'processing' | 'done' | 'failed'

export type ElevenLabsConversationListItem = {
  conversation_id: string
  agent_id: string
  agent_name: string | null
  start_time_unix_secs: number
  call_duration_secs: number
  message_count: number
  status: ElevenLabsCallStatus
  call_successful: 'success' | 'failure' | 'unknown' | null
  call_summary_title: string | null
  main_language: string | null
  direction: 'inbound' | 'outbound' | null
}

export type ElevenLabsConversationDetail = {
  conversation_id: string
  agent_id: string
  agent_name: string | null
  status: ElevenLabsCallStatus
  has_audio: boolean
  transcript: Array<{
    role: 'user' | 'agent'
    message: string
    time_in_call_secs: number
  }>
  metadata: {
    start_time_unix_secs: number
    call_duration_secs: number
    phone_call: {
      external_number?: string | null
      direction?: 'inbound' | 'outbound' | null
    } | null
    conversation_initiation_source: string | null
    main_language: string | null
    termination_reason: string | null
  }
}

export async function getElevenLabsConversations(): Promise<ElevenLabsConversationListItem[]> {
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

  const data = (await res.json()) as { conversations?: ElevenLabsConversationListItem[] }
  return data.conversations ?? []
}

export async function getElevenLabsConversation(
  conversationId: string,
): Promise<ElevenLabsConversationDetail | null> {
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

  return res.json() as Promise<ElevenLabsConversationDetail>
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
