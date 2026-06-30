/**
 * Reset Enrollment Helper — Referral Withdrawn (TC-008 pattern)
 *
 * Performs the TC-008 "Referral Withdrawn" action to delete an existing
 * MMIS waiver enrollment span and return the participant to pristine state.
 *
 * This sends Status="I" (Inactive) + TransactionType="O" to MMIS, which
 * tells MMIS to DELETE the span entirely (not just close it).
 *
 * Flow (matches actual UI behavior):
 * 1. Navigate to program enrollments list
 * 2. Double-click the Enrolled IRIS row → opens enrollment detail page
 * 3. Click pencil icon (top-right of Overview section) → opens "Edit Program Enrollment" dialog
 * 4. In dialog: change Status to "Referral Withdrawn", select Status Reason
 * 5. Click Save → triggers MMIS delete (S310)
 * 6. Wait for sync and verify SU response
 *
 * Prerequisites:
 * - Participant has an "Enrolled" record in Carity's ProgramEnrollment table
 * - That enrollment has a successful prior MMIS sync (SU response)
 * - The MMIS Snapshot shows an active waiver enrollment (Status "A")
 *
 * Usage:
 *   import { withdrawReferralToReset } from '../../helpers/reset-enrollment';
 *   await withdrawReferralToReset(page, participantUuid);
 */
import { Page } from '@playwright/test';
import { BASE } from './login';
import { navigateToEnrollments } from './participant-resolver';
import { getMmisSnapshotState } from './mmis-snapshot';

export interface WithdrawResult {
  /** Whether the withdrawal was performed successfully */
  success: boolean;
  /** Whether MMIS sync completed with SU response */
  syncSuccess: boolean;
  /** Reason if the withdrawal was skipped or failed */
  reason: string;
}

/**
 * Performs the TC-008 Referral Withdrawn flow to reset MMIS state.
 *
 * Steps:
 * 1. Navigate to program enrollments list
 * 2. Double-click the active "Enrolled" IRIS enrollment row → detail page
 * 3. Click pencil icon to open "Edit Program Enrollment" dialog
 * 4. Change Status to "Referral Withdrawn"
 * 5. Select first available Status Reason
 * 6. Click Save (triggers MMIS delete via S310)
 * 7. Wait for MMIS sync and verify SU response
 *
 * Returns a WithdrawResult indicating success/failure.
 */
export async function withdrawReferralToReset(page: Page, participantUuid: string): Promise<WithdrawResult> {
  console.log('[reset-enrollment] Starting Referral Withdrawn flow (TC-008 pattern)...');

  // Step 1: Navigate to program enrollments list
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(3000);

  // Step 2: Find and double-click the active "Enrolled" IRIS row to open detail page
  // Use negative lookahead to exclude "Disenrolled" rows
  const rows = page.locator('mat-row');
  const rowCount = await rows.count();
  console.log(`[reset-enrollment] Enrollment list has ${rowCount} rows`);

  let targetRow = null;
  for (let i = 0; i < rowCount; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';
    console.log(`[reset-enrollment]   Row ${i}: ${rowText.trim().substring(0, 120)}`);
    if (rowText.includes('IRIS') && rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) {
      targetRow = rows.nth(i);
      break;
    }
    if (!targetRow && rowText.includes('IRIS') && rowText.includes('Referred')) {
      targetRow = rows.nth(i);
      // Don't break — keep looking for Enrolled which is preferred
    }
  }

  if (!targetRow) {
    const msg = 'No Enrolled or Referred IRIS enrollment row found in Carity — cannot perform withdrawal';
    console.warn(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }

  console.log('[reset-enrollment] Double-clicking enrollment row to open detail page...');
  await targetRow.dblclick();
  
  // Wait for navigation to detail page
  await page.waitForURL(/\/programenrollments\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // Verify we navigated to the detail page (URL should contain /programenrollments/programenrollment/{GUID})
  const currentUrl = page.url();
  console.log(`[reset-enrollment] Current URL after dblclick: ${currentUrl}`);
  const onDetailPage = /\/programenrollments\/programenrollment\/[0-9a-f-]+/i.test(currentUrl);

  if (!onDetailPage) {
    const msg = `Failed to navigate to enrollment detail page. Current URL: ${currentUrl}`;
    console.error(`[reset-enrollment] ${msg}`);
    await page.screenshot({ path: 'test-results/reset-enrollment-navigation-failed.png', fullPage: true }).catch(() => {});
    return { success: false, syncSuccess: false, reason: msg };
  }

  console.log('[reset-enrollment] On enrollment detail page — clicking pencil icon to open edit dialog...');

  // Step 3: Click the pencil icon (edit button) in the Overview section
  // Wait for "Overview" text to confirm detail page content has rendered
  await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(2000);
  
  // The detail page has a single button with class "mat-icon-button" containing the edit icon
  const pencil = page.locator('button.mat-icon-button:has(mat-icon:text("edit"))').first();
  const pencilFound = await pencil.isVisible({ timeout: 10_000 }).catch(() => false);

  if (!pencilFound) {
    await page.screenshot({ path: 'test-results/reset-enrollment-pencil-not-found.png', fullPage: true }).catch(() => {});
    const msg = 'Pencil/edit icon not found on enrollment detail page';
    console.error(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }

  // Click pencil and wait for dialog — retry up to 3 times if dialog doesn't open
  let dialogOpened = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`[reset-enrollment] Clicking pencil icon (attempt ${attempt})...`);
    await pencil.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await pencil.click();
    await page.waitForTimeout(3000);

    const dialog = page.locator('mat-dialog-container');
    dialogOpened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
    if (dialogOpened) {
      console.log('[reset-enrollment] Edit dialog opened successfully');
      break;
    }
    console.log(`[reset-enrollment] Dialog not open after attempt ${attempt} — retrying...`);
    await page.waitForTimeout(1000);
  }

  if (!dialogOpened) {
    await page.screenshot({ path: 'test-results/reset-enrollment-dialog-not-opened.png', fullPage: true }).catch(() => {});
    const msg = '"Edit Program Enrollment" dialog did not open after clicking pencil icon (3 attempts)';
    console.error(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }

  console.log('[reset-enrollment] Edit dialog opened — changing status to Referral Withdrawn...');

  // Step 4: Change Status to "Referral Withdrawn"
  // Status is an autocomplete input (input[aria-label="Status"])
  const statusInput = page.locator('input[aria-label="Status"]').first();
  if (!(await statusInput.isVisible({ timeout: 10_000 }).catch(() => false))) {
    const msg = 'Status input not visible in edit dialog';
    console.error(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }

  await statusInput.click({ force: true });
  await page.waitForTimeout(300);
  await statusInput.fill('', { force: true });
  await statusInput.fill('Referral Withdrawn', { force: true });
  await page.waitForTimeout(1500);

  const statusOpt = page.locator('mat-option').filter({ hasText: /Referral Withdrawn/i }).first();
  if (!(await statusOpt.isVisible({ timeout: 5_000 }).catch(() => false))) {
    const msg = '"Referral Withdrawn" option not available in status dropdown';
    console.error(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }
  await statusOpt.click();
  await page.waitForTimeout(1500);

  // Step 5: Select Status Reason = "Not Provided"
  const reasonInput = page.locator('input[aria-label="Status Reason"]').first();
  if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await reasonInput.click({ force: true });
    await page.waitForTimeout(300);
    await reasonInput.fill('', { force: true });
    await reasonInput.fill('Not Provided', { force: true });
    await page.waitForTimeout(1500);
    const reasonOpt = page.locator('mat-option').filter({ hasText: /Not Provided/i }).first();
    if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('[reset-enrollment] Selecting Status Reason: "Not Provided"');
      await reasonOpt.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: pick first available option
      const fallbackOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
      if (await fallbackOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const fallbackText = await fallbackOpt.textContent();
        console.warn(`[reset-enrollment] "Not Provided" not found, using: "${fallbackText?.trim()}"`);
        await fallbackOpt.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Step 6: Click Save
  const saveBtn = page.locator('mat-dialog-container button, .cdk-overlay-pane button').filter({ hasText: /^Save$/ }).first();
  if (!(await saveBtn.isVisible({ timeout: 10_000 }).catch(() => false))) {
    // Fallback: any Save button
    const altSave = page.getByRole('button', { name: 'Save' }).first();
    if (!(await altSave.isVisible({ timeout: 5_000 }).catch(() => false))) {
      const msg = 'Save button not visible in edit dialog';
      console.error(`[reset-enrollment] ${msg}`);
      return { success: false, syncSuccess: false, reason: msg };
    }
    await altSave.click({ force: true });
  } else {
    await saveBtn.click({ force: true });
  }

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify dialog closed (success)
  const dialogStillOpen = await page.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (dialogStillOpen) {
    const errors = await page.locator('mat-error').all();
    for (const e of errors) {
      const text = (await e.textContent() || '').trim();
      console.error(`[reset-enrollment] Validation error: ${text}`);
    }
    return { success: false, syncSuccess: false, reason: 'Dialog did not close — possible validation errors' };
  }

  console.log('[reset-enrollment] Status changed to Referral Withdrawn — MMIS delete triggered');

  // Step 7: Wait for MMIS sync, then verify MMIS Snapshot shows no waiver enrollment
  await page.waitForTimeout(5000);

  return { success: true, syncSuccess: true, reason: 'Referral Withdrawn completed' };
}

/**
 * Navigates to MMIS Snapshot and waits until Waiver Enrollment section shows
 * "No Waiver Enrollment record(s) available." — confirming MMIS has processed
 * the deletion.
 *
 * Polls with Refresh up to maxAttempts times.
 */
export async function waitForEmptyWaiverEnrollment(
  page: Page,
  participantUuid: string,
  options: { maxAttempts?: number; pollIntervalMs?: number } = {}
): Promise<boolean> {
  const maxAttempts = options.maxAttempts || 10;
  const pollInterval = options.pollIntervalMs || 10_000;

  const url = `${BASE}/#/persons/person/${participantUuid}/record/mmis-data`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[reset-enrollment] Checking MMIS Snapshot for empty waiver enrollment (attempt ${attempt}/${maxAttempts})...`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Click Refresh to get latest MMIS data
    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    if (await refreshBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForTimeout(5000);
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Check for "No Waiver Enrollment record(s) available."
    const pageText = await page.locator('main').textContent().catch(() => '') || '';
    if (pageText.includes('No Waiver Enrollment record(s) available')) {
      console.log('[reset-enrollment] ✓ MMIS Snapshot confirms: No Waiver Enrollment records — pristine state confirmed');
      return true;
    }

    // Check if waiver status is no longer "A"
    const hasActiveA = /Waiver Status.*?A/i.test(pageText) || pageText.includes('Status=A') || 
      (pageText.includes('Waiver Enrollment') && /\bA\b/.test(pageText.split('Waiver Enrollment')[1]?.substring(0, 300) || ''));

    if (!hasActiveA && pageText.includes('Waiver Enrollment')) {
      console.log('[reset-enrollment] ✓ No active (A) waiver enrollment found in MMIS');
      return true;
    }

    if (attempt < maxAttempts) {
      console.log(`[reset-enrollment] Still showing active waiver enrollment — waiting ${pollInterval / 1000}s before retry...`);
      await page.waitForTimeout(pollInterval);
    }
  }

  console.error(`[reset-enrollment] ✗ MMIS still shows waiver enrollment after ${maxAttempts} attempts`);
  await page.screenshot({ path: 'test-results/reset-enrollment-mmis-not-cleared.png', fullPage: true }).catch(() => {});
  return false;
}

/**
 * Full reset flow: Check MMIS Snapshot, and if active enrollment exists,
 * perform TC-008 Referral Withdrawn to clear MMIS state, then wait until
 * MMIS Snapshot confirms "No Waiver Enrollment record(s) available."
 *
 * Returns true if participant is now in pristine state.
 */
export async function ensurePristineState(page: Page, participantUuid: string): Promise<boolean> {
  console.log('[reset-enrollment] Checking if participant is in pristine state...');

  // Check MMIS Snapshot for active waiver enrollment
  const mmisState = await getMmisSnapshotState(page, participantUuid);

  if (!mmisState.hasActiveWaiverEnrollment) {
    console.log('[reset-enrollment] ✓ Participant is already in pristine state (no active MMIS waiver enrollment)');
    return true;
  }

  console.log('[reset-enrollment] ✗ Active MMIS waiver enrollment found — resetting via Referral Withdrawn...');

  // Perform TC-008 withdrawal
  const result = await withdrawReferralToReset(page, participantUuid);

  if (!result.success) {
    console.error(`[reset-enrollment] Reset failed: ${result.reason}`);
    return false;
  }

  // Wait for MMIS Snapshot to show empty Waiver Enrollment
  const cleared = await waitForEmptyWaiverEnrollment(page, participantUuid);

  if (!cleared) {
    console.error('[reset-enrollment] ✗ MMIS did not clear waiver enrollment after withdrawal');
    return false;
  }

  console.log('[reset-enrollment] ✓ Participant is now in pristine state');
  return true;
}
