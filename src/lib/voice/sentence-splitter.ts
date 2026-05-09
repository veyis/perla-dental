// Abbreviations whose trailing period is NOT a sentence end. Stored
// case-sensitive — `lastWord.toLowerCase()` is also checked so 'etc.' / 'Etc.'
// both match. Includes academic + medical + corporate + locale common forms.
const ABBREVIATIONS = new Set([
  'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Mx.', 'Prof.',
  'St.', 'Co.', 'Inc.', 'Ltd.', 'Corp.',
  'Jr.', 'Sr.', 'Ph.D.', 'M.D.', 'D.D.S.',
  'e.g.', 'i.e.', 'vs.', 'etc.', 'cf.', 'No.', 'No.', 'ca.',
  'Mt.', 'Ave.', 'Rd.', 'Blvd.',
  'a.m.', 'p.m.', 'A.M.', 'P.M.',
  'U.K.', 'U.S.', 'U.S.A.',
  '3D.', '2D.', '4D.',
  'mm.', 'cm.', 'kg.', 'mg.',
])

const ABBREVIATIONS_LOWER = new Set(Array.from(ABBREVIATIONS, (s) => s.toLowerCase()))

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
    // matches that are likely NOT sentence ends:
    //   - the preceding word is a known abbreviation (Dr., e.g., U.K.)
    //   - the period is between two digits (1.5, 36.8°)
    //   - the word ending with the period is single-letter (initials: J. Smith)
    //   - the next character (if any) is lowercase (Smith. is unusual but
    //     "smith. another" likely is a continuation)
    const re = /([.!?])(\s+|$)/g
    re.lastIndex = fromIndex
    let m: RegExpExecArray | null
    // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex iteration
    while ((m = re.exec(text)) !== null) {
      const endIdx = m.index + 1 // position right after the punctuation
      const punct = m[1]

      // Reject digit.digit (decimals, version numbers).
      if (punct === '.' && m.index > 0 && m.index + 1 < text.length) {
        const before = text[m.index - 1]
        // m[2] starts at m.index + 1 and may be whitespace OR end. Check the
        // character right after the period (could be whitespace).
        const afterIdx = m.index + 1
        const after = text[afterIdx]
        if (before && /\d/.test(before) && after && /\d/.test(after)) {
          re.lastIndex = endIdx
          continue
        }
      }

      const candidate = text.slice(0, endIdx).trim()
      const lastWord = candidate.split(/\s+/).pop() ?? ''

      // Known abbreviation (case-insensitive).
      if (ABBREVIATIONS.has(lastWord) || ABBREVIATIONS_LOWER.has(lastWord.toLowerCase())) {
        re.lastIndex = endIdx
        continue
      }

      // Single-letter+period (initials like "J." or "A."). Two-letter forms
      // like "St." are handled by the explicit list.
      if (punct === '.' && /^[A-Za-z]\.$/.test(lastWord)) {
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
