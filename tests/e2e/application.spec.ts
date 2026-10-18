import {
  test,
  expect,
  login,
  logout,
  dailyPlanner,
  openMove,
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
  const editor = page.getByRole('dialog', { name: 'Yeni Çalışma Seansı' });
  await editor.getByRole('button', { name: 'Özel Görev', exact: true }).click();
  await editor
    .getByLabel('Özel Görev Başlığı *', { exact: true })
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
    page.getByRole('heading', { name: 'Yeni Çalışma Seansı', exact: true }),
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
