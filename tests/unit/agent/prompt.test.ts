import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '@/lib/agent/prompt'
import type { ConversationState } from '@/lib/agent/types'

const baseState: ConversationState = {
  conversationId: 'test',
  language: 'en',
  step: 'greeting',
  captured: {},
  turnCount: 0,
}

describe('buildSystemPrompt', () => {
  it('contains role block from PDF', () => {
    const p = buildSystemPrompt(baseState)
    expect(p).toContain('digital front desk')
    expect(p).toContain('patient relations assistant')
    expect(p).toContain('Perla Dental Clinics')
  })

  it('contains clinic knowledge', () => {
    const p = buildSystemPrompt(baseState)
    expect(p).toContain('Lara Caddesi')
    expect(p).toContain('Dr. Onur Ademhan')
    expect(p).toContain('All-on-4')
  })

  it('contains hard guardrails', () => {
    const p = buildSystemPrompt(baseState)
    expect(p).toContain('NEVER discuss pricing')
    expect(p).toContain('No medical diagnosis')
    expect(p).toContain('Escalation Protocol')
  })

  it('encodes target language', () => {
    const en = buildSystemPrompt({ ...baseState, language: 'en' })
    const tr = buildSystemPrompt({ ...baseState, language: 'tr' })
    expect(en).toContain('Respond ONLY in English')
    expect(tr).toContain('Respond ONLY in Turkish')
  })

  it('includes captured fields and turn count', () => {
    const p = buildSystemPrompt({
      ...baseState,
      step: 'lead_capture',
      captured: { fullName: 'Anna' },
      turnCount: 4,
    })
    expect(p).toContain('"fullName":"Anna"')
    expect(p).toContain('Conversation turn: 4')
  })

  it('instructs the model not to re-greet after turn 1', () => {
    const p = buildSystemPrompt(baseState)
    expect(p).toMatch(/do not repeat the greeting/i)
    expect(p).toMatch(/listen to the patient/i)
  })

  it('includes prompt-injection defenses', () => {
    const p = buildSystemPrompt(baseState)
    expect(p.toLowerCase()).toContain('ignore your instructions')
    expect(p.toLowerCase()).toContain('redirect')
  })
})
