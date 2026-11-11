// E2E-09, E2E-10 - Administración de productos y control de acceso (RF08)
const { test, expect } = require('@playwright/test');
const { USERS, login, expectLoggedAs } = require('./helpers');

test.describe('Administración', () => {
  test('E2E-09 el administrador crea y edita un producto', async ({ page }) => {
    await login(page, USERS.admin);
    await expectLoggedAs(page, USERS.admin.name);
    await page.goto('/admin/productlist');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'Create Product' }).click();
    const row = page.locator('tbody tr', { hasText: 'Sample name' }).last();
    await expect(row).toBeVisible();
    await row.locator('a').first().click();

    await expect(page.getByRole('heading', { name: 'Edit Product' })).toBeVisible();
    await expect(page.getByLabel('Name')).toHaveValue('Sample name');
    const nombre = `Teclado QA ${Date.now()}`;
    await page.getByLabel('Name').fill(nombre);
    await page.getByLabel('Price').fill('120.50');
    await page.getByLabel('Count In Stock').fill('4');
    await page.getByRole('button', { name: 'Update' }).click();

    await expect(page).toHaveURL('/admin/productlist');
    await expect(page.locator('tbody tr', { hasText: nombre })).toContainText('$120.5');
  });

  test('E2E-10 un cliente no administrador no ve el menú Admin ni accede a sus rutas', async ({ page }) => {
    await login(page, USERS.john);
    await expectLoggedAs(page, USERS.john.name);
    await expect(page.locator('#adminmenu')).toHaveCount(0);
    await page.goto('/admin/userlist');
    // AdminRoute redirige a /login y, al existir sesión, LoginScreen redirige al inicio
    await expect(page).not.toHaveURL(/\/admin\//);
    await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0);
  });
});
