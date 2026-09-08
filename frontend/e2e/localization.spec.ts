import { expect, test } from '@playwright/test';
import arabic from '../messages/interface-ar.json';
test.use({ contextOptions: { reducedMotion: 'reduce' } });

test('Arabic and dark mode persist across routes and reloads', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'SANAD_LOCALE', value: 'ar', url: 'http://127.0.0.1:3100' },
  ]);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /[\u0600-\u06ff]/,
  );
  await page
    .getByRole('button', { name: 'تفعيل الوضع الداكن', exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/packages');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'اختر خطوتك المهنية التالية.',
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'اختر خطوتك المهنية التالية.',
  );
  await page.screenshot({
    path: 'test-results/ar-dark-services.png',
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Switch to English' })
    .filter({ visible: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Choose your next career step.',
  );
});

test('Arabic mobile navigation and dialog fit the screen in dark mode', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies(
    ['SANAD_LOCALE=ar', 'SANAD_THEME=dark'].map((pair) => {
      const [name, value] = pair.split('=');
      return { name, value, url: 'http://127.0.0.1:3100' };
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.screenshot({
    path: 'test-results/ar-dark-mobile-home.png',
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'فتح قائمة التنقل' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({
    path: 'test-results/ar-dark-mobile-menu.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'تسجيل الدخول', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('البريد الإلكتروني');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/ar-dark-mobile-signin.png',
    fullPage: true,
  });
});

test('administrator sign-in supports Arabic and dark mode', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'SANAD_LOCALE', value: 'ar', url: 'http://127.0.0.1:3100' },
    { name: 'SANAD_THEME', value: 'dark', url: 'http://127.0.0.1:3100' },
  ]);
  await page.goto('/admin/sign-in');
  await expect(
    page.getByRole('heading', { name: 'مرحبًا بعودتك' }),
  ).toBeVisible();
  await expect(page.getByLabel('كلمة المرور', { exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({
    path: 'test-results/ar-dark-admin.png',
    fullPage: true,
  });
});

test('public Arabic pages render without client errors on mobile', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: 'SANAD_LOCALE', value: 'ar', url: 'http://127.0.0.1:3100' },
    { name: 'SANAD_THEME', value: 'dark', url: 'http://127.0.0.1:3100' },
  ]);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const path of [
    '/packages',
    '/faq',
    '/feedback',
    '/pages/about-us',
    '/pages/privacy-policy',
    '/pages/terms-and-conditions',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /[\u0600-\u06ff]/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('Arabic service details fit mobile in dark mode', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: 'SANAD_LOCALE', value: 'ar', url: 'http://127.0.0.1:3100' },
    { name: 'SANAD_THEME', value: 'dark', url: 'http://127.0.0.1:3100' },
  ]);
  await page.goto('/packages');
  const href = await page
    .locator('a[href^="/packages/"]')
    .first()
    .getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /[\u0600-\u06ff]/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/ar-dark-service-mobile.png' });
});

test('Arabic customer profile preserves personal data with a mocked session', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.addCookies([
    { name: 'SANAD_LOCALE', value: 'ar', url: 'http://127.0.0.1:3100' },
    { name: 'SANAD_THEME', value: 'dark', url: 'http://127.0.0.1:3100' },
  ]);
  await page.addInitScript(() =>
    localStorage.setItem('sanad.auth.has-session', '1'),
  );
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/auth/refresh')
      ? { accessToken: 'test-only-token' }
      : {
          id: 1,
          name: 'Test Customer',
          first_name: 'Test',
          last_name: 'Customer',
          email: 'test@example.com',
          phone: '+971501234567',
          gender: 'male',
          role: 'customer',
          email_verified: true,
        };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/profile');
  await expect(
    page.getByLabel(arabic['First name'], { exact: true }),
  ).toHaveValue('Test');
  await expect(
    page.getByLabel(arabic['Last name'], { exact: true }),
  ).toHaveValue('Customer');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/ar-dark-profile-mobile.png',
    fullPage: true,
  });
});

test('Arabic administrator can edit independent bilingual fields with a mocked session', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: 'SANAD_LOCALE', value: 'ar', url: 'http://127.0.0.1:3100' },
    { name: 'SANAD_THEME', value: 'dark', url: 'http://127.0.0.1:3100' },
  ]);
  await page.addInitScript(() =>
    localStorage.setItem('sanad.auth.has-session', '1'),
  );
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/auth/refresh')
      ? { accessToken: 'test-only-token' }
      : path.endsWith('/auth/me')
        ? {
            id: 1,
            name: 'Test Admin',
            email: 'test@example.com',
            role: 'admin',
            email_verified: true,
          }
        : { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/admin/packages');
  await page
    .getByRole('button', { name: arabic['Add Package'], exact: true })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByLabel(arabic['English Name'], { exact: true })
    .fill('Custom service');
  await page
    .getByLabel(arabic['Arabic Name'], { exact: true })
    .fill('خدمة مخصصة');
  await expect(
    page.getByLabel(arabic['English Name'], { exact: true }),
  ).toHaveValue('Custom service');
  await expect(
    page.getByLabel(arabic['Arabic Name'], { exact: true }),
  ).toHaveValue('خدمة مخصصة');
  await page.screenshot({
    path: 'test-results/ar-dark-package-editor.png',
    fullPage: true,
  });
});
