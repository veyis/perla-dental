# Deployment

## One-time setup
1. `pnpm dlx vercel link`
2. Add all env vars from `.env.example` in Vercel project settings.
3. Supabase project (ref `padskljpjhrbwmfhhrcz`, region us-west-2) is
   already provisioned. The `perla` schema, the `perla.leads`,
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
