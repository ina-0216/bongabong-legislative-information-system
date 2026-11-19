import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { buildMask, maskedCount, applyMask } from '../../scripts/visual-mask.mjs';

/**
 * Deterministic proof that photographic masking behaves correctly.
 *
 * This suite exists because browser-level probing of masking is unreliable: a
 * bundled image that fails to load renders as an empty box, so a CSS change
 * aimed at it yields no pixel change and the probe silently proves nothing.
 * That happened during development and was caught only by sampling pixels.
 *
 * Synthetic images put every pixel under test control, so each claim below is
 * actually demonstrated rather than assumed.
 */

const W = 100;
const H = 100;

/** Solid-colour RGBA buffer. */
const makeBuffer = (rgb) => {
  const buf = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    buf[i * 4] = rgb[0];
    buf[i * 4 + 1] = rgb[1];
    buf[i * 4 + 2] = rgb[2];
    buf[i * 4 + 3] = 255;
  }
  return buf;
};

/** Repaints a rectangle, mimicking a photographic area changing. */
const paintRect = (buf, x0, y0, w, h, rgb) => {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const i = (W * y + x) * 4;
      buf[i] = rgb[0];
      buf[i + 1] = rgb[1];
      buf[i + 2] = rgb[2];
    }
  }
};

const PHOTO = { x: 10, y: 10, w: 40, h: 40 };

// Keep mask-structure tests independent of .visual-baseline/current, which is
// generated and intentionally ignored. The visual-diff script validates fresh
// browser captures during `npm run verify`.
const CAPTURED_MASK_FIXTURES = [
  {
    width: 1440,
    height: 2620,
    regions: [
      { x: 32, y: 41, w: 34, h: 34, tag: 'img' },
      { x: 104, y: 2425, w: 42, h: 42, tag: 'img' },
    ],
  },
];

describe('visual mask — construction', () => {
  it('marks exactly the requested rectangle', () => {
    const mask = buildMask([PHOTO], W, H);
    expect(maskedCount(mask)).toBe(PHOTO.w * PHOTO.h);
    expect(mask[W * PHOTO.y + PHOTO.x]).toBe(1);
    expect(mask[W * (PHOTO.y - 1) + PHOTO.x]).toBe(0);
  });

  it('unions overlapping regions instead of double-counting', () => {
    // A <figure> wrapping an <img> at identical coordinates is the real case.
    // Summing areas would report 2x the true masked pixel count.
    const wrapperPlusChild = buildMask(
      [{ x: 10, y: 10, w: 40, h: 40 }, { x: 10, y: 10, w: 40, h: 40 }],
      W,
      H
    );
    expect(maskedCount(wrapperPlusChild)).toBe(40 * 40);

    // A larger enclosing region absorbs the smaller one entirely.
    const nested = buildMask(
      [{ x: 10, y: 10, w: 40, h: 40 }, { x: 5, y: 5, w: 50, h: 50 }],
      W,
      H
    );
    expect(maskedCount(nested)).toBe(50 * 50);
    // Naive summation would have produced 40*40 + 50*50 = 4100.
    expect(maskedCount(nested)).toBeLessThan(4100);
  });

  it('clips regions that extend past the image', () => {
    const mask = buildMask([{ x: 80, y: 80, w: 100, h: 100 }], W, H);
    expect(maskedCount(mask)).toBe(20 * 20);
  });

  it('returns null when there is nothing to mask', () => {
    expect(buildMask([], W, H)).toBeNull();
    expect(buildMask(null, W, H)).toBeNull();
    expect(buildMask([{ x: 0, y: 0, w: 0, h: 0 }], W, H)).toBeNull();
  });
});

describe('visual mask — a change inside the mask is ignored', () => {
  it('reports no difference when only photographic pixels change', () => {
    const base = makeBuffer([255, 255, 255]);
    const curr = makeBuffer([255, 255, 255]);

    // The photograph changes completely, as a JPEG does when it moves 1px.
    paintRect(curr, PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, [10, 20, 30]);

    const diff = makeBuffer([0, 0, 0]);
    const mask = buildMask([PHOTO], W, H);
    const masked = maskedCount(mask);
    applyMask(mask, base, curr, diff);

    const comparable = W * H - masked;
    const changed = pixelmatch(base, curr, diff, W, H, { threshold: 0.1 });

    expect(changed).toBe(0);
    expect(changed / comparable).toBe(0);
  });

  it('would have failed without the mask, proving the mask is doing the work', () => {
    const base = makeBuffer([255, 255, 255]);
    const curr = makeBuffer([255, 255, 255]);
    paintRect(curr, PHOTO.x, PHOTO.y, PHOTO.w, PHOTO.h, [10, 20, 30]);

    const diff = makeBuffer([0, 0, 0]);
    const changed = pixelmatch(base, curr, diff, W, H, { threshold: 0.1 });

    // 16% of the image: far above the 0.1% real-world tolerance.
    expect(changed / (W * H)).toBeGreaterThan(0.1);
  });
});

describe('visual mask — a change outside the mask is still caught', () => {
  it('reports a difference when only text pixels change', () => {
    const base = makeBuffer([255, 255, 255]);
    const curr = makeBuffer([255, 255, 255]);

    // Text sits below the photograph and must never be masked away.
    // A realistic headline-sized block, not a token few pixels.
    paintRect(curr, 10, 60, 80, 20, [10, 20, 30]);

    const diff = makeBuffer([0, 0, 0]);
    const mask = buildMask([PHOTO], W, H);
    const masked = maskedCount(mask);
    applyMask(mask, base, curr, diff);

    const comparable = W * H - masked;
    const changed = pixelmatch(base, curr, diff, W, H, { threshold: 0.1 });
    const ratio = changed / comparable;

    expect(changed).toBe(80 * 20);
    expect(comparable).toBe(100 * 100 - 40 * 40);
    // 1600 of 8400 comparable pixels: well past the 0.1% real tolerance.
    expect(ratio).toBeGreaterThan(0.1);
  });

  it('keeps a small change detectable because the denominator shrinks', () => {
    // A large mask must not make the gate lenient: comparable pixels fall, so
    // the same absolute change yields a HIGHER ratio, not a lower one.
    const bigPhoto = { x: 0, y: 0, w: 90, h: 90 };

    const base = makeBuffer([255, 255, 255]);
    const curr = makeBuffer([255, 255, 255]);
    paintRect(curr, 92, 92, 8, 8, [10, 20, 30]);

    const diff = makeBuffer([0, 0, 0]);
    const mask = buildMask([bigPhoto], W, H);
    const masked = maskedCount(mask);
    applyMask(mask, base, curr, diff);

    const changed = pixelmatch(base, curr, diff, W, H, { threshold: 0.1 });

    // 90x90 masked leaves an L-shaped border, not a square corner.
    const comparable = W * H - masked;
    expect(masked).toBe(90 * 90);
    expect(comparable).toBe(1900);
    expect(changed).toBe(64);

    // Masking raises the ratio rather than diluting it.
    const maskedRatio = changed / comparable;
    const unmaskedRatio = changed / (W * H);
    expect(maskedRatio).toBeGreaterThan(unmaskedRatio);
    expect(maskedRatio).toBeCloseTo(64 / 1900, 6);
    // Still comfortably above the 0.1% tolerance the gate actually uses.
    expect(maskedRatio).toBeGreaterThan(0.001);
  });

  it('catches a change in a region the mask only partially covers', () => {
    const base = makeBuffer([255, 255, 255]);
    const curr = makeBuffer([255, 255, 255]);

    // Straddles the mask boundary: the inner half is ignored, the outer half
    // is still compared.
    paintRect(curr, 40, 10, 30, 40, [10, 20, 30]);

    const diff = makeBuffer([0, 0, 0]);
    applyMask(buildMask([PHOTO], W, H), base, curr, diff);
    const changed = pixelmatch(base, curr, diff, W, H, { threshold: 0.1 });

    expect(changed).toBe(20 * 40);
  });
});

describe('visual mask — captured masks are well formed', () => {
  it('every mask fixture names real elements and fits the capture', () => {
    expect(CAPTURED_MASK_FIXTURES.length).toBeGreaterThan(0);

    for (const payload of CAPTURED_MASK_FIXTURES) {
      expect(Array.isArray(payload.regions)).toBe(true);
      expect(payload.width).toBeGreaterThan(0);
      expect(payload.height).toBeGreaterThan(0);

      for (const r of payload.regions) {
        expect(['img', 'figure', 'div', 'span', 'iframe']).toContain(r.tag);
        expect(r.w).toBeGreaterThan(0);
        expect(r.h).toBeGreaterThan(0);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        // Must fit inside the capture it describes, or it would mask away text.
        expect(r.x + r.w).toBeLessThanOrEqual(payload.width);
        expect(r.y + r.h).toBeLessThanOrEqual(payload.height);
      }
    }
  });

  it('never masks the majority of a page without saying so', () => {
    for (const payload of CAPTURED_MASK_FIXTURES) {
      const mask = buildMask(payload.regions, payload.width, payload.height);
      const share = maskedCount(mask) / (payload.width * payload.height);
      // The gate warns above 50%; assert we stay under it in normal operation.
      expect(share).toBeLessThan(0.5);
    }
  });
});

describe('visual mask — PNG round-trip', () => {
  it('applies to real captured dimensions without error', () => {
    const [payload] = CAPTURED_MASK_FIXTURES;
    const img = new PNG({ width: payload.width, height: payload.height });
    const mask = buildMask(payload.regions, payload.width, payload.height);
    expect(() => applyMask(mask, img.data)).not.toThrow();
  });
});
