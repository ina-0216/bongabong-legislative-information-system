import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Terms from '../pages/Terms';

const mocks = vi.hoisted(() => ({
  api: { getTerms: vi.fn(), deleteTerm: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../utils/api', () => ({ api: mocks.api }));
vi.mock('sonner', () => ({ toast: mocks.toast }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.getTerms.mockResolvedValue([{
    _id: 'term-1', startYear: 2022, endYear: 2025, presidingOfficer: 'Example', isCurrent: false,
  }]);
});

describe('term deletion feedback', () => {
  it('shows the linked-record reason returned by the API', async () => {
    const user = userEvent.setup();
    mocks.api.deleteTerm.mockRejectedValue(new Error(
      'Cannot delete this term while it has linked records (2 ordinances/resolutions, 11 members, 10 committees).'
    ));
    render(<Terms />);

    await screen.findByText('2022-2025 Term');
    await user.click(screen.getByTitle('Delete Term'));
    await user.click(screen.getByText('Delete Term', { selector: 'button.bg-destructive' }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(
      'Cannot delete this term while it has linked records (2 ordinances/resolutions, 11 members, 10 committees).'
    ));
  });
});
