import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mockApi } from './browser-fixtures.mjs';

/**
 * Captures a few viewport-sized (not full-page) frames for human review.
 *
 * The stored baselines are full-page captures, so a 5000px home shot shrinks to
 * an unreadable strip when scaled to fit. These are capped to one viewport so
 * the type and spacing are actually legible.
 *
 * The API mock comes from browser-fixtures.mjs. This file previously carried its
 * own copy of the fixture data and its own mock, which is how the document list
 * came to differ between the review shots and the baseline they were supposed to
 * be explaining.
 */
const BASE = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:4173';
const OUT = 'review-shots';
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  ['home-top', '/', 1440, 900, 0],
  ['home-council', '/', 1440, 900, 1150],
  ['home-records', '/', 1440, 900, 2400],
  ['home-mobile-top', '/', 390, 844, 0],
  ['ordinances', '/ordinances', 1440, 900, 0],
  ['members', '/members', 1440, 900, 0],
  ['document', '/document/doc-1', 1440, 900, 0],
  ['tourism', '/tourism', 1440, 900, 0],
];

const browser = await chromium.launch();
for (const [name, route, width, height, scrollY] of SHOTS) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await mockApi(page);
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(300);
  if (scrollY) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`captured ${name}`);
  await context.close();
}
await browser.close();
console.log(`\nwrote ${SHOTS.length} frames to ${OUT}/`);
