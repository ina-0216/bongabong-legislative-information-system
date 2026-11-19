#!/usr/bin/env node
/**
 * Builds the Tagalog review packet a native speaker actually needs.
 *
 * Why this exists alongside generate-translation-checklist.mjs:
 *
 *   1. That generator parses only `key: 'value'` on one line. The catalogue has
 *      313 keys and 12 of them wrap their value onto the following line, so 12
 *      long-form Tagalog drafts were reported in neither the drafted nor the
 *      outstanding bucket. It printed "missing 0" while those keys were simply
 *      never seen — including every sentence of the About, seal and legislative
 *      copy, which is exactly the prose most in need of a native review.
 *
 *      Line endings are part of that story. The catalogue is checked in with CRLF,
 *      and in JavaScript `.` does not match `\r`, so any pattern anchored on `$`
 *      silently fails on every CRLF line. This file normalises line endings before
 *      parsing for that reason.
 *
 *   2. It answers "is it translated?", which is a coverage question. A native
 *      reviewer needs different things: where the string appears, whether it is
 *      official vocabulary the municipality must sign off, and a place to record
 *      a verdict.
 *
 * Verdicts are stored separately, in docs/translation-review.csv. Regenerating
 * this packet therefore never discards a reviewer's decisions — the ledger is
 * merged in by key, and a key absent from it is reported as pending rather than
 * reset.
 *
 * Usage: node scripts/generate-translation-review-packet.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCatalogue, CATALOGUE_PATH, placeholdersOf } from './catalogue.mjs';

const SRC = CATALOGUE_PATH;
const LEDGER = 'docs/translation-review.csv';
const OUT = 'docs/translation-review-packet.md';
// All of src, not just pages and components. `skipToMainContent` is referenced
// from App.jsx; scanning only the two obvious directories reported it as dead,
// which is exactly the kind of false claim this packet must not make.
const SCAN_ROOT = 'src';

/**
 * Official and legal vocabulary. These strings carry the municipality's voice, so
 * a machine draft is a draft in a way that "Barangay" is not.
 *
 * Matched against the English source, because that is what tells us whether the
 * string claims to speak for the institution.
 */
const OFFICIAL_TERMS = /\b(ordinance|resolution|municipal|sangguniang|councilor|barangay|committee|committees|session|sessions|consultation|mayor|governor|federation|seal|charter|ordinance|legislative|secretariat|treasurer|auditor|exhibit|resolution|joint resolution|legislator|office|official|motto|vision|mission|pledge|commitment)\b/i;

/** Strings longer than this are sentences, not labels, and need a register check. */
const LONG_PROSE = 140;

/**
 * One description per flag code, for the summary table.
 *
 * Written here rather than lifted from the first flagged row, because several
 * notes embed a per-key count ("rendered in 2 files", "224 characters") that is
 * meaningless when quoted as the description of that code across every key
 * carrying it.
 */
const CODE_NOTES = {
  'PLACEHOLDER-MISMATCH':
    'a {placeholder} present in the English string is missing or renamed in the Tagalog one, so it renders as literal braces',
  IDENTICAL:
    'Tagalog is byte-identical to the English source; either an untranslated draft or a term that is intentionally the same',
  UNTRANSLATED: 'no Tagalog value at all; the string renders English for a Tagalog visitor',
  'OFFICIAL-VOCABULARY':
    'speaks for the institution; needs municipal sign-off, not just fluency',
  'LONG-PROSE': 'a full sentence rather than a label; check register and voice, not only accuracy',
  UNREFERENCED: 'this key name appears nowhere in any page or component; the catalogue entry is dead weight',
  'DATA-DRIVEN':
    'resolved dynamically from a data array rather than a literal t() call; check the lookup still matches this spelling',
  SHARED: 'rendered in more than one file, so the wording must stay consistent across them',
};

/**
 * Where each key is used, split by how it is reached.
 *
 * A literal `t('key')` scan alone under-reports badly. Tourism holds its keys in
 * data arrays — `{ titleKey: 'tourismActivityPort' }` — and resolves them later
 * through `t(entry.titleKey)`, so every one of those keys is live while a
 * literal call-site scan sees none of them. Treating those as dead keys would send
 * a reviewer hunting for strings that are plainly in use.
 *
 * So a key counts as referenced if it appears as a quoted string anywhere in a
 * scanned file, and the two cases are reported separately so the reviewer can see
 * which is which: `direct` is called literally, `data` is resolved dynamically.
 */
function buildCallSites() {
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(jsx|js)$/.test(entry.name)) files.push(p);
    }
  };
  walk(SCAN_ROOT);

  const sites = new Map();
  const record = (key, file, kind) => {
    if (!sites.has(key)) sites.set(key, { direct: new Set(), data: new Set() });
    sites.get(key)[kind].add(file);
  };

  for (const file of files) {
    const src = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
    // Direct calls: t('key')
    for (const m of src.matchAll(/\bt\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g)) {
      record(m[1], file, 'direct');
    }
    // Any quoted occurrence of a key-shaped identifier, which covers the
    // `titleKey: '…'` data pattern and template-built lookups.
    for (const m of src.matchAll(/['"]([A-Za-z][A-Za-z0-9_]{4,})['"]/g)) {
      record(m[1], file, 'data');
    }
  }
  return sites;
}

const placeholders = (s) => placeholdersOf(s);

/**
 * Flags each key for the reviewer.
 *
 * `severity` drives sort order only; the flags themselves are what the reviewer
 * reads. The two HIGH severities are machine-detectable defects rather than
 * judgement calls: a placeholder that went missing renders literal `{title}` to
 * a visitor, and an identical pair means the string was never translated at all.
 */
function flagsFor(key, en, tl, sites) {
  const flags = [];
  if (en === null || tl === null) {
    flags.push({ code: 'UNTRANSLATED', note: 'no Tagalog value; renders English', severity: 'HIGH' });
    return flags;
  }

  const enPh = placeholders(en);
  const tlPh = placeholders(tl);
  const missing = [...enPh].filter((p) => !tlPh.has(p));
  const added = [...tlPh].filter((p) => !enPh.has(p));
  if (missing.length || added.length) {
    flags.push({
      code: 'PLACEHOLDER-MISMATCH',
      note: `en has [${[...enPh].join(' ') || 'none'}], tl has [${[...tlPh].join(' ') || 'none'}] — a dropped {placeholder} renders literally`,
      severity: 'HIGH',
    });
  }

  if (en === tl && en.trim().split(/\s+/).length > 1) {
    flags.push({
      code: 'IDENTICAL',
      note: 'Tagalog is byte-identical to the English source; either an untranslated draft or a term that is intentionally the same',
      severity: 'HIGH',
    });
  }

  if (OFFICIAL_TERMS.test(en)) {
    flags.push({
      code: 'OFFICIAL-VOCABULARY',
      note: 'speaks for the institution; needs municipal sign-off, not just fluency',
      severity: 'REVIEW',
    });
  }

  if (en.length > LONG_PROSE) {
    flags.push({
      code: 'LONG-PROSE',
      note: `${en.length} characters — check register and voice, not just accuracy`,
      severity: 'REVIEW',
    });
  }

  const where = sites.get(key);
  const direct = where ? where.direct : new Set();
  const data = where ? where.data : new Set();
  const all = new Set([...direct, ...data]);

  if (all.size === 0) {
    flags.push({
      code: 'UNREFERENCED',
      note: 'this key name appears nowhere in any page or component; the catalogue entry is dead weight',
      severity: 'INFO',
    });
  } else {
    if (direct.size === 0) {
      flags.push({
        code: 'DATA-DRIVEN',
        note: 'resolved dynamically from a data array rather than a literal t() call; check the lookup still matches this spelling',
        severity: 'INFO',
      });
    }
    if (all.size > 1) {
      flags.push({
        code: 'SHARED',
        note: `rendered in ${all.size} files; wording must stay consistent across them`,
        severity: 'INFO',
      });
    }
  }
  return flags;
}

/** Minimal CSV reader/writer for the verdict ledger. */
function readLedger() {
  if (!existsSync(LEDGER)) return new Map();
  const lines = readFileSync(LEDGER, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = lines.shift()?.split(',').map((h) => h.trim()) ?? [];
  const idx = (name) => head.indexOf(name);
  const map = new Map();
  for (const line of lines) {
    const cells = line.split(',');
    const key = (cells[idx('key')] ?? '').trim();
    if (!key) continue;
    map.set(key, {
      verdict: (cells[idx('verdict')] ?? '').trim(),
      reviewer: (cells[idx('reviewer')] ?? '').trim(),
      notes: (cells[idx('notes')] ?? '').trim(),
    });
  }
  return map;
}

function writeLedger(entries) {
  mkdirSync('docs', { recursive: true });
  const rows = ['key,verdict,reviewer,notes'];
  for (const [key, rec] of [...entries].sort(([a], [b]) => a.localeCompare(b))) {
    const safe = (s) => String(s ?? '').replace(/,/g, ' ');
    rows.push(`${key},${safe(rec.verdict || 'pending')},${safe(rec.reviewer)},${safe(rec.notes)}`);
  }
  writeFileSync(LEDGER, `${rows.join('\n')}\n`, 'utf8');
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// ---------------------------------------------------------------- build

const { en: enEntries, tl: tlEntries } = parseCatalogue(readFileSync(SRC, 'utf8'));
const sites = buildCallSites();

const rows = [...enEntries.keys()]
  .sort((a, b) => a.localeCompare(b))
  .map((key) => {
    const en = enEntries.get(key) ?? null;
    const tl = tlEntries.has(key) ? tlEntries.get(key) : undefined;
    const flags = flagsFor(key, en, tl ?? null, sites);
    return {
      key,
      en,
      tl: tl ?? null,
      missing: !tlEntries.has(key),
      files: [...new Set([...(sites.get(key)?.direct ?? []), ...(sites.get(key)?.data ?? [])])].sort(),
      direct: [...(sites.get(key)?.direct ?? [])].sort(),
      flags,
      severity: flags.some((f) => f.severity === 'HIGH')
        ? 'HIGH'
        : flags.some((f) => f.severity === 'REVIEW')
          ? 'REVIEW'
          : 'OK',
    };
  });

const ledger = readLedger();
const merged = rows.map((r) => ({ ...r, ...(ledger.get(r.key) ?? { verdict: 'pending', reviewer: '', notes: '' }) }));
writeLedger(new Map(merged.map((r) => [r.key, r])));

const byCode = new Map();
for (const r of merged) for (const f of r.flags) byCode.set(f.code, (byCode.get(f.code) ?? 0) + 1);

const verdictCounts = new Map();
for (const r of merged) verdictCounts.set(r.verdict || 'pending', (verdictCounts.get(r.verdict || 'pending') ?? 0) + 1);

const high = merged.filter((r) => r.severity === 'HIGH');
const review = merged.filter((r) => r.severity === 'REVIEW');

const table = (list) =>
  [
    '| Key | English | Tagalog (draft) | Where | Flags |',
    '| --- | --- | --- | --- | --- |',
    ...list.map(
      (r) =>
        `| \`${r.key}\` | ${esc(r.en)} | ${esc(r.tl)} | ${r.files.length ? r.files.map((f) => `\`${f}\``).join(', ') : '_unreferenced_'} | ${r.flags.map((f) => `\`${f.code}\``).join(' ') || '—'} |`
    ),
  ].join('\n');

let md = `# Tagalog review packet

Generated by \`node scripts/generate-translation-review-packet.mjs\` from \`${SRC}\`.
Do not hand-edit this file. **Record decisions in \`${LEDGER}\`** and regenerate.

## What this is for

Every Tagalog string in this portal is a machine draft. Nothing here has been
reviewed by a native Tagalog speaker, and the civic and legal copy in particular
should not go live on a draft — an unofficial rendering would misrepresent the
municipality's voice. This packet exists so a reviewer can work through the
catalogue once, with the context and the risk in front of them.

## Coverage

| Bucket | Count |
| --- | --- |
| Catalogue keys (EN) | ${enEntries.size} |
| Keys with a Tagalog value | ${merged.filter((r) => r.tl !== null).length} |
| Keys with no Tagalog entry | ${merged.filter((r) => r.missing).length} |
| Rendered somewhere (\`t()\` call site) | ${merged.filter((r) => r.files.length).length} |
| Never rendered | ${merged.filter((r) => !r.files.length).length} |

Review progress:

| Verdict | Keys |
| --- | --- |
${[...verdictCounts].sort().map(([v, n]) => `| \`${v}\` | ${n} |`).join('\n')}

## Automated flags

These are machine-detectable, not judgement calls. Each was a real defect class in
this codebase rather than a hypothetical.

| Flag | Keys | Meaning |
| --- | --- | --- |
${[...byCode].sort().map(([c, n]) => `| \`${c}\` | ${n} | ${CODE_NOTES[c] ?? ''} |`).join('\n')}

## How to review

1. Work the \`${LEDGER}\` file, not this one. One row per key: \`verdict\`, \`reviewer\`, \`notes\`.
2. Set \`verdict\` to one of \`pending\`, \`accepted\`, or \`needs-rework\`.
3. For \`OFFICIAL-VOCABULARY\` rows, confirm the term against how the municipality
   actually writes it. Tagalog legal and civic registers are not interchangeable
   with conversational Tagalog, and a fluent translation can still be the wrong
   register.
4. For \`PLACEHOLDER-MISMATCH\` and \`IDENTICAL\`, this is a defect, not a style
   question. Do not mark those accepted without changing the catalogue.
5. For \`LONG-PROSE\`, read for voice and register, not only for accuracy.
6. Re-run the generator afterwards; it merges your verdicts and reports anything
   still pending.

${high.length ? `## HIGH — machine-detected defects\n\n${table(high)}\n` : '## HIGH — machine-detected defects\n\nNone.\n'}
${review.length ? `## REVIEW — judgement required\n\n${table(review)}\n` : '## REVIEW — judgement required\n\nNone.\n'}
## Full ledger

Every key, alphabetically, with where it renders.

${table(merged)}
`;

mkdirSync('docs', { recursive: true });
writeFileSync(OUT, md, 'utf8');

console.log(`Wrote ${OUT}`);
console.log(`  keys ${enEntries.size}, rendered ${merged.filter((r) => r.files.length).length}, unreferenced ${merged.filter((r) => !r.files.length).length}`);
console.log(`  HIGH ${high.length}, REVIEW ${review.length}`);
console.log(`  ledger ${LEDGER}: ${merged.filter((r) => r.verdict && r.verdict !== 'pending').length} decided, ${merged.filter((r) => !r.verdict || r.verdict === 'pending').length} pending`);
console.log(`  flags: ${[...byCode].map(([c, n]) => `${c}=${n}`).join(' ')}`);
