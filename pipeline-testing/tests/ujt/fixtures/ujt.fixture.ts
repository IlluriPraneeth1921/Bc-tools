/**
 * UJT (User Journey Test) Shared Fixture
 *
 * Provides dual-mode support (mock + live) for journey tests.
 * Re-uses the MockApi class from ATC fixtures for mock mode.
 * Performs real authentication in live mode via StorageState.
 *
 * Usage:
 *   import { test, expect, isLiveMode, TEST_TIMEOUT } from '../fixtures/ujt.fixture';
 */

import { test as base, Page, expect as baseExpect } from '@playwright/test';
import { MockApi, isLiveMode as mockApiLiveMode } from '../../fixtures/mock-api';
import { SELECTORS } from '../../fixtures/selectors';
import {
  createParseSummary,
  createCompareResponse,
  createCleanupResponse,
  createHealthResponse,
  createRootResponse,
} from '../../fixtures/test-data';

// ─── Constants ───────────────────────────────────────────────────────────────

export const isLiveMode = process.env.LIVE_MODE === 'true';
export const TEST_TIMEOUT = isLiveMode ? 180_000 : 60_000;
export const COMPARISON_TIMEOUT = isLiveMode ? 120_000 : 30_000;

// ─── Fixture Definition ──────────────────────────────────────────────────────

export const test = base.extend<{
  /** Mock API interceptor — single source of truth for mocked responses. */
  mockApi: MockApi;
  /** Authenticated page — logged in and ready for journey navigation. */
  authenticatedPage: Page;
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
      // Live mode: perform real authentication
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');

      const loginVisible = await page.locator(SELECTORS.loginTitle).isVisible().catch(() => false);
      if (loginVisible) {
        const username = process.env.PL_TEST_USERNAME || 'admin';
        const password = process.env.PL_TEST_PASSWORD || 'pltest2026';

        await page.locator(SELECTORS.usernameInput).fill(username);
        await page.locator(SELECTORS.passwordInput).fill(password);
        await page.locator(SELECTORS.loginButton).click();
        await page.waitForLoadState('networkidle');
        await baseExpect(page.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 15_000 });
      }
    } else {
      // Mock mode: navigate and rely on mocked API responses
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
export { SELECTORS } from '../../fixtures/selectors';
