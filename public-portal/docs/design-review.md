# Design review

Two separate things live here, and conflating them is how a design gate turns
into theatre.

## 1. What the automated gates cover

`npm run design:source` and `npm run design:rendered` enforce the **objective
subset** of the design standard — the part that can be measured and that a
reasonable person would agree is a defect when broken.

| Rule | Level | Gate |
|------|-------|------|
| All-sharp shape lock | enforced | source |
| Motion runs on the shared duration token | enforced | source |
| Hero padding within the 96px cap | enforced | source |
| `prefers-reduced-motion` honoured | enforced | source |
| Global `:focus-visible` rule present | enforced | source |
| Prose measure declared as a token | enforced | source |
| Band rhythm from one token | enforced | source |
| No 3+ consecutive identical band backgrounds | enforced | rendered |
| Prose measure 45–75ch at desktop | enforced | rendered |
| CTA labels stay on one line at desktop | enforced | rendered |
| Spacing values on a 2px base | enforced | source |
| Font sizes on the canonical type scale | enforced | source |
| Page density (screens per band) | **advisory** | rendered |
| Kicker density vs. band count | **advisory** | rendered |

The contract lives in `scripts/design-contract.mjs`. Every scale in it was
measured from `src/v11.css` as shipped, not chosen from a template. If the two
drift apart, the audit fails — that is the intent.

### The spacing scale is 2px, not 4px

The migration started from an assumption that a 4px scale was correct. Measuring
the stylesheet disproved it: **197 of 220** spacing tokens were already on a 2px
base, and the half-steps (6, 10, 14, 18, 22, 26px) are where the bands' optical
rhythm comes from. Forcing a 4px grid would have been a regression, not a
cleanup.

The rule was rewritten to match reality, then the remaining 23 odd values were
migrated onto the 2px base. `spacing-scale` was then promoted from advisory to
enforced. Non-spacing odd values are deliberately out of scope:
`outline-offset: -3px` and `text-underline-offset: 3px` are optical corrections,
not spacing.

### The type scale is a tier scale, not a modular one

Same method, same correction. v11 declared **30 distinct font sizes**, of which
**22 adjacent pairs differed by under 0.5px** — smaller than a single pixel, so
they cannot be told apart on screen. The defect was drift, not a missing grid.

The canonical scale is therefore a tier scale of 15 steps
(0.64 → 1.6rem), built to keep the values v11 actually shipped with and collapse
only the collisions. Adjacent steps are ≥ 0.5px apart by construction, and the
largest single substitution in the migration was 0.48px.

A modular or arithmetic scale was rejected: it would have changed rendered text
size everywhere to satisfy a convention v11 never adopted. Font families
(system sans for headings/body, mono for machine references) are carried by
`font-family`, not by size, so the scale is not role-bound.

`clamp()` display sizes are exempt — they are fluid by design.

### Why advisory rules exist

A gate that blocks on known debt gets disabled, and then you have lost the layer
entirely. So known debt is *measured and reported*, never failed:

- **Page density** — measured in screens of scroll *per band*, not as raw page
  height. Home is 7.5 phone-screens, which looks alarming in isolation but is
  eight content bands at ~0.9 screens each. Raw height cannot distinguish that
  from one band stretched over eight screens, which is a real defect. The
  remaining notes are genuine: the archive and resolutions lists run 3.6 screens
  through a single band, and members/about run 5 screens unbanded.
- **Kicker density** — one eyebrow per three bands. Tourism was over at 4
  across 5 bands; see below.

Promote one from advisory to enforced when its migration actually lands. That
should be a deliberate edit, never a side effect of running the audit. Spacing
and type were both promoted this way: advisory → measure → migrate → enforced.

### Kicker density: one real defect, one metric fix

Two things came out of working the advisory debt:

1. **A literal duplicate.** The tourism activities bandhead carried a kicker
   reading "Things to experience" directly above an `<h2>` rendering
   `t('thingsToExperience')` — the same words, stacked. Removed. The second
   kicker, "More from Bongabong", was filler above a self-sufficient heading and
   was also dropped. Tourism now runs 2 kickers across 5 bands, within budget.

2. **The density metric measured the wrong thing.** It compared raw page height
   against a fixed 6-screen limit, which flagged home's legitimately banded
   structure while missing a genuinely bloated single band. It now divides by
   band count, with a separate flat budget for unbanded pages so it never
   divides by zero.

## 2. What no gate can check

**Whether this reads as authoritative to a resident.**

No script can tell you the warm paper ground and the antique-gold rule are
right for a Sangguniang Bayan. It can verify the palette resolves to tokens, that
contrast passes AA, and that nothing wrapped by accident. It cannot verify the
tone lands.

That judgment stays human. Review it:

1. Open the baselines in `.visual-baseline/baseline/` — 36 real renders, 12
   routes × 3 viewports.
2. Read `home--mobile.png` top to bottom. It is the longest page; it is where
   pacing problems show up first.
3. Read the Tagalog strings in `docs/translation-checklist.md`. A design that
   works only in English is not done. **85 strings are still outstanding** and
   the 120 drafted ones need someone who speaks the language, not a
   translation tool.

### The shape lock covers the whole cascade, not just v11.css

`main.jsx` imports only `index.css`; `v11.css` arrives through
`@import "./v11.css"` inside it. Both therefore ship. The shape lock originally
read only `src/v11.css`, so it passed while `index.css` still declared
`border-radius: var(--radius-md)` twice, `var(--ibosys-radius-md)` once, and a
literal `9px`. Two design systems in one stylesheet is the drift risk itself, so
the rule now scans every registered stylesheet and names the file in each
finding.

Widen scope deliberately. Rules that assert a *v11 selector* (`--v11-measure`,
`.v11-band`, `:focus-visible`) stay `scope: 'primary'`, because running them
against `index.css` would report a false failure for every declaration. Each rule
declares its scope, and `runSourceRules` supplies the matching argument shape.

### The superseded pre-v11 layer is gone

`index.css` carried a second, older design system alongside v11. Measured by
token search across every source file, **63 of its 90 class selectors had no
reference anywhere in the app** — `.commons-*` (zero references ever),
`.portal-hero*`, `.tourism-*`, `.page-banner`, `.video-frame`, `.news-card`,
`.activity-card`, `.members-feature-*`, `.button*`, `.eyebrow`. Every live
element had already moved to a `v11-` prefixed class.

323 lines were removed. The live remainder is the Tailwind `@theme` token map,
the base reset, the navbar, the mobile-nav media query, and the footer.

Three radii survived in **live** blocks (`.brand-mark`, `.portal-menu-button`,
`.portal-footer-mark`). All three were already overridden by v11 at higher
specificity, so setting them to 2px is a visual no-op that removes the trap: a
future specificity change could no longer let `--radius-md` resurface.

The visual diff staying at **36/36** is the proof the deletion was safe. A
single shifted pixel would have meant the dead-code analysis was wrong.

CSS bundle fell to 16.72 kB gzip.

### The visual gate uses two budgets, and that is deliberate

A ratio-only tolerance looked view-dependent, and the measurements show why.
Replaying a real regression — a colour change to `.v11-bandhead p` — gave:

| viewport | changed px | 0.1% allowance |
|---|---|---|
| desktop | 1904 | 4494 |
| tablet | 1892 | 2314 |
| mobile | 1879 | 1610 |

The changed-pixel count is essentially **constant**; the allowance scales with
image area. So the same defect passed on desktop and failed on mobile purely
because the capture was narrower. Area-normalisation is right for drift, and
wrong for a fixed-size change.

The gate now applies both budgets, and a capture fails if **either** trips:

- **absolute, 1200 px** — makes a fixed-size change judge the same everywhere
- **ratio, 0.1%** — still catches proportional drift such as a whole band
  changing colour or a font failing to load

Failures name which budget tripped (`absolute`, `ratio`, or `ratio + absolute`)
and report the absolute count alongside the percentage, so a verdict is
auditable rather than a bare ratio.

1200 is deliberately generous: clean runs measure **0** changed pixels, and the
smallest real regression observed was 1879. `src/test/visual-budget.test.jsx`
pins all of it, including a test asserting the premise still holds — that under
ratio alone the same change would still pass on desktop.

### The visual gate masks photographs, and says so

A JPEG re-rasterises almost entirely when it moves one pixel. A 1px layout
shift above the council photograph once produced a 2.857% "difference" that was
entirely displaced pixels inside the image, burying the surrounding text a
reviewer actually needed to see.

Photographic regions are now excluded from the ratio and every image reports its
excluded share inline, so an exclusion is never silent. The gate also warns when
any page is more than half photographic, since such a page is barely compared at
all. Current maximum is `members--mobile` at 37.6% — five portraits on a small
screen.

Two properties are asserted in `src/test/visual-mask.test.jsx`, because both
matter and neither is obvious:

- A change **inside** a mask is ignored, which is the whole point.
- A change **outside** a mask is still caught, and masking *raises* the ratio
  rather than diluting it, since the denominator shrinks.

Browser-level probing of this proved unreliable and was abandoned. A bundled
image that fails to load renders as an empty box, so a CSS change aimed at it
produces no pixel change and the probe silently demonstrates nothing. The
synthetic-image suite is the evidence instead.

### Strings that cannot be translated at all

`npm run audit:i18n` is a separate concern from the checklist. The checklist
counts catalogue keys; it cannot see a string hardcoded in JSX. Such a string
can never be translated no matter how much catalogue work happens.

The portal had **50+ of them**, concentrated on Tourism (which bypassed `t()`
entirely) and spread across every page as loading and empty states. All are now
routed through the catalogue, and the gate fails if one is reintroduced.

Most `aria-label`s were in this group too. A screen reader reads them aloud, so
they are as user-visible as body copy, and they were invisible to the
translation count.

Proper nouns are deliberately exempt: the municipal address, "Sangguniang Bayan
Office", and official place names must not be translated. The gate and the test
share one exemption list so they cannot disagree.

### Rules deliberately not enforced

From the general anti-slop guidance, applied and then rejected on the evidence:

- **Warm cream + gold palette** — banned only for *premium-consumer* briefs.
  This is a municipal record portal and the palette came from the brief.
- **Serif headings** — brief-driven and appropriate to the Official Record
  metaphor. A "serif is a creative crutch" rule does not apply to a document
  archive.
- **Dark mode** — public-sector, trust-first and accessibility-critical contexts
  justify a locked light theme.
- **Em-dash prohibition** — `—` is used here as a data-missing placeholder
  (`formatDate`). Banning it would flag correct behaviour.
- **Section-layout variety** — sections listing ordinances share a component
  because they list the same content type. Varying it would be worse.

## Provenance

The v11 visual system is the source of truth. Repository-level agent rule files
are **not** treated as normative for design — they describe an earlier stage and
would drag v11 backwards toward a system that was already replaced.
