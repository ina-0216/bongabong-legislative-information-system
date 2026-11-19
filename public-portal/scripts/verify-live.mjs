import { chromium } from '@playwright/test';

/**
 * Verifies the running portal against the LIVE API.
 *
 * Critically, this does NOT install the mockApi route that every other gate
 * uses. Requests go to the real server on :5001, so what is measured here is the
 * real integration rather than a deterministic fixture.
 */
const BASE = process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:4185';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();

// Record every request the portal makes and whether it succeeded.
const calls = [];
page.on('response', async (r) => {
  const u = new URL(r.url());
  if (!u.pathname.includes('/api/')) return;
  let body = '';
  try { body = (await r.text()).slice(0, 120); } catch { /* body already consumed */ }
  calls.push({ path: u.pathname + u.search, status: r.status(), body });
});
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(600);

const home = await page.evaluate(() => {
  const txt = (s) => document.querySelector(s)?.textContent?.trim() ?? null;
  return {
    heading: txt('h1'),
    stats: [...document.querySelectorAll('.v11-stat')].map((s) => ({
      label: s.querySelector('dt')?.textContent.trim(),
      value: s.querySelector('dd')?.textContent.trim(),
    })),
    // A real record number from the DB, not a fixture value.
    recordNumbers: [...document.querySelectorAll('.v11-record-num')].map((e) => e.textContent.trim()),
    recordTitles: [...document.querySelectorAll('.v11-record-title')].map((e) => e.textContent.trim()),
    noticeVisible: Boolean([...document.querySelectorAll('.v11-notice')].find((n) => n.offsetParent !== null)),
    emptyStates: [...document.querySelectorAll('.v11-empty')].map((e) => e.textContent.trim()),
    pageHeight: document.documentElement.scrollHeight,
  };
});

console.log(`LIVE INTEGRATION — portal ${BASE} against API :5001`);
console.log('===============================================');
console.log('API CALLS MADE BY THE HOMEPAGE');
for (const c of calls) console.log(`  ${String(c.status).padEnd(4)} ${c.path}`);
console.log('');
console.log('HOMEPAGE AS RENDERED');
console.log(`  h1              "${home.heading}"`);
console.log(`  page height     ${home.pageHeight}px`);
console.log(`  data notice     ${home.noticeVisible ? 'VISIBLE (API failing)' : 'not shown (API healthy)'}`);
console.log('');
console.log('COUNTS BAND (values come from MongoDB)');
for (const s of home.stats) console.log(`  ${String(s.label).padEnd(22)} ${s.value}`);
console.log('');
console.log('RECORD ROWS (numbers and titles come from MongoDB)');
home.recordNumbers.forEach((n, i) => console.log(`  ${n.padEnd(16)} ${home.recordTitles[i] ?? ''}`));
if (home.emptyStates.length) {
  console.log('');
  console.log('EMPTY STATES SHOWN');
  home.emptyStates.forEach((e) => console.log(`  ${e}`));
}
console.log('');
console.log(`console errors: ${consoleErrors.length}`);
for (const e of consoleErrors.slice(0, 5)) console.log(`  ${e.slice(0, 120)}`);

await browser.close();