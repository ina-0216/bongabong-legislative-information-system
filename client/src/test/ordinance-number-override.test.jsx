import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrdinanceBasicInfoSection from '../components/features/OrdinanceBasicInfoSection.jsx';

const form = {
  type: 'Ordinance',
  number: '2026-017',
  seriesYear: 2026,
  termId: '',
  sectorTag: 'General',
  proponentId: '',
  coAuthors: [],
  secondedBy: [],
  distribution: [],
  title: '',
};

function renderCreateForm(set = vi.fn()) {
  function Harness() {
    const [manualNumberEntry, setManualNumberEntry] = useState(false);
    return (
      <OrdinanceBasicInfoSection
        form={form}
        fieldError={() => false}
        set={set}
        members={[]}
        terms={[]}
        amendmentCandidates={[]}
        isEditing={false}
        sectorOptions={['General']}
        manualNumberEntry={manualNumberEntry}
        onManualNumberEntryChange={setManualNumberEntry}
      />
    );
  }

  return { ...render(<Harness />), set };
}

describe('ordinance number manual override', () => {
  it('keeps the generated number read-only until manual entry is selected', () => {
    renderCreateForm();

    const numberInput = document.getElementById('ord-number');
    expect(numberInput).toHaveAttribute('readonly');
    expect(numberInput).toHaveValue('2026-017');

    fireEvent.click(screen.getByRole('button', { name: 'Enter manually' }));
    expect(document.getElementById('ord-number')).not.toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Use automatic number' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns the field to generated read-only mode after manual entry is turned off', () => {
    const { set } = renderCreateForm();

    fireEvent.click(screen.getByRole('button', { name: 'Enter manually' }));
    fireEvent.change(document.getElementById('ord-number'), { target: { value: '2026-042' } });
    expect(set).toHaveBeenCalledWith('number', '2026-042');
    fireEvent.click(screen.getByRole('button', { name: 'Use automatic number' }));

    expect(document.getElementById('ord-number')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Enter manually' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not show the creation-only toggle when editing an ordinance', () => {
    render(
      <OrdinanceBasicInfoSection
        form={form}
        fieldError={() => false}
        set={vi.fn()}
        members={[]}
        terms={[]}
        amendmentCandidates={[]}
        isEditing
        sectorOptions={['General']}
      />
    );

    expect(screen.queryByRole('button', { name: /enter manually|use automatic number/i })).not.toBeInTheDocument();
    expect(document.getElementById('ord-number')).not.toHaveAttribute('readonly');
  });
});
