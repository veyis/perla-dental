# ElevenLabs Full-Potential + Code Correctness — Design

**Date:** 2026-05-09  
**Scope:** Demo app; security/auth improvements explicitly deferred.

---

## Goals

1. Use ElevenLabs Conversational AI platform features that are currently disabled or misconfigured.
2. Fix correctness bugs in the voice pipeline and API routes that affect real users today.

---

## Area 1 — ElevenLabs Agent Config (`elevenlabs/agent_configs/dental.json`)

All changes applied locally and pushed via `elevenlabs agents push`.

### 1.1 Guardrails
- Enable `prompt_injection.is_enabled: true`
- Enable `content.medical_and_legal_information.is_enabled: true` (threshold: `medium`, trigger action: `end_call`)
- Keep all other content filters off (sexual/violence/profanity not relevant for dental demo)

### 1.2 Privacy & Retention
- `retention_days: 90` — stop indefinite storage
- `delete_transcript_and_pii: true` — auto-delete after retention window
- `conversation_history_redaction.enabled: true` with entities: `["PHONE_NUMBER", "EMAIL", "HEALTH_CONDITION"]`

### 1.3 Timezone
- Change `timezone` from `America/Chicago` → `Europe/Istanbul`

### 1.4 Language Presets
Add presets for `tr`, `ru`, `de` with localized first messages:
- tr: "Perla Diş Klinikleri'ne hoş geldiniz, ben kliniğin dijital asistanıyım. Size nasıl yardımcı olabilirim?"
- ru: "Добро пожаловать в Perla Dental Clinics. Я цифровой ассистент клиники. Чем могу помочь?"
- de: "Willkommen bei Perla Dental Clinics. Ich bin der digitale Assistent der Klinik. Wie kann ich Ihnen helfen?"

### 1.5 Widget UX
- `transcript_enabled: true`
- `mic_muting_enabled: true`

### 1.6 LLM Field Clarification
- Change `prompt.llm` from `"gemini-2.5-flash"` → `"custom"` to document that `/api/voice-llm` is the actual LLM endpoint

### 1.7 Evaluation Criteria
Three criteria added to `platform_settings.evaluation.criteria`:
- `lead_submitted`: Agent collected name, phone, email, and called submitLead
- `pricing_guardrail_held`: Agent did not quote prices or cost ranges
- `emergency_escalated`: Agent called escalateEmergency for acute pain/swelling

### 1.8 Test Cases
Three test configs in `elevenlabs/test_configs/` attached to agent:
- `test_pricing_guardrail`: User asks "how much does All-on-4 cost?" — expect pricing refusal script
- `test_emergency_escalation`: User describes severe jaw pain and swelling — expect escalateEmergency tool call
- `test_lead_capture`: User provides name, phone, email, agrees to share — expect submitLead tool call

---

## Area 2 — Code Correctness Fixes

### 2.1 TTS Language Parameter (`src/lib/voice/tts.ts`)
`synthesizeAndStoreSentence` accepts `language: Locale` but never sends it to ElevenLabs.
Fix: map `Locale` → ISO-639-1 code and include `language_code` in the request body.

### 2.2 Voice-LLM Type Safety (`src/app/api/voice-llm/route.ts`)
Two `as unknown as ModelMessage` casts on lines 203 and 219.
Fix: validate incoming OpenAI messages with Zod schema before conversion; remove force-casts.

### 2.3 Admin Type Safety (`src/app/[locale]/admin/calls/`)
`any` types on map callbacks.
Fix: use `ElevenLabsConversation` and `ElevenLabsTranscriptEntry` types already exported from `src/lib/voice/elevenlabs-calls.ts`.

### 2.4 Voice Call Reconnection (`src/components/voice-call.tsx`)
`onError` only logs; no user feedback or retry.
Fix: show inline error message with a "Try again" button on connection failure. Attempt auto-reconnect once after 2 s.

### 2.5 Fetch Timeouts (`src/lib/voice/tts.ts`, `src/lib/voice/elevenlabs-calls.ts`)
No `AbortController` on external fetch calls — ElevenLabs slowness blocks the route handler.
Fix: 8 s timeout on TTS synthesis; 10 s timeout on conversation list/detail fetches.

### 2.6 STT Audio Buffer Threshold (`src/app/api/voice/stt/route.ts`)
1 KB threshold is meaninglessly low (1 s Opus audio ≈ 3–5 KB).
Fix: raise to 4 KB. Remove duplicate check in `mic-button.tsx` and consolidate to the route.

---

## Out of Scope (this pass)
- ElevenLabs RAG / Knowledge Base (requires content authoring)
- Workflow branching / sub-agents
- Authentication on admin routes (demo app)
- Pino structured logging migration (low ROI for demo)
- TTS file cleanup cron (no infra for cron yet)
