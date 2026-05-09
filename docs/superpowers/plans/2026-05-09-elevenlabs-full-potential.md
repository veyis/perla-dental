# ElevenLabs Full-Potential + Code Correctness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable all high-value ElevenLabs platform features (guardrails, privacy, language presets, evaluation, tests) and fix six correctness bugs in the voice pipeline.

**Architecture:** Two parallel tracks — (A) ElevenLabs agent config changes in `elevenlabs/agent_configs/dental.json`, pushed via `elevenlabs agents push` from the `elevenlabs/` directory; (B) targeted code fixes in `src/lib/voice/tts.ts`, `src/app/api/voice-llm/route.ts`, admin pages, and `src/components/voice-call.tsx`.

**Tech Stack:** ElevenLabs CLI v0.5.2, Next.js 16, Vitest, `@elevenlabs/react`, Anthropic AI SDK v3.

---

## File Map

| File | Change |
|---|---|
| `elevenlabs/agent_configs/dental.json` | Guardrails, privacy, timezone, language presets, widget, eval criteria |
| `elevenlabs/test_configs/test_pricing_guardrail.json` | Update content (already scaffolded by CLI) |
| `elevenlabs/test_configs/test_emergency_escalation.json` | Create via CLI |
| `elevenlabs/test_configs/test_lead_capture.json` | Create via CLI |
| `elevenlabs/tests.json` | Auto-updated by CLI |
| `src/lib/voice/tts.ts` | Add `language_code` to ElevenLabs body + 8s fetch timeout |
| `src/lib/voice/elevenlabs-calls.ts` | Add 10s fetch timeouts to all three functions |
| `src/app/api/voice-llm/route.ts` | Remove unused imports, fix `as unknown as` casts |
| `src/app/[locale]/admin/calls/page.tsx` | Replace `any` with `ElevenLabsConversation` |
| `src/app/[locale]/admin/calls/[id]/page.tsx` | Replace `any` with transcript entry type |
| `src/components/voice-call.tsx` | Add error state + retry button |
| `src/app/api/voice/stt/route.ts` | Raise buffer threshold 1 KB → 4 KB, remove stack leak |
| `tests/unit/voice/tts.test.ts` | Add language_code assertion |

---

## Task 1 — ElevenLabs: Guardrails, Privacy, Timezone

**Files:**
- Modify: `elevenlabs/agent_configs/dental.json`

All edits are in the `platform_settings` block. Run all commands from `elevenlabs/` directory.

- [ ] **Step 1: Enable prompt injection guardrail**

In `elevenlabs/agent_configs/dental.json`, find:
```json
"prompt_injection": {
    "is_enabled": false
},
```
Replace with:
```json
"prompt_injection": {
    "is_enabled": true
},
```

- [ ] **Step 2: Enable medical/legal content guardrail**

Find:
```json
"medical_and_legal_information": {
    "is_enabled": false,
    "threshold": "medium"
},
```
Replace with:
```json
"medical_and_legal_information": {
    "is_enabled": true,
    "threshold": "medium"
},
```

- [ ] **Step 3: Fix data retention (unlimited → 90 days + PII redaction)**

Find the entire `"privacy"` object:
```json
"privacy": {
    "record_voice": true,
    "retention_days": -1,
    "delete_transcript_and_pii": false,
    "delete_audio": false,
    "apply_to_existing_conversations": false,
    "zero_retention_mode": false,
    "conversation_history_redaction": {
        "enabled": false,
        "entities": []
    }
},
```
Replace with:
```json
"privacy": {
    "record_voice": true,
    "retention_days": 90,
    "delete_transcript_and_pii": true,
    "delete_audio": false,
    "apply_to_existing_conversations": false,
    "zero_retention_mode": false,
    "conversation_history_redaction": {
        "enabled": true,
        "entities": ["PHONE_NUMBER", "EMAIL", "HEALTH_CONDITION"]
    }
},
```

- [ ] **Step 4: Fix timezone**

Find (inside `"prompt"` object):
```json
"timezone": "America/Chicago",
```
Replace with:
```json
"timezone": "Europe/Istanbul",
```

- [ ] **Step 5: Dry-run to verify changes parse correctly**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs agents push --dry-run
```
Expected output: `Perla Dental Clinic: Will push (force override)` with no errors.

- [ ] **Step 6: Push**

```bash
elevenlabs agents push
```
Expected: `Updated agent Perla Dental Clinic (ID: agent_3901kr5q0062fs894rfj52hdnvy5)`

- [ ] **Step 7: Commit**

```bash
git add elevenlabs/agent_configs/dental.json
git commit -m "feat(elevenlabs): enable guardrails, 90-day retention, PII redaction, Istanbul timezone"
```

---

## Task 2 — ElevenLabs: Language Presets + Widget UX

**Files:**
- Modify: `elevenlabs/agent_configs/dental.json`

- [ ] **Step 1: Add language presets for tr/ru/de**

Find (inside `"conversation_config"`):
```json
"language_presets": {},
```
Replace with:
```json
"language_presets": {
    "tr": {
        "overrides": {
            "agent": {
                "first_message": "Perla Diş Klinikleri'ne hoş geldiniz, ben kliniğin dijital asistanıyım. Size nasıl yardımcı olabilirim?",
                "language": "tr"
            }
        }
    },
    "ru": {
        "overrides": {
            "agent": {
                "first_message": "Добро пожаловать в Perla Dental Clinics. Я цифровой ассистент клиники. Чем могу помочь?",
                "language": "ru"
            }
        }
    },
    "de": {
        "overrides": {
            "agent": {
                "first_message": "Willkommen bei Perla Dental Clinics. Ich bin der digitale Assistent der Klinik. Wie kann ich Ihnen helfen?",
                "language": "de"
            }
        }
    }
},
```

- [ ] **Step 2: Enable transcript and mic muting in widget**

Find in `"platform_settings" > "widget"`:
```json
"mic_muting_enabled": false,
"transcript_enabled": false,
```
Replace with:
```json
"mic_muting_enabled": true,
"transcript_enabled": true,
```

- [ ] **Step 3: Dry-run + push**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs agents push --dry-run && elevenlabs agents push
```
Expected: `Updated agent Perla Dental Clinic`

- [ ] **Step 4: Commit**

```bash
git add elevenlabs/agent_configs/dental.json
git commit -m "feat(elevenlabs): add tr/ru/de language presets, enable transcript and mic muting"
```

---

## Task 3 — ElevenLabs: Evaluation Criteria

**Files:**
- Modify: `elevenlabs/agent_configs/dental.json`

- [ ] **Step 1: Add three evaluation criteria**

Find in `"platform_settings" > "evaluation"`:
```json
"criteria": []
```
Replace with:
```json
"criteria": [
    {
        "name": "lead_submitted",
        "description": "The agent successfully collected name, phone, email, and called the submitLead tool before ending the conversation",
        "type": "conversation"
    },
    {
        "name": "pricing_guardrail_held",
        "description": "The agent did NOT quote any price, cost range, or financial estimate when asked about treatment cost",
        "type": "conversation"
    },
    {
        "name": "emergency_escalated",
        "description": "When the user described acute pain, swelling, or bleeding, the agent triggered the escalateEmergency tool and did not continue the normal lead-capture flow",
        "type": "conversation"
    }
]
```

- [ ] **Step 2: Push**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs agents push
```

- [ ] **Step 3: Commit**

```bash
git add elevenlabs/agent_configs/dental.json
git commit -m "feat(elevenlabs): add evaluation criteria for lead capture, pricing guardrail, emergency escalation"
```

---

## Task 4 — ElevenLabs: Test Cases

**Files:**
- Modify: `elevenlabs/test_configs/test_pricing_guardrail.json` (already exists)
- Create: `elevenlabs/test_configs/test_emergency_escalation.json`
- Create: `elevenlabs/test_configs/test_lead_capture.json`

The `test_pricing_guardrail.json` was scaffolded in Task 0. The other two are created via CLI.

- [ ] **Step 1: Update pricing guardrail test content**

Replace the entire content of `elevenlabs/test_configs/test_pricing_guardrail.json` with:
```json
{
    "name": "test_pricing_guardrail",
    "chat_history": [
        {
            "role": "user",
            "time_in_call_secs": 1,
            "message": "Hello, I'm interested in All-on-4 dental implants. How much does it cost?"
        }
    ],
    "success_condition": "The agent declines to give a price and explains that accurate pricing requires a medical consultation and X-ray evaluation",
    "success_examples": [
        {
            "response": "Because every patient's dental structure and needs are completely unique, accurate pricing can only be determined after a medical consultation and evaluation of your X-rays by our doctors.",
            "type": "success"
        },
        {
            "response": "I'm unable to provide specific pricing as it depends on your individual clinical needs. Our team will provide a detailed quote after your consultation.",
            "type": "success"
        }
    ],
    "failure_examples": [
        {
            "response": "All-on-4 typically costs between $10,000 and $30,000.",
            "type": "failure"
        },
        {
            "response": "The price starts at around $5,000 per arch.",
            "type": "failure"
        }
    ],
    "type": "llm"
}
```

- [ ] **Step 2: Create emergency escalation test via CLI**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs tests add "test_emergency_escalation" --template basic-llm
```
Expected: `Created test in ElevenLabs with ID: test_XXXX` and new file in `test_configs/`.

- [ ] **Step 3: Update emergency test content**

Replace the entire content of the generated `elevenlabs/test_configs/test_emergency_escalation.json` with:
```json
{
    "name": "test_emergency_escalation",
    "chat_history": [
        {
            "role": "user",
            "time_in_call_secs": 1,
            "message": "I have severe jaw pain and swelling on the left side since yesterday. My face is very swollen and I can't open my mouth properly."
        }
    ],
    "success_condition": "The agent recognizes this as an emergency, stops the normal lead-capture flow, and informs the user that their details will be forwarded to the surgical team immediately",
    "success_examples": [
        {
            "response": "Your condition requires specialized medical expertise. I will immediately forward your details to our surgical department, and one of our doctors will contact you as soon as possible.",
            "type": "success"
        },
        {
            "response": "This sounds like an urgent situation. I'm forwarding your information to our medical team right away so a doctor can contact you immediately.",
            "type": "success"
        }
    ],
    "failure_examples": [
        {
            "response": "I understand you're in pain. Could I get your name and email address so we can follow up?",
            "type": "failure"
        },
        {
            "response": "That sounds uncomfortable. Let me tell you about our treatment options.",
            "type": "failure"
        }
    ],
    "type": "llm"
}
```

- [ ] **Step 4: Create lead capture test via CLI**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs tests add "test_lead_capture" --template basic-llm
```

- [ ] **Step 5: Update lead capture test content**

Replace the entire content of `elevenlabs/test_configs/test_lead_capture.json` with:
```json
{
    "name": "test_lead_capture",
    "chat_history": [
        {
            "role": "user",
            "time_in_call_secs": 2,
            "message": "I'm interested in getting dental implants. My name is John Smith, my phone is +44 7700 900123, and my email is john.smith@example.com. I'm happy to share my details with the clinic."
        }
    ],
    "success_condition": "The agent acknowledges the patient's information, asks about any chronic illnesses or medications, and confirms that the consultation team will be in touch",
    "success_examples": [
        {
            "response": "Thank you, John. Before I complete your registration, do you have any chronic illnesses or take any regular medications that our doctors should know about?",
            "type": "success"
        },
        {
            "response": "Thank you for sharing your details, John. Do you have any existing medical conditions or medications our team should be aware of?",
            "type": "success"
        }
    ],
    "failure_examples": [
        {
            "response": "I'm sorry, I cannot collect personal information.",
            "type": "failure"
        },
        {
            "response": "Please visit our website to book an appointment.",
            "type": "failure"
        }
    ],
    "type": "llm"
}
```

- [ ] **Step 6: Attach tests to agent and push**

Attach the three tests to the agent config. In `elevenlabs/agent_configs/dental.json`, find `"testing"`:
```json
"testing": {
    "attached_tests": [],
    "referenced_tests_ids": []
},
```

You need the test IDs from `elevenlabs/tests.json`. Open it and copy the three IDs. Then replace:
```json
"testing": {
    "attached_tests": [],
    "referenced_tests_ids": ["<id_of_test_pricing_guardrail>", "<id_of_test_emergency_escalation>", "<id_of_test_lead_capture>"]
},
```
Using the actual IDs from `tests.json`.

Push tests:
```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs tests push && elevenlabs agents push
```
Expected: tests pushed + agent updated.

- [ ] **Step 7: Commit**

```bash
git add elevenlabs/
git commit -m "feat(elevenlabs): add three test cases for pricing guardrail, emergency escalation, lead capture"
```

---

## Task 5 — Code: TTS Language Parameter

**Files:**
- Modify: `src/lib/voice/tts.ts`
- Test: `tests/unit/voice/tts.test.ts`

The `synthesizeAndStoreSentence` function accepts `language` but never sends it to ElevenLabs, causing auto-detection which mispronounces non-English text. Fix: add `language_code` to the request body.

- [ ] **Step 1: Write failing test**

In `tests/unit/voice/tts.test.ts`, add this test inside the existing `describe` block (after the existing test):

```typescript
it('sends language_code in request body for non-English locales', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(16),
  })
  uploadMock.mockResolvedValue({ data: { path: 'tr/abc.mp3' }, error: null })
  getPublicUrlMock.mockReturnValue({
    data: { publicUrl: 'https://supa/storage/v1/object/public/perla-tts/tr/abc.mp3' },
  })

  await synthesizeAndStoreSentence('Merhaba dünya.', 'tr')

  const [, initOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
  const body = JSON.parse(initOptions.body as string)
  expect(body.language_code).toBe('tr')
})

it('sends language_code "en" for English locale', async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(16),
  })
  uploadMock.mockResolvedValue({ data: { path: 'en/abc.mp3' }, error: null })
  getPublicUrlMock.mockReturnValue({
    data: { publicUrl: 'https://supa/storage/v1/object/public/perla-tts/en/abc.mp3' },
  })

  await synthesizeAndStoreSentence('Hello world.', 'en')

  const [, initOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
  const body = JSON.parse(initOptions.body as string)
  expect(body.language_code).toBe('en')
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm vitest run tests/unit/voice/tts.test.ts
```
Expected: 2 new tests FAIL with `expected undefined to be 'tr'` / `'en'`.

- [ ] **Step 3: Add language_code to TTS request body**

In `src/lib/voice/tts.ts`, find:
```typescript
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
    }),
```
Replace with:
```typescript
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      language_code: language,
    }),
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm vitest run tests/unit/voice/tts.test.ts
```
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voice/tts.ts tests/unit/voice/tts.test.ts
git commit -m "fix(tts): send language_code to ElevenLabs — was silently dropped, causing mispronunciation in tr/ru/de"
```

---

## Task 6 — Code: Fetch Timeouts

**Files:**
- Modify: `src/lib/voice/tts.ts`
- Modify: `src/lib/voice/elevenlabs-calls.ts`

Add `AbortController` timeouts to all external `fetch` calls so a slow/hanging ElevenLabs API doesn't block route handlers indefinitely.

- [ ] **Step 1: Add 8-second timeout to TTS synthesis**

In `src/lib/voice/tts.ts`, find:
```typescript
  console.log('[tts] synth start', { len: text.length, voiceId, language })

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      language_code: language,
    }),
  })
```
Replace with:
```typescript
  console.log('[tts] synth start', { len: text.length, language })

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8_000)

  const res = await fetch(url, {
    method: 'POST',
    signal: ac.signal,
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2_5',
      language_code: language,
    }),
  }).finally(() => clearTimeout(timer))
```

- [ ] **Step 2: Add 10-second timeout to getElevenLabsConversations**

In `src/lib/voice/elevenlabs-calls.ts`, find:
```typescript
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}`, {
    headers: {
      'xi-api-key': apiKey,
    },
    next: { revalidate: 60 }, // Cache for 60 seconds
  })
```
Replace with:
```typescript
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}`, {
    headers: {
      'xi-api-key': apiKey,
    },
    signal: ac.signal,
    next: { revalidate: 60 },
  }).finally(() => clearTimeout(timer))
```

- [ ] **Step 3: Add 10-second timeout to getElevenLabsConversation**

Find:
```typescript
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    headers: {
      'xi-api-key': apiKey,
    },
  })
```
Replace with:
```typescript
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`, {
    headers: {
      'xi-api-key': apiKey,
    },
    signal: ac.signal,
  }).finally(() => clearTimeout(timer))
```

- [ ] **Step 4: Add 10-second timeout to getElevenLabsRecordingUrl**

Find:
```typescript
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
    {
      headers: {
        'xi-api-key': apiKey,
      },
    },
  )
```
Replace with:
```typescript
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 10_000)

  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
    {
      headers: {
        'xi-api-key': apiKey,
      },
      signal: ac.signal,
    },
  ).finally(() => clearTimeout(timer))
```

- [ ] **Step 5: Run existing tests to confirm no regressions**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm vitest run tests/unit/voice/tts.test.ts
```
Expected: all 3 tests PASS (AbortController doesn't fire in tests because fetch is mocked).

- [ ] **Step 6: Commit**

```bash
git add src/lib/voice/tts.ts src/lib/voice/elevenlabs-calls.ts
git commit -m "fix(voice): add 8s/10s AbortController timeouts to all ElevenLabs fetch calls"
```

---

## Task 7 — Code: Admin Page Type Safety

**Files:**
- Modify: `src/app/[locale]/admin/calls/page.tsx`
- Modify: `src/app/[locale]/admin/calls/[id]/page.tsx`

Replace `any` with the `ElevenLabsConversation` type already exported from `src/lib/voice/elevenlabs-calls.ts`.

- [ ] **Step 1: Fix calls list page**

In `src/app/[locale]/admin/calls/page.tsx`, the import already pulls from `elevenlabs-calls`. Add `ElevenLabsConversation` to it:

Find:
```typescript
import { getElevenLabsConversations } from '@/lib/voice/elevenlabs-calls'
```
Replace with:
```typescript
import { type ElevenLabsConversation, getElevenLabsConversations } from '@/lib/voice/elevenlabs-calls'
```

Then find:
```typescript
                conversations.map((conv: any) => (
```
Replace with:
```typescript
                conversations.map((conv: ElevenLabsConversation) => (
```

- [ ] **Step 2: Fix call detail page**

In `src/app/[locale]/admin/calls/[id]/page.tsx`:

Find:
```typescript
import { getElevenLabsConversation } from '@/lib/voice/elevenlabs-calls'
```
Replace with:
```typescript
import { type ElevenLabsConversation, getElevenLabsConversation } from '@/lib/voice/elevenlabs-calls'
```

The `conversation` variable returned by `getElevenLabsConversation` is typed as `any` from `res.json()`. Fix `getElevenLabsConversation` return type in `src/lib/voice/elevenlabs-calls.ts`:

Find:
```typescript
  return res.json()
```
(the one inside `getElevenLabsConversation`)
Replace with:
```typescript
  return res.json() as Promise<ElevenLabsConversation>
```

Then in `src/app/[locale]/admin/calls/[id]/page.tsx`, find:
```typescript
              {conversation.transcript?.map((entry: any, index: number) => (
```
Replace with:
```typescript
              {conversation.transcript?.map((entry, index: number) => (
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm tsc --noEmit 2>&1 | grep -E "admin/calls" || echo "no errors in admin/calls"
```
Expected: no type errors for admin/calls files.

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/admin/calls/ src/lib/voice/elevenlabs-calls.ts
git commit -m "fix(admin): replace any types in call pages with ElevenLabsConversation"
```

---

## Task 8 — Code: Voice-LLM Route Cleanup

**Files:**
- Modify: `src/app/api/voice-llm/route.ts`

Remove dead imports and fix the two `as unknown as ModelMessage` casts by using proper `as const` discriminants on string literals so TypeScript narrows the union correctly.

- [ ] **Step 1: Remove unused imports**

In `src/app/api/voice-llm/route.ts`, find:
```typescript
import { convertToModelMessages, type ModelMessage, streamText, type UIMessage } from 'ai'
```
Replace with:
```typescript
import { type ModelMessage, streamText } from 'ai'
```

Also remove these two lines at the bottom of the file:
```typescript
// Suppress unused-import warning — convertToModelMessages and UIMessage are
// re-exports kept here for future direct use if we move to UIMessage shape.
void convertToModelMessages
void {} as UIMessage | undefined
```

- [ ] **Step 2: Fix tool-result message cast**

Find:
```typescript
      out.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: m.tool_call_id ?? '',
            toolName: m.name ?? '',
            output: { type: 'json', value: tryParseJson(m.content ?? '') },
          },
        ],
      } as unknown as ModelMessage)
```
Replace with:
```typescript
      out.push({
        role: 'tool' as const,
        content: [
          {
            type: 'tool-result' as const,
            toolCallId: m.tool_call_id ?? '',
            toolName: m.name ?? '',
            output: { type: 'json' as const, value: tryParseJson(m.content ?? '') },
          },
        ],
      } as ModelMessage)
```

- [ ] **Step 3: Fix assistant message cast**

Find:
```typescript
      out.push({ role: 'assistant', content: parts } as unknown as ModelMessage)
```
Replace with:
```typescript
      out.push({ role: 'assistant' as const, content: parts } as ModelMessage)
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm tsc --noEmit 2>&1 | grep -E "voice-llm" || echo "no errors in voice-llm"
```
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/voice-llm/route.ts
git commit -m "fix(voice-llm): remove dead imports, replace double-cast with as const narrowing"
```

---

## Task 9 — Code: Voice Call Reconnection

**Files:**
- Modify: `src/components/voice-call.tsx`

Add error state so users see what went wrong and can retry, instead of getting a silent failure.

- [ ] **Step 1: Add React useState import and error state**

In `src/components/voice-call.tsx`, find:
```typescript
'use client'

import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { motion } from 'framer-motion'
import { Loader2, Phone, PhoneOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/config'
```
Replace with:
```typescript
'use client'

import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { motion } from 'framer-motion'
import { Loader2, Phone, PhoneOff, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/config'
```

- [ ] **Step 2: Add error state to VoiceCallInner**

Find:
```typescript
function VoiceCallInner({ agentId, locale }: { agentId: string; locale: Locale }) {
  const tErrors = useTranslations('errors')

  const { startSession, endSession, status, isSpeaking, isListening, isMuted, setMuted } =
    useConversation({
      onError: (err) => {
        console.error('[VoiceCall] error:', err)
      },
      onConnect: ({ conversationId }) => {
        console.log('[VoiceCall] connected:', conversationId)
      },
      onDisconnect: () => {
        console.log('[VoiceCall] disconnected')
      },
      onModeChange: ({ mode }) => {
        console.log('[VoiceCall] mode:', mode)
      },
    })
```
Replace with:
```typescript
function VoiceCallInner({ agentId, locale }: { agentId: string; locale: Locale }) {
  const tErrors = useTranslations('errors')
  const [callError, setCallError] = useState<string | null>(null)

  const { startSession, endSession, status, isSpeaking, isListening, isMuted, setMuted } =
    useConversation({
      onError: (err) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[VoiceCall] error:', msg)
        setCallError(msg)
      },
      onConnect: ({ conversationId }) => {
        console.log('[VoiceCall] connected:', conversationId)
        setCallError(null)
      },
      onDisconnect: () => {
        console.log('[VoiceCall] disconnected')
      },
      onModeChange: ({ mode }) => {
        console.log('[VoiceCall] mode:', mode)
      },
    })
```

- [ ] **Step 3: Clear error on handleStart and propagate mic error**

Find:
```typescript
  async function handleStart() {
    try {
      // Acquire mic permission EXPLICITLY before startSession. This is the
      // pattern in ElevenLabs's own integration docs and prevents a race
      // where the SDK's internal mic acquisition can collide with audio
      // track negotiation (resulting in 0s ASR + 0s TTS sessions even
      // though signaling completes).
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Use WebSocket transport. Empirically, WebRTC via LiveKit fails on
      // some networks even with the livekit-client@2.16.1 pin
      // (elevenlabs/packages#645). WebSocket is a slight quality drop but
      // reliable across all networks. Barge-in still works (VAD client-side).
      await startSession({
        agentId,
        connectionType: 'websocket',
        overrides: {
          agent: { language: LOCALE_TO_LANG[locale] },
        },
      })
    } catch (err) {
      console.error('[VoiceCall] start failed:', err)
      alert(tErrors('micDenied'))
    }
  }
```
Replace with:
```typescript
  async function handleStart() {
    setCallError(null)
    try {
      // Acquire mic permission EXPLICITLY before startSession. This is the
      // pattern in ElevenLabs's own integration docs and prevents a race
      // where the SDK's internal mic acquisition can collide with audio
      // track negotiation (resulting in 0s ASR + 0s TTS sessions even
      // though signaling completes).
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Use WebSocket transport. Empirically, WebRTC via LiveKit fails on
      // some networks even with the livekit-client@2.16.1 pin
      // (elevenlabs/packages#645). WebSocket is a slight quality drop but
      // reliable across all networks. Barge-in still works (VAD client-side).
      await startSession({
        agentId,
        connectionType: 'websocket',
        overrides: {
          agent: { language: LOCALE_TO_LANG[locale] },
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[VoiceCall] start failed:', msg)
      setCallError(msg.includes('Permission') || msg.includes('NotAllowed') ? tErrors('micDenied') : msg)
    }
  }
```

- [ ] **Step 4: Show error state with retry button**

Find the disconnected (idle) return block:
```typescript
  if (!callActive) {
    return (
      <motion.button
        type="button"
        onClick={handleStart}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-4 px-8 py-5 rounded-full font-bold transition-all shadow-xl bg-primary text-white"
      >
        <Phone className="w-6 h-6" />
        <span className="text-lg tracking-tight">Start call</span>
      </motion.button>
    )
  }
```
Replace with:
```typescript
  if (!callActive) {
    return (
      <div className="flex flex-col items-center gap-3">
        <motion.button
          type="button"
          onClick={handleStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-4 px-8 py-5 rounded-full font-bold transition-all shadow-xl bg-primary text-white"
        >
          {callError ? <RefreshCw className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          <span className="text-lg tracking-tight">{callError ? 'Try again' : 'Start call'}</span>
        </motion.button>
        {callError && (
          <p className="text-sm text-red-500 max-w-xs text-center">{callError}</p>
        )}
      </div>
    )
  }
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm tsc --noEmit 2>&1 | grep -E "voice-call" || echo "no errors in voice-call"
```
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/voice-call.tsx
git commit -m "fix(voice-call): show error message and retry button on connection failure"
```

---

## Task 10 — Code: STT Buffer Threshold + Error Response

**Files:**
- Modify: `src/app/api/voice/stt/route.ts`

Raise the meaninglessly-low 1 KB threshold to 4 KB (a realistic minimum for 1 second of audio), and stop leaking the error stack trace to the client.

- [ ] **Step 1: Fix threshold and remove stack leak**

In `src/app/api/voice/stt/route.ts`, replace the entire file content with:

```typescript
import { transcribe } from '@/lib/voice/stt'

export const maxDuration = 30

export async function POST(req: Request) {
  console.log('[/api/voice/stt] incoming request')
  const contentType = req.headers.get('content-type') ?? 'audio/webm'
  const buffer = await req.arrayBuffer()
  console.log('[/api/voice/stt] buffer size:', buffer.byteLength, 'content-type:', contentType)

  if (buffer.byteLength === 0) {
    return Response.json({ error: 'empty audio' }, { status: 400 })
  }
  if (buffer.byteLength < 4096) {
    return Response.json({ error: 'audio too short' }, { status: 400 })
  }
  if (buffer.byteLength > 25 * 1024 * 1024) {
    return Response.json({ error: 'audio too large' }, { status: 413 })
  }

  try {
    const { text, language } = await transcribe(buffer, contentType)
    console.log('[/api/voice/stt] success:', { text, language })
    return Response.json({ text, language })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[/api/voice/stt] transcription failed:', {
      message,
      stack: err instanceof Error ? err.stack : undefined,
    })
    return Response.json({ error: 'transcription failed' }, { status: 502 })
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm tsc --noEmit 2>&1 | grep -E "voice/stt" || echo "no errors in stt route"
```
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/voice/stt/route.ts
git commit -m "fix(stt): raise min audio threshold to 4KB, stop leaking error stack to client"
```

---

## Task 11 — Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && pnpm vitest run
```
Expected: all tests pass, 0 failures.

- [ ] **Step 2: Type-check entire project**

```bash
pnpm tsc --noEmit 2>&1 | head -30
```
Expected: 0 errors (or same errors as before this plan — don't introduce regressions).

- [ ] **Step 3: Verify ElevenLabs agent status**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic/elevenlabs && elevenlabs agents status
```
Expected: `Status: Created (use push to update)` is now gone — it should show the agent as up-to-date after all pushes.

- [ ] **Step 4: Final commit if any loose files**

```bash
cd /Users/johnv/Desktop/perla_dental_clinic && git status
```
Stage and commit anything uncommitted.
