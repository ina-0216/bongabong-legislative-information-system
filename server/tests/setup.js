import 'dotenv/config';

/**
 * Deterministic environment for the server test suite.
 *
 * Note: no vi.mock() calls belong here. server.js is CommonJS, so vitest's
 * module mocking does not intercept its require() calls — mocks declared here
 * silently do nothing. Tests drive external dependencies through the
 * `app.locals.healthDeps` seam instead.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_0123456789abcdef0123456789abcdef';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/ibosys_test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORTAL_URL = 'http://localhost:5174';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';