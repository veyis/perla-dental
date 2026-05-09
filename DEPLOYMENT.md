# Deployment

## One-time setup
1. `pnpm dlx vercel link`
2. Add all env vars from `.env.example` in Vercel project settings.
3. Add the Upstash Redis integration via Vercel Marketplace.
4. Provision Vercel Blob.
5. Trigger a preview deploy: `pnpm dlx vercel`.
6. Confirm preview URL works end-to-end.

## DNS
- Point `agent.perladentalclinics.com` to the Vercel project.
- Add SPF + DKIM + DMARC records on `perladentalclinics.com` for `leads@` email.

## Region
Pinned to `fra1` (Frankfurt) for lowest latency to EU/TR/RU/DE patients.
