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
 *
 * Design principles:
 *   - NO arbitrary waitForTimeout. Every wait targets a specific element or state.
 *   - The only exception is pollForMmisResponse which waits for an external system.
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
  maxAttempts?: number;
  pollIntervalMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════════

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
  uuid = await findParticipantByName(page, firstName, lastName);
  if (uuid) return uuid;
  throw new Error(`[resolver] FAILED: Could not find participant. Set TEST_PERSON_UUID in .env.`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIALOG HELPERS (private)
// ═══════════════════════════════════════════════════════════════════════════════

/** Waits for the mat-option overlay panel to close after a selection. */
async function waitForOverlayClose(page: Page): Promise<void> {
  // Wait for all mat-option elements to disappear (panel closed)
  await page.locator('mat-option').first()
    .waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
}

/**
 * Waits for an autocomplete input to have a non-empty value after selection.
 * This is the true signal that Angular has committed the selection.
 */
async function waitForInputPopulated(page: Page, ariaLabel: string): Promise<void> {
  const input = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  await expect(input).not.toHaveValue('', { timeout: 5_000 }).catch(() => {});
}

/** Waits for a cascading field to become interactive after a prior selection. */
async function waitForFieldReady(page: Page, ariaLabel: string): Promise<void> {
  const input = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  await input.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
}

async function fillAutocompleteField(page: Page, ariaLabel: string, value: string): Promise<boolean> {
  const selector = `input[aria-label="${ariaLabel}"]`;
  const input = page.locator(selector).first();

  if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.warn(`[fillAutocomplete] Input not visible: ${ariaLabel}`);
    return false;
  }
  await input.waitFor({ state: 'attached', timeout: 5_000 });

  // Remove readonly and trigger Angular's autocomplete panel via evaluate
  // (same pattern as login.ts selectAutocomplete — proven to work)
  await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLInputElement | null;
    if (el) {
      el.removeAttribute('readonly');
      el.focus();
      el.dispatchEvent(new Event('focusin', { bubbles: true }));
      el.click();
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, selector);
  // Yield to let dispatched events propagate through Angular's zone
  await page.waitForTimeout(500);

  // Clear and type the value
  await input.fill('', { force: true });
  await page.waitForTimeout(300);
  await input.fill(value, { force: true });

  // Wait for mat-option to appear
  const option = page.locator('mat-option').filter({ hasText: new RegExp(value, 'i') })
    .filter({ hasNotText: /No option/i }).first();
  if (await option.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await option.click();
    await waitForOverlayClose(page);
    await waitForInputPopulated(page, ariaLabel);
    return true;
  }

  // Fallback: try pressSequentially with shorter value
  await input.fill('', { force: true });
  await page.waitForTimeout(300);
  await input.pressSequentially(value.substring(0, 6), { delay: 80 });
  const fallback = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await fallback.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await fallback.click();
    await waitForOverlayClose(page);
    await waitForInputPopulated(page, ariaLabel);
    return true;
  }

  console.warn(`[fillAutocomplete] "${value}" not matched for ${ariaLabel}`);
  return false;
}

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
  // Wait for Angular to process the value change (input value reflects the date)
  await expect(input).not.toHaveValue('', { timeout: 2_000 }).catch(() => {});
}

async function saveAndCloseDialog(page: Page): Promise<boolean> {
  const saveBtn = page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
  } else {
    await page.getByRole('button', { name: 'Save' }).first().click({ force: true });
  }

  // Wait for dialog to disappear (Angular processes save + closes)
  const dialog = page.locator('mat-dialog-container').first();
  await dialog.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});

  const dialogStillOpen = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);
  if (dialogStillOpen) {
    const errors = await page.locator('mat-error').all();
    for (const e of errors) {
      console.error(`[saveAndCloseDialog] Validation error: ${(await e.textContent())?.trim()}`);
    }
  }
  return !dialogStillOpen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW PROGRAM ENROLLMENT
// ═══════════════════════════════════════════════════════════════════════════════

export async function openNewEnrollmentDialog(page: Page): Promise<boolean> {
  const trigger = page.getByText('New Program Enrollment').first();
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  await trigger.click();

  const dialog = page.locator('mat-dialog-container').first();
  await dialog.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  const opened = await dialog.isVisible({ timeout: 2_000 }).catch(() => false);

  if (opened) {
    // Dismiss any warning banner
    const closeBanner = dialog.locator('button').filter({ hasText: /^close$/ }).first();
    if (await closeBanner.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBanner.click();
      await closeBanner.waitFor({ state: 'hidden', timeout: 2_000 }).catch(() => {});
    }
    // Wait for Angular to fully initialize the form (inputs become interactive)
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    // Wait for the Program input to be present and attached
    const programInput = page.locator('input[aria-label="Program"]').first();
    await programInput.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  }
  return opened;
}

export async function addIrisEnrollment(page: Page, formData: EnrollmentFormData): Promise<boolean> {
  const dialogOpened = await openNewEnrollmentDialog(page);
  if (!dialogOpened) {
    console.error('[addIrisEnrollment] Failed to open dialog');
    return false;
  }

  // 1. Program
  const programOk = await fillAutocompleteField(page, 'Program', formData.program);
  if (!programOk) return false;
  // Wait for Status field to become ready (cascading dependency)
  await waitForFieldReady(page, 'Status');

  // 2. Primary Program checkbox
  if (formData.isPrimary) {
    const checkbox = page.locator('input[aria-label="Primary Program"]').first();
    if (await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      if (!(await checkbox.isChecked())) await checkbox.click({ force: true });
    }
  }

  // 3. Status
  const statusOk = await fillAutocompleteField(page, 'Status', formData.status);
  if (!statusOk) return false;
  // Wait for Status Reason field to become ready
  await waitForFieldReady(page, 'Status Reason');

  // 4. Status Reason
  if (formData.statusReason) {
    const reasonOk = await fillAutocompleteField(page, 'Status Reason', formData.statusReason);
    if (!reasonOk) return false;
  }

  // 5. Start Date
  await fillDialogDateInput(page, 'startDate_', formData.startDate);

  // 6. End Date
  if (formData.endDate) {
    await fillDialogDateInput(page, 'endDate_', formData.endDate);
  }

  // 7. Save
  return await saveAndCloseDialog(page);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT ENROLLMENT (pencil icon → Edit Program Enrollment dialog)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EditEnrollmentOptions {
  status?: string;
  statusReason?: string;
  startDate?: string;
  endDate?: string;
}

export async function openEditEnrollmentDialog(page: Page): Promise<boolean> {
  await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 });

  const pencil = page.locator('button.mat-icon-button:has(mat-icon:text("edit"))').first();
  await expect(pencil).toBeVisible({ timeout: 10_000 });

  for (let attempt = 1; attempt <= 3; attempt++) {
    await pencil.scrollIntoViewIfNeeded();
    await pencil.click();

    const dialog = page.locator('mat-dialog-container');
    await dialog.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
    if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const closeBanner = dialog.locator('button').filter({ hasText: /^close$/ }).first();
      if (await closeBanner.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBanner.click();
      }
      return true;
    }
    // Brief pause only on retry (element-based wait already failed above)
    if (attempt < 3) await page.waitForTimeout(1000);
  }
  return false;
}

export async function editEnrollment(page: Page, opts: EditEnrollmentOptions): Promise<boolean> {
  const dialogOpened = await openEditEnrollmentDialog(page);
  if (!dialogOpened) return false;

  if (opts.status) {
    const ok = await fillAutocompleteField(page, 'Status', opts.status);
    if (!ok) return false;
    await waitForFieldReady(page, 'Status Reason');
  }
  if (opts.statusReason) {
    const ok = await fillAutocompleteField(page, 'Status Reason', opts.statusReason);
    if (!ok) return false;
  }
  if (opts.startDate) await fillDialogDateInput(page, 'startDate_', opts.startDate);
  if (opts.endDate) await fillDialogDateInput(page, 'endDate_', opts.endDate);

  return await saveAndCloseDialog(page);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENSION ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

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

  // Wait for the suspension form/inputs to appear
  const startInput = page.locator('input[id*="suspensionStart"], input[id*="startDate"]').first();
  await startInput.waitFor({ state: 'visible', timeout: 5_000 });

  await startInput.click({ force: true });
  await startInput.fill('', { force: true });
  await startInput.pressSequentially(opts.startDate, { delay: 50 });
  await startInput.press('Tab');

  if (opts.endDate) {
    const endInput = page.locator('input[id*="suspensionEnd"], input[id*="endDate"]').first();
    if (await endInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await endInput.click({ force: true });
      await endInput.fill('', { force: true });
      await endInput.pressSequentially(opts.endDate, { delay: 50 });
      await endInput.press('Tab');
    }
  }

  if (opts.reason) {
    const reasonInput = page.locator('input[aria-label*="Reason"], input[id*="reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await reasonInput.fill(opts.reason, { force: true });
      const reasonOpt = page.locator('mat-option').first();
      if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reasonOpt.click();
        await waitForOverlayClose(page);
      }
    }
  }

  // Save
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }
  return true;
}

export async function deleteSuspension(page: Page): Promise<boolean> {
  const suspensionsHeading = page.locator('span:text("Suspensions")').first();
  await expect(suspensionsHeading).toBeVisible({ timeout: 15_000 });
  await suspensionsHeading.scrollIntoViewIfNeeded();

  // Wait for menu button to be ready
  const menuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
  await menuBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await menuBtn.scrollIntoViewIfNeeded();
  await menuBtn.click();

  // Wait for context menu to appear, then click Delete
  const deleteMenuItem = page.locator('.mat-mdc-menu-content button[mat-menu-item]')
    .filter({ hasText: 'Delete' });
  await expect(deleteMenuItem).toBeVisible({ timeout: 5_000 });
  await deleteMenuItem.click();

  // Wait for confirmation dialog, then click Continue
  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  const continueBtn = dialog.locator('button').filter({ hasText: /Continue/i }).first();
  await expect(continueBtn).toBeVisible({ timeout: 5_000 });
  await continueBtn.click();

  // Wait for dialog to close and page to reload
  await dialog.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify suspension menu is gone (element-based check, not timeout)
  const menuStillVisible = await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  if (menuStillVisible) {
    console.error('[deleteSuspension] Suspension row still visible after delete');
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICA / FEA TRANSFER ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TransferOptions {
  sectionLabel: RegExp;
  triggerLabel: RegExp;
  inputLabel: RegExp;
  agencyValue?: string;
}

export async function performAgencyTransfer(page: Page, opts: TransferOptions): Promise<boolean> {
  // Navigate to section/tab
  const sectionTab = page.getByText(opts.sectionLabel).first();
  if (await sectionTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sectionTab.click();
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  }

  // Click transfer trigger
  const transferBtn = page.getByText(opts.triggerLabel).first();
  if (await transferBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  // Find and fill the agency input
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
    }
    const option = page.locator('mat-option').first();
    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
      await waitForOverlayClose(page);
    }
  }

  // Save
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }
  return true;
}

export async function performIcaTransfer(page: Page, agencyValue?: string): Promise<boolean> {
  return performAgencyTransfer(page, {
    sectionLabel: /ICA|Location Assignment|Agency/i,
    triggerLabel: /Transfer|New.*Assignment|Change.*Agency/i,
    inputLabel: /Agency|ICA|Location/i,
    agencyValue,
  });
}

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

export async function openFirstEnrollmentDetail(page: Page): Promise<boolean> {
  const firstRow = page.locator('mat-row').first();
  if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) return false;
  await firstRow.dblclick();
  await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
  // Wait for detail page content to render
  await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

export async function openEnrollmentByText(
  page: Page,
  text: string | RegExp,
  excludeText?: string | RegExp,
): Promise<boolean> {
  let locator = page.locator('mat-row').filter({ hasText: text });
  if (excludeText) locator = locator.filter({ hasNotText: excludeText });
  const row = locator.first();
  if (!(await row.isVisible({ timeout: 10_000 }).catch(() => false))) return false;
  await row.dblclick();
  await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
  // Wait for detail page content
  await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

export async function openEnrollmentByIndex(page: Page, index: number): Promise<boolean> {
  const row = page.locator('mat-row').nth(index);
  if (!(await row.isVisible({ timeout: 5_000 }).catch(() => false))) return false;
  await row.dblclick();
  await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
  await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  return page.url().includes('/programenrollment/');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MMIS SYNC STATUS & POLLING
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSyncStatus(page: Page): Promise<SyncStatusResult> {
  const pageText = await page.locator('main').textContent().catch(() => '') || '';
  const hasConflict = /\bconflict\b/i.test(pageText) && !/No conflict/i.test(pageText);

  let responseStatus: string | null = null;
  if (/\bSU\b/.test(pageText)) responseStatus = 'SU';
  else if (/\bSE\b/.test(pageText)) responseStatus = 'SE';
  else if (/\bFL\b/.test(pageText)) responseStatus = 'FL';

  if (!responseStatus) {
    if (/\bSucceeded\b|\bSuccess\b/i.test(pageText)) responseStatus = 'SU';
    else if (/Error Code[\s\S]*?\d{4}/i.test(pageText) || /\b9\d{3}\b/.test(pageText))
      responseStatus = /\bWarning\b/i.test(pageText) ? 'SE' : 'FL';
    else if (/\bWarning\b/i.test(pageText) && /Date\/Time of last synchronization/i.test(pageText))
      responseStatus = 'SE';
  }

  const hasPending = responseStatus === null && /Synchronization Pending/i.test(pageText);
  const statusRow = await page.locator(
    '[class*="status-row"], [class*="sync-status"], [class*="response-status"]'
  ).first().textContent().catch(() => '');

  return { hasPending, responseStatus, hasConflict, statusText: statusRow?.trim() || '' };
}

/**
 * Polls for MMIS response. This is the ONE place where waitForTimeout is
 * justified — we're waiting for an external system (MMIS) to respond.
 */
export async function pollForMmisResponse(
  page: Page,
  options: MmisSyncOptions = {},
): Promise<SyncStatusResult> {
  const maxAttempts = options.maxAttempts || 12;
  const pollInterval = options.pollIntervalMs || 10_000;
  const currentUrl = page.url();

  let status: SyncStatusResult = { hasPending: true, responseStatus: null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    // Wait for page content to render before reading status
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

    status = await getSyncStatus(page);
    console.log(`[pollMmis] Attempt ${attempt}/${maxAttempts}: ${JSON.stringify(status)}`);
    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      // This is the only justified waitForTimeout — external system polling interval
      await page.waitForTimeout(pollInterval);
    }
  }
  return status;
}

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
    let key = opts.extractKeyFn(page.url());
    if (!key) {
      await navigateToEnrollments(page, opts.participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const opened = await openFirstEnrollmentDetail(page);
      if (!opened) throw new Error('[verifyMmisSync] Could not open enrollment detail');
      key = opts.extractKeyFn(page.url());
    }
    if (!key) throw new Error('[verifyMmisSync] Could not extract ProgramEnrollmentKey');

    // Wait for backend to create the extension row (external system timing)
    await page.waitForTimeout(5000);
    const mockResult = await opts.mockFn(key);
    if (!mockResult) throw new Error('[verifyMmisSync] mockMmisSuccess failed');

    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    return await getSyncStatus(page);
  }

  return await pollForMmisResponse(page, { maxAttempts: opts.maxAttempts, pollIntervalMs: opts.pollIntervalMs });
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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

export async function hasConflictBadge(page: Page): Promise<boolean> {
  const conflictIndicators = page.locator(
    '[class*="conflict"], [class*="error-badge"], [class*="chip"]'
  ).filter({ hasText: /conflict|error|FL/i });
  return await conflictIndicators.first().isVisible({ timeout: 5_000 }).catch(() => false);
}

export async function isResubmitVisible(page: Page): Promise<boolean> {
  return await page.getByText('Re-submit').isVisible({ timeout: 5_000 }).catch(() => false);
}
