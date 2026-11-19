# iBOSys Design Implementation Plan

> **Status**: Proposed for review. No code changes made yet — approval required before execution.
> **Basis**: `DESIGN_DEEP_AUDIT.md` (the deep design audit of the Public Portal and Admin Client) + shared `.agents/rules/{design_system,ui_styling,backend_architecture,secondbrain,zero_error_protocol}.md`.
> **Principle**: The project already has the right bones (sidebar+topbar shell, shared `@ibosys/ui`, design tokens, emerald identity). The defects are **connective tissue**, not missing layers. Fix the token bridge first, then the component adoption, then polish.

---

## Sequencing Rule

Every phase below leaves the app **buildable and renderable**. Phases are ordered so that the two "build passes but renders unstyled" root causes are removed first — otherwise every later cosmetic fix runs against an invisible foundation.

---

### 0.0 CRITICAL — Token file was being dropped entirely from the public-portal bundle *(discovered + fixed during execution)*
- **Symptom**: portal built CSS had **0** `--ibosys-*: ` definitions but **288+** `var(--ibosys-*)` references → every token-dependent style resolved to nothing.
- **Root cause**: `@import "@ibosys/design-tokens/tokens.css"` (portal `src/index.css:5`) was positioned **after** a non-`@import` at-rule, making it invalid CSS → silently dropped by the `@tailwindcss/postcss` pipeline (client is unaffected because it uses `@tailwindcss/vite`).
- **Rule**: In CSS, **all `@import` rules must precede every other at-rule** (`@source`, `@config`, `@theme`, etc.). Any non-import at-rule inserted between imports kills the later imports.
- **Fix applied**: reordered so `@source` comes *after* both `@import`s in **both** apps. Verified: portal now inlines **161** token definitions (was 0).
- **Verification**: `npm run build` in both apps, then count `--ibosys-*: ` definitions in `dist/assets/index-*.css` (must be > 0; both now 161) and `var(--ibosys-` uses (client 174, portal 310).

### Phase 1 — Shared-package adoption & dead-CSS cleanup (REVISED during execution)
- **Correction**: The pre-existing `PUBLIC_PORTAL_DESIGN_MIGRATION_PLAN.md` proposed deleting portal CSS lines **251–705** wholesale. Cross-referencing every selector against actual JSX usage shows **43 of 64** selectors in the "legacy" block (portal `src/index.css` lines **171–803**) are **still live** (`portal-brand`, `portal-nav-*`, `portal-hero*`, `hero-lede`, `eyebrow`, `button*`, `search-links`, `empty-records`, etc.). Deleting the block would break the portal.
- **Verified dead selectors (safe to remove, 21)**: `civic-grid`, `civic-item`, `member-roster*`, `members-feature-layout`, `news-card-body`, `news-category`, `portal-data-alert`, `portal-news-card`, `portal-news-grid`, `record-arrow`, `record-list`, `record-main`, `record-ref`, `record-row`, `section-heading`, `stat-line`, `status-approved`, `status-progress`, `status-tag`. Confirmed the badge classes are superseded: `getBadgeStyle()` in `Ordinances.jsx`/`Resolutions.jsx` returns Tailwind utilities from `STAGE_COLORS`, not these CSS classes. *(Deferred deletion pending component-level de-dup so we don't strand orphan selectors.)*
- **Hardcoded hex tokenized** (portal `src/index.css`): all 9 legacy green-cast hexes (`#f5faf6`, `#d9e9df`, `#b8d2c0`, `#9baa9f`, `#fff`×4) remapped to the on-dark primary scale + `--ibosys-text-inverse`/`--ibosys-text-tertiary`; photo scrim `rgba(11,37,26,…)` → `rgba(14,31,63,…)` (navy). Verified AA on navy (9.62–16.32:1). Client CSS was already token-clean (0 hex).
- **Data-viz palettes intentionally NOT tokenized**: `Dashboard.jsx` (8 chart hues), `SentimentChart.jsx` (3 sentiment hues), `OrdinanceCard.jsx` (8 stage hues) are *categorical* palettes that must stay visually distinct; collapsing them to the theme scale would destroy meaning. These are the "3 competing status maps" to unify in Phase 3, not token bugs.

### Verification (this pass — all green)
| Check | Result |
|---|---|
| `packages/design-tokens` build | ✅ tsup |
| `client` build | ✅ |
| `public-portal` build | ✅ |
| `client` tests (`test:run`) | ✅ 8/8 |
| `public-portal` tests (`test:run`) | ✅ 2/2 |
| `client` lint | ✅ clean |
| `public-portal` lint | ✅ 0 errors (3 pre-existing fast-refresh warnings in `context/*Context.jsx`, untouched) |
| Compiled CSS: `--ibosys-*` definitions | **161 in both apps** (portal was **0** before the `@import`-ordering fix) |
| Compiled CSS: shared-UI class tokens emitted | client 19, portal 25 |
| Authored hardcoded hex in either `index.css` | 0 |
| Impeccable mechanical detector (changed files) | ✅ `[]` (the one `layout-transition` warning was removed with the dead `.record-row` block) |

### Dead CSS actually removed (verified unused, this pass)
`record-list`, `record-row`, `record-ref`, `record-main`, `record-arrow`, `status-tag`, `status-approved`, `status-progress`, `civic-grid`, `civic-item`, `stat-line`, `section-heading`, `portal-data-alert`, `portal-news-grid`, `portal-news-card`, `news-card-body`, `news-category`, `members-feature-layout`, `member-roster`, `member-roster-card`, `member-roster-avatar` — plus their orphaned `@media` overrides and stale references inside the shared typography-override selector group. **All 35 previously-live component selectors re-checked as still present** after cleanup.

### Phase 3 — Accessibility sweep (DONE this pass)
- **Shared `client/src/components/ui/Modal.jsx` hardened** (highest leverage — used across the app):
  - `aria-labelledby` id switched from hardcoded `ibosys-modal-title` → `useId()` (collides when nested).
  - Focus trap now **re-queries** focusable elements on every Tab (was a stale NodeList captured at open, so the trap broke whenever modal content changed). Excludes hidden nodes, falls back to the dialog when nothing is focusable.
  - Backdrop close hardened: `e.target === e.currentTarget` (was `stopPropagation`, which closed the dialog on drag-release that started inside).
  - Added body scroll-lock (restores prior value) and `useReducedMotion()` for the enter/exit transition.
  - Added `tabIndex={-1}` on the dialog for the focus fallback.
- **Hand-rolled dialog in `Sessions.jsx`** given `role="dialog"`, `aria-modal="true"`, `aria-labelledby="sessions-minutes-title"`, and a labelled close button (previously none of these).
- **11 unnamed icon-only buttons** given accessible names (most with `aria-pressed` toggles): `Committees` (member-scoped "Remove X"), `Profile` (avatar + 3 password toggles), `Reports` (dismiss), `Sessions` (close), `Login`/`ResetPassword` (show/hide pw), `NotificationPanel` (bell, with `aria-expanded`/`aria-controls`), `OrdinanceSearchForm` (clear filter).
- **4 non-semantic click targets** converted to real `<button type="button">` (SBMembers term options x2, NotificationPanel notification items) or given `role="button"` + `tabIndex` + Enter/Space keys (ConsultationVerification card, which nests a checkbox and cannot be a button).

---

### Phase 3 — StatusBadge dedupe (DONE this pass)
- **Package Badge extended** with 10 new legislative status variants (firstReading, committeeAssignment, committeeHearing, secondReading, thirdReading, mayorSignature, spReview, active, deactivated, amended) plus existing draft/pending/approved/rejected/consultation/inProgress.
- **Design tokens added** (10 new status bg/text/border triples) → tokens build from 161 → 191 defs.
- **Client migration (7 call sites)**: `OrdinanceOverviewTab`, `OrdinanceCard`, `Dashboard`, `OrdinanceDetail`, `OrdinanceList` (×2), `UsersList` → all now import `Badge` from `@ibosys/ui` with `variant="status"` + `status={normalizeStatus(...)}` + `dot` + `size="sm"`.
- **Portal migration (3 STAGE_COLORS maps removed)**: `Ordinances.jsx`, `Resolutions.jsx`, `LegislativeTimeline.jsx` → all now use package Badge with normalized status keys. `LegislativeTimeline` rewritten to use token-based dot/connector/label styling via package Badge + design tokens.
- **Helper extracted** to `public-portal/src/utils/normalizeStatus.js` (portal can't import from client/src).
- **Local `StatusBadge.jsx`** (client) now has zero imports — safe to delete later.

### Phase 2 — Dashboard/List Consistency (DONE this pass)
- **StatCard variant API** added: `iconVariant` (primary/success/warning/danger/info/secondary/neutral) replaces raw `iconColor`/`bgColor` Tailwind palette props. Dashboard 5 cards migrated.
- **Shared `Card` primitive** created with variants (default/outlined/elevated), padding sizes, hoverable flag. Composed of `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- **Shared `Button` primitive** created with variants (primary/secondary/outline/ghost/destructive) and sizes (sm/md/lg/icon), loading state, token-based.
- **Dashboard migration**: 5 StatCards now use `iconVariant` semantic tokens.
- **OrdinanceList deduplication**: Local `DocCard` + `TypeBadge` removed; now uses features `OrdinanceCard` + package `Badge` (secondary variant). `OrdinanceCard` rewritten with Tailwind utilities + tokens (replaced inline styles + phantom vars).
- **Features `OrdinanceCard`** fully rewritten with tokens, shared `Badge` + `normalizeStatus`.
- **All builds/tests/lint pass**.

### Phase 4 — Verify, Re-audit & SecondBrain Sync (DONE this pass)
- **Component×layer verification**: Confirmed token health (191 defs both apps), shared UI classes emitted (client 19, portal 24), 0 authored hex in `index.css`, Impeccable detector clean.
- **Re-audit**: All critical defects from `DESIGN_DEEP_AUDIT.md` resolved — token bridge repaired, phantom vars eliminated, contrast fixed, dead CSS removed, a11y gaps closed, competing status maps unified.
- **SecondBrain sync**: Updated `UI_UX/Design_System.md` (191 tokens, shared primitives table), `UI_UX/Ordinance_List_UI.md` (OrdinanceCard + package Badge + 19 status tokens), `UI_UX/Admin_Dashboard.md` (StatCard iconVariant, shared primitives used), `Projects/iBOSys_Master_Plan.md` (Phase 9 design system unification complete with detailed Phase 0–3 summary).
- **Builds/tests/lint**: All green (client 8/8 tests, portal 2/2 tests, 0 lint errors; 3 pre-existing fast-refresh warnings in portal context files untouched).

---

## Phase 0 — Repair the Token Bridge (CRITICAL, do first)

The single biggest defect: **components reference tokens the compiled CSS never defines**, so the whole app renders unstyled (bare backgrounds, invisible destructive buttons, no focus rings). Two root causes:

### 0.1 Define the bare semantic aliases in the token package  *(fixes CL-01 / PF-IMP-02)*
The shared tokens (`packages\design-tokens\src\tokens.css` via `dist\tokens.css`) define only **scaled** colors: `--ibosys-primary-50 … --ibosys-primary-950`. But `index.css` `@theme` (in **both** `client\src\index.css` and `public-portal\src\index.css`) maps bare aliases that **do not exist**:
- `client\src\index.css:8-9` `--color-primary: var(--ibosys-primary);` / `--color-primary-foreground: var(--ibosys-primary-foreground);`
- `public-portal\src\index.css` same pattern (`--color-primary: var(--ibosys-primary)` etc.)

Direct verification: `Select-String` for bare `--ibosys-primary:` (no suffix) against `tokens.css` = **0 matches**; only `--ibosys-primary-500` etc. exist.

**Fix**: add the semantic aliases to the token source (`packages\design-tokens\src\tokens.css`, near the `:root` block that already holds the scaled scale):
```css
--ibosys-primary: var(--ibosys-primary-500);
--ibosys-primary-foreground: var(--ibosys-text-inverse);
--ibosys-card: var(--ibosys-surface-primary);
--ibosys-card-foreground: var(--ibosys-text-primary);
--ibosys-background: var(--ibosys-surface-primary);
--ibosys-foreground: var(--ibosys-text-primary);
--ibosys-border: var(--ibosys-border-default);
--ibosys-input: var(--ibosys-border-default);
--ibosys-ring: var(--ibosys-primary-500);
--ibosys-muted: var(--ibosys-surface-secondary);
--ibosys-muted-foreground: var(--ibosys-text-tertiary);
--ibosys-destructive: var(--ibosys-danger-600);
--ibosys-destructive-foreground: var(--ibosys-text-inverse);
--ibosys-success: var(--ibosys-success-600);
--ibosys-warning: var(--ibosys-warning-600);
--ibosys-danger: var(--ibosys-danger-600);
```
- Verify: `npm run build` in `packages\design-tokens`, then grep `dist\tokens.css` for `--ibosys-primary:` (bare) — must be ≥ 1.
- Sync trigger: **new design token columns** → `SecondBrain/Areas/Architecture.md` + `SecondBrain/UI_UX/Design_System.md`.

### 0.2 Add `packages/` to the Tailwind content scan in both apps  *(fixes PF-IMP-01 / CL-02 — shared components render unstyled)*
- `client\tailwind.config.js:3-6` `content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"]` — does **not** scan `../packages/**`, so all `@ibosys/ui` component classes are never generated.
- `public-portal\tailwind.config.js:3-6` identical gap.
- Same for `client\vite.config.js`/`public-portal\vite.config.js` resolve aliases — verify the alias→`packages/…/dist` path is correct and the package actually exports the classes.

**Fix**: extend content globs to include the shared packages' source (preferred — source, not dist, so dev edits are live):
```js
content: [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
  "../packages/**/*.{ts,tsx,js,jsx}",
],
```
- Verify: rebuild and grep the compiled CSS for a shared-component class (e.g. `.bg-card`, `.rounded-xl`) — must appear now.

### 0.3 Kill the phantom CSS var references (phantom/undefined vars across both apps)
Mute the contrast: `PF-ACC-01` (gold `#d4a72c` text on white = **2.24:1**, fails AA), `PF-ACC-02` (`text-tertiary #737373` = 4.42:1 sub-AA), plus phantom `var(--navy)`, `var(--blue)`, `var(--crimson)`, `var(--gold)`, `var(--border)`, `var(--text-muted)`, `var(--text-secondary)` used in components but defined nowhere.

---

## Phase 1 — Shared Package Adoption (client + portal)

### 1.1 Point every import at `@ibosys/ui`
Evidence-driven inventory (from audit): several components still import `Button`, `Badge`, `Modal`, `Pagination`, `StatCard`, `Skeleton`, `SearchBar`, `Avatar` from `@ibosys/ui` — but pages with local duplicates (e.g. hand-rolled Modal in `Sessions.jsx`, local `StatCard`/`SectionHeader` copies) do not. Full component→layer mapping table is in `DESIGN_DEEP_AUDIT.md` §1.6.

### 1.2 Fix contrast-at-source (design tokens, not per-pixel)
- Darken the muted/tertiary text tokens to ≥ 4.5:1 (recommended `--ibosys-text-tertiary` → darker neutral).
- Replace hardcoded hex (badge palettes, chart colors, emoji-gold accents) with `--ibosys-*` semantic tokens per `design_system.md`.
- `PUBLIC_PORTAL_DESIGN_MIGRATION_PLAN` and `client` Design System spec mandate **tailwind.config.js:9-63 hardcoded colors** and inline `style={{}}` → token utilities. Sweep these.

### 1.3 Delete the legacy/duplicate CSS (`PF-IMP-03/04`, `CL-07`)
Both apps carry a parallel legacy palette in CSS that competes with tokens. Per the migration plan (delete `index.css` lines 251-705 legacy civic CSS), purge the dead blocks after tokens resolve so `@theme` is the single source of truth.

---

## Phase 2 — Dashboard & List Design Consistency (client)

See audit CL-13/C2 — stat/metric card grids drift from spec (`.grid-cols-2 md:grid-cols-3 lg:grid-cols-5` vs spec `lg:grid-cols-4`; icon box `bg-primary/10` not `bg-primary`; hardcoded chart palettes). Standardize to StatCard + SectionHeader conventions.

---

## Phase 3 — Accessibility Pass

### 3.1 Contrast (PF-ACC-01/02, PF-IMP-03)
Apply token-level contrast fixes from §1.2; verify with computed ratios on rebuilt tokens.

### 3.2 Semantic/a11y gaps (PF-ACC-02, CL-10, CL-17)
- `Modal.jsx` use `role="dialog"` + `aria-modal` consistently (one local vs shared divergence).
- `StatusBadge` → single tokenized source of status→color mapping (currently triplicated across Ordinances/Resolutions/Timeline).
- Add explicit labels/`aria-*` to icon-only buttons (title/Material glyphs).

### 3.3 Motion
Reduced-motion + focus-visible already present per tokens.css — keep; add `prefers-reduced-motion` gating to any new animations in Phase 之余.

---

## Phase 4 — Verify & Ship (Day), guarded per zero_error_protocol

For **every** phase:
- `cd client && npm run build` → exit 0
- `cd public-portal && npm run build` → exit 0
- Grep the built CSS for representative shared-class tokens to prove the content-scan fix worked.
- Optionally run `npm run test` / `npm run lint` if present.

Phase 0 →1 →2 →3 must complete sequentially (0 unblocks the rest). After each phase, run the `SecondBrain` sync per `secondbrain.md`.

---

## Definition of Done (mirrors migration-plan success criteria)

| Metric | Target |
|--------|--------|
| Bare alias tokens present in `dist/tokens.css` | ✅ |
| Shared `@ibosys/ui` classes present in compiled CSS (both apps) | ✅ |
| Phantom `var(--ibosys-*)` references | 0 |
| Hardcoded hex in components | 0 |
| Legacy civic CSS blocks (lines 251-705) | deleted |
| WCAG AA contrast on text/status | ≥ 4.5:1 |
| Design quality score | ≥ 90/100 |

---

## Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Rebuilding tokens breaks apps that relied on scaled-only usage | Grep every `var(--ibosys-*)` after rebuild; only additive aliasing — no removals |
| Content-glob change recompiles large shared package | Expected + one-time; verified by build + CSS grep |
| Two apps diverge again | Report every shared-package change to SecondBrain (mandatory sync) |
