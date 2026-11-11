// E2E-05, E2E-06, E2E-07 - Catálogo y búsqueda (RF04)
const { test, expect } = require('@playwright/test');

test.describe('Catálogo y búsqueda', () => {
  test('E2E-05 búsqueda por palabra clave (PE: con y sin resultados)', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder('Search Products...');

    await search.fill('iphone');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL('/search/iphone');
    await expect(page.locator('.product-title')).toHaveCount(1);
    await expect(page.locator('.product-title')).toHaveText('iPhone 13 Pro 256GB Memory');

    await search.fill('zzzz');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: 'Latest Products' })).toBeVisible();
    await expect(page.locator('.product-title')).toHaveCount(0);
  });

  test('E2E-06 producto sin stock (VL: countInStock = 0) no se puede agregar', async ({ page }) => {
    await page.goto('/search/echo');
    await page.locator('.product-title').first().click();
    await expect(page.getByText('Out Of Stock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeDisabled();
  });

  test('E2E-07 [DEF-10] buscar "(" debe tratarse como texto y no mostrar error del servidor', async ({ page }) => {
    test.fail(true, 'DEF-10: la palabra clave se usa como expresión regular sin escapar -> error 500');
    await page.goto('/search/(');
    await expect(page.locator('.alert-danger')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Latest Products' })).toBeVisible();
  });
});
