/**
 * Builds a Google Maps search URL from the most precise location data
 * available. Returns null when there's nothing to map (so callers can
 * suppress the link instead of rendering one that points nowhere).
 *
 * Precision order:
 *   1. lat + lon → exact coordinate
 *   2. city + country → "<city>, <country>" search
 *   3. country only → country search
 *   4. nothing → null
 *
 * IP-derived geolocation is approximate. Tooltips on the rendered link
 * say so explicitly.
 */
export type MapsInput = {
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  region?: string | null
  country?: string | null
}

export function googleMapsUrl(input: MapsInput): string | null {
  const { latitude, longitude, city, region, country } = input

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
  }

  const parts: string[] = []
  if (city) parts.push(city)
  if (region) parts.push(region)
  if (country) parts.push(country)
  if (parts.length === 0) return null

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`
}
