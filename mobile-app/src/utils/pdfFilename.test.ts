import { describe, expect, it } from 'vitest';
import { pdfFilename } from './pdfFilename';

describe('pdfFilename', () => {
  it('makes downloaded minutes identifiable from the session title and date', () => {
    expect(pdfFilename('Official Minutes', '7TH Regular Session', '2026-06-17'))
      .toBe('Official Minutes - 7TH Regular Session - 2026-06-17.pdf');
  });

  it('removes filename-hostile characters', () => {
    expect(pdfFilename('Minutes', 'Regular: Session/7?.pdf')).toBe('Minutes - Regular Session 7.pdf');
    expect(pdfFilename('CON')).toBe('_CON.pdf');
  });
});
