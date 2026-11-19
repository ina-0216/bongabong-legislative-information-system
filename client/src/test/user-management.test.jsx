import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersList from '../pages/UsersList';
import NewsAdmin from '../pages/NewsAdmin';

const mocks = vi.hoisted(() => ({
  user: { role: 'System Admin' },
  api: {
    getUsers: vi.fn(), createUser: vi.fn(), getAnnouncements: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('../utils/api', () => ({ api: mocks.api }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('sonner', () => ({ toast: mocks.toast }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { role: 'System Admin' };
  mocks.api.getUsers.mockResolvedValue({ docs: [], total: 0, pages: 1 });
  mocks.api.createUser.mockResolvedValue({
    message: 'Secretary account created. An invitation email was sent.', invitationSent: true,
  });
  mocks.api.getAnnouncements.mockResolvedValue({ data: [{
    _id: 'announcement-1', title: 'Public Notice', category: 'General', createdAt: '2026-10-12',
  }] });
});

describe('admin account creation', () => {
  it('accepts an institutional .gov.ph email and creates a Secretary account', async () => {
    const user = userEvent.setup();
    render(<UsersList />);
    await user.click(await screen.findByRole('button', { name: 'Add User' }));
    await user.type(screen.getByText('First Name *').parentElement.querySelector('input'), 'Jamie');
    await user.type(screen.getByText('Last Name *').parentElement.querySelector('input'), 'Example');
    await user.type(screen.getByText('Email Address *').parentElement.querySelector('input'), 'Jamie.Example@Bongabong.gov.ph');
    await user.type(screen.getByText('Contact Number *').parentElement.querySelector('input'), '09171234567');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(mocks.api.createUser).toHaveBeenCalledOnce());
    expect(mocks.api.createUser.mock.calls[0][0].email).toBe('jamie.example@bongabong.gov.ph');
    expect(await screen.findByText(/invitation email was sent/i)).toBeInTheDocument();
  });

  it('provides the required canonical position when Vice Mayor is selected', async () => {
    const user = userEvent.setup();
    render(<UsersList />);
    await user.click(await screen.findByRole('button', { name: 'Add User' }));
    await user.selectOptions(screen.getByText('Role *').parentElement.querySelector('select'), 'Vice Mayor');
    expect(screen.getByText('Position / Title *').parentElement.querySelector('select')).toHaveValue('Vice Mayor');
  });
});

describe('announcement permissions', () => {
  it('does not offer delete to a Secretary when the API policy reserves it for System Admins', async () => {
    mocks.user = { role: 'Secretary' };
    render(<NewsAdmin />);

    await screen.findByText('Public Notice');
    expect(screen.queryByRole('button', { name: 'Delete Public Notice' })).not.toBeInTheDocument();
  });

  it('offers delete to a System Admin', async () => {
    mocks.user = { role: 'System Admin' };
    render(<NewsAdmin />);

    expect(await screen.findByRole('button', { name: 'Delete Public Notice' })).toBeInTheDocument();
  });
});
