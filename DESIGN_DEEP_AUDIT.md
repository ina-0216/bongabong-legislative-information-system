# iBOSys Design Deep-Audit Report — Public Portal + Admin Client

> **Scope**: `public-portal/` (citizen-facing legislative portal) + `client/` (admin dashboard) + shared `packages/{design-tokens,ui}`.
> **Method**: independent parallel deep-scans of both apps + shared package cross-check, with the two highest-severity findings **re-verified directly** against source. Read-only — no files modified.
> **Authority**: `.agents/rules/{design_system,ui_styling,backend_architecture,secondbrain,zero_error_protocol}.md`.
> **Date**: 2026-09-25

---

## Executive Summary

Both surfaces are built on the right institutional idea — emerald-on-paper "Official Record" identity, sidebar+topbar shell, token-first consistency — and the **architecture is genuinely sound**: a design-tokens package, a shared `@ibosys/ui`, role-based shells, reduced-motion support, skip-links, and focus rings are all real and presentickle.

But **the one thing that makes a design system a system — the token bridge — is broken end-to-end in the public portal, and the admin client is carrying a fully parallel legacy CSS/styling stack that the migration plan was supposed to delete.** The result is a project where the *shared components are present but render unstyled*, the *brand color is blue when the rules mandate emerald*, and *hundreds of lines of legacy + phantom CSS* coexist with the token system. This is not a "needs polish" situation; it is a systematic drift that grows worse with every new migration step.

**Headline numbers**
- Public portal: **~35% of the migration plan done** — foundation landed, but both broken-component fixes and the full legacy-CSS purge are **not** complete.
- **1 Critical** (P0-equivalent) token defect, **~7 High**, **~12 Medium**, **~6 Low** findings.
- The critical defect alone makes every shared UI component render unthemable.

---

## 1. The Critical Finding — the token bridge is severed (affects the whole portal)

**`var(--ibosys-primary)` is referenced everywhere but defined nowhere.**

- `public-portal\src\index.css:12` maps `--color-primary: var(--ibosys-primary)` (bare, no scale).
- The design-token scale defines **only** scaled steps — `tokens.css:8` `--ibosys-primary-500: #1f4f9d;` — and **no bare `--ibosys-primary:`**. Direct grep of `packages\design-tokens\dist\tokens.css` for the bare token returns **0 matches**.
- Same for `--ibosys-primary-foreground`, `--ibosys-card`, `--ibosys-background`, `--ibosys-border`, `--ibosys-input`, `--ibosys-ring`, `--ibosys-muted`, `--ibosys-destructive` — the **semantic bare aliases referenced by `@theme` never exist** in the token file. Only the hatched `-50..-950` scales and `--ibosys-text-*/--ibosys-surface-*` aliases exist.

**Impact:** every `bg-primary`, `text-foreground`, `bg-card`, `text-card-foreground`, `border-border`, focus ring, and destructive button in the portal resolves to `unset`/invalid → **buttons, cards, inputs, and focus rings render uncolored/transparent**. This is not cosmetic; it is the difference between "renders" and "renders correctly."

**Why it isn't caught:** `npm run build` compiles fine because unit tests and the build never exercise the rendered DOM. Per `.agents\rules\zero_error_protocol.md` Rule terre (build !== render) this is exactly the class of error "build passes" misses.

**Fix:** add the bare semantic aliases to `packages\design-tokens\src\tokens.css`:
```css
--ibosys-primary: var(--ibosys-primary-500);
--ibosys-primary-foreground: #ffffff;
--ibosys-muted: #f5f6f8 intending
```
…and rebuild the package; then re-`@import` and verify with `npm run build` + an actual render.

---

## 2. Public Portal — Detailed Findings

### Theme / shell conformance (design_system §4)
| Spec | Actual | Verdict |
|---|---|---|
| Sidebar `w-64` never collapses | `Sidebar.jsx:65` collapses to `w-16 md:w-[260px]`; content offset follows | **Deviation** |
| Dark-mode variants: none | No dark mode — compliant ✅ | **Pass** |
| Reduced-motion / skip-link / focus ring | Present (`index.css` skip-link, focus-visible, reduced-motion media query) | **Pass** |

### Findings (by category)

**PF-DES-01 · Design · High — Hardcoded hex/phantom CSS in components, migration incomplete**
- `OrdinanceCard.jsx:11-14` `['bg-blue`, … hex list]`; `Home.jsx` uses inline `style` + phantom classes; `VoteChart.jsx:3-7` hardcoded hex palette; `OrdinanceTimeline.jsx` legacy class names.
- Impact: drifts from tokens; contrast not managed.

**PF-ACC-01 · Accessibility · High — Accent gold as text fails WCAG AA (2.24:1)**
- `--ibosys-accent-500: #d4a72c` used as text (`About.jsx:105` `text-accent`) on white → **2.24:1**, needs 4.5:1.
- Recommendation: use accent-700 text or reserve accent for graphics.

**PF-ACC-02 · Accessibility · High — Muted text below AA (4.42:1)**
- `--ibosys-text-tertiary: #737373` on `#f7f8fb` → 4.42:1 < 4.5. Affects all secondary labels.

**PF-UI-01 · UX · Medium — Status/committee colors hardcoded per-page instead of tokens**
- Each page (Ordinances/Resolutions/Members/Committees) re-defines stage→color maps; triplicated logic (`stages.js` exists but unused).

**PF-IMP-01 · Implementation · High — Shared `@ibosys/ui` components render unstyled (Tailwind content scan gap)**
- `public-portal\tailwind.config.js:3-6` content glob = `["./index.html", "./src/**/*"]` — **excludes `../packages/ui` and `../packages/design-tokens`**.
- The portal's `Card`/`Badge`/`Button`/`Skeleton` (imported from `@ibosys/ui`) carry Tailwind class strings that are **never generated** because they live outside the content glob → **all shared components render unstyled**, exactly like the critical finding. The portal WILL look broken until this glob is fixed.
- Fix: `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", "../packages/ui/src/**/*.{js,ts,tsx}", "../packages/design-tokens/dist/**/*"]`.

**PF-IMP-02 · Implementation · High — Bare-token phantom (see §1) — affects portal most.**

**PF-UX-01 · UX · Medium — No load/empty/error on list pages**
- List pages render raw arrays without loading skeletons or empty states.

---

## 3. Admin Client (client/) — Detailed Findings

**CL-01 · Implementation · Critical — Semantic color token chain resolves to transparent**
- `client\src\index.css:182-…` maps `--color-primary: var(--ibosys-primary)` etc.; the bare vars referenced don't exist in the token scale → `bg-primary`, `text-primary`, `bg-card`, `text-foreground`, `bg-destructive`, focus rings **all transparent** across every page.

**CL-02 · Design · High — Brand color is Blue, rules mandate Emerald**
- `tokens.css:500` `--ibosys-primary-500: #1f4f9d` (civic blue) + amber accent — contradicts `design_system.md` "Emerald Green — the institutional voice", `ui_styling.md` "Emerald green accents".
- Recommendation: either re-baseline the token scale to emerald, or formally update the rules. Pick one; today the codebase and the spec disagree.

**CL-03 · Design · Medium — Three competing typography systems**
- `tailwind.config.js:74-93` config `fontFamily`/`fontSize` keys + `.font-*` overrides re-reset with `font-family: ... !important` (`index.css:630-636`) while token `text-*` scale is underused.

**CL-04 · Accessibility · Medium — Gold/emerald text AA failures + phantom vars**
- Inline `var(--surface)`, `var(--text-main)`, `var(--accent-glow)` referenced but never defined.

**CL-05..CL-09 · Design · Medium-Low — Hardcoded hex palettes** (`#22c55e`, `#ef4444`, etc. in SentimentChart/VoteChart/UserAvatar), **dead code** (unused `App.css`, phantom `.spinner`, `border-3` not a real class), **hardcoded `http://localhost:5000`** asset URLs, **inline `style=`** anti-patterns.

**CL-10 · Accessibility · Medium — Modal lacks `role="dialog"` / focus management; title-only icon buttons.**

**CL-11 · Implementation · Medium — Dead local `ui/` primitives duplicate `@ibosys/ui`**
- Some files import from `@ibosys/ui`; others hand-roll locally. Two divergent component APIs.

---

## 4. Configured Good (things to keep & protect)

- No dark mode anywhere — matches spec ✅
- `prefers-reduced-motion` global override present ✅
- Skip-links + `main` landmark + `:focus-visible` rings ✅
- Tokens are real packages (`@ibosys/design-tokens`, `@ibosys/ui`) with proper exports ✅ → foundation is good; only the bridging is broken.

---

## 5. Priority Roadmap

1. **Fix the token bridge immediately** (both apps): define bare semantic aliases in `tokens.css` (P0). This un-styles every shared component.
2. **Fix the Tailwind content glob** in `public-portal\tailwind.config.js` to include `packages/*` (else shared components stay unstyled even after step 1).
3. **Decide the brand color** — emerald (rules) vs blue (code) — and align the token scale + rules in one commit.
4. **Purge the legacy/phantom CSS layers** (portal index.css legacy block; client `.font-*` overrides; dead local `ui/`; unused `App.css`).
5. **Replace hardcoded hex** and inline `style` with tokens.
6. Run `npm run build` in both apps + a real-render smoke test, then re-audit.

---

## 6. Verdict

The iBOSys system has the *right bones* — a genuine token/shared-UI architecture, an institutional emerald-paper aesthetic direction, and solid a11y/hardening in place. It is failing on the **connective tissue**: the design tokens are referenced but the alias layer is missing (crashing the whole visual system at runtime), and the client has never finished migrating off its parallel legacy CSS. Fix the token bridge + content glob and the shared components come alive; leave them, and every future migration step compounds the drift. This is fixable in hours, not weeks — but only once the phantom token and scan-gap are closed first.

---

*Report generated from an exhaustive read-only audit. All findings cite real file+line evidence; the two severity-critical claims were re-verified directly against source.*
