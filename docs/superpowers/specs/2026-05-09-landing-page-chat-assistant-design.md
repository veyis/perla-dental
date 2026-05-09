# Landing-page chat assistant — design spec

**Date:** 2026-05-09
**Branch:** feat/initial-implementation
**Source of truth for clinic content:** `perla-dental-clinic-ai-agent.pdf` (committed at repo root)

## 1. Goal

Add a premium, production-grade chat assistant to the Perla Dental Clinics landing page. The assistant must:

- Act as the clinic's digital front desk per the PDF persona — professional, empathetic, never a medical authority.
- Answer questions about treatments, doctors, the Dental Holiday package, and clinic logistics using the existing `lib/agent/knowledge.ts`.
- Follow the PDF's six-step flow (Greeting → Needs Analysis → Value Proposition → Lead Capture → Health Check → Closing).
- **Never** discuss pricing or financial estimates.
- Capture leads (name / phone / email + chronic-illness disclosure) into the existing Supabase pipeline, gated by an explicit user consent click.
- Escalate emergencies via the existing `escalateEmergency` tool with a visible UI banner.
- Render in all four supported locales (en / tr / ru / de) with translated greeting, chips, and consent UI.

## 2. Non-goals

- No new AI model — keep `claude-haiku-4-5` via `/api/chat`.
- No re-architecting of the lead pipeline (`lib/leads/*` stays).
- No changes to the ElevenLabs voice agent in the hero.
- No conversation history persisted in Supabase (sessionStorage only for `conversationId`).
- No avatar/illustration assets beyond what already exists.

## 3. Current state and gaps

A backend chat is already wired (`/api/chat`, `lib/agent/prompt.ts`, `lib/agent/tools.ts`). An inline chat block exists in `src/components/landing-page.tsx` but has the following defects:

1. All UI copy is hard-coded English; bypasses `next-intl`.
2. Section subtitle promises "pricing" answers — directly contradicts the agent's `[GUARDRAILS]` block.
3. Empty-state copy refers to "the microphone above" which is not in this component.
4. No streaming/typing indicator; `scrollRef` declared but never used (no auto-scroll).
5. No suggested-prompt chips, no proactive greeting (PDF specifies one verbatim).
6. No consent confirmation UI — `src/components/consent-modal.tsx` and the `consent.lead*` i18n keys exist but are never mounted; the model can call `submitLead` without explicit user click-through.
7. No tool-call rendering: `submitLead` success is invisible to the user; `escalateEmergency` produces only an audit log.
8. No error UI for 503 / network failure.
9. No markdown rendering — bullets, bold, paragraphs from the model render as raw text.
10. `voiceEnabled: true` is hard-coded; chat always synthesizes TTS even though the hero ElevenLabs voice is the intended voice channel — wastes ElevenLabs credits and overlaps audio.
11. No persistent floating launcher; the assistant is only reachable by scrolling to the inline section.

## 4. Architecture

### 4.1 Surfaces

Two surfaces share a single `<ChatPanel>`:

- **Inline section** — replaces the existing `<section id="chat">` in `landing-page.tsx`.
- **Floating launcher** — bottom-right bubble (z-50), hidden when the inline section is in viewport (IntersectionObserver) so users never see two chat affordances at once.

Both surfaces read from a single `<ChatProvider>` context and operate on the same conversation. The launcher panel is `position: fixed` 380×640 on desktop, full-width 92vh bottom sheet on mobile.

### 4.2 Components (all under `src/components/chat/`)

```
chat-provider.tsx         React context: messages, status, lang, captured-fields
                          inference, tts toggle, sendMessage, lead state machine,
                          launcher open/close. Owns the single useChat() instance.
chat-launcher.tsx         Floating bubble + slide-up/bottom-sheet panel.
chat-panel.tsx            Layout shell. Composes header / greeting / messages / composer.
chat-header.tsx           Persona dot, "Perla Concierge" label, online pulse, mute toggle,
                          close X (only when in launcher).
chat-greeting.tsx         Empty-state greeting + four suggested-prompt chips.
chat-messages.tsx         Auto-scrolling list, role-styled bubbles, typing indicator,
                          markdown rendering, escalation banner inline.
chat-lead-card.tsx        Inline consent card (reuses look & i18n strings of consent-modal).
chat-composer.tsx         Auto-grow textarea, Enter sends, Shift+Enter newline,
                          char counter at 800+, send disabled while streaming.
inline-chat-section.tsx   Section wrapper with heading + glass styling. Mounts <ChatPanel inline />.
markdown-lite.tsx         ~30-LoC paragraph/bold/list renderer with HTML escaping.
use-chat-conversation.ts  Wraps useChat from @ai-sdk/react. Owns sessionStorage-backed
                          conversationId. Exposes derived helpers (isStreaming, lastTurn).
index.ts                  Barrel export.
```

**Why this split:** each file has one responsibility and a small, testable surface. The provider is the only stateful piece; everything else is presentational and trivial to test in isolation.

### 4.3 Mounting

`landing-page.tsx`:

```tsx
<ChatProvider locale={locale}>
  <Navbar … />
  <main>
    <Hero … />
    <Services />
    <About />
    <InlineChatSection />   {/* replaces the existing chat block */}
    <Contact />
  </main>
  <AudioPlayer … />
  <TrustStrip />
  <ChatLauncher />          {/* fixed-position; hides while inline section in viewport */}
</ChatProvider>
```

### 4.4 Data flow

1. User opens panel (launcher) or lands in inline section.
2. Empty state renders the PDF-verbatim greeting and four chips. No API call yet.
3. User sends a message (typed or chip-clicked).
4. `useChat` POSTs to `/api/chat` with `{ messages, conversationId, language: locale, state: { step: 'greeting', captured: {}, turnCount }, voiceEnabled: ttsToggle }`.
5. Server streams text (and TTS audio if `voiceEnabled`).
6. Assistant message renders incrementally with markdown.
7. When the model decides it has all four required fields, it calls `submitLead`.

### 4.5 Lead-capture human-in-the-loop

Current behavior: model calls `submitLead`, server writes the row immediately. This bypasses explicit user consent and is replaced.

New behavior:

1. **Server `submitLead` tool** — replace the in-line `execute` that writes the row with one that validates fields, computes an HMAC fingerprint, and returns `{ status: 'pending_consent', fields, fingerprint }`. **No row is written here.**
2. **Model** — receives that result. The system prompt is updated: *"After calling submitLead the user will see a confirmation card and must click to confirm. Reply with one short sentence asking the user to confirm what they're about to send."*
3. **Client** — `<ChatMessages>` detects a tool result with `status: 'pending_consent'` and renders `<ChatLeadCard>` inline, above the assistant's confirming sentence. The card shows the fields + the i18n consent text + Send/Cancel.
4. **User clicks "Send to clinic"** — client `POST /api/lead/submit` with `{ conversationId, fields, fingerprint, locale }`. New endpoint verifies the HMAC, calls existing `submitLead({ ip, conversationId, input, consentText, countryCode, source: 'chat' })` from `lib/leads/submit-lead.ts`, returns `{ leadId }`.
5. **Client** — replaces the card with a success state: "Saved — our team will be in touch within one business day." Then sends a follow-up turn to the model with a *system-flavored* hidden user message (`"[system] Lead confirmed by user — please close the conversation per step 6."`), but renders only the success card in the visible message stream — the synthetic message does **not** appear as a user bubble. Implementation: include the hidden message in the `messages` array passed to `useChat`'s `sendMessage` but tag its part with a `metadata.hidden = true` flag the renderer skips.
6. **User clicks "Cancel"** — client sends an analogous hidden nudge `"[system] User wants to revise their details — please ask again."`; lead card unmounts. Cancel does not appear as a user bubble either.

The HMAC keeps the lead pipeline trustworthy: only fields the model proposed in this conversation can be submitted, and only once.

### 4.6 Escalation

When `escalateEmergency` returns, the assistant message that follows is annotated by inserting a `<EscalationBanner>` directly above its bubble (red-ringed, ⚠️ icon, copy from `refusals.emergency`). No backend changes — this is purely a client-side annotation triggered by the tool result.

### 4.7 Voice

TTS in chat is **off by default**. The `<ChatHeader>` mute toggle flips a `ttsEnabled` flag in the provider. The flag flows into the `voiceEnabled` field of the request body, gating the existing parallel-TTS pipeline in `route.ts`. ElevenLabs hero voice is unchanged.

### 4.8 Persistence

- `conversationId`: sessionStorage. Survives soft navigation, resets per browser session.
- Messages: in-memory only. Reload starts a fresh conversation.
- Launcher open/closed: sessionStorage.

## 5. UI specification

### 5.1 Floating launcher

- Bottom-right, `position: fixed`, `bottom: 24px`, `right: 24px`, `z-50`, 56×56 round button, soft shadow, primary color.
- Icon: `MessageCircle` (lucide).
- Hidden via opacity + pointer-events:none when the inline section's IntersectionObserver reports ≥40% visibility.
- `aria-label` from `chat.openLauncher` / `chat.closeLauncher`.
- Subtle scale-in entrance after 1s page load — does not steal focus from hero CTAs.
- On click: panel slide-up from bottom-right with a framer-motion spring (`damping: 20, stiffness: 300`).
- Panel size: 380px × min(640px, calc(100vh - 100px)) on desktop; mobile (<640px) becomes a 92vh full-width bottom sheet with a draggable handle.
- Esc closes; first focus moves to the composer; focus is trapped inside the panel while open.

### 5.2 Inline section

- Replaces the current `<section id="chat">` block.
- Heading: `chat.sectionTitle` ("Talk to Our Concierge").
- Subtitle: `chat.sectionSubtitle` — explicitly **omits** any pricing language. Wording: *"Ask about treatments, our specialists, and how your visit will unfold."*
- Glass styling matches the rest of the landing page (`glass`, `rounded-[40px]`, `shadow-premium`).
- Fixed height: 640px desktop, 70vh mobile.
- Heading and `<ChatPanel>` both fade up on scroll-in (framer-motion `whileInView`).

### 5.3 ChatPanel internals

**Header (40px tall):** small `<Persona>` dot reflecting status, label "Perla Concierge", green online pulse, `Volume2`/`VolumeX` mute toggle, `X` close (only when rendered inside the launcher).

**Greeting (when `messages.length === 0`):**

- PDF-verbatim greeting, translated. EN baseline: *"Welcome to Perla Dental Clinics, I am the clinic's digital assistant. How may I help you today?"*
- Four chips below:
  - 🦷 Implants
  - ✨ Veneers & Smile Makeover
  - ✈️ Dental Holiday package
  - 👨‍⚕️ Meet our doctors
- Click → sends a corresponding message in the active locale (e.g. "Tell me about your implants treatments." in EN).
- Chips fade-and-slide in with a 60ms stagger.

**Messages list:**

- Auto-scrolls to bottom on new content, **only** when user is within 150px of the bottom (avoids hijacking scroll while reviewing earlier messages).
- Assistant content renders through `markdown-lite.tsx` (paragraphs, **bold**, `*italic*`, unordered lists, line breaks). HTML is escaped. User messages stay plain.
- Typing indicator (three pulsing dots in an assistant-styled bubble) when `status === 'submitted'` or (`status === 'streaming'` and the most recent message is from the user — i.e., assistant hasn't streamed any text yet).
- Inline elements interleaved as message parts:
  - Lead consent card on `submitLead` tool result with `status: 'pending_consent'`.
  - Escalation banner on `escalateEmergency` tool result.

**Composer:**

- Auto-grow textarea, 1 row min, 5 rows max.
- `Enter` sends, `Shift+Enter` newline.
- Char counter visible at 800+.
- Send button disabled when empty or `status === 'streaming' || status === 'submitted'`.
- Placeholder from `chat.placeholder`.
- `aria-label` from `chat.composerLabel`.

**Footer micro-trust strip:** tiny "🔒 Encrypted · Specialists follow up · [Privacy](/privacy)" line.

### 5.4 Lead consent card (`<ChatLeadCard>`)

Visually consistent with the existing `<ConsentModal>` but rendered inline in the conversation rather than as an overlay. Lists the fields (👤 Name, 📞 Phone, ✉️ Email, 💬 Interest, 🩺 Chronic illnesses if any), the consent text from `consent.leadModalAgree`, and Send/Cancel buttons. Spinner on Send; success or failure state replaces the card.

### 5.5 Error states

- Network/`/api/chat` 503: red-ringed banner with `refusals.maintenance` copy plus tel: link to the clinic.
- Network on `/api/lead/submit` failure: card stays visible; small inline error using `errors.leadSubmitFailed`; user can retry.

## 6. i18n keys (added to all four locale files)

```
chat.headerTitle              "Perla Concierge"
chat.headerOnline             "Online"
chat.sectionTitle             "Talk to Our Concierge"
chat.sectionSubtitle          "Ask about treatments, our specialists, and how your visit will unfold."
chat.greeting                 (PDF wording)
chat.chipImplants             "Tell me about implants"
chat.chipVeneers              "Veneers & smile makeover"
chat.chipDentalHoliday        "How does the Dental Holiday work?"
chat.chipDoctors              "Tell me about your doctors"
chat.placeholder              "Type your message…"
chat.composerLabel            "Message Perla Concierge"
chat.send                     "Send"
chat.muteOn                   "Voice replies on"
chat.muteOff                  "Voice replies off"
chat.openLauncher             "Open chat with Perla Concierge"
chat.closeLauncher            "Close chat"
chat.charCounter              "{count} / 1000"
chat.privacyLink              "Privacy"
chat.escalationBanner         "Your case has been forwarded to our surgical team."
chat.leadConfirmTitle         (reuses consent.leadModalTitle)
chat.leadConfirmAccept        (reuses consent.leadModalSend)
chat.leadConfirmCancel        (reuses consent.leadModalCancel)
chat.leadConfirmed            "Saved — our team will be in touch within one business day."
chat.leadFailed               (reuses errors.leadSubmitFailed)
chat.typingLabel              "Perla Concierge is typing"
```

All strings translated for `en`, `tr`, `ru`, `de` in this PR. Greeting follows PDF wording verbatim where idiom permits.

## 7. Server-side changes

### 7.1 `src/app/api/chat/route.ts`

- `submitLead` tool's `execute` no longer calls `submitLead()`. New return shape:
  ```ts
  {
    status: 'pending_consent',
    fields: SubmitLeadInput,
    fingerprint: string,   // HMAC-SHA256(conversationId + canonicalJson(fields), LEAD_HMAC_SECRET)
  }
  ```
- Audit `lead_consent_pending` event remains.
- The `escalateEmergency` tool is unchanged.

### 7.2 `src/app/api/lead/submit/route.ts` (new)

- POST. Body: `{ conversationId: string, fields: SubmitLeadInput, fingerprint: string, locale: Locale }`.
- Verifies HMAC against `LEAD_HMAC_SECRET`. Mismatch → 400.
- Calls existing `submitLead({ ip, conversationId, input: fields, consentText: CONSENT_TEXT, countryCode, source: 'chat' })`.
- Returns `{ leadId }` or `{ error: 'rate_limited' | 'failed' }`.
- Wired into existing `audit({ kind: 'lead_submitted', … })`.

### 7.3 `src/lib/agent/prompt.ts`

Append to `FLOW_BLOCK`:

> After calling submitLead, the user will see a confirmation card and must click to confirm before the lead is recorded. Reply with one short sentence asking them to review and confirm what's about to be sent. Do not assume the lead is sent until you receive a follow-up user message confirming submission.

### 7.4 `src/lib/leads/consent-hmac.ts` (new)

- `signFields(conversationId, fields): string`
- `verifyFields(conversationId, fields, fingerprint): boolean`
- Pure functions; uses `node:crypto` `createHmac('sha256', secret)`.
- Secret read via `requireEnv('LEAD_HMAC_SECRET')` — added to `lib/env.ts` and DEPLOYMENT.md.

## 8. Files changed

**New (15):**
- `src/components/chat/chat-provider.tsx`
- `src/components/chat/chat-launcher.tsx`
- `src/components/chat/chat-panel.tsx`
- `src/components/chat/chat-header.tsx`
- `src/components/chat/chat-greeting.tsx`
- `src/components/chat/chat-messages.tsx`
- `src/components/chat/chat-lead-card.tsx`
- `src/components/chat/chat-composer.tsx`
- `src/components/chat/inline-chat-section.tsx`
- `src/components/chat/markdown-lite.tsx`
- `src/components/chat/use-chat-conversation.ts`
- `src/components/chat/index.ts`
- `src/app/api/lead/submit/route.ts`
- `src/lib/leads/consent-hmac.ts`
- `tests/unit/markdown-lite.test.ts`, `tests/unit/consent-hmac.test.ts`, `tests/unit/chat-lead-card.test.tsx`, `tests/e2e/chat.spec.ts`

**Modified (7):**
- `src/components/landing-page.tsx` — strip the embedded chat block; mount `<ChatProvider>` + `<InlineChatSection>` + `<ChatLauncher>`.
- `src/app/api/chat/route.ts` — `submitLead` tool returns `pending_consent`, no row write.
- `src/lib/agent/prompt.ts` — confirmation rule appended to `FLOW_BLOCK`.
- `src/lib/env.ts` — add `LEAD_HMAC_SECRET` to required env list (or optional if already covered).
- `messages/{en,tr,ru,de}.json` — add `chat.*` namespace.
- `DEPLOYMENT.md` — note new env var and the `/api/lead/submit` endpoint.

## 9. Testing

### 9.1 Unit (vitest)

- `markdown-lite.test.ts` — bold/italic/lists/paragraphs render correctly; HTML is escaped (`<script>` → `&lt;script&gt;`).
- `consent-hmac.test.ts` — sign/verify round-trips; tampered fields fail; conversationId mismatch fails.
- `chat-lead-card.test.tsx` — renders fields; clicking accept POSTs to `/api/lead/submit`; success state replaces card; failure state shows retry.

### 9.2 E2E (Playwright)

- Inline section heading exists; subtitle does **not** contain the substring "pricing" or "cost" (regression for the existing bug).
- Floating launcher button exists; clicking it opens the panel; Esc closes it.
- IntersectionObserver behavior: launcher hides when inline section is scrolled into view.
- Send "Tell me about implants" → assistant streams a non-empty reply within 5s.
- Click a chip → message appears in user role and assistant streams.
- Send "How much do veneers cost?" → response **must not match** /\$|€|£|TRY|EUR|USD|\d+\s*(dollars|euros|liras|TL)/i. Sanity check on the existing guardrail under the new UI.
- Inline + launcher show the same message after send (shared state).

### 9.3 Promptfoo evals

- Run `pnpm eval` before and after the server changes and verify the existing four suites (`diagnosis-fishing`, `emergency-triggers`, `off-topic-redirect`, `price-extraction`) stay green. Their assertions are about model behavior (refusal copy, escalation tool calls), not about `submitLead`'s return shape, so no eval edits are anticipated — but verify, don't assume.
- New `chat-flow-consent.yaml` (4 cases) walks: greeting → engagement → lead-capture → confirm → closing. Asserts (a) `submitLead` is called exactly once, (b) the model's reply *immediately after* submitLead asks the user to confirm rather than declaring the lead saved, (c) after the synthetic confirmed nudge, the model produces a closing line consistent with PDF step 6.

### 9.4 Manual verification checklist

Before claiming done, run dev server and verify in Chrome and on a phone:
- Launcher appears 1s after load, hides over the inline section, reappears past it.
- Sending from launcher and inline shows the same conversation.
- Greeting renders in TR / RU / DE when locale is switched.
- Mute toggle: with TTS on, replies are spoken; off, silent.
- Lead capture: walk through to consent card; click Send; success message shows; new row visible in Supabase `leads` table; clinic email and patient email both arrive.
- Emergency: send "I have severe swelling and bleeding" — assistant escalates and the red banner appears above its reply.
- Try "What's the price for veneers?" — assistant gives the canonical refusal copy, no numbers.

## 10. Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Model emits `submitLead` before user actually consented in conversation | New system-prompt rule + the consent card itself is the legal gate; even if the model jumps the gun the row isn't written until the user clicks Send. |
| HMAC secret missing in env | `requireEnv` throws at boot in non-dev; e2e test exercises the path. |
| Two open surfaces (inline + launcher) confuse users | IntersectionObserver hides the launcher while the inline section is on screen. |
| Cost from accidental TTS in chat | TTS off by default; toggle in header. |
| Markdown XSS via assistant output | `markdown-lite` escapes HTML entities before rendering; never uses `dangerouslySetInnerHTML`. |
| AI SDK 6 / Next.js 16 API drift between training data and reality | Per `AGENTS.md`, read `node_modules/next/dist/docs/` and the AI SDK 6 docs in node_modules before writing each piece. |

## 11. Out-of-scope follow-ups (do not implement here)

- Persist messages to Supabase for cross-device continuity.
- Rich attachments (image upload of teeth photos for the consultants).
- Calendar booking integration.
- Analytics events on chip clicks and lead drop-off.
- A/B test of greeting wording.

---
