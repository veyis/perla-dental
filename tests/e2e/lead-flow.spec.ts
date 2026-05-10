import { expect, test } from '@playwright/test'

// Smoke tests for landing-page render and locale routing.
//
// The full lead-capture flow with a stubbed `/api/chat` SSE response would
// be more valuable, but the AI SDK 6 UIMessage stream protocol requires a
// hand-crafted byte sequence that is hard to keep in sync with library
// updates. The plan acknowledges this trade-off (Task 40 step 1): real
// lead-capture E2E with an LLM round-trip runs nightly, not in CI.
//
// These three tests catch the most common regressions:
//   - the landing page actually renders for the EN locale,
//   - locale routing produces the right `<html lang>` attribute, and
//   - the privacy page (a static route) still loads.

test('homepage renders hero, mic button, language switcher', async ({ page }) => {
  await page.goto('/en')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /start call/i })).toBeVisible()
  await expect(page.getByLabel('Language')).toBeVisible()
})

test('language switch updates html lang', async ({ page }) => {
  await page.goto('/de')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
})

test('privacy page loads', async ({ page }) => {
  await page.goto('/en/privacy')
  await expect(page.getByText(/privacy policy/i)).toBeVisible()
})
