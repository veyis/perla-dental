# Auto-Open Chat with Protocol Greeting — Design Spec

**Date:** 2026-05-09  
**Status:** Approved

## Goal

When a visitor lands on the Perla Dental Clinics landing page, the chat assistant opens automatically after a short delay and proactively sends the protocol greeting, inviting the visitor to engage. This removes the friction of manually clicking the chat bubble and starts the 6-step conversation flow immediately.

---

## Behavior

1. **Trigger**: 3.5 seconds after the landing page hydrates on the client.
2. **Condition**: Only fires if `sessionStorage.getItem('perla.chat.autoGreeted') !== 'true'`. This means it happens at most once per browser tab session; closing and reopening the tab counts as a new session.
3. **Action**:
   - Open the floating chat launcher panel (`openLauncher()`).
   - Inject one assistant message into the `useChat` message state (`setMessages`).
   - Set `sessionStorage.setItem('perla.chat.autoGreeted', 'true')` to prevent repeat auto-opens.
4. **Greeting text**: The existing `chat.greeting` translation key — already localized for EN, TR, RU, DE.
5. **Subsequent visits**: The auto-open does not fire. The launcher bubble remains visible; the user must click it manually.

---

## Architecture

All logic lives inside `ChatProvider` (`src/components/chat/chat-provider.tsx`). No new files, no API changes, no new routes.

### Data flow

```
Page hydrates
  → useEffect in ChatProvider
    → sessionStorage check: perla.chat.autoGreeted
      → not set: schedule setTimeout(3500ms)
        → openLauncher()           // sets isLauncherOpen + LAUNCHER_OPEN_KEY
        → setMessages([greeting])  // injects assistant bubble
        → sessionStorage.setItem('perla.chat.autoGreeted', 'true')
      → already set: do nothing
```

### Message injected

```ts
{
  id: crypto.randomUUID(),
  role: 'assistant',
  content: t('greeting'),
  parts: [{ type: 'text', text: t('greeting') }]
}
```

The `content` field satisfies the `UIMessage` type; `parts` is what `ChatMessages` renders. The two are kept in sync (same string).

### Why client-side injection (not a real API call)

The greeting text is deterministic — identical to what the model would generate at step 1 of its protocol. Injecting it client-side is instant, costs nothing, and the model sees it as conversation history on the first user reply, correctly treating step 1 (GREETING) as complete and advancing to step 2 (NEEDS ANALYSIS).

---

## Files Changed

| File | Change |
|---|---|
| `src/components/chat/chat-provider.tsx` | Add `AUTO_GREETED_KEY`, `setMessages` exposure through context, and the auto-open `useEffect` |
| `src/components/chat/use-chat-conversation.ts` | Surface `setMessages` from `useChat` spread (minor — it's already in `...chat`) |

No changes needed to:
- `chat-panel.tsx` — already switches to `<ChatMessages>` when `messages.length > 0`
- `chat-launcher.tsx` — `openLauncher()` is unchanged
- `/api/chat/route.ts` — no server changes
- Translation files — `chat.greeting` key already exists and is localized

---

## Edge Cases

| Case | Handling |
|---|---|
| User already had chat open (LAUNCHER_OPEN_KEY = 'true' from prior session) | `AUTO_GREETED_KEY` check prevents double-greeting; chat restores open but empty |
| Page refresh after auto-open | `AUTO_GREETED_KEY = 'true'` → no auto-open, no greeting injected; chat opens via `LAUNCHER_OPEN_KEY` but shows static chips screen |
| User closes chat within 3.5 s | Timer fires, opens it again. Acceptable (rare race condition; 3.5 s is short) |
| SSR / no window | `useEffect` guard `typeof window === 'undefined'` prevents errors |
