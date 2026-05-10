# Admin Record Details — Design

**Status:** approved-pending-review
**Author:** assistant + user, 2026-05-10
**Scope:** Add operational metadata (exact timestamps, IP, geo, UA, referrer) to leads, chat sessions, and calls; surface it on per-record admin detail pages with country flags and an external IP-lookup link.

## Goal

When the clinic operator clicks on a lead, chat, or call in the admin panel, they should see a detail page that answers:

- Exactly when did this happen? (UTC + clinic-local time)
- Where did the user come from? (IP, country with flag, city, region, timezone)
- What client did they use? (User-Agent, Accept-Language, Referrer)
- Did they consent? (text + timestamp)
- What conversation does this link to? (chat session, call recording)

## Non-goals

- IP truncation / anonymization. (Italy = GDPR — flag separately if posture changes.)
- Automatic retention purge.
- Backfilling existing records (data was never captured).
- Per-subject data export UI.

## Data sources & honest limitations

| Field | Lead via chat (`/api/lead/submit`) | Lead via voice-agent (post-call webhook) | Chat session (`/api/chat`) | Call (ElevenLabs) |
|---|---|---|---|---|
| Exact timestamp | ✓ | ✓ | ✓ | ✓ |
| IP address | ✓ (already partially captured at line 44) | — (server-to-server webhook; "remote" IP would be ElevenLabs') | ✓ (new) | — |
| Country / city / region / TZ | ✓ via `x-vercel-ip-{country,city,country-region,timezone}` | country only — derived from phone E.164 prefix | ✓ via headers | country from caller phone for inbound PSTN |
| User-Agent | ✓ | — | ✓ | — |
| Referrer + Accept-Language | ✓ | — | ✓ | — |
| Consent text + timestamp | ✓ already stored | ✓ already stored | n/a | n/a |

The 3 existing leads were all submitted via the voice-agent path; for them, only phone-derived country and the linked ElevenLabs conversation will be available. Browser fields will appear blank ("—") with a tooltip explaining why.

## Schema changes

### `perla.leads` — additive columns (all nullable)
- `ip_address text`
- `city text`
- `region text`
- `postal_code text`
- `continent text`
- `timezone text`
- `latitude double precision`
- `longitude double precision`
- `referrer text`
- `accept_language text`

(Existing relevant columns: `country_code`, `user_agent_short`, `source`, `consent_text`, `consent_given_at`, `created_at`.)

### `perla.chat_sessions` (new)
One row per `conversation_id`, upserted on first chat request, `last_seen_at` refreshed on subsequent requests.

```sql
create table perla.chat_sessions (
  conversation_id text primary key,
  ip_address text,
  country_code text,
  city text,
  region text,
  postal_code text,
  continent text,
  timezone text,
  latitude double precision,
  longitude double precision,
  user_agent text,
  referrer text,
  accept_language text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
alter table perla.chat_sessions enable row level security;
```

Why a separate table vs. denormalizing onto `chat_messages`: IP/UA don't change mid-conversation; one row per session is cleaner and avoids duplicating geo across every message.

### Calls
No schema change — surface what `getElevenLabsConversation()` already returns (`metadata.phone_call.external_number`, `start_time_unix_secs`, `call_duration_secs`, `main_language`, `direction`, `termination_reason`).

## New code

| File | Purpose |
|---|---|
| `src/lib/observability/request-context.ts` | Pure helper. Takes `Request`, returns `{ ip, country, continent, city, region, postalCode, timezone, latitude, longitude, userAgent, acceptLanguage, referrer }`. Reads `x-forwarded-for` (falls back to `x-vercel-forwarded-for`, then `x-real-ip`) plus all `x-vercel-ip-*` headers. Decodes `x-vercel-ip-city` per RFC3986 (Vercel encodes non-ASCII). |
| `src/lib/leads/phone-country.ts` | Wraps `libphonenumber-js`. `phoneCountry(e164: string): string \| null`. New dep added (`libphonenumber-js`, server-only use, ~150KB — irrelevant for server components). |
| `src/lib/format/flag.ts` | `flagEmoji(iso2): string` — converts `IT` → 🇮🇹 via Unicode regional-indicator pair. |
| `src/lib/format/time.ts` | `formatDual(ts): { utc, local }` — renders both UTC and `Europe/Rome` to a stable string. Clinic TZ is hard-coded for now (`Europe/Rome`), can be moved to env later. |
| `src/lib/leads/chat-sessions.ts` | `upsertChatSession(args)` and `getChatSession(id)` against `perla.chat_sessions`. |
| `src/app/[locale]/admin/leads/[id]/page.tsx` | New per-lead detail page. |

## Modified code

| File | Change |
|---|---|
| `src/app/api/chat/route.ts` | Call `upsertChatSession()` with extracted request context on every chat POST. |
| `src/app/api/lead/submit/route.ts` | Use `request-context` helper; pass full city/region/timezone/UA/referrer/accept-language to `submitLead`. |
| `src/lib/leads/submit-lead.ts` + `src/lib/leads/schema.ts` + `src/lib/leads/supabase-leads.ts` | Extend `LeadRowInput` and `insertLead` with the new fields. |
| `src/app/api/elevenlabs/post-call/route.ts` | When inserting the lead, derive `country_code` from `metadata.phone_call.external_number` via `phone-country.ts`. |
| `src/app/[locale]/admin/leads/page.tsx` | Captured-at column shows time (not just date). Add a "View" link/icon → `/admin/leads/<id>`. Show flag next to language/source where useful. |
| `src/app/[locale]/admin/chats/[id]/page.tsx` | Add right-hand "Session info" sidebar populated from `chat_sessions`: IP (linked to ipinfo.io), flag + country/city, UA, referrer, started/last-seen. |
| `src/app/[locale]/admin/calls/[id]/page.tsx` (or its current equivalent) | Show caller phone, derived country flag, language, duration, dual timestamp. |

## UI conventions

- **Flag rendering:** small flag emoji to the immediate left of the country code (`🇮🇹 IT`).
- **IP rendering:** monospace, shown as plain text (no external lookup link).
- **Map link:** a "📍 View on Google Maps" link rendered next to the geo on every detail page that has location data. URL built from the most precise data available, in this order:
  1. lat/lon → `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>`
  2. city + country → `https://www.google.com/maps/search/?api=1&query=<encoded city>,<country>`
  3. country only → `https://www.google.com/maps/search/?api=1&query=<country>`
  4. nothing → no link rendered.

  Opens in a new tab (`target="_blank" rel="noopener noreferrer"`). Be honest in the tooltip: `title="Approximate location of the IP — accuracy varies by ISP"`.
- **Timestamp rendering:** primary line in clinic-local (`Europe/Rome`), secondary line in muted text shows UTC. Shown to seconds.
- **Missing fields:** render as `—` (em dash) with a `title` tooltip — e.g. for voice-agent leads: `title="Not captured: voice-agent leads come through a server-to-server webhook"`.

## Detail page layouts (all per-row)

### `/admin/leads/<id>` (new)
- Header: name, status badge.
- Card: contact (email, phone with flag derived from prefix).
- Card: capture metadata (created_at dual format, source, conversation_id linked to `/admin/chats/<id>` for chat-source leads, badged "Voice agent session" with no link for voice-agent leads since synthetic IDs can't join to ElevenLabs calls).
- Card: client metadata (IP, country flag + city/region, timezone, lat/lon w/ Google Maps link, UA, accept-language, referrer) — `—` for voice-agent.
- Card: consent (consent_text, consent_given_at dual format).

### `/admin/chats/<id>` (extend existing)
- Existing transcript on the left.
- New "Session info" card on the right: IP, flag + country/city/region, timezone, lat/lon + Google Maps link, UA, referrer, accept-language, started_at, last_seen_at.

### `/admin/calls/<id>` (extend existing)
- New "Caller info" card: phone, derived country flag, Google Maps link to the country (no precise geo for phone calls), language, direction, duration, start_time (dual format), termination_reason.

## Risks / things to watch

- **Vercel geo headers require Vercel hosting.** They won't populate locally (only partially in `vercel dev`). Acceptable — admin UI is for production. Locally, fields will be null, gracefully rendered as `—`.
- **All Vercel geo headers are available on every plan tier** (verified in Vercel docs as of 2025-12-13). No Pro requirement. Includes the bonus `x-vercel-ip-postal-code` and `x-vercel-ip-continent`.
- **`Europe/Rome` is hard-coded** — fine for v1 (single-clinic SaaS). Future: move to `CLINIC_TIMEZONE` env var.
- **No PII deletion guarantees.** Storing raw IP is a GDPR consideration the user opted into; this spec does not block on it.
- **Voice-agent leads have synthetic conversation_ids** (`voice_xxx`), generated by `/api/voice-llm/chat/completions:87-88` when ElevenLabs doesn't pass `x-conversation-id`. These IDs **cannot be linked to ElevenLabs call recordings** in the admin UI. Lead detail page must detect `voice_` prefix (or `source === 'voice-agent'`) and show a "Voice agent session" badge instead of attempting a broken link. Permanently fixing this requires changes to the voice-llm proxy (out of scope here).
- **Admin pages must opt out of caching.** Next.js 16 + Cache Components defaults to caching server components when no dynamic API is used. Adding `export const dynamic = 'force-dynamic'` to every page under `/admin` so each request hits Supabase fresh.
- **Flag emoji rendering on Windows.** Windows lacks the regional-indicator → flag glyph mapping. Operators on Windows will see two-letter pairs (`🇮 🇹`) instead of 🇮🇹. Acceptable for an internal admin tool; not blocking.

## Out of scope (explicit)

These were declined or deferred:
- IP anonymization (e.g., zero last octet).
- Automatic retention sweeper (cron that purges IPs > N days old).
- Per-subject export ("download everything we have on Ali Yapan").
- Backfill of existing 3 leads.
- Replacing `lead.user_agent_short` with full `user_agent` (kept for compatibility; new `user_agent` would be additive if needed — currently using `user_agent_short` populated via UA-parser is sufficient).
