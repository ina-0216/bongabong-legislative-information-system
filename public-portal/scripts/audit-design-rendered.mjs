#!/usr/bin/env node
/**
 * Design contract, rendered half.
 *
 * audit-rendered.mjs already answers the accessibility and overflow questions.
 * This gate covers only the composition and density rules that need a real
 * layout engine: band rhythm, prose measure, eyebrow restraint, CTA wrap, and
 * page length.
 *
 * Two rules are enforced and two are advisory, and the split is deliberate.
 *
 *   band-rhythm      ENFORCED  already true; protects a real decision.
 *   measure          ENFORCED  already true; the declared 68ch token holds.
 *   page-length      ADVISORY  reports density, never blocks. A civic portal is
 *                               allowed to be long; only a runaway page is a bug.
 *   eyebrow-count    ADVISORY  measures restraint but does not hard-fail,
 *                               because the right number is a judgment call.
 *
 * Reuses browser-fixtures.mjs so the API data matches the visual baseline. A
 * second copy of the fixtures could drift and make these numbers meaningless.
 *
 * Usage: node scripts/audit-design-rendered.mjs
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mockApi, waitForServer, ROUTES, VIEWPORTS } from './browser-fixtures.mjs';
import { SCALES } from './design-contract.mjs';

const PORT = 4181;
const BASE = `http://localhost:${PORT}`;

/** Max consecutive bands sharing one background treatment before it reads flat. */
const MAX_SAME_BG_RUN = 2;

/**
 * Screens of scroll allowed per band before a page is called a runaway.
 * 2.0 means one band may occupy at most two viewport heights. A single-band
 * page therefore trips at ~2 screens, while an eight-band civic portal is
 * comfortable out to ~16.
 */
const MAX_SCREENS_PER_BAND = 2;

/**
 * Flat budget for pages with no .v11-band at all — a single prose column, or a
 * list layout. These are legitimately longer than one band because there is no
 * band structure to divide by.
 */
const MAX_SCREENS_UNBANDED = 4;

/** Guidance: one eyebrow per this many bands. */
const BANDS_PER_KICKER = 3;

/**
 * Measures from inside the page. Kept as one function so a single evaluate()
 * per route does all the work — cheaper and avoids layout thrash between calls.
 */
const MEASURE = () => {
  const bands = [...document.querySelectorAll('.v11-band')];

  // A band's "treatment" is its resolved background colour. Comparing computed
  // values means .alt and .dark are recognised as genuinely different rather
  // than guessed from class names.
  const treatments = bands.map((b) => getComputedStyle(b).backgroundColor);

  let longestRun = 0;
  let run = 0;
  let previous = null;
  for (const t of treatments) {
    run = t === previous ? run + 1 : 1;
    previous = t;
    if (run > longestRun) longestRun = run;
  }

  // Text measure: computed in ch against the element's own font-size.
  const measureOf = (el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return null;
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
    probe.style.font = getComputedStyle(el).font;
    probe.textContent = '0'.repeat(100);
    el.appendChild(probe);
    const chWidth = probe.getBoundingClientRect().width / 100;
    probe.remove();
    return chWidth ? rect.width / chWidth : null;
  };

  const prose = [...document.querySelectorAll('.v11-prose p, .v11-lede, .v11-page-head p, .v11-bandhead p')]
    .filter((el) => el.textContent.trim().length > 120)
    .map(measureOf)
    .filter((v) => v !== null);

  // Kicker/eyebrow labels: the small uppercase mono rule from v11.css.
  const kickers = document.querySelectorAll('.v11-kicker').length;

  // A CTA whose label wraps to two lines is broken at desktop.
  //
  // Two things make this hard to measure correctly, both learned the hard way:
  //  1. .v11-btn sets min-height:44px with zero vertical padding for tap-target
  //     compliance, so box height says nothing about wrapping. The TEXT's own
  //     line count is the only valid signal.
  //  2. Buttons contain an icon element beside the label. A Range over the whole
  //     button returns one rect per inline child, so the icon's rect reads as a
  //     second line. The range must cover text nodes only.
  const textLines = (el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let lines = 0;
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      lines += tops.size;
    }
    return lines;
  };

  const wrappedCtas = [...document.querySelectorAll('.v11-btn')]
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || !el.textContent.trim()) return false;
      return textLines(el) > 1;
    })
    .map((el) => el.textContent.trim().replace(/\s+/g, ' ').slice(0, 30));

  return {
    bandCount: bands.length,
    longestSameBackgroundRun: longestRun,
    proseMeasures: prose.map((v) => Math.round(v)),
    kickers,
    wrappedCtas,
    pageHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
  };
};

/** Applied per route/viewport. Returns failures and advisories separately. */
function evaluate(route, m, { desktop }) {
  const failures = [];
  const advisories = [];

  if (m.bandCount > 0 && m.longestSameBackgroundRun > MAX_SAME_BG_RUN) {
    failures.push(`band rhythm: ${m.longestSameBackgroundRun} consecutive identical backgrounds (max ${MAX_SAME_BG_RUN})`);
  }

  // Prose measure is a desktop typographic rule. On a 390px phone the container
  // is the constraint, not the stylesheet: a 39ch measure there is arithmetic,
  // not a defect. Applying the band at mobile would report every narrow screen
  // as broken, and a gate that always cries wolf gets ignored.
  if (desktop) {
    for (const measure of m.proseMeasures) {
      if (measure < SCALES.measureBand.min || measure > SCALES.measureBand.max) {
        failures.push(`prose measure ${measure}ch outside ${SCALES.measureBand.min}-${SCALES.measureBand.max}ch`);
      }
    }
  }

  if (desktop && m.wrappedCtas.length) {
    failures.push(`CTA label wraps: ${m.wrappedCtas.join(' | ')}`);
  }

  // Density: reported as screens of scroll, never blocked.
  //
  // Measured per band, not as raw page height. Home is 7.5 phone-screens, which
  // looks alarming but is eight distinct content bands at ~0.94 screens each —
  // a reasonable civic portal, not a runaway page. A page with one band
  // stretched over eight screens IS a defect, and raw height cannot tell those
  // apart. Screens-per-band can.
  //
  // Pages with no .v11-band (a single long prose column, for instance) are
  // measured against a flat budget instead: dividing by zero bands would report
  // the whole page as one infinite band, which is meaningless arithmetic.
  const screens = m.pageHeight / m.viewportHeight;

  if (m.bandCount === 0) {
    if (screens > MAX_SCREENS_UNBANDED) {
      advisories.push(`${screens.toFixed(1)} screens, unbanded (max ${MAX_SCREENS_UNBANDED})`);
    }
  } else {
    const screensPerBand = screens / m.bandCount;
    if (screensPerBand > MAX_SCREENS_PER_BAND) {
      advisories.push(
        `${screens.toFixed(1)} screens over ${m.bandCount} band(s) = ${screensPerBand.toFixed(1)} per band (max ${MAX_SCREENS_PER_BAND})`
      );
    }
  }

  // Eyebrow restraint: the ratio is the signal, not a fixed count.
  if (m.bandCount > 0) {
    const budget = Math.ceil(m.bandCount / BANDS_PER_KICKER);
    if (m.kickers > budget) {
      advisories.push(`${m.kickers} kickers across ${m.bandCount} bands (guidance max ${budget})`);
    }
  }

  return { failures, advisories };
}

if (!existsSync('dist')) {
  console.error('FAIL: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore' }
);

let browser;
let failureCount = 0;
let advisoryCount = 0;

try {
  await waitForServer(BASE);
  browser = await chromium.launch();

  for (const [vpName, vpWidth, vpHeight] of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vpWidth, height: vpHeight },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await mockApi(page);

    // Band rhythm and measure are desktop composition concerns; the phone
    // layout legitimately stacks everything into one column.
    const desktop = vpWidth >= 900;

    console.log(`${vpName.toUpperCase()} ${vpWidth}x${vpHeight}`);
    console.log('-'.repeat(43));

    for (const [name, route] of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(150);

      const m = await page.evaluate(MEASURE);
      const { failures, advisories } = evaluate(route, m, { desktop });

      failureCount += failures.length;
      advisoryCount += advisories.length;

      const screens = m.pageHeight / m.viewportHeight;
      const notes = [
        m.bandCount ? `${m.bandCount} bands` : 'no bands',
        `${screens.toFixed(1)} screens`,
      ];
      // Show density per band whenever there are bands, so the advisory number
      // is always traceable to something visible in the same line.
      if (m.bandCount > 0) notes.push(`${(screens / m.bandCount).toFixed(1)}/band`);
      if (m.kickers) notes.push(`${m.kickers} kickers`);

      console.log(
        `${failures.length ? 'FAIL' : 'PASS'}  ${name.padEnd(16)} ${notes.join(', ')}${
          failures.length ? ` | ${failures.join(' | ')}` : ''
        }`
      );
      for (const a of advisories) console.log(`        note: ${a}`);
    }

    await context.close();
    console.log('');
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}

console.log('-----------------------------------');
if (advisoryCount) {
  console.log(`${advisoryCount} advisory note(s) — density and kicker density are`);
  console.log('reported, not enforced. See docs/design-review.md.');
  console.log('');
}
console.log(
  failureCount === 0
    ? 'Design rendered audit: all enforced composition rules hold.'
    : `Design rendered audit: ${failureCount} composition violation(s).`
);

process.exit(failureCount === 0 ? 0 : 1);