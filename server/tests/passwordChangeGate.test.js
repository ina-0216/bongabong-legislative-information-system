import { describe, expect, it } from 'vitest';
import { isAllowedDuringPasswordChange } from '../middleware/auth.js';

const id = '64c000000000000000000001';

describe('temporary-password API gate', () => {
  it('allows only own profile lookup and own password change while required', () => {
    expect(isAllowedDuringPasswordChange({ method: 'GET', originalUrl: '/api/users/me' }, id)).toBe(true);
    expect(isAllowedDuringPasswordChange({ method: 'PUT', originalUrl: `/api/users/${id}/password` }, id)).toBe(true);
    expect(isAllowedDuringPasswordChange({ method: 'PUT', originalUrl: `/api/users/${id}/password?source=profile` }, id)).toBe(true);
    expect(isAllowedDuringPasswordChange({ method: 'GET', originalUrl: '/api/ordinances' }, id)).toBe(false);
    expect(isAllowedDuringPasswordChange({ method: 'PUT', originalUrl: `/api/users/${id}/profile` }, id)).toBe(false);
    expect(isAllowedDuringPasswordChange({ method: 'PUT', originalUrl: '/api/users/64c000000000000000000002/password' }, id)).toBe(false);
  });
});
