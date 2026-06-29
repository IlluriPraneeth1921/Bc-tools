/**
 * Atomic Test Cases: Authentication Module
 *
 * Module: AUTH
 * Tests login form display, valid/invalid authentication, and session management.
 *
 * @see docs/test-strategy.md Section 2.1
 */

import { test, expect } from '@playwright/test';
import { SELECTORS } from '../../fixtures/selectors';
import {
  verifyLoginFormDisplayed,
  loginWithValidCredentials,
  loginWithInvalidCredentials,
  verifyLoginErrorDisplayed,
  verifyDashboardLoaded,
  verifySidebarNavigation,
} from './actions/auth.actions';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:8501';
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  test('ATC-AUTH-001 - Login form displays with username, password, and submit button', {
    tag: ['@auth', '@smoke', '@regression', '@ATC-AUTH-001'],
  }, async ({ page }) => {
    await verifyLoginFormDisplayed(page);
  });

  test('ATC-AUTH-002 - Valid credentials grant access to dashboard', {
    tag: ['@auth', '@smoke', '@regression', '@ATC-AUTH-002'],
  }, async ({ page }) => {
    await loginWithValidCredentials(page);
    await verifyDashboardLoaded(page);
  });

  test('ATC-AUTH-003 - Invalid credentials show error message', {
    tag: ['@auth', '@regression', '@negative', '@ATC-AUTH-003'],
  }, async ({ page }) => {
    await loginWithInvalidCredentials(page);
    await verifyLoginErrorDisplayed(page);
  });

  test('ATC-AUTH-004 - Empty username prevents login', {
    tag: ['@auth', '@regression', '@negative', '@validation', '@ATC-AUTH-004'],
  }, async ({ page }) => {
    await page.locator(SELECTORS.passwordInput).fill('pltest2026');
    await page.locator(SELECTORS.loginButton).click();
    await page.waitForLoadState('networkidle');

    // Dashboard should NOT appear
    const dashboardVisible = await page.locator(SELECTORS.dashboardTitle)
      .isVisible()
      .catch(() => false);
    expect(dashboardVisible).toBe(false);
  });

  test('ATC-AUTH-005 - Empty password prevents login', {
    tag: ['@auth', '@regression', '@negative', '@validation', '@ATC-AUTH-005'],
  }, async ({ page }) => {
    await page.locator(SELECTORS.usernameInput).fill('admin');
    await page.locator(SELECTORS.loginButton).click();
    await page.waitForLoadState('networkidle');

    const dashboardVisible = await page.locator(SELECTORS.dashboardTitle)
      .isVisible()
      .catch(() => false);
    expect(dashboardVisible).toBe(false);
  });

  test('ATC-AUTH-006 - Successful login shows sidebar navigation', {
    tag: ['@auth', '@regression', '@ATC-AUTH-006'],
  }, async ({ page }) => {
    await loginWithValidCredentials(page);
    await verifyDashboardLoaded(page);
    await verifySidebarNavigation(page);
  });

  test('ATC-AUTH-007 - Sidebar shows API connection status after login', {
    tag: ['@auth', '@regression', '@ATC-AUTH-007'],
  }, async ({ page }) => {
    await loginWithValidCredentials(page);
    await verifyDashboardLoaded(page);

    // Either "API Connected" or "API Offline" should be visible
    const sidebar = page.locator(SELECTORS.sidebar);
    await expect(sidebar).toBeVisible({ timeout: 10_000 });
    const hasStatus = await sidebar.locator(':text("API Connected"), :text("API Offline"), :text("API Unhealthy")')
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasStatus).toBe(true);
  });
});
