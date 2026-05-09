# Deployment

## One-time setup
1. `pnpm dlx vercel link`
2. Add all env vars from `.env.example` in Vercel project settings.
3. Supabase project (`stoxpulse`, ref `zgqzsypxtcygdqnflatp`, region us-west-2)
   is already provisioned. The `perla` schema, the `perla.leads`,
   `perla.audit_events`, and `perla.rate_limits` tables, the
   `perla.touch_rate_limit` RPC, and the `perla-tts` storage bucket
   exist in production. Paste the project's `service_role` key into
   `SUPABASE_SERVICE_ROLE_KEY` in Vercel — server-only.
4. Trigger a preview deploy: `pnpm dlx vercel`.
5. Confirm preview URL works end-to-end (lead submit, TTS playback,
   `/api/lead/forget`).

## DNS
- Point `agent.perladentalclinics.com` to the Vercel project.
- Add SPF + DKIM + DMARC records on `perladentalclinics.com` for `leads@` email.

## Region
Pinned to `fra1` (Frankfurt) for lowest latency to EU/TR/RU/DE patients.
Supabase project is `us-west-2`; consider co-locating later if Vercel→Supabase
RTT becomes a bottleneck.

## ElevenLabs Conversational AI agent setup

The full-duplex voice mode (phone-call style) uses ElevenLabs Agents.
The canonical source of truth is `elevenlabs/agent_configs/dental.json`,
synced via the ElevenLabs CLI:

```bash
pnpm dlx @elevenlabs/agents-cli auth login   # one-time
pnpm dlx @elevenlabs/agents-cli agents push --dry-run   # preview
pnpm dlx @elevenlabs/agents-cli agents push             # apply
```

If creating from scratch in the [dashboard](https://elevenlabs.io/app/agents):

1. **Create a new Agent**.
2. **System prompt** → `pnpm prompt` prints `staticSystemBlocks()`. Paste in.
3. **Voice** → select the same voice as `ELEVENLABS_VOICE_ID` in env.
4. **LLM** → choose **Custom LLM** (`api_type: chat_completions`):
   - **Server URL (base)**: `https://<your-vercel-domain>/api/voice-llm`
     (ElevenLabs auto-appends `/chat/completions`; the route handler lives
      at `src/app/api/voice-llm/chat/completions/route.ts`).
   - **Model ID**: `claude-haiku-4-5` (we forward this label only — the proxy
      always uses Anthropic Claude Haiku 4.5 server-side).
   - **API key**: store a shared secret in ElevenLabs' secrets vault if you
      want to gate the proxy. Optional.
5. **First message** → English default plus `tr / ru / de` language presets
   (already in `dental.json`).
6. Copy the Agent's public ID into `.env.local` and Vercel env as
   `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`.

### Post-call webhook

Workspace → Webhooks → Post-call Transcription:
- URL: `https://<your-vercel-domain>/api/elevenlabs/post-call`
- Secret: paste a fresh `openssl rand -hex 32` value into both the dashboard
  and the Vercel env var `ELEVENLABS_WEBHOOK_SECRET`.
- Events: `transcript` (audio left off — see `dental.json`
  `workspace_overrides.webhooks`).

### TTS / latency

`tts.model_id` is `eleven_flash_v2_5` (~75 ms TTFT, multilingual). Do not
swap to `eleven_multilingual_v2` for live calls — it adds 300+ ms.

For production: enable EU residency on the ElevenLabs Enterprise tier
(`api.eu.residency.elevenlabs.io`) and request a DPA + Zero Retention agreement
for medical data compliance.

## Chat lead-capture HMAC

`LEAD_HMAC_SECRET` (32+ chars). Server signs the model-proposed lead fields when
the chat tool returns `pending_consent`; the new `/api/lead/submit` endpoint
verifies the same signature so only fields the model actually proposed in this
conversation can be written. Generate with:

```bash
openssl rand -hex 32
```

Set in Vercel project env (production + preview) and `.env.local` for dev.
