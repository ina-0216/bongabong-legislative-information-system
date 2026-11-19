import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  // Bundle tailwind-merge with the shared package: consumers load this dist
  // through a filesystem alias, so their own node_modules are not searched
  // relative to packages/ui/dist in clean CI and deploy environments.
  noExternal: ['tailwind-merge'],
  external: ['react', 'react-dom', 'tailwindcss', 'lucide-react', 'framer-motion'],
  injectStyle: false,
});
