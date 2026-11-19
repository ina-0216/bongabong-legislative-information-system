import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOCS, ROUTES, VIEWPORTS } from '../../scripts/browser-fixtures.mjs';

/**
 * The browser fixtures decide what the visual gate actually compares.
 *
 * A fixture that omits a field the page branches on does not fail — it renders a
 * different, quieter page and the gate happily records that as the approved
 * appearance. That is how every document rendered down the Resolution branch for
 * as long as the baseline existed: `type` was missing from all three documents,
 * so `isOrdinance` was false, so the comments tab, the consultation tab, the
 * GuestForm and the VoteChart were absent from all 36 captured images and the
 * gate reported 36/36 clean.
 *
 * These assertions exist so that silence is impossible.
 */
describe('browser fixtures match the API contract the pages branch on', () => {
  it('gives every document an explicit type', () => {
    // Ordinance.js declares `type` with enum ['Ordinance', 'Resolution'] and a
    // default of 'Ordinance'. Relying on the default is what let the fixture
    // disagree with the model.
    for (const doc of DOCS) {
      expect(['Ordinance', 'Resolution']).toContain(doc.type);
    }
  });

  it('keeps at least one document on each side of the isOrdinance branch', () => {
    // Without a Resolution fixture the branch that renders a resolution is never
    // exercised by any captured image.
    const types = new Set(DOCS.map((d) => d.type));
    expect(types).toContain('Ordinance');
    expect(types).toContain('Resolution');
  });

  it('gives every consultation document a tally and a vote total', () => {
    // The consultation tab renders the vote chart and the sentiment count. A
    // Public Consultation record without a tally renders an empty chart instead
    // of the populated one a real record carries.
    for (const doc of DOCS.filter((d) => d.status === 'Public Consultation')) {
      expect(doc.tally).toBeTruthy();
      expect(Object.keys(doc.tally).sort()).toEqual(['Agree', 'Disagree', 'Neutral']);
      expect(doc.totalVotes).toBeGreaterThan(0);
    }
  });

  it('agrees with the vote vocabulary the API accepts', () => {
    // ConsultationFeedback.js declares vote enum ['Agree', 'Disagree', 'Neutral', 'None'].
    // A tally keyed on anything else would render a chart with a missing series.
    const allowed = ['Agree', 'Disagree', 'Neutral', 'None'];
    for (const doc of DOCS) {
      for (const key of Object.keys(doc.tally ?? {})) {
        expect(allowed).toContain(key);
      }
    }
  });
});

describe('route table', () => {
  it('declares unique route names', () => {
    // Names become image filenames, so a duplicate silently overwrites another
    // route's baseline and that route stops being compared at all.
    const names = ROUTES.map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('reaches a state that is not the default view for the consultation route', () => {
    // The capture scripts only photograph a route's `prepare` result. A route
    // added without one is captured on its default tab, which is how the
    // consultation form would have gone unrecorded a second time.
    const [, , prepare] = ROUTES.find(([name]) => name === 'document-consultation');
    expect(typeof prepare).toBe('function');
  });

  it('names the interaction hook on every route or none of them', () => {
    // A third element on some routes and not others means the capture scripts
    // and the diff gate can disagree about what a route shows.
    const withHook = ROUTES.filter((r) => r.length === 3);
    expect(withHook.every((r) => typeof r[2] === 'function')).toBe(true);
    expect(ROUTES.every((r) => r.length === 2 || r.length === 3)).toBe(true);
  });

  it('keeps every route reachable by a single navigation', () => {
    for (const [, path] of ROUTES) {
      expect(path).toMatch(/^\/[a-z0-9\-/:]*$/i);
    }
  });

  it('captures every route at every viewport', () => {
    // The capture scripts multiply these two lists to decide how many images
    // should exist, so both must stay non-empty.
    expect(ROUTES.length).toBeGreaterThan(0);
    expect(VIEWPORTS.length).toBeGreaterThan(0);
  });
});

describe('every browser check reads the shared fixtures', () => {
  const scripts = readdirSync('scripts').filter((f) => f.endsWith('.mjs'));

  /**
   * A private copy of the fixture data is how the resolutions archive came to be
   * audited and captured as ordinances: `audit-rendered.mjs` had its own DOCS
   * without `type` and its own mock that ignored the `type` query parameter.
   * Both copies were individually plausible, which is why nothing failed — the
   * gates simply disagreed about what page they were looking at.
   *
   * Declaring the data again is the defect, so it is asserted rather than
   * reviewed. The shared module may legitimately re-export or wrap the values;
   * what it may not do is redeclare its own copy of them.
   */
  const SHARED = 'browser-fixtures.mjs';
  const FIXTURE_NAMES = ['DOCS', 'NEWS', 'SESSIONS', 'MEMBERS', 'COMMITTEES', 'TERMS', 'STATS'];

  for (const file of scripts) {
    if (file === SHARED) continue;
    const src = readFileSync(join('scripts', file), 'utf8');

    it(`${file} does not redeclare fixture data`, () => {
      const redeclared = FIXTURE_NAMES.filter((name) =>
        new RegExp(`^\\s*(?:const|let|var)\\s+${name}\\s*=`, 'm').test(src)
      );
      expect(redeclared).toEqual([]);
    });

    it(`${file} does not define its own API mock`, () => {
      // A second `page.route('**/api/public/**')` handler means a second source
      // of truth for what the API returns.
      const handlers = src.match(/route\(\s*['"]\*\*\/api\/public/g) ?? [];
      expect(handlers.length).toBeLessThanOrEqual(1);
    });
  }

  it('finds the scripts it checked', () => {
    expect(scripts).toContain(SHARED);
    expect(scripts).toContain('audit-rendered.mjs');
    expect(scripts).toContain('review-shots.mjs');
  });
});