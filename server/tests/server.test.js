import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import supertest from 'supertest';
import { PDFDocument } from 'pdf-lib';

import app from '../server.js';
const errorHandler = require('../middleware/errorHandler');
const { validatePdfHeaderBuffer } = require('../controllers/systemController');

const request = supertest(app);

/**
 * Drive the /api/health endpoint through its documented injection seam
 * (`app.locals.healthDeps`) instead of module mocking.
 *
 * This suite must NOT require a running MongoDB or Redis: server.js is
 * CommonJS, so vitest's vi.mock() cannot intercept its require() calls. The
 * only reliable hermetic seam is app.locals.
 */
const setHealthDeps = ({
  dbReadyState = 1,
  redisPing = async () => 'PONG',
} = {}) => {
  app.locals.healthDeps = {
    dbReadyState: () => dbReadyState,
    redisPing,
  };
};

beforeEach(() => {
  setHealthDeps();
});

afterEach(() => {
  app.locals.healthDeps = null;
  vi.restoreAllMocks();
});

describe('Health Check Endpoint', () => {
  it('handles requests forwarded by Render without rate-limit proxy errors', async () => {
    const res = await request
      .get('/api/health')
      .set('X-Forwarded-For', '203.0.113.42');

    expect(res.status).toBe(200);
  });

  it('returns 200 with full check structure when db and redis are healthy', async () => {
    const res = await request.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('iBOSys API running');
    expect(res.body.checks).toHaveProperty('api', 'ok');
    expect(res.body.checks).toHaveProperty('db', 'ok');
    expect(res.body.checks).toHaveProperty('redis', 'ok');
    expect(res.body.checks).toHaveProperty('cloudinary');
  });

  it('reports cloudinary as configured when the env var is present', async () => {
    const res = await request.get('/api/health');
    expect(res.body.checks.cloudinary).toBe('configured');
  });

  it('returns 503 and db=down when the database is disconnected', async () => {
    setHealthDeps({ dbReadyState: 0 });

    const res = await request.get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('down');
  });

  it('treats connecting-but-not-open states as down', async () => {
    setHealthDeps({ dbReadyState: 2 });

    const res = await request.get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.checks.db).toBe('down');
  });

  it('returns 200 and redis=down when only redis is unavailable', async () => {
    setHealthDeps({
      redisPing: async () => {
        throw new Error('redis unavailable');
      },
    });

    const res = await request.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('ok');
    expect(res.body.checks.redis).toBe('down');
  });

  it('returns 200 and redis=down when the redis ping times out', async () => {
    setHealthDeps({ redisPing: () => new Promise(() => {}) });

    const res = await request.get('/api/health').timeout(5000);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('ok');
    expect(res.body.checks.redis).toBe('down');
  }, 10000);

  it('returns 503 when both dependencies are down', async () => {
    setHealthDeps({
      dbReadyState: 0,
      redisPing: async () => {
        throw new Error('redis unavailable');
      },
    });

    const res = await request.get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.checks.db).toBe('down');
    expect(res.body.checks.redis).toBe('down');
  });
});

describe('Health Check Default Dependency Path', () => {
  // The production path resolves the real mongoose/redis clients instead of the
  // injected seam. Releasing the client afterwards keeps the suite from holding
  // an open ioredis handle.
  afterAll(async () => {
    const { closeRedis } = await import('../utils/redis.js');
    await closeRedis();
  });

  it('uses real dependencies and reports degraded without a live database', async () => {
    app.locals.healthDeps = null;

    const res = await request.get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks).toHaveProperty('api', 'ok');
    // mongoose is never connected under NODE_ENV=test, so readyState is 0.
    expect(res.body.checks.db).toBe('down');
    expect(res.body.checks).toHaveProperty('redis');
    expect(res.body.checks).toHaveProperty('cloudinary');
  }, 20000);
});

describe('Configured database reporting', () => {
  it('reports the configured data source when connected normally', async () => {
    setHealthDeps();
    const res = await request.get('/api/health');

    expect(res.body.checks.dataSource).toBe('configured');
    expect(res.body).not.toHaveProperty('warning');
  });

  it('reports the configured source and a degraded status when MongoDB is disconnected', async () => {
    setHealthDeps({ dbReadyState: 0 });
    const res = await request.get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.db).toBe('down');
    expect(res.body.checks.dataSource).toBe('configured');
  });

  it('exposes the data source on every api response', async () => {
    setHealthDeps({ dbReadyState: 0 });
    const res = await request.get('/api/health');

    // Identify the configured database without requiring a separate health request.
    expect(res.headers['x-data-source']).toBe('configured');
  });

  it('reports the configured database in the db module', async () => {
    const db = await import('../config/db.js');
    expect(db.getDataSource()).toBe('configured');
    expect(db.getDbStatus()).toEqual({ source: 'configured', connectedTo: null });
  });
});

describe('PDF header settings routes', () => {
  const createPdf = async (pageCount) => {
    const document = await PDFDocument.create();
    for (let index = 0; index < pageCount; index++) document.addPage();
    return Buffer.from(await document.save());
  };

  it('accepts a valid one-page PDF header', async () => {
    const document = await validatePdfHeaderBuffer(await createPdf(1));
    expect(document.getPageCount()).toBe(1);
  });

  it('rejects invalid and multi-page PDF headers', async () => {
    await expect(validatePdfHeaderBuffer(Buffer.from('not a PDF')))
      .rejects.toThrow('Choose a valid PDF header file.');
    await expect(validatePdfHeaderBuffer(await createPdf(2)))
      .rejects.toThrow('The PDF header must contain exactly one page.');
  });

  it('routes the documented GET endpoint through authentication and keeps the legacy URL', async () => {
    const documented = await request.get('/api/system/pdf-header');
    const legacy = await request.get('/api/pdf-header');

    expect(documented.status).toBe(401);
    expect(legacy.status).toBe(401);
  });

  it('routes the documented PUT endpoint through authentication', async () => {
    const response = await request.put('/api/system/pdf-header');

    expect(response.status).toBe(401);
  });
});


describe('CORS Policy', () => {
  it('allows requests from an allowed origin', async () => {
    const res = await request.get('/api/health').set('Origin', 'http://localhost:5173');

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(500);
  });

  it('rejects requests from an unauthorized origin', async () => {
    const res = await request.get('/api/health').set('Origin', 'https://evil.com');

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/CORS policy/i);
  });

  it('allows origin-less native requests to reach normal route authentication', async () => {
    const res = await request.get('/api/users');

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token/i);
  });
});

describe('Production email configuration', () => {
  const validate = (environment) => app.locals.validateProductionEmailConfiguration(environment);

  it('requires an explicit supported provider', () => {
    expect(validate({})).toMatch(/EMAIL_PROVIDER must be explicitly set/i);
    expect(validate({ EMAIL_PROVIDER: 'unsupported' })).toMatch(/Unsupported EMAIL_PROVIDER/i);
  });

  it('requires credentials for the selected provider even when another provider is configured', () => {
    expect(validate({
      EMAIL_PROVIDER: 'brevo',
      RESEND_API_KEY: 'resend-key',
      RESEND_FROM_EMAIL: 'sender@example.com',
    })).toMatch(/BREVO_API_KEY, BREVO_SENDER_EMAIL/);
  });

  it.each([
    [{ EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'key', BREVO_SENDER_EMAIL: 'sender@example.com' }],
    [{ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key', RESEND_FROM_EMAIL: 'sender@example.com' }],
    [{ EMAIL_PROVIDER: 'smtp', EMAIL_USER: 'sender@example.com', EMAIL_PASS: 'password' }],
    [{ EMAIL_PROVIDER: 'gmail', EMAIL_USER: 'sender@example.com', EMAIL_PASS: 'password' }],
  ])('accepts complete credentials for the selected provider', (environment) => {
    expect(validate(environment)).toBeNull();
  });
});

describe('Public route identifier validation', () => {
  it.each([
    ['/api/public/documents/not-an-object-id'],
    ['/api/public/documents/not-an-object-id/pdf'],
    ['/api/public/minutes/not-an-object-id'],
    ['/api/public/news/not-an-object-id'],
    ['/api/public/consult/not-an-object-id/public'],
    ['/api/public/members?termId=not-an-object-id'],
    ['/api/public/committees?termId=not-an-object-id'],
  ])('returns 400 before data access for %s', async (path) => {
    const res = await request.get(path);

    expect(res.status).toBe(400);
  });
});

describe('404 Handler', () => {
  it('returns 404 for an unknown route', async () => {
    const res = await request.get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('Auth Protected Routes', () => {
  it('returns 401 for a protected route without a token', async () => {
    const res = await request.get('/api/users');
    expect(res.status).toBe(401);
  });
});

describe('Public consultation upload bounds', () => {
  const guestSubmissionUrl = '/api/public/consult/0123456789abcdef01234567/guest';

  it('rejects multipart requests with more fields than the parser allows', async () => {
    let upload = request.post(guestSubmissionUrl);
    for (let index = 0; index < 11; index += 1) {
      upload = upload.field(`field${index}`, 'value');
    }

    const response = await upload;

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('The upload contains too many form fields.');
  });

  it('rate limits repeated unauthenticated guest uploads before parsing them', async () => {
    let response;
    for (let attempt = 0; attempt < 31; attempt += 1) {
      response = await request
        .post(guestSubmissionUrl)
        .set('X-Forwarded-For', '198.51.100.31');
    }

    expect(response.status).toBe(429);
    expect(response.body.message).toMatch(/too many consultation submissions/i);
  });
});

describe('Production error response privacy', () => {
  let originalNodeEnv;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  const runErrorHandler = (error, initialStatus = 200, originalUrl = '') => {
    const response = {
      statusCode: initialStatus,
      body: undefined,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    errorHandler(error, { originalUrl }, response, vi.fn());
    return response;
  };

  it('hides unexpected internal error messages and stacks', () => {
    const response = runErrorHandler(new Error('Mongo connection details are private'));

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Internal Server Error');
    expect(response.body).not.toHaveProperty('stack');
  });

  it('keeps deliberate safe upstream errors actionable', () => {
    const response = runErrorHandler(Object.assign(new Error('Protected attachment service is unavailable.'), { statusCode: 502 }));

    expect(response.statusCode).toBe(502);
    expect(response.body.message).toBe('Protected attachment service is unavailable.');
  });

  const uploadLimitCases = [
    {
      label: 'ordinance PDFs',
      url: '/api/ordinances/0123456789abcdef01234567',
      field: 'pdf',
      message: 'Ordinance PDF files must be 100 MB or smaller.',
    },
    {
      label: 'PDF/DOCX extraction files',
      url: '/api/ordinances/extract-text',
      field: 'file',
      message: 'PDF files must be 100 MB or smaller; DOCX files must be 15 MB or smaller.',
    },
    {
      label: 'announcement covers',
      url: '/api/announcements',
      field: 'coverImage',
      message: 'Announcement cover images must be 50 MB or smaller.',
    },
    {
      label: 'announcement gallery images',
      url: '/api/announcements/0123456789abcdef01234567',
      field: 'galleryImages',
      message: 'Announcement gallery images must be 8 MB each or smaller.',
    },
    {
      label: 'ordinary profile photos',
      url: '/api/users/0123456789abcdef01234567/avatar',
      field: 'avatar',
      message: 'Photo uploads must be 25 MB or smaller.',
    },
    {
      label: 'PDF header files',
      url: '/api/pdf-header',
      field: 'header',
      message: 'PDF header files must be 10 MB or smaller.',
    },
    {
      label: 'unknown uploads',
      url: '/api/unknown-upload',
      field: 'file',
      message: 'The uploaded file exceeds the allowed size limit.',
    },
  ];

  for (const { label, url, field, message } of uploadLimitCases) {
    it(`reports the correct size limit for ${label}`, () => {
      const error = Object.assign(new Error('File too large'), {
        code: 'LIMIT_FILE_SIZE',
        field,
      });
      const response = runErrorHandler(error, 200, url);

      expect(response.statusCode).toBe(413);
      expect(response.body.message).toBe(message);
    });
  }
});
