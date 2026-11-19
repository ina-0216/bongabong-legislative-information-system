#!/usr/bin/env node
/**
 * Visual regression gate.
 *
 * Captures the current build, then compares it against a stored baseline with
 * a per-pixel diff. Fails when any route differs by more than the allowed
 * percentage, writing a diff image so the change can be inspected.
 *
 * Commands:
 *   node scripts/visual-diff.mjs            compare against .visual-baseline/baseline
 *   node scripts/visual-diff.mjs --update   accept current output as the baseline
 *
 * Baselines are meant to be committed. This project is not yet under version
 * control, so treat the stored baseline as provisional.
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { ROUTES, VIEWPORTS, mockApi, waitForServer } from './browser-fixtures.mjs';
import { buildMask, maskedCount, applyMask } from './visual-mask.mjs';
import { MAX_DIFF_RATIO, MAX_DIFF_PIXELS, evaluateBudget } from './visual-budget.mjs';

const PORT = 4182;
const BASE = `http://localhost:${PORT}`;
const BASELINE_DIR = '.visual-baseline/baseline';
const CURRENT_DIR = '.visual-baseline/current';
const DIFF_DIR = '.visual-baseline/diff';
// Masks live outside the baseline directory on purpose: the manifest hashes
// every .png in baseline/, and mask geometry is not part of the image content.
const MASK_DIR = '.visual-baseline/current';

/**
 * Photographic regions are excluded from the ratio.
 *
 * The problem: a JPEG re-rasterises almost entirely when it moves even one
 * pixel. A 1px layout shift above the council photograph on the home page
 * produced a 2.857% "difference" that was entirely displaced pixels inside the
 * image, while the surrounding text — the part a reviewer actually needs to see
 * — was buried in noise. That makes the gate simultaneously hypersensitive to
 * sub-pixel movement and blind to real changes near a photo.
 *
 * The fix: exclude pixels that are photographic. Everything else keeps its full
 * weight, so a genuine typographic or layout change is still caught. Masked
 * area is reported explicitly so an exclusion is never silent.
 *
 * Masks are captured in the same page state as the screenshot, so a rectangle
 * cannot drift out of register with the image it describes.
 */
const MASK_SELECTOR = [
  'img',                       // council group photo, news covers, member photos
  '.v11-figure',               // figure wrappers, incl. caption band
  '.v11-seal',                 // rendered seal, rasterised not vector
  '.v11-officer-portrait',
  '.v11-member-img',
].join(',');

/** Collects bounding boxes of every maskable region, in full-page coordinates. */
const COLLECT_MASKS = (selector) => {
  const seen = [];
  for (const el of document.querySelectorAll(selector)) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    // Fully transparent and zero-opacity images contribute no pixels.
    if (parseFloat(style.opacity) === 0) continue;
    seen.push({
      x: Math.max(0, Math.floor(rect.left + window.scrollX)),
      y: Math.max(0, Math.floor(rect.top + window.scrollY)),
      w: Math.ceil(rect.width),
      h: Math.ceil(rect.height),
      tag: el.tagName.toLowerCase(),
    });
  }
  return {
    // Full-page capture dimensions, NOT the viewport. The screenshot is
    // fullPage:true, so a viewport-height record would misdescribe every region
    // below the fold and could clip a mask onto the wrong pixels.
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body ? document.body.scrollWidth : 0,
      window.innerWidth
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      window.innerHeight
    ),
    regions: seen,
  };
};

const UPDATE = process.argv.includes('--update');

if (!existsSync('dist')) {
  console.error('FAIL: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

mkdirSync(CURRENT_DIR, { recursive: true });
mkdirSync(DIFF_DIR, { recursive: true });
mkdirSync(MASK_DIR, { recursive: true });

// A prior run may have captured routes that have since been removed. Clear only
// generated screenshots and mask sidecars so each diff and --update covers the
// route table from this run, never leftover artifacts from an older run.
for (const file of readdirSync(CURRENT_DIR)) {
  if (file.endsWith('.png') || file.endsWith('.json')) unlinkSync(join(CURRENT_DIR, file));
}
for (const file of readdirSync(DIFF_DIR)) {
  if (file.endsWith('.png')) unlinkSync(join(DIFF_DIR, file));
}

const hasBaseline = existsSync(BASELINE_DIR) && readdirSync(BASELINE_DIR).some((f) => f.endsWith('.png'));

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;

try {
  await waitForServer(BASE);
  browser = await chromium.launch();

  for (const [name, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await mockApi(page);
    for (const [routeName, routePath, prepare] of ROUTES) {
      await page.goto(`${BASE}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
      // Reach the state this route is meant to record BEFORE the masks are
      // collected, so the mask geometry describes the same layout the screenshot
      // records. A mask taken in the pre-interaction state would not register with
      // the captured image.
      if (prepare) await prepare(page);
      await page.waitForTimeout(250);
      // Collect masks BEFORE the screenshot so the geometry is the settled
      // layout the capture is about to record. Screenshotting first would race
      // any late reflow.
      const masks = await page.evaluate(COLLECT_MASKS, MASK_SELECTOR);
      await page.screenshot({ path: join(CURRENT_DIR, `${routeName}--${name}.png`), fullPage: true });
      // Written after the screenshot so the mask describes exactly the image
      // that was recorded, even if the page reflowed in between.
      writeFileSync(join(MASK_DIR, `${routeName}--${name}.json`), JSON.stringify(masks));
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill();
}

const currentFiles = readdirSync(CURRENT_DIR).filter((f) => f.endsWith('.png'));

if (UPDATE || !hasBaseline) {
  mkdirSync(BASELINE_DIR, { recursive: true });
  for (const file of currentFiles) {
    copyFileSync(join(CURRENT_DIR, file), join(BASELINE_DIR, file));
  }
  console.log(`${UPDATE ? 'Baseline updated' : 'No baseline found; baseline written'}: ${currentFiles.length} images in ${BASELINE_DIR}`);
  console.log('Masks were written to .visual-baseline/current and are regenerated each run.');
  console.log('Photographic regions are excluded from the ratio; everything else compares in full.');
  process.exit(0);
}

console.log('Visual diff against baseline');
console.log('===========================');

let failures = 0;
let compared = 0;
const ratios = [];

/**
 * Builds a single deduplicated mask bitmap for the image.
 *
 * Naively summing region areas is wrong: a <div> wrapping an <iframe>, or a
 * <figure> wrapping an <img>, produces two identical rectangles, and counting
 * both inflates the excluded share (this briefly reported tourism as 47%
 * masked when the true figure was far lower). A bitmap union counts each pixel
 * exactly once.
 *
 * Returns null when no mask exists, so the caller falls back to a full-image
 * comparison rather than silently treating "no mask" as "nothing excluded".
 */
const loadRegions = (file) => {
  const maskPath = join(MASK_DIR, file.replace(/\.png$/, '.json'));
  if (!existsSync(maskPath)) return null;
  try {
    const payload = JSON.parse(readFileSync(maskPath, 'utf8'));
    return Array.isArray(payload?.regions) ? payload.regions : null;
  } catch {
    return null;
  }
};

const loadMask = (file, imgWidth, imgHeight) =>
  buildMask(loadRegions(file), imgWidth, imgHeight);

for (const file of currentFiles) {
  const baselinePath = join(BASELINE_DIR, file);
  if (!existsSync(baselinePath)) {
    failures += 1;
    console.log(`FAIL  ${file.padEnd(34)} no baseline image`);
    continue;
  }
  const baseImg = PNG.sync.read(readFileSync(baselinePath));
  const currImg = PNG.sync.read(readFileSync(join(CURRENT_DIR, file)));

  if (baseImg.width !== currImg.width || baseImg.height !== currImg.height) {
    failures += 1;
    console.log(`FAIL  ${file.padEnd(34)} size changed ${baseImg.width}x${baseImg.height} -> ${currImg.width}x${currImg.height}`);
    continue;
  }

  const diff = new PNG({ width: baseImg.width, height: baseImg.height });

  // Blank every masked pixel in BOTH images before counting, so photographic
  // area contributes to neither the numerator nor the denominator. Blanking
  // both is what keeps it neutral: masking only the current image would make
  // every masked pixel count as changed.
  const mask = loadMask(file, baseImg.width, baseImg.height);
  const maskedPixels = maskedCount(mask);
  // Blanking baseline, current AND diff keeps masked area neutral. Masking only
  // the current image would turn every masked pixel into a counted difference.
  applyMask(mask, baseImg.data, currImg.data, diff.data);

  // Recount after masking so the result reflects only comparable pixels.
  const comparable = baseImg.width * baseImg.height - maskedPixels;
  const after = comparable > 0
    ? pixelmatch(baseImg.data, currImg.data, diff.data, baseImg.width, baseImg.height, { threshold: 0.1 })
    : 0;
  const ratio = comparable > 0 ? after / comparable : 0;
  compared += 1;
  const maskedShare = (baseImg.width * baseImg.height) > 0 ? maskedPixels / (baseImg.width * baseImg.height) : 0;
  ratios.push({ file, ratio, changed: after, maskedShare });

  const maskNote = maskedPixels
    ? `  [${(maskedShare * 100).toFixed(1)}% photographic excluded]`
    : '';

  // Both budgets are applied by the shared decision function, so the unit tests
  // and this CLI can never drift apart.
  const verdict = evaluateBudget({ changed: after, comparable });

  if (verdict.fail) {
    failures += 1;
    writeFileSync(join(DIFF_DIR, file), PNG.sync.write(diff));
    console.log(
      `FAIL  ${file.padEnd(34)} ${after} px changed (max ${MAX_DIFF_PIXELS}), ${(ratio * 100).toFixed(3)}% (max ${(MAX_DIFF_RATIO * 100).toFixed(3)}%) [${verdict.which}]${maskNote} -> ${DIFF_DIR}/${file}`
    );
  } else if (maskedPixels) {
    console.log(`PASS  ${file.padEnd(34)} ${after} px, ${(ratio * 100).toFixed(4)}%${maskNote}`);
  }
}

// Report the largest ratios even when everything passes, so the tolerance can
// be calibrated against observed noise rather than guessed.
ratios.sort((a, b) => b.ratio - a.ratio);
console.log('');
console.log('Largest differences observed (photographic regions excluded):');
for (const { file, ratio, changed, maskedShare } of ratios.slice(0, 5)) {
  const mask = maskedShare ? `  [${(maskedShare * 100).toFixed(1)}% masked]` : '';
  console.log(`  ${String(changed).padStart(6)} px  ${(ratio * 100).toFixed(4).padStart(8)}%  ${file}${mask}`);
}

// Exclusions must never be silent: if a mask ever swallowed a large share of a
// page, that page effectively stopped being compared.
const heavy = ratios.filter((r) => r.maskedShare > 0.5);
if (heavy.length) {
  console.log('');
  console.log('WARNING: over half of these images is photographic and therefore');
  console.log('not compared:');
  for (const { file, maskedShare } of heavy) {
    console.log(`  ${(maskedShare * 100).toFixed(1)}%  ${file}`);
  }
}

console.log('');
console.log(
  `Compared ${compared}/${currentFiles.length} images. A route fails above either budget:`
);
console.log(
  `  ${MAX_DIFF_PIXELS} changed pixels (consistent across viewports), or`
);
console.log(
  `  ${(MAX_DIFF_RATIO * 100).toFixed(3)}% of comparable pixels (catches proportional drift).`
);
console.log(failures === 0
  ? 'Visual regression gate: no differences beyond tolerance.'
  : `Visual regression gate: ${failures} image(s) differ. Review ${DIFF_DIR}, then re-run with --update if the change is intended.`);
process.exit(failures === 0 ? 0 : 1);
