import type { RequestContext } from '@/lib/observability/request-context'
import { getServerClient } from '@/lib/supabase'

/**
 * Per-conversation request metadata for the website chat assistant.
 * One row per `conversation_id`. IP/UA don't change mid-session, so we
 * upsert on first message and just bump `last_seen_at` on each later
 * request — cheaper and cleaner than denormalizing onto every message.
 */
export type ChatSessionRow = {
  conversation_id: string
  ip_address: string | null
  country_code: string | null
  city: string | null
  region: string | null
  postal_code: string | null
  continent: string | null
  timezone: string | null
  latitude: number | null
  longitude: number | null
  user_agent: string | null
  referrer: string | null
  accept_language: string | null
  started_at: string
  last_seen_at: string
}

export async function upsertChatSession(args: {
  conversationId: string
  ctx: RequestContext
}): Promise<void> {
  const sb = getServerClient()
  const now = new Date().toISOString()
  const { error } = await sb.from('chat_sessions').upsert(
    {
      conversation_id: args.conversationId,
      ip_address: args.ctx.ip,
      country_code: args.ctx.country,
      city: args.ctx.city,
      region: args.ctx.region,
      postal_code: args.ctx.postalCode,
      continent: args.ctx.continent,
      timezone: args.ctx.timezone,
      latitude: args.ctx.latitude,
      longitude: args.ctx.longitude,
      user_agent: args.ctx.userAgent,
      referrer: args.ctx.referrer,
      accept_language: args.ctx.acceptLanguage,
      last_seen_at: now,
    },
    { onConflict: 'conversation_id', ignoreDuplicates: false },
  )
  if (error) throw new Error(`chat_sessions upsert failed: ${error.message}`)
}

export async function getChatSession(conversationId: string): Promise<ChatSessionRow | null> {
  const sb = getServerClient()
  const { data, error } = await sb
    .from('chat_sessions')
    .select('*')
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (error) throw new Error(`chat_sessions fetch failed: ${error.message}`)
  return (data as ChatSessionRow | null) ?? null
}
