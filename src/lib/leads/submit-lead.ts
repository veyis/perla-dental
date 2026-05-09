import { randomUUID } from 'node:crypto'
import type { SubmitLeadInput } from '@/lib/agent/tools'
import { env } from '@/lib/env'
import { logger } from '@/lib/observability/logger'
import { renderClinicEmail, renderPatientEmail } from './email'
import { sendEmail } from './email-sender'
import { allowLead } from './rate-limit'
import { leadToSheetRow, normalizePhone } from './schema'
import { appendLeadRow } from './sheets'

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

  const leadId = `lead_${randomUUID().slice(0, 8)}`
  const now = new Date().toISOString()
  const phone = normalizePhone(args.input.phone, args.countryCode as never)

  const row = leadToSheetRow({
    timestampUtc: now,
    leadId,
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

  let sheetOk = true
  try {
    await appendLeadRow(row)
  } catch (err) {
    sheetOk = false
    logger.error({ err, leadId }, 'sheet append failed; emailing clinic anyway')
  }

  const emailLead = {
    fullName: args.input.fullName,
    phone,
    email: args.input.email,
    preferredLanguage: args.input.preferredLanguage,
    interest: args.input.interest,
    chronicIllnesses: args.input.chronicIllnesses,
    summary: args.summary,
    leadId,
    consentText: args.consentText,
    consentGivenAt: now,
  }
  const clinic = renderClinicEmail(emailLead)
  const patient = renderPatientEmail(emailLead)

  try {
    await Promise.all([
      sendEmail({
        to: env.LEAD_NOTIFICATION_EMAIL,
        from: env.LEAD_FROM_EMAIL,
        subject: clinic.subject,
        text: clinic.text,
        replyTo: clinic.replyTo,
      }),
      sendEmail({
        to: args.input.email,
        from: env.LEAD_FROM_EMAIL,
        subject: patient.subject,
        text: patient.text,
      }),
    ])
  } catch (err) {
    logger.error({ err, leadId }, 'email send failed')
    if (!sheetOk) return { success: false, reason: 'failed' }
  }

  return { success: true, leadId, degraded: !sheetOk }
}
