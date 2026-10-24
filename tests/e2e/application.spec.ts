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

test('plans a weekly routine, edits it as a whole and ends it', async ({ page, application }) => {
  // Start tomorrow so the test does not depend on the time of day.
  const tomorrow = new Date(Date.parse(`${application.day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  await login(page);
  await dailyPlanner(page);
  await page.getByRole('button', { name: 'Yeni seans', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Yeni Seans' });
  await editor.getByRole('button', { name: 'Özel', exact: true }).click();
  await editor.getByLabel('Özel Başlık *', { exact: true }).fill('Guitar routine');
  await editor.getByLabel('Tarih', { exact: true }).fill(tomorrow);
  await editor.getByLabel('Saat', { exact: true }).fill('18:00');
  await editor.getByLabel('Süre (dakika) *', { exact: true }).fill('90');
  await editor.getByRole('checkbox', { name: 'Her hafta tekrarla' }).check();
  await expect(editor.getByRole('group', { name: 'Tekrar günleri' }).locator('[aria-pressed="true"]')).toHaveCount(1);
  await editor.getByLabel('Bitiş tarihi (isteğe bağlı)').fill(tomorrow);
  await editor.getByRole('button', { name: 'Oluştur', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText('Rutin oluşturuldu.')).toBeVisible();

  await page.goto(`/planner?date=${tomorrow}`);
  await page.getByRole('button', { name: 'Günlük', exact: true }).click();
  const card = page.getByRole('button', { name: 'Guitar routine: işlemler' });
  await expect(card).toBeVisible();
  await expect(page.getByRole('img', { name: 'Rutin' })).toHaveCount(1);

  await page.getByRole('button', { name: 'Rutinler', exact: true }).click();
  const routines = page.getByRole('dialog', { name: 'Rutinler' });
  await expect(routines.getByText('Guitar routine', { exact: true })).toBeVisible();
  await expect(routines.getByText(/18:00 · 90 dk/)).toBeVisible();
  await routines.getByRole('button', { name: 'Rutini düzenle: Guitar routine' }).click();
  const routineEditor = page.getByRole('dialog', { name: 'Rutini düzenle' });
  await routineEditor.getByLabel('Özel Başlık *', { exact: true }).fill('Guitar practice');
  await routineEditor.getByRole('button', { name: 'Güncelle', exact: true }).click();
  await expect(routineEditor).toHaveCount(0);
  // Untouched future sessions are rebuilt from the edited routine.
  await expect(page.getByRole('button', { name: 'Guitar practice: işlemler' })).toBeVisible();
  await expect(card).toHaveCount(0);

  await page.getByRole('button', { name: 'Rutinler', exact: true }).click();
  await page.getByRole('dialog', { name: 'Rutinler' }).getByRole('button', { name: 'Rutini düzenle: Guitar practice' }).click();
  await page.getByRole('dialog', { name: 'Rutini düzenle' }).getByRole('button', { name: 'Rutini bitir', exact: true }).click();
  await page.getByRole('dialog', { name: 'Rutini bitir' }).getByRole('button', { name: 'Rutini bitir', exact: true }).click();
  await expect(page.getByText('Rutin bitirildi.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Guitar practice: işlemler' })).toHaveCount(0);
});

test('sets a personal weekly goal on a shared record and follows it on the dashboard', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/courses');
  await page.getByRole('button', { name: 'Kategoriler', exact: true }).click();
  const categories = page.getByRole('dialog', { name: 'Kategori yönetimi' });
  await categories.getByRole('button', { name: 'Kategori ekle', exact: true }).click();
  const category = page.getByRole('dialog', { name: 'Kategori ekle' });
  await category.getByLabel('Kategori adı', { exact: true }).fill('Music');
  await category.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(category).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(categories).toHaveCount(0);
  await page.getByRole('button', { name: 'Ortak proje ekle', exact: true }).click();
  const record = page.getByRole('dialog', { name: 'Proje ekle' });
  await record.getByLabel('Proje adı', { exact: true }).fill('Guitar lessons');
  await record.getByLabel('Kategori', { exact: true }).selectOption({ label: 'Music' });
  await record.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(record).toHaveCount(0);
  await logout(page);

  await login(page);
  await page.goto('/courses');
  await page.getByRole('link', { name: /Guitar lessons/ }).first().click();
  await page.getByRole('button', { name: 'Hedef belirle', exact: true }).click();
  await page.getByRole('group', { name: 'Haftalık hedef' }).getByRole('button', { name: '5 sa', exact: true }).click();
  await page.getByRole('button', { name: 'Hedefi kaydet', exact: true }).click();
  await expect(page.getByText('Haftalık hedef kaydedildi.')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Bu hafta hedefi' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('0 sn / 5 sa')).toBeVisible();
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Proje hedefleri' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Guitar lessons hedefi' })).toBeVisible();
});

test('subscribes a calendar app to the sessions through a private address that can be renewed and turned off', async ({ page }) => {
  await login(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Takvim', exact: true }).click();
  await expect(page.getByText('Abonelik kapalı.')).toBeVisible();
  await page.getByRole('button', { name: 'Abonelik adresi oluştur', exact: true }).click();
  const address = page.getByLabel('Abonelik adresi', { exact: true });
  await expect(address).toHaveValue(/\/api\/calendar\/[A-Za-z0-9_-]{43}\.ics$/);
  const first = await address.inputValue();
  await expect(page.getByRole('link', { name: 'Takvim uygulamasında aç' })).toHaveAttribute('href', /^webcal:/);
  // A calendar app fetches the address with no session at all.
  const feed = await page.request.get(new URL(first).pathname, { headers: { cookie: '' } });
  expect(feed.status()).toBe(200);
  expect(feed.headers()['content-type']).toMatch(/^text\/calendar/);
  const body = (await feed.text()).replace(/\r\n /g, '');
  expect(body).toContain('SUMMARY:Movable session');
  expect(body).not.toContain('Preserve fixture notes');

  // Shown once: after a reload only the state is visible.
  await page.reload();
  await page.getByRole('button', { name: 'Takvim', exact: true }).click();
  await expect(page.getByText(/Abonelik .* tarihinden beri açık/)).toBeVisible();
  await expect(page.getByLabel('Abonelik adresi', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Adresi yenile', exact: true }).click();
  await page.getByRole('dialog', { name: 'Adres yenilensin mi?' }).getByRole('button', { name: 'Adresi yenile', exact: true }).click();
  const renewed = await page.getByLabel('Abonelik adresi', { exact: true }).inputValue();
  expect(renewed).not.toBe(first);
  expect((await page.request.get(new URL(first).pathname)).status()).toBe(404);
  expect((await page.request.get(new URL(renewed).pathname)).status()).toBe(200);

  await page.getByRole('button', { name: 'Aboneliği kapat', exact: true }).click();
  await page.getByRole('dialog', { name: 'Abonelik kapatılsın mı?' }).getByRole('button', { name: 'Aboneliği kapat', exact: true }).click();
  await expect(page.getByText('Abonelik kapalı.')).toBeVisible();
  expect((await page.request.get(new URL(renewed).pathname)).status()).toBe(404);
});

test('tags a session and filters the planner and statistics by that tag', async ({ page }) => {
  await login(page);
  await page.goto('/courses');
  await page.getByRole('button', { name: 'Etiketler', exact: true }).click();
  const manager = page.getByRole('dialog', { name: 'Etiketlerim' });
  await manager.getByLabel('Yeni etiket').fill('Sınav');
  await manager.getByRole('button', { name: 'Etiket ekle', exact: true }).click();
  await expect(manager.getByLabel('Etiket adı: Sınav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(manager).toHaveCount(0);

  await dailyPlanner(page);
  await page.getByRole('button', { name: 'Movable session', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Seansı düzenle' });
  await editor.getByRole('group', { name: 'Etiketler' }).getByRole('button', { name: 'Sınav', exact: true }).click();
  await editor.getByRole('button', { name: 'Güncelle', exact: true }).click();
  await expect(editor).toHaveCount(0);

  await page.getByLabel('Etikete göre süz').selectOption({ label: 'Sınav' });
  await expect(page.getByRole('button', { name: 'Movable session: işlemler' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'First short session: işlemler' })).toHaveCount(0);
  await page.getByLabel('Etikete göre süz').selectOption({ label: 'Tüm etiketler' });
  await expect(page.getByRole('button', { name: 'First short session: işlemler' })).toBeVisible();

  await page.goto('/stats');
  const filtered = page.waitForResponse((response) => /\/api\/study-sessions\/stats\?.*tagId=\d+/.test(response.url()));
  await page.getByLabel('Etikete göre süz').selectOption({ label: 'Sınav' });
  expect((await filtered).status()).toBe(200);
});

test('moves an account into a new one through the downloaded data file', async ({ page }, info) => {
  await login(page);
  await page.goto('/profile');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'İndir', exact: true }).click();
  const file = info.outputPath('account.json');
  await (await download).saveAs(file);
  await logout(page);

  await registerAccount(page, 'mover');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Verilerimi yükle', exact: true }).click();
  await (await chooser).setFiles(file);
  await expect(page).toHaveURL(/\/dashboard$/);
  await dailyPlanner(page);

  // The account is no longer empty, so the same file is refused the second time.
  await page.goto('/profile');
  const again = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Dosya seç', exact: true }).click();
  await (await again).setFiles(file);
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Veriler yalnız boş bir hesaba yüklenebilir; bu hesapta zaten veri var');
});

test('jumps to any page or settings tab by name, from the keyboard or the header button', async ({ page }) => {
  await login(page);
  const palette = page.getByRole('dialog', { name: 'Sayfaya git' });
  // Headless UI's dialog root has no size of its own; its search field shows the palette is open.
  const field = palette.getByRole('combobox', { name: 'Sayfa ya da ayar ara' });
  await page.keyboard.press('ControlOrMeta+k');
  await expect(field).toBeFocused();
  await page.keyboard.type('takvim');
  await page.keyboard.press('Enter');
  await expect(palette).toHaveCount(0);
  await expect(page).toHaveURL(/\/settings\?tab=calendar$/);
  await expect(page.getByRole('heading', { name: 'Takvim aboneliği', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Sayfaya git', exact: true }).click();
  await field.fill('istatis');
  await palette.getByRole('option', { name: /İstatistikler/ }).click();
  await expect(page).toHaveURL(/\/stats$/);

  // Administration is not offered to a regular account.
  await page.keyboard.press('ControlOrMeta+k');
  await field.fill('yedek');
  await expect(palette.getByText('Eşleşen sayfa yok.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(palette).toHaveCount(0);
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
  // Tomorrow afternoon: a planned session can start any time before it ends, and nothing else is planned then,
  // so the test does not depend on the time of day.
  const tomorrow = new Date(Date.parse(`${application.day}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  await page.getByRole('button', { name: 'Yeni seans', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Yeni Seans' });
  await editor.getByRole('button', { name: 'Özel', exact: true }).click();
  await editor.getByLabel('Özel Başlık *', { exact: true }).fill('Focused browser session');
  await editor.getByLabel('Seans türü *', { exact: true }).selectOption('pomodoro');
  await editor.getByLabel('Tarih', { exact: true }).fill(tomorrow);
  await editor.getByLabel('Saat', { exact: true }).fill('15:00');
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
  await editor.getByLabel('Kullanıcı Adı', { exact: true }).fill('createdperson');
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

test('lets an administrator promote an account to administrator and later delete it', async ({ page }) => {
  const manageOther = async (action: string, confirm: string) => {
    await login(page, 'manager@example.test');
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Second Student için işlemler' }).click();
    await page.getByRole('menuitem', { name: action }).click();
    await page.getByRole('button', { name: confirm, exact: true }).click();
  };
  await manageOther('Yönetici yap', 'Uygula');
  await expect(page.getByText('Kullanıcı güncellendi.')).toBeVisible();
  await logout(page);

  // The promoted account now reaches the administration pages.
  await login(page, 'other@example.test');
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Kullanıcı yönetimi' })).toBeVisible();
  await logout(page);

  await manageOther('Kullanıcıyı sil', 'Kullanıcıyı sil');
  await expect(page.getByText('Kullanıcı silindi.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Second Student için işlemler' })).toHaveCount(0);
  await logout(page);

  await page.getByLabel('E-posta Adresi').fill('other@example.test');
  await page.getByLabel('Şifre', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
  await expect(page.getByText('E-posta veya şifre hatalı')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('offers a shared category the administrator adds to every account', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/courses');
  await page.getByRole('button', { name: 'Kategoriler', exact: true }).click();
  const manager = page.getByRole('dialog', { name: 'Kategori yönetimi' });
  await manager.getByRole('button', { name: 'Kategori ekle', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Kategori ekle' });
  await editor.getByLabel('Kategori adı', { exact: true }).fill('Fixture Shared');
  await editor.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(page.getByText('Kategori oluşturuldu.')).toBeVisible();
  await expect(manager.getByText('Fixture Shared', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(manager).toHaveCount(0);
  await logout(page);

  await login(page);
  await page.goto('/courses');
  await page.getByRole('button', { name: 'Proje ekle', exact: true }).first().click();
  const record = page.getByRole('dialog', { name: 'Proje ekle' });
  await expect(record.getByLabel('Kategori', { exact: true }).locator('option', { hasText: 'Fixture Shared' })).toHaveCount(1);
});

test('restores a backup the administrator took, undoing later changes and asking to sign in again', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/settings');
  const backups = () => page.getByRole('button', { name: 'Yedekleme ve sıfırlama', exact: true }).click();
  await backups();
  await page.getByRole('button', { name: 'Şimdi yedek al', exact: true }).click();
  await expect(page.getByText('Yedek doğrulandı ve sunucuda saklandı.')).toBeVisible();

  await page.getByRole('button', { name: 'Genel', exact: true }).click();
  await page.getByLabel('Site adı', { exact: true }).fill('Changed After Backup');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet', exact: true }).click();
  await expect(page.getByText('Site ayarları kaydedildi ve uygulandı.')).toBeVisible();
  await expect(page).toHaveTitle('Changed After Backup');

  await backups();
  await page.getByRole('button', { name: /tarihli yedeği geri yükle$/ }).first().click();
  await page.getByRole('button', { name: 'Yedeği geri yükle', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.reload();
  await expect(page).not.toHaveTitle('Changed After Backup');
  // The backup's accounts still sign in.
  await login(page);
});

test('keeps the idle session limit an administrator sets, within its bounds', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/settings?section=security');
  const limit = page.getByLabel('Boşta oturum süresi (dakika)', { exact: true });
  const save = page.getByRole('button', { name: 'Değişiklikleri kaydet', exact: true });
  await limit.fill('1441');
  await save.click();
  await expect(limit).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Geçerli bir değer girin.')).toBeVisible();
  await limit.fill('30');
  await save.click();
  await expect(page.getByText('Site ayarları kaydedildi ve uygulandı.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Boşta oturum süresi (dakika)', { exact: true })).toHaveValue('30');
});

test.describe('clearing all data', () => {
  test.use({ clearsStudyData: true });
  test('removes accounts and study data but keeps administrators and a safety backup', async ({ page }) => {
    await login(page, 'manager@example.test');
    await page.goto('/admin/settings?section=backup');
    await page.getByRole('button', { name: 'Kullanıcı ve çalışma verilerini temizle', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Kullanıcı ve çalışma verilerini temizle' });
    await expect(dialog.getByText(/rutinler, \S+ hedefleri, etiketler/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Sıfırlamayı uygula', exact: true }).click();
    await expect(page.getByText('Seçilen veriler sıfırlandı; güvenlik yedeği saklandı.')).toBeVisible();
    // The form returns to its first section with the site defaults.
    await expect(page).toHaveURL(/\/admin\/settings$/);
    await expect(page.getByLabel('Site adı', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Yedekleme ve sıfırlama', exact: true }).click();
    await expect(page.getByRole('button', { name: /tarihli yedeği geri yükle$/ }).first()).toBeVisible();

    await logout(page);
    await page.getByLabel('E-posta Adresi').fill('owner@example.test');
    await page.getByLabel('Şifre', { exact: true }).fill('fixture-password');
    await page.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(page.getByText('E-posta veya şifre hatalı').first()).toBeVisible();
    await login(page, 'manager@example.test');
  });
});

test('moves shared records to the chosen category when the administrator deletes theirs', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/courses');
  const openCategories = async () => {
    await page.getByRole('button', { name: 'Kategoriler', exact: true }).click();
    return page.getByRole('dialog', { name: 'Kategori yönetimi' });
  };
  let categories = await openCategories();
  for (const name of ['Source Category', 'Target Category']) {
    await categories.getByRole('button', { name: 'Kategori ekle', exact: true }).click();
    const editor = page.getByRole('dialog', { name: 'Kategori ekle' });
    await editor.getByLabel('Kategori adı', { exact: true }).fill(name);
    await editor.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(categories.getByText(name, { exact: true })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(categories).toHaveCount(0);

  await page.getByRole('button', { name: 'Ortak proje ekle', exact: true }).click();
  const record = page.getByRole('dialog', { name: 'Proje ekle' });
  await record.getByLabel('Proje adı', { exact: true }).fill('Moved Project');
  await record.getByLabel('Kategori', { exact: true }).selectOption({ label: 'Source Category' });
  await record.getByRole('button', { name: 'Kaydet', exact: true }).click();
  await expect(record).toHaveCount(0);

  categories = await openCategories();
  await categories.getByRole('button', { name: 'Source Category kategorisini sil', exact: true }).click();
  const removal = page.getByRole('dialog', { name: 'Kategoriyi sil' });
  await removal.getByLabel(/taşınacağı kategori$/).selectOption({ label: 'Target Category' });
  await removal.getByRole('button', { name: 'Kategoriyi sil', exact: true }).click();
  await expect(removal).toHaveCount(0);
  await expect(categories.getByText('Source Category', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(categories).toHaveCount(0);

  await page.getByRole('button', { name: 'Projeyi düzenle: Moved Project', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Projeyi düzenle' });
  await expect(edit.getByLabel('Kategori', { exact: true }).locator('option:checked')).toHaveText('Target Category');
});

test('resets only the site settings and keeps accounts and study data', async ({ page }) => {
  await login(page, 'manager@example.test');
  await page.goto('/admin/settings');
  await page.getByLabel('Site adı', { exact: true }).fill('Renamed Before Reset');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet', exact: true }).click();
  await expect(page).toHaveTitle('Renamed Before Reset');
  await page.getByRole('button', { name: 'Yedekleme ve sıfırlama', exact: true }).click();
  await page.getByRole('button', { name: 'Yalnızca site ayarlarını sıfırla', exact: true }).click();
  await page.getByRole('button', { name: 'Sıfırlamayı uygula', exact: true }).click();
  await expect(page.getByText('Seçilen veriler sıfırlandı; güvenlik yedeği saklandı.')).toBeVisible();
  await expect(page).not.toHaveTitle('Renamed Before Reset');
  await logout(page);
  // Accounts and their sessions are untouched (the fixture also checks the seeded sessions on teardown).
  await login(page);
  await dailyPlanner(page);
});

test('closes registration and holds everyone but administrators at the maintenance screen', async ({
  page,
  browser,
  application,
}) => {
  // A student who is already signed in when maintenance starts.
  const studentContext = await browser.newContext({ baseURL: application.url });
  const student = await studentContext.newPage();
  try {
    // While registration is open, the sign-in page links to it.
    await student.goto('/login');
    await expect(student.getByRole('link', { name: 'Kayıt Ol', exact: true })).toBeVisible();
    await login(student);

    await login(page, 'manager@example.test');
    await page.goto('/admin/settings');
    await page.getByRole('button', { name: 'Güvenlik', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Yeni kayıtlara izin ver' }).uncheck();
    await page.getByRole('checkbox', { name: 'Bakım modu' }).check();
    await page.getByRole('button', { name: 'Değişiklikleri kaydet', exact: true }).click();
    await expect(page.getByText('Site ayarları kaydedildi ve uygulandı.')).toBeVisible();
    // Administrators keep working.
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1, name: 'Merhaba, Fixture.' })).toBeVisible();

    await student.reload();
    await expect(student.getByRole('heading', { level: 1, name: 'Site bakımda' })).toBeVisible();
    await student.getByRole('button', { name: 'Çıkış Yap', exact: true }).click();
    await expect(student).toHaveURL(/\/login$/);
    await expect(student.getByRole('link', { name: 'Kayıt Ol', exact: true })).toHaveCount(0);
    await student.getByLabel('E-posta Adresi').fill('owner@example.test');
    await student.getByLabel('Şifre', { exact: true }).fill('fixture-password');
    await student.getByRole('button', { name: 'Giriş Yap', exact: true }).click();
    await expect(student.getByText('Site bakımda. Lütfen daha sonra tekrar deneyin')).toBeVisible();
    await expect(student).toHaveURL(/\/login$/);
    await student.goto('/register');
    await expect(student.getByRole('heading', { level: 1, name: 'Kayıtlar kapalı' })).toBeVisible();
  } finally {
    await studentContext.close();
  }
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
  test('keeps custom words in the language they were typed in and never translates them', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 });
    const setSiteLanguage = async (language: 'tr' | 'en', label: string, save: string) => {
      await page.goto('/admin/settings');
      await page.getByLabel(label).selectOption(language);
      await page.getByRole('button', { name: save }).click();
      await expect(heading).toHaveText(language === 'en' ? 'Site settings' : 'Site ayarları');
    };
    const signOut = async (menu: string, button: string) => {
      await page.getByRole('button', { name: menu }).click();
      await page.getByRole('button', { name: button, exact: true }).click();
      await expect(page).toHaveURL(/\/login$/);
    };
    const signInInEnglish = async (email: string) => {
      await page.getByLabel('Email address').fill(email);
      await page.getByLabel('Password', { exact: true }).fill('fixture-password');
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard$/);
    };

    // Turkish words on the Turkish site.
    await login(page);
    await page.goto('/settings');
    await page.getByRole('radio', { name: /Özel kelimeler/ }).check();
    const turkishRecord = page.getByRole('group', { name: 'Ana kayıt' });
    await turkishRecord.getByLabel('Kelime').fill('kitap');
    await turkishRecord.getByLabel('"-ı" hâli').fill('kitabı');
    await page.getByRole('button', { name: 'Kelimeleri kaydet' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Tercihler hesabınızda saklanır' })).toBeVisible();
    await logout(page);
    await login(page, 'manager@example.test');
    await setSiteLanguage('en', 'Site dili', 'Değişiklikleri kaydet');
    await signOut('Account menu', 'Sign out');

    // On the English site the Turkish words step aside for the English preset.
    await signInInEnglish('owner@example.test');
    await page.goto('/courses');
    await expect(heading).toHaveText('Projects');
    await page.goto('/settings');
    await page.getByRole('radio', { name: /Custom words/ }).check();
    const record = page.getByRole('group', { name: 'Main record' });
    await record.getByLabel('Word').fill('book');
    await expect(record.getByLabel('Plural')).toHaveValue('books');
    await expect(record.getByText('Forms: a book · books')).toBeVisible();
    await page.getByRole('button', { name: 'Save words' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Preferences are stored in your account' })).toBeVisible();
    await page.goto('/courses');
    await expect(heading).toHaveText('Books');
    await expect(page.getByRole('button', { name: 'Add a book' }).first()).toBeVisible();
    await signOut('Account menu', 'Sign out');

    // Back on Turkish, the English words step aside. A person keeps one set of words, so saving the
    // English ones replaced the Turkish ones and the Turkish preset shows; nothing is translated.
    await signInInEnglish('manager@example.test');
    await setSiteLanguage('tr', 'Site language', 'Save changes');
    await logout(page);
    await login(page);
    await page.goto('/courses');
    await expect(heading).toHaveText('Projeler');
  });
});
