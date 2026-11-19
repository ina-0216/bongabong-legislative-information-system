import { describe, expect, it } from 'vitest';
const { getSafeDatabaseTarget } = require('../scripts/rollback');

describe('rollback connection target logging', () => {
  it('keeps credentials and query parameters out of the target label', () => {
    const uri = 'mongodb+srv://audit-user:very-secret@cluster.example/ibosys?authSource=admin&token=hidden';

    const target = getSafeDatabaseTarget(uri);

    expect(target).toBe('cluster.example/ibosys');
    expect(target).not.toContain('audit-user');
    expect(target).not.toContain('very-secret');
    expect(target).not.toContain('token');
  });

  it('uses a generic label for malformed connection strings', () => {
    expect(getSafeDatabaseTarget('not-a-uri-with-secrets')).toBe('configured database');
  });
});
