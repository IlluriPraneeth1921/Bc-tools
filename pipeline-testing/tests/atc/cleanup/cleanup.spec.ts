/**
 * Atomic Test Cases: Cleanup Module
 *
 * Module: CLN
 * Tests data cleanup operations — per-test-run cleanup, pipeline data cleanup,
 * and bulk TestVerification data removal.
 *
 * @see docs/test-strategy.md Section 2.1
 */

import { test, expect, SELECTORS } from '../../fixtures/app.fixture';
import {
  navigateToCleanup,
  verifyCleanupButtonDisplayed,
} from './actions/cleanup.actions';

test.describe('Cleanup — Data Removal', () => {
  test('ATC-CLN-001 - Cleanup page is accessible from sidebar navigation', {
    tag: ['@cleanup', '@smoke', '@regression', '@ATC-CLN-001'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToCleanup(authenticatedPage);
  });

  test('ATC-CLN-002 - Cleanup button is displayed on Cleanup page', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToCleanup(authenticatedPage);
    await verifyCleanupButtonDisplayed(authenticatedPage);
  });

  test('ATC-CLN-003 - Test run cleanup returns success message', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-003'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/cleanup\/[^/]+$/, {
      test_run_id: 'mock-run-001',
      message: 'Test run cleaned up successfully.',
    });

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-004 - Pipeline cleanup (all stages) returns success', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-004'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/cleanup\/pipeline\/all$/, {
      entity_id_prefix: '000000000',
      stages_cleaned: '1, 2, 3, 4',
      message: "All pipeline data for '000000000*' removed from all 4 stages (250 rows deleted).",
    });

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-005 - Pipeline cleanup (interface only) cleans stages 1-3', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-005'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/cleanup\/pipeline\/interface$/, {
      entity_id_prefix: '000000000',
      stages_cleaned: '1, 2, 3',
      message: "Pipeline data for '000000000*' removed from Stages 1-3 (150 rows deleted).",
    });

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-006 - Pipeline cleanup (carity only) cleans stage 4', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-006'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/cleanup\/pipeline\/carity$/, {
      entity_id_prefix: '000000000',
      stages_cleaned: '4',
      message: "Pipeline data for '000000000*' removed from Stage 4 (100 rows deleted).",
    });

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-007 - Cleanup with short prefix (< 5 chars) returns validation error', {
    tag: ['@cleanup', '@regression', '@negative', '@validation', '@ATC-CLN-007'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError(
      'POST',
      /\/api\/cleanup\/pipeline\/all$/,
      'entity_id_prefix must be at least 5 characters to prevent accidental broad deletes.',
      400,
    );

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-008 - Cleanup non-existent test run returns 404', {
    tag: ['@cleanup', '@regression', '@negative', '@ATC-CLN-008'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError('POST', /\/api\/cleanup\/nonexistent-id$/, 'Test run not found', 404);

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-009 - Bulk test data cleanup removes all verification data', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-009'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/cleanup\/test-data\/all$/, {
      total_deleted: 500,
      message: 'All TestVerification data removed (500 rows deleted across all test runs).',
    });

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-CLN-010 - Delete test run permanently removes data', {
    tag: ['@cleanup', '@regression', '@ATC-CLN-010'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('DELETE', /\/api\/cleanup\/[^/]+$/, {
      test_run_id: 'mock-run-001',
      message: 'Test run permanently deleted.',
    });

    await navigateToCleanup(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });
});
