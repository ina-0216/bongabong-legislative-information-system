/**
 * Reads the translation catalogue out of src/context/LanguageContext.jsx.
 *
 * This exists so the generator and the tests cannot disagree about what the
 * catalogue contains. A test that carries its own near-copy of the parsing rules
 * can pass while the thing it claims to verify is broken — which is exactly what
 * happened twice in this repo:
 *
 *   - generate-translation-checklist.mjs parsed only single-line `key: 'value'`
 *     pairs, so 12 wrapped prose keys were reported in neither bucket and the
 *     checklist claimed full coverage.
 *   - A first attempt at the placeholder-parity test in i18n.gate.test.jsx used
 *     its own regex, matched nothing, and passed vacuously while a deliberately
 *     dropped `{placeholder}` went unreported.
 *
 * Both catalogue shapes must be handled:
 *
 *   termLabel: 'Term',
 *   sealBodyP1:
 *     "A long sentence that wraps across lines.",
 *
 * The second form is why a one-line regex under-reports.
 *
 * Line endings are normalised first because the file is checked in with CRLF and
 * in JavaScript `.` does not match `\r`, so any `$`-anchored pattern silently
 * fails on every CRLF line.
 */

const SRC_PATH = 'src/context/LanguageContext.jsx';

const unescape = (raw) =>
  raw
    .replace(/\\u2014/g, '—')
    .replace(/\\u2019/g, '’')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();

const stripQuotes = (raw) => {
  const v = raw.trim().replace(/,$/, '').trim();
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return unescape(v.slice(1, -1));
  }
  return unescape(v);
};

/** Parses one language block into a key -> value map. `null` means untranslated. */
export function parseBlock(source) {
  const lines = source.split('\n');
  const out = new Map();

  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^ {4}([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) continue;
    const [, key, rest] = m;

    if (rest.trim() !== '') {
      const trimmed = rest.trim();
      out.set(key, trimmed === 'null' ? null : stripQuotes(trimmed));
      continue;
    }

    const parts = [];
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      const line = lines[j];
      if (/^ {2}\},?\s*$/.test(line)) break; // end of the language block
      parts.push(line.trim());
      if (/,$/.test(line.trim())) {
        j += 1;
        break;
      }
    }
    const joined = parts.join(' ').replace(/,$/, '');
    out.set(key, joined === 'null' ? null : stripQuotes(joined));
    i = j - 1;
  }
  return out;
}

/** Removes comments so a key quoted in prose is not mistaken for a definition. */
export const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

/**
 * Returns { en, tl } as key -> value Maps.
 * Throws rather than returning a partial parse, so a structural change to the
 * catalogue surfaces as a failing test instead of a short list.
 */
export function parseCatalogue(source) {
  const text = stripComments(source.replace(/\r\n?/g, '\n'));
  const enStart = text.indexOf('en: {');
  const tlStart = text.indexOf('tl: {');
  const statusStart = text.indexOf('function LANG_STATUS');
  if (enStart < 0 || tlStart < 0 || statusStart < 0) {
    throw new Error('could not locate the en/tl blocks in the catalogue');
  }
  return {
    en: parseBlock(text.slice(enStart, tlStart)),
    tl: parseBlock(text.slice(tlStart, statusStart)),
  };
}

export const CATALOGUE_PATH = SRC_PATH;

/** The `{name}` tokens t() would substitute into a string. */
export const placeholdersOf = (value) =>
  new Set(String(value ?? '').match(/\{[A-Za-z0-9_]+\}/g) ?? []);

/**
 * Verdict values a reviewer may record in docs/translation-review.csv.
 *
 * Defined here rather than in the generator because the generator runs its CLI
 * work at import time, so a test cannot import it without side effects.
 */
export const VERDICTS = ['pending', 'accepted', 'needs-rework'];