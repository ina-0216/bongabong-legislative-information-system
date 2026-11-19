import { describe, expect, it, vi } from 'vitest';
const { assertFixtureSeedingAllowed, ensureSeedUser } = require('../utils/seedSafety');

describe('fixture seed safety', () => {
  it('blocks fixture scripts in production before database work', () => {
    expect(() => assertFixtureSeedingAllowed({ NODE_ENV: 'production' }))
      .toThrow('Fixture seed scripts are disabled in production.');
  });

  it('allows local and test environments', () => {
    expect(() => assertFixtureSeedingAllowed({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => assertFixtureSeedingAllowed({ NODE_ENV: 'test' })).not.toThrow();
  });

  it('preserves existing accounts without changing their credentials or status', async () => {
    const existing = { password: 'unchanged-hash', status: 'Deactivated' };
    const UserModel = {
      findOne: vi.fn().mockResolvedValue(existing),
      create: vi.fn(),
    };
    const hashPassword = vi.fn();

    const result = await ensureSeedUser(UserModel, { email: 'known@example.test', password: 'fixture' }, hashPassword);

    expect(result).toBe('preserved');
    expect(existing).toEqual({ password: 'unchanged-hash', status: 'Deactivated' });
    expect(UserModel.create).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it('hashes a fixture password only when creating a new development account', async () => {
    const UserModel = { findOne: vi.fn().mockResolvedValue(null), create: vi.fn() };
    const hashPassword = vi.fn().mockResolvedValue('hashed-fixture');

    const result = await ensureSeedUser(UserModel, { email: 'new@example.test', password: 'fixture' }, hashPassword);

    expect(result).toBe('created');
    expect(UserModel.create).toHaveBeenCalledWith({ email: 'new@example.test', password: 'hashed-fixture' });
  });
});
