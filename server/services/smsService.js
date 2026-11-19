const SEMAPHORE_OTP_URL = 'https://api.semaphore.co/api/v4/otp';
const PHILSMS_SEND_URL = 'https://app.philsms.com/api/v3/sms/send';
const TEXTBEE_DEFAULT_BASE_URL = 'https://api.textbee.dev/api/v1';

const getOtpDeliveryMode = () => {
  const mode = String(process.env.SMS_OTP_MODE || '').trim().toLowerCase();
  if (mode === 'test') {
    if (!['development', 'test'].includes(process.env.NODE_ENV)) {
      const error = new Error('Test OTP mode is available only in development and test environments.');
      error.code = 'OTP_TEST_MODE_FORBIDDEN';
      throw error;
    }
    return 'test';
  }
  if (mode === 'semaphore') return 'semaphore';
  if (mode === 'philsms') return 'philsms';
  if (mode === 'textbee') return 'textbee';

  const error = new Error('SMS_OTP_MODE must be set to test, philsms, semaphore, or textbee.');
  error.code = 'SMS_MODE_NOT_CONFIGURED';
  throw error;
};

const sendSemaphoreOtp = async ({ number, code }, dependencies = {}) => {
  const apiKey = process.env.SEMAPHORE_API_KEY;
  if (!apiKey) {
    const error = new Error('SMS delivery is not configured.');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }

  const fetchImpl = dependencies.fetchImpl || global.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('SMS delivery is unavailable.');

  const form = new URLSearchParams({
    apikey: apiKey,
    number,
    message: 'Your B-LIS verification code is {otp}. It expires in 5 minutes.',
    code,
  });
  if (process.env.SEMAPHORE_SENDERNAME) {
    form.set('sendername', process.env.SEMAPHORE_SENDERNAME);
  }

  const response = await fetchImpl(SEMAPHORE_OTP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error('SMS provider request failed.');

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('SMS provider returned an invalid response.');
  }

  const messages = Array.isArray(result) ? result : [result];
  const acceptedStatuses = new Set(['queued', 'pending', 'sent', 'success']);
  const accepted = messages.length > 0 && messages.every((message) =>
    acceptedStatuses.has(String(message?.status || '').toLowerCase())
      && (!message?.code || String(message.code) === String(code)),
  );
  if (!accepted) throw new Error('SMS provider did not accept the verification message.');

  return messages[0];
};

const sendPhilSmsOtp = async ({ number, code }, dependencies = {}) => {
  const apiToken = process.env.PHILSMS_API_TOKEN;
  const senderId = process.env.PHILSMS_SENDER_ID;
  if (!apiToken || !senderId) {
    const error = new Error('PhilSMS delivery is not configured.');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }

  const fetchImpl = dependencies.fetchImpl || global.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('SMS delivery is unavailable.');

  const recipient = number.replace(/\D/g, '').replace(/^0/, '63');
  const response = await fetchImpl(PHILSMS_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipient,
      sender_id: senderId,
      type: 'plain',
      message: `Your B-LIS verification code is ${code}. It expires in 5 minutes.`,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error('SMS provider request failed.');

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('SMS provider returned an invalid response.');
  }

  if (String(result?.status || '').toLowerCase() !== 'success') {
    throw new Error('SMS provider did not accept the verification message.');
  }

  return result.data;
};

const toE164PhilippineNumber = (number) => {
  const value = String(number || '').trim();
  if (/^09\d{9}$/.test(value)) return `+63${value.slice(1)}`;
  if (/^\+639\d{9}$/.test(value)) return value;
  throw new Error('TextBee requires a valid Philippine mobile number.');
};

const sendTextBeeOtp = async ({ number, code }, dependencies = {}) => {
  const apiKey = process.env.TEXTBEE_API_KEY;
  if (!apiKey) {
    const error = new Error('TextBee delivery is not configured.');
    error.code = 'SMS_NOT_CONFIGURED';
    throw error;
  }

  const fetchImpl = dependencies.fetchImpl || global.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('SMS delivery is unavailable.');

  const baseUrl = String(process.env.TEXTBEE_BASE_URL || TEXTBEE_DEFAULT_BASE_URL).replace(/\/+$/, '');
  const deviceId = String(process.env.TEXTBEE_DEVICE_ID || '').trim();
  const response = await fetchImpl(`${baseUrl}/gateway/send-sms`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recipients: [toE164PhilippineNumber(number)],
      message: `Your B-LIS verification code is ${code}. It expires in 5 minutes.`,
      ...(deviceId ? { deviceId } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error(`TextBee request failed with status ${response.status}.`);

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('TextBee returned an invalid response.');
  }

  const data = result?.data || result;
  const queued = data?.success === true;
  const dispatchedImmediately = Number(data?.successCount) === 1 && Number(data?.failureCount || 0) === 0;
  if (!queued && !dispatchedImmediately) {
    throw new Error('TextBee did not accept the verification message.');
  }

  return data;
};

module.exports = {
  getOtpDeliveryMode,
  sendPhilSmsOtp,
  sendSemaphoreOtp,
  sendTextBeeOtp,
  SEMAPHORE_OTP_URL,
  PHILSMS_SEND_URL,
  TEXTBEE_DEFAULT_BASE_URL,
};
