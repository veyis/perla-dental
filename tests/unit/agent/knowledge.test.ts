import { describe, expect, it } from 'vitest'
import { CLINIC, DOCTORS, formatKnowledge, TREATMENTS } from '@/lib/agent/knowledge'

describe('knowledge', () => {
  it('exposes clinic info', () => {
    expect(CLINIC.name).toBe('Perla Dental Clinics')
    expect(CLINIC.location).toContain('Antalya')
    expect(CLINIC.phone).toBe('+90 534 226 60 59')
  })

  it('exposes all four treatment families', () => {
    const names = TREATMENTS.map((t) => t.id)
    expect(names).toEqual(
      expect.arrayContaining(['implants', 'all-on-4', 'all-on-6', 'smile-makeover']),
    )
  })

  it('exposes seven doctors', () => {
    expect(DOCTORS.length).toBe(7)
    expect(DOCTORS[0].name).toContain('Onur Ademhan')
  })

  it('formatKnowledge returns markdown text', () => {
    const md = formatKnowledge()
    expect(md).toContain('Perla Dental Clinics')
    expect(md).toContain('Lara Caddesi')
    expect(md).toContain('All-on-4')
    expect(md).toContain('Dr. Onur Ademhan')
  })
})
