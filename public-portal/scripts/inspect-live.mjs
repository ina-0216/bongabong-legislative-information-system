import { chromium } from '@playwright/test';
import { mockApi } from './browser-fixtures.mjs';

/**
 * Reads real computed values from the running preview server.
 *
 * Image attachments are unavailable in this session, so this reports what is
 * actually rendered rather than what the stylesheet intends. Every number here
 * comes from getComputedStyle against a live DOM.
 *
 * The API mock comes from browser-fixtures.mjs rather than a private copy. This
 * file had drifted to the point where its local document had no `type` field and
 * no description, so the home page it inspected was not the home page any other
 * check inspects.
 */
const BASE = 'http://localhost:4173';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await mockApi(page);

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const data = await page.evaluate(() => {
  // getPropertyValue needs kebab-case CSS names, not camelCase.
  const g = (el, p) => (el ? getComputedStyle(el).getPropertyValue(p).trim() : 'n/a');

  const bands = [...document.querySelectorAll('.v11-band')].map((b) => ({
    id: b.id || b.className.replace('v11-band', '').trim(),
    bg: g(b, 'background-color'),
    padding: g(b, 'padding-top'),
  }));

  const h1 = document.querySelector('h1');
  const lede = document.querySelector('.v11-hero-lede');
  const kicker = document.querySelector('.v11-kicker');
  const primary = document.querySelector('.v11-btn-primary');
  const stats = [...document.querySelectorAll('.v11-stat')].map((s) => ({
    label: s.querySelector('dt')?.textContent.trim(),
    value: s.querySelector('dd')?.textContent.trim(),
  }));

  const radii = new Set();
  for (const el of document.querySelectorAll('.v11-page *')) {
    const r = getComputedStyle(el).borderRadius;
    if (r && r !== '0px') radii.add(r);
  }

  const families = {};
  for (const [k, sel] of [['h1', 'h1'], ['lede', '.v11-hero-lede'], ['stat label', '.v11-stat dt'], ['record title', '.v11-record-title']]) {
    const el = document.querySelector(sel);
    families[k] = el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/"/g, '') : 'n/a';
  }

  return {
    pageBackground: g(document.body, 'background-color'),
    bands,
    h1: { text: h1?.textContent.trim(), font: g(h1, 'font-family'), size: g(h1, 'font-size'), weight: g(h1, 'font-weight'), lineHeight: g(h1, 'line-height'), color: g(h1, 'color') },
    lede: { size: g(lede, 'font-size'), color: g(lede, 'color') },
    kicker: { text: kicker?.textContent.trim(), size: g(kicker, 'font-size'), spacing: g(kicker, 'letter-spacing'), transform: g(kicker, 'text-transform'), color: g(kicker, 'color') },
    primaryBtn: { text: primary?.textContent.trim(), bg: g(primary, 'background-color'), color: g(primary, 'color'), radius: g(primary, 'border-radius'), minHeight: g(primary, 'min-height') },
    stats,
    radiiInUse: [...radii].sort(),
    families,
    pageHeight: document.documentElement.scrollHeight,
  };
});

console.log('LIVE RENDER — http://localhost:4173  (1440x900)');
console.log('===========================================');
console.log(`page height      ${data.pageHeight}px  (${(data.pageHeight / 900).toFixed(1)} screens)`);
console.log(`body background  ${data.pageBackground}`);
console.log('');
console.log('BANDS (real computed backgrounds)');
for (const b of data.bands) console.log(`  ${String(b.id || '(unnamed)').padEnd(14)} ${b.bg.padEnd(22)} pad-top ${b.padding}`);
console.log('');
console.log('HERO');
console.log(`  h1        "${data.h1.text}"`);
console.log(`            ${data.h1.size} / ${data.h1.lineHeight} / ${data.h1.weight} / ${data.h1.color}`);
console.log(`  lede       ${data.lede.size} / ${data.lede.color}`);
console.log(`  kicker    "${data.kicker.text}" ${data.kicker.size} ls:${data.kicker.spacing} ${data.kicker.transform} ${data.kicker.color}`);
console.log(`  CTA       "${data.primaryBtn.text}" bg ${data.primaryBtn.bg} text ${data.primaryBtn.color}`);
console.log(`            radius ${data.primaryBtn.radius}, min-height ${data.primaryBtn.minHeight}`);
console.log('');
console.log('COUNTS BAND (live API values)');
for (const s of data.stats) console.log(`  ${String(s.label).padEnd(22)} ${s.value}`);
console.log('');
console.log('TYPE FAMILIES IN USE');
for (const [k, v] of Object.entries(data.families)) console.log(`  ${k.padEnd(14)} ${v}`);
console.log('');
console.log(`BORDER RADII IN USE   ${data.radiiInUse.join(', ')}`);

await browser.close();