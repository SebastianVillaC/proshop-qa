// E2E-08 - Carrito y checkout completo con verificación de totales (RF06)
const { test, expect } = require('@playwright/test');
const { USERS, login } = require('./helpers');

test('E2E-08 compra de 2 Airpods: subtotal, envío gratis (>100), IVA 15 % y creación del pedido', async ({ page }) => {
  await login(page, USERS.john);
  await expect(page).toHaveURL('/');

  await page.goto('/search/airpods');
  await page.locator('.product-title').first().click();
  await page.locator('select.form-control').first().selectOption('2');
  await page.getByRole('button', { name: 'Add To Cart' }).click();

  await expect(page).toHaveURL('/cart');
  await expect(page.getByRole('heading', { name: /Subtotal \(2\)/ })).toBeVisible();
  await expect(page.locator('.card')).toContainText('$179.98');
  await page.getByRole('button', { name: 'Proceed To Checkout' }).click();

  await expect(page).toHaveURL('/shipping');
  await page.getByLabel('Address').fill('Calle 73 # 76A-354');
  await page.getByLabel('City').fill('Medellín');
  await page.getByLabel('Postal Code').fill('050034');
  await page.getByLabel('Country').fill('Colombia');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL('/payment');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page).toHaveURL('/placeorder');
  const summary = page.locator('.card');
  await expect(summary.locator('.row', { hasText: 'Items' })).toContainText('$179.98');
  await expect(summary.locator('.row', { hasText: 'Shipping' })).toContainText('$0.00');
  await expect(summary.locator('.row', { hasText: 'Tax' })).toContainText('$27.00');
  await expect(summary.locator('.row', { hasText: 'Total' })).toContainText('$206.98');

  await page.getByRole('button', { name: 'Place Order' }).click();
  await expect(page).toHaveURL(/\/order\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Order [a-f0-9]{24}$/ })).toBeVisible();
  await expect(page.getByText('Not Paid')).toBeVisible();
  await expect(page.getByText('Not Delivered')).toBeVisible();
});
