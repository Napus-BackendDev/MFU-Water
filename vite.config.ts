import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { localApi } from './scripts/api-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
