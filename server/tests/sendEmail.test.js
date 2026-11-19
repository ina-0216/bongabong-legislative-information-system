import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import sendEmail from '../utils/sendEmail.js';

/**
 * Regression coverage for the nodemailer 9 -> 10 major bump.
 *
 * sendEmail.js is CommonJS, so vi.mock('nodemailer') cannot intercept its
 * require(). The transport factory is therefore injected through the
 * documented `options.createTransport` seam instead of a module mock.
 */
const ORIGINAL_ENV = {
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
};

const clearCredentials = () => {
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.EMAIL_PROVIDER;
  delete process.env.BREVO_API_KEY;
  delete process.env.BREVO_SENDER_EMAIL;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
};

const setCredentials = () => {
  clearCredentials();
  process.env.EMAIL_USER = 'sender@example.com';
  process.env.EMAIL_PASS = 'app-password';
  process.env.EMAIL_PROVIDER = 'smtp';
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.restoreAllMocks();
});

describe('sendEmail mock mode', () => {
  beforeEach(() => {
    clearCredentials();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('resolves true and warns when SMTP credentials are absent', async () => {
    const createTransport = vi.fn();

    await expect(sendEmail('user@example.com', 'Subject', 'Body', { createTransport }))
      .resolves.toBe(true);
  });

  it('does not construct a transport in mock mode', async () => {
    const createTransport = vi.fn();

    await sendEmail('user@example.com', 'Subject', 'Body', { createTransport });

    expect(createTransport).not.toHaveBeenCalled();
  });

  it('warns explicitly about the missing configuration', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await sendEmail('user@example.com', 'Subject', 'Body', { createTransport: vi.fn() });

    const output = spy.mock.calls.flat().join('\n');
    expect(output).toContain('MOCK EMAIL SENT');
    expect(output).toContain('user@example.com');
    expect(output).toMatch(/EMAIL_USER and EMAIL_PASS are not set/);
  });

  it('treats a partially configured pair (user without pass) as mock mode', async () => {
    process.env.EMAIL_USER = 'sender@example.com';
    delete process.env.EMAIL_PASS;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const createTransport = vi.fn();

    await expect(sendEmail('user@example.com', 'Subject', 'Body', { createTransport }))
      .resolves.toBe(true);
    expect(createTransport).not.toHaveBeenCalled();
  });
});

describe('sendEmail real transport', () => {
  beforeEach(() => {
    setCredentials();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('builds a Gmail transport with the configured credentials', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg-1' });
    const createTransport = vi.fn().mockReturnValue({ sendMail });

    await sendEmail('user@example.com', 'Subject', 'Body', { createTransport });

    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      auth: { user: 'sender@example.com', pass: 'app-password' },
    });
  });

  it('sends the message with a B-LIS sender address', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg-2' });
    const createTransport = vi.fn().mockReturnValue({ sendMail });

    await expect(sendEmail('user@example.com', 'Password Reset', 'Reset link', { createTransport }))
      .resolves.toBe(true);

    expect(sendMail).toHaveBeenCalledWith({
      from: '"B-LIS Admin" <sender@example.com>',
      to: 'user@example.com',
      subject: 'Password Reset',
      text: 'Reset link',
    });
  });

  it('still resolves true and logs the message id on success', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg-3' });
    const createTransport = vi.fn().mockReturnValue({ sendMail });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(sendEmail('user@example.com', 'Subject', 'Body', { createTransport }))
      .resolves.toBe(true);

    expect(log.mock.calls.flat().join('\n')).toContain('msg-3');
  });

  it('sends an invitation through the configured Brevo API', async () => {
    clearCredentials();
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.BREVO_API_KEY = 'brevo-test-key';
    process.env.BREVO_SENDER_EMAIL = 'admin@bongabong.gov.ph';
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messageId: 'brevo-message-1' }),
    });

    await expect(sendEmail('new.user@example.com', 'Welcome to B-LIS', 'Invitation details', { fetch }))
      .resolves.toBe(true);

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'api-key': 'brevo-test-key' }),
      body: JSON.stringify({
        sender: { name: 'B-LIS Admin', email: 'admin@bongabong.gov.ph' },
        to: [{ email: 'new.user@example.com' }],
        subject: 'Welcome to B-LIS',
        textContent: 'Invitation details',
      }),
    }));
  });

  it('allows consultation verification to explicitly use Brevo when another provider is selected globally', async () => {
    clearCredentials();
    process.env.EMAIL_PROVIDER = 'resend';
    process.env.BREVO_API_KEY = 'brevo-test-key';
    process.env.BREVO_SENDER_EMAIL = 'admin@bongabong.gov.ph';
    process.env.RESEND_API_KEY = 'resend-test-key';
    process.env.RESEND_FROM_EMAIL = 'admin@bongabong.gov.ph';
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ messageId: 'brevo-code-1' }) });

    await expect(sendEmail('resident@example.com', 'Verify email', 'Code: 123456', { provider: 'brevo', fetch }))
      .resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith('https://api.brevo.com/v3/smtp/email', expect.any(Object));
  });

  it('throws a sanitized error when the transport rejects', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('535 auth failed: secret-token-leak'));
    const createTransport = vi.fn().mockReturnValue({ sendMail });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendEmail('user@example.com', 'Subject', 'Body', { createTransport }))
      .rejects.toThrow('Failed to send email. Please check server email configuration.');

    // The upstream detail must be logged server-side but never surfaced to callers.
    expect(errorSpy.mock.calls.flat().join('\n')).toContain('secret-token-leak');
  });

  it('surfaces a sanitized error when transport construction throws', async () => {
    const createTransport = vi.fn().mockImplementation(() => {
      throw new Error('bad credentials');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(sendEmail('user@example.com', 'Subject', 'Body', { createTransport }))
      .rejects.toThrow('Failed to send email. Please check server email configuration.');
  });
});
