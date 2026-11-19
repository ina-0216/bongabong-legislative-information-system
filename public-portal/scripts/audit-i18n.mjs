#!/usr/bin/env node
/**
 * Internationalisation gate.
 *
 * The portal has two distinct translation gaps, and conflating them hides the
 * serious one:
 *
 *   1. A key exists in the catalogue with a null Tagalog value. `t()` falls back
 *      to English, which is correct and visible in the checklist.
 *
 *   2. A string is hardcoded in JSX and never passes through `t()` at all. It
 *      cannot be translated by any amount of catalogue work, and no gate
 *      reported it. This is the defect this script exists to catch.
 *
 * Only user-visible text is flagged: JSX text nodes and a fixed set of
 * user-facing attributes. Proper nouns, addresses, email addresses, URLs and
 * identifiers are deliberately exempt — "Municipal Hall, Poblacion, Bongabong"
 * is a location, not copy that needs translating.
 *
 * Usage: node scripts/audit-i18n.mjs [--report]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PAGES = 'src/pages';
const COMPONENTS = 'src/components';

const collect = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.jsx$/.test(e.name))
    .map((e) => join(dir, e.name));

const files = [...collect(PAGES), ...collect(COMPONENTS)];

/**
 * Attributes whose values a screen-reader or sighted user reads as copy.
 *
 * Three forms, because three were missed:
 *
 *   alt="Home"                 double-quoted
 *   aria-label='Home'          single-quoted
 *   aria-label={`Home`}        template literal with no interpolation — the form
 *                              a hardcoded label takes when a sibling label on
 *                              the same element was routed through t(). The
 *                              optional `{` allows for the JSX expression
 *                              wrapper. `\${` is excluded so interpolated ones,
 *                              which are t(...) calls, are skipped.
 */
const TRANSLATABLE_ATTR =
  /\b(placeholder|aria-label|title|alt|label|allLabel)\s*=\s*\{?\s*(?:"([^"]{3,})"|'([^']{3,})'|`([^`$]{3,})`)/g;

/**
 * JSX text nodes: `>Some words<`. Requires at least two words and a leading
 * capital so identifiers and single tokens are not flagged.
 *
 * Leading whitespace may include newlines because JSX text children are almost
 * always written on their own indented line rather than inline. A single-line
 * pattern cannot see them, which is how `<button>\n  All terms\n</button>` and
 * `<span>\n  Term\n</span>` stayed untranslated while this gate reported clean.
 */
const JSX_TEXT =
  /(?<=[A-Za-z0-9._'"\-/])>\s*([A-Z][A-Za-z0-9&'’.,()\-—…*: \t\n]{4,})</g;

/**
 * String literals that render as copy: those inside a JSX expression container.
 *
 * Every loading and empty state in the portal is written as
 * `{loading ? 'Loading records…' : 'No records…'}`, so a `>`-anchored text-node
 * match cannot see any of them. That is why a whole band of loading copy went
 * untranslated while this gate reported a clean pass.
 *
 * Scoping to brace contents is what keeps this signal honest. An unscoped
 * string-literal match flags API status vocabularies (`'First Reading'`),
 * comparison operands (`includes('vice mayor')`), data arrays, prop defaults
 * and even comments — all of which are identifiers or developer text, not
 * visitor copy. A gate that cries wolf gets switched off, which loses the
 * layer entirely, so the match is scoped rather than broad.
 *
 * Anchored on a quote followed by a capital, so identifiers, class names and
 * `t('key')` are excluded.
 */
const QUOTED_STRING = /(['"])([A-Z][A-Za-z0-9 &'’.,()\-—…]{6,})\1/g;

/**
 * Returns the text of every balanced `{...}` container on a line, with nested
 * braces handled. These are the only places a rendered string can hide.
 */
function jsxExpressions(line) {
  const spans = [];
  let depth = 0;
  let start = -1;
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      // Braces inside a string are literal text, not structure.
      if (ch === quote && line[i - 1] !== '\\\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) spans.push(line.slice(start, i));
    }
  }
  return spans;
}

/**
 * Values that are real copy but are legitimately language-neutral: proper nouns,
 * an official address, an email, a URL, a date format, or a unit.
 */
const EXEMPT = [
  /^https?:\/\//,
  /^mailto:/,
  /[\w.-]+@[\w.-]+/,
  /^Municipal Hall/,
  /^Oriental Mindoro/,
  /^Sangguniang Bayan( Office)?$/,
  /^Bongabong(, Oriental Mindoro)?$/,
  /^Discover Bongabong video$/,
  /^Kuta \(Spanish Fort\)$/,
  /^Port of Roxas$/,
  /^Sulyog Festival$/,
  /^Read\s/, // covered by a real key in most cases; keep if it reappears
  // Code-adjacent literals that are not copy. Each is verified at its call site:
  // TermSidebarLayout uses these as the *value* of a <time> element and as the
  // visible label for a period name; they are legal years, not prose.
  /^(19|20)\d{2}$/,
];

const isExempt = (text) => EXEMPT.some((rx) => rx.test(text.trim()));

/** Strips entities and collapses whitespace so comparisons are meaningful. */
const normalise = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?…]+$/, '');

/**
 * Scans one component source and returns every hardcoded-copy finding.
 *
 * Exported so `src/test/i18n.gate.test.jsx` can drive this exact logic with
 * synthetic sources containing known defects. The previous arrangement had the
 * test carry its own near-copy of the matching rules, which meant the test
 * could pass while the gate stayed broken — the test and the thing it claims to
 * verify were never the same code.
 */
export function scanSource(src, file = 'inline') {
  const findings = [];
  // HTTP header names are protocol identifiers. Mask only the quoted key when
  // it is used as an object property; header values and all other copy remain
  // visible to the scanner.
  const lines = src.replace(/(['"])Content-Type\1(?=\s*:)/g, 'HTTP_HEADER').split('\n');
  const cleanedLines = [];

  const record = (line, text, kind) => {
    const clean = normalise(text);
    if (!clean || isExempt(clean)) return;
    // A bare JSX text node needs two words or a sentence, because a lone token
    // there is often an identifier rather than copy. A translatable *attribute*
    // needs no such help: `label="Status"` and `allLabel="Committee"` are copy
    // the visitor reads whatever their length, so the word-count exemption is
    // applied to text nodes only.
    if (kind === 'text' && !/\s/.test(clean) && clean.length < 12) return;
    findings.push({ file, line, text: clean, kind });
  };

  lines.forEach((rawLine, i) => {
    // Blank out t() calls, including the interpolated form
    // t('ariaViewDetailsFor', { title: doc.title }), so only genuinely
    // hardcoded text is left to match.
    const withoutCalls = rawLine
      .replace(/t\(\s*['"][^'"]+['"]\s*(?:,[^)]*)?\)/g, 'T()')
      // Import paths and the language-code literals are identifiers, not copy.
      .replace(/from\s+['"][^'"]+['"]/g, 'from PATH')
      // Server-side vocabulary. A document status like 'Public Consultation' is
      // an API enum value compared against or sent to the backend, not copy a
      // visitor reads. Left translatable it would demand t('Public Consultation')
      // in the request payload, which the server does not accept. The English
      // rendering still reaches the visitor through the status tag and the
      // detail tabs, which are separately routed through t().
      .replace(/(===|!==)\s*(['"])(?:Public Consultation|Approved|First Reading|Committee Assignment|Committee Hearing|Second Reading|Third Reading|For Mayor's Signature|For SP Review|In progress|Draft)\2/g, '=== ENUM')
      // Same enum passed as a query parameter: getDocuments({ status: '...' }).
      .replace(/\b(status|type|sort|order)\s*:\s*(['"])(?:Public Consultation|Approved|First Reading|Committee Assignment|Committee Hearing|Second Reading|Third Reading|In progress|Draft)\2/g, '$1: ENUM')
      // The consultation vote vocabulary is the same kind of wire contract as the
      // status enum above: `{ value: 'Agree', labelKey: 'voteAgree' }` posts
      // 'Agree' to the backend and keys the tally by it, so translating it would
      // change the request payload. The copy the visitor reads is routed through
      // labelKey, which is why only the `value` field is blanked and not the
      // rendered label.
      .replace(/\b(value|key)\s*:\s*(['"])(?:Agree|Neutral|Disagree)\2/g, '$1: ENUM')
      // The same vocabulary used as a lookup key into a colour map:
      // `const TEXT_COLORS = { Agree: 'var(--ibosys-primary-700)' }`. These are
      // enum keys, not copy. The lookahead pins the shape to a CSS custom
      // property so a genuine sentence beginning "Agree …" or any prose value
      // still reaches the report.
      .replace(/\b(Agree|Neutral|Disagree)(?=\s*:\s*['"]var\()/g, '$1: ENUM_KEY')
      // Comments are developer text. A quoted string inside one is not copy, and
      // a JSX `{/* ... */}` block is a brace container as far as jsxExpressions is
      // concerned, so prose quoted in a comment is otherwise indistinguishable
      // from a rendered string. `//` is only treated as a comment when no colon
      // precedes it on the line, which keeps protocol URLs intact.
      .replace(/\/\*.*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/, '$1');

    for (const m of withoutCalls.matchAll(JSX_TEXT)) record(i + 1, m[1], 'text');
    for (const m of withoutCalls.matchAll(TRANSLATABLE_ATTR)) {
      record(i + 1, m[2] ?? m[3] ?? m[4], m[1]);
    }
    // Only brace contents are scanned for rendered string literals.
    for (const expr of jsxExpressions(withoutCalls)) {
      for (const m of expr.matchAll(QUOTED_STRING)) record(i + 1, m[2], 'string');
    }
    cleanedLines.push(withoutCalls);
  });

  // Multi-line JSX children. A text node written on its own indented line —
  // `<button>\n  All terms\n</button>` — cannot be seen by the per-line pass,
  // because the opening and closing brackets are on different lines. That is how
  // both `All terms` buttons, the `Term` trigger label, and the `Current` status
  // tag stayed English while this gate reported a clean pass. The cleaned lines
  // are rejoined here so a match may span them; the character class excludes
  // `<` and `>`, so a match cannot run across a sibling tag boundary.
  const cleanedSource = cleanedLines.join('\n');
  for (const m of cleanedSource.matchAll(JSX_TEXT)) {
    if (!m[1].includes('\n')) continue; // already reported by the per-line pass
    const line = cleanedSource.slice(0, m.index).split('\n').length;
    record(line, m[1], 'text');
  }

  // Deduplicate by line and text. A node indented one-line-per-word can be
  // matched by both passes, and a duplicate finding reads as two defects.
  const seen = new Set();
  return findings.filter((f) => {
    const id = `${f.line} ${f.text}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// Only scan, report and set an exit code when invoked as a CLI. Importing this
// module for its exported scanner (as the regression test does) must neither
// depend on the process's working directory nor call process.exit, which would
// abort the test runner.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const findings = [];
  for (const file of files) {
    findings.push(...scanSource(readFileSync(file, 'utf8'), file));
  }

  // Two lines can legitimately carry the same phrase (e.g. "Home" breadcrumbs),
  // so dedupe on file + text and report the first occurrence.
  const seen = new Set();
  const unique = findings.filter((f) => {
    const id = `${f.file}|${f.text}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const byFile = new Map();
  for (const f of unique) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }

  console.log('i18n audit — hardcoded user-visible copy');
  console.log('=========================================');
  console.log(`${files.length} component files scanned`);
  console.log('');

  if (!unique.length) {
    console.log('PASS  no hardcoded user-visible copy found');
    console.log('');
    console.log('Every string reaches the visitor through t().');
    process.exit(0);
  }

  for (const [file, list] of [...byFile].sort()) {
    console.log(`FAIL  ${file}  (${list.length})`);
    for (const f of list) console.log(`        L${f.line}  [${f.kind}] ${f.text}`);
    console.log('');
  }

  console.log('-----------------------------------------');
  console.log(`${unique.length} hardcoded string(s) across ${byFile.size} file(s).`);
  console.log('');
  console.log('These can never be translated by catalogue work alone.');
  console.log('Route each through t() and add the key to LanguageContext.');
  console.log('A null Tagalog value is acceptable and visible in the checklist;');
  console.log('a hardcoded string is not.');

  process.exit(1);
}
