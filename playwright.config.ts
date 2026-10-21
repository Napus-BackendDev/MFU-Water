import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://127.0.0.1:4173'
const hasExternalBaseURL = Boolean(process.env.PLAYWRIGHT_TEST_BASE_URL)

export default defineConfig({
  testDir: './e2e',
  use: { baseURL },
  webServer: hasExternalBaseURL ? undefined : {
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
})
