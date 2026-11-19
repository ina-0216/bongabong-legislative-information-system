# iBOSys public portal

Public-facing legislative record for the Municipality of Bongabong, Oriental
Mindoro. Built with React 19, Vite 8 and Tailwind v4.

---

## Prerequisite: build the workspace packages first

**There is no npm workspace root.** Each package has its own `package.json`,
lockfile and `node_modules`. The portal's Vite aliases resolve the shared
packages to their built output:

```js
'@ibosys/design-tokens' -> ../packages/design-tokens/dist
'@ibosys/ui'            -> ../packages/ui/dist
'@ibosys/api'           -> ../packages/api/dist
```

On a fresh clone those `dist/` directories do not exist, so `npm run build`
fails on unresolved aliases. Build them in this order — `ui` depends on
`design-tokens`:

```bash
cd packages/design-tokens && npm ci && npm run build
cd ../ui                  && npm ci && npm run build
cd ../api                 && npm ci && npm run build
cd ../public-portal       && npm ci
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5174 |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run lint` | oxlint |
| `npm run test:ci` | Vitest, single run |
| **`npm run verify`** | **The gate: lint, test, build, budgets, rendered audit, design contract, visual diff** |
| `npm run budgets` | Bundle budget gate (needs a prior build) |
| `npm run audit:rendered` | Real-Chromium DOM audit (needs a prior build) |
| `npm run design:source` | Design-contract static audit (shape, motion, focus, tokens) |
| `npm run design:rendered` | Design-contract composition audit in Chromium (needs a prior build) |
| `npm run audit:i18n` | Fail on user-visible copy hardcoded outside `t()` |
| `node scripts/visual-diff.mjs` | Pixel diff; two budgets (1200 px absolute, 0.1% ratio), masks photographic regions and reports the excluded share per image |
| `npm run screenshots` | Full-page screenshots, 12 routes x 3 viewports |
| `npm run visual:diff` | Pixel-diff the current build against `.visual-baseline/baseline` |
| `npm run visual:update` | Accept the current output as the new baseline |
| `npm run baseline:check` | Verify baseline images against `manifest.json` (hashes) |
| `npm run baseline:write` | Re-record the baseline manifest |
| `npm run analyze` | Build with a bundle-composition HTML report |
| `node scripts/report-top.mjs [n]` | Print the largest modules in the terminal |
| `node scripts/generate-translation-checklist.mjs` | Regenerate `docs/translation-checklist.md` |

`npm run verify` is what CI runs. Run it before claiming anything works.
It requires a prior `npx playwright install chromium` on a fresh machine.

## Browser setup

The rendered audit and the visual diff both drive real Chromium:

```bash
npx playwright install chromium
```

`npm ci` does **not** download browsers, which is why CI installs Chromium
before running `verify`.

## Verification layers

| Layer | Tool | Covers |
| --- | --- | --- |
| Lint | oxlint | code errors |
| Tests | Vitest + Testing Library | 85 tests: DOM structure, sanitiser, i18n, contrast maths, axe, design contract |
| Static a11y | axe-core in jsdom | ARIA/landmarks. **Colour contrast is disabled here** — jsdom has no layout, so contrast is computed numerically in `tokens.contrast.test.js` |
| Bundle | `scripts/check-budgets.mjs` | Initial JS, largest chunk, CSS, fonts. Fails if fonts are referenced but not emitted |
| **Rendered** | `scripts/audit-rendered.mjs` | Real Chromium at 390 / 768 / 1280: fonts load, no horizontal overflow, tap targets, **measured** contrast, single `h1`, console errors |
| **Design (source)** | `scripts/audit-design-source.mjs` | Shape lock, motion token, hero padding cap, reduced-motion, global focus, measure token. Contract in `design-contract.mjs` |
| **Design (rendered)** | `scripts/audit-design-rendered.mjs` | Band rhythm, desktop prose measure, single-line CTAs. Density and kicker rules report only |
| **Visual** | `scripts/visual-diff.mjs` | Pixel diff against a stored baseline, 36 images, 0.1% tolerance |

The rendered audit proves the CSS and fonts work in a browser. The visual diff
proves they did not change unexpectedly. The design contract stops the visual
standard drifting from the one v11 actually ships. None of them judge whether
the design **looks** good — that still needs a human, and the process for that is
in [`docs/design-review.md`](docs/design-review.md).

### Visual baselines

`.visual-baseline/baseline/` holds 36 PNGs plus a `manifest.json` of SHA-256
hashes, and **should be committed**. `.visual-baseline/current/` and
`/diff/` are regenerated every run and are git-ignored.

`npm run baseline:check` verifies the committed images against the manifest.
This matters because the project is not yet under version control, so there is
no history to detect a hand-edited baseline against; the manifest provides that
protection. If a baseline is intentionally changed, run
`npm run visual:update && npm run baseline:write`.

On a failing diff, images land in `.visual-baseline/diff/` for inspection.

Capture is fully deterministic here — baseline versus itself measured
**0.0000%** difference — so any non-zero diff is a real change. The 0.1%
tolerance is only headroom for font rasterisation differences between machines.

## Budgets

Budgets are on **gzipped** size, because that is the transfer cost.

| Budget | Limit | Current |
| --- | --- | --- |
| Initial JS | 210 KB | ~189 KB |
| Largest chunk | 105 KB | ~95 KB |
| CSS | 20 KB | ~18 KB |
| Fonts (woff2) | 65 KB | ~62 KB |

`vendor-charts` (recharts) is deliberately excluded from the initial set: it
loads only on `/document/:id`.

## Design system

- `src/v11.css` holds the Bayan Hall design layer: flat bands, hairline rules,
  serif headlines, mono for document numbers.
- **No literal hex values are permitted** in that file. Every colour resolves to
  a shared token, or to a `color-mix()` derivation of one, because
  `src/index.css` sets that policy and `@ibosys/design-tokens` is shared with
  other apps. `tokens.contrast.test.js` enforces it.
- Fonts are self-hosted via `@fontsource/source-serif-4` (Latin subset only).
  Do not reintroduce a Google Fonts CDN import: it hands every visitor's IP to
  an external host, which a municipal public-service site should not do.
- Imports of `@fontsource` must live in `main.jsx`, not a CSS file. Importing
  them from CSS left `url()` unresolved and the woff2 files were never emitted.

## i18n

`src/context/LanguageContext.jsx` holds `en` and `tl`. `t()` falls back to
English when a Tagalog value is `null`, so untranslated strings never render as
machine guesses. Current state: **53% drafted, 47% outstanding**, and the
drafted strings have **not** been reviewed by a municipal translator. See
`docs/translation-checklist.md`.

## Known gaps

- Tagalog needs a human translator; do not machine-translate civic or legal copy.
- **The project is not under version control.** `.gitignore` files and a CI
  workflow are in place, but nothing is committed yet, so the baseline images
  and the CI workflow have never been exercised by a real runner. Both the
  baseline manifest and the workflow are ready for whenever that changes.
- `audit:rendered` measures layout, contrast and targets. It cannot judge
  whether the design looks good.