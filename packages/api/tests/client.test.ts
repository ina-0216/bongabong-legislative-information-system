import { describe, it, expect } from 'vitest';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { createApiClient } from '../src/index';

interface StubResult {
  data?: unknown;
  status?: number;
}

function stubAdapter(handler: (config: InternalAxiosRequestConfig) => StubResult = () => ({})) {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const result = handler(config);
    return {
      data: result.data ?? {},
      status: result.status ?? 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  return { adapter, seen };
}

describe('createApiClient defaults', () => {
  it('applies baseURL, timeout and JSON content type', () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    expect(api.client.defaults.baseURL).toBe('https://api.test/api');
    expect(api.client.defaults.timeout).toBe(30000);
    expect((api.client.defaults.headers as Record<string, unknown>)['Content-Type']).toBe('application/json');
  });

  it('exposes every documented resource group', () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    for (const key of [
      'auth',
      'users',
      'ordinances',
      'sbMembers',
      'terms',
      'committees',
      'sessions',
      'announcements',
      'consultations',
      'notifications',
      'corrections',
      'reports',
      'system',
      'public',
      'health',
    ]) {
      expect(api[key as keyof typeof api]).toBeTypeOf('object');
    }
  });
});

describe('login timeout', () => {
  it('allows up to 90 seconds for login while keeping other requests at 30 seconds', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.auth.login({ email: 'admin@example.org', password: 'test-password' });
    await api.health.check();

    expect(seen.map((config) => config.timeout)).toEqual([90_000, 30_000]);
  });
});

describe('request interceptor', () => {
  it('attaches a Bearer token when one is available', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api', getToken: () => 'tok-123' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.users.getMe();

    expect((seen[0].headers as Record<string, unknown>).Authorization).toBe('Bearer tok-123');
  });

  it('omits the header when no token is available', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api', getToken: () => null });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.users.getMe();

    expect((seen[0].headers as Record<string, unknown>).Authorization).toBeUndefined();
  });

  it('never attaches auth to a public client even when a token is supplied', async () => {
    const api = createApiClient({
      baseURL: 'https://api.test/api/public',
      getToken: () => 'tok-123',
      isPublic: true,
    });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.health.check();

    expect((seen[0].headers as Record<string, unknown>).Authorization).toBeUndefined();
  });

  it('re-reads the token on every request', async () => {
    let token = 'first';
    const api = createApiClient({ baseURL: 'https://api.test/api', getToken: () => token });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.users.getMe();
    token = 'second';
    await api.users.getMe();

    expect((seen[0].headers as Record<string, unknown>).Authorization).toBe('Bearer first');
    expect((seen[1].headers as Record<string, unknown>).Authorization).toBe('Bearer second');
  });
});

describe('response interceptor', () => {
  it('unwraps the response envelope to its data payload', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter } = stubAdapter(() => ({ data: { _id: 'u1', name: 'Juan' } }));
    api.client.defaults.adapter = adapter;

    const result = await api.health.check();

    expect(result).toEqual({ _id: 'u1', name: 'Juan' });
  });

  it('normalises error messages and attaches status/data', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    api.client.defaults.adapter = (async () => {
      throw Object.assign(new Error('Request failed with status code 500'), {
        isAxiosError: true,
        response: { status: 500, data: { message: 'Boom' } },
      });
    }) as AxiosAdapter;

    const error = await api.users.getMe().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Boom');
    expect((error as { status?: number }).status).toBe(500);
    expect((error as { data?: unknown }).data).toEqual({ message: 'Boom' });
  });

  it('falls back to the transport message when the body has none', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    api.client.defaults.adapter = (async () => {
      throw Object.assign(new Error('Network Error'), { isAxiosError: true });
    }) as AxiosAdapter;

    const error = await api.users.getMe().catch((e: unknown) => e);

    expect((error as Error).message).toBe('Network Error');
    expect((error as { status?: number }).status).toBeUndefined();
  });

  it('falls back to a generic message when nothing is usable', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    api.client.defaults.adapter = (async () => {
      throw Object.assign(new Error(''), { isAxiosError: true });
    }) as AxiosAdapter;

    const error = await api.users.getMe().catch((e: unknown) => e);

    expect((error as Error).message).toBe('Request failed');
  });

  it('retries a failed GET once and returns the successful response', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    let attempts = 0;
    api.client.defaults.adapter = (async (config) => {
      attempts += 1;
      if (attempts === 1) {
        throw Object.assign(new Error('Network Error'), { isAxiosError: true, config });
      }
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    }) as AxiosAdapter;

    await expect(api.health.check()).resolves.toEqual({ ok: true });
    expect(attempts).toBe(2);
  });

  it('does not retry mutations or retry a GET more than once', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    let attempts = 0;
    api.client.defaults.adapter = (async (config) => {
      attempts += 1;
      throw Object.assign(new Error('Network Error'), { isAxiosError: true, config });
    }) as AxiosAdapter;

    await api.users.create({
      firstName: 'A', lastName: 'User', email: 'a@example.org', password: 'long-password',
      role: 'Secretary', contactNumber: '09171234567',
    } as never).catch(() => undefined);
    expect(attempts).toBe(1);

    attempts = 0;
    await api.health.check().catch(() => undefined);
    expect(attempts).toBe(2);
  });
});

describe('endpoint routing', () => {
  it('builds the expected paths', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.terms.getById('t1');
    await api.users.changePassword('u9', { currentPassword: 'a', newPassword: 'b' });
    await api.sessions.delete('s3');
    await api.notifications.markAllRead();

    expect(seen.map((c) => c.url)).toEqual(['/terms/t1', '/users/u9/password', '/sessions/s3', '/notifications/read-all']);
    expect(seen.map((c) => c.method)).toEqual(['get', 'put', 'delete', 'put']);
  });

  it('inlines the year in the annual report query', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.reports.getAnnualReport(2025);

    expect(seen[0].url).toBe('/reports/annual?year=2025');
  });

  it('forwards list params', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.users.getAll({ page: '2', search: 'juan' });

    expect(seen[0].params).toEqual({ page: '2', search: 'juan' });
  });

  it('sends multipart headers for FormData uploads', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.ordinances.create(new FormData());
    await api.users.updateAvatar(new FormData());

    for (const config of seen) {
      expect((config.headers as Record<string, unknown>)['Content-Type']).toBe('multipart/form-data');
    }
  });

  it('requests blob responses for PDF endpoints', async () => {
    const api = createApiClient({ baseURL: 'https://api.test/api' });
    const { adapter, seen } = stubAdapter();
    api.client.defaults.adapter = adapter;

    await api.ordinances.downloadPdf('o1');
    await api.sessions.downloadPdf('s1');

    expect(seen[0].responseType).toBe('blob');
    expect(seen[1].responseType).toBe('blob');
  });
});
