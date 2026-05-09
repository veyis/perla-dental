import { timingSafeEqual } from 'node:crypto'
import { env } from '@/lib/env'
import { getServerClient } from '@/lib/supabase'

export const runtime = 'nodejs'

/**
 * GDPR / KVKK delete-on-request endpoint.
 *
 * Authentication: requires `Authorization: Bearer <LEAD_FORGET_TOKEN>` —
 * a constant-time string comparison gates the handler.
 *
 * Behaviour: deletes every row in `perla.leads` whose `email` column
 * matches case-insensitively. Returns `{ deletedRows }`.
 */
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const expected = env.LEAD_FORGET_TOKEN
  const ok =
    token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  if (!ok) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 })
  }
  const email = (body as { email?: unknown })?.email
  if (typeof email !== 'string' || email.length === 0) {
    return Response.json({ error: 'email required' }, { status: 400 })
  }

  const sb = getServerClient()
  const { data, error } = await sb.from('leads').delete().ilike('email', email).select('id')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ deletedRows: data?.length ?? 0 })
}
