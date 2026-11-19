import { afterEach, describe, expect, it, vi } from 'vitest';

const crypto = require('node:crypto');
const { cloudinary } = require('../utils/cloudinary');
const {
  createPdfUploadSignature,
  createTemporaryPdfDownloadUrl,
  verifyPdfUpload,
  promoteVerifiedPdfUpload,
} = require('../utils/cloudinaryDirectPdfUpload');

describe('signed direct PDF uploads', () => {
  const oldEnvironment = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };

  afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, value] of Object.entries({
      CLOUDINARY_CLOUD_NAME: oldEnvironment.cloudName,
      CLOUDINARY_API_KEY: oldEnvironment.apiKey,
      CLOUDINARY_API_SECRET: oldEnvironment.apiSecret,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('signs a fixed PDF destination and accepts only the matching uploaded PDF', async () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = 'test-key';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    const resourceSpy = vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/ordinance.pdf',
      format: 'pdf',
      bytes: 1024,
    });

    await expect(verifyPdfUpload(upload)).resolves.toMatchObject({
      format: 'pdf',
      bytes: 1024,
    });
    expect(resourceSpy).toHaveBeenCalledWith(`ibosys/ordinances/staging/${upload.publicId}`, {
      resource_type: 'raw',
      type: 'upload',
    });
  });

  it('creates a short-lived signed download URL for a verified staging PDF', () => {
    const privateDownloadUrl = vi.spyOn(cloudinary.utils, 'private_download_url')
      .mockReturnValue('https://api.cloudinary.com/signed-staging-pdf');
    const publicId = `ibosys/ordinances/staging/${crypto.randomUUID()}.pdf`;
    const before = Math.floor(Date.now() / 1000);

    const url = createTemporaryPdfDownloadUrl({ public_id: publicId });

    expect(url).toBe('https://api.cloudinary.com/signed-staging-pdf');
    expect(privateDownloadUrl).toHaveBeenCalledWith(publicId, 'pdf', {
      resource_type: 'raw',
      type: 'upload',
      expires_at: expect.any(Number),
    });
    const expiresAt = privateDownloadUrl.mock.calls[0][2].expires_at;
    expect(expiresAt).toBeGreaterThanOrEqual(before + 60 * 60);
  });

  it('does not sign files outside the temporary PDF staging folder', () => {
    const privateDownloadUrl = vi.spyOn(cloudinary.utils, 'private_download_url');

    expect(() => createTemporaryPdfDownloadUrl({
      public_id: 'ibosys/ordinances/not-staging.pdf',
    })).toThrow(/temporary upload folder/i);
    expect(privateDownloadUrl).not.toHaveBeenCalled();
  });

  it('accepts a matching signed raw PDF when Cloudinary omits format metadata', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/ordinance.pdf',
      bytes: 1024,
    });

    await expect(verifyPdfUpload(upload)).resolves.toMatchObject({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      bytes: 1024,
    });
  });

  it('accepts a PDF exactly at the configured byte limit when format metadata is absent', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      bytes: 100 * 1024 * 1024,
    });

    await expect(verifyPdfUpload(upload)).resolves.toMatchObject({
      bytes: 100 * 1024 * 1024,
    });
  });

  it('rejects a resource whose public ID does not match the signed staging PDF', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/${upload.publicId}`,
      format: 'pdf',
      bytes: 1024,
    });

    await expect(verifyPdfUpload(upload)).rejects.toThrow(/valid PDF/i);
  });

  it('returns a distinct invalid-type error for a non-PDF resource', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      format: 'docx',
      bytes: 1024,
    });

    await expect(verifyPdfUpload(upload)).rejects.toMatchObject({
      message: 'The uploaded document must be a valid PDF.',
      statusCode: 400,
    });
  });

  it('rejects altered signatures before looking up the Cloudinary resource', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    const resourceSpy = vi.spyOn(cloudinary.api, 'resource');

    await expect(verifyPdfUpload({ ...upload, publicId: 'not-a-uuid' })).rejects.toThrow(/invalid or expired/i);
    expect(resourceSpy).not.toHaveBeenCalled();
  });

  it('rejects an uploaded resource that exceeds the configured size', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/large.pdf',
      format: 'pdf',
      bytes: 100 * 1024 * 1024 + 1,
    });

    await expect(verifyPdfUpload(upload)).rejects.toMatchObject({
      message: 'The uploaded PDF exceeds the 100 MiB size limit.',
      statusCode: 413,
    });
  });

  it('promotes a verified staging PDF to a new permanent raw asset ID', async () => {
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
    const upload = createPdfUploadSignature();
    vi.spyOn(cloudinary.api, 'resource').mockResolvedValue({
      public_id: `ibosys/ordinances/staging/${upload.publicId}`,
      secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/staging.pdf',
      format: 'pdf',
      bytes: 1024,
    });
    const renameSpy = vi.spyOn(cloudinary.uploader, 'rename').mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/ordinance.pdf',
    });

    await expect(promoteVerifiedPdfUpload(upload)).resolves.toMatchObject({
      secure_url: 'https://res.cloudinary.com/test-cloud/raw/upload/ordinance.pdf',
    });
    expect(renameSpy).toHaveBeenCalledWith(
      `ibosys/ordinances/staging/${upload.publicId}`,
      expect.stringMatching(/^ibosys\/ordinances\/[0-9a-f-]+\.pdf$/i),
      expect.objectContaining({ resource_type: 'raw', overwrite: false }),
    );
  });
});
