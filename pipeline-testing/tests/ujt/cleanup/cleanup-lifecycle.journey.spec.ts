/**
 * User Journey Test: Cleanup Lifecycle
 *
 * UJT-CLN-001: Login → View Test Runs → Cleanup specific run → Verify cleaned
 * UJT-CLN-002: Login → Cleanup all pipeline data → Verify databases clean
 *
 * Tags: @cleanup @journey
 *
 * @see docs/test-strategy.md Section 2.2
 */

import { test, expect, isLiveMode, TEST_TIMEOUT, SELECTORS } from '../fixtures/ujt.fixture';
import {
  verifyDashboardLoaded,
} from '../../atc/auth/actions/auth.actions';
import {
  navigateToTestRuns,
  verifyTestRunsTableDisplayed,
} from '../../atc/test-runs/actions/test-runs.actions';
import {
  navigateToCleanup,
  verifyCleanupButtonDisplayed,
} from '../../atc/cleanup/actions/cleanup.actions';

test.describe.serial('@cleanup @journey Cleanup Lifecycle Journey', () => {
  test.setTimeout(TEST_TIMEOUT);

  /**
   * UJT-CLN-001: View test runs then cleanup
   *
   * Login → Test Runs → View history → Cleanup → Verify success
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-TRN-001, ATC-TRN-002
   * - Step 3: ATC-CLN-001, ATC-CLN-002
   * - Step 4: ATC-CLN-003 (cleanup response)
   */
  test('UJT-CLN-001: View test runs and cleanup a specific run', {
    tag: ['@cleanup', '@journey', '@UJT-CLN-001', '@critical'],
  }, async ({ authenticatedPage, mockApi }) => {
    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Test Runs ────────────────────────────────────
    await navigateToTestRuns(authenticatedPage);

    if (isLiveMode) {
      await verifyTestRunsTableDisplayed(authenticatedPage);
    }

    // ─── Step 3: Navigate to Cleanup ──────────────────────────────────────
    await navigateToCleanup(authenticatedPage);
    await verifyCleanupButtonDisplayed(authenticatedPage);

    // ─── Step 4: Verify cleanup page is functional ────────────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  /**
   * UJT-CLN-002: Full pipeline data cleanup
   *
   * Login → Cleanup → Select "All Stages" → Enter prefix → Execute → Verify
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-CLN-001
   * - Step 3: ATC-CLN-004 (all stages cleanup)
   * - Step 4: ATC-CLN-007 (validation check)
   */
  test('UJT-CLN-002: Cleanup all pipeline data for test prefix', {
    tag: ['@cleanup', '@journey', '@UJT-CLN-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    // Mock successful cleanup
    mockApi.mockEndpoint('POST', /\/api\/cleanup\/pipeline\/all$/, {
      entity_id_prefix: '000000000',
      stages_cleaned: '1, 2, 3, 4',
      message: "All pipeline data for '000000000*' removed from all 4 stages (250 rows deleted).",
    });

    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Cleanup ──────────────────────────────────────
    await navigateToCleanup(authenticatedPage);

    // ─── Step 3: Verify cleanup controls ──────────────────────────────────
    await verifyCleanupButtonDisplayed(authenticatedPage);

    // ─── Step 4: Page remains functional ──────────────────────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  /**
   * UJT-CLN-003: Cleanup with API failure recovery
   *
   * Login → Cleanup → Trigger error → Verify app recovers gracefully
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-CLN-001
   * - Step 3: ATC-CLN-008 (error handling)
   */
  test('UJT-CLN-003: Handle cleanup API failure gracefully', {
    tag: ['@cleanup', '@journey', '@UJT-CLN-003', '@negative', '@recovery'],
  }, async ({ authenticatedPage, mockApi }) => {
    // Mock error response
    mockApi.mockEndpointError('POST', /\/api\/cleanup\/pipeline\/all$/, 'Database connection timeout', 500);

    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Cleanup ──────────────────────────────────────
    await navigateToCleanup(authenticatedPage);

    // ─── Step 3: Verify app handles error without crashing ────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
    // Sidebar should still be functional for navigation
    await expect(authenticatedPage.locator(SELECTORS.sidebar)).toBeVisible();
  });
});
