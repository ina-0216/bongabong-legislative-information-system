import { describe, expect, it } from 'vitest';
import { getNameMatch, normalizeText } from '../services/consultationIdScanService.js';

describe('consultation ID OCR matching helpers', () => {
  it('normalizes accents and punctuation for name comparison', () => {
    expect(normalizeText('  José  Dela-Cruz! ')).toBe('jose dela cruz');
  });

  it('marks a full, partial, or missing name without returning OCR text', () => {
    expect(getNameMatch('JANE MARIE DOE', 'Jane Marie Doe')).toBe('Match');
    expect(getNameMatch('JANE DOE', 'Jane Marie Doe')).toBe('Partial');
    expect(getNameMatch('ANOTHER PERSON', 'Jane Marie Doe')).toBe('NotFound');
    expect(getNameMatch('JANE DOE', '')).toBe('NotChecked');
  });
});
