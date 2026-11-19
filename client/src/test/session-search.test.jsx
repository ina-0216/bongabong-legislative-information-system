import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sessions from '../pages/Sessions';

const mocks = vi.hoisted(() => ({
  api: {
    getSessions: vi.fn(), getOrdinances: vi.fn(), getTerms: vi.fn(), getSBMembers: vi.fn(),
  },
}));

vi.mock('../utils/api', () => ({ api: mocks.api, viewPdf: vi.fn() }));
vi.mock('../hooks/useSpellCheck', () => ({ useSpellCheck: () => ({ checkFields: vi.fn(async () => []) }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.getSessions.mockResolvedValue({ docs: [], total: 0, pages: 1 });
  mocks.api.getOrdinances.mockResolvedValue({ docs: [] });
  mocks.api.getTerms.mockResolvedValue([]);
  mocks.api.getSBMembers.mockResolvedValue({ docs: [] });
});

describe('session search', () => {
  it('sends title/date search to the server and shows the matching empty state', async () => {
    const user = userEvent.setup();
    render(<Sessions />);
    await screen.findByText('No Sessions Recorded');

    await user.type(screen.getByPlaceholderText('Search by session title or date (YYYY-MM-DD)...'), 'Budget Session');

    await waitFor(() => expect(mocks.api.getSessions.mock.calls.at(-1)[0]).toContain('search=Budget+Session'));
    expect(await screen.findByText('No matching sessions')).toBeInTheDocument();
  });

  it('labels Final minutes as Published and Draft minutes as Draft', async () => {
    mocks.api.getSessions.mockResolvedValue({
      docs: [
        { _id: 'draft-session', title: 'Draft session', date: '2026-10-30', status: 'Draft', itemsDiscussed: [] },
        { _id: 'published-session', title: 'Published session', date: '2026-10-29', status: 'Final', itemsDiscussed: [] },
      ],
      total: 2,
      pages: 1,
    });

    render(<Sessions />);

    expect(await screen.findByText('Draft session')).toBeInTheDocument();
    expect(screen.getByText('Published session')).toBeInTheDocument();
    const sessionTable = within(screen.getByRole('table'));
    expect(sessionTable.getByText('Published')).toBeInTheDocument();
    expect(sessionTable.getByText('Draft')).toBeInTheDocument();
  });

  it('adds term, publication status, and session type filters to the existing search', async () => {
    const user = userEvent.setup();
    mocks.api.getTerms.mockResolvedValue([{ _id: 'term-2025', label: '2025-2028 Term' }]);
    render(<Sessions />);
    await screen.findByText('No Sessions Recorded');

    await user.selectOptions(screen.getByLabelText('Filter sessions by term'), 'term-2025');
    await user.selectOptions(screen.getByLabelText('Filter sessions by publication status'), 'Final');
    await user.selectOptions(screen.getByLabelText('Filter sessions by type'), 'Special Session');

    await waitFor(() => {
      const lastParams = mocks.api.getSessions.mock.calls.at(-1)[0];
      expect(lastParams).toContain('termId=term-2025');
      expect(lastParams).toContain('status=Final');
      expect(lastParams).toContain('sessionType=Special+Session');
    });
  });
});
