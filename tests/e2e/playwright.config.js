// Configuración de Playwright para las pruebas E2E de ProShop.
// Requiere la app en ejecución (frontend :3000, API :5001) y MongoDB arriba.
// BASE_URL permite apuntar a otro ambiente (ej. en CI).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  globalSetup: require.resolve('./global-setup.js'),
  fullyParallel: false,
  workers: 1, // las pruebas comparten la misma base de datos
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../evidencias/playwright/html-report', open: 'never' }],
    ['junit', { outputFile: '../../evidencias/playwright/junit-e2e.xml' }],
    ['json', { outputFile: '../../evidencias/playwright/results.json' }],
  ],
  outputDir: '../../evidencias/playwright/test-results',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
