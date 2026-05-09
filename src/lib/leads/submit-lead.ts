import type { SubmitLeadInput } from '@/lib/agent/tools'
import { requireEnv } from '@/lib/env'
import { logger } from '@/lib/observability/logger'
import { renderClinicEmail, renderPatientEmail } from './email'
import { sendEmail } from './email-sender'
import { allowLead } from './rate-limit'
import { normalizePhone } from './schema'
import { insertLead } from './supabase-leads'

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
  try {
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
    })
    leadId = result.id
  } catch (err) {
    dbOk = false
    logger.error({ err }, 'supabase lead insert failed; emailing clinic anyway')
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
    await Promise.all([
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
    ])
  } catch (err) {
    logger.error({ err, leadId }, 'email send failed')
    if (!dbOk) return { success: false, reason: 'failed' }
  }

  return { success: true, leadId, degraded: !dbOk }
}
