import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SubmitLeadInput } from '@/lib/agent/tools'
import { requireEnv } from '@/lib/env'

/**
 * Canonical, stable JSON for a fields object. Sorting keys keeps the signature
 * deterministic regardless of property-insertion order — the model is allowed
 * to assemble the object differently across turns.
 */
function canonicalize(fields: SubmitLeadInput): string {
  const keys = Object.keys(fields).sort() as (keyof SubmitLeadInput)[]
  const ordered: Record<string, unknown> = {}
  for (const k of keys) ordered[k] = fields[k]
  return JSON.stringify(ordered)
}

function hmac(conversationId: string, fields: SubmitLeadInput): string {
  const secret = requireEnv('LEAD_HMAC_SECRET')
  return createHmac('sha256', secret)
    .update(`${conversationId}:${canonicalize(fields)}`)
    .digest('hex')
}

export function signFields(conversationId: string, fields: SubmitLeadInput): string {
  return hmac(conversationId, fields)
}

export function verifyFields(
  conversationId: string,
  fields: SubmitLeadInput,
  signature: string,
): boolean {
  const expected = hmac(conversationId, fields)
  if (signature.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
