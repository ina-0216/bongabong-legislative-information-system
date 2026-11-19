import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import OrdinanceDetail from '../pages/OrdinanceDetail';

const mocks = vi.hoisted(() => ({
  api: {
    getOrdinance: vi.fn(),
    getSessions: vi.fn(),
    getTerms: vi.fn(),
    getCommittees: vi.fn(),
  },
  user: { role: 'Secretary' },
}));

vi.mock('../utils/api', () => ({ api: mocks.api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@ibosys/ui', () => ({
  Badge: ({ children }) => <span>{children}</span>,
  Modal: ({ isOpen, children, title }) => isOpen ? (
    <div role="dialog" aria-label={title}>{children}</div>
  ) : null,
}));
vi.mock('../components/ui/PageSkeleton', () => ({ default: () => <div>Loading</div> }));
vi.mock('../components/features/CommitteeBadge', () => ({ default: () => <span>Committee</span> }));
vi.mock('../components/features/TypeBadge', () => ({ default: () => <span>Ordinance</span> }));
vi.mock('../components/features/OrdinanceTimeline', () => ({ default: () => null }));
vi.mock('../components/features/SentimentChart', () => ({ default: () => null }));
vi.mock('../components/tabs/OrdinanceOverviewTab', () => ({ default: () => null }));
vi.mock('../components/tabs/CommitteeReportTab', () => ({ default: () => null }));
vi.mock('../components/tabs/ConsultationTab', () => ({ default: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.getOrdinance.mockResolvedValue({
    _id: 'ordinance-1',
    type: 'Ordinance',
    status: 'First Reading',
    title: 'Sample Ordinance',
    number: '2026-001',
    proponentId: { name: 'Sample Proponent' },
    timeline: [],
  });
  mocks.api.getSessions.mockResolvedValue({
    docs: [{
      _id: 'session-1',
      title: 'Regular Session 1',
      date: '2026-10-01T00:00:00.000Z',
      status: 'Scheduled',
    }],
  });
  mocks.api.getTerms.mockResolvedValue([]);
});

describe('ordinance rejection session selector', () => {
  it('loads existing sessions using the server-supported page limit', async () => {
    render(
      <MemoryRouter>
        <OrdinanceDetail />
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.api.getSessions).toHaveBeenCalledWith({ page: 1, limit: 100 }));
    await userEvent.click(screen.getByRole('button', { name: /legislative timeline/i }));
    await userEvent.click(await screen.findByRole('button', { name: /record formal rejection/i }));

    const rejectionDialog = screen.getByRole('dialog', { name: 'Record ordinance rejection' });
    expect(within(rejectionDialog).getByRole('option', { name: /Regular Session 1/ })).toBeInTheDocument();
  });
});
