import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
 * Colour and font-delivery guards.
 *
 * axe cannot evaluate colour contrast under jsdom, so these assertions are
 * computed numerically from the real token values instead. They exist to stop
 * a contrast regression from slipping back in unnoticed.
 */

const TOKENS_PATH = resolve(process.cwd(), '../packages/design-tokens/dist/tokens.css');
const V11_PATH = resolve(process.cwd(), 'src/v11.css');
const INDEX_CSS_PATH = resolve(process.cwd(), 'src/index.css');
const MAIN_PATH = resolve(process.cwd(), 'src/main.jsx');

const tokensSrc = readFileSync(TOKENS_PATH, 'utf8');

const token = (name) => {
  const match = tokensSrc.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`token --${name} not found`);
  return match[1];
};

const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/** Mirrors CSS color-mix(in srgb, A p%, B). */
const mix = (a, b, pctA) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const p = pctA / 100;
  const channel = (i) => Math.round(A[i] * p + B[i] * (1 - p));
  return `#${[0, 1, 2].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`;
};

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
};

// The shipped v11 derivations, mirroring src/v11.css.
const paper = mix(token('ibosys-surface-primary'), token('ibosys-warning-500'), 97);
const paper2 = mix(token('ibosys-surface-secondary'), token('ibosys-warning-500'), 88);
const goldText = mix(token('ibosys-warning-700'), token('ibosys-primary-900'), 76);
const goldBright = mix(token('ibosys-warning-500'), token('ibosys-primary-900'), 82);
const navy = token('ibosys-primary-800');

describe('v11 palette contrast (WCAG AA)', () => {
  const textPairs = [
    ['ink on paper', token('ibosys-text-primary'), paper, 4.5],
    ['ink on paper-2', token('ibosys-text-primary'), paper2, 4.5],
    ['ink-2 on paper', token('ibosys-text-secondary'), paper, 4.5],
    ['ink-2 on paper-2', token('ibosys-text-secondary'), paper2, 4.5],
    ['ink-3 on paper', token('ibosys-text-tertiary'), paper, 4.5],
    ['ink-3 on paper-2', token('ibosys-text-tertiary'), paper2, 4.5],
    ['blue on paper', token('ibosys-primary-500'), paper, 4.5],
    ['red on paper', token('ibosys-danger-700'), paper, 4.5],
    ['gold-text on paper', goldText, paper, 4.5],
    ['gold-text on paper-2', goldText, paper2, 4.5],
    ['paper on navy', token('ibosys-surface-primary'), navy, 4.5],
    ['gold-bright on navy', goldBright, navy, 4.5],
  ];

  it.each(textPairs)('%s meets 4.5:1', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  const nonTextPairs = [
    ['control line on paper', token('ibosys-primary-400'), paper, 3],
    ['control line on paper-2', token('ibosys-primary-400'), paper2, 3],
    ['focus ring on paper', token('ibosys-border-focus'), paper, 3],
  ];

  it.each(nonTextPairs)('%s meets 3:1', (_label, fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});

describe('font delivery', () => {
  const indexCss = readFileSync(INDEX_CSS_PATH, 'utf8');
  const mainJsx = readFileSync(MAIN_PATH, 'utf8');
  const v11Css = readFileSync(V11_PATH, 'utf8');

  it('never contacts a font CDN', () => {
    expect(indexCss).not.toMatch(/fonts\.googleapis\.com/);
    expect(indexCss).not.toMatch(/fonts\.gstatic\.com/);
    expect(mainJsx).not.toMatch(/fonts\.googleapis\.com/);
  });

  it('uses the shared system sans stack for headings and body copy', () => {
    expect(v11Css).toMatch(/--v11-serif:\s*var\(--font-sans,\s*system-ui/);
    expect(indexCss).toContain('--font-sans: var(--ibosys-font-sans)');
    expect(tokensSrc).toMatch(/--ibosys-font-sans:\s*system-ui/);
  });

  it('does not import an unused bundled font into the public entry point', () => {
    expect(mainJsx).not.toMatch(/@fontsource\/source-serif-4/);
  });
});

describe('token policy', () => {
  it('v11.css introduces no literal hex values', () => {
    const v11 = readFileSync(V11_PATH, 'utf8');
    const offenders = v11
      .split('\n')
      .map((line, i) => ({ line: i + 1, text: line }))
      .filter(({ text }) => !text.trim().startsWith('*') && !text.trim().startsWith('/*'))
      .filter(({ text }) => /#[0-9a-fA-F]{3,8}\b/.test(text));
    expect(offenders.map((o) => `line ${o.line}: ${o.text.trim()}`)).toEqual([]);
  });
});
