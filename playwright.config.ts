import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  use: { baseURL: 'http://127.0.0.1:4322' },
  projects: [
    { name: 'chromium-mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
    { name: 'webkit-desktop', use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock', url: 'http://127.0.0.1:4322', reuseExistingServer: false },
});
