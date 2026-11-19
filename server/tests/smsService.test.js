import { afterEach, describe, expect, it, vi } from 'vitest';

import { SEMAPHORE_OTP_URL, sendSemaphoreOtp, sendTextBeeOtp, TEXTBEE_DEFAULT_BASE_URL } from '../services/smsService.js';

const originalApiKey = process.env.SEMAPHORE_API_KEY;
const originalSenderName = process.env.SEMAPHORE_SENDERNAME;
const originalTextBeeApiKey = process.env.TEXTBEE_API_KEY;
const originalTextBeeDeviceId = process.env.TEXTBEE_DEVICE_ID;
const originalTextBeeBaseUrl = process.env.TEXTBEE_BASE_URL;

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.SEMAPHORE_API_KEY;
  else process.env.SEMAPHORE_API_KEY = originalApiKey;
  if (originalSenderName === undefined) delete process.env.SEMAPHORE_SENDERNAME;
  else process.env.SEMAPHORE_SENDERNAME = originalSenderName;
  if (originalTextBeeApiKey === undefined) delete process.env.TEXTBEE_API_KEY;
  else process.env.TEXTBEE_API_KEY = originalTextBeeApiKey;
  if (originalTextBeeDeviceId === undefined) delete process.env.TEXTBEE_DEVICE_ID;
  else process.env.TEXTBEE_DEVICE_ID = originalTextBeeDeviceId;
  if (originalTextBeeBaseUrl === undefined) delete process.env.TEXTBEE_BASE_URL;
  else process.env.TEXTBEE_BASE_URL = originalTextBeeBaseUrl;
  vi.restoreAllMocks();
});

describe('sendSemaphoreOtp', () => {
  it('refuses to report a sent OTP when provider credentials are missing', async () => {
    delete process.env.SEMAPHORE_API_KEY;
    await expect(sendSemaphoreOtp({ number: '09123456789', code: '123456' }))
      .rejects.toMatchObject({ code: 'SMS_NOT_CONFIGURED' });
  });

  it('posts the OTP request and accepts a queued message', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';
    process.env.SEMAPHORE_SENDERNAME = 'iBOSys';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ status: 'Queued', message_id: 12, code: 123456 }],
    });

    await expect(sendSemaphoreOtp(
      { number: '09123456789', code: '123456' },
      { fetchImpl },
    )).resolves.toMatchObject({ status: 'Queued', message_id: 12 });

    expect(fetchImpl).toHaveBeenCalledWith(SEMAPHORE_OTP_URL, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: expect.stringContaining('number=09123456789'),
    }));
    expect(fetchImpl.mock.calls[0][1].body).toContain('apikey=test-api-key');
    expect(fetchImpl.mock.calls[0][1].body).toContain('sendername=iBOSys');
    expect(fetchImpl.mock.calls[0][1].body).toContain('code=123456');
  });

  it('rejects provider failures and mismatched OTP responses', async () => {
    process.env.SEMAPHORE_API_KEY = 'test-api-key';
    const failed = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ status: 'Failed', code: 123456 }],
    });
    const mismatched = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ status: 'Queued', code: 654321 }],
    });

    await expect(sendSemaphoreOtp({ number: '09123456789', code: '123456' }, { fetchImpl: failed }))
      .rejects.toThrow(/did not accept/i);
    await expect(sendSemaphoreOtp({ number: '09123456789', code: '123456' }, { fetchImpl: mismatched }))
      .rejects.toThrow(/did not accept/i);
  });
});

describe('sendTextBeeOtp', () => {
  it('refuses to send when the TextBee API key is missing', async () => {
    delete process.env.TEXTBEE_API_KEY;
    await expect(sendTextBeeOtp({ number: '09123456789', code: '123456' }))
      .rejects.toMatchObject({ code: 'SMS_NOT_CONFIGURED' });
  });

  it('sends a five-minute OTP to TextBee in E.164 format and accepts its queued response', async () => {
    process.env.TEXTBEE_API_KEY = 'test-textbee-key';
    process.env.TEXTBEE_DEVICE_ID = 'test-device-id';
    delete process.env.TEXTBEE_BASE_URL;
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { success: true, message: 'SMS added to queue for processing', smsBatchId: 'batch-1' },
      }),
    });

    await expect(sendTextBeeOtp(
      { number: '09123456789', code: '123456' },
      { fetchImpl },
    )).resolves.toMatchObject({ success: true, smsBatchId: 'batch-1' });

    expect(fetchImpl).toHaveBeenCalledWith(`${TEXTBEE_DEFAULT_BASE_URL}/gateway/send-sms`, expect.objectContaining({
      method: 'POST',
      headers: {
        'x-api-key': 'test-textbee-key',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: ['+639123456789'],
        message: 'Your B-LIS verification code is 123456. It expires in 5 minutes.',
        deviceId: 'test-device-id',
      }),
    }));
  });

  it('accepts TextBee immediate dispatch responses when the single message was pushed to the device', async () => {
    process.env.TEXTBEE_API_KEY = 'test-textbee-key';
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { successCount: 1, failureCount: 0 } }),
    });

    await expect(sendTextBeeOtp(
      { number: '09123456789', code: '123456' },
      { fetchImpl },
    )).resolves.toMatchObject({ successCount: 1, failureCount: 0 });
  });

  it('rejects failed, malformed, or non-Philippine destination requests', async () => {
    process.env.TEXTBEE_API_KEY = 'test-textbee-key';
    const failed = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const rejected = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { success: false } }) });
    const invalidJson = vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error('bad json'); } });

    await expect(sendTextBeeOtp({ number: '09123456789', code: '123456' }, { fetchImpl: failed }))
      .rejects.toThrow('TextBee request failed with status 401.');
    await expect(sendTextBeeOtp({ number: '09123456789', code: '123456' }, { fetchImpl: rejected }))
      .rejects.toThrow(/did not accept/i);
    await expect(sendTextBeeOtp({ number: '09123456789', code: '123456' }, { fetchImpl: invalidJson }))
      .rejects.toThrow(/invalid response/i);
    await expect(sendTextBeeOtp({ number: '5551234', code: '123456' }, { fetchImpl: rejected }))
      .rejects.toThrow(/valid Philippine mobile number/i);
  });

  it('uses a configured self-hosted API base URL and accepts an already international number', async () => {
    process.env.TEXTBEE_API_KEY = 'test-textbee-key';
    process.env.TEXTBEE_BASE_URL = 'https://textbee.example/api/v1/';
    delete process.env.TEXTBEE_DEVICE_ID;
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { success: true } }) });

    await sendTextBeeOtp({ number: '+639123456789', code: '123456' }, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith('https://textbee.example/api/v1/gateway/send-sms', expect.objectContaining({
      body: expect.stringContaining('"recipients":["+639123456789"]'),
    }));
  });
});
