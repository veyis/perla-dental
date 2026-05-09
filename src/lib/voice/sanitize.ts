/**
 * Strip markdown and other non-spoken artifacts from text before sending to TTS.
 * Without this, ElevenLabs reads asterisks, hashes, brackets, and emojis literally.
 */
export function sanitizeForTTS(text: string): string {
  return (
    text
      // Bold-italic ***text*** first (so the inner *text* later regex doesn't half-strip).
      .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
      // Bold + italic markers.
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/(?<!\w)_(.*?)_(?!\w)/g, '$1')
      // Strikethrough — remove the struck text entirely, since it represents
      // "deleted/wrong" in author intent. Reading "Was bad good" aloud is
      // wrong; "Was good" matches the visual semantics.
      .replace(/~~(.*?)~~\s*/g, '')
      // Inline code: drop backticks but keep the content.
      .replace(/`+([^`]+)`+/g, '$1')
      // Headings (# Heading) — drop leading #s.
      .replace(/^\s*#+\s*/gm, '')
      // Markdown links [text](url) — keep text only.
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Bullet markers at line starts.
      .replace(/^\s*[-*+]\s+/gm, '')
      // Blockquote markers.
      .replace(/^\s*>\s?/gm, '')
      // Emojis. Cover the main emoji blocks INCLUDING U+1F900-U+1F9FF
      // (Supplemental Symbols and Pictographs — has 🦷 the dental emoji,
      // which our agent uses heavily). Plus dingbats, misc symbols, transport.
      .replace(
        /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu,
        '',
      )
      // Collapse runs of whitespace.
      .replace(/\s+/g, ' ')
      .trim()
  )
}
