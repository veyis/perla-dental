import { describe, expect, it } from 'vitest'
import { normalizePhone } from '@/lib/leads/schema'

describe('normalizePhone', () => {
  it('converts to E.164', () => {
    expect(normalizePhone('+49 30 123 456 78', 'DE')).toBe('+493012345678')
  })
  it('returns input unchanged when invalid', () => {
    expect(normalizePhone('xxx', 'DE')).toBe('xxx')
  })
})
