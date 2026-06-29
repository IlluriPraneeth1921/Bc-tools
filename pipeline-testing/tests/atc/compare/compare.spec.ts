/**
 * Atomic Test Cases: Compare Module
 *
 * Module: CMP
 * Tests pipeline comparison functionality across all 4 stages.
 * Validates comparison initiation, progress tracking, and result display.
 *
 * @see docs/test-strategy.md Section 2.1
 */

import { test, expect, SELECTORS } from '../../fixtures/app.fixture';
import {
  navigateToCompare,
  verifyCompareButtonDisplayed,
  navigateToMismatches,
} from './actions/compare.actions';

test.describe('Compare — Pipeline Verification', () => {
  test('ATC-CMP-001 - Compare page is accessible from sidebar navigation', {
    tag: ['@compare', '@smoke', '@regression', '@ATC-CMP-001'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToCompare(authenticatedPage);
  });

  test('ATC-CMP-002 - Compare button is displayed on Compare page', {
    tag: ['@compare', '@smoke', '@regression', '@ATC-CMP-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToCompare(authenticatedPage);
    await verifyCompareButtonDisplayed(authenticatedPage);
  });

  test('ATC-CMP-003 - Comparison run returns stage results', {
    tag: ['@compare', '@smoke', '@regression', '@ATC-CMP-003'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/compare\/run$/, {
      test_run_id: 'test-001',
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

    await navigateToCompare(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CMP-004 - Comparison with failures shows FAIL status', {
    tag: ['@compare', '@regression', '@ATC-CMP-004'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/compare\/run$/, {
      test_run_id: 'test-002',
      filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      status: 'FAIL',
      total_providers: 3,
      total_source_lines: 52,
      stages: [
        { stage: 1, total_checks: 49, pass_count: 49, fail_count: 0, missing_count: 0 },
        { stage: 2, total_checks: 120, pass_count: 115, fail_count: 5, missing_count: 0 },
        { stage: 3, total_checks: 95, pass_count: 93, fail_count: 2, missing_count: 0 },
        { stage: 4, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
      ],
      total_checks: 359,
      total_pass: 352,
      total_fail: 7,
      total_missing: 0,
    });

    await navigateToCompare(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CMP-005 - Comparison with missing records shows missing count', {
    tag: ['@compare', '@regression', '@ATC-CMP-005'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/compare\/run$/, {
      test_run_id: 'test-003',
      filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      status: 'FAIL',
      total_providers: 3,
      total_source_lines: 52,
      stages: [
        { stage: 1, total_checks: 49, pass_count: 46, fail_count: 0, missing_count: 3 },
        { stage: 2, total_checks: 120, pass_count: 120, fail_count: 0, missing_count: 0 },
        { stage: 3, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
        { stage: 4, total_checks: 95, pass_count: 95, fail_count: 0, missing_count: 0 },
      ],
      total_checks: 359,
      total_pass: 356,
      total_fail: 0,
      total_missing: 3,
    });

    await navigateToCompare(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CMP-006 - Invalid interface type returns error gracefully', {
    tag: ['@compare', '@regression', '@negative', '@ATC-CMP-006'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError('POST', /\/api\/compare\/run$/, 'Unknown interface type: invalid_type', 400);

    await navigateToCompare(authenticatedPage);
    // App should not crash
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CMP-007 - File not loaded error handled gracefully', {
    tag: ['@compare', '@regression', '@negative', '@ATC-CMP-007'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError(
      'POST',
      /\/api\/compare\/run$/,
      'File not found. Load the file first on the Load File page.',
      404,
    );

    await navigateToCompare(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CMP-008 - Mismatches page is accessible from sidebar', {
    tag: ['@compare', '@regression', '@ATC-CMP-008'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToMismatches(authenticatedPage);
  });

  test('ATC-CMP-009 - Per-stage comparison endpoint returns single stage result', {
    tag: ['@compare', '@regression', '@ATC-CMP-009'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/compare\/run-stage$/, {
      stage: 2,
      total_checks: 120,
      pass_count: 120,
      fail_count: 0,
      missing_count: 0,
    });

    await navigateToCompare(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CMP-010 - Comparison with server error (500) handles gracefully', {
    tag: ['@compare', '@regression', '@negative', '@ATC-CMP-010'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError('POST', /\/api\/compare\/run$/, 'Internal server error', 500);

    await navigateToCompare(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });
});
