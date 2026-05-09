/**
 * Strip markdown and other non-spoken artifacts from text before sending to TTS.
 * Without this, ElevenLabs reads asterisks, hashes, brackets, and emojis literally.
 */
export function sanitizeForTTS(text: string): string {
  return (
    text
      // Bold + italic markers (**, __, *, _) — keep the inner text.
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/(?<!\w)_(.*?)_(?!\w)/g, '$1')
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
      // Emojis (any non-ASCII char that isn't a common letter accent).
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, '')
      // Collapse runs of whitespace.
      .replace(/\s+/g, ' ')
      .trim()
  )
}
