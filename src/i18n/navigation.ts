import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Locale-aware Link / useRouter / usePathname / redirect / getPathname.
// usePathname() returns the LOCALE-STRIPPED pathname so language switching
// is a one-liner: `router.replace(pathname, { locale })`.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
