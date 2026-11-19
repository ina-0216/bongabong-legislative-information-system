/**
 * Tolerance budgets for the visual regression gate.
 *
 * Extracted from visual-diff.mjs so the decision can be unit-tested without
 * launching a browser. Measured on a real regression (a colour change to
 * `.v11-bandhead p`):
 *
 *   viewport   changed px   0.1% allowance
 *   desktop          1904            4494
 *   tablet           1892            2314
 *   mobile           1879            1610
 *
 * The changed-pixel count is essentially constant across viewports while the
 * ratio allowance scales with image area. Under a ratio-only budget the same
 * defect therefore passed on desktop and failed on mobile. The absolute budget
 * removes that inconsistency.
 */

/** Proportional guard: catches a whole band or a font failing to load. */
export const MAX_DIFF_RATIO = 0.001;

/**
 * Absolute guard: makes a fixed-size change judge the same at every viewport.
 *
 * 1200 is generous on purpose. Clean runs measure 0 changed pixels; the smallest
 * real regression observed was ~1879. The gap absorbs anti-aliasing and font
 * rasterisation jitter on other machines without admitting a genuine defect.
 */
export const MAX_DIFF_PIXELS = 1200;

/**
 * Decides whether a capture fails, and says which budget tripped.
 *
 * Both budgets apply: a change fails if EITHER exceeds its limit, so the
 * judgement is viewport-independent for fixed-size changes while proportional
 * drift on a large capture is still caught.
 */
export function evaluateBudget({ changed, comparable }) {
  const ratio = comparable > 0 ? changed / comparable : 0;
  const overRatio = ratio > MAX_DIFF_RATIO;
  const overAbsolute = changed > MAX_DIFF_PIXELS;

  let which = null;
  if (overRatio && overAbsolute) which = 'ratio + absolute';
  else if (overRatio) which = 'ratio';
  else if (overAbsolute) which = 'absolute';

  return { changed, comparable, ratio, fail: Boolean(which), which };
}