import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect, login, dailyPlanner, openMove } from './fixtures';

async function scan(page: Page, info: TestInfo, name: string) {
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  if (['login', 'dashboard', 'pomodoro-settings'].includes(name)) {
    const screenshot = info.outputPath(`${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await info.attach(name, { path: screenshot, contentType: 'image/png' });
  }
  const result = await new AxeBuilder({ page })
    .options({ rules: { 'target-size': { enabled: true } } })
    .analyze();
  const report = info.outputPath(`axe-${name}.json`);
  await writeFile(report, JSON.stringify(result, null, 2));
  await info.attach(`axe-${name}`, {
    path: report,
    contentType: 'application/json',
  });
  expect
    .soft(
      result.violations.map(({ id, nodes }) => ({
        id,
        targets: nodes.map(({ target, failureSummary }) => ({
          target,
          failureSummary,
        })),
      })),
      name,
    )
    .toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Accessibility ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
    });
    test('public and student pages', async ({ page }, info) => {
      test.setTimeout(180_000);
      page.setDefaultTimeout(15_000);
      await page.goto('/login');
      await expect(page.getByLabel('E-posta Adresi')).toBeVisible();
      await scan(page, info, 'login');
      await page.goto('/register');
      await expect(
        page.getByRole('button', { name: 'Kayıt Ol', exact: true }),
      ).toBeVisible();
      await scan(page, info, 'register');
      await login(page);
      if (theme === 'dark')
        await expect(page.locator('html')).toHaveClass(/dark/);
      else await expect(page.locator('html')).not.toHaveClass(/dark/);
      for (const route of [
        'dashboard',
        'stats',
        'search',
        'courses',
        'pomodoro',
        'profile',
        'settings',
      ]) {
        await page.goto(`/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(
          page.getByRole('main').getByText(/yükleniyor/i),
        ).toHaveCount(0);
        await scan(page, info, route);
        if (route === 'profile') {
          await page
            .getByRole('button', { name: 'Düzenle', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Değiştir', exact: true })
            .click();
          await scan(page, info, 'profile-edit');
          await page.getByRole('button', { name: 'URL', exact: true }).click();
          await scan(page, info, 'profile-image-url');
        }
        if (route === 'settings') {
          for (const [name, id] of [
            ['Görünüm', 'appearance'],
            ['Bölge', 'region'],
            ['Çalışma Tercihleri', 'study'],
          ] as const) {
            await page.getByRole('button', { name, exact: true }).click();
            await scan(page, info, `settings-${id}`);
          }
        }
      }
    });
    test('planner and open session forms', async ({ page }, info) => {
      test.setTimeout(180_000);
      page.setDefaultTimeout(15_000);
      await login(page);
      await dailyPlanner(page);
      await scan(page, info, 'daily-planner');
      await openMove(page);
      await scan(page, info, 'move-session');
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'Movable session', exact: true })
        .click();
      await expect(page.getByLabel('Seans türü')).toBeVisible();
      await page.getByLabel('Seans türü').selectOption('pomodoro');
      await expect(
        page.getByText('Pomodoro Ayarları', { exact: true }),
      ).toBeVisible();
      await page.getByLabel('Süre (dakika)').scrollIntoViewIfNeeded();
      await scan(page, info, 'pomodoro-editor');
      await page.getByLabel('Döngü Sayısı').scrollIntoViewIfNeeded();
      await scan(page, info, 'pomodoro-settings');
    });
    test('admin pages and settings sections', async ({ page }, info) => {
      test.setTimeout(180_000);
      page.setDefaultTimeout(15_000);
      await login(page, 'manager@example.test');
      for (const route of [
        'admin',
        'admin/users',
        'admin/courses',
        'admin/settings',
      ]) {
        await page.goto(`/${route}`);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await expect(
          page.getByRole('main').getByText(/yükleniyor/i),
        ).toHaveCount(0);
        await scan(page, info, route.replaceAll('/', '-'));
      }
      for (const [name, id] of [
        ['Güvenlik', 'security'],
        ['Kelimeler', 'terminology'],
        ['Görünüm', 'appearance'],
        ['Yedekleme ve sıfırlama', 'backups'],
      ] as const) {
        await page
          .getByRole('navigation', { name: 'Site ayarı bölümleri' })
          .getByRole('button', { name, exact: true })
          .click();
        await scan(page, info, `admin-settings-${id}`);
      }
    });
  });
}
