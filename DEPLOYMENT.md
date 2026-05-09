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
One-time configuration in the [ElevenLabs dashboard](https://elevenlabs.io/app/agents):

1. **Create a new Agent**.
2. **System prompt** → run `pnpm tsx scripts/print-system-prompt.ts` (TODO) to
   print our `staticSystemBlocks()` content, paste it in.
3. **Voice** → select the same voice as `ELEVENLABS_VOICE_ID` in env.
4. **LLM** → choose **Custom LLM**:
   - URL: `https://<your-vercel-domain>/api/voice-llm`
   - Model: leave any value (we ignore it server-side)
   - API key: leave blank or set a shared secret if you want to gate the proxy.
5. **First message** → "Welcome to Perla Dental Clinics, how may I help you today?"
   (Or per-locale variants — create one Agent per language and switch via locale.)
6. Copy the Agent's public ID into `.env.local` and Vercel env as
   `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`.

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
