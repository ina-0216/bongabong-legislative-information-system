# Public Portal Amendment Style and Translation Fix Plan

## Objective

Resolve the 8 failing tests in the public portal suite by bringing the ordinance amendment badges/notices into the established design-token and translation systems, then verify the portal gates pass without weakening their rules.

## Verified Baseline

Ran from `public-portal/` on 2026-10-09:

- `npm run test:run`: **8 failed, 209 passed** across 13 files.
- The failures reduce to three source issues:
  1. Eleven literal hex colors in `src/v11.css` fail the no-literal-color token policy.
  2. Amendment notices use `border-radius: 6px` and `font-size: 0.82rem`. The design contract allows sharp `2px` corners (with `50%` and `0` exemptions) and sizes from the declared 15-step scale. The extra `0.82rem` also produces a duplicate/count-spacing failure.
  3. Amendment copy in `src/pages/Ordinances.jsx` and `src/pages/DocumentDetail.jsx` is hard-coded in a tooltip, notice fragments, and link labels/fallbacks.
- `npm run audit:i18n` reports the Ordinances tooltip; the i18n test additionally detects untranslated text nodes in DocumentDetail. Check whether the scanner and test share the same detection logic so this gap does not recur.
- `npm run design:source` reports the off-scale radius and font size.

## Scope

### In scope

- Replace all amendment-related literal colors with existing V11 palette tokens or `color-mix()` expressions built from those tokens.
- Bring the amendment notice radius and font size onto the existing shape and typography scales.
- Translate every user-visible string in both amendment states, including the Ordinances amended badge tooltip and label, DocumentDetail notice text, links, and fallback labels.
- Add English and Tagalog catalogue entries in `src/context/LanguageContext.jsx`.
- Add or update regression coverage for localized amendment states, variable insertion, CSS tokens, and scale compliance.
- Align `scripts/audit-i18n.mjs` with the i18n test coverage if it currently misses those same JSX fragments.

### Out of scope

- Changing amendment business rules, record data, or navigation destinations.
- Changing the canonical token palettes, shape scale, or typography scale to accommodate these styles.
- Removing or loosening existing test/audit rules to make the checks pass.
- Translating unrelated portal pages or redesigning the amendment notice layout.

## Implementation Steps

1. **Choose compliant amendment colors.** Replace the 11 raw hex declarations in `.v11-tag--amended`, `.v11-amendment-notice--amended`, and `.v11-amendment-notice--amends` with existing variables such as the V11 gold/blue tokens and token-based mixes. Preserve readable foreground/background contrast and the distinction between amended and amends states.
2. **Use the declared shape and type scales.** Replace `6px` with the system's sharp-corner value (`2px`) and choose an existing typography step appropriate for the notice. Do not add a new scale entry; keep the declared type scale's size count and spacing intact.
3. **Move all amendment copy into the language catalogue.** Replace visible literals in the Ordinances badge and both DocumentDetail banners with `t(...)` calls. Use interpolation for dynamic document numbers/titles. Preserve bold emphasis and links while ensuring fragments around JSX elements are translated in both English and Tagalog. Translate fallback text as well as the success-path text.
4. **Keep the audit and tests consistent.** Add regression expectations for the specific amendment strings and tokens. Refactor the i18n audit/test to use shared detection logic, or otherwise extend `audit-i18n.mjs` so it catches untranslated text split around inline markup, including the current DocumentDetail findings.
5. **Run focused checks, then the full portal verification script.** Fix any contrast or rendered-design regressions without changing gate thresholds. Review the rendered amendment badge and both banner variants.

## Affected Files

- `public-portal/src/v11.css`
- `public-portal/src/pages/Ordinances.jsx`
- `public-portal/src/pages/DocumentDetail.jsx`
- `public-portal/src/context/LanguageContext.jsx`
- `public-portal/scripts/audit-i18n.mjs` (if needed to close scanner/test coverage drift)
- `public-portal/src/test/tokens.contrast.test.js`
- `public-portal/src/test/design-contract.test.jsx`
- `public-portal/src/test/i18n.gate.test.jsx`
- `public-portal/src/test/portal.pages.test.jsx` or a focused amendment test file

## Test Strategy

### Detected infrastructure

- Vitest 5, configured through `public-portal/package.json`.
- Existing tests cover token contrast, design-contract scales, i18n catalogues, rendered portal pages, accessibility, visual budgets, and more under `public-portal/src/test/`.
- Existing commands include `npm run test:run`, `npm run audit:i18n`, `npm run design:source`, and the aggregate `npm run verify`.

### Regression coverage

- The amendment CSS has no literal hex colors and uses only allowed corner radii and type sizes.
- Amendment foreground/background combinations retain sufficient text contrast.
- Both amendment banners render translated copy for English and Tagalog, including links and dynamic numbers/titles.
- The Ordinances amended badge tooltip/label are translated.
- The i18n audit detects untranslated text split by inline JSX markup.

## Acceptance Criteria

- `npm run test:run` passes all tests, including the current 8 failures.
- `npm run audit:i18n` exits 0 and reports no hard-coded user-facing text in the affected flows.
- `npm run design:source` exits 0 with no enforced design-contract violations.
- `npm run verify` exits 0, including rendered design, budget, baseline, and visual checks.
- Amendment badges and banners retain their meaning, readable contrast, links, emphasis, and responsive appearance in both languages.
- No test or audit rule is weakened and no new design token scale values are introduced.

## Verification Commands

Run from `public-portal/`:

```powershell
npm run test:run
npm run audit:i18n
npm run design:source
npm run verify
```

## Risks and Review Points

- Replacing literal colors with palette tokens may subtly alter the amber/blue appearance; inspect rendered states and check contrast before accepting.
- Translating copy around `<strong>` and `<Link>` markup can create grammar issues if the sentence is split into fragments. Prefer translation units that preserve natural word order in Tagalog while retaining inline emphasis and links.
- The i18n script and Vitest gate currently surface different portions of the hard-coded copy. Keep one shared scanner or test the CLI scanner directly so they cannot drift silently.

## Implementation Record (2026-10-09)

- Replaced amendment hex colors with the existing V11 gold/blue palette, changed the notice radius to `2px`, and moved its text size to `0.84rem`.
- Routed the amendment label, tooltip, banners, link labels, and fallbacks through the English/Tagalog catalogue. Added the new catalogue keys as `pending` in the translation review ledger and regenerated the review packet through its project workflow; Tagalog wording remains a draft for reviewer approval.
- Added `src/test/amendments.i18n.test.jsx`, which checks both amendment relationships, dynamic ordinance details, and language switching.
- Verification passed: focused checks (84 tests), complete suite (14 files, 218 tests), i18n audit, design source audit (9/9 enforced rules), rendered design audit, bundle budgets, production build, and baseline integrity.
- The aggregate `npm run verify` is still nonzero on existing portal-wide checks outside this change: `audit:rendered` reports the navigation/header overflowing at the 390px mobile viewport (457px content width) on 14 routes; `visual:diff` reports 29 baseline image differences, including mobile screenshot widths of 457px. Desktop/tablet rendered audits pass. These global layout/baseline findings were not changed in this focused fix.
