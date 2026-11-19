import { describe, expect, it } from 'vitest';
import { IMPORT_DOCUMENT_SIZE_COPY, mergeExtractedDataIntoForm } from './EncodeOrdinance.jsx';

const emptyForm = {
  type: 'Ordinance',
  number: '2026-001',
  title: '',
  proponentId: '',
  sectorTag: 'General',
  seriesYear: new Date().getFullYear(),
  explanatoryNote: '',
  enactingClause: '',
  provisions: '',
  penaltyClause: '',
  sections: [{ title: 'Section 1.', content: '' }],
};

describe('mergeExtractedDataIntoForm', () => {
  it('populates extracted fields over system defaults and keeps manually edited fields', () => {
    const result = mergeExtractedDataIntoForm(emptyForm, {
      type: 'Resolution',
      number: 'RES-2025-014',
      seriesYear: 2025,
      title: 'Extracted title',
      proponent: 'Councilor A',
      sectorTag: 'Environment',
      explanatoryNote: 'Extracted note',
      enactingClause: 'BE IT RESOLVED:',
      provisions: 'Resolved action body',
      penaltyClause: 'Extracted penalty',
    }, new Set(['title', 'sectorTag']), () => 'member-1');

    expect(result).toMatchObject({
      type: 'Resolution',
      number: 'RES-2025-014',
      seriesYear: 2025,
      title: '',
      proponentId: 'member-1',
      sectorTag: 'General',
      explanatoryNote: 'Extracted note',
      enactingClause: 'BE IT RESOLVED:',
      provisions: 'Resolved action body',
      penaltyClause: 'Extracted penalty',
    });
  });

  it('preserves an explicitly entered number and does not replace an existing series year', () => {
    const previous = { ...emptyForm, number: 'Custom number', seriesYear: 2024 };
    const result = mergeExtractedDataIntoForm(previous, {
      number: '2025-009',
      seriesYear: 2025,
    }, new Set(['number']));

    expect(result.number).toBe('Custom number');
    expect(result.seriesYear).toBe(2024);
  });
});

describe('document import size guidance', () => {
  it('states the separate PDF and DOCX size limits', () => {
    expect(IMPORT_DOCUMENT_SIZE_COPY).toBe('Maximum size: PDF 100 MiB; DOCX 15 MiB.');
  });
});
