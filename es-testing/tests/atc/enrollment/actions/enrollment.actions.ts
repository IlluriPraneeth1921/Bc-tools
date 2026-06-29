/**
 * Enrollment Action Functions
 *
 * Reusable action functions for the enrollment module.
 * These are imported by both ATCs and UJTs to avoid logic duplication.
 */
import { Page, expect } from '@playwright/test';
import { BASE } from '../../../helpers/login';
import {
  findParticipantByMaId,
  findParticipantByName,
  navigateToEnrollments,
} from '../../../helpers/participant-resolver';

const MA_ID = process.env.TEST_MA_ID || '1430000012';

export interface EnrollmentFormData {
  program: string;
  status: string;
  startDate: string;
  endDate?: string;
  isPrimary?: boolean;
  statusReason?: string;
}

/**
 * Resolves the test participant UUID.
 */
export async function resolveParticipantUuid(page: Page): Promise<string> {
  if (process.env.TEST_PERSON_UUID) {
    console.log('[resolver] Using TEST_PERSON_UUID from environment');
    return process.env.TEST_PERSON_UUID;
  }

  console.log(`[resolver] Searching for participant by MA ID: ${MA_ID}`);
  let uuid = await findParticipantByMaId(page, MA_ID);
  if (uuid) return uuid;

  console.log('[resolver] Trying name search: TWO TESTFEI');
  uuid = await findParticipantByName(page, 'TWO', 'TESTFEI');
  if (uuid) return uuid;

  throw new Error(`[resolver] FAILED: Could not find participant with MA ID "${MA_ID}". Set TEST_PERSON_UUID in .env.`);
}

/**
 * Clicks the "+ New Program Enrollment" span/link to open the dialog.
 * Returns true if dialog opened successfully.
 */
export async function openNewEnrollmentDialog(page: Page): Promise<boolean> {
  // The element is a <span> with text "New Program Enrollment"
  const trigger = page.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // Verify dialog opened
  const dialog = page.locator('.cdk-overlay-pane').first();
  return await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
}

/**
 * Fills an autocomplete input field in the enrollment dialog.
 * These fields look like dropdowns but are actually text inputs with mat-autocomplete.
 *
 * Strategy:
 * 1. Click the input to focus and open panel
 * 2. Clear and type the value
 * 3. Wait for mat-option to appear
 * 4. Click the matching option
 */
async function fillAutocompleteField(page: Page, ariaLabel: string, value: string): Promise<boolean> {
  const selector = `input[aria-label="${ariaLabel}"]`;
  const input = page.locator(selector).first();

  if (!(await input.isVisible({ timeout: 3_000 }).catch(() => false))) {
    console.warn(`[fillAutocomplete] Input not visible: ${ariaLabel}`);
    return false;
  }

  // Click the input to open the autocomplete panel
  await input.click({ force: true });
  await page.waitForTimeout(500);

  // Clear existing value and type new one
  await input.fill('', { force: true });
  await page.waitForTimeout(200);
  await input.fill(value, { force: true });
  await page.waitForTimeout(1500);

  // Look for the matching option
  const option = page.locator('mat-option').filter({ hasText: new RegExp(`^\\s*${value}\\s*$`) }).first();
  if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await option.click();
    await page.waitForTimeout(500);
    return true;
  }

  // Try case-insensitive partial match
  const optionPartial = page.locator('mat-option').filter({ hasText: new RegExp(value, 'i') }).first();
  if (await optionPartial.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await optionPartial.click();
    await page.waitForTimeout(500);
    return true;
  }

  // List what options ARE available for debugging
  const allOptions = await page.locator('mat-option').all();
  const optTexts: string[] = [];
  for (const o of allOptions) {
    const t = (await o.textContent() || '').trim();
    if (t) optTexts.push(t);
  }
  console.warn(`[fillAutocomplete] "${value}" not matched for ${ariaLabel}. Available: [${optTexts.join(', ')}]`);

  return false;
}

/**
 * Creates a new IRIS enrollment for the current participant.
 *
 * Form fields (all are autocomplete text inputs):
 * - Program: input[aria-label="Program"]
 * - Primary Program: checkbox
 * - Status: input[aria-label="Status"]
 * - Status Reason: input[aria-label="Status Reason"]
 * - Start Date: input[id^="startDate_"]
 * - End Date: input[id^="endDate_"]
 *
 * Assumes the page is on the participant's program enrollment list.
 * Returns true if the enrollment was successfully saved.
 */
export async function addIrisEnrollment(page: Page, formData: EnrollmentFormData): Promise<boolean> {
  // Open the dialog
  const dialogOpened = await openNewEnrollmentDialog(page);
  if (!dialogOpened) {
    console.error('[addIrisEnrollment] Failed to open dialog');
    return false;
  }

  // 1. Select Program
  const programOk = await fillAutocompleteField(page, 'Program', formData.program);
  console.log(`[addIrisEnrollment] Program="${formData.program}" selected: ${programOk}`);
  if (!programOk) return false;

  // Wait for dependent fields to update
  await page.waitForTimeout(1000);

  // 2. Primary Program checkbox
  if (formData.isPrimary) {
    const checkbox = page.locator('input[aria-label="Primary Program"]').first();
    if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const checked = await checkbox.isChecked();
      if (!checked) {
        await checkbox.click({ force: true });
        await page.waitForTimeout(300);
      }
    }
  }

  // 3. Select Status
  const statusOk = await fillAutocompleteField(page, 'Status', formData.status);
  console.log(`[addIrisEnrollment] Status="${formData.status}" selected: ${statusOk}`);
  if (!statusOk) return false;

  // Wait for Status Reason options to load (cascading dependency)
  await page.waitForTimeout(1500);

  // 4. Select Status Reason
  if (formData.statusReason) {
    const reasonOk = await fillAutocompleteField(page, 'Status Reason', formData.statusReason);
    console.log(`[addIrisEnrollment] StatusReason="${formData.statusReason}" selected: ${reasonOk}`);
    if (!reasonOk) return false;
  }

  // 5. Fill Start Date
  const startDateInput = page.locator('input[id^="startDate_"]').first();
  if (await startDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await startDateInput.click({ force: true });
    await startDateInput.fill(formData.startDate, { force: true });
    await startDateInput.press('Tab');
    await page.waitForTimeout(300);
  }

  // 6. Fill End Date (if provided)
  if (formData.endDate) {
    const endDateInput = page.locator('input[id^="endDate_"]').first();
    if (await endDateInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await endDateInput.click({ force: true });
      await endDateInput.fill(formData.endDate, { force: true });
      await endDateInput.press('Tab');
      await page.waitForTimeout(300);
    }
  }

  // 7. Click Save
  const saveBtn = page.locator('.cdk-overlay-pane button, mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
  if (!(await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.error('[addIrisEnrollment] Save button not found');
    return false;
  }

  await saveBtn.click();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Check if dialog closed (success)
  const dialogStillOpen = await page.locator('.cdk-overlay-pane mat-dialog-container').isVisible({ timeout: 3_000 }).catch(() => false);
  if (dialogStillOpen) {
    const errors = await page.locator('mat-error, [class*="error-message"]').all();
    for (const err of errors) {
      const text = await err.textContent();
      console.error(`[addIrisEnrollment] Validation error: ${text?.trim()}`);
    }
    return false;
  }

  return true;
}

/**
 * Opens the detail page for the first enrollment row.
 * Uses double-click on the first mat-row.
 */
export async function openFirstEnrollmentDetail(page: Page): Promise<boolean> {
  const firstRow = page.locator('mat-row').first();
  if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await firstRow.dblclick();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

/**
 * Checks the sync status indicators on the enrollment detail page.
 */
export async function getSyncStatus(page: Page): Promise<{
  hasPending: boolean;
  responseStatus: string | null;
  hasConflict: boolean;
  statusText: string;
}> {
  const pageText = await page.locator('main').textContent().catch(() => '') || '';

  const hasPending = pageText.includes('Synchronization Pending');
  const hasConflict = /conflict/i.test(pageText);

  let responseStatus: string | null = null;
  if (pageText.includes(' SU') || pageText.includes('"SU"')) responseStatus = 'SU';
  else if (pageText.includes(' SE') || pageText.includes('"SE"')) responseStatus = 'SE';
  else if (pageText.includes(' FL') || pageText.includes('"FL"')) responseStatus = 'FL';

  const statusRow = await page.locator('[class*="status-row"]').first().textContent().catch(() => '');

  return { hasPending, responseStatus, hasConflict, statusText: statusRow?.trim() || '' };
}

/**
 * Waits for MMIS sync to complete.
 */
export async function waitForSyncCompletion(page: Page, options: { timeout?: number } = {}): Promise<void> {
  const timeout = options.timeout || 60_000;
  const pollInterval = 3000;
  const maxAttempts = Math.ceil(timeout / pollInterval);

  for (let i = 0; i < maxAttempts; i++) {
    await page.waitForTimeout(pollInterval);
    const pageText = await page.locator('main').textContent().catch(() => '');
    if (pageText?.includes(' SU') || pageText?.includes(' SE') || pageText?.includes(' FL')) {
      return;
    }
    if (i > 0 && i % 5 === 0) {
      await page.reload({ waitUntil: 'networkidle', timeout: 15_000 }).catch(() => {});
    }
  }
}
