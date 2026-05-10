import { submitLeadParams } from '@/lib/agent/tools'
import { verifyFields } from '@/lib/leads/consent-hmac'
import { submitLead } from '@/lib/leads/submit-lead'
import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'
import { extractRequestContext } from '@/lib/observability/request-context'

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

  const ctx = extractRequestContext(req)
  const ip = ctx.ip ?? 'unknown'

  const result = await submitLead({
    ip,
    conversationId: parsed.conversationId,
    input: fieldsResult.data,
    consentText: CONSENT_TEXT,
    countryCode: ctx.country ?? undefined,
    source: 'chat',
    userAgentShort: ctx.userAgent?.slice(0, 200) ?? undefined,
    ipAddress: ctx.ip,
    city: ctx.city,
    region: ctx.region,
    postalCode: ctx.postalCode,
    continent: ctx.continent,
    timezone: ctx.timezone,
    latitude: ctx.latitude,
    longitude: ctx.longitude,
    referrer: ctx.referrer,
    acceptLanguage: ctx.acceptLanguage,
  })

  if (!result.success) {
    // 429 for rate-limit (client should back off); 502 for upstream
    // failure (Supabase / Resend) so the client can show "try again later".
    const status = result.reason === 'rate_limited' ? 429 : 502
    return Response.json({ error: result.reason }, { status })
  }

  await audit({
    kind: 'lead_submitted',
    leadId: result.leadId,
    conversationId: parsed.conversationId,
  })
  return Response.json({ leadId: result.leadId })
}
