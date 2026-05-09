// Server-only. Validated lazily on first access so this module can be imported
// during `next build` page-data collection without env vars being set.
import { z } from 'zod'

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_VOICE_ID: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  LEAD_NOTIFICATION_EMAIL: z.string().email(),
  LEAD_FROM_EMAIL: z.string().email(),
  LEAD_FORGET_TOKEN: z.string().min(16),
  AGENT_DISABLED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
})

type Env = z.infer<typeof envSchema>

let cached: Env | null = null

function loadEnv(): Env {
  if (cached) return cached
  cached = envSchema.parse(process.env)
  return cached
}

// Proxy defers validation until a property is actually read at runtime.
// At build time nothing reads it, so missing env vars don't fail the build.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env]
  },
})

export const isAgentDisabled = () => env.AGENT_DISABLED === 'true'
