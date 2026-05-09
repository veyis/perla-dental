// Server-only. Consumed lazily — importing this module in code that runs
// without env vars set will throw at parse time. Do not import from client
// components or pre-rendered modules without env present.
import { z } from 'zod'

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  DEEPGRAM_API_KEY: z.string().min(1),
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_VOICE_ID: z.string().min(1),
  GOOGLE_SHEETS_SA_KEY: z.string().min(1),
  GOOGLE_SHEETS_LEAD_SHEET_ID: z.string().min(1),
  GOOGLE_SHEETS_AUDIT_SHEET_ID: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  LEAD_NOTIFICATION_EMAIL: z.string().email(),
  LEAD_FROM_EMAIL: z.string().email(),
  LEAD_FORGET_TOKEN: z.string().min(16),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  AGENT_DISABLED: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
})

export const env = envSchema.parse(process.env)
export const isAgentDisabled = () => env.AGENT_DISABLED === 'true'
