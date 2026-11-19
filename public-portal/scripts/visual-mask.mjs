/**
 * Photographic-region masking for the visual regression gate.
 *
 * Extracted from visual-diff.mjs so the arithmetic can be unit-tested against
 * synthetic images. Browser-level probing of this behaviour is unreliable: a
 * bundled image that fails to load renders as an empty box, so a CSS change
 * aimed at it produces no pixel change and the probe silently proves nothing.
 *
 * The rules the tests lock in:
 *   - Masked pixels are excluded from BOTH the numerator and denominator, so a
 *     photograph re-rasterising cannot fail the gate.
 *   - Every other pixel keeps full weight, so masking can never hide a real
 *     typographic or layout change.
 *   - Overlapping regions are unioned, not summed, so a wrapper and its child
 *     do not double-count.
 *   - A missing mask degrades to a full comparison rather than failing.
 */

/** Builds a deduplicated mask bitmap, or null when there is nothing to mask. */
export function buildMask(regions, imgWidth, imgHeight) {
  if (!Array.isArray(regions) || regions.length === 0) return null;

  const mask = new Uint8Array(imgWidth * imgHeight);
  let any = false;

  for (const r of regions) {
    if (!r || !(r.w > 0) || !(r.h > 0)) continue;

    // Clip to the image so a mask recorded at a different page height cannot
    // cover text that is legitimately being compared.
    const x0 = Math.max(0, Math.min(r.x, imgWidth));
    const y0 = Math.max(0, Math.min(r.y, imgHeight));
    const x1 = Math.max(0, Math.min(r.x + r.w, imgWidth));
    const y1 = Math.max(0, Math.min(r.y + r.h, imgHeight));
    if (x1 <= x0 || y1 <= y0) continue;

    for (let y = y0; y < y1; y += 1) {
      const row = y * imgWidth;
      for (let x = x0; x < x1; x += 1) {
        if (!mask[row + x]) {
          mask[row + x] = 1;
          any = true;
        }
      }
    }
  }

  return any ? mask : null;
}

/** Number of distinct masked pixels. */
export function maskedCount(mask) {
  if (!mask) return 0;
  let n = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) n += 1;
  return n;
}

/**
 * Zeroes masked pixels in every supplied RGBA buffer.
 *
 * All three buffers (baseline, current, diff) are blanked so the masked area is
 * neutral: masking only the current image would turn every masked pixel into a
 * counted difference.
 */
export function applyMask(mask, ...buffers) {
  if (!mask) return;
  for (let p = 0; p < mask.length; p += 1) {
    if (!mask[p]) continue;
    const i = p << 2;
    for (const buf of buffers) {
      buf[i] = 0;
      buf[i + 1] = 0;
      buf[i + 2] = 0;
      buf[i + 3] = 255;
    }
  }
}