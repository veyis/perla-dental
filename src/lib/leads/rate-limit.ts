import { getServerClient } from '@/lib/supabase'

const LIMIT = 3
const WINDOW_SECONDS = 60 * 60

/**
 * Returns true if the lead is allowed (count <= LIMIT). Calls the
 * `perla.touch_rate_limit` RPC, which atomically increments or resets
 * a counter row in `perla.rate_limits` and returns the post-increment
 * count. Fails open on RPC error so a transient outage doesn't block
 * leads.
 */
export async function allowLead(ip: string): Promise<boolean> {
  const sb = getServerClient()
  const { data, error } = await sb.rpc('touch_rate_limit', {
    p_key: `lead:${ip}`,
    p_window_seconds: WINDOW_SECONDS,
  })
  if (error) {
    // fail open — don't block leads on rate-limiter failure
    console.error('rate_limit_error', error)
    return true
  }
  return (data as number) <= LIMIT
}
