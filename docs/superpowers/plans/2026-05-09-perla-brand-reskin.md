# Perla Brand Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the Perla agent landing page to match the live perladentalclinics.com brand identity (logo + colors), without changing layout, copy, fonts, or agent behavior.

**Architecture:** Pure token swap + asset swap. The codebase already abstracts colors as CSS variables in `globals.css` and references them via Tailwind utilities (`bg-primary`, `text-highlight`), so changing five variable values cascades automatically across ~30 component sites. The navbar's text-based logo gets replaced with the live SVG. One hardcoded hex in `hero.tsx` gets converted to a CSS variable. The favicon is set via Next.js auto-discovery (`src/app/icon.png`).

**Tech Stack:** Tailwind CSS v4 (`@theme` block in CSS), Next.js 16 `app/` router, `next/image`, framer-motion (already imported in navbar). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-09-perla-brand-reskin-design.md`

**Pre-existing assets** (already vendored during spec authoring):
- `public/images/perla-logo.svg` — primary nav lockup, single-color `#25215F`
- `public/images/perla-icon.png` — 300×300 diamond icon
- `public/images/perla-logo-white.png` — reserve asset

---

## Task 1: Swap brand color tokens in globals.css

**Files:**
- Modify: `src/app/globals.css:3-11`

- [ ] **Step 1: Open `src/app/globals.css` and locate the `@theme` block**

The block currently reads:

```css
@theme {
  --color-primary: #1e5f74;
  --color-primary-light: #2d8ca8;
  --color-accent: #f8f4ec;
  --color-highlight: #c9a96e;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #666666;
  ...
}
```

- [ ] **Step 2: Replace the five color values per the spec mapping**

Replace lines 3–7 (the five color values) with the new Perla brand values. Leave `--color-surface`, `--color-text`, and `--color-text-muted` untouched. Leave the `--font-*` and `--shadow-*` lines below untouched.

```css
@theme {
  --color-primary: #25215F;
  --color-primary-light: #4937B8;
  --color-accent: #F2F5F7;
  --color-highlight: #7561EE;
  --color-surface: #ffffff;
  --color-text: #1a1a1a;
  --color-text-muted: #666666;

  --font-body: var(--font-body), system-ui, sans-serif;
  --font-heading: var(--font-heading), system-ui, sans-serif;

  --shadow-premium: 0 20px 50px rgba(0, 0, 0, 0.05);
  --shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}
```

- [ ] **Step 3: Verify zero stale token references remain in `src/`**

Run:

```bash
grep -rni "1e5f74\|c9a96e\|f8f4ec\|2d8ca8" src/ --include='*.tsx' --include='*.ts' --include='*.css'
```

Expected: one match remaining at `src/components/hero.tsx:41` (the hardcoded inline `#1e5f74`). Task 2 fixes this. No other matches.

- [ ] **Step 4: Run a fast typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0 (no type errors — this is a CSS-only change, types unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(brand): swap color tokens to live perladentalclinics.com palette

Primary #25215F (deep indigo, matches logo fill), highlight #7561EE
(vivid purple, matches CTA), primary-light #4937B8, accent #F2F5F7
(cool off-white). Surface, text, text-muted unchanged.

See docs/superpowers/specs/2026-05-09-perla-brand-reskin-design.md §3."
```

---

## Task 2: Convert hardcoded hex in hero.tsx to CSS variable

**Files:**
- Modify: `src/components/hero.tsx:38-44`

- [ ] **Step 1: Open `src/components/hero.tsx` and locate the radial-gradient inline style**

Lines 38–44 currently read:

```tsx
<div
  className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none"
  style={{
    backgroundImage: 'radial-gradient(#1e5f74 0.5px, transparent 0.5px)',
    backgroundSize: '24px 24px',
  }}
/>
```

- [ ] **Step 2: Replace the hardcoded hex with the CSS variable reference**

Replace those lines with:

```tsx
<div
  className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none"
  style={{
    backgroundImage: 'radial-gradient(var(--color-primary) 0.5px, transparent 0.5px)',
    backgroundSize: '24px 24px',
  }}
/>
```

The `var(--color-primary)` reads from the CSS custom property exposed by the `@theme` block in `globals.css`. After this change, the dot pattern adopts whatever `--color-primary` is currently set to (now `#25215F`).

- [ ] **Step 3: Verify zero hex references remain anywhere in `src/`**

Run:

```bash
grep -rni "1e5f74\|c9a96e\|f8f4ec\|2d8ca8" src/
```

Expected: zero matches.

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/hero.tsx
git commit -m "fix(brand): convert hardcoded teal hex in hero to CSS variable

The radial-grid backgroundImage was the only place still hardcoding the
old #1e5f74. Now references var(--color-primary) so it adopts whatever
the brand token is set to."
```

---

## Task 3: Replace navbar text logo with Perla SVG lockup

**Files:**
- Modify: `src/components/navbar.tsx`

- [ ] **Step 1: Read the current navbar to confirm starting state**

Run: `cat src/components/navbar.tsx`

Confirm lines 14–19 contain the placeholder "P" div + "Perla Dental" text:

```tsx
<div className="flex items-center gap-2">
  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
    <span className="text-white font-heading font-bold">P</span>
  </div>
  <span className="font-heading text-xl font-semibold tracking-tight">Perla Dental</span>
</div>
```

- [ ] **Step 2: Replace the entire navbar contents with the Perla SVG lockup**

Overwrite the file with the version below. The full new file contents:

```tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import type { Locale } from '@/i18n/config'
import { LanguageSwitcher } from './language-switcher'

export function Navbar({ locale }: { locale: Locale }) {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass px-6 py-4 flex justify-between items-center"
    >
      <Link
        href={`/${locale}`}
        className="flex items-center"
        aria-label="Perla Dental Clinics"
      >
        <Image
          src="/images/perla-logo.svg"
          alt="Perla Dental Clinics"
          width={140}
          height={32}
          priority
          className="h-8 w-auto md:h-9"
        />
      </Link>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#services" className="hover:text-primary transition-colors">
          Services
        </a>
        <a href="#about" className="hover:text-primary transition-colors">
          About
        </a>
        <a href="#contact" className="hover:text-primary transition-colors">
          Contact
        </a>
      </div>

      <div className="flex items-center gap-4">
        <LanguageSwitcher current={locale} />
        <motion.a
          href="#contact"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-primary text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-primary-light transition-all shadow-md"
        >
          Book Now
        </motion.a>
      </div>
    </motion.nav>
  )
}
```

What changed:
- Added `import Image from 'next/image'` and `import Link from 'next/link'`
- Replaced the inline placeholder div + text wordmark with a single `<Link>` wrapping `<Image>`
- The `<Link>` is keyboard-focusable and routes to `/${locale}` (the page itself, but standard nav-logo behavior)
- `aria-label` on the `<Link>`, `alt` on the `<Image>` (Next.js complains if you have neither, and double-labeling is benign)
- `priority` because the logo is above-the-fold
- `h-8 w-auto md:h-9` lets the SVG scale fluidly while preserving aspect ratio

The rest of the component (nav links, language switcher, "Book Now" CTA) is unchanged.

- [ ] **Step 3: Verify the placeholder text wordmark is gone**

Run:

```bash
grep -n "font-heading text-xl font-semibold" src/components/navbar.tsx
```

Expected: zero matches.

And confirm the SVG path is referenced correctly:

```bash
grep -n "/images/perla-logo.svg" src/components/navbar.tsx
```

Expected: one match.

- [ ] **Step 4: Confirm the asset exists**

Run:

```bash
ls -la public/images/perla-logo.svg
```

Expected: file exists, ~5.7 KB.

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat(brand): replace navbar placeholder with Perla SVG lockup

The placeholder \"P\" tile and \"Perla Dental\" text wordmark are replaced
with the live-site SVG (diamond icon + PERLA DENTAL CLINICS lockup as
one piece). Wrapped in <Link> for home navigation; priority loaded
since it's above-the-fold."
```

---

## Task 4: Wire Perla icon as favicon via Next.js convention

**Files:**
- Create: `src/app/icon.png` (copy of `public/images/perla-icon.png`)

- [ ] **Step 1: Confirm the source asset exists**

Run:

```bash
ls -la public/images/perla-icon.png
```

Expected: file exists, ~4.3 KB, 300×300.

- [ ] **Step 2: Copy the icon to the Next.js auto-favicon path**

Run:

```bash
cp public/images/perla-icon.png src/app/icon.png
```

Why `src/app/icon.png` (not `app/icon.png`): this project uses `src/` directory mode (visible in `tsconfig.json` and the existing `src/app/[locale]/layout.tsx` path). Next.js looks for `app/icon.png` relative to wherever the App Router lives — for `src/`-mode projects, that's `src/app/icon.png`.

- [ ] **Step 3: Verify the file landed**

Run:

```bash
ls -la src/app/icon.png
```

Expected: file exists, ~4.3 KB.

- [ ] **Step 4: Confirm no `<link rel="icon">` tag exists in layout**

Next.js auto-discovers `src/app/icon.png` and injects the appropriate `<link>` tag at build time. Manually adding one would cause duplicate tags. Run:

```bash
grep -n "rel=\"icon\"" src/app/'[locale]'/layout.tsx
```

Expected: zero matches.

- [ ] **Step 5: Typecheck (no-op for this task, but kept as discipline)**

Run: `pnpm exec tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/app/icon.png
git commit -m "chore(brand): set Perla diamond icon as favicon

Drops the icon at src/app/icon.png so Next.js auto-discovers it and
injects the correct <link> tag. Next.js src/-mode routes the auto-icon
file through the App Router root."
```

---

## Task 5: Visual verification at dev server

**Files:** none changed; verification only.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`
Expected: server boots and prints a URL (typically `http://localhost:3000`).

If `pnpm dev` is already running from a prior session, kill it first (`pkill -f 'next dev'`) and re-start so the new globals.css is loaded.

- [ ] **Step 2: Open the page in a browser at the default locale**

Visit: `http://localhost:3000/en` (or whatever default locale resolves to).

- [ ] **Step 3: Confirm each visual change**

Walk through this checklist; each must pass:

- Navbar shows the Perla diamond + "PERLA DENTAL CLINICS" SVG lockup, not a "P" tile + text
- The lockup renders sharp on the glass nav background (no blur, no missing pixels)
- "Book Now" CTA in the navbar is now deep-indigo `#25215F` (was teal)
- Hero headline gradient on the italicized word reads navy → indigo → purple (not teal → cyan → gold)
- The radial dot-grid background pattern in the hero is now indigo (subtle; you may need to lean in)
- The "Trusted by 5k+ Patients" trust badge stars are purple (was gold)
- The browser tab favicon shows the Perla diamond icon (not the Next.js default)
- Resize the browser to mobile width (~360px); the navbar logo scales to `h-8` and does not overflow

- [ ] **Step 4: Confirm no console errors**

Open browser devtools → Console tab. Expected: no red errors. (Some informational logs from framer-motion or Next.js Turbopack are fine.)

- [ ] **Step 5: Final static-check sweep**

Back in the terminal:

```bash
grep -rni "1e5f74\|c9a96e\|f8f4ec\|2d8ca8" src/
```

Expected: zero matches.

```bash
grep -n "Perla Dental" src/components/navbar.tsx
```

Expected: matches only `aria-label="Perla Dental Clinics"` and `alt="Perla Dental Clinics"` — no standalone "Perla Dental" text spans.

- [ ] **Step 6: Run the test suite**

Run: `pnpm test:run`
Expected: all tests green. None of the existing tests assert color values, so the brand swap is invisible to them. If any test fails, **stop and investigate** before continuing — it likely indicates an unrelated regression that this work surfaced.

- [ ] **Step 7: Run the production build**

Run: `pnpm build`
Expected: build succeeds, exit 0. Catches type errors, missing assets, and Next.js Image-config issues that `pnpm dev` won't catch.

- [ ] **Step 8: No commit needed** — verification task only.

If any visual check failed, return to the relevant task (Task 1 for color issues, Task 3 for logo issues, Task 4 for favicon issues) and fix before declaring done.

---

## Self-Review Notes

Coverage check against spec:
- §3.1 Token mapping → Task 1
- §3.2 Hero `#1e5f74` hardcoded hex → Task 2
- §5 Navbar SVG lockup → Task 3
- §4.2 Favicon at `src/app/icon.png` → Task 4
- §6 Verification → Task 5

No spec section is uncovered. No placeholders. Type/path consistency verified across tasks (`/images/perla-logo.svg` referenced in Task 3 matches the asset path created during spec authoring).
