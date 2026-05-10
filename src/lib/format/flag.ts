/**
 * Converts an ISO 3166-1 alpha-2 country code (e.g. "IT") to its flag
 * emoji ("🇮🇹") via Unicode regional indicator symbols. Returns an empty
 * string for invalid input so callers can render `${flag} ${code}`
 * without conditional padding.
 *
 * Caveat: Windows lacks the regional-indicator → flag glyph mapping in
 * Segoe UI Emoji, so users on Windows see two letter symbols instead.
 * Acceptable for an internal admin tool.
 */
export function flagEmoji(iso2: string | null | undefined): string {
  if (!iso2 || iso2.length !== 2) return ''
  const upper = iso2.toUpperCase()
  if (!/^[A-Z]{2}$/.test(upper)) return ''
  const A = 0x1f1e6 - 'A'.charCodeAt(0)
  return String.fromCodePoint(upper.charCodeAt(0) + A, upper.charCodeAt(1) + A)
}
