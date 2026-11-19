import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'node:path'

// Bundle composition report. Opt in with `npm run analyze`; never part of a
// normal build, so it cannot slow or leak an HTML report into production.
const analyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    react(),
    ...(analyze
      ? [visualizer({
          filename: 'dist/bundle-report.html',
          gzipSize: true,
          brotliSize: true,
          open: false,
        })]
      : []),
  ],
  server: {
    port: 5174,
    strictPort: false,
    host: true
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'framer-motion', 'lucide-react', 'tailwind-merge', 'axios', 'zod'],
    alias: {
      '@ibosys/design-tokens': path.resolve(import.meta.dirname, '../packages/design-tokens/dist'),
      '@ibosys/ui': path.resolve(import.meta.dirname, '../packages/ui/dist'),
      '@ibosys/api': path.resolve(import.meta.dirname, '../packages/api/dist'),
    }
  },
  build: {
    // Framework code changes far less often than portal code, so it is split
    // into its own long-lived chunks. Without this, every app-code deploy
    // invalidates a single monolithic entry chunk and returning visitors
    // re-download React on every release.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'vendor-react', test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/ },
            { name: 'vendor-router', test: /node_modules[\\/](react-router|react-router-dom)[\\/]/ },
            { name: 'vendor-motion', test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/ },
            { name: 'vendor-data', test: /node_modules[\\/](axios|zod|date-fns)[\\/]/ },
            { name: 'vendor-charts', test: /node_modules[\\/](recharts|d3-|victory-)/ },
          ],
        },
      },
    },
  },
})
