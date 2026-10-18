import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  testIgnore: '**/lighthouse.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  // Active-window focus assertions must not compete with another browser window.
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    locale: 'tr-TR',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
