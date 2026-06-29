/**
 * Compare Module — Reusable ATC Action Functions
 *
 * Exported actions for pipeline comparison operations across all 4 stages.
 * Composed into UJTs for end-to-end verification journeys.
 *
 * @module compare
 */

import { Page, expect } from '@playwright/test';
import { SELECTORS } from '../../../fixtures/selectors';

/**
 * ATC-CMP-001 action: Navigate to the Compare page.
 */
export async function navigateToCompare(page: Page): Promise<void> {
  await page.locator(SELECTORS.navCompare).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(SELECTORS.compareTitle)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CMP-002 action: Verify Compare button is displayed.
 */
export async function verifyCompareButtonDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.compareButton)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CMP-003 action: Click the Compare button to start comparison.
 */
export async function startComparison(page: Page): Promise<void> {
  await page.locator(SELECTORS.compareButton).click();
}

/**
 * ATC-CMP-004 action: Wait for comparison to complete.
 */
export async function waitForComparisonComplete(page: Page, timeout = 60_000): Promise<void> {
  // Wait for spinner to disappear or completion message
  const spinner = page.locator(SELECTORS.spinner);
  if (await spinner.isVisible().catch(() => false)) {
    await expect(spinner).toBeHidden({ timeout });
  }
}

/**
 * ATC-CMP-005 action: Verify stage results are displayed.
 */
export async function verifyStageResultsDisplayed(page: Page): Promise<void> {
  // After comparison, stage results should be visible
  await expect(
    page.locator(':text("Stage 1"), :text("Stage 2"), :text("Stage 3"), :text("Stage 4")').first(),
  ).toBeVisible({ timeout: 15_000 });
}

/**
 * ATC-CMP-006 action: Verify pass/fail counts are shown.
 */
export async function verifyPassFailCountsDisplayed(page: Page): Promise<void> {
  const passOrFail = page.locator(':text("Pass"), :text("Fail"), :text("pass"), :text("fail")').first();
  await expect(passOrFail).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CMP-007 action: Navigate to Mismatches page.
 */
export async function navigateToMismatches(page: Page): Promise<void> {
  await page.locator(SELECTORS.navMismatches).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(SELECTORS.mismatchesTitle)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-CMP-008 action: Verify mismatch table is displayed.
 */
export async function verifyMismatchTableDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.mismatchTable)).toBeVisible({ timeout: 10_000 });
}
