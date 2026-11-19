import { describe, expect, it, vi } from 'vitest';

const { createPublicEmailVerificationService } = require('../services/publicEmailVerificationService');

const makeHarness = (overrides = {}) => {
  const data = new Map();
  const counters = new Map();
  const redis = {
    set: vi.fn(async (key, value, ...options) => {
      if (options.includes('NX') && data.has(key)) return null;
      data.set(key, JSON.parse(JSON.stringify(value)));
      return 'OK';
    }),
    incr: vi.fn(async (key) => {
      const next = (counters.get(key) || 0) + 1;
      counters.set(key, next);
      return next;
    }),
    expire: vi.fn(async () => 1),
    del: vi.fn(async (...keys) => keys.reduce((count, key) => count + Number(data.delete(key)), 0)),
  };
  const deliverEmail = overrides.deliverEmail || vi.fn().mockResolvedValue(true);
  const service = createPublicEmailVerificationService({
    getRedis: () => redis,
    storeWithExpiry: async (key, value) => data.set(key, JSON.parse(JSON.stringify(value))),
    consumeMatch: async (key, field, expected) => {
      const value = data.get(key);
      if (!value || String(value[field] ?? '') !== String(expected)) return false;
      data.delete(key);
      return true;
    },
    deliverEmail,
    makeCode: () => '482913',
    makeToken: () => 'signed-in-memory-token',
    getSecret: () => 'test-secret',
    ...overrides,
  });
  return { service, data, redis, deliverEmail };
};

describe('public consultation email verification', () => {
  it('sends a Brevo code, verifies it once, and issues a one-time submission token', async () => {
    const { service, data, deliverEmail } = makeHarness();

    await expect(service.sendCode(' Resident@Example.com ')).resolves.toEqual({ expiresInSeconds: 300 });
    expect(deliverEmail).toHaveBeenCalledWith(
      'resident@example.com',
      expect.stringContaining('Verify your email'),
      expect.stringContaining('482913'),
      { provider: 'brevo' },
    );
    const codeEntry = [...data.entries()].find(([key]) => key.startsWith('public-email-verification-code:'));
    expect(codeEntry?.[1].codeHash).not.toBe('482913');

    const verified = await service.verifyCode('resident@example.com', '482913');
    expect(verified).toEqual({ verificationToken: 'signed-in-memory-token', expiresInSeconds: 600 });
    await expect(service.consumeVerificationToken('RESIDENT@example.com', verified.verificationToken)).resolves.toBe(true);
    await expect(service.consumeVerificationToken('resident@example.com', verified.verificationToken)).resolves.toBe(false);
  });

  it('keeps an incorrect code usable until success, then limits repeated guessing', async () => {
    const { service } = makeHarness();
    await service.sendCode('resident@example.com');

    await expect(service.verifyCode('resident@example.com', '000000')).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.verifyCode('resident@example.com', '482913')).resolves.toMatchObject({ verificationToken: expect.any(String) });

    const second = makeHarness();
    await second.service.sendCode('resident@example.com');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(second.service.verifyCode('resident@example.com', '000000')).rejects.toMatchObject({ statusCode: 400 });
    }
    await expect(second.service.verifyCode('resident@example.com', '482913')).rejects.toMatchObject({ statusCode: 429 });
  });

  it('applies a per-email resend cooldown and clears it when delivery fails', async () => {
    const { service, redis } = makeHarness();
    await service.sendCode('resident@example.com');
    await expect(service.sendCode('resident@example.com')).rejects.toMatchObject({ statusCode: 429 });
    expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('cooldown:'), '1', 'EX', 60, 'NX');

    const failed = makeHarness({ deliverEmail: vi.fn().mockRejectedValue(new Error('provider failure')) });
    await expect(failed.service.sendCode('resident@example.com')).rejects.toThrow('provider failure');
    expect(failed.redis.del).toHaveBeenCalledWith(expect.stringContaining('cooldown:'));
  });
});
