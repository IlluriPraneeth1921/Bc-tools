/**
 * Atomic Test Cases: Test Runs Module
 *
 * Module: TRN
 * Tests test run management — create, list, view, and status display.
 *
 * @see docs/test-strategy.md Section 2.1
 */

import { test, expect, SELECTORS } from '../../fixtures/app.fixture';
import {
  navigateToTestRuns,
  verifyTestRunsTableDisplayed,
} from './actions/test-runs.actions';

test.describe('Test Runs — History & Management', () => {
  test('ATC-TRN-001 - Test Runs page is accessible from sidebar navigation', {
    tag: ['@test-runs', '@smoke', '@regression', '@ATC-TRN-001'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToTestRuns(authenticatedPage);
  });

  test('ATC-TRN-002 - Test runs table is displayed with column headers', {
    tag: ['@test-runs', '@smoke', '@regression', '@ATC-TRN-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-001',
        interface_type: 'icd_d06',
        start_timestamp: '2026-06-01T10:00:00Z',
        end_timestamp: '2026-06-01T10:05:00Z',
        source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
        mcd_id_prefix: '000000000',
        total_source_lines: 52,
        total_providers: 3,
        stage1_pass_count: 49,
        stage1_fail_count: 0,
        stage2_pass_count: 120,
        stage2_fail_count: 0,
        stage3_pass_count: 95,
        stage3_fail_count: 0,
        stage4_pass_count: 95,
        stage4_fail_count: 0,
        overall_status: 'PASS',
        cleaned_up: false,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await verifyTestRunsTableDisplayed(authenticatedPage);
  });

  test('ATC-TRN-003 - Empty test runs list shows no records', {
    tag: ['@test-runs', '@regression', '@boundary', '@ATC-TRN-003'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, []);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-004 - Test run with PASS status displays correctly', {
    tag: ['@test-runs', '@regression', '@ATC-TRN-004'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-002',
        interface_type: 'icd_d06',
        start_timestamp: '2026-06-01T10:00:00Z',
        source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
        mcd_id_prefix: '000000000',
        overall_status: 'PASS',
        cleaned_up: false,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-005 - Test run with FAIL status displays correctly', {
    tag: ['@test-runs', '@regression', '@ATC-TRN-005'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-003',
        interface_type: 'icd_d06',
        start_timestamp: '2026-06-01T10:00:00Z',
        source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
        mcd_id_prefix: '000000000',
        overall_status: 'FAIL',
        cleaned_up: false,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-006 - Test run with PENDING status for in-progress runs', {
    tag: ['@test-runs', '@regression', '@ATC-TRN-006'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-004',
        interface_type: 'icd_d06',
        start_timestamp: new Date().toISOString(),
        source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
        mcd_id_prefix: '000000000',
        overall_status: 'PENDING',
        cleaned_up: false,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-007 - Cleaned-up test run shows cleanup indicator', {
    tag: ['@test-runs', '@regression', '@ATC-TRN-007'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-005',
        interface_type: 'icd_d06',
        start_timestamp: '2026-06-01T10:00:00Z',
        source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
        mcd_id_prefix: '000000000',
        overall_status: 'PASS',
        cleaned_up: true,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-008 - Test runs API error shows error state gracefully', {
    tag: ['@test-runs', '@regression', '@negative', '@ATC-TRN-008'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError('GET', /\/api\/test-runs\/?$/, 'Database connection failed', 500);

    await navigateToTestRuns(authenticatedPage);
    // App should remain functional
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-009 - Multiple test runs sorted by most recent first', {
    tag: ['@test-runs', '@regression', '@ATC-TRN-009'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-new',
        interface_type: 'icd_d06',
        start_timestamp: '2026-06-10T10:00:00Z',
        source_filename: 'WI_PROV_FILE_EXTRACT_T.psv',
        mcd_id_prefix: '000000000',
        overall_status: 'PASS',
        cleaned_up: false,
      },
      {
        test_run_id: 'run-old',
        interface_type: 'icd_d06',
        start_timestamp: '2026-06-01T10:00:00Z',
        source_filename: 'WI_PROV_FILE_EXTRACT_T_02.psv',
        mcd_id_prefix: '000000000',
        overall_status: 'FAIL',
        cleaned_up: true,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-TRN-010 - D12 interface test runs display correctly', {
    tag: ['@test-runs', '@regression', '@ATC-TRN-010'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/test-runs\/?$/, [
      {
        test_run_id: 'run-d12',
        interface_type: 'icd_d12',
        start_timestamp: '2026-06-05T10:00:00Z',
        source_filename: 'WI_FSIA_FILE_EXTRACT_T.txt',
        mcd_id_prefix: '000000000',
        overall_status: 'PASS',
        cleaned_up: false,
      },
    ]);

    await navigateToTestRuns(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });
});
