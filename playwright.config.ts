import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/setup.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: {
    command: 'yarn dev --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/healthz',
    reuseExistingServer: false,
    env: {
      NODE_ENV: 'test',
      AUTH_MODE: 'mock',
      ENABLE_DEMO_APPS: 'true',
      DATABASE_PATH: './data/e2e.db',
      SESSION_SECRET: 'e2e-only-session-secret-at-least-32-chars'
    }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, grep: /@mobile/ }
  ]
});
