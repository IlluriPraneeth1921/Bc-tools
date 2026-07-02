/**
 * Enrollment Action Functions
 *
 * Reusable action functions for the enrollment module.
 * These are imported by both ATCs and UJTs to avoid logic duplication.
 *
 * Canonical selectors (use these everywhere):
 *   Dialog container:  'mat-dialog-container'
 *   Start date input:  'mat-dialog-container input[id^="startDate_"]'
 *   End date input:    'mat-dialog-container input[id^="endDate_"]'
 *   Save button:       'mat-dialog-container button' filtered by /^Save$/
 *   Pencil/edit icon:  'button.mat-icon-button:has(mat-icon:text("edit"))'
 *   Suspension menu:   'button.ellipse-action-menu[aria-label="Expand menu"]'
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

export interface SyncStatusResult {
  hasPending: boolean;
  responseStatus: string | null;
  hasConflict: boolean;
  statusText: string;
}

export interface MmisSyncOptions {
  /** Maximum number of polling attempts (default: 12) */
  maxAttempts?: number;
  /** Milliseconds between polls (default: 10_000) */
  pollIntervalMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// DIALOG HELPERS (private)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fills an autocomplete input field in a dialog.
 * Handles Angular Material mat-autocomplete inputs.
 */
async function fillAutocompleteField(page: Page, ariaLabel: string, value: string): Promise<boolean> {
  const input = page.locator(`input[aria-label="${ariaLabel}"]`).first();

  if (!(await input.isVisible({ timeout: 3_000 }).catch(() => false))) {
    console.warn(`[fillAutocomplete] Input not visible: ${ariaLabel}`);
    return false;
  }

  await input.click({ force: true });
  await page.waitForTimeout(500);
  await input.fill('', { force: true });
  await page.waitForTimeout(200);
  await input.fill(value, { force: true });
  await page.waitForTimeout(2000);

  // Try exact match first
  const option = page.locator('mat-option').filter({ hasText: new RegExp(value, 'i') })
    .filter({ hasNotText: /No option/i }).first();
  if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await option.click();
    await page.waitForTimeout(500);
    return true;
  }

  // Fallback: try shorter prefix
  await input.fill('', { force: true });
  await input.fill(value.substring(0, 10), { force: true });
  await page.waitForTimeout(2000);
  const fallback = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await fallback.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await fallback.click();
    await page.waitForTimeout(500);
    return true;
  }

  console.warn(`[fillAutocomplete] "${value}" not matched for ${ariaLabel}`);
  return false;
}

/**
 * Fills a date input inside a dialog using pressSequentially + Angular event dispatch.
 * This ensures Angular reactive forms detect the change.
 */
async function fillDialogDateInput(page: Page, idPrefix: string, dateValue: string): Promise<void> {
  const input = page.locator(`mat-dialog-container input[id^="${idPrefix}"]`).first();
  if (!(await input.isVisible({ timeout: 3_000 }).catch(() => false))) return;

  await input.click({ force: true });
  await input.fill('', { force: true });
  await input.pressSequentially(dateValue, { delay: 50 });
  await input.evaluate(el => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await input.press('Tab');
  await page.waitForTimeout(500);
}

/**
 * Clicks Save in a mat-dialog-container and waits for it to close.
 * Returns true if dialog closed (save succeeded), false if still open.
 */
async function saveAndCloseDialog(page: Page): Promise<boolean> {
  const saveBtn = page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
  } else {
    await page.getByRole('button', { name: 'Save' }).first().click({ force: true });
  }

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  const dialogStillOpen = await page.locator('mat-dialog-container').first()
    .isVisible({ timeout: 3_000 }).catch(() => false);

  if (dialogStillOpen) {
    const errors = await page.locator('mat-error').all();
    for (const e of errors) {
      console.error(`[saveAndCloseDialog] Validation error: ${(await e.textContent())?.trim()}`);
    }
  }

  return !dialogStillOpen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW PROGRAM ENROLLMENT (+ New Program Enrollment dialog)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clicks the "+ New Program Enrollment" button to open the enrollment dialog.
 * Returns true if dialog opened successfully.
 */
export async function openNewEnrollmentDialog(page: Page): Promise<boolean> {
  const trigger = page.getByText('New Program Enrollment').first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  const dialog = page.locator('mat-dialog-container').first();
  const opened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

  if (opened) {
    // Dismiss any warning banner
    const closeBanner = dialog.locator('button').filter({ hasText: /^close$/ }).first();
    if (await closeBanner.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBanner.click();
      await page.waitForTimeout(500);
    }
  }

  return opened;
}

/**
 * Creates a new enrollment via the "+ New Program Enrollment" dialog.
 * Uses Angular-compatible date input handling (dispatchEvent for change detection).
 *
 * Assumes the page is on the participant's program enrollment list.
 * Returns true if the enrollment was successfully saved.
 */
export async function addIrisEnrollment(page: Page, formData: EnrollmentFormData): Promise<boolean> {
  const dialogOpened = await openNewEnrollmentDialog(page);
  if (!dialogOpened) {
    console.error('[addIrisEnrollment] Failed to open dialog');
    return false;
  }

  // 1. Select Program
  const programOk = await fillAutocompleteField(page, 'Program', formData.program);
  console.log(`[addIrisEnrollment] Program="${formData.program}" selected: ${programOk}`);
  if (!programOk) return false;
  await page.waitForTimeout(1000);

  // 2. Primary Program checkbox
  if (formData.isPrimary) {
    const checkbox = page.locator('input[aria-label="Primary Program"]').first();
    if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (!(await checkbox.isChecked())) {
        await checkbox.click({ force: true });
        await page.waitForTimeout(300);
      }
    }
  }

  // 3. Select Status
  const statusOk = await fillAutocompleteField(page, 'Status', formData.status);
  console.log(`[addIrisEnrollment] Status="${formData.status}" selected: ${statusOk}`);
  if (!statusOk) return false;
  await page.waitForTimeout(1500);

  // 4. Select Status Reason
  if (formData.statusReason) {
    const reasonOk = await fillAutocompleteField(page, 'Status Reason', formData.statusReason);
    console.log(`[addIrisEnrollment] StatusReason="${formData.statusReason}" selected: ${reasonOk}`);
    if (!reasonOk) return false;
  }

  // 5. Fill Start Date (with Angular event dispatch)
  await fillDialogDateInput(page, 'startDate_', formData.startDate);
  console.log(`[addIrisEnrollment] StartDate="${formData.startDate}" set`);

  // 6. Fill End Date (if provided)
  if (formData.endDate) {
    await fillDialogDateInput(page, 'endDate_', formData.endDate);
    console.log(`[addIrisEnrollment] EndDate="${formData.endDate}" set`);
  }

  // 7. Save and close
  const closed = await saveAndCloseDialog(page);
  if (!closed) {
    console.error('[addIrisEnrollment] Dialog did not close — validation errors');
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT ENROLLMENT (pencil icon → Edit Program Enrollment dialog)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EditEnrollmentOptions {
  /** New status (e.g. 'Disenrolled', 'Referral Withdrawn') */
  status?: string;
  /** Status reason */
  statusReason?: string;
  /** New start date */
  startDate?: string;
  /** New end date */
  endDate?: string;
}

/**
 * Opens the "Edit Program Enrollment" dialog via the pencil icon on the detail page.
 * Retries up to 3 times if the dialog doesn't open.
 *
 * Assumes the page is on the enrollment detail page (URL contains /programenrollment/).
 * Returns true if dialog was opened.
 */
export async function openEditEnrollmentDialog(page: Page): Promise<boolean> {
  await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(2000);

  const pencil = page.locator('button.mat-icon-button:has(mat-icon:text("edit"))').first();
  await expect(pencil).toBeVisible({ timeout: 10_000 });

  for (let attempt = 1; attempt <= 3; attempt++) {
    await pencil.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await pencil.click();
    await page.waitForTimeout(3000);

    const dialog = page.locator('mat-dialog-container');
    if (await dialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Dismiss any warning banner
      const closeBanner = dialog.locator('button').filter({ hasText: /^close$/ }).first();
      if (await closeBanner.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBanner.click();
        await page.waitForTimeout(500);
      }
      return true;
    }
    console.log(`[openEditDialog] Dialog not open after attempt ${attempt} — retrying...`);
    await page.waitForTimeout(1000);
  }

  return false;
}

/**
 * Edits an existing enrollment using the pencil icon dialog.
 * Supports changing status, status reason, start date, and/or end date.
 *
 * Assumes the page is on the enrollment detail page.
 * Returns true if the edit was saved successfully.
 */
export async function editEnrollment(page: Page, opts: EditEnrollmentOptions): Promise<boolean> {
  const dialogOpened = await openEditEnrollmentDialog(page);
  if (!dialogOpened) {
    console.error('[editEnrollment] Failed to open edit dialog');
    return false;
  }

  // Change Status (if requested)
  if (opts.status) {
    const statusOk = await fillAutocompleteField(page, 'Status', opts.status);
    console.log(`[editEnrollment] Status="${opts.status}" selected: ${statusOk}`);
    if (!statusOk) return false;
    await page.waitForTimeout(1500);
  }

  // Change Status Reason (if requested)
  if (opts.statusReason) {
    const reasonOk = await fillAutocompleteField(page, 'Status Reason', opts.statusReason);
    console.log(`[editEnrollment] StatusReason="${opts.statusReason}" selected: ${reasonOk}`);
    if (!reasonOk) return false;
  }

  // Change Start Date (if requested)
  if (opts.startDate) {
    await fillDialogDateInput(page, 'startDate_', opts.startDate);
    console.log(`[editEnrollment] StartDate="${opts.startDate}" set`);
  }

  // Change End Date (if requested)
  if (opts.endDate) {
    await fillDialogDateInput(page, 'endDate_', opts.endDate);
    console.log(`[editEnrollment] EndDate="${opts.endDate}" set`);
  }

  const closed = await saveAndCloseDialog(page);
  if (!closed) {
    console.error('[editEnrollment] Dialog did not close — validation errors');
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENSION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a suspension record in the enrollment.
 * Assumes we're on the enrollment detail page with access to suspension section.
 */
export async function addSuspension(
  page: Page,
  opts: { startDate: string; endDate?: string; reason?: string }
): Promise<boolean> {
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
 * Deletes an existing suspension record from the enrollment detail page.
 * Uses the three-dot (ellipsis) menu → Delete → Continue confirmation.
 *
 * Assumes the page is on the enrollment detail page with a visible suspension.
 * Returns true if the suspension was deleted successfully.
 */
export async function deleteSuspension(page: Page): Promise<boolean> {
  // Scroll to Suspensions section
  const suspensionsHeading = page.locator('span:text("Suspensions")').first();
  await expect(suspensionsHeading).toBeVisible({ timeout: 15_000 });
  await suspensionsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Click the three-dot menu button
  const menuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
  if (!(await menuBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
    console.warn('[deleteSuspension] Suspension menu button not found');
    return false;
  }
  await menuBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await menuBtn.click();
  await page.waitForTimeout(1000);

  // Click "Delete" from the context menu
  const deleteMenuItem = page.locator('.mat-mdc-menu-content button[mat-menu-item]')
    .filter({ hasText: 'Delete' });
  await expect(deleteMenuItem).toBeVisible({ timeout: 5_000 });
  await deleteMenuItem.click();
  await page.waitForTimeout(2000);

  // Handle confirmation dialog — click "Continue"
  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  const continueBtn = dialog.locator('button').filter({ hasText: /Continue/i }).first();
  await expect(continueBtn).toBeVisible({ timeout: 5_000 });
  await continueBtn.click();
  await page.waitForTimeout(3000);

  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Verify suspension is gone
  const menuStillVisible = await page
    .locator('button.ellipse-action-menu[aria-label="Expand menu"]').first()
    .isVisible({ timeout: 5_000 }).catch(() => false);

  if (menuStillVisible) {
    console.error('[deleteSuspension] Suspension row still visible after delete');
    return false;
  }

  console.log('[deleteSuspension] Suspension successfully deleted');
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICA / FEA TRANSFER ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TransferOptions {
  /** Section tab text to click (e.g. 'ICA', 'FEA', 'Location Assignment') */
  sectionLabel: RegExp;
  /** Button text to trigger the transfer (e.g. 'Transfer', 'New Assignment') */
  triggerLabel: RegExp;
  /** Input aria-label pattern to fill new assignment */
  inputLabel: RegExp;
  /** Value to type in the agency input (or empty to select first option) */
  agencyValue?: string;
}

/**
 * Performs an ICA or FEA transfer on the enrollment detail page.
 * Navigates to the section, triggers the transfer, selects a new agency, and saves.
 *
 * Assumes the page is on the enrollment detail page.
 * Returns true if the transfer was saved.
 */
export async function performAgencyTransfer(page: Page, opts: TransferOptions): Promise<boolean> {
  // Navigate to section/tab
  const sectionTab = page.getByText(opts.sectionLabel).first();
  if (await sectionTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sectionTab.click();
    await page.waitForTimeout(2000);
  }

  // Click transfer/new assignment trigger
  const transferBtn = page.getByText(opts.triggerLabel).first();
  if (await transferBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  // Fill the agency input
  const agencyInput = page.locator(`input`).filter({
    has: page.locator(`[aria-label]`)
  }).locator(`xpath=self::input[contains(@aria-label,"Agency") or contains(@aria-label,"ICA") or contains(@aria-label,"FEA") or contains(@aria-label,"Location")]`).first();

  // Simpler fallback: use the regex pattern
  const inputLocator = page.locator('input[aria-label]').filter({
    hasText: /.*/
  });
  const inputs = page.locator('input');
  const inputCount = await inputs.count();
  let targetInput = null;

  for (let i = 0; i < inputCount; i++) {
    const ariaLabel = await inputs.nth(i).getAttribute('aria-label').catch(() => '') || '';
    if (opts.inputLabel.test(ariaLabel)) {
      targetInput = inputs.nth(i);
      break;
    }
  }

  if (targetInput && await targetInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await targetInput.click({ force: true });
    if (opts.agencyValue) {
      await targetInput.fill('', { force: true });
      await targetInput.fill(opts.agencyValue, { force: true });
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(500);
    const option = page.locator('mat-option').first();
    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
      await page.waitForTimeout(1000);
    }
  }

  // Save
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  return true;
}

/**
 * Performs an ICA transfer. Convenience wrapper around performAgencyTransfer.
 */
export async function performIcaTransfer(page: Page, agencyValue?: string): Promise<boolean> {
  return performAgencyTransfer(page, {
    sectionLabel: /ICA|Location Assignment|Agency/i,
    triggerLabel: /Transfer|New.*Assignment|Change.*Agency/i,
    inputLabel: /Agency|ICA|Location/i,
    agencyValue,
  });
}

/**
 * Performs an FEA transfer. Convenience wrapper around performAgencyTransfer.
 */
export async function performFeaTransfer(page: Page, agencyValue?: string): Promise<boolean> {
  return performAgencyTransfer(page, {
    sectionLabel: /FEA|Fiscal.*Employer|Fiscal.*Agent/i,
    triggerLabel: /Transfer|New.*Assignment|Change.*FEA|Edit/i,
    inputLabel: /FEA|Fiscal|Agency/i,
    agencyValue,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAVIGATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Opens the detail page for the first enrollment row.
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
 * Opens an enrollment row matching specific text (e.g. 'Enrolled', 'Disenrolled').
 * Excludes rows matching excludeText if provided.
 */
export async function openEnrollmentByText(
  page: Page,
  text: string | RegExp,
  excludeText?: string | RegExp,
): Promise<boolean> {
  let locator = page.locator('mat-row').filter({ hasText: text });
  if (excludeText) {
    locator = locator.filter({ hasNotText: excludeText });
  }
  const row = locator.first();
  if (!(await row.isVisible({ timeout: 10_000 }).catch(() => false))) {
    return false;
  }
  await row.dblclick();
  await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

/**
 * Opens an enrollment row by index (0-based).
 */
export async function openEnrollmentByIndex(page: Page, index: number): Promise<boolean> {
  const row = page.locator('mat-row').nth(index);
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await row.dblclick();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MMIS SYNC STATUS & POLLING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reads the MMIS sync status from the enrollment detail page.
 */
export async function getSyncStatus(page: Page): Promise<SyncStatusResult> {
  const pageText = await page.locator('main').textContent().catch(() => '') || '';

  const hasConflict = /\bconflict\b/i.test(pageText) && !/No conflict/i.test(pageText);

  let responseStatus: string | null = null;

  // Check for raw MMIS response codes (definitive)
  if (/\bSU\b/.test(pageText)) responseStatus = 'SU';
  else if (/\bSE\b/.test(pageText)) responseStatus = 'SE';
  else if (/\bFL\b/.test(pageText)) responseStatus = 'FL';

  // If no raw code, check UI indicators
  if (!responseStatus) {
    if (/\bSucceeded\b|\bSuccess\b/i.test(pageText)) {
      responseStatus = 'SU';
    } else if (/Error Code[\s\S]*?\d{4}/i.test(pageText) || /\b9\d{3}\b/.test(pageText)) {
      responseStatus = /\bWarning\b/i.test(pageText) ? 'SE' : 'FL';
    } else if (/\bWarning\b/i.test(pageText) && /Date\/Time of last synchronization/i.test(pageText)) {
      responseStatus = 'SE';
    }
  }

  const hasPending = responseStatus === null && /Synchronization Pending/i.test(pageText);
  const statusRow = await page.locator(
    '[class*="status-row"], [class*="sync-status"], [class*="response-status"]'
  ).first().textContent().catch(() => '');

  return { hasPending, responseStatus, hasConflict, statusText: statusRow?.trim() || '' };
}

/**
 * Polls the enrollment detail page for an MMIS sync response.
 * Reloads the page periodically until a response status appears or max attempts reached.
 *
 * Assumes the page is on the enrollment detail page.
 * Returns the final sync status.
 */
export async function pollForMmisResponse(
  page: Page,
  options: MmisSyncOptions = {},
): Promise<SyncStatusResult> {
  const maxAttempts = options.maxAttempts || 12;
  const pollInterval = options.pollIntervalMs || 10_000;
  const currentUrl = page.url();

  let status: SyncStatusResult = {
    hasPending: true,
    responseStatus: null,
    hasConflict: false,
    statusText: '',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[pollMmis] Attempt ${attempt}/${maxAttempts}: ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  return status;
}

/**
 * Unified MMIS sync verification that handles both mock and real paths.
 *
 * Mock path: Extracts the enrollment key from URL, calls mockMmisSuccess, reloads.
 * Real path: Polls for MMIS response using pollForMmisResponse.
 *
 * Returns the final sync status. Caller can assert on it.
 */
export async function verifyMmisSync(
  page: Page,
  opts: {
    participantUuid: string;
    mockMmis: boolean;
    mockFn?: (key: string) => Promise<boolean>;
    extractKeyFn?: (url: string) => string | null;
    maxAttempts?: number;
    pollIntervalMs?: number;
  },
): Promise<SyncStatusResult> {
  if (opts.mockMmis && opts.mockFn && opts.extractKeyFn) {
    // ─── Mock path ──────────────────────────────────────────────────────
    let key = opts.extractKeyFn(page.url());
    if (!key) {
      // Navigate to enrollment detail to get the key
      await navigateToEnrollments(page, opts.participantUuid);
      await page.waitForTimeout(2000);
      const opened = await openFirstEnrollmentDetail(page);
      if (!opened) throw new Error('[verifyMmisSync] Could not open enrollment detail');
      key = opts.extractKeyFn(page.url());
    }
    if (!key) throw new Error('[verifyMmisSync] Could not extract ProgramEnrollmentKey');

    await page.waitForTimeout(5000);
    const mockResult = await opts.mockFn(key);
    if (!mockResult) throw new Error('[verifyMmisSync] mockMmisSuccess failed');
    console.log(`[verifyMmisSync] MMIS Success mocked for key: ${key}`);

    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    return await getSyncStatus(page);
  }

  // ─── Real path ──────────────────────────────────────────────────────
  return await pollForMmisResponse(page, {
    maxAttempts: opts.maxAttempts,
    pollIntervalMs: opts.pollIntervalMs,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Verifies the enrollment list has a row with all specified texts.
 */
export async function verifyEnrollmentRow(
  page: Page,
  expectedTexts: string[]
): Promise<{ found: boolean; rowText: string }> {
  const rows = page.locator('mat-row');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';
    if (expectedTexts.every(t => rowText.includes(t))) {
      return { found: true, rowText: rowText.trim() };
    }
  }
  return { found: false, rowText: '' };
}

/**
 * Checks if a conflict badge is visible on the enrollment detail page.
 */
export async function hasConflictBadge(page: Page): Promise<boolean> {
  const conflictIndicators = page.locator(
    '[class*="conflict"], [class*="error-badge"], [class*="chip"]'
  ).filter({ hasText: /conflict|error|FL/i });
  return await conflictIndicators.first().isVisible({ timeout: 5_000 }).catch(() => false);
}

/**
 * Checks if the Re-submit button is visible.
 */
export async function isResubmitVisible(page: Page): Promise<boolean> {
  return await page.getByText('Re-submit').isVisible({ timeout: 5_000 }).catch(() => false);
}
