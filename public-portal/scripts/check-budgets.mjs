#!/usr/bin/env node
/**
 * Static bundle budget gate.
 *
 * NOTE: this is NOT Lighthouse. Lighthouse needs a real browser to produce
 * Core Web Vitals, and no headless browser is available in this project, so
 * no Lighthouse score is claimed anywhere. This gate does what can be done
 * deterministically without one: measure the built artefacts, assert they stay
 * inside agreed limits, and confirm that any referenced local font files were
 * emitted. The portal uses system fonts, so a zero-font build is valid.
 *
 * Budgets are on GZIP size, because that is what crosses the network. Raw
 * minified kilobytes are reported for context but are not the transfer cost.
 *
 * Run after `npm run build`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const ASSETS = join(DIST, 'assets');

const BUDGETS = {
  'initial JS, gzipped': { limit: 210, actual: 0 },
  'largest single JS chunk, gzipped': { limit: 105, actual: 0 },
  'CSS, gzipped': { limit: 20, actual: 0 },
  'web fonts (woff2 emitted)': { limit: 65, actual: 0 },
};

if (!existsSync(DIST)) {
  console.error('FAIL: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const files = readdirSync(ASSETS);
const js = files.filter((f) => f.endsWith('.js'));
const css = files.filter((f) => f.endsWith('.css'));
const woff2 = files.filter((f) => f.endsWith('.woff2'));

const kb = (buffer) => buffer.length / 1024;
const rawKb = (name) => statSync(join(ASSETS, name)).size / 1024;
const gzKb = (name) => kb(gzipSync(readFileSync(join(ASSETS, name))));

const sum = (list, measure) => list.reduce((acc, f) => acc + measure(f), 0);
const max = (list, measure) => (list.length ? Math.max(...list.map(measure)) : 0);

// What a first-time visitor must download before the page is usable:
// the entry chunk, the rolldown runtime, and the vendor chunks it imports.
// Route chunks are lazy, and recharts is deferred to /document/:id.
const LAZY_ROUTE = /^(DocumentDetail|NewsDetail|Members|Ordinances|Resolutions|Sessions|About|Committees|News|MissionVision|Tourism)-/;
const DEFERRED_VENDOR = /^vendor-charts-/;

const initialJs = js.filter(
  (f) => (/^index-/.test(f) || /^rolldown-runtime-/.test(f) || /^vendor-/.test(f)) &&
    !LAZY_ROUTE.test(f) && !DEFERRED_VENDOR.test(f)
);
const lazyJs = js.filter((f) => LAZY_ROUTE.test(f));
const deferredJs = js.filter((f) => DEFERRED_VENDOR.test(f));

BUDGETS['initial JS, gzipped'].actual = sum(initialJs, gzKb);
BUDGETS['largest single JS chunk, gzipped'].actual = max(js, gzKb);
BUDGETS['CSS, gzipped'].actual = sum(css, gzKb);
BUDGETS['web fonts (woff2 emitted)'].actual = sum(woff2, rawKb);

console.log('Bundle budget report (gzip = transfer cost)');
console.log('============================================');
console.log(`initial : ${initialJs.join(', ')}`);
if (lazyJs.length) console.log(`lazy    : ${lazyJs.join(', ')}  (only on navigation)`);
if (deferredJs.length) console.log(`deferred: ${deferredJs.join(', ')}  (recharts, /document/:id only)`);
console.log('');

let failed = 0;
for (const [label, { limit, actual }] of Object.entries(BUDGETS)) {
  const ok = actual <= limit;
  if (!ok) failed += 1;
  const pct = limit ? Math.round((actual / limit) * 100) : 0;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(38)} ${actual.toFixed(1).padStart(6)} / ${limit} KB (${pct}%)`
  );
}

console.log('');
console.log(`raw (uncompressed) initial JS: ${sum(initialJs, rawKb).toFixed(1)} KB across ${initialJs.length} chunks`);
const legacyWoff = files.filter((f) => f.endsWith('.woff'));
if (legacyWoff.length) {
  console.log(`note: ${legacyWoff.length} legacy .woff fallbacks also ship (${sum(legacyWoff, rawKb).toFixed(1)} KB) but modern browsers never request them`);
}

// A CSS url() pointing at a local font file that was never emitted is a real
// deployment failure. System-font stacks do not require a downloaded asset.
console.log('');
console.log(woff2.length
  ? `PASS  ${woff2.length} local woff2 file(s) emitted`
  : 'PASS  system font stack; no web font files required');

for (const sheet of css) {
  const contents = readFileSync(join(ASSETS, sheet), 'utf8');
  const unresolved = (contents.match(/\.\/files\/[^)'"]+/g) || []).length;
  if (unresolved) {
    console.log(`FAIL  ${sheet} references ${unresolved} unresolved ./files/ path(s) — these 404 at runtime`);
    failed += 1;
  }
  if (/fonts\.(googleapis|gstatic)\.com/.test(contents)) {
    console.log(`FAIL  ${sheet} contacts an external font CDN`);
    failed += 1;
  }
}
if (failed === 0) console.log('PASS  no unresolved font references and no external font CDN');

console.log('');
console.log(failed === 0 ? 'All bundle budgets met.' : `${failed} budget check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
