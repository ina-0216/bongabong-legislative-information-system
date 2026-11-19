import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reports from '../pages/Reports';
import { STAGES } from '../constants/stages';

const mocks = vi.hoisted(() => ({
  api: { getOrdinances: vi.fn(), getSessions: vi.fn(), getTerms: vi.fn(), getSessionPdf: vi.fn() },
  downloadPdf: vi.fn(),
}));

vi.mock('../utils/api', () => ({
  api: mocks.api,
  createPdfFilename: (...args) => args.join('-'),
  downloadPdf: mocks.downloadPdf,
}));

describe('Reports session selector and timeline stage selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.api.getOrdinances.mockResolvedValue({ docs: [] });
    mocks.api.getTerms.mockResolvedValue([{ _id: 'term-2025', label: '2025-2028 Term', startYear: 2025, endYear: 2028 }]);
    mocks.api.getSessions.mockImplementation(({ page }) => page === 1
      ? { docs: [{ _id: 'old-session', title: 'Budget Session', date: '2024-10-01' }], total: 2, pages: 2 }
      : { docs: [{ _id: 'current-session', title: 'Special Planning Session', date: '2026-06-15', sessionType: 'Special Session' }], total: 2, pages: 2 });
    mocks.api.getSessionPdf.mockResolvedValue(new Blob());
    mocks.downloadPdf.mockResolvedValue(undefined);
  });

  it('can unselect all currently selected timeline stages', async () => {
    const user = userEvent.setup();
    render(<Reports />);
    await user.click(await screen.findByRole('button', { name: /Select & Print/i }));

    const unselectAll = await screen.findByRole('button', { name: 'Unselect All' });
    await user.click(unselectAll);

    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    const stageCheckboxes = screen.getAllByRole('checkbox');
    expect(stageCheckboxes).toHaveLength(STAGES.length);
    expect(stageCheckboxes.every(checkbox => !checkbox.checked)).toBe(true);
  });

  it('searches sessions across all pages and keeps term filtering available', async () => {
    const user = userEvent.setup();
    render(<Reports />);
    const search = await screen.findByPlaceholderText('Title, number, or date...');
    await user.type(search, 'Special Planning');

    const termFilter = screen.getByLabelText('Filter by Term');
    await user.selectOptions(termFilter, 'term-2025');
    const sessionSelect = screen.getByLabelText('Select Session');
    expect(within(sessionSelect).getByRole('option', { name: /Special Planning Session/ })).toBeInTheDocument();
    expect(within(sessionSelect).queryByRole('option', { name: /Budget Session/ })).not.toBeInTheDocument();
    expect(mocks.api.getSessions).toHaveBeenCalledWith({ page: 2, limit: 100 });
    await waitFor(() => expect(sessionSelect.value).toBe(''));
  });
});
