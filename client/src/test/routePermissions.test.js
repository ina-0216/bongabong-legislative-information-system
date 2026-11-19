import { describe, expect, it } from 'vitest';
import { canAccessPath, getPostLoginPath } from '../utils/routePermissions';

describe('post-login route access', () => {
  it('falls back to the dashboard when a saved destination is outside the user role', () => {
    expect(getPostLoginPath({ role: 'Secretary' }, '/users')).toBe('/dashboard');
    expect(getPostLoginPath({ role: 'SB Member' }, '/sessions')).toBe('/dashboard');
  });

  it('keeps a saved destination the account is allowed to view', () => {
    expect(getPostLoginPath({ role: 'Secretary' }, '/ordinances/123')).toBe('/ordinances/123');
    expect(getPostLoginPath({ role: 'System Admin' }, '/users?page=2')).toBe('/users?page=2');
  });

  it('sends temporary-password accounts to the forced password change first', () => {
    expect(getPostLoginPath(
      { role: 'Secretary', mustChangePassword: true },
      '/users'
    )).toBe('/profile?force=1');
  });

  it('discards a stale forced-password destination after the password is changed', () => {
    expect(getPostLoginPath(
      { role: 'Secretary', mustChangePassword: false },
      '/profile?force=1'
    )).toBe('/dashboard');
  });

  it('uses the same role rules as the protected routes for representative paths', () => {
    expect(canAccessPath('Vice Mayor', '/dashboard')).toBe(true);
    expect(canAccessPath('Vice Mayor', '/ordinances/123/edit')).toBe(false);
    expect(canAccessPath('System Admin', '/ordinances/123/edit')).toBe(true);
  });
});
