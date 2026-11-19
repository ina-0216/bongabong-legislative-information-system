import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { api, apiClient, mediaUrl } from './api';

interface Recorded {
  method: string;
  url: string;
  params?: unknown;
  data?: unknown;
  responseType?: string;
}

let recorded: Recorded[] = [];
let nextBody: unknown = {};

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  recorded = [];
  nextBody = {};
  apiClient.defaults.adapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
    recorded.push({
      method: (config.method ?? 'get').toLowerCase(),
      url: config.url ?? '',
      params: config.params,
      data: config.data,
      responseType: config.responseType,
    });
    return {
      data: nextBody,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    } as AxiosResponse;
  };
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('base url derivation', () => {
  it('targets the public namespace of the configured API root', () => {
    expect(apiClient.defaults.baseURL).toMatch(/\/public$/);
  });

  it('normalises trailing slashes', () => {
    // Strip the scheme first: "http://" legitimately contains a double slash.
    const path = (apiClient.defaults.baseURL ?? '').replace(/^https?:\/\//, '');
    expect(path).not.toMatch(/\/{2,}/);
    expect(path).not.toMatch(/\/$/);
  });
});

describe('response interceptor', () => {
  it('resolves to the response BODY, not an AxiosResponse', async () => {
    nextBody = { totalOrdinances: 12, totalResolutions: 3, approved: 9, inConsultation: 2, approvedThisYear: 5 };

    const stats = await api.getStats();

    // If the interceptor leaked the envelope, `.data` would be the body.
    expect(stats).toEqual(nextBody);
    expect((stats as { data?: unknown }).data).toBeUndefined();
  });

  it('surfaces the server message and status on failure', async () => {
    apiClient.defaults.adapter = async (config: AxiosRequestConfig) => {
      const error = new Error('Request failed with status code 422') as Error & {
        response?: { status: number; data: unknown; config?: AxiosRequestConfig };
      };
      error.response = {
        status: 422,
        data: { message: 'Validation failed: contactNumber is required' },
        config,
      };
      throw error;
    };

    await expect(api.sendOtp('')).rejects.toThrow('Validation failed: contactNumber is required');

    await api.sendOtp('').catch((err: Error & { status?: number }) => {
      expect(err.status).toBe(422);
    });
  });
});

describe('endpoint contracts', () => {
  it('getStats hits GET /stats', async () => {
    await api.getStats();
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/stats' });
  });

  it('getDocuments hits GET /documents and forwards query params', async () => {
    nextBody = {
      docs: [{ _id: 'doc-1', type: 'Ordinance', number: '2026-001', title: 'Budget', status: 'First Reading', committee: 'Finance', createdAt: '2026-01-01', filedAt: '2026-01-02', sectorTag: 'Finance' }],
      total: 1,
      page: 2,
      pages: 1,
    };
    const page = await api.getDocuments({ page: 2, limit: 12, search: 'budget' });
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/documents' });
    expect(recorded[0].params).toEqual({ page: 2, limit: 12, search: 'budget' });
    expect(page.docs[0]).toMatchObject({ filedAt: '2026-01-02', sectorTag: 'Finance' });
  });

  it('getDocumentDetail hits GET /documents/:id', async () => {
    nextBody = { _id: 'abc123', type: 'Ordinance', number: '2026-001', title: 'Measure', status: 'First Reading', committee: 'Finance', createdAt: '2026-01-01', filedAt: '2026-01-02', plainLanguageSummary: 'A supported public summary.' };
    const document = await api.getDocumentDetail('abc123');
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/documents/abc123' });
    expect(document).toMatchObject({ filedAt: '2026-01-02', plainLanguageSummary: 'A supported public summary.' });
  });

  it('builds public PDF URLs for viewing and downloading documents', () => {
    expect(api.getDocumentPdfUrl('document 1')).toMatch(/\/documents\/document%201\/pdf$/);
    expect(api.getDocumentPdfUrl('document 1', true)).toMatch(/\/documents\/document%201\/pdf\?download=true$/);
  });

  it('getLatest hits GET /latest and resolves to an ARRAY (not grouped)', async () => {
    nextBody = [
      { _id: '1', type: 'Ordinance', number: '2026-001', title: 'A', title_tl: 'A', status: 'Approved', committee: 'C', sectorTag: 'S', createdAt: '2026-01-01' },
      { _id: '2', type: 'Resolution', number: '2026-002', title: 'B', title_tl: 'B', status: 'Approved', committee: 'C', sectorTag: 'S', createdAt: '2026-01-02' },
    ];

    const latest = await api.getLatest();

    expect(recorded[0]).toMatchObject({ method: 'get', url: '/latest' });
    expect(Array.isArray(latest)).toBe(true);
    expect(latest.map((d) => d.type)).toEqual(['Ordinance', 'Resolution']);
    // Documents expose `createdAt`; there is no `dateFiled` on public records.
    expect((latest[0] as unknown as Record<string, unknown>).dateFiled).toBeUndefined();
  });

  it('getSessions hits GET /sessions with pagination', async () => {
    nextBody = { docs: [], total: 0, page: 1, pages: 0 };
    const page = await api.getSessions({ page: 1, limit: 50 });
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/sessions' });
    expect(page.docs).toEqual([]);
    expect(page.page).toBe(1);
  });

  it('getRecentSessions hits GET /recent-sessions and resolves to an array', async () => {
    nextBody = [{ _id: 's1', title: 'Session', date: '2026-01-05' }];
    const sessions = await api.getRecentSessions();
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/recent-sessions' });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('getMinutesPdf requests binary, not JSON', async () => {
    await api.getMinutesPdf('sess1');
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/minutes/sess1', responseType: 'arraybuffer' });
  });

  it('builds a public URL for opening finalized session minutes', () => {
    expect(api.getMinutesPdfUrl('session 1')).toMatch(/\/minutes\/session%201$/);
  });

  it('getMembers hits GET /members and resolves to an ARRAY (not paginated)', async () => {
    nextBody = [{ _id: 'm1', firstName: 'Juan', lastName: 'Dela Cruz', position: 'Councilor' }];
    const members = await api.getMembers({ termId: 't1' });
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/members' });
    expect(recorded[0].params).toEqual({ termId: 't1' });
    expect(Array.isArray(members)).toBe(true);
  });

  it('getCommittees hits GET /committees', async () => {
    await api.getCommittees({ termId: 't1' });
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/committees' });
  });

  it('getTerms hits GET /terms', async () => {
    await api.getTerms();
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/terms' });
  });

  it('getNews hits GET /news and keeps the `data` envelope', async () => {
    nextBody = { data: [{ _id: 'n1', title: 'Announcement' }], total: 1, page: 1, pages: 1 };
    const news = await api.getNews({ page: 1, limit: 20 });
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/news' });
    expect(news.data).toHaveLength(1);
    expect(news.total).toBe(1);
  });

  it('getFeaturedNews unwraps the `data` envelope to a plain array', async () => {
    nextBody = { data: [{ _id: 'n1', title: 'Featured' }] };
    const news = await api.getFeaturedNews();
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/news/featured' });
    expect(Array.isArray(news)).toBe(true);
    expect(news[0].title).toBe('Featured');
  });

  it('getNewsDetail hits GET /news/:id', async () => {
    await api.getNewsDetail('n9');
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/news/n9' });
  });

  it('sendOtp posts the contact number', async () => {
    await api.sendOtp('09171234567');
    expect(recorded[0]).toMatchObject({ method: 'post', url: '/send-otp' });
  });

  it('sendEmailVerification posts the resident email', async () => {
    await api.sendEmailVerification('resident@example.com');
    expect(recorded[0]).toMatchObject({
      method: 'post',
      url: '/send-email-verification',
      data: JSON.stringify({ email: 'resident@example.com' }),
    });
  });

  it('verifyEmailCode posts the email and 6-digit code', async () => {
    await api.verifyEmailCode('resident@example.com', '482913');
    expect(recorded[0]).toMatchObject({
      method: 'post',
      url: '/verify-email-code',
      data: JSON.stringify({ email: 'resident@example.com', code: '482913' }),
    });
  });

  it('submitGuestConsultation posts multipart to /consult/:id/guest', async () => {
    await api.submitGuestConsultation('ord9', new FormData());
    expect(recorded[0]).toMatchObject({ method: 'post', url: '/consult/ord9/guest' });
  });

  it('getPublicFeedback hits GET /consult/:id/public', async () => {
    nextBody = [];
    const feedback = await api.getPublicFeedback('ord9');
    expect(recorded[0]).toMatchObject({ method: 'get', url: '/consult/ord9/public' });
    expect(feedback).toEqual([]);
  });
});

describe('mediaUrl', () => {
  it('passes absolute URLs through untouched', () => {
    expect(mediaUrl('https://res.cloudinary.com/x/y.jpg')).toBe('https://res.cloudinary.com/x/y.jpg');
  });

  it('returns an empty string for falsy input', () => {
    expect(mediaUrl('')).toBe('');
  });

  it('strips the /api suffix when prefixing a relative path', () => {
    const result = mediaUrl('/uploads/photo.jpg');
    expect(result).toMatch(/^https?:\/\/[^/]+\/uploads\/photo\.jpg$/);
  });

  it('adds a leading slash when the server omits one', () => {
    const result = mediaUrl('uploads/photo.jpg');
    expect(result).toMatch(/\/uploads\/photo\.jpg$/);
  });
});
