import { google } from 'googleapis'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

/**
 * GDPR / KVKK delete-on-request endpoint.
 *
 * Authentication: requires `Authorization: Bearer <LEAD_FORGET_TOKEN>` —
 * a constant-time string comparison gates the handler. The original plan
 * had no auth; we add a bearer token because anyone who learns the URL
 * could otherwise wipe rows from the lead sheet.
 *
 * Behaviour: finds every row in the `Leads` sheet whose `email` column
 * matches (case-insensitive) and clears the row in place via
 * `spreadsheets.values.clear`. Returns `{ deletedRows }`.
 */
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

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

  const decoded = JSON.parse(Buffer.from(env.GOOGLE_SHEETS_SA_KEY, 'base64').toString('utf8'))
  const auth = new google.auth.JWT({
    email: decoded.client_email,
    key: decoded.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  const data = await sheets.spreadsheets.values.get({
    spreadsheetId: env.GOOGLE_SHEETS_LEAD_SHEET_ID,
    range: 'Leads!A:Z',
  })
  const rows = data.data.values ?? []
  const headerRow = rows[0] ?? []
  const headerIdx = headerRow.findIndex((h) => String(h).toLowerCase() === 'email')
  const emailColIdx = headerIdx >= 0 ? headerIdx : 5
  const target = email.toLowerCase()

  const matches = rows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row, idx }) => idx > 0 && String(row[emailColIdx] ?? '').toLowerCase() === target)

  for (const { idx } of matches) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: env.GOOGLE_SHEETS_LEAD_SHEET_ID,
      range: `Leads!A${idx + 1}:Z${idx + 1}`,
    })
  }

  return Response.json({ deletedRows: matches.length })
}

function isAuthorized(req: Request): boolean {
  const header = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${env.LEAD_FORGET_TOKEN}`
  return timingSafeEqual(header, expected)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}
