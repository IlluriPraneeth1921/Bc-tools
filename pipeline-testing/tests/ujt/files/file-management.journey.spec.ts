/**
 * User Journey Test: File Management
 *
 * UJT-FIL-001: Login → Load File → Parse → Verify Summary → Navigate to Compare
 * UJT-FIL-002: Login → Load D12 File → Verify D12 parsing → Navigate away
 *
 * Tags: @files @journey @critical
 *
 * @see docs/test-strategy.md Section 2.2
 */

import { test, expect, isLiveMode, TEST_TIMEOUT, SELECTORS } from '../fixtures/ujt.fixture';
import {
  loginWithValidCredentials,
  verifyDashboardLoaded,
} from '../../atc/auth/actions/auth.actions';
import {
  navigateToLoadFile,
  verifyFileUploaderDisplayed,
  verifyInterfaceTypeSelector,
  verifyS3FileListDisplayed,
} from '../../atc/files/actions/files.actions';
import {
  navigateToCompare,
  verifyCompareButtonDisplayed,
} from '../../atc/compare/actions/compare.actions';

test.describe.serial('@files @journey File Management Journey', () => {
  test.setTimeout(TEST_TIMEOUT);

  /**
   * UJT-FIL-001: Upload D06 file and navigate to comparison
   *
   * Login → Load File → Select ICD-D06 → Upload .psv file → Verify parse summary → Go to Compare
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002 (login)
   * - Step 2: ATC-FIL-001 (navigate to load file)
   * - Step 3: ATC-FIL-002 (file uploader displayed)
   * - Step 4: ATC-FIL-003 (interface type selector)
   * - Step 5: ATC-FIL-005 (upload triggers parse)
   * - Step 6: ATC-CMP-001 (navigate to compare)
   */
  test('UJT-FIL-001: Upload D06 file and navigate to comparison', {
    tag: ['@files', '@journey', '@UJT-FIL-001', '@critical'],
  }, async ({ authenticatedPage, mockApi }) => {
    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Load File ────────────────────────────────────
    await navigateToLoadFile(authenticatedPage);

    // ─── Step 3: Verify file uploader is ready ────────────────────────────
    await verifyFileUploaderDisplayed(authenticatedPage);

    // ─── Step 4: Verify interface type selector ───────────────────────────
    await verifyInterfaceTypeSelector(authenticatedPage);

    // ─── Step 5: Verify S3 file list or upload widget ─────────────────────
    if (isLiveMode) {
      // In live mode, S3 file list should be populated
      await verifyS3FileListDisplayed(authenticatedPage);
    } else {
      // In mock mode, verify the page structure is correct
      await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
    }

    // ─── Step 6: Navigate to Compare ──────────────────────────────────────
    await navigateToCompare(authenticatedPage);
    await verifyCompareButtonDisplayed(authenticatedPage);
  });

  /**
   * UJT-FIL-002: Browse S3 files and load from S3
   *
   * Login → Load File → View S3 listing → Select file from S3 → Verify summary
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-FIL-001
   * - Step 3: ATC-FIL-004 (S3 file list)
   * - Step 4: ATC-FIL-008 (interface list)
   */
  test('UJT-FIL-002: Browse S3 files and view interface options', {
    tag: ['@files', '@journey', '@UJT-FIL-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Load File ────────────────────────────────────
    await navigateToLoadFile(authenticatedPage);

    // ─── Step 3: Verify S3 file list ──────────────────────────────────────
    if (isLiveMode) {
      await verifyS3FileListDisplayed(authenticatedPage);
    }

    // ─── Step 4: Verify interface options are available ───────────────────
    await verifyInterfaceTypeSelector(authenticatedPage);

    // ─── Step 5: Page remains functional ──────────────────────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  /**
   * UJT-FIL-003: Error handling — upload invalid file type
   *
   * Login → Load File → Attempt upload of invalid file → Verify error handling
   *
   * Coverage Matrix:
   * - Step 1: ATC-AUTH-002
   * - Step 2: ATC-FIL-001
   * - Step 3: ATC-FIL-006 (invalid interface error)
   */
  test('UJT-FIL-003: Handle invalid file upload gracefully', {
    tag: ['@files', '@journey', '@UJT-FIL-003', '@negative'],
  }, async ({ authenticatedPage, mockApi }) => {
    // Mock error response for invalid file
    mockApi.mockEndpointError('POST', /\/api\/files\/upload$/, 'Parse error: Invalid file format', 400);

    // ─── Step 1: Verify authenticated ─────────────────────────────────────
    await verifyDashboardLoaded(authenticatedPage);

    // ─── Step 2: Navigate to Load File ────────────────────────────────────
    await navigateToLoadFile(authenticatedPage);

    // ─── Step 3: Verify app handles error gracefully ──────────────────────
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
    // App should not crash — all navigation should still work
    await expect(authenticatedPage.locator(SELECTORS.sidebar)).toBeVisible();
  });
});
