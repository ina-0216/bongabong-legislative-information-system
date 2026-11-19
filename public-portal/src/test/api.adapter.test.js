import { describe, it, expect, beforeEach, vi } from 'vitest';

/** Asserts the portal adapter's routes and params against the shared client. */
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
  const client = {};
  const wrapped = {
    get: h.rec('get'),
    post: h.rec('post'),
  };
  h.instances.push(wrapped);
  Object.assign(client, wrapped);
  return {
    createApiClient: () => ({ client }),
    mediaUrl: vi.fn((value) => (value ? `mock://${value}` : '')),
  };
});

const { mediaUrl: sharedMediaUrl } = await import('@ibosys/api');
const { api, mediaUrl } = await import('../utils/api');

beforeEach(() => {
  h.calls.length = 0;
});

const lastCall = () => h.calls[h.calls.length - 1];

describe('portal adapter transport wiring', () => {
  it('creates a single unauthenticated client', () => {
    expect(h.instances).toHaveLength(1);
  });

  it('requests the public stats route', async () => {
    await api.getStats();
    expect(lastCall().method).toBe('get');
    expect(lastCall().args[0]).toBe('/stats');
  });

  it('maps detail routes', async () => {
    await api.getDocumentDetail('d1');
    expect(lastCall().args[0]).toBe('/documents/d1');

    await api.getNewsDetail('n1');
    expect(lastCall().args[0]).toBe('/news/n1');
  });

  it('forwards list params untouched', async () => {
    await api.getDocuments({ page: 2, limit: 10 });
    expect(lastCall().args[0]).toBe('/documents');
    expect(lastCall().args[1]).toEqual({ params: { page: 2, limit: 10 } });
  });

  it('keeps committee term filtering, which the shared helper omits', async () => {
    await api.getCommittees({ termId: 't1' });
    expect(lastCall().args[0]).toBe('/committees');
    expect(lastCall().args[1]).toEqual({ params: { termId: 't1' } });
  });

  it('posts the OTP contact number', async () => {
    await api.sendOtp('09171234567');
    expect(lastCall().method).toBe('post');
    expect(lastCall().args[0]).toBe('/send-otp');
    expect(lastCall().args[1]).toEqual({ contactNumber: '09171234567' });
  });

  it('sends and verifies a consultation email code', async () => {
    await api.sendEmailVerification('resident@example.com');
    expect(lastCall().args[0]).toBe('/send-email-verification');
    expect(lastCall().args[1]).toEqual({ email: 'resident@example.com' });

    await api.verifyEmailCode('resident@example.com', '123456');
    expect(lastCall().args[0]).toBe('/verify-email-code');
    expect(lastCall().args[1]).toEqual({ email: 'resident@example.com', code: '123456' });
  });

  it('sends guest consultation as multipart', async () => {
    await api.submitGuestForm('o1', new FormData());
    expect(lastCall().method).toBe('post');
    expect(lastCall().args[0]).toBe('/consult/o1/guest');
    expect(lastCall().args[2]).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('reads public feedback by ordinance', async () => {
    await api.getPublicFeedback('o1');
    expect(lastCall().args[0]).toBe('/consult/o1/public');
  });

  it('delegates mediaUrl to the shared helper', () => {
    expect(mediaUrl('/uploads/a.png')).toBe('mock:///uploads/a.png');
    expect(sharedMediaUrl).toHaveBeenCalled();
  });

  it('returns an empty mediaUrl for a missing value', () => {
    expect(mediaUrl('')).toBe('');
  });
});
