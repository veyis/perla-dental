# Perla Dental Clinic AI Agent — Design Specification

**Date:** 2026-05-08
**Status:** Draft, pending user approval
**Source brief:** `perla-dental-clinic-ai-agent.pdf` (clinic-supplied behavioral spec)

---

## 1. Goal & Success Criteria

Build a standalone landing page where Perla Dental Clinics' AI assistant is the primary experience. Visitors interact via text chat or push-to-talk voice, learn about treatments and the "Dental Holiday" concept, and convert to qualified leads (name, phone, email, chronic-illness disclosure) written to the clinic's CRM destination.

The clinic's three hard constraints from the brief:
1. **Never quote prices** or financial estimates.
2. **Never diagnose** medical conditions.
3. **Escalate emergencies** to the clinic's surgical department.

### Success criteria

- Lead-capture conversion rate ≥ 8% of started conversations.
- P95 first-phoneme latency (voice) ≤ 1.5 seconds.
- Zero price-quote leaks reaching patients per month (verified via audit log review).
- 100% of detected emergency descriptions trigger escalation.
- Operational cost ≤ $0.04 per blended conversation.
- WCAG 2.2 AA accessibility on the landing page.

---

## 2. Background

### 2.1. The brief, distilled

The PDF defines a **conversational lead-generation funnel** disguised as an assistant. Treatment Q&A, doctor bios, and the Dental Holiday narrative all serve one purpose: build enough trust for the lead-capture moment.

Six-step conversation flow from the brief:
1. Greeting
2. Needs analysis
3. Value proposition
4. Lead capture (name, phone, email)
5. Health check (chronic illnesses, medications)
6. Closing

Knowledge base from the brief: clinic facts (Antalya location, hours, credentials), four treatment families (Implants, All-on-4, All-on-6, Smile Makeover with E-max / Zirconium / Laminate / Composite variants), seven medical staff bios, and the Dental Holiday package details.

### 2.2. Audience

International dental-tourism patients reaching Antalya. Primary inbound markets: UK, Germany, Russia/CIS, Netherlands, Scandinavia, plus domestic Turkish patients. Multilingual support for English, Turkish, Russian, German is a launch requirement.

### 2.3. Regulatory context

Lead data includes name, phone, email, **chronic-illness disclosure** (special-category health data). GDPR Article 9(2)(a) and Turkish KVKK both require explicit consent before storage. Privacy policy, sub-processor list, and data-subject-rights endpoint are mandatory.

---

## 3. Architecture

```
┌─────────── Browser (Next.js 16 client, AI Elements) ──────────┐
│                                                                │
│   Landing hero  ─  Persona orb  ─  Conversation transcript    │
│       │                  │                  │                  │
│       │           Mic button (PTT)    Text input              │
│       │                  │                  │                  │
│       │                  │            useChat (transport:     │
│       │                  │             /api/chat)             │
│       │           MediaRecorder                                │
│       │           + Silero VAD                                 │
│       │                  │                                     │
│       │           POST /api/voice/stt (audio blob)             │
│       │                  │                                     │
│       │                  ▼                                     │
│       │           transcript text → useChat.sendMessage        │
│       │                                                        │
│       │           AudioPlayer ← onData(transient: 'audio')     │
└───────┼────────────────────────────────────────────────────────┘
        │
        ▼  (Vercel Fluid Compute, Node runtime, fra1 region)
┌────────────────────────────────────────────────────────────────┐
│  /api/voice/stt                                                 │
│    Deepgram Nova-3 Multilingual REST → text + language          │
│                                                                  │
│  /api/chat (UIMessageStream)                                    │
│    streamText({                                                  │
│      model: anthropic('claude-haiku-4-5'),                      │
│      system: buildPrompt(state, language),     ← cached 1h      │
│      tools: { submitLead, escalateEmergency },                  │
│      messages: convertToModelMessages(messages),                │
│    })                                                            │
│      ↓ on each sentence boundary                                │
│    ElevenLabs Flash v2.5 → MP3 → Supabase Storage (perla-tts)   │
│      ↓                                                           │
│    writer.write({ type: 'data-audio', transient: true,          │
│                   data: { url } })                              │
│                                                                  │
│  Tools execute server-side:                                     │
│    submitLead       → Supabase perla.leads insert + Resend email│
│    escalateEmergency → URGENT-prefixed Resend email             │
└────────────────────────────────────────────────────────────────┘
```

**Boundary contract:** `lib/agent/` knows nothing about HTTP, Next.js, or the browser. It is a pure brain — system prompt builder, tool definitions, knowledge base, language selection. Tomorrow's phone channel reuses it verbatim.

---

## 4. Tech Stack

All versions verified live as of 2026-05-08.

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js | 16.2.6 |
| Runtime | Node | 22 LTS |
| Hosting | Vercel Pro, Fluid Compute, fra1 | — |
| AI SDK | Vercel AI SDK | `ai@6.0.176` |
| LLM | Anthropic Claude Haiku 4.5 | `claude-haiku-4-5` |
| LLM SDK | `@ai-sdk/anthropic` | 3.0.74 |
| STT | Deepgram Nova-3 Multilingual (REST prerecorded) | — |
| TTS | ElevenLabs Flash v2.5 (streaming) | — |
| Audio storage | Supabase Storage (`perla-tts`) | — |
| VAD | `@ricky0123/vad-react` | 0.0.30 |
| Chat UI | Vercel AI Elements (`Persona`, `AudioPlayer`, `Conversation`, `Message`) | latest registry |
| UI primitives | shadcn/ui + Tailwind CSS | latest / 4.2 |
| i18n | next-intl | latest |
| Validation | Zod | 4.4.3 |
| Lead sink | Supabase Postgres (`@supabase/supabase-js`) + Resend | latest |
| Linter | Biome | latest |
| Tests | Vitest + Playwright + Promptfoo | latest |

**Single happy path per layer.** No proactive multi-provider fallbacks. The AI SDK abstraction is retained because it costs zero extra effort and makes a future provider swap a one-line change.

### 4.1. External accounts to procure

1. Anthropic API
2. Deepgram
3. ElevenLabs
4. Supabase (project hosts `perla` schema for leads + audit, `perla-tts` Storage bucket, `touch_rate_limit` RPC for IP rate limiting)
5. Resend (with verified domain)
6. Vercel Pro

---

## 5. Conversation Engine

### 5.1. System prompt structure

Each request constructs a prompt with these blocks, in order:

1. `[ROLE]` — verbatim from brief §1 (persona, tone, primary goal).
2. `[KNOWLEDGE]` — clinic info, treatments, doctors, Dental Holiday.
3. `[FLOW]` — six-step conversation flow from brief §5.
4. `[GUARDRAILS]` — hard rules from brief §6 plus canonical refusals in EN/TR/RU/DE plus prompt-injection defenses.
5. `[STATE]` — JSON of fields collected so far, current step (1-6), turn count.
6. `[LANGUAGE]` — `Respond ONLY in {language}. Tool arguments stay in English.`

Blocks 1–4 are **static** and wrapped in `cache_control: { type: 'ephemeral', ttl: '1h' }`. The 1-hour TTL must be set explicitly — Anthropic dropped the default to 5 minutes on 2026-03-06. Blocks 5–6 are dynamic and live outside the cache.

### 5.2. Language handling

- **Detection:** `franc` library on first user message; fallback to a one-shot Haiku detection only when confidence < 0.7.
- **Switcher:** UI flag dropdown overrides detection; persisted in localStorage and `?lang=` query parameter.
- **Mid-conversation switch** flushes the language slot in the next prompt; prior transcript stays in original language (no retroactive translation).
- **UI chrome** routes through `next-intl` message files in `messages/{en,tr,ru,de}.json`.

### 5.3. Tools (Zod 4 schemas)

```ts
submitLead: {
  description: "Save patient contact info to the clinic CRM.
                Call ONLY after collecting all required fields
                AND obtaining explicit consent in the conversation.",
  parameters: z.object({
    fullName: z.string().min(2),
    phone: z.string().regex(/^\+?[\d\s()-]{7,}$/),
    email: z.string().email(),
    chronicIllnesses: z.string().nullable(),
    interest: z.enum([
      "implants", "veneers", "all-on-4", "all-on-6",
      "smile-makeover", "other"
    ]),
    preferredLanguage: z.enum(["en", "tr", "ru", "de"]),
    consentGiven: z.literal(true),
  })
}

escalateEmergency: {
  description: "Trigger when patient describes acute pain, swelling,
                bleeding, or any condition needing urgent care.",
  parameters: z.object({
    summary: z.string(),
    contactInfo: z.string().nullable(),
  })
}
```

`consentGiven: z.literal(true)` makes it impossible for the model to fire a lead-write without explicit consent in args.

### 5.4. Conversation state

State carried forward in `[STATE]` block per turn (no heavyweight state machine). The model is instructed to never skip ahead to lead capture before completing brief steps 1-3.

---

## 6. Voice Pipeline

### 6.1. Latency budget

Target: ≤ 1.2 s from PTT release to first phoneme played.

| Step | Budget |
|---|---|
| VAD trim + finalize | 50 ms |
| Audio upload to `/api/voice/stt` | 100 ms |
| Deepgram REST transcription | 300 ms |
| LLM first token (cached system prompt) | 400 ms |
| First sentence ready (~15 tokens) | 150 ms |
| ElevenLabs Flash TTS first audio | 75 ms |
| Audio decode + queue start | 50 ms |
| **Total** | **~1.1 s** |

### 6.2. Pipeline

```
PTT button press
  └─ getUserMedia (echoCancel + noiseSuppress + AGC)
  └─ MediaRecorder (audio/webm;codecs=opus, fallback audio/mp4)
  └─ @ricky0123/vad-react (Silero VAD via WASM)
       └─ trims silence + auto-detects end-of-speech
  └─ on release: blob → POST /api/voice/stt
       └─ Deepgram Nova-3 Multilingual REST → { text, language }
  └─ useChat.sendMessage(text)
       └─ /api/chat streamText
            └─ on each sentence boundary:
                 ElevenLabs Flash v2.5 → MP3 → Supabase Storage
                 → writer.write({ type:'data-audio', transient:true, data:{ url } })
  └─ AI Elements AudioPlayer queues URLs for sequential playback
```

### 6.3. Sentence splitter

Flushes to TTS on:
- Punctuation: `. ? !` (skipping known abbreviations: Dr., 3D, mm, etc.)
- 15-token boundary if no punctuation reached

This keeps first-audio latency under 200 ms after first token; minor mid-clause cuts are acceptable.

### 6.4. Cross-browser handling

- **Audio capture format:** `audio/webm;codecs=opus` primary; `audio/mp4;codecs=mp4a.40.2` fallback for older Safari. Detect via `MediaRecorder.isTypeSupported`.
- **Playback:** AI Elements `AudioPlayer` uses standard `<audio>` element with sequential URL playlist — no MediaSource Extensions, no Safari Opus bug surface.
- **VAD WASM under Turbopack:** known fragility. Mitigation: dynamic import in client component (`ssr: false`), copy `silero_vad.onnx` and `ort-wasm-simd-threaded.wasm` into `/public/vad/`, set `onnxWASMBasePath` and `baseAssetPath` explicitly. Validation gate in Sprint 1; webpack fallback (`next dev --webpack`, `next build --webpack`) if Turbopack regression persists.

### 6.5. Mic-button state machine

```
idle  ──[press / space]──▶  acquiring (mic permission)
                              │
                              ├─[granted]──▶ recording (red dot, VAD active)
                              │                 │
                              │                 ├─[release / VAD silence 2s]──▶ transcribing
                              │                 │                                    │
                              │                 │                                    ▼
                              │                 │                              thinking (LLM stream)
                              │                 │                                    │
                              │                 │                                    ▼
                              │                 │                              speaking (audio queue)
                              │                 │                                    │
                              │                 │                                    └─▶ idle
                              │                 │
                              │                 └─[mic press during speaking]──▶ interrupt → idle
                              │
                              └─[denied]──▶ text-only mode (toast)
```

Desktop: hold-to-talk (mouse + space bar). Mobile: tap-to-start / tap-to-stop. Voice-barge-in (talking over playback) is **out of scope for v1**.

### 6.6. Voice selection

ElevenLabs library voice with strong multilingual quality across EN/TR/RU/DE — single voice for consistent persona. Specific `ELEVENLABS_VOICE_ID` selected during Sprint 1 implementation; warm female voice preferred per dental-clinic UX research. Voice cloning of clinic doctors is **out of scope** (legal review needed before any voice synthesis of identifiable persons).

---

## 7. Lead Capture

### 7.1. Trigger conditions

The `submitLead` tool is invoked only when all four conditions hold:

1. Conversation has cleared brief steps 1–3 (greeting, needs analysis, value proposition).
2. All four required fields collected.
3. Explicit consent obtained in conversation text.
4. UI consent modal displayed and confirmed by patient ("Send to clinic" button).

The Zod schema enforces (3); the modal enforces (4). Two independent gates.

### 7.2. Supabase `perla.leads` schema

Single Postgres table in the `perla` schema (kept out of the public Data API; reachable only via service-role key). Columns:

| Column | Source |
|---|---|
| `id` | uuid pk, db-generated |
| `conversation_id` | session-bound text, unique |
| `full_name` | tool args |
| `phone` | tool args, normalized via `libphonenumber-js` to E.164 |
| `email` | tool args, lowercased + validated |
| `preferred_language` | tool args (`en`/`tr`/`ru`/`de`) |
| `interest` | tool args (enum) |
| `chronic_illnesses` | tool args (free text, nullable) |
| `summary` | AI-generated, ≤ 280 chars |
| `consent_text` | the verbatim string the patient confirmed |
| `consent_given_at` | timestamptz |
| `source` | UTM source / default `direct` |
| `country_code` | derived from IP, raw IP not stored |
| `user_agent_short` | coarse (browser family + platform) |
| `status` | initial value `new`; clinic updates via SQL or studio |
| `clinic_notes` | clinic-managed, nullable |
| `created_at`, `updated_at` | timestamptz, db-managed |

Inserts use `@supabase/supabase-js` with the service-role key. RLS is enabled with no policies — only the server can read/write. A companion `perla.audit_events` table (kind, conversation_id, detail jsonb) holds all audit records.

### 7.3. Email notification (Resend)

Sent in parallel with the Supabase insert. Subject format: `🦷 New Perla Lead: {name} — {interest} ({lang})`. From address: `leads@perladentalclinics.com` (DKIM, SPF, DMARC required). `Reply-To` header set to the patient's email so clicking Reply emails the patient directly.

Optional patient confirmation email sent to the patient in their preferred language: short thank-you with 24-hour follow-up promise.

### 7.4. Idempotency and abuse protection

- One `submitLead` per `conversation_id`. Subsequent calls in the same conversation are silently no-op (enforced by the unique index on `perla.leads.conversation_id`).
- IP rate limit: 3 leads/hour, enforced via the `perla.touch_rate_limit(p_key, p_window_seconds)` Postgres RPC (atomic incr-or-reset on `perla.rate_limits`). Fails open on RPC error so a transient outage doesn't block leads.
- Honeypot field in the consent modal; bot submissions silently dropped.
- No CAPTCHA in v1.

### 7.5. Failure handling

- Supabase insert fails → email still sent → admin alert via separate Resend channel → lead retried with exponential backoff.
- Email fails → Supabase has the lead → admin alert.
- Both fail → full lead JSON logged to Vercel Logs → user sees: "Technical issue — please call +90 534 226 60 59 directly."

---

## 8. Guardrails & Safety

### 8.1. Defense layers (lean MVP)

```
L1: System prompt (verbatim brief §6 + 4-language canonical refusals
    + prompt-injection defenses + system-prompt-extraction defenses)
                  │
L2: Audit log    │
                  │   ─ Vercel Logs (every tool fire, every refusal)
                  ▼   ─ perla.audit_events (every guardrail/lead/escalation event)

L3: Promptfoo eval suite (~640 cases, gating CI on prompt/model
    changes; nightly run against production)
```

**Removed for MVP:** inbound classifier (Haiku→Sonnet routing), regex post-filter, LLM judge layer. Each is reintroduced *only* if production logs or evals demonstrate a failure pattern that prompt-engineering plus evals cannot fix.

### 8.2. Promptfoo eval suites

| Suite | Cases / lang | Total | Pass criterion |
|---|---|---|---|
| `price-extraction.yaml` | 60 | 240 | 0 leaks (regex check + LLM rubric) |
| `diagnosis-fishing.yaml` | 40 | 160 | 0 diagnostic statements (LLM rubric) |
| `emergency-triggers.yaml` | 20 | 80 | 100% `escalateEmergency` tool fire |
| `off-topic-redirect.yaml` | 40 | 160 | ≥ 95% polite redirect, no full answer |
| **Total** | 160 | **640** | All thresholds met |

Multi-turn pressure tests (3-turn escalating-pressure conversations) are a subset of `price-extraction` — the most important safety check.

CI runs full evals on PRs touching `lib/agent/**` or `messages/**/refusals.json`. Smoke subset (~80 cases) runs on every PR.

### 8.3. Emergency escalation

When `escalateEmergency` fires:

1. LLM responds with the canonical text from brief §6.
2. Server sends URGENT-prefixed email to clinic.
3. `perla.audit_events` row inserted with kind `emergency_escalated`.
4. Patient is encouraged: *"In the meantime, if your pain is severe, please consider contacting emergency services or visiting the nearest clinic."*

### 8.4. Operational controls

- **Kill switch:** `AGENT_DISABLED=true` env var → all chat returns: *"Our AI assistant is briefly unavailable for maintenance — please call +90 534 226 60 59 directly."* Flippable from Vercel dashboard, no deploy.
- **No-train opt-out:** Anthropic API tier (default) does not train on customer data. Verified at account setup.
- **Sub-processor list:** Vercel, Anthropic, Deepgram, ElevenLabs, Google, Resend — DPAs collected once, listed in privacy policy.

---

## 9. UX

### 9.1. Layout (voice-orb hero)

Single landing page:

- Top nav: clinic logo, language flag dropdown.
- Hero: editorial headline, sub-copy, large `Persona` voice orb (AI Elements), giant primary CTA: "🎤 Hold to speak". Below: "or type below".
- Mid: `Conversation` transcript (AI Elements) — scrollable, shows live token stream.
- Bottom: persistent text input with mic icon and send button (sticky on mobile).
- Footer: trust strip (Turkish Ministry of Health, ISO 9001, 7 specialists), address, phone.

### 9.2. Persona orb states

The AI Elements `Persona` component drives four states: idle (gentle breathing), listening (amplitude-reactive teal ring), thinking (rhythmic pulse), speaking (waveform reactive to audio amplitude). `prefers-reduced-motion` honored.

### 9.3. Mic-button visual states

`idle` → `acquiring` → `recording` (red dot + amplitude bars) → `transcribing` → `thinking` → `speaking` (tap to interrupt).

### 9.4. Brand defaults (subject to clinic confirmation)

| Token | Value |
|---|---|
| Primary | `#1E5F74` (deep teal — medical credibility + Mediterranean) |
| Accent | `#F8F4EC` (pearl cream — echoes "Perla") |
| Highlight | `#C9A96E` (warm gold — premium) |
| Surface | `#FAFAF8` |
| Text | `#1A1A1A` |
| Heading font | DM Serif Display |
| Body font | Inter |

Clinic to confirm or supply existing brand guidelines before Sprint 5.

### 9.5. Consent UX

Three light touchpoints:

1. **Cookie banner** (first visit, bottom): minimal; essential cookies only, no tracking.
2. **Mic permission disclosure** (first mic press): one-time dialog explaining Deepgram and ElevenLabs (USA) processing; user can choose voice or text.
3. **Lead-capture modal** (right before `submitLead` fires): displays all collected fields plus consent checkbox plus Send/Cancel buttons.

### 9.6. Mobile

Layout reorders vertically; mic button anchored in thumb-zone; transcript expands; sticky input above keyboard. iOS Safari `100dvh` (Tailwind v4) used to avoid the URL-bar viewport bug.

### 9.7. Accessibility

- WCAG 2.2 AA targets.
- Keyboard reachable; space-bar activates mic; enter sends text.
- `aria-live="polite"` on transcript for screen readers.
- All 4 languages have full UI translation including ARIA labels.
- `prefers-reduced-motion` honored.

---

## 10. Project Structure

```
perla-agent/
├─ app/
│  ├─ [locale]/
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  ├─ privacy/page.tsx
│  │  └─ terms/page.tsx
│  ├─ api/
│  │  ├─ chat/route.ts
│  │  ├─ voice/stt/route.ts
│  │  └─ lead/forget/route.ts
│  └─ globals.css
├─ proxy.ts                                ← Next.js 16 (renamed middleware)
├─ src/lib/
│  ├─ agent/
│  │  ├─ prompt.ts
│  │  ├─ knowledge.ts
│  │  ├─ tools.ts
│  │  ├─ refusals.ts
│  │  └─ types.ts
│  ├─ voice/
│  │  ├─ stt.ts                            ← Deepgram REST client
│  │  ├─ tts.ts                            ← ElevenLabs streaming → Supabase Storage
│  │  └─ sentence-splitter.ts
│  ├─ leads/
│  │  ├─ schema.ts
│  │  ├─ supabase-leads.ts                 ← insertLead + appendAuditEvent
│  │  ├─ email.ts
│  │  ├─ rate-limit.ts                     ← perla.touch_rate_limit RPC
│  │  └─ submit-lead.ts
│  ├─ supabase.ts                          ← getServerClient (perla schema)
│  ├─ i18n/
│  │  ├─ config.ts
│  │  ├─ detect.ts
│  │  └─ request.ts
│  └─ observability/
│     ├─ logger.ts
│     └─ audit.ts
├─ src/components/
│  ├─ ai-elements/                         ← installed via shadcn-style registry
│  │  ├─ persona.tsx
│  │  ├─ audio-player.tsx
│  │  ├─ conversation.tsx
│  │  └─ message.tsx
│  ├─ mic-button.tsx
│  ├─ language-switcher.tsx
│  ├─ consent-modal.tsx
│  ├─ mic-permission-dialog.tsx
│  ├─ cookie-banner.tsx
│  └─ trust-strip.tsx
├─ src/hooks/
│  ├─ use-voice-pipeline.ts
│  ├─ use-vad.ts
│  └─ use-language.ts
├─ messages/
│  ├─ en.json
│  ├─ tr.json
│  ├─ ru.json
│  └─ de.json
├─ public/
│  └─ vad/{silero_vad.onnx, ort-wasm-simd-threaded.wasm}
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  └─ evals/
│     ├─ promptfoo.config.yaml
│     ├─ price-extraction.yaml
│     ├─ diagnosis-fishing.yaml
│     ├─ emergency-triggers.yaml
│     └─ off-topic-redirect.yaml
├─ next.config.ts
├─ tailwind.config.ts
├─ biome.json
├─ vitest.config.ts
├─ playwright.config.ts
└─ package.json
```

**Dependency contract:** `app → components → hooks → lib`. `lib/agent/` imports nothing framework-specific (no React, no Next.js). This is the constraint that makes the brain re-usable for a future phone channel.

---

## 11. Testing Strategy

| Layer | Tool | Volume | Catches |
|---|---|---|---|
| Unit | Vitest | ~120 tests | Pure logic, schema validation, prompt builder, sentence splitter |
| Integration | Vitest + MSW | ~30 tests | API wiring, tool execution, Supabase/email contracts (mocked) |
| E2E | Playwright on Vercel preview | ~10 tests | UX flow with stubbed LLM (`LLM_PROVIDER=stub`) |
| LLM Evals ★ | Promptfoo | 640 cases | Persona stability, guardrails, tool-call correctness across 4 langs |

The LLM eval suite is the **primary safety net**; conventional tests catch the rest.

CI on every PR: Biome → tsc → Vitest unit → Vitest integration → Promptfoo (full or smoke per path filter) → Playwright on preview. Nightly: full eval suite against production model + Lighthouse.

Local commands: `pnpm dev`, `pnpm test`, `pnpm test:e2e`, `pnpm eval`, `pnpm eval:all`. The full eval costs ~$0.50 per run.

---

## 12. Deployment & Operations

### 12.1. Hosting

- Vercel Pro, Fluid Compute (Node runtime), `fra1` region.
- `maxDuration = 60` on `/api/chat` and `/api/voice/stt`.
- Domain: `agent.perladentalclinics.com` (clinic owns DNS; A/CNAME + SPF/DKIM/DMARC for `leads@`).

### 12.2. Environment variables

```bash
# AI provider
ANTHROPIC_API_KEY=

# Voice
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Supabase (project: stoxpulse, ref: zgqzsypxtcygdqnflatp, region: us-west-2)
SUPABASE_URL=https://zgqzsypxtcygdqnflatp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=             # server-only; never ship to browser
NEXT_PUBLIC_SUPABASE_URL=https://zgqzsypxtcygdqnflatp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # safe in client bundle

# Email
RESEND_API_KEY=
LEAD_NOTIFICATION_EMAIL=
LEAD_FROM_EMAIL=

# Operational
LEAD_FORGET_TOKEN=                     # bearer token for /api/lead/forget
AGENT_DISABLED=false                   # kill switch
LOG_LEVEL=info
NEXT_PUBLIC_SITE_URL=
```

### 12.3. Observability

Vercel Pro built-ins only at MVP:

- **Vercel Logs** for structured server logs (PII redacted at the logger boundary via `pino` redact rules).
- **Vercel Speed Insights** for Web Vitals.
- **Vercel Analytics** for traffic.
- **`perla.audit_events` table** for guardrail-relevant, lead, escalation, and rate-limit events.

Adding Axiom / Sentry / Helicone is deferred; clear triggers documented:

- ≥ 5 k conversations/mo → add long-term log retention (Axiom or Logtail).
- First production guardrail leak → add Helicone for LLM trace visibility.
- Recurring frontend errors users report not findable in Vercel Logs → add Sentry.

### 12.4. KPI dashboard

Single Looker Studio or Notion page, refreshed hourly:

- Conversations / day
- Lead conversion rate (target ≥ 8%)
- Voice adoption %
- P50 / P95 first-phoneme latency
- Guardrail events / 100 conversations
- Price leaks / month (target 0)
- Cost / conversation (target ≤ $0.04)
- Per-language conversion

### 12.5. Disaster recovery

- Lead data is in clinic-owned Supabase Postgres; daily PITR backups retained per Supabase plan.
- Weekly `pg_dump` of `perla.leads` exported to a clinic-owned offsite location.
- Code in GitHub; Vercel rollback is one click.
- Kill switch via env var.
- Provider swap is one line (AI SDK abstraction).

---

## 13. Costs & ROI

Assumptions: 6 turns text + 2 voice turns per conversation; 30% of users use voice.

| Tier | Conversations/mo | LLM | STT | TTS | Vercel | Resend | **Total** |
|---|---|---|---|---|---|---|---|
| Pilot | 100 | $3 | $0.40 | $7 | $20 | $0 | **~$30** |
| Growth | 1,000 | $30 | $4 | $65 | $20 | $20 | **~$140** |
| Scale | 10,000 | $300 | $40 | $650 | $50 | $20 | **~$1,060** |
| Scale (text-only) | 10,000 | $300 | $0 | $0 | $50 | $20 | **~$370** |

The Growth tier ROI: 1 % conversation→patient conversion at average $7,500 implant package = $75,000 monthly revenue against $140 monthly cost (~535×).

Pressure-release valve at scale: swap ElevenLabs Flash for a cheaper TTS if voice cost exceeds budget. Provider abstraction makes this a one-line change.

---

## 14. Rollout Plan

| Week | Phase | Owner | Gate |
|---|---|---|---|
| 0 | Procurement: accounts, DNS, service account, sheets | Clinic + dev | All keys in Vercel env |
| 1–2 | Text MVP: scaffold, i18n, `/api/chat` + tools, lead capture, landing page | Dev | All unit/integration tests + Promptfoo eval suite green |
| 3–4 | Voice pipeline: Deepgram STT, ElevenLabs TTS via Supabase Storage, VAD (with Turbopack workaround validation), mic state machine | Dev | E2E voice tests pass on Chrome / Safari iOS / Firefox |
| 5 | Polish: brand confirmation, mobile UX, accessibility audit, privacy policy, terms, full eval re-run | Dev + design | Lighthouse ≥ 90, eval green |
| 6 | Soft launch: production deploy, clinic team trained on Supabase Studio lead workflow, monitor first 100 conversations | Clinic + dev | KPI dashboard live |
| 7+ | Scale & next channel: eval corpus growth from production findings; phone channel evaluation | Ongoing | — |

Each phase has a clean go/no-go gate. No phase ships unless prior phase tests are green.

---

## 15. Out of Scope (v1)

- Phone channel (Twilio + ElevenLabs Conversational AI). Brain (`lib/agent/`) is intentionally portable for this.
- WhatsApp / Telegram channels.
- Photo / X-ray upload.
- Booking calendar integration.
- Voice cloning of clinic doctors (legal review required first).
- HIPAA-tier sub-processor agreements (US patient expansion).
- Voice-barge-in (talking over agent during playback).
- A/B testing infrastructure for prompts.
- Dark mode.
- Multi-thread conversation persistence.
- CAPTCHA on chat entry.

---

## 16. Open Questions

1. **Brand alignment:** Does the clinic have existing brand guidelines (palette, typography, logo system) we must mirror, or do we use the proposed defaults? Needed by Sprint 5.
2. **DNS readiness:** Is the clinic ready to add the necessary DNS records (CNAME + SPF + DKIM + DMARC) in Sprint 0? Blocks email sending if not.
3. **Voice ID:** Specific ElevenLabs library voice — clinic preference? Default is "warm female multilingual"; final selection in Sprint 1.
4. **CRM later:** Once clinic uses Supabase Studio for 90+ days, do we migrate to a real CRM (HubSpot, Salesforce)? Decision deferred to post-launch.
5. **Patient confirmation email:** Send auto-thank-you to patient after lead capture? Default yes; clinic confirms.

---

## 17. References

- Source brief: `perla-dental-clinic-ai-agent.pdf`
- Next.js 16 release notes: https://nextjs.org/blog/next-16
- Vercel AI SDK 6 migration guide: https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
- Vercel AI Elements: https://elements.ai-sdk.dev/
- Vercel AI Voice Elements changelog: https://vercel.com/changelog/ai-voice-elements
- Anthropic Claude Haiku 4.5: https://www.anthropic.com/news/claude-haiku-4-5
- Anthropic prompt caching: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- Deepgram Nova-3 multilingual updates: https://deepgram.com/learn/nova-3-multilingual-major-wer-improvements-across-languages
- ElevenLabs TTS docs: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- Silero VAD (browser): https://github.com/ricky0123/vad
- next-intl: https://next-intl.dev/
- Promptfoo: https://promptfoo.dev/

---

**End of specification.**
