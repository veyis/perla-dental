import { beforeEach, describe, expect, it, vi } from 'vitest'

// Two distinct chains:
//   leads:        sb.from('leads').insert(...).select('id').single() -> { data, error }
//   audit_events: await sb.from('audit_events').insert(...)          -> { error }
//
// `insertMock` returns an object with a `select(...)` method (used by
// insertLead) AND is itself awaitable via a Symbol.toPrimitive-free
// PromiseLike. We can't use `then` on a literal (Biome forbids it
// because thenable objects are dangerous), so we expose the promise
// resolution through a wrapper class instead.

class InsertChain implements PromiseLike<{ error: { message: string } | null }> {
  constructor(
    private auditError: { message: string } | null,
    private singleMock: ReturnType<typeof vi.fn>,
  ) {}
  select() {
    return { single: this.singleMock }
  }
  // biome-ignore lint/suspicious/noThenProperty: emulating the supabase chain
  then<T1, T2>(
    onFulfilled?: (v: { error: { message: string } | null }) => T1 | PromiseLike<T1>,
    onRejected?: (reason: unknown) => T2 | PromiseLike<T2>,
  ): Promise<T1 | T2> {
    return Promise.resolve({ error: this.auditError }).then(onFulfilled, onRejected)
  }
}

const { fromMock, insertMock, singleMock, insertResultRef } = vi.hoisted(() => {
  const singleMock = vi.fn()
  const insertResultRef = { error: null as { message: string } | null }
  // biome-ignore lint/suspicious/noExplicitAny: shared chain for both mocks
  const insertMock: any = vi.fn(() => new InsertChain(insertResultRef.error, singleMock))
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return { fromMock, insertMock, singleMock, insertResultRef }
})

vi.mock('@/lib/supabase', () => ({
  getServerClient: () => ({ from: fromMock }),
}))

import { appendAuditEvent, insertLead } from '@/lib/leads/supabase-leads'

const baseLead = {
  conversationId: 'conv_1',
  fullName: 'Anna Müller',
  phone: '+493012345678',
  email: 'anna@example.de',
  preferredLanguage: 'de' as const,
  interest: 'all-on-4' as const,
  chronicIllnesses: null,
  consentText: 'I agree',
  consentGivenAt: '2026-05-08T14:32:09Z',
}

beforeEach(() => {
  fromMock.mockClear()
  insertMock.mockClear()
  singleMock.mockReset()
  insertResultRef.error = null
})

describe('insertLead', () => {
  it('inserts the lead and returns the generated id', async () => {
    singleMock.mockResolvedValue({ data: { id: 'uuid-123' }, error: null })
    const out = await insertLead(baseLead)
    expect(out).toEqual({ id: 'uuid-123' })
    expect(fromMock).toHaveBeenCalledWith('leads')
    expect(insertMock).toHaveBeenCalledOnce()
    const firstCall = insertMock.mock.calls[0] as unknown as [Record<string, unknown>]
    const payload = firstCall[0]
    expect(payload.conversation_id).toBe('conv_1')
    expect(payload.full_name).toBe('Anna Müller')
    expect(payload.preferred_language).toBe('de')
    expect(payload.source).toBe('direct')
  })

  it('throws when Supabase returns an error', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(insertLead(baseLead)).rejects.toThrow('Lead insert failed: boom')
  })
})

describe('appendAuditEvent', () => {
  it('inserts an audit row with detail JSON', async () => {
    insertResultRef.error = null
    await appendAuditEvent({
      kind: 'guardrail_event',
      conversationId: 'conv_1',
      detail: { reason: 'price_quote' },
    })
    expect(fromMock).toHaveBeenCalledWith('audit_events')
    const lastCall = insertMock.mock.calls.at(-1) as unknown as [Record<string, unknown>]
    const payload = lastCall[0]
    expect(payload.kind).toBe('guardrail_event')
    expect(payload.conversation_id).toBe('conv_1')
    expect(payload.detail).toEqual({ reason: 'price_quote' })
  })

  it('throws when Supabase returns an error', async () => {
    insertResultRef.error = { message: 'down' }
    await expect(
      appendAuditEvent({ kind: 'rate_limited', detail: { ip: '1.2.3.4' } }),
    ).rejects.toThrow('Audit insert failed: down')
  })
})
