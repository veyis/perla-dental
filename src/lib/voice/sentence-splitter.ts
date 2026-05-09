const ABBREVIATIONS = new Set(['Dr.', 'Mr.', 'Mrs.', 'Ms.', '3D.', 'mm.', 'St.', 'Co.'])

export type SentenceSplitter = {
  push: (delta: string) => void
  flush: () => void
}

export function sentenceFlush(opts: {
  onSentence: (sentence: string) => void | Promise<void>
  maxTokens?: number
}): SentenceSplitter {
  const maxTokens = opts.maxTokens ?? 15
  let buffer = ''

  function findSentenceEnd(text: string, fromIndex: number): number {
    // Returns the position immediately after a terminating punctuation
    // followed by whitespace (or end of string for force-flush). Skips
    // matches whose preceding word is a known abbreviation. Returns -1
    // if no terminator found from `fromIndex`.
    const re = /([.!?])(\s+|$)/g
    re.lastIndex = fromIndex
    let m: RegExpExecArray | null
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex iteration
    while ((m = re.exec(text)) !== null) {
      const endIdx = m.index + 1 // position right after the punctuation
      const candidate = text.slice(0, endIdx).trim()
      const lastWord = candidate.split(/\s+/).pop() ?? ''
      if (ABBREVIATIONS.has(lastWord)) {
        // Skip this terminator; resume scanning after it.
        re.lastIndex = endIdx
        continue
      }
      return endIdx
    }
    return -1
  }

  function tryFlush(force = false) {
    while (true) {
      const endIdx = findSentenceEnd(buffer, 0)
      if (endIdx >= 0) {
        const sentence = buffer.slice(0, endIdx).trim()
        if (sentence.length > 0) opts.onSentence(sentence)
        buffer = buffer.slice(endIdx).replace(/^\s+/, '')
        continue
      }
      const tokens = buffer.trim().split(/\s+/).filter(Boolean)
      if (tokens.length >= maxTokens) {
        opts.onSentence(buffer.trim())
        buffer = ''
        continue
      }
      if (force && buffer.trim().length > 0) {
        opts.onSentence(buffer.trim())
        buffer = ''
      }
      break
    }
  }

  return {
    push: (delta) => {
      buffer += delta
      tryFlush()
    },
    flush: () => tryFlush(true),
  }
}
