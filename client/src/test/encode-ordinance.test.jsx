import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  params: {},
  api: {
    getNextOrdinanceNumber: vi.fn(),
    getSBMembers: vi.fn(),
    getTerms: vi.fn(),
    getOrdinances: vi.fn(),
    getOrdinance: vi.fn(),
  },
  toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => mocks.params };
});
vi.mock('../utils/api', () => ({ api: mocks.api }));
vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('../hooks/useSpellCheck', () => ({ useSpellCheck: () => ({ checkFields: vi.fn() }) }));
vi.mock('../components/features/OrdinanceBasicInfoSection', () => ({ default: () => <div /> }));
vi.mock('../components/features/OrdinanceProvisionsSection', () => ({ default: () => <div /> }));
vi.mock('../components/features/SpellCheckModal', () => ({ default: () => null }));
vi.mock('../components/ui/FileUpload', () => ({ default: () => <div data-testid="document-import-control" /> }));
vi.mock('../components/ExtractedDataReview', () => ({ default: () => null }));

import EncodeOrdinance from '../pages/EncodeOrdinance.jsx';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.params = {};
  mocks.api.getNextOrdinanceNumber.mockResolvedValue({ number: '2026-001' });
  mocks.api.getSBMembers.mockResolvedValue([]);
  mocks.api.getTerms.mockResolvedValue([]);
  mocks.api.getOrdinances.mockResolvedValue([]);
  mocks.api.getOrdinance.mockResolvedValue({
    _id: 'measure-1',
    type: 'Ordinance',
    number: '2026-001',
    title: 'Sample measure',
  });
  localStorage.clear();
});

describe('ordinance and resolution create/edit form', () => {
  it.each([
    ['creating an ordinance', 'create', 'Ordinance'],
    ['editing an ordinance', 'edit', 'Ordinance'],
    ['creating a resolution', 'create', 'Resolution'],
    ['editing a resolution', 'edit', 'Resolution'],
  ])('hides the signed instrument upload while keeping document import when %s', async (_label, mode, type) => {
    if (mode === 'edit') {
      mocks.params = { id: 'measure-1' };
      mocks.api.getOrdinance.mockResolvedValue({ _id: 'measure-1', type, number: '2026-001', title: 'Sample measure' });
    } else if (type === 'Resolution') {
      localStorage.setItem('ordinance_draft', JSON.stringify({ form: { type, number: 'RES-2026-001' } }));
    }

    render(<EncodeOrdinance />);

    expect(screen.queryByText('Signed / Official Instrument PDF')).not.toBeInTheDocument();
    expect(screen.getByText('Import Document (Auto-fill Fields)')).toBeInTheDocument();
    expect(screen.getByTestId('document-import-control')).toBeInTheDocument();
  });
});
