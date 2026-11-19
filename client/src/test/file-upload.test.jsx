import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  extractDocumentText: vi.fn(),
  uploadOrdinancePdf: vi.fn(),
}));

vi.mock('../utils/api', () => ({ api: { extractDocumentText: mocks.extractDocumentText } }));
vi.mock('../utils/cloudinaryPdfUpload', () => ({ uploadOrdinancePdf: mocks.uploadOrdinancePdf }));
vi.mock('../hooks/useApi', () => ({
  useApiMutation: ({ mutationFn, options }) => ({
    isPending: false,
    mutateAsync: async (file) => {
      try {
        const result = await mutationFn(file);
        await options.onSuccess?.(result);
        return result;
      } catch (error) {
        options.onError?.(error);
        throw error;
      }
    },
  }),
}));

import FileUpload from '../components/ui/FileUpload.jsx';

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the upload or extraction error visible in the form', async () => {
    const message = 'The PDF upload was not found or is not ready yet. Please retry.';
    mocks.uploadOrdinancePdf.mockResolvedValue({ publicId: 'sample.pdf' });
    mocks.extractDocumentText.mockRejectedValue(new Error(message));

    render(<FileUpload />);
    const file = new File(['sample PDF'], 'sample-ordinance-extraction.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(screen.getByLabelText('Upload PDF or DOCX file'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Extract & Review Fields' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Extraction failed');
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });
});
