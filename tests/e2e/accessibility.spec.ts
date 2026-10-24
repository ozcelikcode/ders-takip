import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import type { Page, TestInfo } from '@playwright/test';
import { test, expect, login, dailyPlanner, openMove, registerAccount } from './fixtures';

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
  if (['login', 'dashboard', 'pomodoro-settings', 'welcome-time', 'welcome-records'].includes(name)) {
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
      await page.goto('/forgot-password');
      await expect(page.getByLabel('E-posta Adresi')).toBeVisible();
      await scan(page, info, 'forgot-password');
      await page.goto(`/reset-password?token=${'a'.repeat(43)}`);
      await expect(page.getByLabel('Yeni Şifre', { exact: true })).toBeVisible();
      await scan(page, info, 'reset-password');
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
        // The loading screen has its own h1; wait for the page's heading inside main.
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
        await expect(
          page.getByRole('main').getByText(/yükleniyor/i),
        ).toHaveCount(0);
        await scan(page, info, route);
        if (route === 'dashboard') {
          await page.getByRole('button', { name: 'Sayfaya git', exact: true }).click();
          // Headless UI's dialog root has no size of its own; its search field shows the palette is open.
          await expect(page.getByRole('dialog', { name: 'Sayfaya git' }).getByRole('combobox')).toBeVisible();
          await scan(page, info, 'command-palette');
          await page.keyboard.press('Escape');
        }
        if (route === 'courses') {
          // Opening the tag manager saves nothing.
          await page.getByRole('button', { name: 'Etiketler', exact: true }).click();
          await expect(page.getByRole('heading', { name: 'Etiketlerim', exact: true })).toBeVisible();
          await scan(page, info, 'tag-manager');
          await page.keyboard.press('Escape');
        }
        if (route === 'profile') {
          await page
            .getByRole('button', { name: 'Düzenle', exact: true })
            .click();
          await page
            .getByRole('button', { name: 'Değiştir', exact: true })
            .click();
          // Clicking scrolls the page by an engine-dependent amount; content resting under
          // the sticky header would then read as an obscured target, so scan from the top.
          await page.evaluate(() => window.scrollTo(0, 0));
          await scan(page, info, 'profile-edit');
          await page.getByRole('button', { name: 'URL', exact: true }).click();
          await page.evaluate(() => window.scrollTo(0, 0));
          await scan(page, info, 'profile-image-url');
        }
        if (route === 'settings') {
          for (const [name, id] of [
            ['Görünüm', 'appearance'],
            ['Bölge', 'region'],
            ['Çalışma Tercihleri', 'study'],
            ['Bildirimler', 'notifications'],
            ['Takvim', 'calendar'],
          ] as const) {
            await page.getByRole('button', { name, exact: true }).click();
            await scan(page, info, `settings-${id}`);
            if (id === 'appearance') {
              // Opening the custom words editor saves nothing; it only shows the fields.
              await page.getByRole('radio', { name: /Özel kelimeler/ }).check();
              await expect(page.getByRole('group', { name: 'Ana kayıt' })).toBeVisible();
              await scan(page, info, 'settings-custom-terminology');
            }
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
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Yeni seans', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Her hafta tekrarla' }).check();
      await page.getByLabel('Bitiş tarihi (isteğe bağlı)').scrollIntoViewIfNeeded();
      await scan(page, info, 'routine-editor');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Rutinler', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Rutinler', exact: true }).last()).toBeVisible();
      await scan(page, info, 'routines');
    });
    test('welcome wizard steps', async ({ page }, info) => {
      test.setTimeout(120_000);
      page.setDefaultTimeout(15_000);
      await registerAccount(page, `welcome${theme}`);
      await page.getByRole('radio', { name: /Okul ve sınavlar/ }).check();
      for (const step of ['purpose', 'time', 'rhythm', 'records', 'summary']) {
        if (step === 'records') {
          await page.getByRole('button', { name: 'Matematik ekle' }).click();
          await page.getByRole('button', { name: 'Fizik ekle' }).click();
          await page.getByRole('button', { name: 'Ders ekle', exact: true }).click();
          await expect(page.getByLabel('Yeni ders')).toBeFocused();
        }
        await scan(page, info, `welcome-${step}`);
        if (step === 'records') await page.getByRole('button', { name: 'Eklemeyi bırak' }).click();
        if (step !== 'summary') await page.getByRole('button', { name: 'İleri' }).click();
      }
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
        // The loading screen has its own h1; wait for the page's heading inside main.
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
        await expect(
          page.getByRole('main').getByText(/yükleniyor/i),
        ).toHaveCount(0);
        await scan(page, info, route.replaceAll('/', '-'));
      }
      for (const [name, id] of [
        ['Güvenlik', 'security'],
        ['Kelimeler', 'terminology'],
        ['Bildirimler', 'notifications'],
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
