require('dotenv').config();

const requiredEnv = ['JWT_SECRET', 'MONGODB_URI'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[BOOT] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const validateProductionEmailConfiguration = (env = process.env) => {
  const provider = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (!provider) {
    return 'EMAIL_PROVIDER must be explicitly set to brevo, resend, smtp, or gmail in production.';
  }

  const credentialsByProvider = {
    brevo: ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL'],
    resend: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
    smtp: ['EMAIL_USER', 'EMAIL_PASS'],
    gmail: ['EMAIL_USER', 'EMAIL_PASS'],
  };
  const requiredCredentials = credentialsByProvider[provider];
  if (!requiredCredentials) {
    return `Unsupported EMAIL_PROVIDER "${provider}". Use brevo, resend, smtp, or gmail.`;
  }

  const missingCredentials = requiredCredentials.filter((key) => {
    const value = env[key];
    if (typeof value !== 'string') return true;
    return key === 'EMAIL_PASS' ? !value.replace(/\s+/g, '') : !value.trim();
  });
  if (missingCredentials.length) {
    return `Missing credentials for EMAIL_PROVIDER=${provider}: ${missingCredentials.join(', ')}.`;
  }

  return null;
};

// A short or placeholder JWT_SECRET lets anyone forge an admin token, so refuse
// to boot in production rather than signing tokens with it. Development keeps
// the permissive behaviour so a local checkout still runs.
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  const looksLikePlaceholder = /^(your|change|replace|default|example|secret|test)/i.test(secret);
  if (secret.length < 32 || looksLikePlaceholder) {
    console.error(
      '[BOOT] JWT_SECRET is too short or is still a placeholder. Generate one with:\n' +
        "        node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
    );
    process.exit(1);
  }
}

// Production-only environment requirements. In development these are optional
// so local checkouts and tests can run without every credential configured.
if (process.env.NODE_ENV === 'production') {
  const prodRequired = ['FRONTEND_URL', 'PORTAL_URL'];
  const prodMissing = prodRequired.filter((key) => !process.env[key]?.trim());
  if (prodMissing.length) {
    console.error(
      `[BOOT] Missing required production environment variables: ${prodMissing.join(', ')}`,
    );
    process.exit(1);
  }

  const emailConfigurationError = validateProductionEmailConfiguration(process.env);
  if (emailConfigurationError) {
    console.error(`[BOOT] ${emailConfigurationError}`);
    process.exit(1);
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME?.trim() || !process.env.CLOUDINARY_API_KEY?.trim() || !process.env.CLOUDINARY_API_SECRET?.trim()) {
    console.error(
      '[BOOT] Cloudinary credentials are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    );
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5001;
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { getDataSource, getDbStatus } = connectDB;

const app = express();
app.locals.validateProductionEmailConfiguration = validateProductionEmailConfiguration;

// Render forwards requests through one proxy. Trust that hop so
// express-rate-limit can use the client IP from X-Forwarded-For safely.
app.set('trust proxy', 1);

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration
const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...(process.env.NODE_ENV !== 'production' ? [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ] : []),
  process.env.FRONTEND_URL?.trim(),
  process.env.PORTAL_URL?.trim(),
  ...configuredCorsOrigins,
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ message: 'CORS policy: Not allowed by origin.' });
  }
  return next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Native apps and server-to-server clients may omit Origin. CORS only
    // controls browser access; route authentication still protects API data.
    if (!origin) {
      callback(null, false);
      return;
    }
    callback(null, allowedOrigins.includes(origin));
  },
  credentials: true
}));

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please wait 10 minutes.' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/public/send-otp', otpLimiter);
// The health endpoint needs high throughput for monitoring probes, so it
// only gets the general limiter max (600) rather than the auth (20) or
// OTP (10) limits applied elsewhere.
app.use('/api/health', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6000, // Generous enough for uptime-monitor probes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Health checks are temporarily too frequent. Please try again later.' }
}));

// Identify the configured database used by every API response.
app.use('/api/', (req, res, next) => {
  res.setHeader('X-Data-Source', getDataSource());
  next();
});

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/ordinances', require('./routes/ordinances'));

app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/committees', require('./routes/committees'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/sbmembers', require('./routes/sbmembers'));
app.use('/api/terms', require('./routes/terms'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/public', require('./routes/public'));

// Health-check dependencies. Production resolves the real mongoose/redis
// clients. Tests replace this object via `app.locals.healthDeps` to drive
// specific health states without requiring a live database or Redis.
app.locals.healthDeps = null;

const REDIS_HEALTH_TIMEOUT_MS = 2000;

// Redis backs OTP storage only, so a Redis outage must not make Render treat
// the entire API as unhealthy. Bound the ping so a black-holed connection
// cannot hold the health request open.
const pingRedisWithTimeout = async (ping) => {
  let timer;
  try {
    await Promise.race([
      ping(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Redis health check timed out')),
          REDIS_HEALTH_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

app.get('/api/health', async (req, res) => {
  const injected = app.locals.healthDeps;
  const checks = { api: 'ok', db: 'unknown', redis: 'unknown', cloudinary: 'unknown' };

  try {
    const readyState = injected
      ? injected.dbReadyState()
      : require('mongoose').connection.readyState;
    checks.db = readyState === 1 ? 'ok' : 'down';
  } catch { checks.db = 'down'; }

  const dbStatus = injected
    ? { source: 'configured', connectedTo: null }
    : getDbStatus();
  checks.dataSource = dbStatus.source;
  checks.connectedTo = dbStatus.connectedTo;

  try {
    const ping = injected
      ? injected.redisPing
      : () => require('./utils/redis').getRedisClient().ping();
    await pingRedisWithTimeout(ping);
    checks.redis = 'ok';
  } catch { checks.redis = 'down'; }

  checks.cloudinary = process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing';

  // MongoDB is critical; Redis is not. A Redis-only outage is reported as
  // degraded with HTTP 200 so Render does not restart the API while the rest
  // of the service (including document and admin routes) is still usable.
  const ready = checks.db === 'ok';
  const healthy = ready && checks.redis === 'ok';
  res.status(ready ? 200 : 503).json({
    status: healthy ? 'iBOSys API running' : 'degraded',
    timestamp: new Date(),
    checks,
  });
});



app.use('/api', require('./routes/system'));

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

const startServer = async () => {
  await connectDB();

  const cron = require('node-cron');
  const autoDeactivateExpiredTerms = require('./cron/termDeactivator');
  const cleanOldIds = require('./cron/idCleaner');

  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running daily midnight tasks...');
    try {
      await autoDeactivateExpiredTerms();
      console.log('[CRON] termDeactivator: done');
    } catch (err) {
      console.error('[CRON] termDeactivator failed:', err.message);
    }
    try {
      await cleanOldIds();
      console.log('[CRON] idCleaner: done');
    } catch (err) {
      console.error('[CRON] idCleaner failed:', err.message);
    }
  }, { timezone: 'Asia/Manila' });
  console.log('[CRON] Scheduled daily midnight tasks (Term Deactivator, ID Cleaner).');

  return app.listen(PORT, () => console.log(`iBOSys Server running on port ${PORT}`));
};

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`[BOOT] API startup failed because the configured MongoDB is unavailable: ${error.message}`);
    process.exit(1);
  });
}

module.exports = app;
