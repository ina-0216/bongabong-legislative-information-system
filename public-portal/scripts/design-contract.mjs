/**
 * Design contract for the Bayan Hall public portal.
 *
 * Source of truth is the shipped v11 visual system (src/v11.css) plus Munder's
 * design principles. Every scale below was measured from the CSS that is
 * actually running, not chosen from a generic template. If a value here drifts
 * from the stylesheet, the audit fails — that is the whole point.
 *
 * Rules are split by enforcement level, deliberately:
 *
 *   ENFORCED  — deterministic, already true today, must never regress.
 *   ADVISORY  — measured and reported, never fails. These describe a known gap
 *               that is being fixed incrementally. Promoting one to ENFORCED
 *               is a deliberate decision made when the migration lands, not a
 *               side effect of running this script.
 *
 * Anything genuinely aesthetic — whether the page reads as authoritative to a
 * resident — is NOT here and cannot be automated. See docs/design-review.md.
 */

/** Values measured from src/v11.css on the v11 design layer. */
export const SCALES = {
  /** 16 occurrences of 2px; the 50% and 0 entries are circular avatars and reset. */
  radii: { shapes: ['2px'], exempt: ['50%', '0'] },

  /** Every transition in v11.css resolves through this token; no raw durations. */
  transitionToken: 'var(--transition-fast)',

  /** The five responsive thresholds actually present in v11.css. */
  breakpoints: ['640px', '700px', '760px', '860px', '900px'],

  /** v11.css line 58-59. */
  bandGap: 'clamp(44px, 6vw, 84px)',
  measure: '68ch',

  /**
   * Hero top padding is capped at pt-24. Past this the hero content floats far
   * enough down the viewport to read as a layout bug rather than as intent.
   */
  heroPaddingMax: 96,

  /** System sans carries headings; mono carries machine references. */
  headingFont: /system-ui|Segoe UI|Arial/i,
  referenceFont: /mono/i,

  /** Body prose measure band, in ch. 68ch is the declared --v11-measure. */
  measureBand: { min: 45, max: 75 },

  /**
   * v11's spacing rhythm is a 2px base, not the 4px scale that is common
   * elsewhere. Measured across all 220 padding/margin/gap tokens in v11.css,
   * 197 were already even; the rest were 1-3px off and have been migrated.
   *
   * The 2px base is deliberate: it permits 6/10/14/18/22/26px half-steps that a
   * 4px scale cannot express, and those half-steps are where the band's optical
   * rhythm actually comes from. Forcing a 4px grid would have been a regression,
   * not a cleanup.
   *
   * Non-spacing odd values are NOT covered: outline-offset and
   * text-underline-offset are optical corrections, not spacing.
   */
  spacingBase: 2,

  /**
   * Canonical type scale, in rem. Derived from measurement, not from a preset.
   *
   * v11 originally declared 30 distinct font sizes, of which 22 adjacent pairs
   * differed by less than 0.5px — indistinguishable on screen. The defect was
   * drift, not a missing arithmetic grid, so this is a tier scale rather than a
   * modular one: it preserves the values v11 actually shipped with and only
   * collapses the collisions.
   *
   * Adjacent steps are >= 0.5px apart by construction. clamp() display sizes
   * are exempt because they are fluid by design.
   */
  typeScale: [0.64, 0.68, 0.72, 0.78, 0.84, 0.9, 0.95, 1.02, 1.08, 1.15, 1.25, 1.3, 1.4, 1.5, 1.6],

  /** Two declared sizes closer than this cannot be told apart. */
  typeMinSeparationPx: 0.5,
};

/**
 * Objective rules. Each returns findings rather than pass/fail so the same
 * checker can serve both the CLI (human-readable) and the test (assertions).
 *
 * `scope` decides which stylesheets a rule sees:
 *   'all'     — the property must hold across the whole cascade. Used for
 *               things where two competing values in two files is the defect.
 *   'primary' — the rule asserts a v11 selector exists, so running it against
 *               index.css would report a false failure for every declaration.
 */
export const RULES = [
  {
    id: 'shape-lock',
    scope: 'all',
    level: 'ENFORCED',
    why: 'v11 is an all-sharp system. One stray radius reads as a broken card grid.',
    /**
     * Scoped to ALL stylesheets, not just v11.css.
     *
     * main.jsx imports only index.css; v11.css is pulled in by
     * `@import "./v11.css"` inside it. So both ship, and a v11-only scan
     * silently ignored index.css while it still declared `border-radius: 9px`
     * and `--radius-md`. Two design systems in one cascade is the drift risk
     * itself, so the rule must see the whole cascade.
     *
     * `css` arrives as { path, source } so findings name the file that broke.
     */
    check: (css) => {
      const found = [...css.source.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
      const allowed = [...SCALES.radii.shapes, ...SCALES.radii.exempt];
      const bad = found.filter((v) => !allowed.includes(v));
      // Report the file rather than a bare value, or a violation in index.css is
      // indistinguishable from one in v11.css.
      const label = pathLabel(css);
      return [...new Set(bad)].map((v) => `${label}: unexpected border-radius: ${v}`);
    },
  },
  {
    id: 'token-motion',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'Motion must run on the shared duration token so reduced-motion can collapse it.',
    check: (css) => {
      const found = [...css.matchAll(/transition:\s*([^;]+);/g)].map((m) => m[1].trim());
      const bad = found.filter((v) => !v.includes(SCALES.transitionToken));
      return bad.map((v) => `transition bypasses ${SCALES.transitionToken}: ${v}`);
    },
  },
  {
    id: 'hero-padding',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'Hero top padding above pt-24 reads as a layout bug, not deliberate space.',
    check: (css) => {
      const m = css.match(/\.v11-hero\s*\{[^}]*padding:\s*clamp\([^)]*?,\s*(\d+)px\)/);
      if (!m) return ['.v11-hero clamp() padding not found — check the selector'];
      const max = Number(m[1]);
      return max > SCALES.heroPaddingMax
        ? [`hero max padding ${max}px exceeds the ${SCALES.heroPaddingMax}px cap`]
        : [];
    },
  },
  {
    id: 'reduced-motion',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'WCAG 2.3.3. A civic site that ignores the OS motion setting excludes people.',
    check: (css) =>
      css.includes('@media (prefers-reduced-motion: reduce)')
        ? []
        : ['no @media (prefers-reduced-motion: reduce) block'],
  },
  {
    id: 'focus-visible',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'Keyboard focus must be visible on every interactive surface.',
    // Requires the standalone global selector, not a compound one. A per-component
// :focus-visible does not satisfy this: the rule exists so every focusable
// element is covered, including ones nobody thought to style individually.
check: (css) =>
      /(^|[};]\s*)\s*:focus-visible\s*\{/.test(css)
        ? []
        : ['no global :focus-visible rule'],
  },
  {
    id: 'measure-declared',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'Prose width is declared once as a token rather than hardcoded per component.',
    // Requires the exact declaration, so --v11-measure-renamed does not pass.
    check: (css) =>
      /--v11-measure\s*:/.test(css) ? [] : ['--v11-measure token not declared'],
  },

  {
    id: 'spacing-scale',
    scope: 'primary',
    level: 'ENFORCED',
    why: `Spacing runs on a ${SCALES.spacingBase}px base. Odd values are off-rhythm by construction.`,
    // Scoped to padding/margin/gap only. outline-offset and text-underline-offset
    // are optical corrections and are intentionally allowed to be odd.
    check: (css) => {
      const decls = [...css.matchAll(/(?:padding|margin|gap)\s*:([^;]+);/g)];
      const offBase = [];
      for (const decl of decls) {
        for (const token of decl[1].matchAll(/(\d+(?:\.\d+)?)px/g)) {
          const value = Number(token[1]);
          if (value % SCALES.spacingBase !== 0) offBase.push(value);
        }
      }
      if (!offBase.length) return [];
      const distinct = [...new Set(offBase)].sort((a, b) => a - b);
      return [
        `${offBase.length} spacing value(s) off the ${SCALES.spacingBase}px base in ${decls.length} declarations: ${distinct.join(', ')}px`,
      ];
    },
  },
  {
    id: 'type-scale',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'Font sizes come from the canonical scale. Two sizes closer than 0.5px cannot be told apart.',
    check: (css) => {
      // Accepts both `.84rem` and `0.84rem`; the stylesheet uses both forms.
      const found = [...css.matchAll(/font-size:\s*(\d*\.?\d+)rem\s*;/g)]
        .map((m) => (m[1].startsWith('.') ? Number(`0${m[1]}`) : Number(m[1])))
        // clamp() declarations are fluid display type and out of scope.
        .filter((v) => Number.isFinite(v));

      const offScale = [...new Set(found.filter((v) => !SCALES.typeScale.includes(v)))].sort((a, b) => a - b);
      if (offScale.length) {
        return [`${offScale.length} size(s) off the canonical scale: ${offScale.join(', ')}rem`];
      }

      // Distinct sizes must be perceptibly separated, or the scale is not doing
      // any work. Sorts a copy so the caller's order is not mutated.
      const sorted = [...new Set(found)].sort((a, b) => a - b);
      const collisions = [];
      for (let i = 0; i < sorted.length - 1; i += 1) {
        const deltaPx = (sorted[i + 1] - sorted[i]) * 16;
        if (deltaPx < SCALES.typeMinSeparationPx) {
          collisions.push(`${sorted[i]}rem->${sorted[i + 1]}rem = ${deltaPx.toFixed(2)}px`);
        }
      }
      if (collisions.length) {
        return [`${collisions.length} imperceptible pair(s): ${collisions.join(', ')}`];
      }
      return [];
    },
  },
  {
    id: 'band-gap-token',
    scope: 'primary',
    level: 'ENFORCED',
    why: 'Band rhythm must come from one token, not per-section literals.',
    // Exact declaration, so a renamed variant cannot satisfy the rule.
    check: (css) => (/\.v11-band\s*\{[^}]*padding:\s*var\(--v11-gap\)/s.test(css) ? [] : ['.v11-band does not pad from var(--v11-gap)']),
  },
];

/** Pages where a full-bleed band is expected; these get the rhythm check. */
export const MARKETING_SURFACES = new Set(['/']);

export const LEVEL = { ENFORCED: 'ENFORCED', ADVISORY: 'ADVISORY' };

/** Short, stable label for a stylesheet in findings output. */
function pathLabel(css) {
  if (!css || typeof css === 'string') return 'v11.css';
  return String(css.path ?? 'v11.css').replace(/^.*[\\/]/, '');
}

/**
 * Every stylesheet the app actually ships.
 *
 * index.css is the entry (main.jsx imports it) and pulls in v11.css through
 * `@import`. Both therefore reach the browser, and a contract that only reads
 * one of them is blind to the other's language. Order is irrelevant to
 * findings; findings are aggregated, not first-match.
 */
export const STYLESHEETS = [
  { path: 'src/v11.css', primary: true },
  { path: 'src/index.css', primary: false },
];

export function runSourceRules(sheets) {
  // Accept a bare string for v11.css so existing single-file callers and tests
  // keep working unchanged.
  const list = typeof sheets === 'string'
    ? [{ path: 'src/v11.css', source: sheets, primary: true }]
    : sheets;

  const primary = list.find((s) => s.primary) ?? list[0];

  return RULES.map((rule) => ({
    id: rule.id,
    level: rule.level,
    why: rule.why,
    findings: rule.scope === 'all'
      // Whole-cascade rules receive the sheet object so they can name the file.
      ? list.flatMap((sheet) => rule.check(sheet))
      // v11-selector rules receive the raw source string they were written for.
      : rule.check(primary.source),
  }));
}
