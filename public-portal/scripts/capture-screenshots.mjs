#!/usr/bin/env node
/**
 * Captures full-page screenshots of every route at mobile / tablet / desktop
 * into .visual-baseline/<label>/ for human design review.
 *
 * The automated pixel comparison lives in visual-diff.mjs; this script only
 * records evidence. Requires a prior `npm run build`.
 * Usage: node scripts/capture-screenshots.mjs [label]
 */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTES, VIEWPORTS, mockApi, waitForServer } from './browser-fixtures.mjs';

const LABEL = process.argv[2] || 'baseline';
const PORT = 4183;
const BASE = `http://localhost:${PORT}`;
const OUT_DIR = join('.visual-baseline', LABEL);

if (!existsSync('dist')) {
  console.error('FAIL: dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;
let failures = 0;

try {
  await waitForServer(BASE);
  browser = await chromium.launch();

  for (const [name, width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await mockApi(page);

    const consoleErrors = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

    for (const [routeName, routePath, prepare] of ROUTES) {
      const file = join(OUT_DIR, `${routeName}--${name}.png`);
      try {
        await page.goto(`${BASE}${routePath}`, { waitUntil: 'networkidle', timeout: 30000 });
        // A route may need to reach a state that is not the default view before
        // it is worth recording. Skipped when absent, so plain routes behave
        // exactly as before.
        if (prepare) await prepare(page);
        await page.waitForTimeout(250);
        await page.screenshot({ path: file, fullPage: true });
      } catch (error) {
        failures += 1;
        console.log(`  FAILED ${routeName} @ ${name}: ${error.message}`);
      }
    }

    if (consoleErrors.length) {
      console.log(`  [${name}] ${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
      failures += consoleErrors.length;
    }
    await context.close();
  }

  const expected = ROUTES.length * VIEWPORTS.length;
  console.log(`Captured ${expected - failures}/${expected} screenshots into ${OUT_DIR}`);
} finally {
  if (browser) await browser.close();
  server.kill();
}

process.exit(failures === 0 ? 0 : 1);