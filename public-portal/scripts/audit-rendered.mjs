#!/usr/bin/env node
/**
 * Rendered-DOM audit.
 *
 * Verifies the things only a real browser can answer: whether the
 * intended font stack applies, whether anything overflows the
 * viewport, whether tap targets meet 44px, what contrast real elements
 * actually render at, and whether the desktop nav stays on one line.
 *
 * Screenshots exist for human review; this measures instead of guessing.
 * Usage: node scripts/audit-rendered.mjs
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { ROUTES, VIEWPORTS, mockApi, waitForServer } from './browser-fixtures.mjs';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;

/**
 * Routes, fixtures and the API mock all come from browser-fixtures.mjs.
 *
 * This file previously carried its own copy of every fixture, and the copies had
 * already drifted apart: the local DOCS omitted `type` and the local mock ignored
 * the `type` query parameter, so the resolutions archive was audited while
 * rendering ordinances. The same drift is what let the visual baseline record the
 * wrong document type for as long as it existed. One source of truth means a gate
 * cannot quietly measure something other than what the screenshots compare.
 */

// Measures the page from inside the browser.
const AUDIT = () => {
  /**
   * Resolves any CSS colour to concrete RGBA.
   *
   * The previous implementation matched `rgb()`/`rgba()` with a regular
   * expression and returned null for everything else. The design system's paper
   * colour is declared as `color(srgb ...)`, so on any element inside `.v11-tabs`
   * the lookup returned null, the ancestor walk skipped past the real background,
   * and contrast was judged against whatever it found further up — typically the
   * page background. Two of the four contrast findings on the consultation tab
   * were artefacts of that: the same text measured 5.55:1 and 9.31:1 when the
   * true background was used.
   *
   * The colour is resolved by painting it into a 1x1 canvas and reading the
   * pixel back, which handles every CSS Color 4 syntax the browser supports and
   * converts out-of-gamut spaces to sRGB rather than failing. Validity is checked
   * separately with CSS.supports so an unsupported value is reported as unknown
   * instead of silently resolving to black.
   */
  const colourProbe = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const cache = new Map();
    return (value) => {
      if (!value) return null;
      if (cache.has(value)) return cache.get(value);
      let out = null;
      if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('color', value)) {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        out = { r, g, b, a: a / 255 };
      }
      cache.set(value, out);
      return out;
    };
  })();

  const toRgb = (value) => colourProbe(value);
  const lum = ({ r, g, b }) => {
    const f = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const effectiveBg = (el) => {
    let node = el;
    while (node) {
      const bg = toRgb(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0.5) return bg;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  const doc = document.documentElement;
  /**
   * A page-level horizontal scroll is a defect; an element extending past the
   * viewport inside a deliberate horizontal scroller is not.
   *
   * `.v11-tablist` is `overflow-x: auto` with `flex: 0 0 auto` tabs, so the
   * inactive and active tab triggers legitimately sit beyond the viewport at
   * 390px and the visitor scrolls to reach them. Reporting them as overflow
   * described the scroll container rather than a bug. Scrollers are therefore
   * walked up and treated as containing, which is the same rule the visual
   * overflow sweep already applies — one definition of "overflowing", used by
   * both gates.
   */
  const inScroller = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
    }
    return false;
  };
  const overflowing = [...document.querySelectorAll('body *')]
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      if (!(rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1))) return false;
      return !inScroller(el);
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]}`);

  // WCAG 2.2 SC 2.5.8 (Target Size, Minimum) is 24x24 CSS px. The 44px figure
// is the stricter iOS/Google guideline, tracked separately so the audit
// reports both honestly instead of treating one as the only standard.
const AA_TARGET = 24;
const COMFORT_TARGET = 44;

const smallTargets = [...document.querySelectorAll('a, button, input, [role="button"], select')]
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      // Visually-hidden helpers (the skip link) are 1x1 by design.
      if (el.classList.contains('sr-only')) return false;
      // Radix Select renders a real <select> purely so the browser can autofill
      // and serialise the value. It is aria-hidden, unfocusable and sized 1x1 by
      // design: no visitor sees it and no assistive technology reaches it. WCAG
      // 2.5.8 measures targets a user can operate, so reporting it as undersized
      // describes the library, not a defect. The guards are deliberately narrow —
      // aria-hidden alone is not enough, because an aria-hidden element that is
      // still visible is itself a bug worth reporting — so this requires BOTH
      // presentational hiding and a sub-2px footprint.
      if (
        el.getAttribute('aria-hidden') === 'true'
        && el.getAttribute('tabindex') === '-1'
        && rect.width <= 2 && rect.height <= 2
      ) return false;
      // Inline text links inside a paragraph are exempt from target sizing.
      if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') return false;
      // Desktop nav labels and footer lists are short by nature; touch users
      // get the mobile sheet, and footer rows are well spaced.
      if (el.closest('.portal-nav-links')) return false;
      if (el.closest('.portal-footer-links')) return false;
      return true;
    })
    .map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        el,
        label: `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        belowAA: rect.width < AA_TARGET || rect.height < AA_TARGET,
        belowComfort: rect.width < COMFORT_TARGET || rect.height < COMFORT_TARGET,
      };
    });

  const headings = [...document.querySelectorAll('h1, h2')].slice(0, 4).map((el) => ({
    tag: el.tagName,
    font: getComputedStyle(el).fontFamily.split(',')[0].replace(/"/g, ''),
  }));

  const lowContrast = [];
  for (const el of document.querySelectorAll('p, li, dd, dt, h1, h2, h3, a, button, span')) {
    const text = el.textContent?.trim();
    if (!text || text.length < 3 || el.children.length > 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const fg = toRgb(style.color);
    if (!fg || fg.a < 0.5) continue;
    const bg = effectiveBg(el);
    const l1 = lum(fg);
    const l2 = lum(bg);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    const ratio = (hi + 0.05) / (lo + 0.05);
    const size = parseFloat(style.fontSize);
    const bold = parseInt(style.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const min = large ? 3 : 4.5;
    if (ratio < min) {
      lowContrast.push(`${el.tagName.toLowerCase()} "${text.slice(0, 28)}" ${ratio.toFixed(2)}:1 (need ${min})`);
    }
  }

  const nav = document.querySelector('.portal-nav-links');
  const navInner = document.querySelector('.portal-nav-inner');
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;
  const navBarHeight = navInner ? navInner.getBoundingClientRect().height : 0;
  const mast = document.querySelector('.portal-nav');
  const mastHeight = mast ? mast.getBoundingClientRect().height : 0;

  const targetsBelowAA = smallTargets.filter((t) => t.belowAA);
  const targetsBelowComfort = smallTargets.filter((t) => t.belowComfort);

  return {
    scrollWidth: doc.scrollWidth,
    innerWidth: window.innerWidth,
    overflowing,
    targetsBelowAA: targetsBelowAA.map((t) => t.label),
    targetsBelowComfortCount: targetsBelowComfort.length,
    headings,
    lowContrast: lowContrast.slice(0, 8),
    lowContrastCount: lowContrast.length,
    navHeight: Math.round(navHeight),
    navBarHeight: Math.round(navBarHeight),
    mastHeight: Math.round(mastHeight),
    h1Count: document.querySelectorAll('h1').length,
    systemFontFamily: getComputedStyle(
      document.querySelector('.v11-doc-title')
        || document.querySelector('.v11-page-head h1')
        || document.querySelector('h1')
        || document.body
    ).fontFamily,
    systemSansApplied: /system-ui|Segoe UI|Arial/i.test(
      getComputedStyle(
        document.querySelector('.v11-doc-title')
          || document.querySelector('.v11-page-head h1')
          || document.querySelector('h1')
          || document.body
      ).fontFamily
    ),
  };
};

if (!existsSync('dist')) { console.error('run npm run build first'); process.exit(1); }

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;
let problems = 0;

/**
 * The shared viewports, plus the 1280px desktop width this audit has always
 * checked on top of them.
 *
 * 1280 is narrower than the 1440 used for screenshots, so it is the width where
 * the desktop nav bar and the record rows are under the most pressure. Folding it
 * into the shared list would have silently deleted a passing check; keeping it
 * local would have recreated the duplication this change exists to remove.
 *
 * The shared list is `[name, width, height]` tuples, which the capture scripts
 * destructure positionally. They are mapped to objects here because this audit
 * reports each viewport by name.
 */
const AUDIT_VIEWPORTS = [
  ...VIEWPORTS.map(([name, width, height]) => ({ name, width, height })),
  { name: 'desktop-1280', width: 1280, height: 820 },
];

try {
  await waitForServer(BASE);
  browser = await chromium.launch();

  const errors = [];

  for (const vp of AUDIT_VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await mockApi(page);
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${vp.name}] ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`[${vp.name}] pageerror: ${e.message}`));

    // The desktop nav bar is hidden below 900px in favour of the sheet, so the
    // 80px nav cap and the single-line-nav rule only apply where that nav exists.
    const desktopNav = vp.width >= 900;

    console.log(`${vp.name.toUpperCase()} ${vp.width}x${vp.height}`);
    console.log('-'.repeat(43));

    for (const [routeName, routePath, prepare] of ROUTES) {
      await page.goto(`${BASE}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
      // A route may need to reach a non-default state before it is worth
      // measuring, exactly as it is before it is worth photographing. Auditing
      // the pre-interaction state would report on a panel no visitor sees.
      if (prepare) await prepare(page);
      await page.waitForTimeout(200);
      const r = await page.evaluate(AUDIT);

      const overflow = r.scrollWidth > r.innerWidth + 1;
      const navBarBad = desktopNav && r.navBarHeight > 80;
      const navWraps = desktopNav && r.navHeight > 90;
      const h1Bad = r.h1Count !== 1;

      const flags = [];
      if (overflow) flags.push(`h-overflow ${r.scrollWidth}>${r.innerWidth}`);
      if (navBarBad) flags.push(`nav bar ${r.navBarHeight}px > 80px cap`);
      if (navWraps) flags.push(`nav links wrap (${r.navHeight}px)`);
      if (h1Bad) flags.push(`h1 count = ${r.h1Count}`);
      if (r.lowContrastCount) flags.push(`${r.lowContrastCount} low-contrast text node(s)`);
      if (r.targetsBelowAA.length) flags.push(`${r.targetsBelowAA.length} target(s) under WCAG 24x24`);
      if (!r.systemSansApplied) flags.push('system sans stack NOT applied');

      if (flags.length) problems += 1;
      const headerNote = `header ${r.mastHeight}px`;
      const comfortNote = r.targetsBelowComfortCount ? `, ${r.targetsBelowComfortCount} under 44px` : '';
      console.log(`${flags.length ? 'FAIL' : 'PASS'}  ${routeName.padEnd(24)} ${flags.join(' | ') || `clean (${headerNote}${comfortNote})`}`);
      if (!r.systemSansApplied) console.log(`        - computed heading font: ${r.systemFontFamily}`);

      for (const detail of [...r.overflowing, ...r.targetsBelowAA, ...r.lowContrast]) {
        console.log(`        - ${detail}`);
      }
    }

    await context.close();
    console.log('');
  }

  if (errors.length) {
    console.log(`console errors (${errors.length}):`);
    [...new Set(errors)].slice(0, 6).forEach((e) => console.log(`  - ${e.slice(0, 140)}`));
  } else {
    console.log('no console errors on any route or viewport');
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log('');
console.log(problems === 0
  ? `Rendered audit: all ${ROUTES.length} routes clean at ${AUDIT_VIEWPORTS.length} viewports.`
  : `Rendered audit: ${problems} route/viewport combination(s) with findings.`);
process.exit(problems === 0 ? 0 : 1);
