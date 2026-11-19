import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SBMembers from './SBMembers';

const mocks = vi.hoisted(() => ({
  api: {
    getSBMembers: vi.fn(),
    getTerms: vi.fn(),
    createSBMember: vi.fn(),
    updateSBMember: vi.fn(),
    deleteSBMember: vi.fn(),
  },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../utils/api', () => ({ api: mocks.api }));
vi.mock('sonner', () => ({ toast: mocks.toast }));
vi.mock('@ibosys/api', () => ({
  isPhotoUploadWithinLimit: () => true,
  PHOTO_UPLOAD_SIZE_ERROR: 'Photo is too large.',
}));

const termId = '507f1f77bcf86cd799439011';
const pastTermId = '507f1f77bcf86cd799439012';

describe('SB member creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.api.getSBMembers.mockResolvedValue({ docs: [], total: 0, pages: 1 });
    mocks.api.getTerms.mockResolvedValue([
      { _id: termId, label: '2025-2028 Term', startYear: 2025, endYear: 2028, isCurrent: true },
      { _id: pastTermId, label: '2021-2024 Term', startYear: 2021, endYear: 2024, isCurrent: false },
    ]);
    mocks.api.createSBMember.mockResolvedValue({ _id: 'new-member' });
  });

  it('preselects the current term and submits a valid member with its term id', async () => {
    const user = userEvent.setup();
    render(<SBMembers />);

    await user.click(await screen.findByRole('button', { name: 'Add Member' }));

    expect(screen.getByLabelText('Term *')).toHaveValue(termId);
    await user.type(screen.getByLabelText('First Name *'), 'Taylor');
    await user.type(screen.getByLabelText('Last Name *'), 'Example');
    await user.selectOptions(screen.getByLabelText('Position *'), 'SB Member');
    await user.click(screen.getByRole('button', { name: 'Save Member' }));

    await waitFor(() => expect(mocks.api.createSBMember).toHaveBeenCalledOnce());
    const formData = mocks.api.createSBMember.mock.calls[0][0];
    expect(formData.get('firstName')).toBe('Taylor');
    expect(formData.get('lastName')).toBe('Example');
    expect(formData.get('termId')).toBe(termId);
  });

  it('allows adding a member to a past term selected in the list filter', async () => {
    const user = userEvent.setup();
    render(<SBMembers />);

    await user.click(await screen.findByRole('button', { name: 'All Legislative Terms' }));
    await user.click(screen.getByRole('button', { name: '2021-2024 Term (2021–2024)' }));
    await user.click(await screen.findByRole('button', { name: 'Add Member' }));

    expect(screen.getByLabelText('Term *')).toHaveValue(pastTermId);
    await user.type(screen.getByLabelText('First Name *'), 'Taylor');
    await user.type(screen.getByLabelText('Last Name *'), 'Example');
    await user.selectOptions(screen.getByLabelText('Position *'), 'SB Member');
    await user.click(screen.getByRole('button', { name: 'Save Member' }));

    await waitFor(() => expect(mocks.api.createSBMember).toHaveBeenCalledOnce());
    expect(mocks.api.createSBMember.mock.calls[0][0].get('termId')).toBe(pastTermId);
  });

  it('saves member details before a denied optional portrait upload', async () => {
    const user = userEvent.setup();
    mocks.api.updateSBMember.mockRejectedValueOnce(new Error('Server returned unexpected status code - 403'));
    render(<SBMembers />);

    await user.click(await screen.findByRole('button', { name: 'Add Member' }));
    await user.type(screen.getByLabelText('First Name *'), 'Taylor');
    await user.type(screen.getByLabelText('Last Name *'), 'Example');
    await user.selectOptions(screen.getByLabelText('Position *'), 'SB Member');
    await user.upload(screen.getByLabelText('Photo'), new File(['portrait'], 'portrait.jpg', { type: 'image/jpeg' }));
    await user.click(screen.getByRole('button', { name: 'Save Member' }));

    await waitFor(() => expect(mocks.api.createSBMember).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.api.updateSBMember).toHaveBeenCalledOnce());
    expect(mocks.api.createSBMember.mock.calls[0][0].get('photo')).toBeNull();
    expect(mocks.api.updateSBMember.mock.calls[0][0]).toMatchObject({});
    expect(mocks.api.updateSBMember.mock.calls[0][1].get('photo')).toBeInstanceOf(File);
    expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('Member details were saved'));
  });

  it('shows linked-history deactivation accurately and allows inactive-member reactivation', async () => {
    const inactiveMember = {
      _id: 'inactive-member', firstName: 'Taylor', lastName: 'Example', name: 'Taylor Example',
      position: 'SB Member', order: 1, isActive: false, termId,
    };
    mocks.api.getSBMembers.mockImplementation((query = '') => Promise.resolve(
      String(query).includes('includeInactive=true')
        ? { docs: [inactiveMember], total: 1, pages: 1 }
        : { docs: [], total: 0, pages: 1 },
    ));
    mocks.api.deleteSBMember.mockResolvedValue({ deactivated: true });
    const user = userEvent.setup();
    render(<SBMembers />);

    await user.click(await screen.findByRole('button', { name: 'Show inactive members' }));
    const reactivate = await screen.findByRole('button', { name: 'Reactivate Hon. Taylor Example' });
    await user.click(reactivate);

    await waitFor(() => expect(mocks.api.updateSBMember).toHaveBeenCalledOnce());
    expect(mocks.api.updateSBMember.mock.calls[0][0]).toBe('inactive-member');
    expect(mocks.api.updateSBMember.mock.calls[0][1].get('isActive')).toBe('true');
    expect(mocks.toast.success).toHaveBeenCalledWith('Member reactivated.');
  });
});
