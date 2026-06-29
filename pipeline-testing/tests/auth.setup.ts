/**
 * Authentication Setup — Pipeline Testing
 *
 * Runs once before all live-mode tests.
 * Logs into the Streamlit app and saves session state for reuse.
 *
 * @see docs/test-strategy.md Section 16.1
 */

import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { SELECTORS } from './fixtures/selectors';

const authFile = path.resolve(__dirname, '.auth/storage-state.json');

setup('authenticate', async ({ page }) => {
  const baseURL = process.env.BASE_URL || 'http://localhost:8501';
  const username = process.env.PL_TEST_USERNAME || 'admin';
  const password = process.env.PL_TEST_PASSWORD || 'pltest2026';

  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.locator(SELECTORS.usernameInput).fill(username);
  await page.locator(SELECTORS.passwordInput).fill(password);
  await page.locator(SELECTORS.loginButton).click();

  // Wait for dashboard to load
  await expect(page.locator(SELECTORS.dashboardTitle)).toBeVisible({ timeout: 20_000 });

  // Save storage state
  await page.context().storageState({ path: authFile });
});
