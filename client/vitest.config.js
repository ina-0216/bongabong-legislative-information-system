import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
        'src/components/layouts/',
        'src/components/features/'
      ]
    }
  },
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'axios', 'zod', 'tailwind-merge'],
    alias: {
      '@ibosys/design-tokens': path.resolve(__dirname, '../packages/design-tokens/dist'),
      '@ibosys/ui': path.resolve(__dirname, '../packages/ui/dist'),
      '@ibosys/api': path.resolve(__dirname, '../packages/api/dist'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, './node_modules/react/jsx-runtime'),
      'framer-motion': path.resolve(__dirname, './node_modules/framer-motion'),
      'lucide-react': path.resolve(__dirname, './node_modules/lucide-react'),
    },
  },
});
