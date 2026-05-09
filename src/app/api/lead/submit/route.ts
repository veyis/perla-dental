import { submitLeadParams } from '@/lib/agent/tools'
import { verifyFields } from '@/lib/leads/consent-hmac'
import { submitLead } from '@/lib/leads/submit-lead'
import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'

export const maxDuration = 30

const CONSENT_TEXT =
  'I agree to share my contact info and health details with Perla Dental Clinics for the purpose of medical consultation.'

type Body = {
  conversationId: string
  fields: unknown
  fingerprint: string
}

export async function POST(req: Request): Promise<Response> {
  let parsed: Body
  try {
    parsed = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (
    typeof parsed?.conversationId !== 'string' ||
    typeof parsed?.fingerprint !== 'string' ||
    !parsed.fields
  ) {
    return Response.json({ error: 'invalid_shape' }, { status: 400 })
  }

  const fieldsResult = submitLeadParams.safeParse(parsed.fields)
  if (!fieldsResult.success) {
    return Response.json({ error: 'invalid_fields' }, { status: 400 })
  }

  if (!verifyFields(parsed.conversationId, fieldsResult.data, parsed.fingerprint)) {
    logger.warn({ conversationId: parsed.conversationId }, 'lead-submit fingerprint mismatch')
    return Response.json({ error: 'fingerprint_mismatch' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const country = req.headers.get('x-vercel-ip-country') ?? undefined

  const result = await submitLead({
    ip,
    conversationId: parsed.conversationId,
    input: fieldsResult.data,
    consentText: CONSENT_TEXT,
    countryCode: country,
    source: 'chat',
  })

  if (!result.success) {
    return Response.json({ error: result.reason }, { status: 502 })
  }

  await audit({
    kind: 'lead_submitted',
    leadId: result.leadId,
    conversationId: parsed.conversationId,
  })
  return Response.json({ leadId: result.leadId })
}
