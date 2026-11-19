import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    globals: true,
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/components/ui/',
        'src/components/layouts/'
      ]
    }
  },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion', 'lucide-react', 'tailwind-merge', 'axios', 'zod'],
    alias: {
      '@ibosys/design-tokens': path.resolve(import.meta.dirname, '../packages/design-tokens/dist'),
      '@ibosys/ui': path.resolve(import.meta.dirname, '../packages/ui/dist'),
      '@ibosys/api': path.resolve(import.meta.dirname, '../packages/api/dist'),
    }
  }
});
