import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Main entry currently measures 506.65 kB raw / 155.41 kB gzip. The
  // companion build check enforces both a 520 kB raw and 165 kB gzip budget.
  build: {
    chunkSizeWarningLimit: 520,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    // Shared package dist files are loaded through filesystem aliases. Resolve
    // shared runtime dependencies from the app install in clean environments.
    dedupe: ['react', 'react-dom', 'axios', 'zod', 'lucide-react', 'framer-motion'],
    alias: {
      '@ibosys/design-tokens': path.resolve(__dirname, '../packages/design-tokens/dist'),
      '@ibosys/ui': path.resolve(__dirname, '../packages/ui/dist'),
      '@ibosys/api': path.resolve(__dirname, '../packages/api/dist'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: '0.0.0.0'
  }
})
