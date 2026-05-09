import { appendAuditEvent } from '@/lib/leads/supabase-leads'
import { logger } from './logger'

export type AuditEvent =
  | { kind: 'lead_submitted'; leadId: string; conversationId: string }
  | { kind: 'lead_consent_pending'; conversationId: string }
  | { kind: 'emergency_escalated'; conversationId: string; summary: string }
  | { kind: 'guardrail_event'; conversationId: string; detail: string }
  | { kind: 'rate_limited'; ip: string }

export async function audit(event: AuditEvent): Promise<void> {
  logger.info({ event }, 'audit')
  try {
    const conversationId = 'conversationId' in event ? event.conversationId : null
    await appendAuditEvent({
      kind: event.kind,
      conversationId,
      detail: event as unknown as Record<string, unknown>,
    })
  } catch (err) {
    logger.error({ err }, 'audit insert failed')
  }
}
