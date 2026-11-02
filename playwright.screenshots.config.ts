import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// README screenshots: an isolated fixture site with demo data, never the real database.
export default defineConfig({
  ...base,
  testDir: './tests/screenshots',
  testMatch: '**/*.spec.ts',
  testIgnore: [],
  timeout: 180_000,
  outputDir: 'test-results/screenshots',
  reporter: [['list']],
  use: { ...base.use, locale: 'en-US', timezoneId: 'UTC' },
  projects: [{ name: 'screenshots', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } }],
});
