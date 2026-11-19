#!/usr/bin/env node
/**
 * Design-contract gate, static half.
 *
 * Reads src/v11.css and asserts the objective rules declared in
 * design-contract.mjs. Runs in about a millisecond, needs no browser, and is
 * safe to run on every commit.
 *
 * Advisory rules report; they never fail. That split is deliberate — a gate
 * that blocks on known debt gets disabled, and then you have lost the layer
 * entirely.
 *
 * Usage: node scripts/audit-design-source.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { runSourceRules, STYLESHEETS, LEVEL } from './design-contract.mjs';

/**
 * Reads every stylesheet the app ships.
 *
 * index.css is the entry point and imports v11.css, so a scan of one file
 * alone would miss half the cascade. A stylesheet that fails to load is a hard
 * error rather than a silent skip: a missing stylesheet must not be able to
 * make the gate pass by being absent.
 */
const sheets = STYLESHEETS.map(({ path, primary }) => {
  if (!existsSync(path)) {
    console.error(`FAIL: ${path} not found. Run from the portal root.`);
    process.exit(1);
  }
  return { path, primary, source: readFileSync(path, 'utf8') };
});

const results = runSourceRules(
  sheets.map((s) => ({ path: s.path, source: s.source }))
);

console.log('Design contract — source audit');
console.log('===============================');
console.log(`stylesheets: ${sheets.map((s) => `${s.path} (${s.source.split('\n').length} lines)`).join(', ')}`);
console.log('source of truth: the shipped v11 layer + Munder principles');
console.log('');

let enforcedFailures = 0;
let advisoryFindings = 0;

for (const { id, level, why, findings } of results) {
  // A rule only prints FAIL when it actually has findings. Advisory rules print
  // NOTE whether or not they found anything, since their whole job is to report.
  const tag = level === LEVEL.ENFORCED ? (findings.length ? 'FAIL' : 'PASS') : (findings.length ? 'NOTE' : 'PASS');
  if (level === LEVEL.ENFORCED && findings.length) enforcedFailures += 1;
  if (level === LEVEL.ADVISORY && findings.length) advisoryFindings += findings.length;

  console.log(`${tag}  ${id.padEnd(18)} ${level}`);
  console.log(`      ${why}`);
  for (const finding of findings) console.log(`      -> ${finding}`);
  if (!findings.length) console.log('      -> conforms');
  console.log('');
}

const enforcedTotal = results.filter((r) => r.level === LEVEL.ENFORCED).length;

console.log('-----------------------------------');
console.log(`${enforcedTotal - enforcedFailures}/${enforcedTotal} enforced rules conform`);

if (advisoryFindings) {
  console.log('');
  console.log(`${advisoryFindings} advisory finding(s) — reported, not failing.`);
  console.log('Advisory rules measure known debt. See docs/design-review.md for');
  console.log('the migration plan. They become enforced when the migration lands.');
}

console.log('');
console.log(
  enforcedFailures === 0
    ? 'Design source audit: all enforced rules conform.'
    : `Design source audit: ${enforcedFailures} enforced rule(s) violated.`
);

process.exit(enforcedFailures === 0 ? 0 : 1);