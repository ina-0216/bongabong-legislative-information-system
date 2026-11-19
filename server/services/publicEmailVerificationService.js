const { randomInt, randomBytes, createHash, createHmac } = require('node:crypto');
const sendEmail = require('../utils/sendEmail');
const { getRedisClient, setWithExpiry, consumeValueIfEqual } = require('../utils/redis');

const CODE_TTL_SECONDS = 5 * 60;
const EMAIL_SEND_COOLDOWN_SECONDS = 60;
const CODE_MAX_ATTEMPTS = 5;
const VERIFICATION_TOKEN_TTL_SECONDS = 10 * 60;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const emailKey = (email) => createHash('sha256').update(normalizeEmail(email)).digest('hex');
const hashCode = (email, code, secret) => createHmac('sha256', secret)
  .update(`${normalizeEmail(email)}:${code}`)
  .digest('hex');
const hashToken = (email, token) => createHash('sha256')
  .update(`${normalizeEmail(email)}:${token}`)
  .digest('hex');

const createPublicEmailVerificationService = ({
  getRedis = getRedisClient,
  storeWithExpiry = setWithExpiry,
  consumeMatch = consumeValueIfEqual,
  deliverEmail = sendEmail,
  makeCode = () => randomInt(100000, 1000000).toString(),
  makeToken = () => randomBytes(32).toString('base64url'),
  getSecret = () => process.env.JWT_SECRET,
} = {}) => {
  const sendCode = async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const digest = emailKey(normalizedEmail);
    const client = getRedis();
    const cooldownKey = `public-email-verification-cooldown:${digest}`;
    const acquired = await client.set(cooldownKey, '1', 'EX', EMAIL_SEND_COOLDOWN_SECONDS, 'NX');
    if (acquired !== 'OK') {
      const error = new Error('Please wait before requesting another email code.');
      error.statusCode = 429;
      throw error;
    }

    const code = makeCode();
    const secret = getSecret();
    if (!secret) {
      await client.del(cooldownKey);
      const error = new Error('Email verification is not configured.');
      error.statusCode = 503;
      throw error;
    }

    try {
      await deliverEmail(
        normalizedEmail,
        'Verify your email for B-LIS public consultation',
        `Your B-LIS verification code is ${code}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
        { provider: 'brevo' },
      );
      await storeWithExpiry(
        `public-email-verification-code:${digest}`,
        { codeHash: hashCode(normalizedEmail, code, secret) },
        CODE_TTL_SECONDS,
      );
      return { expiresInSeconds: CODE_TTL_SECONDS };
    } catch (error) {
      await client.del(cooldownKey).catch(() => {});
      throw error;
    }
  };

  const verifyCode = async (email, code) => {
    const normalizedEmail = normalizeEmail(email);
    const digest = emailKey(normalizedEmail);
    const client = getRedis();
    const attemptsKey = `public-email-verification-attempts:${digest}`;
    const attempts = await client.incr(attemptsKey);
    if (attempts === 1) await client.expire(attemptsKey, CODE_TTL_SECONDS);
    if (attempts > CODE_MAX_ATTEMPTS) {
      await Promise.all([
        client.del(attemptsKey),
        client.del(`public-email-verification-code:${digest}`),
      ]);
      const error = new Error('Too many incorrect codes. Request a new email verification code.');
      error.statusCode = 429;
      throw error;
    }

    const secret = getSecret();
    if (!secret) {
      const error = new Error('Email verification is not configured.');
      error.statusCode = 503;
      throw error;
    }

    const codeKey = `public-email-verification-code:${digest}`;
    const matches = await consumeMatch(
      codeKey,
      'codeHash',
      hashCode(normalizedEmail, code, secret),
      client,
    );
    if (!matches) {
      const error = new Error('The email verification code is invalid or expired.');
      error.statusCode = 400;
      throw error;
    }

    await client.del(attemptsKey);
    const token = makeToken();
    await storeWithExpiry(
      `public-email-verification-token:${digest}:${hashToken(normalizedEmail, token)}`,
      { verified: true },
      VERIFICATION_TOKEN_TTL_SECONDS,
    );
    return { verificationToken: token, expiresInSeconds: VERIFICATION_TOKEN_TTL_SECONDS };
  };

  const consumeVerificationToken = async (email, token) => {
    const normalizedEmail = normalizeEmail(email);
    const digest = emailKey(normalizedEmail);
    return consumeMatch(
      `public-email-verification-token:${digest}:${hashToken(normalizedEmail, token)}`,
      'verified',
      'true',
    );
  };

  return { sendCode, verifyCode, consumeVerificationToken };
};

const publicEmailVerificationService = createPublicEmailVerificationService();

module.exports = {
  CODE_TTL_SECONDS,
  VERIFICATION_TOKEN_TTL_SECONDS,
  normalizeEmail,
  createPublicEmailVerificationService,
  ...publicEmailVerificationService,
};
