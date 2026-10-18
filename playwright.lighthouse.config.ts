import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: '**/lighthouse.spec.ts',
  testIgnore: [],
  timeout: 180_000,
  outputDir: 'lighthouse-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'lighthouse-report' }],
  ],
  projects: [{ name: 'lighthouse', use: { browserName: 'chromium' } }],
});
