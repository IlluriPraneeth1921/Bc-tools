/**
 * Files Module — Reusable ATC Action Functions
 *
 * Exported actions for file upload, parsing, S3 operations, and interface management.
 * Composed into UJTs for end-to-end file processing journeys.
 *
 * @module files
 */

import { Page, expect } from '@playwright/test';
import { SELECTORS } from '../../../fixtures/selectors';

/**
 * ATC-FIL-001 action: Navigate to the Load File page.
 */
export async function navigateToLoadFile(page: Page): Promise<void> {
  await page.locator(SELECTORS.navLoadFile).click();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(SELECTORS.loadFileTitle)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-FIL-002 action: Verify file uploader is displayed.
 */
export async function verifyFileUploaderDisplayed(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.fileUploader)).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-FIL-003 action: Upload a test file via the file uploader widget.
 */
export async function uploadTestFile(page: Page, filePath: string): Promise<void> {
  const fileInput = page.locator(SELECTORS.fileUploader).locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  await page.waitForLoadState('networkidle');
}

/**
 * ATC-FIL-004 action: Verify parse summary is displayed after file upload.
 */
export async function verifyParseSummaryDisplayed(page: Page): Promise<void> {
  // After upload, a summary with provider counts should appear
  await expect(page.locator(':text("provider"), :text("Provider")').first()).toBeVisible({ timeout: 15_000 });
}

/**
 * ATC-FIL-005 action: Verify S3 file list is available.
 */
export async function verifyS3FileListDisplayed(page: Page): Promise<void> {
  // The S3 file list renders as a table or selectbox with file names
  const fileListOrSelect = page.locator('[data-testid="stDataFrame"], [data-testid="stSelectbox"]').first();
  await expect(fileListOrSelect).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-FIL-006 action: Verify interface type selector is present.
 */
export async function verifyInterfaceTypeSelector(page: Page): Promise<void> {
  await expect(page.locator(SELECTORS.interfaceTypeSelect).first()).toBeVisible({ timeout: 10_000 });
}

/**
 * ATC-FIL-007 action: Select interface type from dropdown.
 */
export async function selectInterfaceType(page: Page, interfaceType: string): Promise<void> {
  const selectbox = page.locator(SELECTORS.interfaceTypeSelect).first();
  await selectbox.click();
  await page.locator(`li:has-text("${interfaceType}")`).click();
}
