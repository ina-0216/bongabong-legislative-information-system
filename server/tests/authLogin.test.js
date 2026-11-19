import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { login, forgotPassword } = require('../controllers/authController');

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const originalJwtSecret = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = 'auth-login-test-secret-with-sufficient-length';
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

describe('login temporary credentials', () => {
  it('accepts a temporary password pasted with surrounding whitespace', async () => {
    const password = 'Ibosys@Abc_123-XYZ';
    const user = {
      _id: 'temporary-user-id',
      name: 'Temporary User',
      email: 'temporary@example.com',
      role: 'Secretary',
      status: 'Active',
      mustChangePassword: true,
      password: await bcrypt.hash(password, 10),
    };
    vi.spyOn(User, 'findOne').mockResolvedValue(user);
    const response = makeResponse();
    const next = vi.fn();

    await login({ body: { email: user.email, password: ` \n${password}\t ` } }, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.body.user.mustChangePassword).toBe(true);
    expect(response.body.token).toEqual(expect.any(String));
  });

  it('continues to compare permanent passwords exactly', async () => {
    const password = 'Permanent@123Password';
    const user = {
      _id: 'permanent-user-id',
      email: 'permanent@example.com',
      status: 'Active',
      mustChangePassword: false,
      password: await bcrypt.hash(password, 10),
    };
    vi.spyOn(User, 'findOne').mockResolvedValue(user);
    const response = makeResponse();
    const next = vi.fn();

    await login({ body: { email: user.email, password: ` ${password} ` } }, response, next);

    expect(response.statusCode).toBe(401);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid credentials' }));
  });
});

describe('forgot-password account privacy', () => {
  const requestReset = async ({ user, email = 'STAFF@example.com', deliver = vi.fn().mockResolvedValue(true) }) => {
    vi.spyOn(User, 'findOne').mockResolvedValue(user);
    const response = makeResponse();
    const next = vi.fn();

    await forgotPassword({
      body: { email },
      app: { locals: { sendPasswordResetEmail: deliver } },
    }, response, next);

    expect(next).not.toHaveBeenCalled();
    return { response, deliver };
  };

  it('returns the same accepted response for unknown and inactive accounts', async () => {
    const unknown = await requestReset({ user: null });
    const inactive = await requestReset({ user: { email: 'staff@example.com', status: 'Pending' } });

    expect(unknown.response.statusCode).toBe(202);
    expect(inactive.response.statusCode).toBe(unknown.response.statusCode);
    expect(inactive.response.body).toEqual(unknown.response.body);
    expect(unknown.deliver).not.toHaveBeenCalled();
    expect(inactive.deliver).not.toHaveBeenCalled();
    expect(User.findOne).toHaveBeenCalledWith({ email: 'staff@example.com' });
  });

  it('sends a reset link and stores only the hashed token for active accounts', async () => {
    const user = {
      email: 'staff@example.com',
      name: 'Staff Member',
      status: 'Active',
      save: vi.fn().mockResolvedValue(undefined),
    };
    const { response, deliver } = await requestReset({ user });

    expect(response.statusCode).toBe(202);
    expect(response.body).toEqual({ message: 'Password reset link sent to your email.' });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][0]).toBe(user.email);
    expect(deliver.mock.calls[0][2]).toMatch(/reset-password\/[a-f0-9]{64}/);
    expect(user.resetPasswordToken).toMatch(/^[a-f0-9]{64}$/);
    expect(user.resetPasswordExpires).toBeGreaterThan(Date.now());
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it('returns the generic response if email delivery fails', async () => {
    const user = {
      email: 'staff@example.com',
      name: 'Staff Member',
      status: 'Active',
      save: vi.fn(),
    };
    const deliver = vi.fn().mockRejectedValue(new Error('provider details must stay private'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { response } = await requestReset({ user, deliver });

    expect(response.statusCode).toBe(202);
    expect(response.body).toEqual({ message: 'Password reset link sent to your email.' });
    expect(user.save).not.toHaveBeenCalled();
  });
});
