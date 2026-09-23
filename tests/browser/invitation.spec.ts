import { test, expect } from '@playwright/test';

test('opens the invitation, safely greets the guest, and keeps unconnected forms disabled', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?to=%3Cscript%3EGuest%3C%2Fscript%3E');
  await expect(page.locator('[data-guest-name]')).toHaveText('<script>Guest</script>');
  await expect(page.locator('main')).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath('cover.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('link', { name: 'Buka Undangan' }).click();
  await expect(page.locator('#cover')).toBeHidden();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('main')).toBeFocused();
  await expect(page.locator('[data-music-player]')).toBeVisible();
  await expect(page.locator('[data-music-toggle]')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Kirim konfirmasi' })).toHaveCount(0);
  await expect(page.locator('[data-rsvp-form]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Kirim ucapan' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('invitation.png'), fullPage: true, animations: 'disabled' });
});

test('direct section links open without autoplay and reduced motion skips reveals', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#wishes');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('#cover')).toBeHidden();
  await expect(page.locator('[data-music-player]')).toBeVisible();
  await expect(page.locator('.reveal-active')).toHaveCount(0);
});

test('essential content remains readable without JavaScript at 320px', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 640 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4322/');
  await expect(page.locator('main')).toBeVisible();
  await page.getByRole('link', { name: 'Buka Undangan' }).click();
  await expect(page).toHaveURL(/#invitation$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('requests music from the opening gesture and reports rejected playback', async ({ page }) => {
  // Test the player wiring independently of the browser's real autoplay policy.
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      return Promise.reject(new DOMException('Blocked in test', 'NotAllowedError'));
    };
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Buka Undangan' }).click();
  await expect(page.locator('[data-music-status]')).toHaveText('Ketuk tombol untuk memutar musik.');
  await expect(page.locator('main')).toBeVisible();
});

test('resumes music on return but respects a manual pause', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { paused: true, hidden: false, playCalls: 0 };
    Object.defineProperty(window, '__musicState', { value: state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state.hidden });
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', { configurable: true, get: () => state.paused });
    HTMLMediaElement.prototype.play = function () {
      state.paused = false;
      state.playCalls++;
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      if (state.paused) return;
      state.paused = true;
      this.dispatchEvent(new Event('pause'));
    };
  });
  const setHidden = (hidden: boolean) => page.evaluate((value) => {
    const state = (window as typeof window & { __musicState: { hidden: boolean } }).__musicState;
    state.hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  const playCalls = () => page.evaluate(() => (window as typeof window & { __musicState: { playCalls: number } }).__musicState.playCalls);

  await page.goto('/');
  await page.getByRole('link', { name: 'Buka Undangan' }).click();
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'true');
  await setHidden(true);
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await setHidden(false);
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'true');
  expect(await playCalls()).toBe(2);

  // Some browsers pause media before reporting that the page became hidden.
  await page.locator('[data-audio]').evaluate((audio: HTMLAudioElement) => audio.pause());
  await setHidden(true);
  await setHidden(false);
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'true');
  expect(await playCalls()).toBe(3);

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'true');
  expect(await playCalls()).toBe(4);

  await page.locator('[data-music-toggle]').click();
  await setHidden(true);
  await setHidden(false);
  await expect(page.locator('[data-music-toggle]')).toHaveAttribute('aria-pressed', 'false');
  expect(await playCalls()).toBe(4);
});
