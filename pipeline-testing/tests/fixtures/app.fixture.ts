/**
 * App-Level Fixture — Pipeline Testing (Streamlit UI)
 *
 * Provides:
 *   - `mockApi`            — Mock API interceptor for all FastAPI endpoints
 *   - `authenticatedPage`  — Page with Streamlit auth completed
 *   - `dashboardPage`      — Authenticated and on the main dashboard
 *
 * Mock mode: intercepts HTTP requests from Streamlit → FastAPI backend
 * Live mode: uses real authentication against running backend
 */

import { test as base, Page, expect as baseExpect } from '@playwright/test';
import { MockApi, isLiveMode } from './mock-api';
import { SELECTORS } from './selectors';

export const test = base.extend<{
  /** Mock API interceptor — use for custom mock overrides in individual tests. */
  mockApi: MockApi;
  /** Authenticated page — logged in, ready for navigation. */
  authenticatedPage: Page;
  /** Dashboard page — authenticated, on the main dashboard. */
  dashboardPage: Page;
}>({
  // ─── Mock API ──────────────────────────────────────────────────────────────
  mockApi: async ({ page }, use) => {
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:8000';
    const api = new MockApi(page, apiBaseUrl);

    if (!isLiveMode) {
      await api.setupDefaults();
    }

    await use(api);
  },

  // ─── Authenticated Page ────────────────────────────────────────────────────
  authenticatedPage: async ({ page, mockApi }, use) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:8501';

    if (isLiveMode) {
      // Live mode: perform real login against Streamlit
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');

      // Check if we need to authenticate
      const loginVisible = await page.locator(SELECTORS.loginTitle).isVisible().catch(() => false);

      if (loginVisible) {
        const username = process.env.PL_TEST_USERNAME || 'admin';
        const password = process.env.PL_TEST_PASSWORD || 'pltest2026';

        await page.locator(SELECTORS.usernameInput).fill(username);
        await page.locator(SELECTORS.passwordInput).fill(password);
        await page.locator(SELECTORS.loginButton).click();
        await page.waitForLoadState('networkidle');

        // Wait for dashboard to appear
        await baseExpect(page.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 15_000 });
      }
    } else {
      // Mock mode: Streamlit auth is handled by session state
      // We mock the API responses so the UI renders correctly
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');
    }

    await use(page);
  },

  // ─── Dashboard Page ────────────────────────────────────────────────────────
  dashboardPage: async ({ authenticatedPage }, use) => {
    // Verify we're on the dashboard
    await baseExpect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible({ timeout: 10_000 });
    await use(authenticatedPage);
  },
});

export { expect } from '@playwright/test';
export { isLiveMode } from './mock-api';
export { SELECTORS } from './selectors';
export { MockApi } from './mock-api';
