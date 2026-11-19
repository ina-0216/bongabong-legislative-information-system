import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { LANG_STATUS } from '../context/LanguageContext.jsx';
import { scanSource } from '../../scripts/audit-i18n.mjs';
import { parseCatalogue, placeholdersOf } from '../../scripts/catalogue.mjs';

/**
 * The translation checklist only counts catalogue keys. It cannot see a string
 * hardcoded in JSX, which can never be translated no matter how much catalogue
 * work happens. These tests close that blind spot.
 *
 * The matching logic itself lives in scripts/audit-i18n.mjs and is imported
 * below rather than reimplemented. An earlier version of this file carried its
 * own copy of the rules, which meant the test suite could report green while the
 * gate that runs in CI stayed blind — the test was not verifying the gate.
 */

const collect = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.jsx$/.test(e.name))
    .map((e) => join(dir, e.name));

const componentFiles = [...collect('src/pages'), ...collect('src/components')];

const read = (f) => readFileSync(f, 'utf8');

describe('i18n gate — the scanner catches each defect class it claims to', () => {
  /**
   * Each case is a defect that was actually present in this codebase and slipped
   * past the previous gate. If the scanner regresses, these fail with a message
   * naming the exact pattern rather than a bare array diff.
   */
  const cases = [
    {
      name: 'ternary loading state inside a JSX expression',
      // Every loading and empty band in the portal is written this way. The
      // original `>`-anchored text-node match could not see any of them.
      src: '<p>{loading ? \'Loading records…\' : \'No records found.\'}</p>',
      expect: ['Loading records', 'No records found'],
    },
    {
      name: '|| fallback copy inside a JSX expression',
      src: '<span>{member.position || \'SB Member\'}</span>',
      expect: ['SB Member'],
    },
    {
      name: 'single-quoted aria-label',
      src: "<button aria-label='Expand term list'>x</button>",
      expect: ['Expand term list'],
    },
    {
      name: 'non-interpolated template-literal aria-label',
      // The shape a hardcoded label takes once a sibling label on the same
      // element has been routed through t().
      src: '<button aria-label={`Expand term list`}>x</button>',
      expect: ['Expand term list'],
    },
    {
      name: 'bare JSX text node',
      src: '<p>Municipal documents are published here.</p>',
      expect: ['Municipal documents are published here'],
    },
    {
      name: 'multi-line JSX text node',
      // The shape used by every indented JSX child, including the two
      // `All terms` buttons in TermSidebarLayout. The original pattern
      // required `>text<` on one line, so an indented child on its own line
      // was invisible to it.
      src: '<button type="button">\n  All terms\n</button>',
      expect: ['All terms'],
    },
    {
      name: 'short single-word label attribute',
      // `label="Status"` and `allLabel="Committee"` were invisible because the
      // word-count minimum was applied to every finding, not just to text
      // nodes. A one-word label is still copy the visitor reads.
      src: '<SelectField id="filter-status" label="Status" allLabel="All statuses" />',
      expect: ['Status', 'All statuses'],
    },
    {
      name: 'required-field label carrying a trailing asterisk',
      // `<label>Valid ID Image *</label>` was invisible because the character
      // class excluded `*`, so the match stopped short of the closing `<`.
      src: '<label>\n  Valid ID Image *\n</label>',
      expect: ['Valid ID Image *'],
    },
    {
      name: 'colon-led JSX text node',
      src: '<h3>Documents: 12 available</h3>',
      expect: ['Documents: 12 available'],
    },
    {
      name: 'heading text node (digit-terminated tag name)',
      // The lookbehind that anchors `>text<` originally required a letter
      // before the `>`, so every h1–h6 in the codebase was invisible to the
      // gate. Headings carry the most visitor-visible copy in the portal, so
      // this was the largest blind spot in the scanner.
      src: '<h2>Municipal news and updates</h2>',
      expect: ['Municipal news and updates'],
    },
    {
      name: 'multi-line heading text node',
      src: '<h3>\n  Our vision for the municipality\n</h3>',
      expect: ['Our vision for the municipality'],
    },
    {
      name: 'icon-and-label button text after a self-closing tag',
      // The shape every icon button in the portal uses. The lookbehind that
      // anchors `>text<` originally excluded `/`, so text sitting directly after
      // a self-closing `<Icon />` was invisible. This hid `View minutes`,
      // `View public comments` and `Follow us on Facebook`.
      src: '<a href="#"><Eye size={15} aria-hidden="true" /> View minutes</a>',
      expect: ['View minutes'],
    },
    {
      name: 'the same shape on a button rather than a link',
      src: '<button type="button"><User size={16} aria-hidden="true" /> Submit feedback</button>',
      expect: ['Submit feedback'],
    },
  ];

  for (const { name, src, expect: expected } of cases) {
    it(`catches ${name}`, () => {
      const found = scanSource(src).map((f) => f.text);
      expect(found).toEqual(expect.arrayContaining(expected));
    });
  }

  const clean = [
    ['a t() call', '<p>{t(\'noRecordsFound\')}</p>'],
    ['an interpolated t() call', '<a aria-label={t(\'ariaViewDetailsFor\', { title: doc.title })}>{t(\'viewDetails\')}</a>'],
    ['an API status comparison', '<span>{status === \'Public Consultation\' ? t(\'open\') : t(\'closed\')}</span>'],
    ['an API status query parameter', 'api.getDocuments({ status: \'Public Consultation\', limit: 3 })'],
    ['a proper-noun address', '<p>Municipal Hall, Bongabong</p>'],
    ['an import specifier', "import { useLanguage } from '../context/LanguageContext';"],
    [
      'the consultation vote wire value',
      // The `value` field is the API contract and must stay English; the copy
      // the visitor reads is routed through labelKey.
      "const VOTE_OPTIONS = [{ value: 'Agree', labelKey: 'voteAgree' }, { value: 'Neutral', labelKey: 'voteNeutral' }];",
    ],
    [
      'a tally-enum lookup key',
      // The same vocabulary keyed into a colour map and a data array. Keying by
      // a translated label instead of the tally key is a real bug, which is why
      // the component carries both.
      "const data = [{ key: 'Disagree', name: t('voteDisagree'), value: tally.Disagree }];",
    ],
    [
      'a colour map keyed by the tally enum',
      "const TEXT_COLORS = { Disagree: 'var(--ibosys-danger-700)' };",
    ],
    [
      'a translated vote label via the labelKey indirection',
      '<label><input type="radio" aria-label={t(labelKey)} /><span>{t(labelKey)}</span></label>',
    ],
    ['a relational comparison operator', 'const sorted = a > b ? a : b;'],
    ['a heading routed through t()', '<h2>{t(\'newsAndUpdates\')}</h2>'],
    ['an icon button whose label is routed through t()', '<button type="button"><User size={16} aria-hidden="true" /> {t(\'submitFeedback\')}</button>'],
    ['a division expression', 'const ratio = width / height;'],
    ['an HTTP Content-Type header key', "fetch('/api', { headers: { 'Content-Type': 'application/json' } })"],
  ];

  for (const [name, src] of clean) {
    it(`does not flag ${name}`, () => {
      expect(scanSource(src)).toEqual([]);
    });
  }
});

describe('i18n — every visible string is routed through the catalogue', () => {
  it('finds no hardcoded copy in any component', () => {
    const offenders = [];
    for (const file of componentFiles) {
      for (const f of scanSource(read(file), file)) {
        offenders.push(`${file}:${f.line} [${f.kind}] "${f.text}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('wires the language hook wherever t() is called', () => {
    const broken = [];
    for (const file of componentFiles) {
      const src = read(file);
      if (!/\bt\('/.test(src)) continue;
      const importsHook = /import\s*\{[^}]*useLanguage[^}]*\}/.test(src);
      const callsHook = /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useLanguage\(\)/.test(src);
      if (!importsHook || !callsHook) broken.push(file);
    }
    expect(broken).toEqual([]);
  });
});

describe('i18n — catalogue integrity', () => {
  /**
   * A key duplicated in an object literal is a silent trap: the later value
   * wins, so a Tagalog translation can be overwritten by a stale English
   * entry with no error anywhere. Editing this catalogue by hand makes it a
   * realistic failure, so it is asserted rather than assumed.
   */
  const catalogue = read('src/context/LanguageContext.jsx');
  const splitAt = catalogue.indexOf('tl: {');

  const keyLines = (src) => {
    const seen = new Map();
    const dupes = [];
    src.split('\n').forEach((line, i) => {
      const m = line.match(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/);
      if (!m) return;
      const key = m[1];
      if (key === 'en' || key === 'tl') return;
      if (seen.has(key)) dupes.push(`${key} at L${seen.get(key)} and L${i + 1}`);
      else seen.set(key, i + 1);
    });
    return dupes;
  };

  it('defines no duplicate keys in the English block', () => {
    expect(keyLines(catalogue.slice(0, splitAt))).toEqual([]);
  });

  it('defines no duplicate keys in the Tagalog block', () => {
    expect(keyLines(catalogue.slice(splitAt))).toEqual([]);
  });

const stripComments = (src) =>
    src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('gives every English key a Tagalog counterpart', () => {
    const keysOf = (src) =>
      new Set(
        [...stripComments(src).matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm)]
          .map((m) => m[1])
          // `en` and `tl` are the language-block names, not catalogue keys.
          .filter((k) => k !== 'en' && k !== 'tl')
      );
    const en = keysOf(catalogue.slice(0, splitAt));
    const tl = keysOf(catalogue.slice(splitAt));
    // A key present only in Tagalog is unreachable; one present only in English
    // silently falls back to English for Filipino visitors.
    expect([...en].filter((k) => !tl.has(k))).toEqual([]);
    expect([...tl].filter((k) => !en.has(k))).toEqual([]);
  });

  it('reports a real, measurable translation gap', () => {
    const status = LANG_STATUS();
    expect(status.total).toBeGreaterThan(0);
    expect(status.pending.length).toBe(status.total - status.draftedCount);
    // Guards against the status function silently reporting zero debt.
    expect(status.total).toBe(status.draftedCount + status.pending.length);
  });

  it('keys shared loading and empty states exist for both languages', () => {
    const ctx = readFileSync('src/context/LanguageContext.jsx', 'utf8');
    // Every one of these was hardcoded on at least one page before this work.
    const shared = [
      'loadingRecords', 'loadingDocument', 'documentNotFound',
      'noRecordsMatch', 'civicDataUnavailable', 'publicComments',
    ];
    for (const key of shared) {
      const occurrences = ctx.split(`${key}:`).length - 1;
      // Once in the English block, once in the Tagalog block.
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });

  it('references no t() key that the catalogue does not define', () => {
    const defined = new Set(
      [...stripComments(catalogue.slice(0, splitAt))
        .matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm)]
        .map((m) => m[1])
    );

    const unknown = [];
    for (const file of componentFiles) {
      // Comments are stripped for the same reason as above: a t('key') quoted
      // inside an explanatory comment is not a call site.
      const src = stripComments(read(file));
      for (const m of src.matchAll(/\bt\(\s*['"]([A-Za-z][A-Za-z0-9_]*)['"]/g)) {
        if (!defined.has(m[1])) unknown.push(`${file}: ${m[1]}`);
      }
    }
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('ships no untranslated key, so t() never silently falls back to English', () => {
    const status = LANG_STATUS();
    // The catalogue reached full Tagalog coverage. A null here renders the
    // English string through t()'s `?? translations.en[key]` fallback, which
    // degrades quietly rather than visibly. Reintroduce one and this fails.
    expect(status.pending).toEqual([]);
    expect(status.draftedCount).toBe(status.total);
  });

  it('keeps every {placeholder} present in both languages', () => {
    // `t(key, vars)` substitutes `{name}` with replaceAll and returns the string
    // untouched when there are no vars. A Tagalog value that drops a placeholder,
    // or misspells the name, therefore renders the literal text `{title}` to a
    // visitor — not a blank, not a fallback, but braces in the interface.
    // Placeholder parity is machine-checkable, so it is asserted rather than left
    // to the reviewer to spot.
    //
    // The parser comes from scripts/catalogue.mjs, the same module the review
    // packet uses. An earlier version of this test carried its own regex, matched
    // nothing, and passed vacuously while a deliberately dropped `{placeholder}`
    // went unreported — the same duplicated-parser trap this repo has hit twice.
    const { en, tl } = parseCatalogue(read('src/context/LanguageContext.jsx'));

    const mismatched = [];
    for (const [key, enValue] of en) {
      const tlValue = tl.get(key);
      if (enValue === null || tlValue === null || tlValue === undefined) continue;
      const enPh = placeholdersOf(enValue);
      const tlPh = placeholdersOf(tlValue);
      const missing = [...enPh].filter((p) => !tlPh.has(p));
      const extra = [...tlPh].filter((p) => !enPh.has(p));
      if (missing.length || extra.length) {
        mismatched.push(`${key}: en [${[...enPh].join(' ')}] tl [${[...tlPh].join(' ')}]`);
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('leaves no JSX text node untranslated in any component', () => {
    // Broad structural sweep independent of scanSource's exemptions and its
    // two-word minimum. Every capitalised JSX child is either routed through
    // t() or an explicitly accepted proper noun. This is what caught the
    // `All terms` / `Term` / `Current` / `Search` labels that a word-count
    // heuristic treats as identifiers.
    const ACCEPTED = [
      'Municipal Hall, Bongabong',
      'Municipal Hall, Poblacion, Bongabong',
      'Oriental Mindoro, Philippines 5211',
      'Sangguniang Bayan Office',
    ];
    const offenders = [];
    for (const file of componentFiles) {
      const src = read(file).split('\n');
      src.forEach((line, i) => {
        const m = stripComments(line).match(/^\s*(?:\{|\s)([A-Z][A-Za-z0-9'’.,()\-—…*: ]{3,})\s*(?:<|\}\s*$)/);
        if (!m) return;
        const text = m[1].trim();
        if (ACCEPTED.includes(text) || ACCEPTED.some((a) => text.startsWith(a))) return;
        // Skip anything already routed through a key or expression.
        if (/\{/.test(line.trim().slice(0, line.indexOf(text)))) return;
        if (/t\(/.test(line)) return;
        offenders.push(`${file}:${i + 1} "${text}"`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the always-Tagalog side-by-side quote distinct from its prose pair', () => {
    // The About page shows the same legislative-body statement in both languages on
    // one screen. Its quote column must stay Tagalog in EN mode, so the two
    // pairs must not be collapsed into the same keys.
    const ctx = read('src/context/LanguageContext.jsx');
    const lines = ctx.split('\n');
    const tlStart = lines.findIndex((l) => /^\s{2}tl:\s*\{/.test(l));
    // Long values are written across a continuation line, so the reader joins
    // them rather than reading only the line the key is declared on.
    const valueIn = (key, from) => {
      for (let i = from; i < lines.length; i += 1) {
        if (/^\s{2}\},?\s*$/.test(lines[i])) break;
        const m = lines[i].match(new RegExp(`^\\s+${key}:\\s*(.*)$`));
        if (!m) continue;
        const parts = [m[1].trim()];
        while (parts[parts.length - 1] === '' && i + 1 < lines.length) {
          i += 1;
          parts.push(lines[i].trim().replace(/,$/, ''));
        }
        return parts.join(' ').trim();
      }
      return null;
    };
    for (const key of ['legislativeBodyQuote1', 'legislativeBodyQuote2']) {
      const quote = valueIn(key, tlStart);
      expect(quote).not.toBeNull();
      // English block carries the same Tagalog text by design.
      expect(valueIn(key, 0)).toBe(quote);
      // Tagalog markers, not the English sentence that opens the prose pair.
      expect(quote).toMatch(/\b(ay|ang|mga|at|para sa)\b/);
      expect(quote).not.toMatch(/^(Their|The Sangguniang)/);
    }
  });

  it('holds translation debt at or below the recorded ceiling', () => {
    // Structural guard so a future key cannot be added to both blocks with a
    // null Tagalog value and slip past review. Lower this only alongside a
    // deliberate translation decision.
    const CEILING = 0;
    expect(LANG_STATUS().pending.length).toBeLessThanOrEqual(CEILING);
  });
});

describe('i18n — the consultation form is fully routed', () => {
  /**
   * Rendered coverage for the form copy, because the audit is a static check and
   * cannot prove the strings reach the screen. This is also the only place the
   * vote wire values and their labels are held apart: `value` must stay English
   * for the API while the label is translated. Asserting both at once is what
   * stops a well-meaning fix from translating the request payload.
   */
  const renderForm = async () => {
    const { render } = await import('@testing-library/react');
    const { LanguageProvider, useLanguage } = await import('../context/LanguageContext.jsx');
    const GuestForm = (await import('../components/GuestForm.jsx')).default;

    let api;
    const Probe = () => {
      api = useLanguage();
      return null;
    };

    // The render result owns the container; `screen` is document-wide, so a
    // second render in the same file would otherwise query the first tree too.
    const view = render(
      <LanguageProvider>
        <Probe />
        <GuestForm ordinanceId="doc-3" ordinanceStatus="Public Consultation" />
      </LanguageProvider>
    );

    return {
      view,
      setLanguage: (lang) => act(() => api.setLanguage(lang)),
      queryAll: (sel) => [...view.container.querySelectorAll(sel)],
    };
  };

  let act;
  let cleanup;
  beforeAll(async () => {
    ({ act, cleanup } = await import('@testing-library/react'));
  });

  afterEach(() => {
    // The suite renders this form more than once, so each tree must be torn
    // down or the second render's queries match nodes from the first.
    cleanup();
  });

  // These two render the entire GuestForm, which mounts the Radix Select, the
  // file input and three radio rows. The default 5s budget is enough for them in
  // isolation but not when the full suite runs in parallel, which made this a
  // flaky failure rather than a real one.
  const HEAVY_RENDER_TIMEOUT = 30000;

  it('renders English labels in the default language', async () => {
    const { view, queryAll } = await renderForm();
    expect(view.container.querySelector('input[name="full_name"]')).toBeTruthy();
    expect(view.getByText('Full Name *')).toBeTruthy();
    expect(view.getByText('Contact Number *')).toBeTruthy();
    expect(view.getByText('Your Feedback / Remarks')).toBeTruthy();
    expect(view.getByText('Barangay')).toBeTruthy();
    // Vote labels read as English while the wire values match the tally keys.
    expect(view.getByText('Agree')).toBeTruthy();
    const radios = queryAll('input[name="vote"]');
    expect(radios.map((r) => r.value)).toEqual(['Agree', 'Neutral', 'Disagree']);
  }, HEAVY_RENDER_TIMEOUT);

  it('keeps feedback fields responsive to form width and associates the ID label', async () => {
    const { view, queryAll } = await renderForm();
    const upload = view.container.querySelector('#guest-id-image');

    expect(view.container.querySelector('.guest-form-card')).toBeTruthy();
    expect(queryAll('.guest-form-grid')).toHaveLength(2);
    expect(view.container.querySelector('label[for="guest-id-image"]')).toBeTruthy();
    expect(upload?.getAttribute('type')).toBe('file');
    expect(view.container.querySelector('.guest-vote-options')).toBeTruthy();
  }, HEAVY_RENDER_TIMEOUT);

  it('translates every form label while keeping vote wire values English', async () => {
    const { view, setLanguage, queryAll } = await renderForm();
    await setLanguage('tl');

    expect(view.getByText('Buong Pangalan *')).toBeTruthy();
    expect(view.getByText('Numero ng Contacto *')).toBeTruthy();
    expect(view.getByText('Iyong Feedback / Puna')).toBeTruthy();
    expect(view.getByText('Larawan ng Valid ID *')).toBeTruthy();
    expect(view.getByText('Sumasang-ayon')).toBeTruthy();
    expect(view.getByText('Hindi Sumasang-ayon')).toBeTruthy();

    // The API payload must remain English regardless of interface language.
    const radios = queryAll('input[name="vote"]');
    expect(radios.map((r) => r.value)).toEqual(['Agree', 'Neutral', 'Disagree']);
    // And the accessible name must be the translated label, not the raw value.
    expect(radios.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Sumasang-ayon',
      'Neutral',
      'Hindi Sumasang-ayon',
    ]);
  }, HEAVY_RENDER_TIMEOUT);
});

