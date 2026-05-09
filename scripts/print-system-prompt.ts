/**
 * Print the system prompt for pasting into the ElevenLabs Agent dashboard.
 *
 * Usage:
 *   pnpm prompt          # print the static prompt (recommended for ElevenLabs)
 *   pnpm prompt full en  # print full prompt with [STATE]+[LANGUAGE] for a given locale
 */

import { buildSystemPrompt, staticSystemBlocks } from '../src/lib/agent/prompt'
import type { Locale } from '../src/i18n/config'

const mode = process.argv[2] ?? 'static'
const locale = (process.argv[3] ?? 'en') as Locale

if (mode === 'full') {
  const out = buildSystemPrompt({
    conversationId: 'preview',
    language: locale,
    step: 'greeting',
    captured: {},
    turnCount: 0,
  })
  process.stdout.write(out)
  process.stdout.write('\n')
} else {
  // Default: just the static (role + knowledge + flow + guardrails) blocks.
  // For ElevenLabs Agents, [STATE] and [LANGUAGE] are unnecessary because:
  //   - language is controlled via the SDK's `overrides.agent.language`
  //     which we already pass per locale in voice-call.tsx
  //   - state is inferred from conversation history naturally
  process.stdout.write(staticSystemBlocks())
  process.stdout.write('\n')
}
