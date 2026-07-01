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

const MA_ID = process.env.TEST_MA_ID || '1430000013';

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

  const firstName = process.env.TEST_PERSON_FIRST || 'THREE';
  const lastName = process.env.TEST_PERSON_LAST || 'TESTFEI';
  console.log(`[resolver] Trying name search: ${firstName} ${lastName}`);
  uuid = await findParticipantByName(page, firstName, lastName);
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
 *
 * Detection logic based on actual UI structure:
 * - "Warning" badge in MMIS Transaction List section = SE (Success with Errors) or SU with warning
 * - "Success" / "Succeeded" text = SU
 * - "Failed" / "Error" text with Re-submit visible = FL
 * - Error codes visible (like 9199) = MMIS has responded
 * - "MMIS Synchronization Pending" alone (no error codes, no badge) = truly pending
 */
export async function getSyncStatus(page: Page): Promise<{
  hasPending: boolean;
  responseStatus: string | null;
  hasConflict: boolean;
  statusText: string;
}> {
  const pageText = await page.locator('main').textContent().catch(() => '') || '';

  const hasConflict = /\bconflict\b/i.test(pageText) && !/No conflict/i.test(pageText);

  let responseStatus: string | null = null;

  // Check for raw MMIS response codes (definitive)
  if (/\bSU\b/.test(pageText)) responseStatus = 'SU';
  else if (/\bSE\b/.test(pageText)) responseStatus = 'SE';
  else if (/\bFL\b/.test(pageText)) responseStatus = 'FL';

  // If no raw code found, check for UI indicators
  if (!responseStatus) {
    // "Succeeded" or "Success" near MMIS context
    if (/\bSucceeded\b|\bSuccess\b/i.test(pageText)) {
      responseStatus = 'SU';
    }
    // Error codes visible (4-digit numbers like 9199, 9156, etc.) = MMIS responded
    else if (/Error Code[\s\S]*?\d{4}/i.test(pageText) || /\b9\d{3}\b/.test(pageText)) {
      // Has error codes — check if it's a warning (SE) or failure (FL)
      // "Warning" badge + error codes = SE (success with errors, enrollment still processed)
      if (/\bWarning\b/i.test(pageText)) {
        responseStatus = 'SE';
      } else {
        responseStatus = 'FL';
      }
    }
    // "Warning" badge visible in MMIS section with "Date/Time of last synchronization" = response received
    else if (/\bWarning\b/i.test(pageText) && /Date\/Time of last synchronization/i.test(pageText)) {
      responseStatus = 'SE';
    }
  }

  // hasPending only if truly no response detected
  const hasPending = responseStatus === null && /Synchronization Pending/i.test(pageText);

  // Get the status area text for logging
  const statusRow = await page.locator('[class*="status-row"], [class*="sync-status"], [class*="response-status"]').first().textContent().catch(() => '');

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


/**
 * Navigates to the suspensions tab/section for an enrollment.
 * Assumes we are on the enrollment detail page.
 */
export async function navigateToSuspensions(page: Page, participantUuid: string): Promise<void> {
  await page.goto(`${BASE}/#/persons/person/${participantUuid}/programenrollments`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

/**
 * Creates a suspension record in the enrollment.
 * Assumes we're on the enrollment detail page with access to suspension section.
 */
export async function addSuspension(
  page: Page,
  opts: { startDate: string; endDate?: string; reason?: string }
): Promise<boolean> {
  // Look for add suspension button/link
  const addSuspBtn = page.getByText(/Add Suspension|New Suspension|\+ Suspension/i).first();
  if (!(await addSuspBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
    console.warn('[addSuspension] Suspension button not found');
    return false;
  }
  await addSuspBtn.click();
  await page.waitForTimeout(2000);

  // Fill start date
  const startInput = page.locator('input[id*="suspensionStart"], input[id*="startDate"]').first();
  if (await startInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await startInput.click({ force: true });
    await startInput.fill('', { force: true });
    await startInput.pressSequentially(opts.startDate, { delay: 50 });
    await startInput.press('Tab');
    await page.waitForTimeout(300);
  }

  // Fill end date (if provided)
  if (opts.endDate) {
    const endInput = page.locator('input[id*="suspensionEnd"], input[id*="endDate"]').first();
    if (await endInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await endInput.click({ force: true });
      await endInput.fill('', { force: true });
      await endInput.pressSequentially(opts.endDate, { delay: 50 });
      await endInput.press('Tab');
      await page.waitForTimeout(300);
    }
  }

  // Fill reason (if provided)
  if (opts.reason) {
    const reasonInput = page.locator('input[aria-label*="Reason"], input[id*="reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await reasonInput.fill(opts.reason, { force: true });
      await page.waitForTimeout(1000);
      const reasonOpt = page.locator('mat-option').first();
      if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reasonOpt.click();
      }
    }
  }

  // Save
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  return true;
}

/**
 * Opens a specific enrollment row by index (0-based).
 */
export async function openEnrollmentByIndex(page: Page, index: number): Promise<boolean> {
  const rows = page.locator('mat-row');
  const row = rows.nth(index);
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await row.dblclick();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

/**
 * Opens an enrollment row matching specific text.
 */
export async function openEnrollmentByText(page: Page, text: string): Promise<boolean> {
  const row = page.locator('mat-row').filter({ hasText: text }).first();
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await row.dblclick();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

/**
 * Verifies that error messages are displayed in the MMIS transaction area.
 */
export async function getMMISErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  const errorElements = await page.locator('[class*="error"], [class*="conflict"], mat-cell').all();
  for (const el of errorElements) {
    const text = (await el.textContent() || '').trim();
    if (text && (text.includes('9') || text.includes('Error') || text.includes('FL'))) {
      errors.push(text);
    }
  }
  return errors;
}

/**
 * Verifies the enrollment list has a row with specified content.
 */
export async function verifyEnrollmentRow(
  page: Page,
  expectedTexts: string[]
): Promise<{ found: boolean; rowText: string }> {
  const rows = page.locator('mat-row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';
    const allMatch = expectedTexts.every(t => rowText.includes(t));
    if (allMatch) {
      return { found: true, rowText: rowText.trim() };
    }
  }
  return { found: false, rowText: '' };
}

/**
 * Waits for conflict/error badge to appear on the enrollment detail.
 */
export async function hasConflictBadge(page: Page): Promise<boolean> {
  const conflictIndicators = page.locator('[class*="conflict"], [class*="error-badge"], [class*="chip"]').filter({
    hasText: /conflict|error|FL/i
  });
  return await conflictIndicators.first().isVisible({ timeout: 5_000 }).catch(() => false);
}

/**
 * Checks if the Re-submit button is visible.
 */
export async function isResubmitVisible(page: Page): Promise<boolean> {
  return await page.getByText('Re-submit').isVisible({ timeout: 5_000 }).catch(() => false);
}
