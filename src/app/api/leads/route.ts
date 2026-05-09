import { normalizePhone } from '@/lib/leads/schema'
import { logger } from '@/lib/observability/logger'
import { getServerClient } from '@/lib/supabase'

export const maxDuration = 30

// Maps ElevenLabs treatmentInterest enum to the DB interest CHECK constraint values
const INTEREST_MAP: Record<string, string> = {
  implants: 'implants',
  all_on_4: 'all-on-4',
  all_on_6: 'all-on-6',
  veneers: 'veneers',
  zirconium: 'veneers',
  laminate: 'veneers',
  bonding: 'other',
  smile_design: 'smile-makeover',
  orthodontics: 'other',
  other: 'other',
  unknown: 'other',
}

const LANG_MAP: Record<string, string> = { en: 'en', tr: 'tr', other: 'en' }

type ElevenLabsLeadBody = {
  fullName?: string
  phone?: string
  email?: string
  healthNotes?: string
  treatmentInterest?: string
  preferredLanguage?: string
  leadSource?: string
  callSummary?: string
  // ElevenLabs passes conversation metadata
  conversation_id?: string
}

export async function POST(req: Request): Promise<Response> {
  let body: ElevenLabsLeadBody
  try {
    body = (await req.json()) as ElevenLabsLeadBody
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.fullName) {
    return Response.json({ error: 'fullName is required' }, { status: 400 })
  }

  const conversationId = body.conversation_id ?? `voice-${Date.now()}`
  const phone = body.phone ? normalizePhone(body.phone) : null
  const interest = body.treatmentInterest ? (INTEREST_MAP[body.treatmentInterest] ?? 'other') : null
  const preferredLanguage = body.preferredLanguage
    ? (LANG_MAP[body.preferredLanguage] ?? 'en')
    : 'en'

  const sb = getServerClient()
  const { data, error } = await sb
    .from('leads')
    .upsert(
      {
        conversation_id: conversationId,
        full_name: body.fullName,
        phone,
        email: body.email ?? null,
        health_notes: body.healthNotes ?? null,
        chronic_illnesses: body.healthNotes ?? null,
        interest,
        preferred_language: preferredLanguage,
        summary: body.callSummary ?? null,
        source: body.leadSource ?? 'voice',
      },
      { onConflict: 'conversation_id', ignoreDuplicates: false },
    )
    .select('id')
    .single()

  if (error) {
    logger.error({ err: error, conversationId }, 'voice lead upsert failed')
    return Response.json({ error: 'db_error' }, { status: 502 })
  }

  logger.info({ leadId: (data as { id: string }).id, conversationId }, 'voice lead saved')
  return Response.json({ leadId: (data as { id: string }).id })
}
