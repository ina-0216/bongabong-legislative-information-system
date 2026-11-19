import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  createPdfFilename,
  pdfContentDisposition,
  sessionMinutesFilename,
  legislativeDocumentFilename,
} = require('../utils/pdfFilename.js');

describe('PDF filenames', () => {
  it('uses the record title and date instead of a database id for session minutes', () => {
    expect(sessionMinutesFilename({
      sessionNumber: '7TH',
      title: 'Regular Session of the 12th Sangguniang Bayan',
      date: '2026-06-17T00:00:00.000Z',
      _id: '6ac7c9acd3b97877d9f8ec80',
    })).toBe('Official Minutes - 7TH - Regular Session of the 12th Sangguniang Bayan - 2026-06-17.pdf');
  });

  it('includes a legislative document number and title in its filename', () => {
    expect(legislativeDocumentFilename({
      type: 'Ordinance',
      number: '2026-014',
      title: 'An ordinance regulating public transport',
    })).toBe('Ordinance - 2026-014 - An ordinance regulating public transport.pdf');
  });

  it('removes path separators and filesystem-reserved characters', () => {
    expect(createPdfFilename('minutes', '../7th: Regular? Session')).toBe('minutes - 7th Regular Session.pdf');
  });

  it('sends safe ASCII and UTF-8 Content-Disposition filenames', () => {
    const header = pdfContentDisposition('Minutes - Sangguniang Bayan.pdf');

    expect(header).toContain('attachment; filename="Minutes - Sangguniang Bayan.pdf"');
    expect(header).toContain("filename*=UTF-8''Minutes%20-%20Sangguniang%20Bayan.pdf");
  });
});
