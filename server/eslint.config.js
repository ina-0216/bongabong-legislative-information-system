const js = require('@eslint/js');
const globals = require('globals');

const vitestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  vi: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'uploads/**',
      'local-mongo-db/**',
      'coverage/**',
      '.munder-difflin/**',
      'patches/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      // Transitional baseline for pre-existing code. Keep these visible as
      // warnings so they can be paid down without blocking the first CI run.
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-useless-assignment': 'warn',
      'no-useless-catch': 'warn',
      'preserve-caught-error': 'warn',
      'no-prototype-builtins': 'warn',
      'no-empty': 'warn',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node, ...vitestGlobals },
    },
  },
];
