import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

let cached: ReturnType<typeof createClient> | null = null

/**
 * Server-only Supabase client. Bound to the `perla` schema so
 * `.from('leads')` resolves to `perla.leads`. Storage operations
 * (`sb.storage`) are unaffected by the schema override and route
 * to the `storage` API independently.
 */
export function getServerClient() {
  if (cached) return cached
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'perla' },
  })
  return cached
}
