import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '../e2e/fixtures';
import { seedDemo } from './demo';

// Regenerates docs/screenshots for the README: `npm run docs:screenshots`.
// Everything runs against the isolated browser-test site; the demo account is created here.
const output = path.join(__dirname, '../../docs/screenshots');
const capture = async (page: Page, name: string) => {
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    // Let charts and the theme settle before the picture.
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(output, `${name}-${scheme}.png`) });
  }
};

test('README screenshots', async ({ page, request }) => {
  await mkdir(output, { recursive: true });
  const demo = await seedDemo(request);

  await page.goto('/login');
  await page.getByLabel('Email address').fill('maya@example.test');
  await page.getByLabel('Password', { exact: true }).fill(demo.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // A fresh load drops the "Signed in" notification from the picture.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Maya.');
  await expect(page.getByRole('figure').first()).toBeVisible();
  await capture(page, 'dashboard');

  await page.goto('/planner');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await capture(page, 'planner');

  await page.goto('/stats');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Statistics');
  await page.getByRole('button', { name: 'Last 30 days' }).click();
  await capture(page, 'statistics');

  await page.goto('/pomodoro');
  await expect(page.getByRole('timer')).toBeVisible();
  await capture(page, 'pomodoro');

  await page.goto(`/courses/${demo.courseId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Linear Algebra');
  await capture(page, 'record');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, Maya.');
  await capture(page, 'mobile-dashboard');
});
