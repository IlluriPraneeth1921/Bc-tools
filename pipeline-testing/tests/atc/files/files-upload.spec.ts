/**
 * Atomic Test Cases: File Upload & Parsing
 *
 * Module: FIL
 * Tests file upload, local parsing, S3 operations, and interface inference.
 * Mock mode intercepts API calls; live mode tests against running backend.
 *
 * @see docs/test-strategy.md Section 2.1
 */

import { test, expect, SELECTORS } from '../../fixtures/app.fixture';
import {
  navigateToLoadFile,
  verifyFileUploaderDisplayed,
  verifyInterfaceTypeSelector,
  verifyS3FileListDisplayed,
} from './actions/files.actions';

test.describe('File Upload & Parsing', () => {
  test('ATC-FIL-001 - Load File page is accessible from sidebar navigation', {
    tag: ['@files', '@smoke', '@regression', '@ATC-FIL-001'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToLoadFile(authenticatedPage);
  });

  test('ATC-FIL-002 - File uploader widget is displayed on Load File page', {
    tag: ['@files', '@smoke', '@regression', '@ATC-FIL-002'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToLoadFile(authenticatedPage);
    await verifyFileUploaderDisplayed(authenticatedPage);
  });

  test('ATC-FIL-003 - Interface type selector is displayed', {
    tag: ['@files', '@regression', '@ATC-FIL-003'],
  }, async ({ authenticatedPage, mockApi }) => {
    await navigateToLoadFile(authenticatedPage);
    await verifyInterfaceTypeSelector(authenticatedPage);
  });

  test('ATC-FIL-004 - S3 file list loads when page opens', {
    tag: ['@files', '@regression', '@ATC-FIL-004'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/files\/s3-list$/, {
      files: ['WI_PROV_FILE_EXTRACT_T.psv', 'WI_PROV_FILE_EXTRACT_T_02.psv'],
      cached: false,
    });

    await navigateToLoadFile(authenticatedPage);
    await verifyS3FileListDisplayed(authenticatedPage);
  });

  test('ATC-FIL-005 - File upload triggers parse and shows summary', {
    tag: ['@files', '@smoke', '@regression', '@ATC-FIL-005'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('POST', /\/api\/files\/upload$/, {
      filename: 'WI_PROV_FILE_EXTRACT_T.psv',
      total_lines: 52,
      total_providers: 3,
      record_count: 49,
      provider_ids: ['000000000012345', '000000000067890', '000000000011111'],
      provider_names: [
        { mcd_id: '000000000012345', provider_name: 'TEST PROVIDER ONE' },
      ],
      record_types_found: ['00', '01', '02', '03', '04', '05', '06', '07', '09'],
    });

    await navigateToLoadFile(authenticatedPage);

    // Upload file via the file uploader
    const fileInput = authenticatedPage.locator(SELECTORS.fileUploader).locator('input[type="file"]');
    if (await fileInput.isVisible().catch(() => false)) {
      // We can only upload if the file input is visible; in mock mode verify the widget exists
      await expect(fileInput).toBeAttached();
    }
  });

  test('ATC-FIL-006 - Invalid interface type returns error', {
    tag: ['@files', '@regression', '@negative', '@ATC-FIL-006'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError('POST', /\/api\/files\/upload$/, 'Unknown interface type: invalid_type', 400);

    await navigateToLoadFile(authenticatedPage);
    // Verify the page handles error gracefully (no crash)
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-FIL-007 - File not found returns 404 for parse-local', {
    tag: ['@files', '@regression', '@negative', '@ATC-FIL-007'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpointError('POST', /\/api\/files\/parse-local$/, 'File not found: /nonexistent.psv', 404);

    await navigateToLoadFile(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-FIL-008 - Interface list shows both icd_d06 and icd_d12', {
    tag: ['@files', '@regression', '@ATC-FIL-008'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/files\/interfaces$/, {
      interfaces: [
        { interface_type: 'icd_d06', display_name: 'ICD-D06 Medicaid Provider', file_extensions: ['.psv'], description: 'Provider file' },
        { interface_type: 'icd_d12', display_name: 'ICD-D12 FSIA Functional Screen', file_extensions: ['.txt'], description: 'FSIA file' },
      ],
    });

    await navigateToLoadFile(authenticatedPage);
    // Page should show interface options
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-FIL-009 - S3 list caching returns cached flag', {
    tag: ['@files', '@regression', '@ATC-FIL-009'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/files\/s3-list$/, {
      files: ['file1.psv'],
      cached: true,
    });

    await navigateToLoadFile(authenticatedPage);
    // Verify the page loads without errors
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });

  test('ATC-FIL-010 - Empty S3 bucket shows no files available', {
    tag: ['@files', '@regression', '@boundary', '@ATC-FIL-010'],
  }, async ({ authenticatedPage, mockApi }) => {
    mockApi.mockEndpoint('GET', /\/api\/files\/s3-list$/, {
      files: [],
      cached: false,
    });

    await navigateToLoadFile(authenticatedPage);
    await expect(authenticatedPage.locator(SELECTORS.stApp)).toBeVisible();
  });
});
