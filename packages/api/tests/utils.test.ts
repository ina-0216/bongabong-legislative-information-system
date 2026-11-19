import { describe, it, expect, vi, afterEach } from 'vitest';
import { cloudinaryPdfDownloadUrl, createPdfFilename, downloadPdf, viewPdf, mediaUrl,
  MAX_ORDINANCE_PDF_UPLOAD_BYTES, MAX_ANNOUNCEMENT_COVER_UPLOAD_BYTES,
  LARGE_UPLOAD_TIMEOUT_MS } from '../src/index';

describe('large upload constraints', () => {
  it('uses the configured PDF and news cover sizes with an extended upload timeout', () => {
    expect(MAX_ORDINANCE_PDF_UPLOAD_BYTES).toBe(100 * 1024 * 1024);
    expect(MAX_ANNOUNCEMENT_COVER_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
    expect(LARGE_UPLOAD_TIMEOUT_MS).toBe(10 * 60 * 1000);
  });
});

function stubObjectUrl() {
  const create = vi.fn(() => 'blob:mock-url');
  const revoke = vi.fn();
  Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true, writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true, writable: true });
  return { create, revoke };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('downloadPdf', () => {
  it('creates an object URL, clicks a download anchor, then revokes', async () => {
    vi.useFakeTimers();
    const { create, revoke } = stubObjectUrl();

    let clicked: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = this;
    });
    const createElementSpy = vi.spyOn(document, 'createElement');

    const pending = downloadPdf(Promise.resolve(new Blob(['pdf-bytes'], { type: 'application/pdf' })), 'report.pdf');
    await vi.runAllTimersAsync();
    await pending;

    expect(create).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clicked).not.toBeNull();
    expect(clicked!.download).toBe('report.pdf');
    expect(clicked!.getAttribute('href')).toBe('blob:mock-url');
    expect(revoke).toHaveBeenCalledWith('blob:mock-url');
  });

  it('propagates a rejected fetch without touching the DOM', async () => {
    vi.useFakeTimers();
    const { create } = stubObjectUrl();

    await expect(downloadPdf(Promise.reject(new Error('404')), 'missing.pdf')).rejects.toThrow('404');
    expect(create).not.toHaveBeenCalled();
  });
});

describe('descriptive PDF filenames', () => {
  it('sanitizes titles into portable filenames', () => {
    expect(createPdfFilename('Official Minutes', '7TH: Regular? Session.pdf')).toBe('Official Minutes - 7TH Regular Session.pdf');
    expect(createPdfFilename('CON')).toBe('_CON.pdf');
  });

  it('adds Cloudinary attachment naming for raw PDFs', () => {
    expect(cloudinaryPdfDownloadUrl(
      'https://res.cloudinary.com/ibosys/raw/upload/v123/official-measure.pdf?x=1',
      'Ordinance - 2026-014 - Public Safety.pdf',
    )).toBe('https://res.cloudinary.com/ibosys/raw/upload/fl_attachment:Ordinance%20-%202026-014%20-%20Public%20Safety.pdf/v123/official-measure.pdf?x=1');
  });

  it('does not rewrite non-Cloudinary URLs', () => {
    const url = 'https://documents.example.test/measure.pdf';
    expect(cloudinaryPdfDownloadUrl(url, 'Ordinance - 2026-014.pdf')).toBe(url);
  });
});

describe('viewPdf', () => {
  it('opens the object URL in a new tab and revokes it later', async () => {
    vi.useFakeTimers();
    const { create, revoke } = stubObjectUrl();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const pending = viewPdf(Promise.resolve(new Blob(['pdf-bytes'], { type: 'application/pdf' })));
    await vi.runAllTimersAsync();
    await pending;

    expect(create).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith('blob:mock-url', '_blank');
    expect(revoke).toHaveBeenCalledWith('blob:mock-url');
  });
});

describe('mediaUrl', () => {
  it('returns an empty string for a missing value', () => {
    expect(mediaUrl('')).toBe('');
  });

  it('passes absolute http(s) URLs through untouched', () => {
    expect(mediaUrl('https://cdn.example.com/a.png', 'http://localhost:5001/api')).toBe('https://cdn.example.com/a.png');
    expect(mediaUrl('http://cdn.example.com/a.png')).toBe('http://cdn.example.com/a.png');
  });

  it('matches absolute URLs case-insensitively', () => {
    expect(mediaUrl('HTTPS://CDN.example.com/a.png')).toBe('HTTPS://CDN.example.com/a.png');
  });

  it('prefixes root-relative paths with the API origin', () => {
    expect(mediaUrl('/uploads/a.png', 'http://localhost:5001/api')).toBe('http://localhost:5001/uploads/a.png');
  });

  it('adds the missing leading slash', () => {
    expect(mediaUrl('uploads/a.png', 'http://localhost:5001/api')).toBe('http://localhost:5001/uploads/a.png');
  });

  it('strips a trailing slash after /api', () => {
    expect(mediaUrl('/a.png', 'http://localhost:5001/api/')).toBe('http://localhost:5001/a.png');
  });

  it('falls back to the local dev origin', () => {
    expect(mediaUrl('/uploads/a.png')).toBe('http://localhost:5001/uploads/a.png');
  });

  it('respects an explicit API base that has no /api suffix', () => {
    expect(mediaUrl('/uploads/a.png', 'https://api.ibosys.gov.ph')).toBe('https://api.ibosys.gov.ph/uploads/a.png');
  });
});
