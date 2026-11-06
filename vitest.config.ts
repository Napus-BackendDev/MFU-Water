import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['e2e/**', '**/*.spec.ts', '.claude/**', 'node_modules/**', 'dist/**', '.nuxt/**', '.output/**'],
  },
})
