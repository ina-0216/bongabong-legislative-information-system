import { useRef, useCallback } from 'react';

// Words/patterns to always ignore (legal jargon, Filipino names, abbreviations, etc.)
const ALWAYS_IGNORE = new Set([
  // Legal boilerplate
  'ordinance','ordinances','resolution','resolutions','sangguniang','bayan','barangay',
  'barangays','bongabong','mindoro','municipal','municipality','poblacion','pbm',
  'whereas','hereby','thereof','hereof','thereunder','hereunder','thereto','hereto',
  'aforesaid','aforementioned','therein','herein','heretofore','theretofore',
  'pursuant','notwithstanding','inasmuch','insofar','insofaras','therefor',
  'promulgated','promulgation','appropriated','appropriation','appropriations',
  // Filipino words common in legislation
  'barangay','barangays','kapitan','kagawad','halal','pilipinas','pilipino',
  'republika','ng','ang','sa','na','ay','at','mga','ito','siya','nito','dito',
  'para','nila','namin','natin','kayo','sila','kami','tayo',
  // Titles & salutations
  'hon','honorable','atty','engr','brgy','mun','prov','natl','dept','sec','reso',
  'sb','sp','lgu','oda','dilg','denr','dpwh','doh','deped','nbi','bir','prc',
  // Common legislative abbreviations
  'no','nos','vs','etc','et','al','ibid','id','op','cit','loc','pg','pp','vol',
  // Bongabong Barangays
  'anilao','aplaya','bagong','bayan','batangan','bukal','camantigue','carmundo',
  'cawayan','dayhagan','formon','hagan','hagupit','ipil','kaligtasan','labasan',
  'labonan','libertad','lisap','luna','malitbog','mapang','masaguisi','mina','oro',
  'morente','ogbot','orconuma','poblacion','pulosahi','sagana','isidro','jose','juan',
  'sigange','sta','cruz','tawas'
]);

let spellChecker = null;
let loadPromise = null;

async function loadSpeller() {
  if (spellChecker) return spellChecker;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [affText, dicText, nspellMod] = await Promise.all([
      fetch('/dict/en.aff').then(r => {
        if (!r.ok) throw new Error(`Failed to load en.aff: ${r.status}`);
        return r.text();
      }),
      fetch('/dict/en.dic').then(r => {
        if (!r.ok) throw new Error(`Failed to load en.dic: ${r.status}`);
        return r.text();
      }),
      import('nspell'),
    ]);

    const NSpell = nspellMod.default || nspellMod;
    spellChecker = new NSpell(affText, dicText);
    return spellChecker;
  })();

  return loadPromise;
}

/**
 * Extract plain text from HTML (strips tags).
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
}

/**
 * Tokenise a string into unique lowercase words, filtering noise.
 */
function extractWords(text) {
  const plain = stripHtml(text);
  // Grab word-like tokens (letters + optional hyphens/apostrophes)
  const tokens = plain.match(/[a-zA-Z][\w''-]*/g) || [];
  const unique = new Set();
  for (const tok of tokens) {
    const w = tok.replace(/['-]+$/, '').replace(/^['-]+/, ''); // trim leading/trailing
    if (!w || w.length < 3) continue;
    if (/^\d/.test(w)) continue;                        // starts with digit
    if (w === w.toUpperCase() && w.length > 1) continue; // all-caps acronym
    if (w.includes('_')) continue;                       // underscore (code)
    const lower = w.toLowerCase();
    if (ALWAYS_IGNORE.has(lower)) continue;
    unique.add(w);
  }
  return [...unique];
}

/**
 * Returns: [{ word, fieldLabel, suggestions }]
 */
async function checkText(fieldLabel, text) {
  const checker = await loadSpeller();
  const words = extractWords(text);
  const issues = [];
  for (const word of words) {
    if (!checker.correct(word)) {
      const suggestions = checker.suggest(word).slice(0, 5);
      issues.push({ word, fieldLabel, suggestions });
    }
  }
  return issues;
}

/**
 * Hook — returns checkFields(fields) where fields is:
 * [{ label: 'Title', value: 'some text…' }, …]
 */
export function useSpellCheck() {
  const cacheRef = useRef(null);

  const checkFields = useCallback(async (fields) => {
    // Pre-warm the dictionary
    await loadSpeller();

    const allIssues = [];
    for (const { label, value } of fields) {
      if (!value) continue;
      const issues = await checkText(label, value);
      allIssues.push(...issues);
    }

    // Deduplicate by word (keep first occurrence label)
    const seen = new Set();
    const deduped = [];
    for (const issue of allIssues) {
      const key = issue.word.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(issue);
      }
    }

    cacheRef.current = deduped;
    return deduped;
  }, []);

  return { checkFields };
}
