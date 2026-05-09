# Landing-page chat assistant — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a premium, PDF-aligned chat assistant to the Perla Dental Clinics landing page with two surfaces (floating launcher + redesigned inline section) sharing one `<ChatPanel>`, an HITL consent gate before any lead is written, and full i18n across en/tr/ru/de.

**Architecture:** A single `<ChatProvider>` owns conversation state and a single `useChat()` instance. Two surfaces (`<InlineChatSection>` and `<ChatLauncher>`) render the same `<ChatPanel>` and share that state. The server's `submitLead` tool no longer writes — it returns a signed `pending_consent` payload; the user clicks a consent card that POSTs to a new `/api/lead/submit` endpoint where the existing `submitLead()` runs.

**Tech Stack:** Next.js 16, React 19, AI SDK 6 (`@ai-sdk/react`, `@ai-sdk/anthropic`), `next-intl`, Tailwind 4, Framer Motion 12, Zod 4, Vitest 4, Playwright 1.59, Biome 2, Supabase JS, Resend, ElevenLabs, lucide-react, `pnpm`.

**Spec:** `docs/superpowers/specs/2026-05-09-landing-page-chat-assistant-design.md` is the source of truth.

**Branch:** `feat/initial-implementation` (work continues here; create a worktree if preferred but not required).

**Pre-flight rules:**
- Per `AGENTS.md`, this is **not** the Next.js you know. Before writing any new route or non-trivial Next.js API, read the relevant doc in `node_modules/next/dist/docs/` first.
- Project uses `pnpm`, not `npm`. Biome formats: 2-space indent, single quotes, no semicolons (handled automatically by Biome).
- React Compiler is enabled (`babel-plugin-react-compiler`). Do not add `useCallback` / `useMemo` defensively — the compiler memoizes.
- The user is on macOS (`darwin`); avoid Linux-only flags in commands.

---

## File map

**New (15 source files + 4 test files):**

```
src/components/chat/
├── chat-provider.tsx
├── chat-launcher.tsx
├── chat-panel.tsx
├── chat-header.tsx
├── chat-greeting.tsx
├── chat-messages.tsx
├── chat-lead-card.tsx
├── chat-composer.tsx
├── inline-chat-section.tsx
├── markdown-lite.tsx
├── use-chat-conversation.ts
└── index.ts

src/app/api/lead/submit/route.ts
src/lib/leads/consent-hmac.ts

tests/unit/chat/markdown-lite.test.ts
tests/unit/chat/consent-hmac.test.ts
tests/unit/chat/chat-lead-card.test.tsx
tests/e2e/chat.spec.ts

tests/evals/chat-flow-consent.yaml
```

**Modified (7):**

```
src/components/landing-page.tsx       — strip embedded chat block, mount provider/section/launcher
src/app/api/chat/route.ts             — submitLead returns pending_consent, no row write
src/lib/agent/prompt.ts               — append confirmation rule to FLOW_BLOCK
src/lib/env.ts                        — register optional LEAD_HMAC_SECRET
messages/{en,tr,ru,de}.json           — add chat.* namespace
DEPLOYMENT.md                         — document LEAD_HMAC_SECRET + new endpoint
tests/evals/promptfoo.config.yaml     — register the new chat-flow-consent suite
```

---

## Task 1: Register `LEAD_HMAC_SECRET` env var

**Files:**
- Modify: `src/lib/env.ts:11-30`
- Modify: `DEPLOYMENT.md` (append a section)

- [ ] **Step 1: Add the optional env var**

Edit `src/lib/env.ts`. Inside the `envSchema` z.object call, add the new key just under `LEAD_FORGET_TOKEN`:

```ts
LEAD_FORGET_TOKEN: z.string().min(16).optional(),
LEAD_HMAC_SECRET: z.string().min(32).optional(),
```

- [ ] **Step 2: Document the new env var**

Append to `DEPLOYMENT.md` a section:

```md
## Chat lead-capture HMAC

`LEAD_HMAC_SECRET` (32+ chars). Server signs the model-proposed lead fields when
the chat tool returns `pending_consent`; the new `/api/lead/submit` endpoint
verifies the same signature so only fields the model actually proposed in this
conversation can be written. Generate with:

```bash
openssl rand -hex 32
```

Set in Vercel project env (production + preview) and `.env.local` for dev.
```

- [ ] **Step 3: Run typecheck to confirm the schema still parses**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/env.ts DEPLOYMENT.md
git commit -m "feat(env): register LEAD_HMAC_SECRET for chat lead-capture HMAC

Optional. Signs model-proposed lead fields so only those the model
actually proposed in this conversation can be submitted via the new
/api/lead/submit endpoint."
```

---

## Task 2: TDD `consent-hmac.ts`

**Files:**
- Create: `src/lib/leads/consent-hmac.ts`
- Test: `tests/unit/chat/consent-hmac.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/chat/consent-hmac.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { signFields, verifyFields } from '@/lib/leads/consent-hmac'

const SAMPLE_FIELDS = {
  fullName: 'Jane Doe',
  phone: '+15551234567',
  email: 'jane@example.com',
  chronicIllnesses: null,
  interest: 'implants' as const,
  preferredLanguage: 'en' as const,
  consentGiven: true as const,
}

describe('consent-hmac', () => {
  beforeEach(() => {
    process.env.LEAD_HMAC_SECRET = 'a'.repeat(64)
  })

  it('round-trips: signed fields verify under the same conversationId', () => {
    const sig = signFields('conv-1', SAMPLE_FIELDS)
    expect(verifyFields('conv-1', SAMPLE_FIELDS, sig)).toBe(true)
  })

  it('rejects when the conversationId differs', () => {
    const sig = signFields('conv-1', SAMPLE_FIELDS)
    expect(verifyFields('conv-2', SAMPLE_FIELDS, sig)).toBe(false)
  })

  it('rejects when any field is tampered with', () => {
    const sig = signFields('conv-1', SAMPLE_FIELDS)
    const tampered = { ...SAMPLE_FIELDS, email: 'attacker@evil.com' }
    expect(verifyFields('conv-1', tampered, sig)).toBe(false)
  })

  it('rejects on a malformed signature', () => {
    expect(verifyFields('conv-1', SAMPLE_FIELDS, 'not-a-real-hex')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm exec vitest run tests/unit/chat/consent-hmac.test.ts
```

Expected: FAIL — module not found at `@/lib/leads/consent-hmac`.

- [ ] **Step 3: Implement `consent-hmac.ts`**

Create `src/lib/leads/consent-hmac.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { SubmitLeadInput } from '@/lib/agent/tools'
import { requireEnv } from '@/lib/env'

/**
 * Canonical, stable JSON for a fields object. Sorting keys keeps the signature
 * deterministic regardless of property-insertion order — the model is allowed
 * to assemble the object differently across turns.
 */
function canonicalize(fields: SubmitLeadInput): string {
  const keys = Object.keys(fields).sort() as (keyof SubmitLeadInput)[]
  const ordered: Record<string, unknown> = {}
  for (const k of keys) ordered[k] = fields[k]
  return JSON.stringify(ordered)
}

function hmac(conversationId: string, fields: SubmitLeadInput): string {
  const secret = requireEnv('LEAD_HMAC_SECRET')
  return createHmac('sha256', secret)
    .update(`${conversationId}:${canonicalize(fields)}`)
    .digest('hex')
}

export function signFields(conversationId: string, fields: SubmitLeadInput): string {
  return hmac(conversationId, fields)
}

export function verifyFields(
  conversationId: string,
  fields: SubmitLeadInput,
  signature: string,
): boolean {
  const expected = hmac(conversationId, fields)
  if (signature.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm exec vitest run tests/unit/chat/consent-hmac.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/leads/consent-hmac.ts tests/unit/chat/consent-hmac.test.ts
git commit -m "feat(leads): consent-hmac for HITL lead capture

Signs model-proposed lead fields with conversationId so the submit
endpoint can verify the model actually proposed exactly these fields
in this conversation. Uses canonical JSON ordering and timingSafeEqual."
```

---

## Task 3: Add `chat.*` keys to `messages/en.json`

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add the new namespace**

Open `messages/en.json` and add the `chat` block after the existing `errors` block (and before `trust`):

```json
  "chat": {
    "headerTitle": "Perla Concierge",
    "headerOnline": "Online",
    "sectionTitle": "Talk to Our Concierge",
    "sectionSubtitle": "Ask about treatments, our specialists, and how your visit will unfold.",
    "greeting": "Welcome to Perla Dental Clinics, I am the clinic's digital assistant. How may I help you today?",
    "chipImplants": "Tell me about implants",
    "chipVeneers": "Veneers & smile makeover",
    "chipDentalHoliday": "How does the Dental Holiday work?",
    "chipDoctors": "Tell me about your doctors",
    "placeholder": "Type your message…",
    "composerLabel": "Message Perla Concierge",
    "send": "Send",
    "muteOn": "Voice replies on",
    "muteOff": "Voice replies off",
    "openLauncher": "Open chat with Perla Concierge",
    "closeLauncher": "Close chat",
    "charCounter": "{count} / 1000",
    "privacyLink": "Privacy",
    "escalationBanner": "Your case has been forwarded to our surgical team.",
    "leadConfirmed": "Saved — our team will be in touch within one business day.",
    "typingLabel": "Perla Concierge is typing"
  },
```

Also fix the **`ui.subcopy`** to no longer steer toward voice ("Speak with our AI assistant…") — replace with: `"Premium dental care, guided by our AI concierge. Doctors follow up."` (kills the voice-only framing now that chat is first-class).

- [ ] **Step 2: Run the i18n unit tests if any exist**

```bash
pnpm exec vitest run tests/unit/i18n
```

Expected: pass (or no tests found, also fine).

- [ ] **Step 3: Run the JSON parser to validate**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8'))"
```

Expected: silent success.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json
git commit -m "feat(i18n/en): chat.* namespace + neutralize ui.subcopy"
```

---

## Task 4: Add `chat.*` keys to `tr.json`, `ru.json`, `de.json`

**Files:**
- Modify: `messages/tr.json`, `messages/ru.json`, `messages/de.json`

- [ ] **Step 1: tr.json**

Add after the `errors` block, before `trust`:

```json
  "chat": {
    "headerTitle": "Perla Konsiyerj",
    "headerOnline": "Çevrimiçi",
    "sectionTitle": "Konsiyerjimizle Konuşun",
    "sectionSubtitle": "Tedaviler, uzmanlarımız ve ziyaretinizin nasıl ilerleyeceği hakkında soru sorun.",
    "greeting": "Perla Diş Kliniklerine hoş geldiniz, kliniğin dijital asistanıyım. Size nasıl yardımcı olabilirim?",
    "chipImplants": "İmplantlar hakkında bilgi verin",
    "chipVeneers": "Lamine veneer ve gülüş tasarımı",
    "chipDentalHoliday": "Diş Tatili nasıl işliyor?",
    "chipDoctors": "Doktorlarınızdan bahsedin",
    "placeholder": "Mesajınızı yazın…",
    "composerLabel": "Perla Konsiyerj'e mesaj",
    "send": "Gönder",
    "muteOn": "Sesli yanıtlar açık",
    "muteOff": "Sesli yanıtlar kapalı",
    "openLauncher": "Perla Konsiyerj ile sohbeti aç",
    "closeLauncher": "Sohbeti kapat",
    "charCounter": "{count} / 1000",
    "privacyLink": "Gizlilik",
    "escalationBanner": "Durumunuz cerrahi ekibimize iletildi.",
    "leadConfirmed": "Kaydedildi — ekibimiz bir iş günü içinde sizinle iletişime geçecek.",
    "typingLabel": "Perla Konsiyerj yazıyor"
  },
```

Also adjust `ui.subcopy` to: `"Premium diş bakımı, AI konsiyerjimizle. Doktorlar sizinle iletişime geçer."`.

- [ ] **Step 2: ru.json**

Add the namespace:

```json
  "chat": {
    "headerTitle": "Perla Консьерж",
    "headerOnline": "В сети",
    "sectionTitle": "Поговорите с нашим консьержем",
    "sectionSubtitle": "Спросите о процедурах, наших специалистах и о том, как пройдёт ваш визит.",
    "greeting": "Добро пожаловать в Perla Dental Clinics, я цифровой ассистент клиники. Чем могу помочь?",
    "chipImplants": "Расскажите об имплантах",
    "chipVeneers": "Виниры и дизайн улыбки",
    "chipDentalHoliday": "Как работает «стоматологический отдых»?",
    "chipDoctors": "Расскажите о ваших врачах",
    "placeholder": "Введите ваше сообщение…",
    "composerLabel": "Сообщение Perla Консьержу",
    "send": "Отправить",
    "muteOn": "Голосовые ответы включены",
    "muteOff": "Голосовые ответы выключены",
    "openLauncher": "Открыть чат с Perla Консьержем",
    "closeLauncher": "Закрыть чат",
    "charCounter": "{count} / 1000",
    "privacyLink": "Конфиденциальность",
    "escalationBanner": "Ваш случай передан нашей хирургической команде.",
    "leadConfirmed": "Сохранено — наша команда свяжется с вами в течение одного рабочего дня.",
    "typingLabel": "Perla Консьерж печатает"
  },
```

Also `ui.subcopy`: `"Премиальная стоматология с AI-консьержем. Врачи свяжутся с вами."`.

- [ ] **Step 3: de.json**

Add the namespace:

```json
  "chat": {
    "headerTitle": "Perla Concierge",
    "headerOnline": "Online",
    "sectionTitle": "Sprechen Sie mit unserem Concierge",
    "sectionSubtitle": "Fragen Sie zu Behandlungen, unseren Spezialisten und zum Ablauf Ihres Besuchs.",
    "greeting": "Willkommen bei Perla Dental Clinics, ich bin der digitale Assistent der Klinik. Wie kann ich Ihnen helfen?",
    "chipImplants": "Mehr über Implantate",
    "chipVeneers": "Veneers & Smile-Makeover",
    "chipDentalHoliday": "Wie funktioniert der Zahnurlaub?",
    "chipDoctors": "Mehr über Ihre Ärzte",
    "placeholder": "Nachricht eingeben…",
    "composerLabel": "Nachricht an Perla Concierge",
    "send": "Senden",
    "muteOn": "Sprachantworten an",
    "muteOff": "Sprachantworten aus",
    "openLauncher": "Chat mit Perla Concierge öffnen",
    "closeLauncher": "Chat schließen",
    "charCounter": "{count} / 1000",
    "privacyLink": "Datenschutz",
    "escalationBanner": "Ihr Fall wurde an unser Chirurgieteam weitergeleitet.",
    "leadConfirmed": "Gespeichert — unser Team meldet sich innerhalb eines Werktags.",
    "typingLabel": "Perla Concierge tippt"
  },
```

Also `ui.subcopy`: `"Hochwertige Zahnmedizin, begleitet von unserem KI-Concierge. Ärzte melden sich."`.

- [ ] **Step 4: Validate all four locale files**

```bash
for f in messages/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "$f ok"; done
```

Expected: four `ok` lines.

- [ ] **Step 5: Commit**

```bash
git add messages/tr.json messages/ru.json messages/de.json
git commit -m "feat(i18n): chat.* keys + neutralize ui.subcopy in tr/ru/de"
```

---

## Task 5: Server `submitLead` returns `pending_consent` (no row write)

**Files:**
- Modify: `src/lib/agent/tools.ts:27-43`
- Modify: `src/app/api/chat/route.ts:23-90`

- [ ] **Step 1: Update the tool's return contract in `tools.ts`**

Replace the file's `buildTools` body so `onSubmitLead` is renamed to `onProposeLead` and the return type reflects the pending-consent shape. Replace the entire file with:

```ts
import { tool } from 'ai'
import { z } from 'zod'

export const submitLeadParams = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^\+?[\d\s()-]{7,}$/, 'phone must contain at least 7 digits'),
  email: z.string().email(),
  chronicIllnesses: z.string().nullable(),
  interest: z.enum(['implants', 'veneers', 'all-on-4', 'all-on-6', 'smile-makeover', 'other']),
  preferredLanguage: z.enum(['en', 'tr', 'ru', 'de']),
  consentGiven: z.literal(true),
})

export const escalateEmergencyParams = z.object({
  summary: z.string().min(5),
  contactInfo: z.string().nullable(),
})

export type SubmitLeadInput = z.infer<typeof submitLeadParams>
export type EscalateEmergencyInput = z.infer<typeof escalateEmergencyParams>

export type ProposeLeadResult = {
  status: 'pending_consent'
  fields: SubmitLeadInput
  fingerprint: string
}

export type ToolDeps = {
  /**
   * Returns a signed envelope for the user-facing consent card. Does NOT
   * write the lead. The actual write happens at /api/lead/submit after the
   * user clicks "Send to clinic".
   */
  onProposeLead: (input: SubmitLeadInput) => Promise<ProposeLeadResult>
  onEscalateEmergency: (input: EscalateEmergencyInput) => Promise<{ ack: true }>
}

export function buildTools(deps: ToolDeps) {
  return {
    submitLead: tool({
      description:
        'Propose a lead for the user to confirm. Call ONLY when all required fields (full name, phone, email, interest, preferredLanguage) are gathered AND chronic-illness disclosure has been asked. consentGiven must be true. The clinic CRM is written ONLY after the user clicks the consent card the client renders from your tool result — do not assume the lead is saved until you receive a follow-up user message confirming submission.',
      inputSchema: submitLeadParams,
      execute: async (input) => deps.onProposeLead(input),
    }),
    escalateEmergency: tool({
      description:
        'Trigger when the patient describes acute pain, swelling, bleeding, or any condition requiring urgent care. Provide a concise English summary.',
      inputSchema: escalateEmergencyParams,
      execute: async (input) => deps.onEscalateEmergency(input),
    }),
  }
}
```

- [ ] **Step 2: Update `route.ts` to wire the new dep**

Edit `src/app/api/chat/route.ts`. Replace lines 14 (`import { submitLead } from '@/lib/leads/submit-lead'`) with:

```ts
import { signFields } from '@/lib/leads/consent-hmac'
```

…and remove the `import { submitLead } from '@/lib/leads/submit-lead'` line entirely (the real submit now lives in the new endpoint).

Then in the `buildTools({ … })` call, replace the `onSubmitLead` block with:

```ts
      const tools = buildTools({
        onProposeLead: async (input) => {
          const fingerprint = signFields(body.conversationId, input)
          await audit({
            kind: 'lead_consent_pending',
            conversationId: body.conversationId,
          })
          return { status: 'pending_consent', fields: input, fingerprint }
        },
        onEscalateEmergency: async (input) => {
          await audit({
            kind: 'emergency_escalated',
            conversationId: body.conversationId,
            summary: input.summary,
          })
          return { ack: true }
        },
      })
```

Also delete the now-unused `CONSENT_TEXT` constant and the `ip` / `country` extraction lines that were only used for `submitLead`. Keep `audit` and `logger` imports.

- [ ] **Step 3: Add `lead_consent_pending` to the audit kind union**

Open `src/lib/observability/audit.ts` and inspect its `kind` type. If it's a string literal union, append `| 'lead_consent_pending'`. If it's `string`, no change.

```bash
grep -n "kind:" src/lib/observability/audit.ts | head -10
```

Read the file, adjust the union if needed.

- [ ] **Step 4: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Run existing chat-route unit tests if any**

```bash
pnpm exec vitest run tests/unit/agent
```

Expected: pass. If any test asserts the old `submitLead` write happened in-route, update it to assert the new pending-consent shape (the test should reflect the new contract — adjust by changing the assertion to expect `{ status: 'pending_consent' }`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/agent/tools.ts src/app/api/chat/route.ts src/lib/observability/audit.ts
git commit -m "feat(chat): submitLead tool now returns pending_consent

Server-side submitLead no longer writes to Supabase. It returns a
signed envelope { status, fields, fingerprint } so the client can
render a consent card. The actual write moves to a new endpoint
/api/lead/submit (next task) which verifies the HMAC and runs the
existing submitLead() pipeline."
```

---

## Task 6: Append confirmation rule to `FLOW_BLOCK`

**Files:**
- Modify: `src/lib/agent/prompt.ts:20-34`

- [ ] **Step 1: Replace `FLOW_BLOCK`**

In `src/lib/agent/prompt.ts`, replace the `FLOW_BLOCK` constant with:

```ts
const FLOW_BLOCK = `
[FLOW]
Follow this six-step conversation flow:
1. GREETING: warm welcome.
2. NEEDS ANALYSIS: listen and acknowledge the patient's concerns.
3. VALUE PROPOSITION: briefly explain how Perla's specialists and Dental Holiday package help.
4. LEAD CAPTURE: ask for full name, phone, email — but only after the patient has shown engagement (do not skip ahead).
5. HEALTH CHECK: ask about chronic illnesses or regular medications.
6. CLOSING: thank, confirm, and inform that the consultation team will follow up.
Use the submitLead tool ONLY when:
  (a) all four required fields (name, phone, email, interest) are collected,
  (b) chronic-illness disclosure is captured,
  (c) the patient has explicitly agreed in this conversation to share their details with the clinic.
After calling submitLead, the user will see a confirmation card and must click to confirm before the lead is recorded. Reply with one short sentence asking them to review and confirm what is about to be sent. Do NOT declare the lead saved or move to closing until you receive a follow-up user message confirming submission.
Use the escalateEmergency tool when the patient describes acute pain, swelling, bleeding, or any urgent condition.
`.trim()
```

- [ ] **Step 2: Print the prompt to spot-check**

```bash
pnpm prompt
```

Expected: prints the full system prompt with the new sentence visible inside `[FLOW]`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/agent/prompt.ts
git commit -m "feat(agent): teach the model the consent-card handoff after submitLead"
```

---

## Task 7: TDD `/api/lead/submit/route.ts`

**Files:**
- Create: `src/app/api/lead/submit/route.ts`
- (Optional) Test: existing integration coverage in `tests/unit/leads` or `tests/e2e/lead-flow.spec.ts` may already exercise the underlying `submitLead()`. We add a thin route-level unit test.
- Test: `tests/unit/chat/lead-submit-route.test.ts`

- [ ] **Step 1: Read Next.js 16 route-handler docs first**

```bash
ls node_modules/next/dist/docs/ 2>/dev/null && \
  grep -rln "route handler" node_modules/next/dist/docs/ 2>/dev/null | head -5
```

Open whatever surfaces. Confirm the export shape (`POST(req: Request)`) and the body-parsing idiom for this Next version. The existing routes (`src/app/api/chat/route.ts`, `src/app/api/lead/forget/route.ts`) are valid examples to mirror.

- [ ] **Step 2: Write the failing test**

Create `tests/unit/chat/lead-submit-route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signFields } from '@/lib/leads/consent-hmac'
import { POST } from '@/app/api/lead/submit/route'

vi.mock('@/lib/leads/submit-lead', () => ({
  submitLead: vi.fn(async () => ({ success: true, leadId: 'lead-xyz' })),
}))

const FIELDS = {
  fullName: 'Jane Doe',
  phone: '+15551234567',
  email: 'jane@example.com',
  chronicIllnesses: null,
  interest: 'implants' as const,
  preferredLanguage: 'en' as const,
  consentGiven: true as const,
}

describe('/api/lead/submit', () => {
  beforeEach(() => {
    process.env.LEAD_HMAC_SECRET = 'a'.repeat(64)
  })
  afterEach(() => vi.clearAllMocks())

  it('writes the lead and returns leadId on a valid signed payload', async () => {
    const fingerprint = signFields('conv-1', FIELDS)
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', fields: FIELDS, fingerprint }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { leadId: string }
    expect(body.leadId).toBe('lead-xyz')
  })

  it('rejects 400 when the fingerprint does not match the fields', async () => {
    const fingerprint = signFields('conv-1', FIELDS)
    const tampered = { ...FIELDS, email: 'attacker@evil.com' }
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId: 'conv-1', fields: tampered, fingerprint }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('rejects 400 on malformed JSON', async () => {
    const res = await POST(
      new Request('http://localhost/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{not-json',
      }),
    )
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 3: Run the test to confirm it fails**

```bash
pnpm exec vitest run tests/unit/chat/lead-submit-route.test.ts
```

Expected: FAIL — module not found `@/app/api/lead/submit/route`.

- [ ] **Step 4: Implement the route**

Create `src/app/api/lead/submit/route.ts`:

```ts
import { submitLeadParams } from '@/lib/agent/tools'
import { verifyFields } from '@/lib/leads/consent-hmac'
import { submitLead } from '@/lib/leads/submit-lead'
import { audit } from '@/lib/observability/audit'
import { logger } from '@/lib/observability/logger'

export const maxDuration = 30

const CONSENT_TEXT =
  'I agree to share my contact info and health details with Perla Dental Clinics for the purpose of medical consultation.'

type Body = {
  conversationId: string
  fields: unknown
  fingerprint: string
}

export async function POST(req: Request): Promise<Response> {
  let parsed: Body
  try {
    parsed = (await req.json()) as Body
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (
    typeof parsed?.conversationId !== 'string' ||
    typeof parsed?.fingerprint !== 'string' ||
    !parsed.fields
  ) {
    return Response.json({ error: 'invalid_shape' }, { status: 400 })
  }

  const fieldsResult = submitLeadParams.safeParse(parsed.fields)
  if (!fieldsResult.success) {
    return Response.json({ error: 'invalid_fields' }, { status: 400 })
  }

  if (!verifyFields(parsed.conversationId, fieldsResult.data, parsed.fingerprint)) {
    logger.warn({ conversationId: parsed.conversationId }, 'lead-submit fingerprint mismatch')
    return Response.json({ error: 'fingerprint_mismatch' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const country = req.headers.get('x-vercel-ip-country') ?? undefined

  const result = await submitLead({
    ip,
    conversationId: parsed.conversationId,
    input: fieldsResult.data,
    consentText: CONSENT_TEXT,
    countryCode: country,
    source: 'chat',
  })

  if (!result.success) {
    return Response.json({ error: result.reason }, { status: 502 })
  }

  await audit({
    kind: 'lead_submitted',
    leadId: result.leadId,
    conversationId: parsed.conversationId,
  })
  return Response.json({ leadId: result.leadId })
}
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
pnpm exec vitest run tests/unit/chat/lead-submit-route.test.ts
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/lead/submit/route.ts tests/unit/chat/lead-submit-route.test.ts
git commit -m "feat(api): /api/lead/submit verifies HMAC then writes lead

Receives { conversationId, fields, fingerprint } from the chat consent
card. Verifies the HMAC matches what the model proposed in this same
conversation, then runs the existing submitLead() pipeline (Supabase
+ patient/clinic email)."
```

---

## Task 8: TDD `markdown-lite.tsx`

**Files:**
- Create: `src/components/chat/markdown-lite.tsx`
- Test: `tests/unit/chat/markdown-lite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/chat/markdown-lite.test.ts`:

```ts
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

  it('escapes HTML', () => {
    const out = renderMarkdownLite('Hello <script>alert(1)</script>')
    const html = JSON.stringify(out)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders single-line text without paragraph wrapper crashing', () => {
    const out = renderMarkdownLite('Just a line.')
    expect(JSON.stringify(out)).toContain('Just a line.')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm exec vitest run tests/unit/chat/markdown-lite.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `markdown-lite.tsx`**

Create `src/components/chat/markdown-lite.tsx`:

```tsx
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
  const allListItems = lines.every((l) => /^\s*-\s+/.test(l))
  if (allListItems) {
    return (
      <ul key={key} className="list-disc pl-5 my-2 space-y-1">
        {lines.map((l, i) => (
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
  // Tokenize **bold** and *italic*. Greedy-but-safe: bold first.
  const tokens: { type: 'text' | 'strong' | 'em'; value: string }[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(escaped))) {
    if (m.index > last) tokens.push({ type: 'text', value: escaped.slice(last, m.index) })
    if (m[2] !== undefined) tokens.push({ type: 'strong', value: m[2] })
    else if (m[3] !== undefined) tokens.push({ type: 'em', value: m[3] })
    last = m.index + m[0].length
  }
  if (last < escaped.length) tokens.push({ type: 'text', value: escaped.slice(last) })

  return tokens.map((t, i) => {
    if (t.type === 'strong') return <strong key={i}>{t.value}</strong>
    if (t.type === 'em') return <em key={i}>{t.value}</em>
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
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm exec vitest run tests/unit/chat/markdown-lite.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/markdown-lite.tsx tests/unit/chat/markdown-lite.test.ts
git commit -m "feat(chat): markdown-lite renderer (paragraphs/bold/italic/lists)

~30 LoC; escapes HTML; never uses dangerouslySetInnerHTML; covers
exactly what the agent emits. Saves ~60kb vs react-markdown."
```

---

## Task 9: `use-chat-conversation` hook + `ChatProvider`

**Files:**
- Create: `src/components/chat/use-chat-conversation.ts`
- Create: `src/components/chat/chat-provider.tsx`

- [ ] **Step 1: Implement the hook**

Create `src/components/chat/use-chat-conversation.ts`:

```ts
'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n/config'

const STORAGE_KEY = 'perla.chat.conversationId'

function readOrMintConversationId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = window.sessionStorage.getItem(STORAGE_KEY)
  if (existing) return existing
  const fresh = crypto.randomUUID()
  window.sessionStorage.setItem(STORAGE_KEY, fresh)
  return fresh
}

/**
 * Wraps useChat for the Perla chat surface. Owns:
 *  - sessionStorage-backed conversationId so reload = same convo within tab
 *  - the request-body shape /api/chat expects
 *  - the ttsEnabled flag flowing into voiceEnabled on each turn
 */
export function useChatConversation(args: { locale: Locale; ttsEnabled: boolean }) {
  const [conversationId] = useState<string>(() => readOrMintConversationId())

  const transport = new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages, body }) => {
      const turnCount = (messages as Array<{ role: string }>).filter((m) => m.role === 'user')
        .length
      return {
        body: {
          ...body,
          messages,
          conversationId,
          language: args.locale,
          state: { step: 'greeting', captured: {}, turnCount },
          voiceEnabled: args.ttsEnabled,
        },
      }
    },
  })

  const chat = useChat({ transport } as never)

  // Reset stored conversationId if the user clears it externally.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.sessionStorage.getItem(STORAGE_KEY) !== conversationId) {
      window.sessionStorage.setItem(STORAGE_KEY, conversationId)
    }
  }, [conversationId])

  return { ...chat, conversationId }
}
```

- [ ] **Step 2: Implement the provider**

Create `src/components/chat/chat-provider.tsx`:

```tsx
'use client'

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Locale } from '@/i18n/config'
import { AudioPlayer } from '@/components/ai-elements'
import type { AudioPlayerHandle } from '@/components/ai-elements/audio-player'
import { useChatConversation } from './use-chat-conversation'

type AudioChunk = { index: number; url: string }

type ChatContextValue = {
  locale: Locale
  conversationId: string
  messages: ReturnType<typeof useChatConversation>['messages']
  status: ReturnType<typeof useChatConversation>['status']
  sendMessage: ReturnType<typeof useChatConversation>['sendMessage']
  ttsEnabled: boolean
  setTtsEnabled: (v: boolean) => void
  isLauncherOpen: boolean
  openLauncher: () => void
  closeLauncher: () => void
  /** When true, the floating launcher should hide (inline section is on screen). */
  isInlineVisible: boolean
  setInlineVisible: (v: boolean) => void
  /** Tracks pending lead submissions per toolCallId so cards can swap to success/error. */
  leadCardState: Record<string, LeadCardState>
  setLeadCardState: (id: string, state: LeadCardState) => void
}

export type LeadCardState =
  | { phase: 'pending' }
  | { phase: 'submitting' }
  | { phase: 'success'; leadId: string }
  | { phase: 'error'; message: string }
  | { phase: 'cancelled' }

const ChatContext = createContext<ChatContextValue | null>(null)

const LAUNCHER_OPEN_KEY = 'perla.chat.launcherOpen'

export function ChatProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [isLauncherOpen, setLauncherOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(LAUNCHER_OPEN_KEY) === 'true'
  })
  const [isInlineVisible, setInlineVisible] = useState(false)
  const [leadCardState, setLeadCardStateMap] = useState<Record<string, LeadCardState>>({})

  const { messages, status, sendMessage, conversationId } = useChatConversation({
    locale,
    ttsEnabled,
  })

  const audioPlayerRef = useRef<AudioPlayerHandle>(null)
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([])

  // Surface streaming audio chunks to the player when ttsEnabled.
  useEffect(() => {
    if (!ttsEnabled) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return
    for (const part of lastMsg.parts ?? []) {
      // biome-ignore lint/suspicious/noExplicitAny: AI SDK part shape varies by version
      const p = part as any
      if (p.type === 'data-audio' && p.data?.url && typeof p.data.index === 'number') {
        setAudioChunks((prev) =>
          prev.some((c) => c.index === p.data.index) ? prev : [...prev, { index: p.data.index, url: p.data.url }],
        )
      }
    }
  }, [messages, ttsEnabled])

  function openLauncher() {
    setLauncherOpen(true)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAUNCHER_OPEN_KEY, 'true')
    }
  }
  function closeLauncher() {
    setLauncherOpen(false)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAUNCHER_OPEN_KEY, 'false')
    }
  }
  function setLeadCardState(id: string, state: LeadCardState) {
    setLeadCardStateMap((m) => ({ ...m, [id]: state }))
  }

  const value = useMemo<ChatContextValue>(
    () => ({
      locale,
      conversationId,
      messages,
      status,
      sendMessage,
      ttsEnabled,
      setTtsEnabled,
      isLauncherOpen,
      openLauncher,
      closeLauncher,
      isInlineVisible,
      setInlineVisible,
      leadCardState,
      setLeadCardState,
    }),
    [
      locale,
      conversationId,
      messages,
      status,
      sendMessage,
      ttsEnabled,
      isLauncherOpen,
      isInlineVisible,
      leadCardState,
    ],
  )

  return (
    <ChatContext.Provider value={value}>
      {children}
      <AudioPlayer ref={audioPlayerRef} chunks={audioChunks} />
    </ChatContext.Provider>
  )
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used inside <ChatProvider>')
  return ctx
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0. (May warn that `messages.length` might be undefined — fine; exit 0 is what matters.)

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/use-chat-conversation.ts src/components/chat/chat-provider.tsx
git commit -m "feat(chat): ChatProvider + use-chat-conversation hook

Owns the single useChat instance, sessionStorage-backed
conversationId, TTS toggle, launcher open state, lead-card
per-toolCall state map, and inline-section visibility flag."
```

---

## Task 10: `chat-header.tsx`

**Files:**
- Create: `src/components/chat/chat-header.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { Volume2, VolumeX, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Persona } from '@/components/ai-elements'
import { useChatContext } from './chat-provider'

export function ChatHeader({ showClose = false }: { showClose?: boolean }) {
  const t = useTranslations('chat')
  const { ttsEnabled, setTtsEnabled, status, closeLauncher } = useChatContext()
  const personaState =
    status === 'streaming' ? 'speaking' : status === 'submitted' ? 'thinking' : 'idle'

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5 bg-white/80 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="scale-50 -m-6">
          <Persona state={personaState} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-sm">{t('headerTitle')}</span>
          <span className="text-[10px] uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t('headerOnline')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className="p-2 rounded-full hover:bg-black/5 transition"
          aria-label={ttsEnabled ? t('muteOff') : t('muteOn')}
          title={ttsEnabled ? t('muteOff') : t('muteOn')}
        >
          {ttsEnabled ? (
            <Volume2 className="w-4 h-4 text-primary" />
          ) : (
            <VolumeX className="w-4 h-4 text-text-muted" />
          )}
        </button>
        {showClose && (
          <button
            type="button"
            onClick={closeLauncher}
            className="p-2 rounded-full hover:bg-black/5 transition"
            aria-label={t('closeLauncher')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-header.tsx
git commit -m "feat(chat): ChatHeader (persona, online pulse, TTS toggle, close)"
```

---

## Task 11: `chat-greeting.tsx`

**Files:**
- Create: `src/components/chat/chat-greeting.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useChatContext } from './chat-provider'

const CHIPS = [
  { key: 'chipImplants', emoji: '🦷' },
  { key: 'chipVeneers', emoji: '✨' },
  { key: 'chipDentalHoliday', emoji: '✈️' },
  { key: 'chipDoctors', emoji: '👨‍⚕️' },
] as const

export function ChatGreeting() {
  const t = useTranslations('chat')
  const { sendMessage, status } = useChatContext()
  const disabled = status === 'streaming' || status === 'submitted'

  return (
    <div className="flex flex-col items-center text-center gap-6 py-10 px-2">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm text-text-muted text-sm leading-relaxed"
      >
        {t('greeting')}
      </motion.div>
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map((chip, i) => (
          <motion.button
            key={chip.key}
            type="button"
            disabled={disabled}
            onClick={() => sendMessage({ text: t(chip.key) })}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
            className="px-3 py-2 text-xs font-medium rounded-full bg-white border border-black/10 hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-50"
          >
            <span className="mr-1.5" aria-hidden>
              {chip.emoji}
            </span>
            {t(chip.key)}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-greeting.tsx
git commit -m "feat(chat): ChatGreeting (PDF-verbatim greeting + 4 chips)"
```

---

## Task 12: `chat-composer.tsx`

**Files:**
- Create: `src/components/chat/chat-composer.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import { useChatContext } from './chat-provider'

const MAX_CHARS = 1000

export function ChatComposer() {
  const t = useTranslations('chat')
  const { sendMessage, status } = useChatContext()
  const [value, setValue] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const isStreaming = status === 'streaming' || status === 'submitted'
  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !isStreaming

  function autoGrow() {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = '0px'
    ta.style.height = `${Math.min(ta.scrollHeight, 5 * 24 + 16)}px`
  }

  function submit() {
    if (!canSend) return
    sendMessage({ text: trimmed.slice(0, MAX_CHARS) })
    setValue('')
    requestAnimationFrame(autoGrow)
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="p-3 border-t border-black/5 bg-white/80 backdrop-blur"
    >
      <div className="relative">
        <textarea
          ref={taRef}
          value={value}
          rows={1}
          onChange={(e) => {
            setValue(e.target.value.slice(0, MAX_CHARS))
            autoGrow()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={t('placeholder')}
          aria-label={t('composerLabel')}
          className="w-full resize-none rounded-2xl bg-accent/20 border border-transparent focus:border-primary/30 focus:bg-white transition px-4 py-3 pr-14 text-sm leading-6 outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="absolute right-1.5 top-1.5 w-9 h-9 grid place-items-center rounded-xl bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-light transition"
          aria-label={t('send')}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {value.length >= 800 && (
        <div className="text-right text-[10px] text-text-muted mt-1 tabular-nums">
          {t('charCounter', { count: value.length })}
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-composer.tsx
git commit -m "feat(chat): ChatComposer (auto-grow textarea, Enter/Shift+Enter, char counter)"
```

---

## Task 13: `chat-messages.tsx`

**Files:**
- Create: `src/components/chat/chat-messages.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type ReactNode, useEffect, useRef } from 'react'
import { useChatContext } from './chat-provider'
import { ChatLeadCard } from './chat-lead-card'
import { renderMarkdownLite } from './markdown-lite'

const NEAR_BOTTOM_PX = 150

export function ChatMessages() {
  const t = useTranslations('chat')
  const { messages, status } = useChatContext()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll only when user is near the bottom — don't hijack reading.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const lastMessage = messages[messages.length - 1]
  const showTyping =
    status === 'submitted' || (status === 'streaming' && lastMessage?.role === 'user')

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((m) => (
        // biome-ignore lint/suspicious/noExplicitAny: metadata shape evolves with AI SDK
        ((m as any).metadata?.hidden) ? null : (
        <div key={m.id} className="space-y-2">
          {m.parts?.map((p, i) => renderPart(m.id, m.role, p, i, t))}
        </div>
        )
      ))}
      {showTyping && <TypingIndicator label={t('typingLabel')} />}
    </div>
  )
}

// biome-ignore lint/suspicious/noExplicitAny: AI SDK part shape varies
function renderPart(
  msgId: string,
  role: 'user' | 'assistant' | 'system',
  part: any,
  i: number,
  t: ReturnType<typeof useTranslations<'chat'>>,
): ReactNode {
  if (part.type === 'text') {
    return (
      <Bubble key={`${msgId}-${i}`} role={role}>
        {role === 'assistant' ? renderMarkdownLite(part.text) : part.text}
      </Bubble>
    )
  }
  if (part.type === 'tool-result' || part.type === 'tool-call') {
    if (part.toolName === 'submitLead' && part.output?.status === 'pending_consent') {
      return (
        <ChatLeadCard
          key={`${msgId}-${i}`}
          toolCallId={part.toolCallId}
          fields={part.output.fields}
          fingerprint={part.output.fingerprint}
        />
      )
    }
    if (part.toolName === 'escalateEmergency') {
      return (
        <div
          key={`${msgId}-${i}`}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium"
        >
          <TriangleAlert className="w-4 h-4 shrink-0" />
          <span>{t('escalationBanner')}</span>
        </div>
      )
    }
  }
  return null
}

function Bubble({ role, children }: { role: 'user' | 'assistant' | 'system'; children: ReactNode }) {
  const isUser = role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-white border border-black/5 text-text rounded-bl-md shadow-sm'
        }`}
      >
        {children}
      </div>
    </motion.div>
  )
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label={label}>
      <div className="flex items-center gap-1 bg-white border border-black/5 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-text-muted/60"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-messages.tsx
git commit -m "feat(chat): ChatMessages with bubble styling, markdown, typing dots, escalation banner"
```

---

## Task 14: TDD `chat-lead-card.tsx`

**Files:**
- Create: `src/components/chat/chat-lead-card.tsx`
- Test: `tests/unit/chat/chat-lead-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/chat/chat-lead-card.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import enMessages from '@/../messages/en.json'
import { ChatProvider } from '@/components/chat/chat-provider'
import { ChatLeadCard } from '@/components/chat/chat-lead-card'

const FIELDS = {
  fullName: 'Jane Doe',
  phone: '+15551234567',
  email: 'jane@example.com',
  chronicIllnesses: null,
  interest: 'implants' as const,
  preferredLanguage: 'en' as const,
  consentGiven: true as const,
}

function wrapper(ui: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ChatProvider locale="en">{ui}</ChatProvider>
    </NextIntlClientProvider>
  )
}

describe('<ChatLeadCard>', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ leadId: 'lead-xyz' }), { status: 200 }),
      ),
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the proposed fields and the consent text', () => {
    render(
      wrapper(
        <ChatLeadCard toolCallId="t-1" fields={FIELDS} fingerprint="abc123" />,
      ),
    )
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument()
    expect(screen.getByText(/jane@example\.com/)).toBeInTheDocument()
    expect(
      screen.getByText(/I agree to share my contact info/),
    ).toBeInTheDocument()
  })

  it('POSTs to /api/lead/submit on accept and shows the confirmation copy', async () => {
    render(
      wrapper(
        <ChatLeadCard toolCallId="t-1" fields={FIELDS} fingerprint="abc123" />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: /Send to clinic/i }))
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/lead/submit',
        expect.objectContaining({ method: 'POST' }),
      )
    })
    await waitFor(() =>
      expect(
        screen.getByText(/Saved — our team will be in touch/),
      ).toBeInTheDocument(),
    )
  })

  it('shows error copy on a failed submit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ error: 'failed' }), { status: 502 }),
      ),
    )
    render(
      wrapper(
        <ChatLeadCard toolCallId="t-1" fields={FIELDS} fingerprint="abc123" />,
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: /Send to clinic/i }))
    await waitFor(() =>
      expect(screen.getByText(/Technical issue/)).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm exec vitest run tests/unit/chat/chat-lead-card.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/components/chat/chat-lead-card.tsx`:

```tsx
'use client'

import { Loader2, Mail, Phone, ShieldCheck, Stethoscope, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { SubmitLeadInput } from '@/lib/agent/tools'
import { useChatContext, type LeadCardState } from './chat-provider'

export function ChatLeadCard({
  toolCallId,
  fields,
  fingerprint,
}: {
  toolCallId: string
  fields: SubmitLeadInput
  fingerprint: string
}) {
  const t = useTranslations('chat')
  const tConsent = useTranslations('consent')
  const tErrors = useTranslations('errors')
  const { conversationId, leadCardState, setLeadCardState, sendMessage } = useChatContext()
  const state: LeadCardState = leadCardState[toolCallId] ?? { phase: 'pending' }
  const [localError, setLocalError] = useState<string | null>(null)

  async function onAccept() {
    setLeadCardState(toolCallId, { phase: 'submitting' })
    setLocalError(null)
    try {
      const res = await fetch('/api/lead/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ conversationId, fields, fingerprint }),
      })
      if (!res.ok) {
        setLeadCardState(toolCallId, {
          phase: 'error',
          message: tErrors('leadSubmitFailed'),
        })
        return
      }
      const json = (await res.json()) as { leadId: string }
      setLeadCardState(toolCallId, { phase: 'success', leadId: json.leadId })
      sendMessage({
        text: '[system] Lead confirmed by user — please close the conversation per step 6.',
        // biome-ignore lint/suspicious/noExplicitAny: AI SDK metadata pass-through
        metadata: { hidden: true } as any,
      } as never)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'submit_error')
      setLeadCardState(toolCallId, {
        phase: 'error',
        message: tErrors('leadSubmitFailed'),
      })
    }
  }

  function onCancel() {
    setLeadCardState(toolCallId, { phase: 'cancelled' })
    sendMessage({
      text: '[system] User wants to revise their details — please ask again.',
      // biome-ignore lint/suspicious/noExplicitAny: AI SDK metadata pass-through
      metadata: { hidden: true } as any,
    } as never)
  }

  if (state.phase === 'cancelled') return null

  if (state.phase === 'success') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>{t('leadConfirmed')}</span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-primary/20 shadow-premium p-4 space-y-3">
      <h3 className="font-bold text-sm">{tConsent('leadModalTitle')}</h3>
      <dl className="text-xs space-y-1.5 text-text-muted">
        <Row icon={<User className="w-3.5 h-3.5" />}>{fields.fullName}</Row>
        <Row icon={<Phone className="w-3.5 h-3.5" />}>{fields.phone}</Row>
        <Row icon={<Mail className="w-3.5 h-3.5" />}>{fields.email}</Row>
        <Row icon={<Stethoscope className="w-3.5 h-3.5" />}>
          {fields.interest}
          {fields.chronicIllnesses ? ` · ${fields.chronicIllnesses}` : ''}
        </Row>
      </dl>
      <p className="text-[11px] leading-snug text-text-muted">{tConsent('leadModalAgree')}</p>
      {state.phase === 'error' && (
        <p className="text-[11px] text-red-600">{state.message}</p>
      )}
      {localError && <p className="text-[11px] text-red-600">{localError}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={state.phase === 'submitting'}
          className="px-3 py-1.5 text-xs font-medium border border-black/10 rounded-full hover:bg-black/5 transition disabled:opacity-50"
        >
          {tConsent('leadModalCancel')}
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={state.phase === 'submitting'}
          className="px-3 py-1.5 text-xs font-bold bg-primary text-white rounded-full hover:bg-primary-light transition disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          {state.phase === 'submitting' && <Loader2 className="w-3 h-3 animate-spin" />}
          {tConsent('leadModalSend')}
        </button>
      </div>
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <span>{children}</span>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm exec vitest run tests/unit/chat/chat-lead-card.test.tsx
```

Expected: 3 passed.

(If the test fails because `next-intl`'s `NextIntlClientProvider` rejects an absolute import path, tweak the import in the test to a relative path: `import enMessages from '../../../messages/en.json' assert { type: 'json' }` — vitest with vite's JSON loader handles either form.)

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/chat-lead-card.tsx tests/unit/chat/chat-lead-card.test.tsx
git commit -m "feat(chat): ChatLeadCard with HITL consent gate

Renders fields + consent text, POSTs to /api/lead/submit on accept,
swaps to success/error states, sends a hidden nudge so the model
can do the closing or re-ask. 3 unit tests cover render, success,
failure paths."
```

---

## Task 15: `chat-panel.tsx`

**Files:**
- Create: `src/components/chat/chat-panel.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { ChatComposer } from './chat-composer'
import { ChatGreeting } from './chat-greeting'
import { ChatHeader } from './chat-header'
import { ChatMessages } from './chat-messages'
import { useChatContext } from './chat-provider'

export function ChatPanel({ inline = false }: { inline?: boolean }) {
  const t = useTranslations('chat')
  const { messages } = useChatContext()
  const isEmpty = messages.length === 0

  return (
    <div
      className={`flex flex-col bg-white/90 backdrop-blur ${
        inline
          ? 'h-full rounded-[40px] overflow-hidden border border-white/40 shadow-premium'
          : 'h-full'
      }`}
    >
      <ChatHeader showClose={!inline} />
      {isEmpty ? (
        <div className="flex-1 overflow-y-auto">
          <ChatGreeting />
        </div>
      ) : (
        <ChatMessages />
      )}
      <ChatComposer />
      <div className="px-4 py-2 border-t border-black/5 text-[10px] text-text-muted flex items-center justify-center gap-2">
        <span>🔒</span>
        <span>
          <a href="/privacy" className="underline-offset-2 hover:underline">
            {t('privacyLink')}
          </a>
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "feat(chat): ChatPanel composes header + messages/greeting + composer + footer"
```

---

## Task 16: `chat-launcher.tsx`

**Files:**
- Create: `src/components/chat/chat-launcher.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'
import { useChatContext } from './chat-provider'
import { ChatPanel } from './chat-panel'

export function ChatLauncher() {
  const t = useTranslations('chat')
  const { isLauncherOpen, openLauncher, closeLauncher, isInlineVisible } = useChatContext()

  // Esc closes the panel.
  useEffect(() => {
    if (!isLauncherOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeLauncher()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isLauncherOpen, closeLauncher])

  // Hide the bubble while inline section is on screen — avoid two affordances.
  const hideBubble = isInlineVisible

  return (
    <>
      <AnimatePresence>
        {!isLauncherOpen && !hideBubble && (
          <motion.button
            type="button"
            onClick={openLauncher}
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ delay: 1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-[0_12px_40px_rgba(30,95,116,0.35)] grid place-items-center"
            aria-label={t('openLauncher')}
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLauncherOpen && (
          <>
            {/* Mobile-only backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 sm:hidden"
              onClick={closeLauncher}
            />

            <motion.div
              key="panel"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              style={{ transformOrigin: 'bottom right' }}
              className="fixed z-50 bg-white rounded-[28px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-black/5
                          bottom-4 right-4 left-4 top-4 sm:left-auto sm:top-auto
                          sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[min(640px,calc(100vh-96px))]"
              role="dialog"
              aria-modal="true"
              aria-label={t('headerTitle')}
            >
              <ChatPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-launcher.tsx
git commit -m "feat(chat): ChatLauncher (floating bubble + slide-up panel, Esc to close)

Hides while the inline section is on screen to avoid double affordances.
Mobile = full-bleed sheet with backdrop; desktop = corner panel."
```

---

## Task 17: `inline-chat-section.tsx` + barrel

**Files:**
- Create: `src/components/chat/inline-chat-section.tsx`
- Create: `src/components/chat/index.ts`

- [ ] **Step 1: Implement the inline section**

```tsx
'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { ChatPanel } from './chat-panel'
import { useChatContext } from './chat-provider'

export function InlineChatSection() {
  const t = useTranslations('chat')
  const { setInlineVisible } = useChatContext()
  const sectionRef = useRef<HTMLDivElement>(null)

  // Toggle the launcher-suppression flag when the section enters/leaves viewport.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setInlineVisible(entry.isIntersecting && entry.intersectionRatio >= 0.4),
      { threshold: [0, 0.4, 1] },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [setInlineVisible])

  return (
    <section
      id="chat"
      ref={sectionRef}
      className="py-24 relative overflow-hidden bg-white"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-30 -z-10" />
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              {t('sectionTitle')}
            </h2>
            <p className="text-text-muted">{t('sectionSubtitle')}</p>
          </motion.div>

          <div className="h-[640px] md:h-[640px] max-h-[70vh]">
            <ChatPanel inline />
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Implement the barrel**

Create `src/components/chat/index.ts`:

```ts
export { ChatProvider, useChatContext } from './chat-provider'
export { ChatLauncher } from './chat-launcher'
export { InlineChatSection } from './inline-chat-section'
```

- [ ] **Step 3: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/inline-chat-section.tsx src/components/chat/index.ts
git commit -m "feat(chat): InlineChatSection + barrel export

Mounts <ChatPanel inline /> with the section heading and reports
viewport-visibility into the provider so the launcher can hide."
```

---

## Task 18: Wire into `landing-page.tsx`

**Files:**
- Modify: `src/components/landing-page.tsx` (replace whole file body)

- [ ] **Step 1: Replace the file**

Replace `src/components/landing-page.tsx` with:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { About } from './about'
import { ChatLauncher, ChatProvider, InlineChatSection } from './chat'
import { Contact } from './contact'
import { Hero } from './hero'
import type { Locale } from '@/i18n/config'
import { Navbar } from './navbar'
import { Services } from './services'
import { TrustStrip } from './trust-strip'

export function LandingPage({ locale }: { locale: Locale }) {
  const t = useTranslations('ui')
  return (
    <ChatProvider locale={locale}>
      <div className="bg-white">
        <Navbar locale={locale} />
        <main>
          <Hero title={t('subtitle')} subtitle={t('subcopy')} status="idle" locale={locale} />
          <Services />
          <About />
          <InlineChatSection />
          <Contact />
        </main>
        <TrustStrip />
        <ChatLauncher />
      </div>
    </ChatProvider>
  )
}
```

Notes:
- The `<Hero>`'s old `status` prop was bound to chat status to drive Persona thinking. The Persona inside the Hero now lives on a fixed "idle" state since the chat is no longer mounted there. If the team prefers the persona inside the Hero to react to chat status, we can later expose `status` through `useChatContext()` and pass it in. For this PR, we keep Hero unchanged externally.

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

Expected: clean. Address any stale unused imports remaining in `landing-page.tsx`.

- [ ] **Step 4: Run unit tests**

```bash
pnpm exec vitest run
```

Expected: all green. Existing landing-page smoke test (if any) should still pass since the section heading id `#chat` is preserved.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing-page.tsx
git commit -m "feat(landing): replace embedded chat with <ChatProvider> + section + launcher

The chat is now first-class on every scroll position via the
floating launcher, and the inline 'concierge' section uses the same
ChatPanel component. Pricing-promise copy in the section subtitle
is gone. Voice-only framing in ui.subcopy is replaced."
```

---

## Task 19: Playwright e2e — `tests/e2e/chat.spec.ts`

**Files:**
- Create: `tests/e2e/chat.spec.ts`

- [ ] **Step 1: Write the spec**

```ts
import { expect, test } from '@playwright/test'

test.describe('Landing chat assistant', () => {
  test('inline section subtitle does not promise pricing', async ({ page }) => {
    await page.goto('/en')
    const subtitle = page.locator('section#chat p').first()
    await expect(subtitle).toBeVisible()
    const text = (await subtitle.textContent()) ?? ''
    expect(text).not.toMatch(/pric|cost/i)
  })

  test('floating launcher opens and closes', async ({ page }) => {
    await page.goto('/en')
    // Wait past the 1s delayed entrance.
    const launcher = page.getByRole('button', { name: /Open chat with Perla Concierge/i })
    await expect(launcher).toBeVisible({ timeout: 5000 })
    await launcher.click()
    await expect(page.getByRole('dialog', { name: /Perla Concierge/i })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /Perla Concierge/i })).not.toBeVisible()
  })

  test('clicking a chip sends a message and renders an assistant reply', async ({ page }) => {
    await page.goto('/en')
    // Use the inline section so we don't have to wait for the launcher.
    await page.locator('section#chat').scrollIntoViewIfNeeded()
    const chip = page.getByRole('button', { name: /Tell me about implants/i })
    await chip.click()
    // The user's bubble appears immediately.
    await expect(page.locator('section#chat').getByText(/Tell me about implants/i)).toBeVisible()
    // The assistant should produce SOMETHING within 15s.
    const lastBubble = page.locator('section#chat').locator('[role="log"], div').last()
    await expect(async () => {
      const html = await page.locator('section#chat').innerHTML()
      // assistant bubble has class fragments we set
      expect(html).toMatch(/bg-white border border-black\/5 text-text/)
    }).toPass({ timeout: 15000 })
  })

  test('asking for prices never returns a numeric quote', async ({ page }) => {
    await page.goto('/en')
    await page.locator('section#chat').scrollIntoViewIfNeeded()
    const ta = page.locator('section#chat textarea')
    await ta.fill('How much do veneers cost?')
    await ta.press('Enter')
    // Wait for the assistant to settle.
    await page.waitForTimeout(8000)
    const html = await page.locator('section#chat').innerHTML()
    expect(html).not.toMatch(/[$€£]\s?\d|TRY|\bUSD\b|\bEUR\b/)
    expect(html).not.toMatch(/\b\d+\s*(dollars|euros|liras|TL)\b/i)
  })
})
```

- [ ] **Step 2: Run dev server and the spec**

In one terminal:

```bash
pnpm dev
```

In another:

```bash
pnpm exec playwright test tests/e2e/chat.spec.ts --reporter=list
```

Expected: 4 passed. The two tests that exercise the model require `ANTHROPIC_API_KEY` and `LEAD_HMAC_SECRET` in `.env.local` — if a CI run lacks them, those tests will be skipped per the existing `playwright.config.ts` pattern; if they fail with a missing-env error, mark them with `test.skip` guarded by `process.env.ANTHROPIC_API_KEY`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/chat.spec.ts
git commit -m "test(e2e): cover launcher, chips, no-pricing guardrail, no-cost-numbers regression"
```

---

## Task 20: Promptfoo eval — `chat-flow-consent.yaml`

**Files:**
- Create: `tests/evals/chat-flow-consent.yaml`
- Modify: `tests/evals/promptfoo.config.yaml` (register the new suite)

- [ ] **Step 1: Inspect existing eval shape**

Open `tests/evals/promptfoo.config.yaml` and one of the existing suites (e.g. `tests/evals/emergency-triggers.yaml`) to mirror their assertion idioms.

- [ ] **Step 2: Write the new suite**

Create `tests/evals/chat-flow-consent.yaml`:

```yaml
description: Six-step flow ending in submitLead → consent card → closing.

prompts:
  - file://../../scripts/print-system-prompt.ts:default

providers:
  - id: anthropic:messages:claude-haiku-4-5

defaultTest:
  vars:
    language: en

tests:
  - description: After collecting all fields, model calls submitLead exactly once and asks the user to confirm in a short sentence — does NOT declare the lead saved.
    vars:
      conversation:
        - { role: user, text: "Hi, I'm interested in All-on-4 implants." }
        - { role: assistant, text: "..." }
        - { role: user, text: "I'm Jane Doe, +15551234567, jane@example.com. No chronic illnesses." }
        - { role: assistant, text: "..." }
        - { role: user, text: "Yes, I agree to share my info with the clinic." }
    assert:
      - type: tool-call
        toolName: submitLead
        count: 1
      - type: not-contains
        value: "saved"
      - type: not-contains
        value: "confirmed"
      - type: contains-any
        value: ["confirm", "review", "send"]

  - description: After a user confirmation message, the model produces a closing line.
    vars:
      conversation:
        - { role: user, text: "Hi, implants please." }
        - { role: assistant, text: "..." }
        - { role: user, text: "Jane Doe / +15551234567 / jane@example.com. No illnesses." }
        - { role: assistant, text: "..." }
        - { role: user, text: "Yes please send to the clinic." }
        - { role: assistant, text: "Calling submitLead..." }
        - { role: user, text: "[system] Lead confirmed by user — please close the conversation per step 6." }
    assert:
      - type: contains-any
        value: ["thank", "consultation team", "follow up", "smile", "shortly"]
```

(If the existing config drives the prompt differently — e.g. via a JS exporter — adapt this YAML to match. The point of the suite is two assertions: *exactly one* `submitLead` call + the post-tool reply asks for confirmation, and the post-confirmation reply contains a closing.)

- [ ] **Step 3: Register the suite**

In `tests/evals/promptfoo.config.yaml`, append the new file path to the `tests:` list (or wherever existing suites are referenced).

- [ ] **Step 4: Run all evals**

```bash
pnpm eval
```

Expected: all four pre-existing suites stay green; the new suite passes. If a pre-existing suite fails because of the tool's new return shape, edit its assertions to expect `pending_consent` instead of the old write-result shape.

- [ ] **Step 5: Commit**

```bash
git add tests/evals/chat-flow-consent.yaml tests/evals/promptfoo.config.yaml
git commit -m "test(eval): chat-flow-consent suite covers HITL handoff"
```

---

## Task 21: Full check — lint, typecheck, unit, e2e

**Files:** none

- [ ] **Step 1: Lint**

```bash
pnpm lint
```

Expected: clean.

- [ ] **Step 2: Typecheck**

```bash
pnpm exec tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Run unit tests**

```bash
pnpm test:run
```

Expected: all green. This includes the four new `tests/unit/chat/*.test.ts` files plus all pre-existing tests.

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: success. Watch for new client-component warnings; fix any `'use client'` directives I missed.

- [ ] **Step 5: Run e2e**

```bash
pnpm exec playwright test --reporter=list
```

Expected: all green. (This includes pre-existing `lead-flow.spec.ts` and `smoke.spec.ts`.)

- [ ] **Step 6: Commit any small fixes**

If steps 1-5 surfaced fixes (unused imports, missing `'use client'`, formatting), stage and commit:

```bash
git add -A
git commit -m "chore(chat): post-integration lint/typecheck/test cleanup"
```

---

## Task 22: Manual verification

**Files:** none — this is a checklist run against the dev server.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

Open `http://localhost:3000/en`.

- [ ] **Step 2: Verify the launcher behavior**

- Wait ~1.5s after page load → bubble appears bottom-right.
- Scroll down to the inline `#chat` section → bubble fades out.
- Scroll back up → bubble reappears.
- Click the bubble → panel slides up. Esc closes it.

- [ ] **Step 3: Verify shared state across surfaces**

- Send a message from the launcher panel.
- Close the launcher, scroll to inline section → the same conversation is there.

- [ ] **Step 4: Verify locale parity**

- Repeat for `/tr`, `/ru`, `/de`. Greeting, chips, header label, placeholder, footer privacy link all in the active locale.

- [ ] **Step 5: Verify the lead flow end-to-end**

- Walk the model to the lead-capture step (use a real-looking name/phone/email).
- Confirm consent in conversation.
- Consent card renders inline. Click "Send to clinic".
- Loading spinner appears, then green success state with `chat.leadConfirmed`.
- Verify a row appears in Supabase `leads` and that the patient + clinic emails arrive (Resend dashboard).
- Subsequent assistant message contains a closing per PDF step 6.

- [ ] **Step 6: Verify guardrail UX**

- Ask "How much do veneers cost?" — assistant emits the canonical refusal copy with no numbers.
- Ask "I have severe swelling and bleeding" — `escalateEmergency` fires and the red banner is visible above the assistant's reply.
- Ask in TR: "Fiyat nedir?" — same refusal in Turkish.

- [ ] **Step 7: Verify TTS toggle**

- Toggle the volume icon on. Send "Tell me about implants." Audio plays.
- Toggle off. Send another message. No audio.

- [ ] **Step 8: Mobile sanity**

- Resize browser to <640px. Open the launcher → it covers the screen as a sheet with a backdrop. Backdrop click closes it.

- [ ] **Step 9: Final commit (only if any small fixes were needed)**

```bash
git add -A
git commit -m "chore(chat): final manual-verification fixes" --allow-empty
```

(Use `--allow-empty` only if you want a marker commit. Otherwise skip.)

- [ ] **Step 10: Push the branch**

(Only if the user asks; per repo conventions, do not push without explicit permission.)

---

## Self-review checklist

Use this *after* the plan is implemented to confirm spec coverage:

- [ ] Floating launcher implemented (Task 16).
- [ ] Inline section redesigned (Task 17).
- [ ] Single shared `<ChatPanel>` with sub-components (Tasks 10–15).
- [ ] HITL consent gate (Tasks 5, 7, 14).
- [ ] HMAC signing of model-proposed fields (Task 2).
- [ ] Escalation banner UI (Task 13).
- [ ] TTS off by default + toggle (Task 9 + 10).
- [ ] PDF-verbatim greeting + chips (Task 11).
- [ ] All four locales updated (Tasks 3–4).
- [ ] No "pricing" promise in inline subtitle (Tasks 3 + 18).
- [ ] No "microphone above" copy (Task 18).
- [ ] Auto-scroll wired (Task 13).
- [ ] Typing indicator (Task 13).
- [ ] Markdown rendering with HTML escaping (Task 8).
- [ ] Error UI for `/api/chat` 503 — *gap*: verify in Task 22; if missing surface `refusals.maintenance` in `ChatMessages` when fetch errors. If a gap is found, add `<ErrorBanner>` to `chat-messages.tsx`.
- [ ] sessionStorage `conversationId` (Task 9).
- [ ] Existing four promptfoo suites stay green (Task 20).
- [ ] New `chat-flow-consent` suite (Task 20).

If any item is uncovered after implementation, add a follow-up task before claiming done.
