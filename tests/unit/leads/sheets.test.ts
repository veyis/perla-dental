import { describe, it, expect, vi, beforeEach } from 'vitest'

const appendMock = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: vi.fn(() => ({ authorize: vi.fn() })) },
    sheets: vi.fn(() => ({
      spreadsheets: { values: { append: appendMock } },
    })),
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    GOOGLE_SHEETS_SA_KEY: Buffer.from(
      JSON.stringify({ client_email: 'sa@p.iam', private_key: 'k' })
    ).toString('base64'),
    GOOGLE_SHEETS_LEAD_SHEET_ID: 'sheet1',
    GOOGLE_SHEETS_AUDIT_SHEET_ID: 'sheet2',
  },
}))

import { appendLeadRow, appendAuditRow } from '@/lib/leads/sheets'

beforeEach(() => {
  appendMock.mockReset()
})

describe('appendLeadRow', () => {
  it('calls Sheets API with the lead row', async () => {
    appendMock.mockResolvedValue({ data: {} })
    await appendLeadRow(['col1', 'col2'])
    expect(appendMock).toHaveBeenCalledOnce()
    const arg = appendMock.mock.calls[0][0]
    expect(arg.spreadsheetId).toBe('sheet1')
    expect(arg.requestBody.values[0]).toEqual(['col1', 'col2'])
  })

  it('retries once on transient failure', async () => {
    appendMock.mockRejectedValueOnce(new Error('transient')).mockResolvedValueOnce({ data: {} })
    await appendLeadRow(['x'])
    expect(appendMock).toHaveBeenCalledTimes(2)
  })

  it('throws after second failure', async () => {
    appendMock.mockRejectedValue(new Error('down'))
    await expect(appendLeadRow(['x'])).rejects.toThrow('down')
  })
})
