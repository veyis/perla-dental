import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireEnv } from '@/lib/env'

// We don't have generated Database types yet, so the client is typed as
// SupabaseClient<any, any, any> — table rows are unchecked at compile
// time. Generate via `supabase gen types typescript` if/when desired.
// biome-ignore lint/suspicious/noExplicitAny: untyped DB schema
let cached: SupabaseClient<any, any, any> | null = null

/**
 * Server-only Supabase client. Bound to the `perla` schema so
 * `.from('leads')` resolves to `perla.leads`. Storage operations
 * (`sb.storage`) are unaffected by the schema override and route
 * to the `storage` API independently.
 */
// biome-ignore lint/suspicious/noExplicitAny: untyped DB schema
export function getServerClient(): SupabaseClient<any, any, any> {
  if (cached) return cached
  cached = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    // biome-ignore lint/suspicious/noExplicitAny: schema not in default Database
    db: { schema: 'perla' as any },
  })
  return cached
}
