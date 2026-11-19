import { afterEach, describe, expect, it, vi } from 'vitest';
const User = require('../models/User');
const { createUser, getUsers } = require('../controllers/userController');

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const restoreEnv = {};
for (const key of ['NODE_ENV', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'EMAIL_PROVIDER', 'EMAIL_USER', 'EMAIL_PASS']) {
  restoreEnv[key] = process.env[key];
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries(restoreEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('user management controller', () => {
  it('creates an active account after invitation delivery and normalizes email', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    const user = {
      _id: 'user-1', name: 'Jane Doe', email: 'jane.doe@bongabong.gov.ph', role: 'Secretary', status: 'Pending',
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(User, 'create').mockResolvedValue(user);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = makeResponse();

    await createUser({
      user: { role: 'System Admin' },
      body: {
        firstName: 'Jane', lastName: 'Doe', email: ' Jane.Doe@Bongabong.gov.ph ',
        role: 'Secretary', contactNumber: '09123456789',
      },
    }, res, vi.fn());

    expect(User.findOne).toHaveBeenCalledWith({ email: 'jane.doe@bongabong.gov.ph' });
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'jane.doe@bongabong.gov.ph', status: 'Pending', mustChangePassword: true,
    }));
    expect(user.status).toBe('Active');
    expect(user.save).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(201);
    expect(res.body.invitationSent).toBe(true);
    expect(res.body).not.toHaveProperty('temporaryPassword');
  });

  it('keeps the account pending and offers a retry when invitation delivery fails', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    delete process.env.EMAIL_PROVIDER;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    const user = {
      _id: 'user-2', name: 'Jane Doe', email: 'jane@example.org', role: 'Secretary', status: 'Pending',
    };
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    vi.spyOn(User, 'create').mockResolvedValue(user);
    vi.spyOn(User, 'deleteOne');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = makeResponse();

    await createUser({
      user: { role: 'System Admin' },
      body: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.org', role: 'Secretary' },
    }, res, vi.fn());

    expect(res.statusCode).toBe(202);
    expect(user.status).toBe('Pending');
    expect(res.body.invitationSent).toBe(false);
    expect(res.body.message).toMatch(/retry the invitation/i);
    expect(User.deleteOne).not.toHaveBeenCalled();
  });

  it('includes email in the escaped user search filter', async () => {
    const query = {
      select: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.spyOn(User, 'find').mockReturnValue(query);
    vi.spyOn(User, 'countDocuments').mockResolvedValue(0);
    const res = makeResponse();

    await getUsers({ query: { search: 'bongabong.gov.ph', page: '1', limit: '20' } }, res, vi.fn());

    const filter = User.find.mock.calls[0][0];
    expect(filter.$or).toEqual(expect.arrayContaining([
      { email: { $regex: 'bongabong\\.gov\\.ph', $options: 'i' } },
    ]));
  });
});
