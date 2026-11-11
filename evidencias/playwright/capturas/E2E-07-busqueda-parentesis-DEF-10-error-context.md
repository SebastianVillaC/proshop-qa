# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog.spec.js >> Catálogo y búsqueda >> E2E-07 [DEF-10] buscar "(" debe tratarse como texto y no mostrar error del servidor
- Location: specs/catalog.spec.js:28:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.alert-danger')
Expected: 0
Received: 1
Timeout:  10000ms

Call log:
  - Expect "toHaveCount" locator('.alert-danger') with timeout 10000ms
  - waiting for locator('.alert-danger')
    24 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - banner [ref=e3]:
    - navigation [ref=e4]:
      - generic [ref=e5]:
        - link [ref=e6] [cursor=pointer]:
          - /url: /
          - img "ProShop" [ref=e7]
          - text: ProShop
        - generic [ref=e9]:
          - generic [ref=e10]:
            - textbox "Search Products..." [ref=e11]: (
            - button "Search" [ref=e12] [cursor=pointer]
          - link "Cart" [ref=e13] [cursor=pointer]:
            - /url: /cart
          - link "Sign In" [ref=e16] [cursor=pointer]:
            - /url: /login
  - main [ref=e19]:
    - generic [ref=e20]:
      - link "Go Back" [ref=e21] [cursor=pointer]:
        - /url: /
      - alert [ref=e22]: "Regular expression is invalid: missing closing parenthesis"
  - contentinfo [ref=e23]:
    - paragraph [ref=e27]: ProShop © 2026
```

# Test source

```ts
  1  | // E2E-05, E2E-06, E2E-07 - Catálogo y búsqueda (RF04)
  2  | const { test, expect } = require('@playwright/test');
  3  | 
  4  | test.describe('Catálogo y búsqueda', () => {
  5  |   test('E2E-05 búsqueda por palabra clave (PE: con y sin resultados)', async ({ page }) => {
  6  |     await page.goto('/');
  7  |     const search = page.getByPlaceholder('Search Products...');
  8  | 
  9  |     await search.fill('iphone');
  10 |     await page.getByRole('button', { name: 'Search' }).click();
  11 |     await expect(page).toHaveURL('/search/iphone');
  12 |     await expect(page.locator('.product-title')).toHaveCount(1);
  13 |     await expect(page.locator('.product-title')).toHaveText('iPhone 13 Pro 256GB Memory');
  14 | 
  15 |     await search.fill('zzzz');
  16 |     await page.getByRole('button', { name: 'Search' }).click();
  17 |     await expect(page.getByRole('heading', { name: 'Latest Products' })).toBeVisible();
  18 |     await expect(page.locator('.product-title')).toHaveCount(0);
  19 |   });
  20 | 
  21 |   test('E2E-06 producto sin stock (VL: countInStock = 0) no se puede agregar', async ({ page }) => {
  22 |     await page.goto('/search/echo');
  23 |     await page.locator('.product-title').first().click();
  24 |     await expect(page.getByText('Out Of Stock')).toBeVisible();
  25 |     await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeDisabled();
  26 |   });
  27 | 
  28 |   test('E2E-07 [DEF-10] buscar "(" debe tratarse como texto y no mostrar error del servidor', async ({ page }) => {
  29 |     test.fail(true, 'DEF-10: la palabra clave se usa como expresión regular sin escapar -> error 500');
  30 |     await page.goto('/search/(');
> 31 |     await expect(page.locator('.alert-danger')).toHaveCount(0);
     |                                                 ^ Error: expect(locator).toHaveCount(expected) failed
  32 |     await expect(page.getByRole('heading', { name: 'Latest Products' })).toBeVisible();
  33 |   });
  34 | });
  35 | 
```