/**
 * Cleanup Module — Reusable ATC Action Functions
 *
 * Exported actions for data cleanup operations (test runs and pipeline data).
 * Composed into UJTs for complete test lifecycle journeys.
 *
 * @module cleanup
 */

import { Page, expect } from '@playwright/test';
import { SELECTORS } from '../../../fixtures/selectors';

/**
 * ATC-CLN-001 action: Navigate to the Cleanup page.
 */
export async function navigateToCleanup(page: Page): Promise<void> {
  await page.locator(SELECTORS.navCleanup).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(SELECTORS.cleanupTitle)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CLN-002 action: Verify cleanup button is displayed.
 */
export async function verifyCleanupButtonDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.cleanupButton)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CLN-003 action: Verify entity ID prefix input is displayed.
 */
export async function verifyEntityIdPrefixInput(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.entityIdPrefixInput)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CLN-004 action: Enter entity ID prefix for cleanup.
 */
export async function enterEntityIdPrefix(page: Page, prefix: string): Promise<void> {
  await page.locator(SELECTORS.entityIdPrefixInput).fill(prefix);
}

/**
 * ATC-CLN-005 action: Click cleanup button.
 */
export async function clickCleanup(page: Page): Promise<void> {
  await page.locator(SELECTORS.cleanupButton).click();
  await page.waitForLoadState('networkidle');
}

/**
 * ATC-CLN-006 action: Verify cleanup success message.
 */
export async function verifyCleanupSuccess(page: Page): Promise<void> {
  await expect(
    page.locator(SELECTORS.cleanupSuccess).or(page.locator(SELECTORS.successAlert)),
  ).toBeVisible({ timeout: 10_000 });
}
