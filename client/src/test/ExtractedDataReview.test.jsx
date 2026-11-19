import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExtractedDataReview from '../components/ExtractedDataReview.jsx';

const candidates = {
  type: { value: 'Ordinance', confidence: 0.9 },
  number: { value: '2026-001', confidence: 0.9 },
  title: { value: 'Current title', confidence: 0.6 },
  seriesYear: { value: 2026, confidence: 0.9 },
  proponent: { value: 'Councilor A', confidence: 0.75 },
  sectorTag: { value: 'Environment', confidence: 0.5 },
  explanatoryNote: { value: 'A short note.', confidence: 0.6 },
  enactingClause: { value: 'BE IT ORDAINED BY THE SANGGUNIANG BAYAN:', confidence: 0.6 },
  provisions: { value: 'Section 1. Old text.', confidence: 0.5 },
  penaltyClause: { value: 'A penalty applies to violations of this ordinance.', confidence: 0.55 },
};

describe('ExtractedDataReview', () => {
  it('shows extracted values and applies edited values when accepted', () => {
    const onAccept = vi.fn();
    render(
      <ExtractedDataReview
        textPreview="Extracted source text"
        candidates={candidates}
        overallConfidence={0.6}
        sourceType="pdf"
        onAccept={onAccept}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('Current title')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[3]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Edit Measure Title' }), {
      target: { value: 'Corrected title' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept & Populate Form' }));

    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Corrected title',
      seriesYear: 2026,
      sectorTag: 'Environment',
      enactingClause: 'BE IT ORDAINED BY THE SANGGUNIANG BAYAN:',
      provisions: 'Section 1. Old text.',
      penaltyClause: 'A penalty applies to violations of this ordinance.',
    }));
  });

  it('renders existing candidates instead of hiding them', () => {
    render(
      <ExtractedDataReview
        textPreview="Source"
        candidates={candidates}
        overallConfidence={0.9}
        sourceType="docx"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('Section 1. Old text.')).toBeInTheDocument();
    expect(screen.getByText('A short note.')).toBeInTheDocument();
  });
});
