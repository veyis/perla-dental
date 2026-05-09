# Auto-Open Chat Greeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically open the floating chat launcher 3.5 s after the landing page loads (once per tab session) and inject a pre-built assistant greeting message so the 6-step protocol begins without any user action.

**Architecture:** A single `useEffect` in `ChatProvider` checks `sessionStorage` for `perla.chat.autoGreeted`; if absent, it schedules a 3.5 s timeout that calls `openLauncher()` and injects an assistant `UIMessage` via `setMessages`. The greeting text is taken from the existing `chat.greeting` translation key. The `setMessages` function (already present in the `useChat` spread) is surfaced through `ChatContext`.

**Tech Stack:** Next.js App Router, `@ai-sdk/react` `useChat` (AI SDK v6), `next-intl` `useTranslations`, Vitest (unit), Playwright (E2E).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/chat/chat-provider.tsx` | Modify | Add `AUTO_GREETED_KEY`, expose `setMessages` in context, add auto-open effect |
| `tests/e2e/chat.spec.ts` | Modify | Update manual-open test to suppress auto-open; add auto-open E2E test |

`src/components/chat/use-chat-conversation.ts` — **no change needed**: `setMessages` is already part of the `...chat` spread that the hook returns.

---

## Task 1: Expose `setMessages` through `ChatContext`

**Files:**
- Modify: `src/components/chat/chat-provider.tsx`

### Why

`setMessages` (from `useChat`) is already returned by `useChatConversation` but is not typed in `ChatContextValue` and not forwarded to consumers. We need it in the auto-open effect.

- [ ] **Step 1: Add `setMessages` to the `ChatContextValue` type**

In `src/components/chat/chat-provider.tsx`, locate the `ChatContextValue` type (around line 25) and add one field after `sendMessage`:

```ts
type ChatContextValue = {
  locale: Locale
  conversationId: string
  messages: ReturnType<typeof useChatConversation>['messages']
  status: ReturnType<typeof useChatConversation>['status']
  sendMessage: ReturnType<typeof useChatConversation>['sendMessage']
  setMessages: ReturnType<typeof useChatConversation>['setMessages']   // ← add this line
  ttsEnabled: boolean
  setTtsEnabled: (v: boolean) => void
  isLauncherOpen: boolean
  openLauncher: () => void
  closeLauncher: () => void
  isInlineVisible: boolean
  setInlineVisible: (v: boolean) => void
  leadCardState: Record<string, LeadCardState>
  setLeadCardState: (id: string, state: LeadCardState) => void
}
```

- [ ] **Step 2: Destructure `setMessages` from `useChatConversation` and add it to the context value**

Locate the line:
```ts
const { messages, status, sendMessage, conversationId } = useChatConversation({
```

Change it to:
```ts
const { messages, status, sendMessage, setMessages, conversationId } = useChatConversation({
```

Then in the `value` object (around line 108), add `setMessages`:
```ts
const value: ChatContextValue = {
  locale,
  conversationId,
  messages,
  status,
  sendMessage,
  setMessages,          // ← add this line
  ttsEnabled,
  setTtsEnabled,
  isLauncherOpen,
  openLauncher,
  closeLauncher,
  isInlineVisible,
  setInlineVisible,
  leadCardState,
  setLeadCardState,
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors related to `setMessages`.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/chat-provider.tsx
git commit -m "feat(chat): expose setMessages through ChatContext"
```

---

## Task 2: Add the auto-open + greeting injection effect

**Files:**
- Modify: `src/components/chat/chat-provider.tsx`

### Context

`UIMessage` (from `ai` v6) has the shape:
```ts
{
  id: string
  role: 'assistant' | 'user' | 'system'
  metadata?: unknown
  parts: Array<{ type: 'text'; text: string } | /* other part types */ >
}
```

The greeting text lives in the `chat.greeting` i18n key — already localized for `en`, `tr`, `ru`, `de`.

- [ ] **Step 1: Add the `AUTO_GREETED_KEY` constant and import `useTranslations`**

At the top of `src/components/chat/chat-provider.tsx`, add `useTranslations` to the `next-intl` import:

```ts
import { useTranslations } from 'next-intl'
```

Below the existing `LAUNCHER_OPEN_KEY` constant, add:

```ts
const AUTO_GREETED_KEY = 'perla.chat.autoGreeted'
```

- [ ] **Step 2: Call `useTranslations` inside `ChatProvider`**

Inside the `ChatProvider` function body (after the existing `useState` calls), add:

```ts
const t = useTranslations('chat')
```

- [ ] **Step 3: Add the auto-open `useEffect`**

Place this effect after the existing sessionStorage-restore effect (the one that reads `LAUNCHER_OPEN_KEY`) and before the audio-chunks effect:

```ts
// Auto-open once per tab session and inject the protocol greeting.
// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only, all refs are stable
useEffect(() => {
  if (typeof window === 'undefined') return
  if (window.sessionStorage.getItem(AUTO_GREETED_KEY) === 'true') return

  const timer = setTimeout(() => {
    openLauncher()
    window.sessionStorage.setItem(AUTO_GREETED_KEY, 'true')
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        parts: [{ type: 'text', text: t('greeting') }],
      },
    ])
  }, 3500)

  return () => clearTimeout(timer)
}, [])
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke-test manually**

```bash
pnpm dev
```

Open `http://localhost:3000/en` in a fresh tab (no prior sessionStorage). After ~3.5 s the chat panel should animate open and show the assistant bubble:

> "Welcome to Perla Dental Clinics, I am the clinic's digital assistant. How may I help you today?"

Reload the tab — the chat should reopen (from `LAUNCHER_OPEN_KEY`) but show the static chips screen (no greeting bubble, because `AUTO_GREETED_KEY` is already `'true'` so `setMessages` is not called).

Open a brand new tab to `http://localhost:3000/en` — auto-open should fire again (sessionStorage is tab-scoped).

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/chat-provider.tsx
git commit -m "feat(chat): auto-open launcher after 3.5 s and inject protocol greeting"
```

---

## Task 3: Update E2E tests for auto-open behavior

**Files:**
- Modify: `tests/e2e/chat.spec.ts`

### Context

The existing test `"floating launcher opens, focus-trapped panel renders, Esc closes"` manually clicks the launcher button. With auto-open, the panel opens on its own after 3.5 s, making the button invisible before the click. We need to:

1. Set `perla.chat.autoGreeted = 'true'` in sessionStorage before that test so auto-open is suppressed — then the manual-click flow works as before.
2. Add a new test that validates the auto-open and greeting injection.

- [ ] **Step 1: Suppress auto-open in the existing manual-open test**

In `tests/e2e/chat.spec.ts`, find the test `'floating launcher opens, focus-trapped panel renders, Esc closes'` and add a `page.addInitScript` call to set the flag before the page loads:

```ts
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
```

- [ ] **Step 2: Add new auto-open E2E test**

Append this test inside the `'Landing chat assistant — UI structure'` describe block:

```ts
test('chat auto-opens after ~3.5 s and shows the protocol greeting', async ({ page }) => {
  await page.goto('/en')
  const dialog = page.getByRole('dialog', { name: /Perla Concierge/i })
  // Auto-open fires at 3.5 s; allow up to 7 s for slow CI.
  await expect(dialog).toBeVisible({ timeout: 7000 })
  // The greeting must appear as an assistant message bubble, not just the static chips screen.
  await expect(dialog.getByText(/Welcome to Perla Dental Clinics/i)).toBeVisible()
  // Reloading the same tab should not re-trigger the greeting injection.
  await page.reload()
  // Panel re-opens (LAUNCHER_OPEN_KEY is set) but no extra greeting bubble appears;
  // the static chips screen (ChatGreeting) is shown instead.
  const dialog2 = page.getByRole('dialog', { name: /Perla Concierge/i })
  await expect(dialog2).toBeVisible({ timeout: 5000 })
  // The chips screen contains one of the chip labels, not a streamed message list.
  await expect(dialog2.getByRole('button', { name: /Tell me about implants/i })).toBeVisible()
})
```

- [ ] **Step 3: Run the E2E suite (requires dev server)**

```bash
pnpm dev &   # if not already running
pnpm test:e2e --grep "auto-opens|floating launcher"
```

Expected output:
```
✓ chat auto-opens after ~3.5 s and shows the protocol greeting
✓ floating launcher opens, focus-trapped panel renders, Esc closes
```

- [ ] **Step 4: Run full E2E UI-structure suite to check for regressions**

```bash
pnpm test:e2e --grep "UI structure"
```

Expected: all tests pass (live-LLM tests are skipped unless keys are present).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/chat.spec.ts
git commit -m "test(e2e): add auto-open test; suppress auto-open in manual-click test"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Auto-open 3.5 s after page load | Task 2 |
| Once per tab session (sessionStorage guard) | Task 2 |
| Inject assistant greeting message | Task 2 |
| Greeting text from `chat.greeting` key (all locales) | Task 2 |
| No API call for greeting | Task 2 (client-side `setMessages`) |
| `setMessages` surfaced through context | Task 1 |
| E2E test for auto-open | Task 3 |

**Placeholder scan:** None found — all steps include exact code.

**Type consistency:** `setMessages` typed as `ReturnType<typeof useChatConversation>['setMessages']` in Task 1 matches what `useChatConversation` returns (AI SDK `useChat` spread). The `UIMessage` shape used in Task 2 (`id`, `role`, `parts`) matches the `UIMessage` interface from `ai` v6 — no `content` field (it was removed in v6).
