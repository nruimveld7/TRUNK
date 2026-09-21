import { expect, test } from '@playwright/test';

test('guest home, account, search, catalog and health work', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'TRUNK' })).toBeVisible();
  await expect(page.getByTestId('app-card')).toHaveCount(4);
  await page.getByRole('button', { name: /Guest/ }).click();
  await expect(page.getByText('Sign in with Microsoft')).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search applications' })).toBeVisible();
  await page.getByLabel('Search applications').fill('roll');
  await expect(page.getByRole('option', { name: /Roll Monitor/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/applications');
  await expect(page.getByRole('heading', { name: 'Applications' })).toBeVisible();
  expect((await request.get('/healthz')).ok()).toBe(true);
});

test('mock sign-in exposes authenticated apps and sign-out works', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.getByText('Development User')).toBeVisible();
  await page.goto('/applications');
  await expect(page.getByTestId('app-card')).toHaveCount(10);
  await page.getByRole('button', { name: /Development User/ }).click();
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByText('Guest')).toBeVisible();
});

test('favorites and preferences persist in mock authenticated session', async ({ page }) => {
  await page.goto('/auth/login');
  const card = page.getByTestId('app-card').first();
  await card.getByRole('button', { name: /Add .* to favorites/ }).click();
  await page.goto('/favorites');
  await expect(page.getByTestId('app-card')).toHaveCount(1);
  await page.getByRole('button', { name: /Development User/ }).click();
  await page.getByRole('menuitem', { name: 'Preferences' }).click();
  await page.getByText('Dark', { exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('mobile navigation opens and reaches status @mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'System Status' }).click();
  await expect(page.getByRole('heading', { name: 'Application Status' })).toBeVisible();
});
