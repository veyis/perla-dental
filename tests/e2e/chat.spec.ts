import { expect, test } from '@playwright/test'

// E2E for the landing-page chat assistant.
//
// Tests are split into two groups:
//   1. UI-only tests that exercise the structure and don't require a real
//      LLM round-trip (always run).
//   2. Live tests that send messages to /api/chat and assert behavior of
//      the streamed response (only when ANTHROPIC_API_KEY + LEAD_HMAC_SECRET
//      are set; CI without those secrets skips them — same trade-off
//      acknowledged in lead-flow.spec.ts).
//
// The full HITL consent flow (consent card → click → /api/lead/submit
// → success state) is exercised manually per Task 22; mocking the
// AI SDK 6 UIMessage stream byte-protocol in CI is brittle.

const HAS_LIVE_KEYS = Boolean(process.env.ANTHROPIC_API_KEY && process.env.LEAD_HMAC_SECRET)

test.describe('Landing chat assistant — UI structure', () => {
  test('inline section subtitle does not promise pricing', async ({ page }) => {
    await page.goto('/en')
    const section = page.locator('section#chat')
    await expect(section).toBeVisible()
    const text = (await section.locator('p').first().textContent()) ?? ''
    expect(text.toLowerCase()).not.toContain('pric')
    expect(text.toLowerCase()).not.toContain('cost')
  })

  test('inline section heading uses the i18n title', async ({ page }) => {
    await page.goto('/en')
    await expect(
      page.locator('section#chat').getByRole('heading', { name: /Talk to Our Concierge/i }),
    ).toBeVisible()
  })

  test('floating launcher opens, focus-trapped panel renders, Esc closes', async ({ page }) => {
    // Suppress auto-open so we can test the manual click path independently.
    await page.addInitScript(() => {
      sessionStorage.setItem('perla.chat.autoGreeted', 'true')
    })
    await page.goto('/en')
    const launcher = page.getByRole('button', { name: /Open chat with Perla Concierge/i })
    // The launcher entrance is delayed ~1s.
    await expect(launcher).toBeVisible({ timeout: 5000 })
    await launcher.click()
    const dialog = page.getByRole('dialog', { name: /Perla Concierge/i })
    await expect(dialog).toBeVisible()
    // Greeting from the PDF is rendered in the empty state.
    await expect(dialog.getByText(/Welcome to Perla Dental Clinics/i)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('inline section renders the four suggested-prompt chips', async ({ page }) => {
    await page.goto('/en')
    const section = page.locator('section#chat')
    await section.scrollIntoViewIfNeeded()
    for (const label of [
      /Tell me about implants/i,
      /Veneers & smile makeover/i,
      /How does the Dental Holiday work/i,
      /Tell me about your doctors/i,
    ]) {
      await expect(section.getByRole('button', { name: label })).toBeVisible()
    }
  })

  test('locale parity: TR shows the Turkish greeting and chips', async ({ page }) => {
    await page.goto('/tr')
    const section = page.locator('section#chat')
    await section.scrollIntoViewIfNeeded()
    await expect(section.getByText(/Perla Diş Kliniklerine hoş geldiniz/i)).toBeVisible()
    await expect(section.getByRole('button', { name: /İmplantlar hakkında/i })).toBeVisible()
  })

  test('launcher hides while inline section is in viewport', async ({ page }) => {
    await page.goto('/en')
    const launcher = page.getByRole('button', { name: /Open chat with Perla Concierge/i })
    await expect(launcher).toBeVisible({ timeout: 5000 })
    await page.locator('section#chat').scrollIntoViewIfNeeded()
    // IntersectionObserver fires after layout settles.
    await page.waitForTimeout(500)
    await expect(launcher).toHaveCount(0)
  })

  test('chat auto-opens after ~3.5 s and shows the protocol greeting', async ({ page }) => {
    await page.goto('/en')
    const dialog = page.getByRole('dialog', { name: /Perla Concierge/i })
    // Auto-open fires at 3.5 s; allow up to 7 s for slow CI.
    await expect(dialog).toBeVisible({ timeout: 7000 })
    // The greeting must appear as an assistant message bubble.
    await expect(dialog.getByText(/Welcome to Perla Dental Clinics/i)).toBeVisible()
    // Reloading re-opens the launcher (LAUNCHER_OPEN_KEY) but skips injection (AUTO_GREETED_KEY set).
    await page.reload()
    const dialog2 = page.getByRole('dialog', { name: /Perla Concierge/i })
    await expect(dialog2).toBeVisible({ timeout: 5000 })
    // Static chips screen is shown (no injected greeting bubble).
    await expect(dialog2.getByRole('button', { name: /Tell me about implants/i })).toBeVisible()
  })
})

test.describe('Landing chat assistant — live LLM (skipped without keys)', () => {
  test.skip(!HAS_LIVE_KEYS, 'requires ANTHROPIC_API_KEY + LEAD_HMAC_SECRET')

  test('clicking a chip sends a user message and streams an assistant reply', async ({ page }) => {
    await page.goto('/en')
    const section = page.locator('section#chat')
    await section.scrollIntoViewIfNeeded()
    await section.getByRole('button', { name: /Tell me about implants/i }).click()
    await expect(section.getByText(/Tell me about implants/i)).toBeVisible()
    // Assistant bubble has the white-bg styling — wait up to 20s for first text.
    await expect(async () => {
      const html = await section.innerHTML()
      expect(html).toMatch(/bg-white border border-black\/5/)
    }).toPass({ timeout: 20000 })
  })

  test('asking about prices never produces numeric quotes', async ({ page }) => {
    await page.goto('/en')
    const section = page.locator('section#chat')
    await section.scrollIntoViewIfNeeded()
    const ta = section.locator('textarea')
    await ta.fill('How much do veneers cost?')
    await ta.press('Enter')
    await page.waitForTimeout(10000)
    const html = await section.innerHTML()
    expect(html).not.toMatch(/[$€£]\s?\d|TRY|\bUSD\b|\bEUR\b/)
    expect(html).not.toMatch(/\b\d+\s*(dollars|euros|liras|TL)\b/i)
  })
})
