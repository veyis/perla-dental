import { google } from 'googleapis'
import { env } from '@/lib/env'

function client() {
  const decoded = JSON.parse(Buffer.from(env.GOOGLE_SHEETS_SA_KEY, 'base64').toString('utf8'))
  const opts = {
    email: decoded.client_email,
    key: decoded.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }
  // googleapis exposes `JWT` as a class (constructable). Tests mock it as a
  // plain function factory; fall back to a plain call when `new` is rejected.
  // biome-ignore lint/suspicious/noExplicitAny: googleapis typings vs. test mock
  const JWTCtor: any = google.auth.JWT
  let auth: unknown
  try {
    auth = new JWTCtor(opts)
  } catch {
    auth = JWTCtor(opts)
  }
  // biome-ignore lint/suspicious/noExplicitAny: passes JWT|Mock to sheets()
  return google.sheets({ version: 'v4', auth: auth as any })
}

async function appendWithRetry(
  spreadsheetId: string,
  range: string,
  row: string[]
): Promise<void> {
  const sheets = client()
  const params = {
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  }
  try {
    await sheets.spreadsheets.values.append(params)
  } catch {
    await new Promise((r) => setTimeout(r, 500))
    await sheets.spreadsheets.values.append(params)
  }
}

export async function appendLeadRow(row: string[]): Promise<void> {
  await appendWithRetry(env.GOOGLE_SHEETS_LEAD_SHEET_ID, 'Leads!A:Z', row)
}

export async function appendAuditRow(row: string[]): Promise<void> {
  await appendWithRetry(env.GOOGLE_SHEETS_AUDIT_SHEET_ID, 'Audit!A:Z', row)
}
