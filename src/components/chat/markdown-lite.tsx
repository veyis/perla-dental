import { Fragment, type ReactNode } from 'react'

/**
 * Tiny markdown renderer covering only what the agent actually emits:
 * paragraphs (blank-line separated), unordered lists (`- ` prefix),
 * **bold**, *italic*. Everything else is rendered as escaped text.
 *
 * Why a hand-rolled renderer rather than react-markdown: react-markdown
 * pulls ~60kb into the client bundle. The agent's output surface is
 * narrow and fully under our control, so a 30-LoC renderer is cheaper
 * and safer (no unexpected HTML expansion, all entities escaped).
 */
export function renderMarkdownLite(input: string): ReactNode {
  const blocks = input.split(/\n{2,}/)
  return blocks.map((block, i) => renderBlock(block, i))
}

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split('\n')
  const allListItems = lines.length > 0 && lines.every((l) => /^\s*-\s+/.test(l))
  if (allListItems) {
    return (
      <ul key={key} className="list-disc pl-5 my-2 space-y-1">
        {lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are derived deterministically from input
          <li key={i}>{renderInline(l.replace(/^\s*-\s+/, ''))}</li>
        ))}
      </ul>
    )
  }
  return (
    <p key={key} className="my-1 first:mt-0 last:mb-0 whitespace-pre-wrap">
      {renderInline(block)}
    </p>
  )
}

function renderInline(text: string): ReactNode {
  const escaped = escapeHtml(text)
  const tokens: { type: 'text' | 'strong' | 'em'; value: string }[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex iteration
  while ((m = re.exec(escaped))) {
    if (m.index > last) tokens.push({ type: 'text', value: escaped.slice(last, m.index) })
    if (m[2] !== undefined) tokens.push({ type: 'strong', value: m[2] })
    else if (m[3] !== undefined) tokens.push({ type: 'em', value: m[3] })
    last = m.index + m[0].length
  }
  if (last < escaped.length) tokens.push({ type: 'text', value: escaped.slice(last) })

  return tokens.map((t, i) => {
    // biome-ignore lint/suspicious/noArrayIndexKey: tokens are derived deterministically from input
    if (t.type === 'strong') return <strong key={i}>{t.value}</strong>
    // biome-ignore lint/suspicious/noArrayIndexKey: tokens are derived deterministically from input
    if (t.type === 'em') return <em key={i}>{t.value}</em>
    // biome-ignore lint/suspicious/noArrayIndexKey: tokens are derived deterministically from input
    return <Fragment key={i}>{t.value}</Fragment>
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
