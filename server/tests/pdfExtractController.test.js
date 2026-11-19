import { describe, expect, it, vi } from 'vitest';

const { createExtractDocumentText } = require('../controllers/pdfExtractController');

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

describe('PDF extraction controller', () => {
  it('parses verified Cloudinary PDFs through a signed download URL and removes the staging file', async () => {
    const resource = {
      public_id: 'ibosys/ordinances/staging/033361b0-49ca-4dde-ab3c-e9809cecd646.pdf',
      secure_url: 'https://res.cloudinary.com/private/raw/upload/staging.pdf',
    };
    const signedDownloadUrl = 'https://api.cloudinary.com/raw/download?signature=short-lived';
    const verifiedUpload = vi.fn().mockResolvedValue(resource);
    const createDownloadUrl = vi.fn().mockReturnValue(signedDownloadUrl);
    const extractText = vi.fn().mockResolvedValue({
      text: 'AN ORDINANCE NO. 2099-901 '.padEnd(80, 'x'),
      sourceType: 'pdf',
      numPages: 1,
    });
    const removeStagedPdf = vi.fn().mockResolvedValue({ result: 'ok' });
    const buildPayload = vi.fn().mockReturnValue({ sourceType: 'pdf', candidates: {} });
    const handler = createExtractDocumentText({
      verifyPdfUpload: verifiedUpload,
      createTemporaryPdfDownloadUrl: createDownloadUrl,
      extractText,
      deleteFromCloudinary: removeStagedPdf,
      buildExtractionPayload: buildPayload,
    });
    const res = makeResponse();
    const next = vi.fn();

    await handler({ body: { pdfUpload: { publicId: 'staged.pdf' } } }, res, next);

    expect(verifiedUpload).toHaveBeenCalledWith({ publicId: 'staged.pdf' });
    expect(createDownloadUrl).toHaveBeenCalledWith(resource);
    expect(extractText).toHaveBeenCalledWith(signedDownloadUrl, 'application/pdf');
    expect(extractText).not.toHaveBeenCalledWith(resource.secure_url, 'application/pdf');
    expect(removeStagedPdf).toHaveBeenCalledWith(resource.public_id, 'raw');
    expect(res.body).toEqual({
      success: true,
      data: { sourceType: 'pdf', candidates: {} },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
