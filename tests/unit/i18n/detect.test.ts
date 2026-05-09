import { describe, expect, it } from 'vitest'
import { detectLanguage } from '@/lib/i18n/detect'

describe('detectLanguage', () => {
  it('detects English', () => {
    expect(detectLanguage('Hello, I want to know about implants.')).toBe('en')
  })

  it('detects Turkish', () => {
    expect(detectLanguage('Merhaba, implantlar hakkında bilgi almak istiyorum.')).toBe('tr')
  })

  it('detects Russian', () => {
    expect(detectLanguage('Здравствуйте, я хочу узнать об имплантах.')).toBe('ru')
  })

  it('detects German', () => {
    expect(detectLanguage('Hallo, ich möchte mehr über Implantate erfahren.')).toBe('de')
  })

  it('falls back to en for unsupported languages', () => {
    expect(detectLanguage('こんにちは')).toBe('en')
  })

  it('falls back to en for very short text', () => {
    expect(detectLanguage('hi')).toBe('en')
  })
})
