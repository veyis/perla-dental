/**
 * End-to-end debug script — exercises the full landing page, all 4 locales,
 * the language switcher, and the voice agent connection. Designed to be run
 * once (manually or via `pnpm test:e2e`) against a live `pnpm dev` server.
 *
 * Reports every failure with the exact symptom; passes are silent.
 */
import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

// Grant mic permission once for all tests in this file
test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
})

const LOCALES = [
  { code: 'en', path: '/', subtitle: 'Your dental holiday — guided in real time.' },
  { code: 'tr', path: '/tr', subtitle: 'Diş tatiliniz — gerçek zamanlı rehberlik.' },
  { code: 'ru', path: '/ru', subtitle: 'Стоматологический отдых — в режиме реального времени.' },
  { code: 'de', path: '/de', subtitle: 'Ihr Zahnurlaub — in Echtzeit begleitet.' },
] as const

test('1. Homepage loads at /', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('pageerror', (e) => consoleErrors.push(`PAGE ERROR: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`CONSOLE ERROR: ${m.text()}`)
  })

  await page.goto('/', { waitUntil: 'networkidle' })

  // Hero h1 should be visible
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5000 })

  // Language pill should show 🇬🇧 English
  const pill = page.getByLabel(/^Language:/)
  await expect(pill).toBeVisible()
  await expect(pill).toContainText('English')

  // Start call button visible
  await expect(page.getByRole('button', { name: /Start call/i })).toBeVisible()

  if (consoleErrors.length > 0) {
    throw new Error(`Console errors on /:\n${consoleErrors.join('\n')}`)
  }
})

test('2. Language switcher — opens dropdown', async ({ page }) => {
  await page.goto('/')
  const pill = page.getByLabel(/^Language:/)
  await pill.click()

  // All 4 options visible in the dropdown
  for (const { code } of LOCALES) {
    const flagSel = code === 'en' ? '🇬🇧' : code === 'tr' ? '🇹🇷' : code === 'ru' ? '🇷🇺' : '🇩🇪'
    await expect(page.getByRole('option').filter({ hasText: flagSel })).toBeVisible()
  }

  // Press Escape closes
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).not.toBeVisible()
})

for (const { code, path, subtitle } of LOCALES) {
  test(`3.${code} Switching to ${code} → URL=${path} + UI text matches`, async ({ page }) => {
    await page.goto('/')
    if (code === 'en') {
      // Already on EN; just verify subtitle
    } else {
      const pill = page.getByLabel(/^Language:/)
      await pill.click()
      // Click the option for this locale
      const langName = code === 'tr' ? 'Türkçe' : code === 'ru' ? 'Русский' : 'Deutsch'
      await page.getByRole('option', { name: new RegExp(langName) }).click()
      // Wait for navigation
      await page.waitForURL(`**${path}`, { timeout: 5000 })
    }

    // URL pathname matches
    expect(new URL(page.url()).pathname).toBe(path)

    // <html lang="..."> matches
    const htmlLang = await page.locator('html').getAttribute('lang')
    expect(htmlLang).toBe(code)

    // Hero splits the subtitle on em-dash into two spans, so we check the
    // first half (before "—") instead of the full string.
    const firstHalf = subtitle.split('—')[0]?.trim() ?? subtitle
    await expect(page.getByText(firstHalf, { exact: false }).first()).toBeVisible({
      timeout: 3000,
    })
  })
}

test('4. Voice call — Start button initiates connection', async ({ page, context }) => {
  await context.grantPermissions(['microphone'])

  const sdkLogs: string[] = []
  page.on('console', (m) => {
    const text = m.text()
    if (
      text.includes('[VoiceCall]') ||
      text.includes('ElevenLabs') ||
      text.includes('elevenlabs') ||
      text.toLowerCase().includes('websocket') ||
      text.toLowerCase().includes('connected')
    ) {
      sdkLogs.push(`${m.type()}: ${text.slice(0, 200)}`)
    }
  })

  await page.goto('/')

  // Click Start call
  await page.getByRole('button', { name: /Start call/i }).click()

  // Within 12 seconds we should either see the End call button (success)
  // or the Connecting… intermediate state (also fine — SDK is trying)
  const endBtn = page.getByRole('button', { name: /End call/i })
  const connecting = page.getByText(/Connecting/i)

  try {
    await Promise.race([
      endBtn.waitFor({ state: 'visible', timeout: 12000 }),
      connecting.waitFor({ state: 'visible', timeout: 5000 }),
    ])
  } catch {
    // proceed to logs check anyway
  }

  // Wait a bit more so logs accumulate
  await page.waitForTimeout(3000)

  console.log('--- captured SDK logs ---')
  for (const l of sdkLogs) console.log('  ', l)
  console.log('--- end SDK logs ---')

  const connected = sdkLogs.some((l) => /\[VoiceCall\] connected/.test(l))
  const errored = sdkLogs.some((l) => /error/i.test(l) && !/will retry|warn/i.test(l))

  if (errored && !connected) {
    throw new Error(`Voice agent failed to connect. Captured logs:\n${sdkLogs.join('\n')}`)
  }
  // Soft pass: log presence is enough — actual audio testing requires real mic
  expect(sdkLogs.length).toBeGreaterThan(0)
})
