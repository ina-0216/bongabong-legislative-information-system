import { describe, expect, it } from 'vitest';
const { mergeLegacySectionsIntoProvisions } = require('../utils/ordinanceBody');

describe('legacy ordinance sections migration', () => {
  it('preserves provisions and folds titled legacy sections into the legal body', () => {
    const merged = mergeLegacySectionsIntoProvisions(
      '<p>Existing general provision.</p>',
      [
        { title: 'Section 1. Scope.', content: '<p>Applies to all municipal offices.</p>' },
        { title: 'Section 2. Penalty.', content: '<p>Violations are subject to applicable law.</p>' },
      ],
    );

    expect(merged).toContain('Existing general provision.');
    expect(merged).toContain('Section 1. Scope.');
    expect(merged).toContain('Applies to all municipal offices.');
    expect(merged).toContain('Section 2. Penalty.');
    expect(merged).toContain('Violations are subject to applicable law.');
  });

  it('does not append a section whose content is already in provisions', () => {
    const provisions = '<p><strong>Section 1. Title.</strong> This is a sufficiently long section already present in the legal body.</p>';
    const merged = mergeLegacySectionsIntoProvisions(provisions, [
      { title: 'Section 1. Title.', content: '<p>This is a sufficiently long section already present in the legal body.</p>' },
    ]);

    expect(merged).toBe(provisions);
  });

  it('sanitizes legacy section markup while preserving its readable text', () => {
    const merged = mergeLegacySectionsIntoProvisions('', [
      { title: '<img src=x onerror=alert(1)> Section 1.', content: '<p>Safe text</p><script>alert(1)</script>' },
    ]);

    expect(merged).toContain('Safe text');
    expect(merged).not.toMatch(/<script|onerror|<img/i);
  });
});
