import { appendAuditRow } from '@/lib/leads/sheets'
import { logger } from './logger'

export type AuditEvent =
  | { kind: 'lead_submitted'; leadId: string; conversationId: string }
  | { kind: 'emergency_escalated'; conversationId: string; summary: string }
  | { kind: 'guardrail_event'; conversationId: string; detail: string }
  | { kind: 'rate_limited'; ip: string }

export async function audit(event: AuditEvent): Promise<void> {
  logger.info({ event }, 'audit')
  if (event.kind === 'guardrail_event' || event.kind === 'emergency_escalated') {
    try {
      const row = [
        new Date().toISOString(),
        event.kind,
        'conversationId' in event ? event.conversationId : '',
        JSON.stringify(event),
      ]
      await appendAuditRow(row)
    } catch (err) {
      logger.error({ err }, 'audit row append failed')
    }
  }
}
