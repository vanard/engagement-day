import { test, expect } from '@playwright/test';

const token = 'a'.repeat(16); // Synthetic, never an issued invitation.
const wishes = Array.from({ length: 5 }, (_, i) => ({ id: `wish-${i}`, name: i ? `Guest ${i}` : '<img src=x onerror=alert(1)>', message: 'Semoga bahagia selalu!', createdAt: '2026-09-23T12:00:00Z' }));

test('reports non-JSON hosting errors as a service failure instead of a connection failure', async ({ page }) => {
  await page.route('**/api/wishes?*', (route) => route.fulfill({ status: 500, contentType: 'text/plain', body: 'FUNCTION_INVOCATION_FAILED' }));
  await page.goto('/#wishes');
  await expect(page.locator('[data-wishes-list-status]')).toHaveText('Layanan ucapan sedang tidak tersedia. Silakan coba lagi nanti.');
});

test('shows five wishes per page with numbered pages and safely renders text', async ({ page }) => {
  const requested: string[] = [];
  await page.route('**/api/wishes?*', (route) => {
    const url = new URL(route.request().url());
    requested.push(url.search);
    const n = Number(url.searchParams.get('page'));
    const items = n === 3 ? [{ ...wishes[1], id: 'last', name: 'Last page guest' }] : wishes.map((wish) => ({ ...wish, id: `${wish.id}-p${n}` }));
    return route.fulfill({ json: { items, page: n, pageSize: 5, total: 11 } });
  });
  await page.goto('/#wishes');
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(5);
  await expect(page.locator('[data-wishes-list] img')).toHaveCount(0);
  await expect(page.locator('[data-wishes-list] h4').first()).toHaveText(wishes[0].name);
  expect(requested).toEqual(['?limit=5&page=1']);
  const nav = page.getByRole('navigation', { name: 'Halaman ucapan' });
  await expect(nav.getByRole('button', { name: /^Halaman \d+$/ })).toHaveText(['1', '2', '3']);
  await expect(nav.getByRole('button', { name: 'Halaman 1' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Halaman sebelumnya' })).toBeDisabled();
  await nav.getByRole('button', { name: 'Halaman 3' }).click();
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(1);
  await expect(page.locator('[data-wishes-list] h4')).toHaveText('Last page guest');
  await expect(nav.getByRole('button', { name: 'Halaman 3' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('button', { name: 'Halaman berikutnya' })).toBeDisabled();
  await nav.getByRole('button', { name: 'Halaman sebelumnya' }).click();
  await expect(nav.getByRole('button', { name: 'Halaman 2' })).toHaveAttribute('aria-current', 'page');
  expect(requested.at(-1)).toBe('?limit=5&page=2');
  await expect(page.locator('[data-wishes-more], [data-wishes-retry]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Kirim ucapan' })).toBeDisabled();
});

test('hides pagination when every wish fits on one page', async ({ page }) => {
  await page.route('**/api/wishes?*', (route) => route.fulfill({ json: { items: wishes.slice(0, 2), page: 1, pageSize: 5, total: 2 } }));
  await page.goto('/#wishes');
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(2);
  await expect(page.locator('[data-wishes-pagination]')).toBeHidden();
});

test('keeps entered data and the retry key after failure, then confirms only a saved wish', async ({ page }) => {
  const submitted: Array<Record<string, string>> = [];
  let reads = 0;
  const newWish = { ...wishes[0], id: 'new-approved', name: 'New approved guest' };
  await page.route('**/api/wishes**', async (route) => {
    if (route.request().method() === 'GET') {
      reads++;
      return route.fulfill({ json: { items: wishes, page: 1, pageSize: 5, total: 12 } });
    }
    submitted.push(route.request().postDataJSON());
    return route.fulfill(submitted.length === 1
      ? { status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Silakan coba lagi.' } } }
      : { json: { saved: true, status: 'approved', wish: newWish } });
  });
  await page.goto(`/?to=Display%20only#${token}`);
  // The group code leaves the address bar but still authorizes this tab after a reload.
  await expect(page).toHaveURL(/\?to=Display%20only$/);
  await page.reload();
  expect(page.url()).not.toContain(token);
  await page.getByRole('link', { name: 'Buka Undangan' }).click();
  await page.getByLabel('Nama Anda').fill('Guest');
  await page.getByRole('textbox', { name: 'Doa & ucapan', exact: true }).fill('Selamat!');
  await page.locator('#wishes').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(5);
  await page.getByRole('button', { name: 'Kirim ucapan' }).click();
  await expect(page.locator('[data-wishes-status]')).toHaveText('Silakan coba lagi.');
  expect(reads).toBe(1);
  await expect(page.getByRole('textbox', { name: 'Doa & ucapan', exact: true })).toHaveValue('Selamat!');
  await page.getByRole('button', { name: 'Kirim ucapan' }).click();
  await expect(page.locator('[data-wishes-status]')).toContainText('sudah tampil');
  expect(submitted[0].idempotencyKey).toBe(submitted[1].idempotencyKey);
  expect(submitted[0].token).toBe(token);
  await expect(page.getByRole('textbox', { name: 'Doa & ucapan', exact: true })).toHaveValue('');
  await expect(page.locator('[data-wishes-list] h4').first()).toHaveText('New approved guest');
  await expect(page.locator('[data-wishes-list] article')).toHaveCount(5);
  await expect(page.getByRole('navigation', { name: 'Halaman ucapan' }).getByRole('button', { name: /^Halaman \d+$/ })).toHaveText(['1', '2', '3']);
  expect(reads).toBe(1);
});

test('shows a read error without blocking invitation content or adding a reload button', async ({ page }) => {
  await page.route('**/api/wishes?*', (route) => route.fulfill({ status: 503, json: { error: { message: 'Buku ucapan belum dapat diakses.' } } }));
  await page.goto('/#wishes');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('[data-wishes-list-status]')).toContainText('Buku ucapan belum dapat diakses.');
  await expect(page.locator('[data-wishes-retry]')).toHaveCount(0);
});
