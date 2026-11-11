// E2E-01, E2E-02, E2E-03 - Autenticación y registro (RF01, RF02)
const { test, expect } = require('@playwright/test');
const { USERS, login, expectLoggedAs } = require('./helpers');

test.describe('Autenticación', () => {
  test('E2E-01 inicio de sesión con credenciales válidas', async ({ page }) => {
    await login(page, USERS.john);
    await expect(page).toHaveURL('/');
    await expectLoggedAs(page, USERS.john.name);
  });

  test('E2E-02 inicio de sesión con contraseña incorrecta muestra error', async ({ page }) => {
    await login(page, { email: USERS.john.email, password: 'incorrecta' });
    await expect(page.locator('.Toastify__toast--error')).toHaveText('Invalid email or password');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  });

  test('E2E-03 registro: contraseñas distintas son rechazadas y luego registro exitoso', async ({ page }) => {
    const email = `qa.e2e.${Date.now()}@itm.edu.co`;
    await page.goto('/register');
    await page.getByLabel('Name').fill('Usuario E2E');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('123456');
    await page.getByLabel('Confirm Password').fill('1234567');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.locator('.Toastify__toast--error')).toHaveText('Passwords do not match');

    await page.getByLabel('Confirm Password').fill('123456');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL('/');
    await expectLoggedAs(page, 'Usuario E2E');
  });

  test('E2E-04 rutas protegidas redirigen a /login sin sesión', async ({ page }) => {
    for (const ruta of ['/profile', '/shipping', '/admin/productlist']) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login$/);
    }
  });
});
