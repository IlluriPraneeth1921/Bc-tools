/**
 * Auth Module — Reusable ATC Action Functions
 *
 * Exported actions can be composed into UJTs.
 * Each function corresponds to a single testable behavior.
 *
 * @module auth
 */

import { Page, expect } from '@playwright/test';
import { SELECTORS } from '../../../fixtures/selectors';

/**
 * ATC-AUTH-001 action: Verify login form is displayed.
 */
export async function verifyLoginFormDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.loginTitle)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(SELECTORS.usernameInput)).toBeVisible();
  await expect(page.locator(SELECTORS.passwordInput)).toBeVisible();
  await expect(page.locator(SELECTORS.loginButton)).toBeVisible();
}

/**
 * ATC-AUTH-002 action: Perform login with valid credentials.
 */
export async function loginWithValidCredentials(
  page: Page,
  username = 'admin',
  password = 'pltest2026',
): Promise<void> {
  await page.locator(SELECTORS.usernameInput).fill(username);
  await page.locator(SELECTORS.passwordInput).fill(password);
  await page.locator(SELECTORS.loginButton).click();
  await page.waitForLoadState('networkidle');
}

/**
 * ATC-AUTH-003 action: Attempt login with invalid credentials.
 */
export async function loginWithInvalidCredentials(
  page: Page,
  username = 'wrong_user',
  password = 'wrong_pass',
): Promise<void> {
  await page.locator(SELECTORS.usernameInput).fill(username);
  await page.locator(SELECTORS.passwordInput).fill(password);
  await page.locator(SELECTORS.loginButton).click();
  await page.waitForLoadState('networkidle');
}

/**
 * ATC-AUTH-004 action: Verify authentication error message displayed.
 */
export async function verifyLoginErrorDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.loginError)).toBeVisible({ timeout: 5_000 });
}

/**
 * ATC-AUTH-005 action: Verify dashboard loaded after successful login.
 */
export async function verifyDashboardLoaded(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 15_000 });
}

/**
 * ATC-AUTH-006 action: Verify sidebar navigation is visible.
 */
export async function verifySidebarNavigation(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.sidebar)).toBeVisible({ timeout: 10_000 });
}
