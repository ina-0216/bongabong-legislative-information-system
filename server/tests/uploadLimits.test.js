import { describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import { access } from 'node:fs/promises';

const {
  MAX_ORDINANCE_PDF_BYTES,
  MAX_DOCUMENT_EXTRACTION_DOCX_BYTES,
  MAX_ANNOUNCEMENT_COVER_BYTES,
  MAX_ANNOUNCEMENT_GALLERY_BYTES,
} = require('../utils/uploadLimits');
const { createTempUploadStorage } = require('../utils/tempUploadStorage');

describe('upload limits and temporary upload storage', () => {
  it('sets a 100 MiB ordinance PDF and a 50 MiB news cover limit', () => {
    expect(MAX_ORDINANCE_PDF_BYTES).toBe(100 * 1024 * 1024);
    expect(MAX_ANNOUNCEMENT_COVER_BYTES).toBe(50 * 1024 * 1024);
    expect(MAX_ANNOUNCEMENT_GALLERY_BYTES).toBe(8 * 1024 * 1024);
    expect(MAX_DOCUMENT_EXTRACTION_DOCX_BYTES).toBe(15 * 1024 * 1024);
  });

  it('streams uploads to temporary storage and removes them on request', async () => {
    const stream = new PassThrough();
    const file = { fieldname: 'pdf', mimetype: 'application/pdf', stream };
    const storage = createTempUploadStorage({ pdf: 4 });
    const stored = new Promise((resolve, reject) => {
      storage._handleFile({}, file, (error, result) => error ? reject(error) : resolve(result));
    });
    stream.end(Buffer.from('1234'));

    const result = await stored;
    expect(result.size).toBe(4);
    await expect(access(result.path)).resolves.toBeUndefined();
    await new Promise((resolve, reject) => {
      storage._removeFile({}, result, (error) => error ? reject(error) : resolve());
    });
    await expect(access(result.path)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects a temporary upload over its field-specific limit', async () => {
    const stream = new PassThrough();
    const file = { fieldname: 'file', mimetype: 'application/pdf', stream };
    const storage = createTempUploadStorage({ 'file:application/pdf': 4 });
    const stored = new Promise((resolve) => {
      storage._handleFile({}, file, (error, result) => resolve({ error, result }));
    });
    stream.end(Buffer.from('12345'));

    const { error } = await stored;
    expect(error).toMatchObject({ code: 'LIMIT_FILE_SIZE', field: 'file' });
  });
});
