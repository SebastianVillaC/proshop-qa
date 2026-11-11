const { expect } = require('@playwright/test');

const USERS = {
  admin: { email: 'admin@email.com', password: '123456', name: 'Admin User' },
  john: { email: 'john@email.com', password: '123456', name: 'John Doe' },
};

async function login(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
}

async function expectLoggedAs(page, name) {
  await expect(page.locator('#username')).toHaveText(name);
}

module.exports = { USERS, login, expectLoggedAs };
