/**
 * Pulls all client/geo metadata out of an incoming `Request` into one
 * typed object. Used by `/api/chat`, `/api/lead/submit`, and any future
 * route that wants to record where a user came from.
 *
 * All fields are nullable — Vercel only populates `x-vercel-ip-*` headers
 * in production. Local dev returns mostly nulls; the admin UI renders
 * those as `—`.
 *
 * Vercel docs (verified 2025-12-13):
 *   https://vercel.com/docs/headers/request-headers
 * All `x-vercel-ip-*` headers are available on every plan tier.
 *
 * `x-vercel-ip-city` is RFC3986-encoded (non-ASCII city names like
 * "İstanbul" arrive percent-encoded), so we decodeURIComponent it.
 */

export type RequestContext = {
  ip: string | null
  country: string | null
  continent: string | null
  city: string | null
  region: string | null
  postalCode: string | null
  timezone: string | null
  latitude: number | null
  longitude: number | null
  userAgent: string | null
  acceptLanguage: string | null
  referrer: string | null
}

function num(s: string | null): number | null {
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function decodeCity(raw: string | null): string | null {
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export function extractRequestContext(req: Request): RequestContext {
  const h = req.headers
  // Prefer x-forwarded-for (Vercel rewrites this to prevent spoofing).
  // Fall back to x-vercel-forwarded-for (survives front-of-Vercel proxies)
  // and x-real-ip (identical alias) just in case.
  const ipRaw = h.get('x-forwarded-for') ?? h.get('x-vercel-forwarded-for') ?? h.get('x-real-ip')
  // The header is a comma-separated list; the client IP is the first entry.
  const ip = ipRaw?.split(',')[0]?.trim() || null

  return {
    ip,
    country: h.get('x-vercel-ip-country'),
    continent: h.get('x-vercel-ip-continent'),
    city: decodeCity(h.get('x-vercel-ip-city')),
    region: h.get('x-vercel-ip-country-region'),
    postalCode: h.get('x-vercel-ip-postal-code'),
    timezone: h.get('x-vercel-ip-timezone'),
    latitude: num(h.get('x-vercel-ip-latitude')),
    longitude: num(h.get('x-vercel-ip-longitude')),
    userAgent: h.get('user-agent'),
    acceptLanguage: h.get('accept-language'),
    referrer: h.get('referer') ?? h.get('referrer'),
  }
}
