import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import OrdinanceBasicInfoSection from '../components/features/OrdinanceBasicInfoSection.jsx';

const baseForm = {
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

function renderBasicInfo({ type, isEditing }) {
  return render(
    <OrdinanceBasicInfoSection
      form={{ ...baseForm, type }}
      fieldError={() => false}
      set={vi.fn()}
      members={[]}
      terms={[]}
      amendmentCandidates={[]}
      isEditing={isEditing}
      sectorOptions={['General']}
    />
  );
}

describe('measure outcome fields', () => {
  it.each(['Ordinance', 'Resolution'])(
    'does not show adoption result or date when creating a %s',
    (type) => {
      renderBasicInfo({ type, isEditing: false });

      expect(screen.queryByLabelText('Adoption Result')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Adoption Date')).not.toBeInTheDocument();
    }
  );

  it.each(['Ordinance', 'Resolution'])(
    'does not show adoption result or date when editing a %s',
    (type) => {
      renderBasicInfo({ type, isEditing: true });

      expect(screen.queryByLabelText('Adoption Result')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Adoption Date')).not.toBeInTheDocument();
    }
  );
});
