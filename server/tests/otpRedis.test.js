import { describe, expect, it, vi } from 'vitest';
import { consumeValueIfEqual } from '../utils/redis.js';

describe('atomic OTP consumption', () => {
  it('runs compare-and-delete in one Redis script and consumes only a matching code', async () => {
    const client = { eval: vi.fn().mockResolvedValue(1) };

    await expect(consumeValueIfEqual('otp:+639123456789', 'otp', '123456', client)).resolves.toBe(true);

    const [script, keyCount, key, field, code] = client.eval.mock.calls[0];
    expect(keyCount).toBe(1);
    expect(key).toBe('otp:+639123456789');
    expect(field).toBe('otp');
    expect(code).toBe('123456');
    expect(script.indexOf("redis.call('GET'")).toBeLessThan(script.indexOf('cjson.decode'));
    expect(script.indexOf("~= ARGV[2]")).toBeLessThan(script.indexOf("redis.call('DEL'"));
  });

  it('leaves the key intact when Redis reports a mismatch', async () => {
    const client = { eval: vi.fn().mockResolvedValue(0) };
    await expect(consumeValueIfEqual('otp:+639123456789', 'otp', 'wrong', client)).resolves.toBe(false);
    expect(client.eval).toHaveBeenCalledTimes(1);
  });
});
