import type { SubmitLeadInput } from '@/lib/agent/tools'
import { requireEnv } from '@/lib/env'
import { logger } from '@/lib/observability/logger'
import { renderClinicEmail, renderPatientEmail } from './email'
import { sendEmail } from './email-sender'
import { allowLead } from './rate-limit'
import { normalizePhone } from './schema'
import { getLeadByConversationId, insertLead, updateLead } from './supabase-leads'

export type SubmitLeadResult =
  | { success: true; leadId: string; degraded?: boolean }
  | { success: false; reason: 'rate_limited' | 'failed' }

export async function submitLead(args: {
  ip: string
  conversationId: string
  input: SubmitLeadInput
  consentText: string
  countryCode?: string
  source?: string
  userAgentShort?: string
  summary?: string
  // Browser/geo metadata captured from the request that submitted the
  // lead. All optional — voice-agent leads come through a server-to-server
  // webhook and have none of these.
  ipAddress?: string | null
  city?: string | null
  region?: string | null
  postalCode?: string | null
  continent?: string | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
  referrer?: string | null
  acceptLanguage?: string | null
}): Promise<SubmitLeadResult> {
  const allowed = await allowLead(args.ip)
  if (!allowed) {
    logger.warn({ ip: args.ip }, 'lead rate-limited')
    return { success: false, reason: 'rate_limited' }
  }

  const now = new Date().toISOString()
  const phone = normalizePhone(args.input.phone, args.countryCode as never)

  let leadId = ''
  let dbOk = true
  let isDuplicate = false

  try {
    const existing = await getLeadByConversationId(args.conversationId)
    if (existing) {
      isDuplicate = true
      leadId = existing.id
      logger.info(
        { conversationId: args.conversationId, leadId },
        'Lead already exists, updating instead of inserting',
      )
      await updateLead(leadId, {
        conversationId: args.conversationId,
        fullName: args.input.fullName,
        phone,
        email: args.input.email,
        preferredLanguage: args.input.preferredLanguage,
        interest: args.input.interest,
        chronicIllnesses: args.input.chronicIllnesses,
        summary: args.summary,
        consentText: args.consentText,
        consentGivenAt: now,
      })
    } else {
      const result = await insertLead({
        conversationId: args.conversationId,
        fullName: args.input.fullName,
        phone,
        email: args.input.email,
        preferredLanguage: args.input.preferredLanguage,
        interest: args.input.interest,
        chronicIllnesses: args.input.chronicIllnesses,
        summary: args.summary,
        consentText: args.consentText,
        consentGivenAt: now,
        source: args.source,
        countryCode: args.countryCode,
        userAgentShort: args.userAgentShort,
        ipAddress: args.ipAddress,
        city: args.city,
        region: args.region,
        postalCode: args.postalCode,
        continent: args.continent,
        timezone: args.timezone,
        latitude: args.latitude,
        longitude: args.longitude,
        referrer: args.referrer,
        acceptLanguage: args.acceptLanguage,
      })
      leadId = result.id
    }
  } catch (err) {
    dbOk = false
    logger.error({ err }, 'supabase lead operation failed; emailing clinic anyway')
  }

  if (isDuplicate) {
    return { success: true, leadId, degraded: !dbOk }
  }

  const emailLead = {
    fullName: args.input.fullName,
    phone,
    email: args.input.email,
    preferredLanguage: args.input.preferredLanguage,
    interest: args.input.interest,
    chronicIllnesses: args.input.chronicIllnesses,
    summary: args.summary,
    leadId: leadId || 'pending',
    consentText: args.consentText,
    consentGivenAt: now,
  }
  const clinic = renderClinicEmail(emailLead)
  const patient = renderPatientEmail(emailLead)

  try {
    const fromEmail = requireEnv('LEAD_FROM_EMAIL')
    // Fire-and-forget emails to keep tool response time ultra-low.
    // Errors are logged but do not block the AI agent's flow.
    Promise.all([
      sendEmail({
        to: requireEnv('LEAD_NOTIFICATION_EMAIL'),
        from: fromEmail,
        subject: clinic.subject,
        text: clinic.text,
        replyTo: clinic.replyTo,
      }),
      sendEmail({
        to: args.input.email,
        from: fromEmail,
        subject: patient.subject,
        text: patient.text,
      }),
    ]).catch((err) => {
      logger.error({ err, leadId }, 'asynchronous email send failed')
    })
  } catch (err) {
    logger.error({ err, leadId }, 'email setup failed')
    if (!dbOk) return { success: false, reason: 'failed' }
  }

  return { success: true, leadId, degraded: !dbOk }
}
