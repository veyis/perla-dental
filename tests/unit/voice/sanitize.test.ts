import { describe, expect, it } from 'vitest'
import { sanitizeForTTS } from '@/lib/voice/sanitize'

describe('sanitizeForTTS', () => {
  it('strips bold/italic markers', () => {
    expect(sanitizeForTTS('Welcome to **Perla Dental Clinics**.')).toBe(
      'Welcome to Perla Dental Clinics.',
    )
    expect(sanitizeForTTS('It is *very* important.')).toBe('It is very important.')
  })

  it('strips inline code', () => {
    expect(sanitizeForTTS('Call `submitLead` after consent.')).toBe(
      'Call submitLead after consent.',
    )
  })

  it('strips heading markers', () => {
    expect(sanitizeForTTS('# About us\nWe care.')).toBe('About us We care.')
  })

  it('strips markdown links but keeps text', () => {
    expect(sanitizeForTTS('See [our website](https://example.com).')).toBe(
      'See our website.',
    )
  })

  it('strips bullet markers', () => {
    expect(sanitizeForTTS('- First\n- Second')).toBe('First Second')
  })

  it('strips emojis (including 🦷 dental emoji from supplemental block)', () => {
    expect(sanitizeForTTS('👋 Hello! 🦷✨')).toBe('Hello!')
    expect(sanitizeForTTS('Smile makeover 🦷✨ ready')).toBe('Smile makeover ready')
  })

  it('strips bold-italic ***triple***', () => {
    expect(sanitizeForTTS('It is ***very*** important.')).toBe('It is very important.')
  })

  it('strips strikethrough', () => {
    expect(sanitizeForTTS('Was ~~bad~~ good.')).toBe('Was good.')
  })

  it('preserves accented Latin characters', () => {
    expect(sanitizeForTTS('Anna Müller from Köln.')).toBe('Anna Müller from Köln.')
  })

  it('preserves Cyrillic and Turkish characters', () => {
    expect(sanitizeForTTS('Здравствуйте! Türkçe.')).toBe('Здравствуйте! Türkçe.')
  })

  it('collapses whitespace runs', () => {
    expect(sanitizeForTTS('Hello   world  \n\n  again')).toBe('Hello world again')
  })

  it('handles empty input', () => {
    expect(sanitizeForTTS('')).toBe('')
    expect(sanitizeForTTS('   ')).toBe('')
  })
})
