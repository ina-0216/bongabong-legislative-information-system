import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SCALES,
  RULES,
  runSourceRules,
  LEVEL,
  STYLESHEETS,
} from '../../scripts/design-contract.mjs';

/**
 * These tests do two jobs:
 *
 *  1. Assert the shipped stylesheet conforms, so the gate has a real subject.
 *  2. Assert each rule actually fires on a deliberately broken stylesheet, so
 *     the gate cannot silently decay into something that always passes.
 *
 * The second job is the important one. A rule that has never been shown to
 * fail is indistinguishable from a rule that does nothing.
 */

const CSS_PATH = 'src/v11.css';
const INDEX_CSS_PATH = 'src/index.css';
const shippedCss = readFileSync(CSS_PATH, 'utf8');
const shippedIndexCss = readFileSync(INDEX_CSS_PATH, 'utf8');

/** Both stylesheets, as the audit passes them: { path, source }. */
const allSheets = [
  { path: CSS_PATH, source: shippedCss, primary: true },
  { path: INDEX_CSS_PATH, source: shippedIndexCss, primary: false },
];

const ruleById = (id) => {
  const rule = RULES.find((r) => r.id === id);
  if (!rule) throw new Error(`unknown rule: ${id}`);
  return rule;
};

/**
 * Runs a rule the way the audit does, honouring its scope: 'all' rules see
 * every stylesheet, 'primary' rules see v11.css only.
 *
 * A mutated string is applied to the primary sheet so a whole-cascade rule is
 * still exercised by the mutation table.
 */
const findingsFor = (css, id) => {
  const rule = ruleById(id);
  const mutated = typeof css === 'string' ? css : null;
  if (rule.scope === 'all') {
    const sheets = allSheets.map((sheet) =>
      sheet.primary && mutated !== null ? { ...sheet, source: mutated } : sheet
    );
    return sheets.flatMap((sheet) => rule.check(sheet));
  }
  return rule.check(mutated !== null ? mutated : shippedCss);
};

describe('design contract — the shipped stylesheets conform', () => {
  it('has no violations among enforced rules', () => {
    const enforced = runSourceRules(allSheets).filter((r) => r.level === LEVEL.ENFORCED);
    const violations = enforced.filter((r) => r.findings.length);
    expect(
      violations.map((v) => `${v.id}: ${v.findings.join('; ')}`)
    ).toEqual([]);
  });

  it('declares at least one enforced rule', () => {
    // Guards against the contract being emptied out and still reporting success.
    expect(runSourceRules(allSheets).some((r) => r.level === LEVEL.ENFORCED)).toBe(true);
  });
});

describe('design contract — every enforced rule can actually fail', () => {
  const enforcedIds = RULES.filter((r) => r.level === LEVEL.ENFORCED).map((r) => r.id);

  it.each(enforcedIds)('%s detects its own violation', (id) => {
    const mutations = {
      'shape-lock': `${shippedCss}\n.probe { border-radius: 14px; }`,
      'token-motion': `${shippedCss}\n.probe { transition: opacity 420ms ease; }`,
      'hero-padding': shippedCss.replace('.v11-hero { padding: clamp(56px, 8vw, 96px) 0;', '.v11-hero { padding: clamp(56px, 8vw, 104px) 0;'),
      'reduced-motion': shippedCss.replace('@media (prefers-reduced-motion: reduce) {', '.probe-media {'),
      // Remove every :focus-visible selector, not just the first. The rule requires a
// global focus style; a per-component :focus-visible does not satisfy it.
'focus-visible': shippedCss.replace(/:focus-visible/g, '.probe-focus'),
      'measure-declared': shippedCss.replace('--v11-measure: 68ch;', '--v11-measure-renamed: 68ch;'),
      'band-gap-token': shippedCss.replace('padding: var(--v11-gap) 0;', 'padding: 72px 0;'),
      'spacing-scale': `${shippedCss}\n.probe { gap: 9px; }`,
      'type-scale': `${shippedCss}\n.probe { font-size: .83rem; }`,
    };

    const mutated = mutations[id];
    if (mutated === undefined) {
      throw new Error(`no mutation defined for rule ${id} — add one so the rule is proven live`);
    }
    if (mutated === shippedCss) {
      throw new Error(`mutation for ${id} did not change the stylesheet — update it`);
    }

    expect(findingsFor(mutated, id).length).toBeGreaterThan(0);
  });
});

describe('design contract — the shape lock actually covers the whole cascade', () => {
  it('scans index.css as well as v11.css', () => {
    // The regression this guards: main.jsx imports only index.css, and v11.css
    // arrives via @import inside it. A v11-only scan passed while index.css
    // still carried --radius-md and a literal 9px.
    const rule = ruleById('shape-lock');
    expect(rule.scope).toBe('all');

    const violation = { path: INDEX_CSS_PATH, source: '.probe { border-radius: 9px; }' };
    const found = rule.check(violation);
    expect(found.length).toBeGreaterThan(0);
    // The finding must name the offending file, or it is unactionable.
    expect(found[0]).toContain('index.css');
  });

  it('registers index.css in the audited stylesheet list', () => {
    expect(STYLESHEETS.map((s) => s.path)).toEqual(
      expect.arrayContaining(['src/v11.css', 'src/index.css'])
    );
  });

  it('ships no off-system radius in either stylesheet', () => {
    for (const sheet of allSheets) {
      const found = [...sheet.source.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
      const allowed = [...SCALES.radii.shapes, ...SCALES.radii.exempt];
      expect({ file: sheet.path, bad: found.filter((v) => !allowed.includes(v)) }).toEqual({
        file: sheet.path,
        bad: [],
      });
    }
  });
});

describe('design contract — advisory rules never fail the run', () => {
  it('reports the spacing-scale result rather than assuming debt', () => {
    // spacing-scale was promoted to ENFORCED after the 2px-base migration, so
    // it now carries its own mutation above. This keeps an explicit assertion
    // that the shipped stylesheet satisfies it.
    expect(findingsFor(shippedCss, 'spacing-scale')).toEqual([]);
  });

  it('every declared font size is on the canonical scale', () => {
    expect(findingsFor(shippedCss, 'type-scale')).toEqual([]);
  });

  it('keeps declared sizes perceptibly separated', () => {
    // The migration collapsed 30 sizes to 15. This asserts the remaining steps
    // are still >= 0.5px apart, so the scale cannot decay back into drift.
    const sizes = [...new Set(
      [...shippedCss.matchAll(/font-size:\s*(\d*\.?\d+)rem\s*;/g)]
        .map((m) => (m[1].startsWith('.') ? Number(`0${m[1]}`) : Number(m[1])))
    )].sort((a, b) => a - b);

    expect(sizes.length).toBeLessThanOrEqual(SCALES.typeScale.length);
    for (let i = 0; i < sizes.length - 1; i += 1) {
      expect((sizes[i + 1] - sizes[i]) * 16).toBeGreaterThanOrEqual(SCALES.typeMinSeparationPx);
    }
  });
});

describe('design contract — measured scales match the stylesheet', () => {
  it('hero padding cap equals the shipped maximum', () => {
    expect(shippedCss).toMatch(/\.v11-hero\s*\{\s*padding:\s*clamp\([^)]*?,\s*96px\)/);
    expect(SCALES.heroPaddingMax).toBe(96);
  });

  it('measure token is declared once and inside the band', () => {
    expect(shippedCss).toContain(`--v11-measure: ${SCALES.measure};`);
    expect(SCALES.measureBand.min).toBeLessThanOrEqual(68);
    expect(SCALES.measureBand.max).toBeGreaterThanOrEqual(68);
  });

  it('every border-radius in v11 is an allowed shape or an exempt value', () => {
    const found = [...shippedCss.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
    const allowed = [...SCALES.radii.shapes, ...SCALES.radii.exempt];
    expect(found.filter((v) => !allowed.includes(v))).toEqual([]);
  });
});