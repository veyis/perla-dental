import { describe, expect, it, vi } from 'vitest'
import { sentenceFlush } from '@/lib/voice/sentence-splitter'

describe('sentenceFlush', () => {
  it('flushes on period', async () => {
    const onSentence = vi.fn()
    const s = sentenceFlush({ onSentence })
    s.push('Hello world.')
    s.push(' Next sentence!')
    s.flush()
    await new Promise((r) => setImmediate(r))
    expect(onSentence).toHaveBeenCalledWith('Hello world.')
    expect(onSentence).toHaveBeenCalledWith('Next sentence!')
  })

  it('handles question and exclamation', async () => {
    const onSentence = vi.fn()
    const s = sentenceFlush({ onSentence })
    s.push('Are you okay? Yes!')
    s.flush()
    await new Promise((r) => setImmediate(r))
    expect(onSentence).toHaveBeenCalledWith('Are you okay?')
    expect(onSentence).toHaveBeenCalledWith('Yes!')
  })

  it('flushes after 15-token boundary even without punctuation', async () => {
    const onSentence = vi.fn()
    const s = sentenceFlush({ onSentence, maxTokens: 5 })
    s.push('one two three four five six seven')
    await new Promise((r) => setImmediate(r))
    expect(onSentence).toHaveBeenCalled()
  })

  it('does not split on Dr.', async () => {
    const onSentence = vi.fn()
    const s = sentenceFlush({ onSentence })
    s.push('Dr. Onur Ademhan is the founder. ')
    s.flush()
    await new Promise((r) => setImmediate(r))
    expect(onSentence).toHaveBeenCalledWith('Dr. Onur Ademhan is the founder.')
    expect(onSentence).toHaveBeenCalledTimes(1)
  })
})
