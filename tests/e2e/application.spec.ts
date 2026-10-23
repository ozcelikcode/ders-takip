import {
  test,
  expect,
  login,
  logout,
  dailyPlanner,
  openMove,
  registerAccount,
} from './fixtures';

test('restores cookie authentication on reload and isolates the next account', async ({
  page,
  context,
}) => {
  await login(page);
  await expect(
    page.getByText('Private completed session', { exact: true }),
  ).toBeVisible();
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.httpOnly && cookie.sameSite === 'Strict',
    ),
  ).toBe(true);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByText('Private completed session', { exact: true }),
  ).toBeVisible();
  await logout(page);
  await login(page, 'other@example.test');
  await expect(
    page.getByText('Private completed session', { exact: true }),
  ).toHaveCount(0);
  await page.goto('/planner');
  await expect(
    page.getByRole('heading', { name: 'Planlayıcı', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Movable session: işlemler' }),
  ).toHaveCount(0);
});

test('creates a session, changes its time and duration, and preserves it on reload', async ({
  page,
  application,
}) => {
  await login(page);
  await dailyPlanner(page);
  await page.getByRole('button', { name: 'Yeni seans', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Yeni Seans' });
  await editor.getByRole('button', { name: 'Özel', exact: true }).click();
  await editor
    .getByLabel('Özel Başlık *', { exact: true })
    .fill('Created browser session');
  await editor.getByLabel('Tarih', { exact: true }).fill(application.day);
  await editor.getByLabel('Saat', { exact: true }).fill('16:00');
  await editor.getByLabel('Süre (dakika) *', { exact: true }).fill('45');
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/study-sessions') &&
      response.request().method() === 'POST',
  );
  await editor.getByRole('button', { name: 'Oluştur', exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(editor).toHaveCount(0);
  await openMove(page, 'Created browser session');
  await page.getByLabel('Başlangıç saati', { exact: true }).fill('17:15');
  await page.getByLabel('Planlanan süre (dakika)', { exact: true }).fill('75');
  const saved = page.waitForResponse(
    (response) =>
      /\/api\/study-sessions\/\d+$/.test(response.url()) &&
      response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Taşı', exact: true }).click();
  const reply = await saved;
  expect(reply.status()).toBe(200);
  expect(reply.request().postDataJSON()).toMatchObject({
    expectedUpdatedAt: expect.any(String),
  });
  expect(await reply.json()).toMatchObject({
    data: { session: { duration: 75 } },
  });
  await expect(
    page.getByRole('button', { name: 'Created browser session: işlemler' }),
  ).toBeFocused();
  await page.reload();
  await page.getByRole('button', { name: 'Günlük', exact: true }).click();
  await openMove(page, 'Created browser session');
  await expect(page.getByLabel('Başlangıç saati', { exact: true })).toHaveValue(
    '17:15',
  );
  await expect(
    page.getByLabel('Planlanan süre (dakika)', { exact: true }),
  ).toHaveValue('75');
});

test('keeps a dirty move draft after a real two-tab version conflict and requires explicit retry', async ({
  page,
  context,
}) => {
  await login(page);
  await dailyPlanner(page);
  await openMove(page);
  await page.getByLabel('Başlangıç saati', { exact: true }).fill('15:30');
  await page.getByLabel('Planlanan süre (dakika)', { exact: true }).fill('75');
  const second = await context.newPage();
  await dailyPlanner(second);
  await openMove(second);
  await second.getByLabel('Başlangıç saati', { exact: true }).fill('14:00');
  const secondSaved = second.waitForResponse(
    (response) =>
      response.url().endsWith('/api/study-sessions/705') &&
      response.request().method() === 'PUT',
  );
  await second.getByRole('button', { name: 'Taşı', exact: true }).click();
  expect((await secondSaved).status()).toBe(200);
  await expect(second.getByRole('dialog')).toHaveCount(0);
  await page.bringToFront();
  const writes: number[] = [];
  page.on('response', (response) => {
    if (
      response.url().endsWith('/api/study-sessions/705') &&
      response.request().method() === 'PUT'
    )
      writes.push(response.status());
  });
  const rejected = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/study-sessions/705') &&
      response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Taşı', exact: true }).click();
  expect((await rejected).status()).toBe(409);
  await expect(
    page.getByText(/Değişiklik kaydedilemedi. Taslağınız korunuyor/),
  ).toBeVisible();
  await expect(page.getByLabel('Başlangıç saati', { exact: true })).toHaveValue(
    '15:30',
  );
  await expect(
    page.getByLabel('Planlanan süre (dakika)', { exact: true }),
  ).toHaveValue('75');
  expect(writes).toEqual([409]);
  const retried = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/study-sessions/705') &&
      response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: 'Taşı', exact: true }).click();
  const reply = await retried;
  expect(reply.status()).toBe(200);
  expect(await reply.json()).toMatchObject({
    data: { session: { duration: 75, notes: 'Preserve fixture notes' } },
  });
  expect(writes).toEqual([409, 200]);
  await expect(
    page.getByRole('button', { name: 'Movable session: işlemler' }),
  ).toBeFocused();
  await second.close();
});

test('keeps short card targets separate and supports keyboard creation and day-end focus', async ({
  page,
}, testInfo) => {
  await login(page);
  await dailyPlanner(page);
  const targets = [
    'First short session',
    'Second short session',
    'Cancelled overlay',
  ].map((title) => page.getByRole('button', { name: `${title}: işlemler` }));
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded();
    const rectangle = await target.boundingBox();
    expect(rectangle).not.toBeNull();
    expect(rectangle!.width).toBeGreaterThanOrEqual(24);
    expect(rectangle!.height).toBeGreaterThanOrEqual(24);
    await target.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Seans işlemleri', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(target).toBeFocused();
  }
  // Read all bounds again after horizontal scrolling to use one coordinate space.
  const bounds = await Promise.all(
    targets.map((target) => target.boundingBox()),
  );
  for (let i = 0; i < bounds.length; i++)
    for (let j = i + 1; j < bounds.length; j++) {
      const a = bounds[i]!;
      const b = bounds[j]!;
      expect(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
      ).toBe(true);
    }
  const slots = page.locator('button[aria-label$="seans ekle"][tabindex="0"]');
  await expect(slots).toHaveCount(1);
  await slots.focus();
  await page.keyboard.press('Home');
  await expect(
    page.getByRole('button', { name: /00:00 seans ekle$/ }),
  ).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const firstHour = page.getByRole('button', { name: /01:00 seans ekle$/ });
  await expect(firstHour).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Yeni Seans', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(firstHour).toBeFocused();
  const last = page.getByRole('button', {
    name: 'Last minute session: işlemler',
  });
  await last.press('Enter');
  await page.keyboard.press('Escape');
  await expect(last).toBeFocused();
  await testInfo.attach('day-end-focus', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('distinguishes notification failures from empty data and restores focus after reading', async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole('button', { name: 'Bildirimler, 1 okunmamış' }),
  ).toBeVisible();
  const completedRead = (url: URL) =>
    url.pathname === '/api/study-sessions' &&
    url.searchParams.get('status') === 'completed';
  await page.route(completedRead, (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { message: 'Injected read failure' },
      }),
    }),
  );
  await page.reload();
  const trigger = page.getByRole('button', {
    name: 'Bildirimler',
    exact: true,
  });
  await trigger.click();
  await expect(page.getByText('Bildirimler alınamadı.')).toBeVisible();
  await expect(
    page.getByText('Henüz bildirim yok', { exact: true }),
  ).toHaveCount(0);
  await page.unroute(completedRead);
  await page.getByRole('button', { name: 'Bildirimleri tekrar yükle' }).click();
  await expect(
    page.getByRole('button', { name: 'Görünenleri okundu işaretle' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Görünenleri okundu işaretle' })
    .click();
  await expect(
    page.getByRole('button', { name: 'Bildirimleri kapat' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('supports responsive navigation without page overflow and closes its mobile focus trap', async ({
  page,
  isMobile,
}) => {
  await login(page);
  const open = page.getByRole('button', { name: 'Menüyü aç' });
  if (isMobile) {
    await open.tap();
    const menu = page.getByRole('dialog', { name: 'Ana menü' });
    await expect(
      menu.getByRole('button', { name: 'Menüyü kapat' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.tap();
    await menu.getByRole('link', { name: 'Planlayıcı', exact: true }).tap();
    await expect(menu).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Günlük', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  } else {
    await page
      .getByRole('navigation', { name: 'Ana gezinme' })
      .getByRole('link', { name: 'Planlayıcı', exact: true })
      .click();
  }
  await expect(
    page.getByRole('heading', { name: 'Planlayıcı', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('finds a session by its notes and opens the planner on that day without exposing other accounts', async ({
  page,
}) => {
  await login(page);
  await page.goto('/search?q=Movable');
  const sessions = page.getByRole('region', { name: 'Seanslar' });
  const result = sessions.getByRole('link', { name: /Movable session/ });
  await expect(result).toBeVisible();
  await page.goto('/search?q=fixture%20notes');
  await expect(sessions.getByRole('link')).toHaveCount(6);
  await expect(sessions.getByText(/notlarda/).first()).toBeVisible();
  await page.goto('/search?q=Movable');
  await result.click();
  await expect(page).toHaveURL(/\/planner\?date=\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole('button', { name: /Movable session/ }).first()).toBeVisible();
  await logout(page);
  await login(page, 'other@example.test');
  await page.goto('/search?q=Movable');
  await expect(page.getByRole('region', { name: 'Seanslar' }).getByText('Eşleşme yok.')).toBeVisible();
});

test('lets an administrator hand over a one-time reset link that signs the user in with a new password', async ({
  page,
}) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'First Student için işlemler' }).click();
  await page.getByRole('menuitem', { name: 'Şifre sıfırlama bağlantısı' }).click();
  await page.getByRole('button', { name: 'Bağlantı oluştur' }).click();
  const field = page.getByLabel('Bağlantı', { exact: true });
  await expect(field).toHaveValue(/reset-password/);
  const url = await field.inputValue();
  expect(url).toMatch(/\/reset-password\?token=[\w-]{43}$/);
  await page.getByRole('button', { name: 'Kapat' }).click();
  await logout(page);
  await page.goto(new URL(url).pathname + new URL(url).search);
  await page.getByLabel('Yeni Şifre', { exact: true }).fill('fresh-fixture-password');
  await page.getByLabel('Yeni Şifre (Tekrar)').fill('fresh-fixture-password');
  await page.getByRole('button', { name: 'Şifreyi güncelle' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-posta Adresi').fill('owner@example.test');
  await page.getByLabel('Şifre', { exact: true }).fill('fresh-fixture-password');
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  // The link is single-use.
  await logout(page);
  await page.goto(new URL(url).pathname + new URL(url).search);
  await page.getByLabel('Yeni Şifre', { exact: true }).fill('another-fixture-password');
  await page.getByLabel('Yeni Şifre (Tekrar)').fill('another-fixture-password');
  await page.getByRole('button', { name: 'Şifreyi güncelle' }).click();
  await expect(page.getByRole('alert')).toContainText('Bağlantı geçersiz veya süresi dolmuş');
});

test('welcomes a new account with a setup that shapes its pages and can be restarted', async ({ page }) => {
  await registerAccount(page, 'newcomer');
  const next = () => page.getByRole('button', { name: 'İleri' }).click();
  const heading = page.getByRole('heading', { level: 1 });
  await page.getByRole('radio', { name: /Beceri ve hobiler/ }).check();
  await next();
  await expect(heading).toHaveText('Zamanını planlayalım');
  await expect(heading).toBeFocused();
  await page.getByRole('button', { name: '1 sa 30 dk' }).click();
  await expect(page.locator('p', { hasText: 'Haftalık hedef:' })).toContainText('10 sa 30 dk');
  await next();
  await page.getByRole('radio', { name: /Uzun odak/ }).check();
  await next();
  await expect(heading).toHaveText('İlk beceriler');
  await page.getByRole('button', { name: 'Gitar ekle' }).click();
  await page.getByRole('button', { name: 'Beceri ekle', exact: true }).click();
  await page.getByLabel('Yeni beceri').fill('İspanyolca');
  await page.getByLabel('Yeni beceri').press('Enter');
  await expect(page.getByRole('button', { name: 'İspanyolca kaldır' })).toBeVisible();
  await expect(heading).toHaveText('İlk beceriler');
  await next();
  await expect(page.getByText('Becerilerim: Gitar, İspanyolca')).toBeVisible();
  await page.getByRole('button', { name: 'Kurulumu bitir' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // The dashboard suggests next steps from the answers: plan today, then break a new record into parts.
  const recommendations = page.getByRole('region', { name: 'Öneriler' });
  await expect(recommendations.getByRole('heading', { level: 3 }).first()).toHaveText('Bugün için bir seans planla');
  await expect(recommendations.getByRole('heading', { name: 'Gitar için alıştırmalar ekle' })).toBeVisible();
  // A brand-new account is never told it is behind for days before it existed.
  await expect(recommendations.getByText('Bu hafta hedefin gerisindesin')).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath('dashboard-recommendations.png'), fullPage: true });

  // The account's own words and first records survive a reload; the wizard does not come back.
  await page.goto('/courses');
  await expect(heading).toHaveText('Beceriler');
  await expect(page.getByText('Gitar', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByText('İspanyolca', { exact: true })).toBeVisible();

  // The personal category from setup is the user's own to rename.
  await page.getByRole('button', { name: 'Kategorilerim' }).click();
  const categories = page.getByRole('dialog', { name: 'Kategorilerim' });
  await categories.getByRole('button', { name: 'Becerilerim kategorisini düzenle' }).click();
  const editor = page.getByRole('dialog', { name: 'Kategoriyi düzenle' });
  await editor.getByLabel('Kategori adı').fill('Müzik ve dil');
  await editor.getByRole('button', { name: 'Kaydet' }).click();
  await expect(categories.getByRole('button', { name: 'Müzik ve dil kategorisini düzenle' })).toBeVisible();
  await categories.getByRole('button', { name: 'Kategori yönetimini kapat' }).click();

  await page.goto('/settings');
  await page.getByRole('navigation', { name: 'Ayar bölümleri' }).getByRole('button', { name: 'Çalışma Tercihleri' }).click();
  await expect(page.getByLabel('Varsayılan Pomodoro Süresi (dk)')).toHaveValue('50');
  await page.getByRole('button', { name: 'Kurulumu yeniden başlat' }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByRole('button', { name: 'Şimdilik atla' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('lets an account download its data and delete itself with its password', async ({ page }) => {
  await registerAccount(page, 'leaving');
  await page.getByRole('button', { name: 'Şimdilik atla' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/profile');
  const data = page.getByRole('region', { name: 'Verilerin' });
  const download = page.waitForEvent('download');
  await data.getByRole('button', { name: 'İndir' }).click();
  expect((await download).suggestedFilename()).toMatch(/^hesap-verisi-\d{4}-\d{2}-\d{2}\.json$/);

  await data.getByRole('button', { name: 'Hesabı sil' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hesabı sil' });
  await dialog.getByLabel('Onay için şifren').fill('wrong-password');
  await dialog.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Şifre hatalı');
  await dialog.getByLabel('Onay için şifren').fill('fixture-password-2026');
  await dialog.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('E-posta Adresi').fill('leaving@example.test');
  await page.getByLabel('Şifre', { exact: true }).fill('fixture-password-2026');
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  // The account is gone: the server's sign-in error appears and the page stays on login.
  await expect(page.getByText('E-posta veya şifre hatalı')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('lets a user choose browser reminders and keeps the choice after a reload', async ({ page }) => {
  await login(page);
  await page.goto('/settings');
  await page.getByRole('navigation', { name: 'Ayar bölümleri' }).getByRole('button', { name: 'Bildirimler' }).click();
  await expect(page.getByRole('heading', { name: 'Bu tarayıcı' })).toBeVisible();
  // No SMTP in the fixture: email choices are not offered at all.
  await expect(page.getByLabel('E-posta ile')).toHaveCount(0);
  await page.getByLabel(/Tarayıcı bildirimi ile/).check();
  await page.getByLabel('Ne kadar önce').selectOption('15');
  await expect(page.getByRole('status').filter({ hasText: 'Tercihler hesabınızda saklanır' })).toBeVisible();
  await page.reload();
  await page.getByRole('navigation', { name: 'Ayar bölümleri' }).getByRole('button', { name: 'Bildirimler' }).click();
  await expect(page.getByLabel(/Tarayıcı bildirimi ile/)).toBeChecked();
  await expect(page.getByLabel('Ne kadar önce')).toHaveValue('15');
});

test('lets a user name records with their own word and keeps it after a reload', async ({ page }) => {
  await login(page);
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Özel kelimeler/ }).check();
  const course = page.getByRole('group', { name: 'Ana kayıt' });
  await course.getByLabel('Kelime').fill('kitap');
  await course.getByLabel('"-ı" hâli').fill('kitabı');
  await expect(course.getByText('Biçimler: kitap · kitabı · kitaba · kitabın · kitapta · kitaplar')).toBeVisible();
  await page.getByRole('button', { name: 'Kelimeleri kaydet' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tercihler hesabınızda saklanır' })).toBeVisible();
  await page.goto('/courses');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kitaplar');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kitaplar');
  await page.goto('/settings');
  await page.getByRole('radio', { name: /Site varsayılanı/ }).check();
  await expect(page.getByRole('status').filter({ hasText: 'Tercihler hesabınızda saklanır' })).toBeVisible();
  await page.goto('/courses');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projeler');
});

test('reads the weekly chart as a table of measured study, not as an application', async ({ page }) => {
  await login(page);
  const chart = page.getByRole('figure').filter({ has: page.getByRole('table', { name: /Günlük ölçülen çalışma/ }) });
  await expect(chart).toBeVisible();
  await expect(chart.getByRole('application')).toHaveCount(0);
  // Only the fixture's day with a completed session has measured study.
  const measured = chart.getByRole('cell').filter({ hasNotText: 'Çalışma yok' });
  await expect(measured).toHaveCount(1);
  await expect(measured).toHaveText(/^\d+ (dk|sa)/);
});

test('measures a Pomodoro session through pause, reload and completion and counts it on the dashboard', async ({
  page,
  application,
}) => {
  await login(page);
  await dailyPlanner(page);
  // Start within the hour so the session has not ended yet and can be started.
  const now = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  await page.getByRole('button', { name: 'Yeni seans', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Yeni Seans' });
  await editor.getByRole('button', { name: 'Özel', exact: true }).click();
  await editor.getByLabel('Özel Başlık *', { exact: true }).fill('Focused browser session');
  await editor.getByLabel('Seans türü *', { exact: true }).selectOption('pomodoro');
  await editor.getByLabel('Tarih', { exact: true }).fill(application.day);
  await editor.getByLabel('Saat', { exact: true }).fill(now);
  await editor.getByLabel('Süre (dakika) *', { exact: true }).fill('60');
  await editor.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await expect(editor).toHaveCount(0);

  await page.goto('/pomodoro');
  await expect(page.getByRole('button', { name: /Focused browser session/ })).toHaveAttribute('aria-pressed', 'true');
  const timer = page.getByRole('timer');
  await page.getByRole('button', { name: 'Sayacı başlat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sayacı duraklat', exact: true })).toBeVisible();
  await page.waitForTimeout(3_000);
  await page.getByRole('button', { name: 'Sayacı duraklat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sayacı başlat', exact: true })).toHaveText('Devam et');
  const paused = await timer.textContent();
  expect(paused).not.toContain('25:00');

  // The server owns the clock: a paused timer comes back paused with the same time left.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sayacı başlat', exact: true })).toHaveText('Devam et');
  await expect(timer).toHaveText(paused ?? '');

  await page.getByRole('button', { name: 'Sayacı başlat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sayacı duraklat', exact: true })).toBeVisible();
  await page.waitForTimeout(2_000);
  await page.getByRole('button', { name: 'Seansı tamamla', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Seans tamamlandı' })).toBeVisible();

  // The fixture's earlier session measured 300 seconds; only the time the timer ran is added.
  const stats = page.waitForResponse(
    (response) => response.url().includes('/api/study-sessions/stats') && !response.url().includes('startDate'),
  );
  await page.goto('/dashboard');
  const studySeconds = (await (await stats).json()).data.stats.studySeconds as number;
  expect(studySeconds).toBeGreaterThanOrEqual(300 + 5);
  expect(studySeconds).toBeLessThan(300 + 60);
});

test('lets an administrator create an account that can sign in, then deactivate it so it cannot', async ({
  page,
}) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Kullanıcı oluştur', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Kullanıcı oluştur' });
  await editor.getByLabel('Ad', { exact: true }).fill('Created');
  await editor.getByLabel('Soyad', { exact: true }).fill('Person');
  await editor.getByLabel('Kullanıcı adı', { exact: true }).fill('createdperson');
  await editor.getByLabel('E-posta', { exact: true }).fill('created@example.test');
  await editor.getByLabel('Parola', { exact: true }).fill('created-fixture-password');
  await editor.getByLabel('Parola tekrarı', { exact: true }).fill('created-fixture-password');
  await editor.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Created Person için işlemler' })).toBeVisible();
  await logout(page);

  const signIn = async () => {
    await page.getByLabel('E-posta Adresi').fill('created@example.test');
    await page.getByLabel('Şifre', { exact: true }).fill('created-fixture-password');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  };
  // An account the administrator creates starts with the setup wizard, like a self-registered one.
  await signIn();
  await expect(page).toHaveURL(/\/welcome$/);
  // The wizard has no account menu; dropping the session cookie signs this browser out.
  await page.context().clearCookies();

  await login(page, 'manager@example.test');
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Created Person için işlemler' }).click();
  await page.getByRole('menuitem', { name: 'Pasifleştir' }).click();
  await page.getByRole('button', { name: 'Uygula', exact: true }).click();
  await expect(page.getByText('Kullanıcı güncellendi.')).toBeVisible();
  await logout(page);

  await signIn();
  await expect(page.getByText('Hesabınız deaktif durumda. Lütfen yöneticiyle iletişime geçin')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('shows a renamed site on the public pages after the administrator saves it', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/settings');
  await page.getByLabel('Site adı', { exact: true }).fill('Fixture Workspace');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet', exact: true }).click();
  await expect(page.getByText('Site ayarları kaydedildi ve uygulandı.')).toBeVisible();
  await logout(page);
  await page.reload();
  await expect(page).toHaveTitle('Fixture Workspace');
  await expect(page.getByText('Fixture Workspace', { exact: true }).first()).toBeVisible();
});

test.describe('Site language', () => {
  // The browser asks for English; only the administrator's site setting decides.
  test.use({ locale: 'en-US' });
  test('stays Turkish for an English browser until the administrator sets the site to English', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Giriş Yap' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await login(page, 'manager@example.test');
    await page.goto('/admin/settings');
    await page.getByLabel('Site dili').selectOption('en');
    await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText('Site settings');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/planner');
    await expect(page.getByRole('button', { name: 'Daily', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);

    // The server sends a code; the screen words it in the site language.
    await page.getByLabel('Email address').fill('nobody@example.test');
    await page.getByLabel('Password', { exact: true }).fill('wrong-password-2026');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText('Wrong email or password')).toBeVisible();

    await page.getByRole('link', { name: 'Sign up' }).click();
    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Byron');
    await page.getByLabel('Username').fill('englishreader');
    await page.getByLabel('Email address').fill('englishreader@example.test');
    await page.getByLabel('Password', { exact: true }).fill('fixture-password-2026');
    await page.getByRole('button', { name: 'Sign up', exact: true }).click();
    await expect(page).toHaveURL(/\/welcome$/);

    const next = () => page.getByRole('button', { name: 'Next' }).click();
    await expect(heading).toHaveText('Welcome, Ada');
    await page.getByRole('radio', { name: /Skills and hobbies/ }).check();
    await next();
    await expect(heading).toHaveText('Plan your time');
    await page.getByRole('button', { name: '1 h 30 min' }).click();
    await expect(page.locator('p', { hasText: 'Weekly goal:' })).toContainText('10 h 30 min');
    await next();
    await next();
    await expect(heading).toHaveText('First skills');
    await page.getByRole('button', { name: 'Add Guitar' }).click();
    await next();
    await page.getByRole('button', { name: 'Finish setup' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(heading).toHaveText('Hello, Ada.');
    await page.goto('/courses');
    await expect(heading).toHaveText('Skills');
    await expect(page.getByText('Guitar', { exact: true })).toBeVisible();
    // Users have no language choice of their own.
    await page.goto('/settings');
    await page.getByRole('navigation', { name: 'Settings sections' }).getByRole('button', { name: 'Region' }).click();
    await expect(page.getByRole('group', { name: 'Language' })).toHaveCount(0);
    await page.reload();
    await expect(heading).toHaveText('Settings');
  });
});
