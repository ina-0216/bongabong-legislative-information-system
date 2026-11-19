import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AxiosAdapter } from 'axios';

type ApiModule = typeof import('../src/index');
const runtimeEnv = () =>
  (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const initialApiUrl = runtimeEnv()?.VITE_API_URL;

function capturingAdapter(seen: unknown[]) {
  return (async (config: unknown) => {
    seen.push(config);
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config } as never;
  }) as AxiosAdapter;
}

describe('memoized api clients', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    if (runtimeEnv()) delete runtimeEnv()!.VITE_API_URL;
  });

  afterEach(() => {
    if (runtimeEnv()) {
      if (initialApiUrl === undefined) delete runtimeEnv()!.VITE_API_URL;
      else runtimeEnv()!.VITE_API_URL = initialApiUrl;
    }
  });

  it('reuses one admin client instance', async () => {
    const mod: ApiModule = await import('../src/index');
    const first = mod.getAdminApiClient('https://api.test/api');
    const second = mod.getAdminApiClient();
    expect(second).toBe(first);
    expect(first.client.defaults.baseURL).toBe('https://api.test/api');
  });

  it('reads the bearer token from localStorage', async () => {
    localStorage.setItem('ibosys_token', 'stored-token');
    const mod: ApiModule = await import('../src/index');
    const api = mod.getAdminApiClient('https://api.test/api');

    const seen: any[] = [];
    api.client.defaults.adapter = capturingAdapter(seen);
    await api.users.getMe();

    expect(seen[0].headers.Authorization).toBe('Bearer stored-token');
  });

  it('omits the auth header when nothing is stored', async () => {
    const mod: ApiModule = await import('../src/index');
    const api = mod.getAdminApiClient('https://api.test/api');

    const seen: any[] = [];
    api.client.defaults.adapter = capturingAdapter(seen);
    await api.users.getMe();

    expect(seen[0].headers.Authorization).toBeUndefined();
  });

  it('re-reads localStorage on every request', async () => {
    localStorage.setItem('ibosys_token', 'first');
    const mod: ApiModule = await import('../src/index');
    const api = mod.getAdminApiClient('https://api.test/api');

    const seen: any[] = [];
    api.client.defaults.adapter = capturingAdapter(seen);
    await api.users.getMe();
    localStorage.setItem('ibosys_token', 'second');
    await api.users.getMe();

    expect(seen[0].headers.Authorization).toBe('Bearer first');
    expect(seen[1].headers.Authorization).toBe('Bearer second');
  });

  it('falls back to the local dev API origin', async () => {
    const mod: ApiModule = await import('../src/index');
    const api = mod.getAdminApiClient();
    expect(api.client.defaults.baseURL).toBe('http://localhost:5001/api');
  });

  it('reads the runtime URL in CommonJS-compatible environments', async () => {
    runtimeEnv()!.VITE_API_URL = 'https://runtime.test/api';
    const mod: ApiModule = await import('../src/index');

    expect(mod.getAdminApiClient().client.defaults.baseURL).toBe('https://runtime.test/api');
    expect(mod.getPublicApiClient().client.defaults.baseURL).toBe('https://runtime.test/api/public');
    expect(mod.mediaUrl('/uploads/photo.png')).toBe('https://runtime.test/uploads/photo.png');
  });

  it('uses an explicitly configured URL and clears cached singleton clients', async () => {
    const mod: ApiModule = await import('../src/index');
    const local = mod.getAdminApiClient('https://local.test/api');

    mod.configureApiBaseUrl('https://configured.test/api');

    expect(mod.getAdminApiClient()).not.toBe(local);
    expect(mod.getAdminApiClient().client.defaults.baseURL).toBe('https://configured.test/api');
    expect(mod.getPublicApiClient().client.defaults.baseURL).toBe('https://configured.test/api/public');
  });

  it('appends /public for the public client', async () => {
    const mod: ApiModule = await import('../src/index');
    const api = mod.getPublicApiClient('https://api.test/api');
    expect(api.client.defaults.baseURL).toBe('https://api.test/api/public');
  });

  it('does not double-append /public', async () => {
    const mod: ApiModule = await import('../src/index');
    const api = mod.getPublicApiClient('https://api.test/api/public');
    expect(api.client.defaults.baseURL).toBe('https://api.test/api/public');
  });

  it('never sends auth on the public client', async () => {
    localStorage.setItem('ibosys_token', 'stored-token');
    const mod: ApiModule = await import('../src/index');
    const api = mod.getPublicApiClient('https://api.test/api');

    const seen: any[] = [];
    api.client.defaults.adapter = capturingAdapter(seen);
    await api.public.getStats();

    expect(seen[0].headers.Authorization).toBeUndefined();
  });

  it('keeps the admin and public clients distinct', async () => {
    const mod: ApiModule = await import('../src/index');
    const admin = mod.getAdminApiClient('https://api.test/api');
    const publicClient = mod.getPublicApiClient('https://api.test/api');
    expect(publicClient).not.toBe(admin);
  });

  it('ignores a stale token cleared from storage', async () => {
    localStorage.setItem('ibosys_token', 'stored-token');
    const mod: ApiModule = await import('../src/index');
    const api = mod.getAdminApiClient('https://api.test/api');

    localStorage.removeItem('ibosys_token');
    const seen: any[] = [];
    api.client.defaults.adapter = capturingAdapter(seen);
    await api.users.getMe();

    expect(seen[0].headers.Authorization).toBeUndefined();
  });
});
