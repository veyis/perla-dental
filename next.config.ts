import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Cache Components disabled: app is fully dynamic (chat, locale-aware) so the
  // overhead of Suspense boundaries everywhere isn't earning its keep. Re-enable
  // when we add genuinely cacheable surfaces (blog, doctor pages, etc.).
}

export default withNextIntl(nextConfig)
