import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseCatalogue, CATALOGUE_PATH, VERDICTS } from '../../scripts/catalogue.mjs';

/**
 * The review packet is the handover artefact for a human translator, so the two
 * failure modes that matter are drift and data loss.
 *
 * Drift: a key is added to the catalogue and never reaches the reviewer, because
 * nobody regenerates the packet. The previous checklist had exactly this failure
 * in a worse form — it silently omitted 12 keys while reporting full coverage.
 *
 * Data loss: a reviewer records their decisions, someone regenerates, and the
 * decisions are gone. The generator merges verdicts by key for this reason, and
 * that behaviour is asserted here rather than assumed.
 */

const CATALOGUE = CATALOGUE_PATH;
const PACKET = 'docs/translation-review-packet.md';
const LEDGER = 'docs/translation-review.csv';

/** The catalogue is read with the shared parser, the same one the generator uses. */
function catalogueKeys() {
  return new Set(parseCatalogue(readFileSync(CATALOGUE, 'utf8')).en.keys());
}

function readLedger() {
  const lines = readFileSync(LEDGER, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(',').map((h) => h.trim());
  const at = (n) => head.indexOf(n);
  return lines
    .map((l) => l.split(','))
    .filter((c) => (c[at('key')] ?? '').trim())
    .map((c) => ({
      key: c[at('key')].trim(),
      verdict: (c[at('verdict')] ?? '').trim(),
      reviewer: (c[at('reviewer')] ?? '').trim(),
    }));
}

let keys;
let ledger;
let packet;

beforeAll(() => {
  keys = catalogueKeys();
  ledger = readLedger();
  packet = readFileSync(PACKET, 'utf8');
});

describe('translation review packet — it covers the catalogue exactly', () => {
  it('finds the catalogue and the artefacts it must stay in sync with', () => {
    expect(keys.size).toBeGreaterThan(300);
    expect(existsSync(PACKET)).toBe(true);
    expect(existsSync(LEDGER)).toBe(true);
  });

  it('gives every catalogue key a ledger row', () => {
    const inLedger = new Set(ledger.map((r) => r.key));
    expect([...keys].filter((k) => !inLedger.has(k))).toEqual([]);
  });

  it('has no ledger row for a key the catalogue does not define', () => {
    // A row for a deleted key would silently absorb a reviewer's verdict and
    // make the review progress figure wrong.
    expect(ledger.map((r) => r.key).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('has no duplicate ledger rows', () => {
    const seen = new Set();
    const dupes = [];
    for (const r of ledger) {
      if (seen.has(r.key)) dupes.push(r.key);
      else seen.add(r.key);
    }
    expect(dupes).toEqual([]);
  });

  it('lists every key in the packet', () => {
    const listed = new Set(
      [...packet.matchAll(/^\| `([A-Za-z][A-Za-z0-9_]*)`/gm)].map((m) => m[1])
    );
    expect([...keys].filter((k) => !listed.has(k))).toEqual([]);
  });

  it('counts the keys it claims to have in the packet', () => {
    // The coverage table is the first thing a reviewer reads. If it undercounts,
    // the packet invites a sign-off it has not earned.
    expect(packet).toContain(`| Catalogue keys (EN) | ${keys.size} |`);
  });
});

describe('translation review packet — verdicts are well formed', () => {
  it('uses only a verdict the reviewer can actually choose', () => {
    const bad = ledger.filter((r) => r.verdict && !VERDICTS.includes(r.verdict));
    expect(bad.map((r) => `${r.key}=${r.verdict}`)).toEqual([]);
  });

  it('defaults every undecided key to pending rather than blank', () => {
    const blanks = ledger.filter((r) => r.verdict === '').map((r) => r.key);
    expect(blanks).toEqual([]);
  });

  it('attributes a decision to a named reviewer', () => {
    // "accepted" with nobody against it is not a review record.
    const unattributed = ledger
      .filter((r) => r.verdict && r.verdict !== 'pending' && !r.reviewer)
      .map((r) => `${r.key}=${r.verdict}`);
    expect(unattributed).toEqual([]);
  });
});

describe('translation review packet — regenerating preserves reviewer decisions', () => {
  it('does not discard recorded verdicts', () => {
    const before = readLedger();
    execFileSync(process.execPath, ['scripts/generate-translation-review-packet.mjs'], {
      encoding: 'utf8',
    });
    const after = new Map(readLedger().map((r) => [r.key, r.verdict]));
    const lost = before
      .filter((r) => r.verdict && r.verdict !== 'pending')
      .filter((r) => after.get(r.key) !== r.verdict)
      .map((r) => r.key);
    expect(lost).toEqual([]);
  });

  it('produces byte-identical output on a second run', () => {
    const first = readFileSync(PACKET, 'utf8');
    execFileSync(process.execPath, ['scripts/generate-translation-review-packet.mjs'], {
      encoding: 'utf8',
    });
    expect(readFileSync(PACKET, 'utf8')).toBe(first);
  });
});