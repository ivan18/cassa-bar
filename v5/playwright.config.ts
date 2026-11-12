// Test end-to-end della v5. Playwright compila l'app, avvia `vite preview` e usa il Chrome di sistema.
// Uso: CASSA_PIN=xxxx npm test   (CHROME=/percorso/chrome per un browser diverso da /usr/bin/google-chrome)
import { defineConfig } from '@playwright/test';

const PORTA = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORTA}/`,
    launchOptions: { executablePath: process.env.CHROME ?? '/usr/bin/google-chrome' },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORTA}/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
