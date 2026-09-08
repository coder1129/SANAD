import { expect, test } from '@playwright/test';

test('home page and accessible sign-in dialog work', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Build a Career Profile That Opens Doors.',
    }),
  ).toBeVisible();

  const signIn = page.getByRole('button', { name: 'Sign In' }).first();
  await signIn.click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(signIn).toBeFocused();
});

test('sign-up is separate and collects the complete customer profile', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign Up' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Create a new account' }),
  ).toBeVisible();
  await expect(dialog.getByLabel('First name')).toBeVisible();
  await expect(dialog.getByLabel('Last name')).toBeVisible();
  await expect(dialog.getByLabel('Email address')).toBeVisible();
  await expect(dialog.getByLabel('Phone number')).toBeVisible();
  await expect(dialog.getByLabel('Gender')).toBeVisible();

  await dialog.getByRole('button', { name: 'Sign In' }).click();
  await expect(
    dialog.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
});

test('metadata routes are served', async ({ request }) => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should return 2xx`).toBeTruthy();
  }
});

test('security headers are applied to frontend responses', async ({
  request,
}) => {
  const response = await request.get('/');
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('email verification route handles an incomplete link safely', async ({
  page,
}) => {
  await page.goto('/verify-email');

  await expect(
    page.getByRole('heading', { name: 'Email verification' }),
  ).toBeVisible();
  await expect(
    page.getByText('The verification link is incomplete.'),
  ).toBeVisible();
});
