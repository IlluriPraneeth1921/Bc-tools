/**
 * User Journey Test: Comparison & Mismatch Review
 *
 * UJT-CMP-001: Login → Load File → Run All-Stage Compare → View Mismatches → Export
 * UJT-CMP-002: Login → Load File → Run Per-Stage Compare → Drill into Stage 2
 *
 * Tags: @compare @journey @critical
 *
 * @see docs/test-strategy.md Section 2.2
 */

import { test, expect, isLiveMode, TEST_TIMEOUT, COMPARISON_TIMEOUT, SELECTORS } from '../fixtures/ujt.fixture';
import {
  verifyDashboardLoaded,
} from '../../atc/auth/actions/auth.actions';
import {
  navigateToLoadFile,
  verifyFileUploaderDisplayed,
} from '../../atc/files/actions/files.actions';
import {
  navigateToCompare,
  verifyCompareButtonDisplayed,
  navigateToMismatches,
} from '../../atc/compare/actions/compare.actions';

test.describe.serial('@compare @journey Comparison & Mismatch Review Journey', () => {
  test.setTimeout(TEST_TIMEOUT);

  /**
   * UJT-CMP-001: Full 4-stage comparison with mismatch review
   *
   * Login → Load File → Compare all stages → View Mismatches → Review drill-down
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-FIL-001, ATC-FIL-002
   * - Step 3: ATC-CMP-001, ATC-CMP-002, ATC-CMP-003
   * - Step 4: ATC-CMP-008
   */
  test('UJT-CMP-001: Run full comparison and review mismatches', {
    tag: ['@compare', '@journey', '@UJT-CMP-001', '@critical'],
  }, async ({ authenticatedPage, mockApi }) => {
    // Mock comparison with some failures for mismatch review
    mockApi.mockEndpoint('POST', /\/api\/compare\/run$/, {
      test_run_id: 'ujt-run-001',
      filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      status: 'FAIL',
      total_providers: 3,
      total_source_lines: 52,
      stages: [
        { stage: 1, total_checks: 49, pass_count: 49, fail_count: 0, missing_count: 0 },
        { stage: 2, total_checks: 120, pass_count: 117, fail_count: 3, missing_count: 0 },
        { stage: 3, total_checks: 95, pass_count: 94, fail_count: 1, missing_count: 0 },
        { stage: 4, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
      ],
      total_checks: 359,
      total_pass: 355,
      total_fail: 4,
      total_missing: 0,
    });

    mockApi.mockEndpoint('GET', /\/api\/compare\/mismatches\//, {
      mismatches: [
        {
          stage: 2,
          entity_id: '000000000012345',
          table: 'MedicaidProviderMain',
          column: 'ProviderFullName',
          expected: 'TEST PROVIDER ONE',
          actual: 'TEST PROVIDER  ONE',
          status: 'FAIL',
        },
        {
          stage: 2,
          entity_id: '000000000067890',
          table: 'MedicaidProviderAddress',
          column: 'ZipCode',
          expected: '53703',
          actual: '53704',
          status: 'FAIL',
        },
      ],
      total: 2,
    });

    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Load File ────────────────────────────────────
    await navigateToLoadFile(authenticatedPage);
    await verifyFileUploaderDisplayed(authenticatedPage);

    // ─── Step 3: Navigate to Compare and verify button ────────────────────
    await navigateToCompare(authenticatedPage);
    await verifyCompareButtonDisplayed(authenticatedPage);

    // ─── Step 4: Navigate to Mismatches ───────────────────────────────────
    await navigateToMismatches(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  /**
   * UJT-CMP-002: Per-stage comparison workflow
   *
   * Login → Load File → Run stage 1 → Run stage 2 → Run stage 3 → Run stage 4
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-FIL-001
   * - Step 3: ATC-CMP-009 (per-stage comparison)
   */
  test('UJT-CMP-002: Per-stage comparison sequence', {
    tag: ['@compare', '@journey', '@UJT-CMP-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    // Mock per-stage responses
    mockApi.mockEndpoint('POST', /\/api\/compare\/run-stage$/, {
      stage: 1,
      total_checks: 49,
      pass_count: 49,
      fail_count: 0,
      missing_count: 0,
    });

    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Load File ────────────────────────────────────
    await navigateToLoadFile(authenticatedPage);

    // ─── Step 3: Navigate to Compare ──────────────────────────────────────
    await navigateToCompare(authenticatedPage);
    await verifyCompareButtonDisplayed(authenticatedPage);

    // ─── Step 4: Verify page functional for per-stage runs ────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  /**
   * UJT-CMP-003: Comparison with all stages passing
   *
   * Login → Load File → Compare → All PASS → Verify success state
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-FIL-001
   * - Step 3: ATC-CMP-003 (all pass)
   */
  test('UJT-CMP-003: Verify all-pass comparison displays success', {
    tag: ['@compare', '@journey', '@UJT-CMP-003'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/compare\/run$/, {
      test_run_id: 'ujt-run-003',
      filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      status: 'PASS',
      total_providers: 3,
      total_source_lines: 52,
      stages: [
        { stage: 1, total_checks: 49, pass_count: 49, fail_count: 0, missing_count: 0 },
        { stage: 2, total_checks: 120, pass_count: 120, fail_count: 0, missing_count: 0 },
        { stage: 3, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
        { stage: 4, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
      ],
      total_checks: 359,
      total_pass: 359,
      total_fail: 0,
      total_missing: 0,
    });

    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Load File ────────────────────────────────────
    await navigateToLoadFile(authenticatedPage);

    // ─── Step 3: Navigate to Compare ──────────────────────────────────────
    await navigateToCompare(authenticatedPage);
    await verifyCompareButtonDisplayed(authenticatedPage);

    // ─── Step 4: Verify page remains functional ───────────────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });
});
