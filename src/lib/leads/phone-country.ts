import { parsePhoneNumberFromString } from 'libphonenumber-js'

/**
 * Returns the ISO 3166-1 alpha-2 country code for a phone number in any
 * format `libphonenumber-js` can parse. Returns null when the input is
 * unparseable, ambiguous (e.g. shared dialing codes with no national
 * number), or doesn't include a country prefix.
 *
 * Used to enrich voice-agent leads with country since the post-call
 * webhook doesn't carry browser geo headers — only the caller phone.
 */
export function phoneCountry(phone: string | null | undefined): string | null {
  if (!phone) return null
  try {
    const parsed = parsePhoneNumberFromString(phone)
    return parsed?.country ?? null
  } catch {
    return null
  }
}
