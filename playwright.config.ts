import { defineConfig } from '@playwright/test'

const E2E_DB = process.env.E2E_DATABASE_URL
    ?? 'postgresql://arsabil:arsabil_dev_pass@localhost:5432/arsabil_test'

export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/global-setup.ts',
    timeout: 60_000,
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'retain-on-failure',
    },
    webServer: {
        command: 'npm run dev:next',
        url: 'http://localhost:3000/api/health',
        timeout: 180_000,
        reuseExistingServer: false,
        env: {
            DATABASE_URL: E2E_DB,
            NEXTAUTH_URL: 'http://localhost:3000',
            NEXTAUTH_SECRET: 'e2e-test-secret-min-32-karakter-uzunlugunda',
        },
    },
})
