import { test, expect } from '@playwright/test';

const token = 'a'.repeat(43); // Synthetic, never an issued invitation.
const wishes = Array.from({ length: 3 }, (_, i) => ({ id: `wish-${i}`, name: i ? `Guest ${i}` : '<img src=x onerror=alert(1)>', message: 'Semoga bahagia selalu!', createdAt: '2026-09-23T12:00:00Z' }));

test('shows latest three wishes once and safely renders text without loading buttons', async ({ page }) => {
  let reads = 0;
  await page.route('**/api/wishes?*', (route) => {
    reads++;
    return route.fulfill({ json: reads === 1 ? { items: wishes, nextCursor: 'older' } : { items: [{ ...wishes[1], id: 'older' }], nextCursor: null } });
  });
  await page.goto('/#wishes');
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(3);
  await expect(page.locator('[data-wishes-list] img')).toHaveCount(0);
  await expect(page.locator('[data-wishes-list] h4').first()).toHaveText(wishes[0].name);
  expect(reads).toBe(1);
  await expect(page.locator('[data-wishes-more], [data-wishes-retry]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Kirim ucapan' })).toBeDisabled();
});

test('keeps entered data and the retry key after failure, then confirms only a saved wish', async ({ page }) => {
  const submitted: Array<Record<string, string>> = [];
  let reads = 0;
  await page.route('**/api/wishes**', async (route) => {
    if (route.request().method() === 'GET') {
      reads++;
      return route.fulfill({ json: { items: reads === 1 ? wishes : [{ ...wishes[0], id: 'new-approved', name: 'New approved guest' }, ...wishes.slice(1)], nextCursor: 'older' } });
    }
    submitted.push(route.request().postDataJSON());
    return route.fulfill(submitted.length === 1
      ? { status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Silakan coba lagi.' } } }
      : { json: { saved: true, status: 'pending' } });
  });
  await page.goto(`/?to=Display%20only#token=${token}`);
  await page.getByRole('link', { name: 'Buka Undangan' }).click();
  await page.getByLabel('Nama Anda').fill('Guest');
  await page.getByRole('textbox', { name: 'Doa & ucapan', exact: true }).fill('Selamat!');
  await page.locator('#wishes').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(3);
  await page.getByRole('button', { name: 'Kirim ucapan' }).click();
  await expect(page.locator('[data-wishes-status]')).toHaveText('Silakan coba lagi.');
  expect(reads).toBe(1);
  await expect(page.getByRole('textbox', { name: 'Doa & ucapan', exact: true })).toHaveValue('Selamat!');
  await page.getByRole('button', { name: 'Kirim ucapan' }).click();
  await expect(page.locator('[data-wishes-status]')).toContainText('sudah tersimpan');
  expect(submitted[0].idempotencyKey).toBe(submitted[1].idempotencyKey);
  expect(submitted[0].token).toBe(token);
  await expect(page.getByRole('textbox', { name: 'Doa & ucapan', exact: true })).toHaveValue('');
  await expect(page.locator('[data-wishes-list] h4').first()).toHaveText('New approved guest');
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(3);
  expect(reads).toBe(2);
});

test('shows a read error without blocking invitation content or adding a reload button', async ({ page }) => {
  await page.route('**/api/wishes?*', (route) => route.fulfill({ status: 503, json: { error: { message: 'Buku ucapan belum dapat diakses.' } } }));
  await page.goto('/#wishes');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-wishes-list-status]')).toContainText('Buku ucapan belum dapat diakses.');
  await expect(page.locator('[data-wishes-retry]')).toHaveCount(0);
});
