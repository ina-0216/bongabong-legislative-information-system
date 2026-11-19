import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({
  api: {
    getPdfHeaderSettings: vi.fn(),
    updatePdfHeaderSettings: vi.fn(),
  },
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../utils/api', () => ({ api: mocks.api }));
vi.mock('sonner', () => ({ toast: mocks.toast }));

import PdfHeaderSettings from '../pages/PdfHeaderSettings';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.getPdfHeaderSettings.mockResolvedValue({ dataUrl: 'data:image/png;base64,AAAA', mimeType: 'image/png', source: 'default' });
  mocks.api.updatePdfHeaderSettings.mockResolvedValue({ dataUrl: 'data:application/pdf;base64,BBBB', mimeType: 'application/pdf', source: 'custom' });
});

describe('PDF header settings', () => {
  it('previews the current header and saves a selected one-page PDF template', async () => {
    const user = userEvent.setup();
    render(<PdfHeaderSettings />);

    expect(await screen.findByAltText('Current PDF header')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
    const file = new File(['%PDF-1.7 header'], 'header.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Upload a one-page PDF header'), file);
    expect(await screen.findByTitle('Preview of the selected PDF header')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save PDF header' }));

    await waitFor(() => expect(mocks.api.updatePdfHeaderSettings).toHaveBeenCalledOnce());
    const formData = mocks.api.updatePdfHeaderSettings.mock.calls[0][0];
    expect(formData.get('header')).toBe(file);
    expect(mocks.toast.success).toHaveBeenCalledWith('PDF header updated.');
  });

  it('rejects non-PDF header files', async () => {
    render(<PdfHeaderSettings />);
    await screen.findByAltText('Current PDF header');
    fireEvent.change(screen.getByLabelText('Upload a one-page PDF header'), {
      target: { files: [new File(['not-pdf'], 'header.png', { type: 'image/png' })] },
    });
    expect(mocks.toast.error).toHaveBeenCalledWith('Choose a PDF header file.');
  });
});
