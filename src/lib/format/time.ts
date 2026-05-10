/**
 * Renders a timestamp in two zones side-by-side: the clinic's local
 * timezone (Europe/Rome) and UTC. Used everywhere the admin UI shows
 * record timestamps so operators can read them in their normal frame
 * while audit logs / API replies stay UTC-comparable.
 *
 * Hard-coded to Europe/Rome for now — this is a single-clinic SaaS.
 * Move to a `CLINIC_TIMEZONE` env var if/when the project becomes
 * multi-tenant.
 */
const CLINIC_TIMEZONE = 'Europe/Rome'

export type DualTimestamp = {
  local: string
  utc: string
  iso: string
}

const localFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const utcFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

export function formatDual(input: string | Date | null | undefined): DualTimestamp | null {
  if (!input) return null
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return {
    local: `${localFmt.format(d)} (${CLINIC_TIMEZONE})`,
    utc: `${utcFmt.format(d)} UTC`,
    iso: d.toISOString(),
  }
}
