import type { Page } from '@playwright/test';
import { test, expect, login } from './fixtures';

// Interface words in Turkish always carry at least one of these letters somewhere on a page;
// the browser-test fixture's own data is English, so any match on an English site is a gap.
const turkishLetters = /[çğıöşüÇĞİÖŞÜ]/;
// Each language option is named in its own language.
const languageNames = new Set(['Türkçe']);
const phrases = (value: unknown, found = new Set<string>()): Set<string> => {
  if (typeof value === 'string') found.add(value);
  else if (value && typeof value === 'object') for (const entry of Object.values(value)) phrases(entry, found);
  return found;
};
// The catalogs are frontend modules; the test runner loads them as they are, outside the e2e type project.
const catalog = async (language: 'en' | 'tr'): Promise<unknown> =>
  ((await import(`../../frontend/src/i18n/${language}.ts`)) as Record<string, unknown>)[language];
let turkishPhrases = new Set<string>();
test.beforeAll(async () => {
  const englishPhrases = phrases(await catalog('en'));
  // Fixed Turkish catalog phrases that English never uses: they catch Turkish words without Turkish letters too.
  turkishPhrases = new Set([...phrases(await catalog('tr'))].filter((phrase) => !englishPhrases.has(phrase)));
});

/** Visible text plus the names screen readers and tooltips use, line by line. */
const interfaceText = (page: Page) =>
  page.evaluate(() => {
    const attributes = Array.from(document.querySelectorAll('[aria-label],[title],[placeholder],[alt]')).flatMap((element) =>
      ['aria-label', 'title', 'placeholder', 'alt'].map((name) => element.getAttribute(name) ?? ''),
    );
    return [document.title, ...document.body.innerText.split('\n'), ...attributes].map((line) => line.trim()).filter(Boolean);
  });

const expectEnglish = async (page: Page, where: string) => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  const turkish = (await interfaceText(page)).filter(
    (line) => (turkishLetters.test(line) && !languageNames.has(line)) || turkishPhrases.has(line),
  );
  expect(turkish, `Turkish interface text on ${where}`).toEqual([]);
};

test.describe('English site', () => {
  test('shows every page, tab and the default site identity in English', async ({ page }) => {
    expect(turkishPhrases.size, 'Turkish catalog phrases loaded').toBeGreaterThan(500);
    await login(page, 'manager@example.test');
    await page.goto('/admin/settings');
    await page.getByLabel('Site dili').selectOption('en');
    await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Site settings');

    for (const section of ['General', 'Security', 'Appearance', 'Words', 'Notifications', 'Backup and reset', 'Activity log']) {
      await page.getByRole('navigation', { name: 'Site settings sections' }).getByRole('button', { name: section }).click();
      await expectEnglish(page, `site settings › ${section}`);
    }
    for (const path of ['/admin', '/admin/users', '/admin/courses', '/admin/system']) {
      await page.goto(path);
      await expectEnglish(page, path);
    }
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expectEnglish(page, '/login');
    for (const path of ['/register', '/forgot-password']) {
      await page.goto(path);
      await expectEnglish(page, path);
    }

    await page.goto('/login');
    await page.getByLabel('Email address').fill('owner@example.test');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const path of ['/dashboard', '/courses', '/planner', '/stats', '/pomodoro', '/search?q=session']) {
      await page.goto(path);
      await expectEnglish(page, path);
    }
    await page.goto('/planner');
    await page.getByRole('button', { name: 'Daily', exact: true }).click();
    await expectEnglish(page, '/planner daily');
    await page.getByRole('button', { name: 'Log past study' }).click();
    await expect(page.getByRole('dialog').getByRole('heading').first()).toBeVisible();
    await expectEnglish(page, 'log past study dialog');
    await page.keyboard.press('Escape');
    await page.goto('/courses');
    await page.getByRole('button', { name: 'My categories' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'My categories' })).toBeVisible();
    await expectEnglish(page, 'my categories dialog');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog').getByRole('combobox').first()).toBeVisible();
    await expectEnglish(page, 'command palette');
    await page.keyboard.press('Escape');
    await page.goto('/settings');
    for (const tab of ['Account', 'Appearance', 'Region', 'Study preferences', 'Notifications', 'Calendar']) {
      await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: tab }).click();
      await expectEnglish(page, `settings › ${tab}`);
    }
  });
});
