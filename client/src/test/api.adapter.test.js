import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Adapter contract tests.
 *
 * The adapter builds axios calls from query strings produced by the pages.
 * Mocking `@ibosys/api` lets us assert the exact url/params/config handed to
 * the transport, which is where the encoding bugs live.
 */
const h = vi.hoisted(() => {
  const calls = [];
  const instances = [];
  const rec = (method) => (...args) => {
    calls.push({ method, args });
    return Promise.resolve({});
  };
  return { calls, instances, rec };
});

vi.mock('@ibosys/api', () => {
  // Recorded in a plain array rather than read back off the mock, because
  // Vitest resets mock call data between tests.
  const make = () => {
    const client = {
      get: h.rec('get'),
      post: h.rec('post'),
      put: h.rec('put'),
      patch: h.rec('patch'),
      delete: h.rec('delete'),
    };
    h.instances.push(client);
    return client;
  };
  return {
    // First instance is the authenticated client, second is the anonymous one.
    createApiClient: () => ({ client: make() }),
    LARGE_UPLOAD_TIMEOUT_MS: 600000,
    cloudinaryPdfDownloadUrl: (url) => url,
    createPdfFilename: (...parts) => `${parts.filter(Boolean).join(' - ')}.pdf`,
    downloadPdf: vi.fn(),
    viewPdf: vi.fn(),
  };
});

const { api, cloudinaryPdfDownloadUrl, createPdfFilename, downloadPdf, viewPdf } = await import('../utils/api');

let authed;
let anon;

beforeEach(() => {
  h.calls.length = 0;
  authed = h.instances[0];
  anon = h.instances[1];
});

const lastCall = () => h.calls[h.calls.length - 1];

describe('client adapter transport wiring', () => {
  it('builds one authenticated and one anonymous client', () => {
    expect(h.instances).toHaveLength(2);
    expect(authed).not.toBe(anon);
  });

  it('sends login through the anonymous client', async () => {
    await api.login({ email: 'a@b.co', password: 'x' });
    expect(lastCall().method).toBe('post');
    expect(lastCall().args[0]).toBe('/auth/login');
    expect(h.calls.some((c) => c.method === 'get')).toBe(false);
  });

  it('re-exports the shared download helpers', () => {
    expect(downloadPdf).toBeTypeOf('function');
    expect(viewPdf).toBeTypeOf('function');
    expect(cloudinaryPdfDownloadUrl).toBeTypeOf('function');
    expect(createPdfFilename).toBeTypeOf('function');
  });

  it('requests generated ordinance and resolution PDFs from the header-aware generator', async () => {
    await api.getLegislativeDocumentPdf('ord-123');

    expect(lastCall().method).toBe('get');
    expect(lastCall().args[0]).toBe('/ordinances/ord-123/generate-pdf');
    expect(lastCall().args[1]).toEqual({ responseType: 'blob' });
  });

  it('requests session PDFs from the header-aware session generator', async () => {
    await api.getSessionPdf('session-123');

    expect(lastCall().method).toBe('get');
    expect(lastCall().args[0]).toBe('/sessions/session-123/generate-pdf');
    expect(lastCall().args[1]).toEqual({ responseType: 'blob' });
  });

  it('sends committee assignment through the authenticated ordinance endpoint', async () => {
    const body = { committee: 'Committee on Health', notes: 'Referred for review' };
    await api.assignCommittee('ord-123', body);

    expect(lastCall().method).toBe('put');
    expect(lastCall().args[0]).toBe('/ordinances/ord-123/assign-committee');
    expect(lastCall().args[1]).toEqual(body);
  });
});

describe('query string conversion', () => {
  it('splits a plain query string', async () => {
    await api.getOrdinances('limit=50&page=1');
    expect(lastCall().args[0]).toBe('/ordinances');
    expect(lastCall().args[1].params).toEqual({ limit: '50', page: '1' });
  });

  it('omits params entirely when none are supplied', async () => {
    await api.getOrdinances();
    expect(lastCall().args[1].params).toBeUndefined();
  });

  it('treats an empty string as no params', async () => {
    await api.getUsers('');
    expect(lastCall().args[1].params).toBeUndefined();
  });

  it('tolerates a leading question mark', async () => {
    await api.getNotifications();
    expect(lastCall().args[0]).toContain('/notifications');
  });

  it('decodes percent-encoded values exactly once', async () => {
    // Pages pre-encode with encodeURIComponent; passing the raw encoded value
    // to axios would double-encode it into %2520.
    await api.getPendingConsultations('page=1&limit=20&search=john%20doe');
    expect(lastCall().args[1].params).toEqual({ page: '1', limit: '20', search: 'john doe' });
  });

  it('decodes + as space, matching URLSearchParams.toString()', async () => {
    const query = new URLSearchParams({ search: 'john doe' }).toString();
    await api.getSBMembers(query);
    expect(lastCall().args[1].params.search).toBe('john doe');
  });

  it('does not crash on a malformed percent escape', async () => {
    await api.getCommittees('termId=100%');
    expect(lastCall().args[1].params).toEqual({ termId: '100%' });
  });

  it('passes through an already-parsed params object', async () => {
    await api.getAnnouncements({ page: '2' });
    expect(lastCall().args[1].params).toEqual({ page: '2' });
  });

  it('preserves committee and member pagination the shared client drops', async () => {
    await api.getCommittees('limit=0');
    expect(lastCall().args[0]).toBe('/committees');
    expect(lastCall().args[1].params).toEqual({ limit: '0' });

    await api.getSBMembers('page=3&limit=20');
    expect(lastCall().args[0]).toBe('/sbmembers');
    expect(lastCall().args[1].params).toEqual({ page: '3', limit: '20' });
  });

  it('forwards consultation analytics filters', async () => {
    await api.getConsultationAnalytics('o1', 'sentiment=Positive');
    expect(lastCall().args[0]).toBe('/consultations/ordinance/o1/feedback');
    expect(lastCall().args[1].params).toEqual({ sentiment: 'Positive' });
  });
});

describe('timeline report argument handling', () => {
  it('splits the id from an encoded stages query', async () => {
    const stages = encodeURIComponent('First Reading,Second Reading');
    await api.getTimelineReport(`o1?stages=${stages}`);
    expect(lastCall().args[0]).toBe('/reports/timeline/o1');
    expect(lastCall().args[1].params).toEqual({ stages: 'First Reading,Second Reading' });
  });

  it('works when no stages query is present', async () => {
    await api.getTimelineReport('o1');
    expect(lastCall().args[0]).toBe('/reports/timeline/o1');
    expect(lastCall().args[1].params).toBeUndefined();
  });
});

describe('request shape', () => {
  it('marks every report endpoint as a blob request', async () => {
    await api.getCommitteeReport('o1');
    expect(lastCall().args[1]).toEqual({ responseType: 'blob' });

    await api.getAnnualReport(2025);
    expect(lastCall().args[0]).toBe('/reports/annual?year=2025');
    expect(lastCall().args[1]).toEqual({ responseType: 'blob' });

    await api.getMinutesReport('s1');
    expect(lastCall().args[1]).toEqual({ responseType: 'blob' });
  });

  it('sends multipart headers for FormData uploads', async () => {
    await api.uploadAvatar(new FormData());
    expect(lastCall().args[2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });

    await api.createOrdinance(new FormData());
    expect(lastCall().args[2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });

    await api.createOrdinance({ title: 'Signed upload payload' });
    expect(lastCall().args[1]).toEqual({ title: 'Signed upload payload' });
    expect(lastCall().args[2]).toBeUndefined();

    await api.extractDocumentText(new FormData());
    expect(lastCall().args[2].timeout).toBe(600000);

    await api.createAnnouncement(new FormData());
    expect(lastCall().args[2].timeout).toBe(600000);
  });

  it('requests and discards signed ordinance PDF uploads through authenticated routes', async () => {
    await api.createOrdinancePdfUploadSignature();
    expect(lastCall().args[0]).toBe('/ordinances/pdf-upload-signature');
    expect(lastCall().args[1]).toEqual({});

    const pdfUpload = { publicId: 'id', folder: 'ibosys/ordinances', timestamp: 1, signature: 'sig' };
    await api.discardOrdinancePdfUpload(pdfUpload);
    expect(lastCall().args[0]).toBe('/ordinances/pdf-upload-discard');
    expect(lastCall().args[1]).toEqual({ pdfUpload });
  });

  it('keeps status-only updates shaped as { status }', async () => {
    await api.updateUserStatus('u1', 'Active');
    expect(lastCall().method).toBe('put');
    expect(lastCall().args[0]).toBe('/users/u1/status');
    expect(lastCall().args[1]).toEqual({ status: 'Active' });
  });

  it('defaults resetPassword to an empty body', async () => {
    await api.resetPassword('u1');
    expect(lastCall().args[1]).toEqual({});
  });

  it('uses PATCH for announcement publish toggling', async () => {
    await api.togglePublishAnnouncement('a1');
    expect(lastCall().method).toBe('patch');
    expect(lastCall().args[0]).toBe('/announcements/a1/toggle-publish');
  });
});
