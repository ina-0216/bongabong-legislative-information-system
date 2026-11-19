import { describe, it, expect } from 'vitest';
import {
  MAX_DIFF_RATIO,
  MAX_DIFF_PIXELS,
  evaluateBudget,
} from '../../scripts/visual-budget.mjs';

/**
 * The dual-budget decision, proved against the measurements that motivated it.
 *
 * A real regression (a colour change to `.v11-bandhead p`) changed a near-constant
 * number of pixels at every viewport while the ratio allowance scaled with image
 * area. Under a ratio-only budget that defect passed on desktop and failed on
 * mobile. These tests pin the fixed behaviour so it cannot regress silently.
 */

/** Comparable areas approximating real full-page captures. */
const AREA = {
  desktop: 1440 * 3121,
  tablet: 768 * 3013,
  mobile: 390 * 4128,
};

describe('visual budget — budgets are sane relative to observed noise', () => {
  it('treats a clean capture as passing', () => {
    expect(evaluateBudget({ changed: 0, comparable: AREA.desktop })).toMatchObject({
      fail: false,
      which: null,
    });
  });

  it('sets the absolute budget above the measured noise floor', () => {
    // Clean runs measure exactly 0. The budget must stay well clear of the
    // smallest real regression observed (~1879) or it would reject good renders.
    const smallestRealRegression = 1879;
    expect(MAX_DIFF_PIXELS).toBeLessThan(smallestRealRegression);
    expect(MAX_DIFF_PIXELS).toBeGreaterThan(0);
  });
});

describe('visual budget — the absolute budget is viewport-independent', () => {
  it('judges one fixed-size change identically at every viewport', () => {
    // The regression that motivated this: ~1900 changed pixels everywhere.
    const changed = 1904;
    const verdicts = Object.entries(AREA).map(([viewport, comparable]) => ({
      viewport,
      ...evaluateBudget({ changed, comparable }),
    }));

    // Every viewport must now fail. Under ratio-only, desktop passed.
    for (const v of verdicts) {
      expect({ viewport: v.viewport, fail: v.fail }).toEqual({ viewport: v.viewport, fail: true });
    }

    // Desktop and tablet fail on the absolute budget alone.
    expect(verdicts.find((v) => v.viewport === 'desktop').which).toBe('absolute');
    expect(verdicts.find((v) => v.viewport === 'tablet').which).toBe('absolute');
    // Mobile additionally exceeds the ratio.
    expect(verdicts.find((v) => v.viewport === 'mobile').which).toBe('ratio + absolute');
  });

  it('would have let the same change pass on desktop under ratio alone', () => {
    // Guards the premise: if this stops holding, the absolute budget is redundant.
    const changed = 1904;
    const ratioAtDesktop = changed / AREA.desktop;
    expect(ratioAtDesktop).toBeLessThanOrEqual(MAX_DIFF_RATIO);
  });
});

describe('visual budget — the ratio budget still catches proportional drift', () => {
  it('fails a small capture whose ratio exceeds the limit', () => {
    // Few comparable pixels, so a modest absolute change is proportionally huge.
    const comparable = 100 * 400;
    const verdict = evaluateBudget({ changed: 600, comparable });
    expect(verdict.ratio).toBeGreaterThan(MAX_DIFF_RATIO);
    expect(verdict.fail).toBe(true);
    expect(verdict.which).toBe('ratio');
  });

  it('reports both budgets when both are exceeded', () => {
    const comparable = 390 * 4128;
    const verdict = evaluateBudget({ changed: 9000, comparable });
    expect(verdict.fail).toBe(true);
    expect(verdict.which).toBe('ratio + absolute');
  });

  it('passes a change inside both budgets', () => {
    const comparable = 1440 * 3121;
    const verdict = evaluateBudget({ changed: 1100, comparable });
    expect(verdict.fail).toBe(false);
    expect(verdict.which).toBeNull();
  });
});

describe('visual budget — degenerate input does not produce a false pass', () => {
  it('treats a zero-comparable capture as passing rather than dividing by zero', () => {
    const verdict = evaluateBudget({ changed: 0, comparable: 0 });
    expect(verdict.ratio).toBe(0);
    expect(Number.isNaN(verdict.ratio)).toBe(false);
  });

  it('still fails a fully masked page if pixels somehow changed', () => {
    // A fully masked capture has no comparable pixels; a non-zero change count
    // must not silently pass.
    const verdict = evaluateBudget({ changed: 5000, comparable: 0 });
    expect(verdict.fail).toBe(true);
    expect(verdict.which).toBe('absolute');
  });
});