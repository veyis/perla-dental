# Perla Brand Re-skin — Design Specification

**Date:** 2026-05-09
**Status:** Draft, pending user approval
**Source:** Live site `https://perladentalclinics.com/` + clinic-supplied screenshot of hero
**Scope:** Re-skin only. No architectural change.

---

## 1. Goal & Success Criteria

The existing Perla agent landing page (built per `2026-05-08-perla-dental-agent-design.md`) ships in a deep-teal palette (`#1E5F74`) with Outfit/Inter typography. Those defaults were placeholders pending clinic confirmation. The clinic's actual live site uses a deep-indigo + vivid-purple identity. This spec realigns the demo to that real brand using **logo and colors only**.

### Success criteria

- The demo's nav lockup and dominant colors are visually indistinguishable from the live site's brand identity at a glance.
- Zero references to `#1E5F74` / `#C9A96E` / `#F8F4EC` remain in `src/`.
- No new dependencies added.
- No layout, copy, or agent behavior changes.
- `pnpm build` clean, all existing tests still green.

### Explicit non-goals

- No font change (Outfit + Inter stay; Poppins not adopted) — per user decision.
- No layout, hero composition, or section reordering.
- No changes to the voice/chat agent UI (Persona orb, mic button, transcript).
- No changes to copy, i18n messages, knowledge base, or agent prompt.
- No button-shape or nav-pill matching of the live site (deferred).

---

## 2. Brand Source of Truth

Extracted from the live site's CSS (`https://perladentalclinics.com/wp-content/litespeed/css/bd91bd25cfbaa0bb0bb7e8d30f4b4131.css`) and confirmed against the clinic-supplied hero screenshot.

### 2.1. Color tokens

The live site exposes these via Elementor CSS variables:

| Live-site variable | Hex | Role on live site |
|---|---|---|
| `--e-global-color-primary` | `#25215F` | Logo fill, headlines, "Free Consultation" CTA, body text |
| `--e-global-color-secondary` | `#7561EE` | "Get a Quote" CTA, "Prices" CTA, social icons |
| `--e-global-color-03aab39` | `#4937B8` | Lighter indigo, used in gradients |
| `--theme-palette-color-6` | `#F2F5F7` | Cool off-white surface tint |
| `--theme-palette-color-3` | `#3A4F66` | Slate, used for secondary text |

Tertiary blue `#097BAA` appears on a few inline-styled headers; not adopted in this re-skin (would add a fourth brand hue with no clear role).

### 2.2. Logo assets

Three files vendored from the live site into `public/images/`:

| File | Source | Size | Use |
|---|---|---|---|
| `perla-logo.svg` | `/wp-content/uploads/2025/08/perla-dent-logo-1.svg` | 5.7 KB, viewBox 665×580 | Primary nav lockup |
| `perla-icon.png` | `/wp-content/uploads/2025/09/Perla-icon-300x300.png` | 4.3 KB, 300×300 | Favicon (`app/icon.png`) + agent avatar reserve |
| `perla-logo-white.png` | `/wp-content/uploads/2025/08/Perla-White-Logo.png` | 7.6 KB | Reserved for any future dark-bg surface |

The SVG is a single-color path (`fill: #25215F`), composed of: a stylized diamond glyph (the "P" in negative space), the "PERLA" wordmark, and a "DENTAL CLINICS" subtext. It functions as a complete lockup at navbar size — no separate icon + text needed.

These are clinic-owned brand assets used for a demo built for that same clinic; vendoring is the correct posture (no hot-linking; no breakage if their CMS reorganizes).

---

## 3. Token Mapping

| CSS variable | Today | New | Reason |
|---|---|---|---|
| `--color-primary` | `#1E5F74` | `#25215F` | Direct: matches live `--e-global-color-primary` and SVG fill |
| `--color-primary-light` | `#2D8CA8` | `#4937B8` | Live-site lighter-indigo from `--e-global-color-03aab39` |
| `--color-highlight` | `#C9A96E` | `#7561EE` | Live secondary purple — the energy/CTA accent |
| `--color-accent` | `#F8F4EC` | `#F2F5F7` | Cool off-white from `--theme-palette-color-6` |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | Unchanged |
| `--color-text` | `#1A1A1A` | `#1A1A1A` | Unchanged (accessibility; live site uses `#25215F` for body but `#1A1A1A` reads cleaner at small sizes) |
| `--color-text-muted` | `#666666` | `#666666` | Unchanged |

### 3.1. Downstream visual consequences

Two consequences of the swap that the user has accepted:

1. **Hero gradient changes hue family.** The blob `bg-gradient-to-r from-primary via-highlight to-primary-light` becomes navy → purple → lighter-indigo (was teal → gold → cyan). Renders modern and on-brand; no code change beyond the token swap.
2. **Star icons in the trust badge become purple.** `fill-highlight text-highlight` is currently used at `hero.tsx:74` and `hero.tsx:201` for review stars. With the new highlight token they render purple instead of gold. User chose to accept this as cohesive with the brand rather than introducing a separate `--color-star` token.

### 3.2. The `text-gradient` utility

`globals.css` defines `.text-gradient` as `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-highlight) 100%)`. Used in the hero headline italic word. After the swap: navy → indigo → purple — a tighter, more sophisticated gradient than the prior teal → cyan → gold. No edit needed.

---

## 4. Files Changed

### 4.1. Edits (4 files)

| File | Change |
|---|---|
| `src/app/globals.css` | Replace five `--color-*` values per the table in §3 |
| `src/components/hero.tsx:41` | Replace hardcoded `#1e5f74` in the inline `backgroundImage: 'radial-gradient(...)'` style with `var(--color-primary)` |
| `src/components/navbar.tsx:14-19` | Replace the "P" placeholder div + "Perla Dental" wordmark span with a single `<Image src="/images/perla-logo.svg" alt="Perla Dental Clinics" width={140} height={32} priority />` |
| `src/app/[locale]/layout.tsx` | No edit needed if we use Next.js `app/icon.png` convention; favicon is auto-discovered |

### 4.2. Adds (3 assets)

| File | Source |
|---|---|
| `public/images/perla-logo.svg` | Vendored from live site (already copied during spec authoring) |
| `public/images/perla-icon.png` | Vendored from live site (already copied) |
| `public/images/perla-logo-white.png` | Vendored from live site, reserve asset (already copied) |
| `src/app/icon.png` | Copy of `perla-icon.png` to enable Next.js auto-favicon |

### 4.3. No-touch list

The following are explicitly out of scope and must not be modified:

- `src/lib/agent/**` — agent brain
- `src/lib/voice/**` — voice pipeline
- `src/lib/leads/**` — lead capture
- `messages/**` — i18n strings
- `src/components/voice-call.tsx`, `mic-button.tsx`, `ai-elements/**` — agent UI
- `src/components/landing-page.tsx`, `services.tsx`, `about.tsx`, `contact.tsx`, `trust-strip.tsx` — these reference brand tokens by *name* (`bg-primary`, `text-highlight`) and update automatically via the CSS variable swap
- All API routes (`src/app/api/**`)
- `package.json` and dependencies

---

## 5. Navbar Detail

Current `navbar.tsx:14-19`:

```tsx
<div className="flex items-center gap-2">
  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
    <span className="text-white font-heading font-bold">P</span>
  </div>
  <span className="font-heading text-xl font-semibold tracking-tight">Perla Dental</span>
</div>
```

After:

```tsx
<Link href={`/${locale}`} className="flex items-center" aria-label="Perla Dental Clinics">
  <Image
    src="/images/perla-logo.svg"
    alt="Perla Dental Clinics"
    width={140}
    height={32}
    priority
    className="h-8 w-auto md:h-9"
  />
</Link>
```

**Decisions baked in:**
- Wrapped in `<Link>` for home navigation (was static text before).
- `priority` set because the logo is above-the-fold.
- `h-8 w-auto md:h-9` lets the logo scale fluidly while the SVG handles aspect ratio.
- `alt` text matches brand for accessibility (screen readers, SEO).
- The SVG fill is `#25215F`; on the navbar's `glass` (translucent white blurred) background it reads with strong contrast.

---

## 6. Verification

After implementation:

1. **Static checks** — zero matches:
   ```bash
   grep -rn "1e5f74\|c9a96e\|f8f4ec" src/  # expect zero
   grep -rn "Perla Dental\b" src/components/navbar.tsx  # expect zero (replaced by SVG alt)
   ```
2. **Build clean** — `pnpm build` exits 0.
3. **Tests green** — `pnpm test:run` passes (no test should depend on color values).
4. **Visual eyeball at `pnpm dev`:**
   - Navbar logo renders sharply on glass background, reads "PERLA DENTAL CLINICS"
   - Hero headline gradient now reads navy → indigo → purple (no gold)
   - Hero radial-grid dot pattern is now indigo (was teal)
   - Hero "Trusted by 5k+ Patients" badge stars are purple
   - Mobile narrow viewport: logo doesn't overflow, scales to ~h-7
   - Favicon shows the diamond icon in the browser tab
5. **Lighthouse a11y** — logo `<Image>` has `alt`; no contrast regression on text against the new background tints.

---

## 7. Implementation Order

A single PR. Suggested commit sequence for clarity:

1. `chore(brand): vendor Perla logo assets to public/images/`
2. `feat(brand): swap color tokens to live-site indigo/purple palette`
3. `feat(brand): replace navbar placeholder with Perla SVG lockup`
4. `chore(brand): set Next.js auto-favicon to Perla icon`

Each commit independently passes lint + build.

---

## 8. Open Questions

None at this time. All scope decisions captured in §1's non-goals.

If, after seeing the result live, the clinic decides they want stars to stay gold or to also adopt Poppins, those are follow-up tickets — not blockers.

---

## 9. References

- Prior brand spec (placeholder defaults): `docs/superpowers/specs/2026-05-08-perla-dental-agent-design.md` §9.4
- Live site: `https://perladentalclinics.com/`
- Live SVG logo: `https://perladentalclinics.com/wp-content/uploads/2025/08/perla-dent-logo-1.svg`
- Live CSS: `https://perladentalclinics.com/wp-content/litespeed/css/bd91bd25cfbaa0bb0bb7e8d30f4b4131.css`

---

**End of specification.**
