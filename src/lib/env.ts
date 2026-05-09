// Server-only. Validated lazily on first access so this module can be imported
// during `next build` page-data collection without env vars being set.
//
// Strategy: only ANTHROPIC_API_KEY + ELEVENLABS_API_KEY + SUPABASE_SERVICE_ROLE_KEY
// + RESEND_API_KEY are required. Everything else is optional so a developer can
// run a feature (e.g. just the mic) without filling in the entire .env.local
// upfront. Call sites that need an optional value should fail clearly with the
// `requireEnv()` helper below.
import { z } from 'zod'

const envSchema = z.object({
  // Hard requirements — features will not work at all without these.
  ANTHROPIC_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),

  // Optional — features that need them will throw at the call site.
  DEEPGRAM_API_KEY: z.string().min(1).optional(),
  ELEVENLABS_VOICE_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  LEAD_NOTIFICATION_EMAIL: z.string().email().optional(),
  LEAD_FROM_EMAIL: z.string().email().optional(),
  LEAD_FORGET_TOKEN: z.string().min(16).optional(),
  LEAD_HMAC_SECRET: z.string().min(32).optional(),
  ELEVENLABS_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Operational with safe defaults.
  AGENT_DISABLED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
})

type Env = z.infer<typeof envSchema>

let cached: Env | null = null

function loadEnv(): Env {
  if (cached) return cached
  cached = envSchema.parse(process.env)
  return cached
}

// Proxy defers validation until a property is actually read at runtime.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env]
  },
})

export const isAgentDisabled = () => env.AGENT_DISABLED === 'true'

/**
 * Read an optional env var that the caller actually needs RIGHT NOW.
 * Throws a clear error naming the missing var instead of letting the feature
 * silently fail with a vendor-side 401.
 */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = env[key]
  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing required environment variable: ${String(key)}. Set it in .env.local.`)
  }
  return value as NonNullable<Env[K]>
}
