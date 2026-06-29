/**
 * Test Runs Module — Reusable ATC Action Functions
 *
 * Exported actions for test run management and history viewing.
 *
 * @module test-runs
 */

import { Page, expect } from '@playwright/test';
import { SELECTORS } from '../../../fixtures/selectors';

/**
 * ATC-TRN-001 action: Navigate to the Test Runs page.
 */
export async function navigateToTestRuns(page: Page): Promise<void> {
  await page.locator(SELECTORS.navTestRuns).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(SELECTORS.testRunsTitle)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-TRN-002 action: Verify test runs table is displayed.
 */
export async function verifyTestRunsTableDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.testRunsTable)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-TRN-003 action: Verify test run status badge.
 */
export async function verifyTestRunStatus(page: Page, expectedStatus: string): Promise<void> {
  await expect(
    page.locator(`:text("${expectedStatus}")`).first(),
  ).toBeVisible({ timeout: 10_000 });
}
