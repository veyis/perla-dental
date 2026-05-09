import { describe, expect, it } from 'vitest'
import { renderMarkdownLite } from '@/components/chat/markdown-lite'

describe('renderMarkdownLite', () => {
  it('renders plain paragraphs split by blank lines', () => {
    const out = renderMarkdownLite('Hello.\n\nWorld.')
    const html = JSON.stringify(out)
    expect(html).toContain('Hello.')
    expect(html).toContain('World.')
  })

  it('renders **bold** and *italic*', () => {
    const out = renderMarkdownLite('**Strong** and *soft*.')
    const html = JSON.stringify(out)
    expect(html).toContain('"strong"')
    expect(html).toContain('"em"')
  })

  it('renders unordered lists', () => {
    const out = renderMarkdownLite('- one\n- two')
    const html = JSON.stringify(out)
    expect(html).toContain('"ul"')
    expect(html.match(/"li"/g)?.length).toBe(2)
  })

  it('renders HTML characters safely — React escapes at render time', () => {
    const out = renderMarkdownLite('Hello <script>alert(1)</script>')
    const json = JSON.stringify(out)
    // escapeHtml was removed because React escapes string text nodes at render
    // time; pre-escaping caused double-escaping (&lt; showing literally in UI).
    // Verify no dangerouslySetInnerHTML is used anywhere in the output.
    expect(json).not.toContain('dangerouslySetInnerHTML')
    expect(json).toContain('Hello')
  })

  it('renders single-line text without paragraph wrapper crashing', () => {
    const out = renderMarkdownLite('Just a line.')
    expect(JSON.stringify(out)).toContain('Just a line.')
  })
})
