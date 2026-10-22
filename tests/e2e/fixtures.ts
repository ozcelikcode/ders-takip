import { test as base, expect, type Page } from '@playwright/test';
import { fork } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

interface Application {
  url: string;
  day: string;
}

export const test = base.extend<{
  application: Application;
  browserGuard: void;
}>({
  application: async ({ browserName }, use) => {
    const directory = await mkdtemp(
      path.join(tmpdir(), `study-tracker-e2e-${browserName}-`),
    );
    const child = fork(path.join(__dirname, 'server.cjs'), [directory], {
      env: { PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: 'test' },
      stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
    });
    // Never inherit .env, DB_PATH, a real account, or a caller-supplied base URL.
    try {
      const application = await new Promise<Application>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('E2E fixture startup timed out')),
          15_000,
        );
        child.once('error', reject);
        child.once('exit', () => {
          clearTimeout(timer);
          reject(new Error('E2E fixture exited before readiness'));
        });
        child.once('message', (value: unknown) => {
          clearTimeout(timer);
          if (
            !value ||
            typeof value !== 'object' ||
            !('url' in value) ||
            !('day' in value) ||
            typeof value.url !== 'string' ||
            typeof value.day !== 'string'
          ) {
            reject(new Error('Invalid E2E fixture readiness message'));
            return;
          }
          const url = new URL(value.url);
          if (
            url.hostname !== '127.0.0.1' ||
            url.protocol !== 'http:' ||
            !url.port
          ) {
            reject(new Error('E2E fixture must use its own loopback server'));
            return;
          }
          resolve({ url: value.url, day: value.day });
        });
      });
      await use(application);
    } finally {
      try {
        if (child.exitCode === null && child.signalCode === null) {
          const exited = once(child, 'exit');
          child.kill('SIGTERM');
          const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
          try {
            await exited;
          } finally {
            clearTimeout(timer);
          }
        }
        expect(
          child.exitCode,
          'Fixture shutdown and SQLite preservation checks',
        ).toBe(0);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    }
  },
  baseURL: async ({ application }, use) => {
    await use(application.url);
  },
  browserGuard: [
    async ({ context, application, browserName }, use) => {
      const errors: string[] = [];
      // WebKit reports a request cut off by navigation as an access-control failure, and
      // Playwright surfaces that console line as a page error. The app is same-origin, so
      // for its own URLs the line can only mean a cancelled request; anything else still fails.
      const host = new URL(application.url).host.replaceAll('.', '\\.');
      const cancelledRequest = new RegExp(`${host}/.* due to access control checks\\.$`);
      const ignored = (message: string) =>
        browserName === 'webkit' && cancelledRequest.test(message);
      context.on('page', (page) =>
        page.on('pageerror', (error) => {
          if (!ignored(error.message)) errors.push(error.message);
        }),
      );
      await context.route('**/*', (route) => {
        return new URL(route.request().url()).origin === application.url
          ? route.continue()
          : route.abort('blockedbyclient');
      });
      await use();
      expect(errors, 'Unexpected browser runtime errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function login(page: Page, email = 'owner@example.test') {
  await page.goto('/login');
  await page.getByLabel('E-posta Adresi').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Hesap menüsü' }).click();
  await page.getByRole('button', { name: 'Çıkış Yap', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function dailyPlanner(page: Page) {
  await page.goto('/planner');
  await page.getByRole('button', { name: 'Günlük', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Günlük Planlayıcı' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Movable session: işlemler' }),
  ).toBeVisible();
}

export async function openMove(page: Page, title = 'Movable session') {
  await page.getByRole('button', { name: `${title}: işlemler` }).click();
  await page.getByRole('button', { name: 'Saat ve süreyi değiştir' }).click();
  await expect(
    page.getByRole('heading', { name: 'Görevi Taşı', exact: true }),
  ).toBeVisible();
}

/** Registers a fresh account through the public form; new accounts land on the welcome wizard. */
export async function registerAccount(page: Page, username: string) {
  await page.goto('/register');
  await page.getByLabel('Ad', { exact: true }).fill('Yeni');
  await page.getByLabel('Soyad').fill('Kullanıcı');
  await page.getByLabel('Kullanıcı Adı').fill(username);
  await page.getByLabel('E-posta Adresi').fill(`${username}@example.test`);
  await page.getByLabel('Şifre', { exact: true }).fill('fixture-password-2026');
  await page.getByRole('button', { name: 'Kayıt Ol', exact: true }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hoş geldin, Yeni');
}
