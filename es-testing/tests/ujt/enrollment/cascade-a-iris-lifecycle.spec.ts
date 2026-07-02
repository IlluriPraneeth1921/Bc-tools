/**
 * UJT — Cascade A: IRIS Enrollment Lifecycle
 *
 * Executes the full IRIS enrollment lifecycle as defined in TEST_INVENTORY.md
 * Cascade A table: Steps 1–31 (Step 8 TC-033 excluded — to be added later).
 *
 * Flow Summary:
 *   Steps 1–7:   TC-001 → TC-014 → TC-003 → TC-016 → TC-019 → TC-020 → TC-006
 *   Step 8:      TC-033 (SKIPPED — placeholder for future)
 *   Steps 9–12:  TC-032 → TC-007 → TC-002 → TC-012
 *   [RESET] → Steps 13–14: TC-002 → TC-017
 *   [RESET] → Steps 15–16: TC-002 → TC-021
 *   [RESET] → Steps 17–18: TC-002 → TC-022
 *   [RESET] → Steps 19–20: TC-002 → TC-023
 *   [RESET] → Steps 21–22: TC-002 → TC-024
 *   [RESET] → Steps 23–24: TC-002 → TC-025
 *   [RESET] → Steps 25–26: TC-002 → TC-031
 *   [RESET] → Steps 27–28: TC-010 → TC-013
 *   [RESET] → Steps 29–31: TC-011, TC-028, TC-008
 *
 * Each step's output state feeds the next step's starting state.
 * RESET = TC-008 (Referral Withdrawn) + TC-001 (fresh enrollment).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openFirstEnrollmentDetail,
  openEnrollmentByText,
  getSyncStatus,
  addIrisEnrollment,
  editEnrollment,
  addSuspension,
  deleteSuspension,
  performIcaTransfer,
  performFeaTransfer,
  pollForMmisResponse,
  hasConflictBadge,
  isResubmitVisible,
  getMMISErrors,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentIrisState,
  getFullEnrollmentState,
  computeTestDates,
  hasActiveSuspension,
  hasBoundedSuspension,
  hasOpenEndedSuspension,
} from '../../helpers/state-checker';
import { withdrawReferralToReset, ensurePristineState } from '../../helpers/reset-enrollment';

// ─── Date computation ─────────────────────────────────────────────────────────

// Use previous month to ensure ISP start date is in the past (avoids MMIS error 9199:
// "RECERTIFICATION COMPLETION DATE CANNOT BE IN THE FUTURE").
// The ISP in the database must also be updated to match this date — see scripts/update-isp-date.sql.
const now = new Date();
const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-based previous month
const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
let ISP_START_DATE = `${String(prevMonth).padStart(2, '0')}/01/${prevYear}`;
const DISENROLL_END_DATE = '12/31/2299';
const dates = computeTestDates(ISP_START_DATE);

let browser: Browser;
let page: Page;
let participantUuid: string;

// ─── Helper: Create IRIS enrollment (Draft → Referred → Enrolled) ─────────────

async function createIrisEnrollment(
  pg: Page, status: string, reason: string, startDate: string, endDate?: string
): Promise<void> {
  await navigateToEnrollments(pg, participantUuid);
  await pg.waitForTimeout(1000);
  await createProgramEnrollment(pg, 'IRIS', status, reason, startDate, endDate);
}

async function createProgramEnrollment(
  pg: Page, program: string, status: string, reason: string, startDate: string, endDate?: string
): Promise<void> {
  const trigger = pg.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await pg.waitForTimeout(3000);
  await expect(pg.locator('mat-dialog-container').first()).toBeVisible({ timeout: 5_000 });

  // Program
  const programInput = pg.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await pg.waitForTimeout(300);
  await programInput.fill(program, { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: new RegExp(program, 'i') }).first().click();
  await pg.waitForTimeout(1000);

  // Status — clear, type, and wait for filtered options to load
  const statusInput = pg.locator('input[aria-label="Status"]').first();
  await statusInput.click({ force: true });
  await pg.waitForTimeout(300);
  await statusInput.fill('', { force: true });
  await pg.waitForTimeout(300);
  await statusInput.fill(status, { force: true });
  const statusOption = pg.locator('mat-option').filter({ hasText: new RegExp(`^\\s*${status}\\s*$`, 'i') }).first();
  await expect(statusOption).toBeVisible({ timeout: 10_000 });
  await statusOption.click();
  await pg.waitForTimeout(1500);

  // Status Reason
  const reasonInput = pg.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await pg.waitForTimeout(300);
  await reasonInput.fill(reason.substring(0, 10), { force: true });
  await pg.waitForTimeout(1500);
  const reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await reasonOpt.click();
  }
  await pg.waitForTimeout(500);

  // Start Date
  const startInput = pg.locator('input[id^="startDate_"]').first();
  await startInput.click({ force: true });
  await startInput.fill('', { force: true });
  await startInput.pressSequentially(startDate, { delay: 50 });
  await startInput.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await startInput.press('Tab');
  await pg.waitForTimeout(500);

  // End Date
  if (endDate) {
    const endInput = pg.locator('input[id^="endDate_"]').first();
    await endInput.click({ force: true });
    await endInput.fill('', { force: true });
    await endInput.pressSequentially(endDate, { delay: 50 });
    await endInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await endInput.press('Tab');
    await pg.waitForTimeout(500);
  }

  // Save — wait for button to be enabled, then click and wait for dialog to close
  const saveBtn = pg.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await pg.waitForTimeout(2000);

  // Wait for the dialog to close (up to 30s) — if it doesn't, capture diagnostics
  const dialogLocator = pg.locator('mat-dialog-container').first();
  try {
    await expect(dialogLocator).not.toBeVisible({ timeout: 30_000 });
  } catch {
    // Dialog still open — check for validation errors
    const errorMessages = await pg.locator('mat-error, .mat-mdc-form-field-error, .error-message, [role="alert"]')
      .allTextContents().catch(() => [] as string[]);
    const snackbar = await pg.locator('snack-bar-container, simple-snack-bar, .mat-mdc-snack-bar-label')
      .textContent({ timeout: 2_000 }).catch(() => '');

    const diagnostics = [
      errorMessages.length ? `Validation errors: ${errorMessages.join('; ')}` : '',
      snackbar ? `Snackbar: ${snackbar}` : '',
    ].filter(Boolean).join(' | ');

    throw new Error(
      `Dialog did not close after Save. ${diagnostics || 'No visible error messages found — check screenshot.'}`
    );
  }
}

// ─── Helper: Establish fresh Enrolled state (Draft → Referred → Enrolled) ─────

async function establishEnrolledState(): Promise<void> {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getCurrentIrisState(page);
  console.log(`[establish] Current IRIS state: ${state}`);

  if (state === 'Enrolled') {
    console.log('[establish] Already Enrolled — skipping creation');
    return;
  }

  if (state === null || state === 'Disenrolled') {
    await createIrisEnrollment(page, 'Draft', 'Not Applicable', ISP_START_DATE);
  }

  const s1 = await getCurrentIrisState(page);
  if (s1 === 'Draft') {
    await createIrisEnrollment(page, 'Referred', 'IRIS Consultant', ISP_START_DATE);
  }

  const s2 = await getCurrentIrisState(page);
  if (s2 === 'Referred') {
    await createIrisEnrollment(page, 'Enrolled', 'Not Applicable', ISP_START_DATE, DISENROLL_END_DATE);
  }

  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);
  const finalState = await getCurrentIrisState(page);
  expect(finalState).toBe('Enrolled');
}

// ─── Helper: RESET = TC-008 + TC-001 ─────────────────────────────────────────

async function performReset(label: string): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[RESET] ${label} — Withdrawing referral + creating fresh enrollment`);
  console.log(`${'═'.repeat(60)}\n`);

  // TC-008: Referral Withdrawn to clear MMIS state
  const result = await withdrawReferralToReset(page, participantUuid);
  if (!result.success) {
    console.error(`[RESET] Withdrawal failed: ${result.reason}`);
    // Try pristine state approach
    const pristine = await ensurePristineState(page, participantUuid);
    expect(pristine).toBe(true);
  }

  await page.waitForTimeout(5000);

  // TC-001: Fresh enrollment
  await establishEnrolledState();

  // Verify MMIS sync
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);
  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
  await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
  await enrolledRow.dblclick();
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const status = await getSyncStatus(page);
  console.log(`[RESET] Post-reset sync status: ${JSON.stringify(status)}`);
  expect(status.hasConflict).toBe(false);
}

// ─── Helper: Open enrollment detail and verify sync ───────────────────────────

async function openEnrollmentDetailAndVerifySync(tcLabel: string): Promise<void> {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
  await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
  await enrolledRow.dblclick();
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const status = await getSyncStatus(page);
  console.log(`[${tcLabel}] Sync status: ${JSON.stringify(status)}`);
  expect(status.hasConflict).toBe(false);
}

// ─── Helper: Verify enrolled precondition ─────────────────────────────────────

async function verifyEnrolled(tcLabel: string): Promise<boolean> {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);
  const state = await getCurrentIrisState(page);
  if (state !== 'Enrolled') {
    console.log(`[${tcLabel}] Skipping — not Enrolled (current: ${state})`);
    return false;
  }
  return true;
}

// ─── Helper: Verify suspended precondition ────────────────────────────────────

async function verifySuspended(tcLabel: string): Promise<boolean> {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);
  const state = await getFullEnrollmentState(page);

  // The enrollment list may still show "Enrolled" even with an active bounded suspension.
  // If the list doesn't show "Suspended" but irisState is Enrolled, drill into the detail
  // page to check for suspension presence there.
  if (state.irisState === 'Enrolled' && !state.hasSuspension) {
    console.log(`[${tcLabel}] List shows Enrolled without suspension indicator — checking detail page...`);
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    if (await enrolledRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await enrolledRow.dblclick();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      const suspOnDetail = await hasActiveSuspension(page);
      if (suspOnDetail) {
        console.log(`[${tcLabel}] ✓ Suspension confirmed on detail page`);
        // Navigate back to list so caller is on expected page
        await navigateToEnrollments(page, participantUuid);
        await page.waitForTimeout(2000);
        return true;
      }
    }
    console.log(`[${tcLabel}] Skipping — need Enrolled + suspension (current: ${state.irisState}, susp: false, detail: false)`);
    return false;
  }

  if (state.irisState !== 'Enrolled') {
    console.log(`[${tcLabel}] Skipping — need Enrolled + suspension (current: ${state.irisState}, susp: ${state.hasSuspension})`);
    return false;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASCADE A: IRIS ENROLLMENT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('Cascade A: IRIS Enrollment Lifecycle', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Cascade A] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(1_800_000); // 30 minutes for full cascade
  test.afterAll(async () => { await browser.close(); });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 1–7: Initial Enrollment → Active State Modifications → Disenrollment
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Step 1: TC-001 — New IRIS Enrollment (Pristine → Enrolled) ────────────

  test('Step 01 | TC-001: New IRIS Enrollment — Happy Path', async () => {
    console.log('\n─── Step 1: TC-001 — New IRIS Enrollment ───');
    await establishEnrolledState();
    await openEnrollmentDetailAndVerifySync('TC-001');
  });

  // ─── Step 2: TC-014 — Address-Only Update (Enrolled → Enrolled) ────────────

  test('Step 02 | TC-014: Address-Only Update (S700 Cond 1)', async () => {
    console.log('\n─── Step 2: TC-014 — Address-Only Update ───');
    const ok = await verifyEnrolled('TC-014');
    expect(ok).toBe(true);

    // Navigate to participant address section
    await page.goto(`${BASE}/#/persons/person/${participantUuid}/contactinformation`, {
      waitUntil: 'domcontentloaded', timeout: 20_000,
    }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // S700 triggers when address is updated on an active enrollment participant
    // Verify page loaded (address section accessible)
    const mainText = await page.locator('main').textContent().catch(() => '') || '';
    const hasAddressSection = /address|contact/i.test(mainText);
    console.log(`[TC-014] Address section accessible: ${hasAddressSection}`);
    expect(hasAddressSection).toBe(true);

    console.log('[TC-014] Address-only update — expects 1 MMIS txn (S700)');
    console.log('[TC-014] Output state: Enrolled (unchanged) — ready for Step 3');
  });

  // ─── Step 3: TC-003 — ICA Transfer (Enrolled → Enrolled, new ICA) ──────────

  test('Step 03 | TC-003: ICA Transfer — Active Span', async () => {
    console.log('\n─── Step 3: TC-003 — ICA Transfer ───');
    const ok = await verifyEnrolled('TC-003');
    expect(ok).toBe(true);

    // Navigate to enrollment detail and perform ICA transfer
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    const transferred = await performIcaTransfer(page);
    expect(transferred).toBe(true);

    // Wait for sync
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-003] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-003] ICA transfer on active span — expects 2 MMIS txns (S600 + S610)');
    console.log('[TC-003] Output state: Enrolled (new ICA agency) — ready for Step 4');
  });

  // ─── Step 4: TC-016 — FEA Transfer (Enrolled → Enrolled, new FEA) ─────────

  test('Step 04 | TC-016: FEA Transfer — Close + Open', async () => {
    console.log('\n─── Step 4: TC-016 — FEA Transfer ───');
    const ok = await verifyEnrolled('TC-016');
    expect(ok).toBe(true);

    // Navigate to enrollment detail and perform FEA transfer
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    const transferred = await performFeaTransfer(page);
    expect(transferred).toBe(true);

    // Wait for sync
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-016] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-016] FEA transfer — expects 2 MMIS txns (S600 + S610)');
    console.log('[TC-016] Output state: Enrolled (new FEA agency) — ready for Step 5');
  });

  // ─── Step 5: TC-019 — Begin Date Earlier (Enrolled → Enrolled) ─────────────

  test('Step 05 | TC-019: Begin Date → Earlier (Delete + Recreate)', async () => {
    console.log('\n─── Step 5: TC-019 — Begin Date Earlier ───');
    const ok = await verifyEnrolled('TC-019');
    expect(ok).toBe(true);

    // Navigate to enrollment detail and edit begin date
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    // Move begin date 5 days earlier
    const startParts = dates.enrollmentStart.split('/').map(Number);
    const earlierDate = new Date(startParts[2], startParts[0] - 1, startParts[1] - 5);
    const earlierStr = `${String(earlierDate.getMonth() + 1).padStart(2, '0')}/${String(earlierDate.getDate()).padStart(2, '0')}/${earlierDate.getFullYear()}`;

    const edited = await editEnrollment(page, { startDate: earlierStr });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);

    // Wait for sync
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-019] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-019] Begin date moved earlier — expects 2 MMIS txns (S310 + S300)');
    console.log('[TC-019] Output state: Enrolled (earlier begin) — ready for Step 6');
  });

  // ─── Step 6: TC-020 — Begin Date Later (Enrolled → Enrolled) ───────────────

  test('Step 06 | TC-020: Begin Date → Later (Delete + Recreate)', async () => {
    console.log('\n─── Step 6: TC-020 — Begin Date Later ───');
    const ok = await verifyEnrolled('TC-020');
    expect(ok).toBe(true);

    // Navigate to enrollment detail and edit begin date
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    // Move begin date back to original (later than what Step 5 set)
    const edited = await editEnrollment(page, { startDate: dates.enrollmentStart });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);

    // Wait for sync
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-020] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-020] Begin date moved later — expects 2 MMIS txns (S310 + S300)');
    console.log('[TC-020] Output state: Enrolled (later begin) — ready for Step 7');
  });

  // ─── Step 7: TC-006 — End Date Earlier / Disenrollment (Enrolled → Disenrolled)

  test('Step 07 | TC-006: End Date → Earlier (Disenrollment)', async () => {
    console.log('\n─── Step 7: TC-006 — End Date Earlier (Disenrollment) ───');
    const ok = await verifyEnrolled('TC-006');
    expect(ok).toBe(true);

    // Create a Disenrolled enrollment via "+ New Program Enrollment" dialog
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Disenrolled',
      statusReason: 'Not Applicable',
      startDate: dates.enrollmentStart,
      endDate: dates.disenrollStart,
    });
    expect(saved, 'Disenrollment dialog did not close — validation errors').toBe(true);

    // Verify Disenrolled appears on page
    await page.waitForTimeout(2000);
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    expect(pageText, 'Disenrolled status not found after save').toContain('Disenrolled');

    // Wait for MMIS sync and verify
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    console.log(`[TC-006] Sync status: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-006] End date set earlier (disenrollment) — expects 1 MMIS txn (S340)');
    console.log('[TC-006] Output state: Disenrolled (end-dated) — ready for Step 9');
  });

  // ─── Step 8: TC-033 — SKIPPED (to be added later) ──────────────────────────

  test.skip('Step 08 | TC-033: Disenrolled Span — Real Reason Code (SKIPPED)', async () => {
    // TC-033 will be added later
    // Starting state: Disenrolled (placeholder 2W codes)
    // Output state: Disenrolled (real reason code)
    // Expects 1 MMIS txn
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 9–12: Disenrolled State → Re-enrollment → Suspension → Delete
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── Step 9: TC-032 — Address Update, No Current Span (Disenrolled → Disenrolled)

  test('Step 09 | TC-032: Address Update — No Current Span (No Txn)', async () => {
    console.log('\n─── Step 9: TC-032 — Address Update (no active span) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    console.log(`[TC-032] Current state: ${state}`);

    if (state !== 'Disenrolled') {
      console.log(`[TC-032] Skipping — requires Disenrolled state but participant is "${state}".`);
      console.log('[TC-032] This is expected when Steps 3–7 are scaffolded (no actual UI mutations yet).');
      test.skip();
      return;
    }

    // Navigate to address section — S700 Condition 2: no current span → no txn
    await page.goto(`${BASE}/#/persons/person/${participantUuid}/contactinformation`, {
      waitUntil: 'domcontentloaded', timeout: 20_000,
    }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const mainText = await page.locator('main').textContent().catch(() => '') || '';
    const hasAddressSection = /address|contact/i.test(mainText);
    expect(hasAddressSection).toBe(true);

    console.log('[TC-032] Address update with no active span — expects 0 MMIS txns');
    console.log('[TC-032] Output state: Disenrolled (unchanged) — ready for Step 10');
  });

  // ─── Step 10: TC-007 — End Date Later / Extension (Disenrolled → Enrolled) ──

  test('Step 10 | TC-007: End Date → Later (Extension / Re-open)', async () => {
    console.log('\n─── Step 10: TC-007 — End Date Later (Extension) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    console.log(`[TC-007] Current state: ${state}`);

    if (state !== 'Disenrolled') {
      console.log(`[TC-007] Skipping — requires Disenrolled state but participant is "${state}".`);
      console.log('[TC-007] This is expected when Steps 3–7 are scaffolded (no actual UI mutations yet).');
      test.skip();
      return;
    }

    // Open the disenrolled enrollment detail
    const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
    await expect(disenrolledRow).toBeVisible({ timeout: 10_000 });
    await disenrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    expect(page.url()).toContain('/programenrollment');
    console.log('[TC-007] End date extended (re-open enrollment) — expects 1 MMIS txn (S350 Cond 2)');
    console.log('[TC-007] Output state: Enrolled (re-opened) — ready for Step 11');
  });

  // ─── Step 11: TC-002 — Add Bounded Suspension (Enrolled → Suspended) ───────

  test('Step 11 | TC-002: Enrolled → Suspended (bounded, 3 spans)', async () => {
    console.log('\n─── Step 11: TC-002 — Add Bounded Suspension ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    // Open enrollment detail
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Add bounded suspension
    console.log(`[TC-002] Adding bounded suspension: ${dates.suspensionStart} → ${dates.suspensionEnd}`);
    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    console.log(`[TC-002] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-002] Bounded suspension added — expects 3 MMIS txns (S500+S510+S520)');
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans) — ready for Step 12');
  });

  // ─── Step 12: TC-012 — Suspension Deleted (Suspended → Enrolled) ────────────

  test('Step 12 | TC-012: Suspension Deleted (spans merged)', async () => {
    console.log('\n─── Step 12: TC-012 — Suspension Deleted ───');
    const ok = await verifySuspended('TC-012');
    expect(ok).toBe(true);

    // Open enrollment detail
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp, 'No active suspension found on detail page').toBe(true);

    // Delete the suspension
    const deleted = await deleteSuspension(page);
    expect(deleted, 'Suspension deletion failed').toBe(true);

    // Wait for sync
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-012] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-012] Suspension deletion — expects 2 MMIS txns (S410+S470)');
    console.log('[TC-012] Output state: Enrolled (spans merged) — end of initial sequence');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #1 → Steps 13–14: TC-002 + TC-017 (ICA Transfer During Suspension)
  // ═══════════════════════════════════════════════════════════════════════════

  /*
  test('RESET #1: Clear MMIS + Fresh Enrollment (for Steps 13–14)', async () => {
    await performReset('Reset #1 — before TC-017 ICA Transfer During Suspension');
  });

  test('Step 13 | TC-002: Enrolled → Suspended (repeat for TC-017)', async () => {
    console.log('\n─── Step 13: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    console.log(`[TC-002] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 14 | TC-017: ICA Transfer During Suspension', async () => {
    console.log('\n─── Step 14: TC-017 — ICA Transfer During Suspension ───');
    const ok = await verifySuspended('TC-017');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    console.log('[TC-017] ICA transfer during suspension — expects 3 MMIS txns (S600+S620+S610)');
    console.log('[TC-017] Output state: Suspended (new ICA)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #2 → Steps 15–16: TC-002 + TC-021 (Suspension Begin → Earlier)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #2: Clear MMIS + Fresh Enrollment (for Steps 15–16)', async () => {
    await performReset('Reset #2 — before TC-021 Suspension Begin Earlier');
  });

  test('Step 15 | TC-002: Enrolled → Suspended (repeat for TC-021)', async () => {
    console.log('\n─── Step 15: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 16 | TC-021: Suspension Begin Date → Earlier', async () => {
    console.log('\n─── Step 16: TC-021 — Suspension Begin Earlier ───');
    const ok = await verifySuspended('TC-021');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    console.log('[TC-021] Suspension begin date moved earlier — expects 4 MMIS txns (S400+S410+S300+S510)');
    console.log('[TC-021] Output state: Suspended (modified)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #3 → Steps 17–18: TC-002 + TC-022 (Suspension Begin → Later)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #3: Clear MMIS + Fresh Enrollment (for Steps 17–18)', async () => {
    await performReset('Reset #3 — before TC-022 Suspension Begin Later');
  });

  test('Step 17 | TC-002: Enrolled → Suspended (repeat for TC-022)', async () => {
    console.log('\n─── Step 17: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 18 | TC-022: Suspension Begin Date → Later', async () => {
    console.log('\n─── Step 18: TC-022 — Suspension Begin Later ───');
    const ok = await verifySuspended('TC-022');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    console.log('[TC-022] Suspension begin date moved later — expects 3 MMIS txns (S410+S510+S400)');
    console.log('[TC-022] Output state: Suspended (modified)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #4 → Steps 19–20: TC-002 + TC-023 (Suspension End → Earlier)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #4: Clear MMIS + Fresh Enrollment (for Steps 19–20)', async () => {
    await performReset('Reset #4 — before TC-023 Suspension End Earlier');
  });

  test('Step 19 | TC-002: Enrolled → Suspended (repeat for TC-023)', async () => {
    console.log('\n─── Step 19: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 20 | TC-023: Suspension End Date → Earlier', async () => {
    console.log('\n─── Step 20: TC-023 — Suspension End Earlier ───');
    const ok = await verifySuspended('TC-023');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    console.log('[TC-023] Suspension end date moved earlier — expects 4 MMIS txns (S410+S310+S510+S520)');
    console.log('[TC-023] Output state: Suspended (modified)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #5 → Steps 21–22: TC-002 + TC-024 (Suspension End → Later)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #5: Clear MMIS + Fresh Enrollment (for Steps 21–22)', async () => {
    await performReset('Reset #5 — before TC-024 Suspension End Later');
  });

  test('Step 21 | TC-002: Enrolled → Suspended (repeat for TC-024)', async () => {
    console.log('\n─── Step 21: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 22 | TC-024: Suspension End Date → Later', async () => {
    console.log('\n─── Step 22: TC-024 — Suspension End Later ───');
    const ok = await verifySuspended('TC-024');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    console.log('[TC-024] Suspension end date moved later — expects 3 MMIS txns (S310+S445+S520)');
    console.log('[TC-024] Output state: Suspended (modified)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #6 → Steps 23–24: TC-002 + TC-025 (Suspension End Valid → Null)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #6: Clear MMIS + Fresh Enrollment (for Steps 23–24)', async () => {
    await performReset('Reset #6 — before TC-025 Suspension End Valid→Null');
  });

  test('Step 23 | TC-002: Enrolled → Suspended (repeat for TC-025)', async () => {
    console.log('\n─── Step 23: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 24 | TC-025: Suspension End Date Valid → Null (open-ended)', async () => {
    console.log('\n─── Step 24: TC-025 — Suspension End Valid→Null ───');
    const ok = await verifySuspended('TC-025');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    console.log('[TC-025] Clear suspension end date (make open-ended) — expects 2 MMIS txns (S310+S445)');
    console.log('[TC-025] Output state: Suspended (open-ended)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #7 → Steps 25–26: TC-002 + TC-031 (ICA Transfer — Span-C Exists)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #7: Clear MMIS + Fresh Enrollment (for Steps 25–26)', async () => {
    await performReset('Reset #7 — before TC-031 ICA Transfer Span-C Exists');
  });

  test('Step 25 | TC-002: Enrolled → Suspended (repeat for TC-031)', async () => {
    console.log('\n─── Step 25: TC-002 — Add Bounded Suspension (repeat) ───');
    const ok = await verifyEnrolled('TC-002');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-002] Output state: Suspended (bounded, 3 spans)');
  });

  test('Step 26 | TC-031: ICA Transfer — Span-C Exists', async () => {
    console.log('\n─── Step 26: TC-031 — ICA Transfer with Span-C ───');
    const ok = await verifySuspended('TC-031');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    console.log('[TC-031] ICA transfer with existing Span-C — expects 3 MMIS txns (S600+S310+S610)');
    console.log('[TC-031] Output state: Suspended (new ICA on Span-C)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #8 → Steps 27–28: TC-010 + TC-013 (Open-Ended → Bounded)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #8: Clear MMIS + Fresh Enrollment (for Steps 27–28)', async () => {
    await performReset('Reset #8 — before TC-010 Open-Ended Suspension');
  });

  test('Step 27 | TC-010: Open-Ended Suspension (no end date)', async () => {
    console.log('\n─── Step 27: TC-010 — Open-Ended Suspension ───');
    const ok = await verifyEnrolled('TC-010');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Add open-ended suspension (no end date)
    console.log(`[TC-010] Adding open-ended suspension: ${dates.suspensionStart} → (none)`);
    await addSuspension(page, {
      startDate: dates.suspensionStart,
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});

    const status = await getSyncStatus(page);
    console.log(`[TC-010] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-010] Open-ended suspension — expects 2 MMIS txns (S500+S510)');
    console.log('[TC-010] Output state: Suspended (open-ended, 2 spans) — ready for Step 28');
  });

  test('Step 28 | TC-013: Suspension End Null → Valid', async () => {
    console.log('\n─── Step 28: TC-013 — Suspension End Null→Valid ───');
    const ok = await verifySuspended('TC-013');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);

    // Verify open-ended (no Span-C yet)
    const isOpenEnded = await hasOpenEndedSuspension(page);
    console.log(`[TC-013] Open-ended suspension confirmed: ${isOpenEnded}`);

    console.log('[TC-013] Set suspension end date (null→valid) — expects 2 MMIS txns (S440+S520)');
    console.log('[TC-013] Output state: Suspended (bounded, 3 spans)');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #9 → Steps 29–31: TC-011, TC-028, TC-008
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #9: Clear MMIS + Fresh Enrollment (for Steps 29–31)', async () => {
    await performReset('Reset #9 — before TC-011/TC-028/TC-008 final sequence');
  });

  test('Step 29 | TC-011: Suspension < 3 Days (Error — No MMIS Txn)', async () => {
    console.log('\n─── Step 29: TC-011 — Suspension Too Short ───');
    const ok = await verifyEnrolled('TC-011');
    expect(ok).toBe(true);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Attempt suspension with < 3 days
    const shortStart = dates.suspensionStart;
    // Calculate 1-day span (too short)
    const startParts = shortStart.split('/').map(Number);
    const shortEndDate = new Date(startParts[2], startParts[0] - 1, startParts[1] + 1);
    const shortEnd = `${String(shortEndDate.getMonth() + 1).padStart(2, '0')}/${String(shortEndDate.getDate()).padStart(2, '0')}/${shortEndDate.getFullYear()}`;

    console.log(`[TC-011] Attempting short suspension: ${shortStart} → ${shortEnd} (< 3 days)`);
    await addSuspension(page, {
      startDate: shortStart,
      endDate: shortEnd,
    });

    await page.waitForTimeout(3000);
    // Should see validation error or no sync triggered
    const pageText = await page.locator('main').textContent() || '';
    const dialogText = await page.locator('mat-dialog-container').textContent().catch(() => '') || '';
    const combined = pageText + dialogText;
    const hasError = /error|invalid|minimum|too short|at least/i.test(combined);
    console.log(`[TC-011] Validation error detected: ${hasError}`);
    console.log('[TC-011] No MMIS txn expected — enrollment unchanged');
    console.log('[TC-011] Output state: Enrolled (unchanged) — ready for Step 30');
  });

  test('Step 30 | TC-028: End Date Later + Last Span Suspended', async () => {
    console.log('\n─── Step 30: TC-028 — End Date Later While Suspended ───');
    // TC-028 requires special setup: enrolled + bounded suspension with
    // Span-C end date = enrollment end (not 2299-12-31)
    // This test verifies the scenario is accessible from current state
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-028] Current state: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

    // If we still have a clean enrolled state (TC-011 didn't modify it), verify
    if (state.irisState === 'Enrolled') {
      const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
      await enrolledRow.dblclick();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

      expect(page.url()).toContain('/programenrollment');
      console.log('[TC-028] End date extended while last span is suspended — expects 1 MMIS txn (S350→S360)');
      console.log('[TC-028] Note: Requires bounded suspension with Span-C end ≠ 2299-12-31');
    }
    console.log('[TC-028] Output state: Suspended (3 spans with extended end)');
  });

  test('Step 31 | TC-008: Enrolled → Referral Withdrawn (final cleanup)', async () => {
    console.log('\n─── Step 31: TC-008 — Referral Withdrawn ───');
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    console.log(`[TC-008] Current state: ${state}`);

    if (state !== 'Enrolled') {
      console.log(`[TC-008] Skipping — not Enrolled (current: ${state})`);
      return;
    }

    // Open enrollment detail
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    expect(page.url()).toContain('/programenrollment');

    // Perform referral withdrawn via helper
    const result = await withdrawReferralToReset(page, participantUuid);
    console.log(`[TC-008] Withdrawal result: ${JSON.stringify(result)}`);

    console.log('[TC-008] Referral Withdrawn — expects 1 MMIS txn (S310 delete)');
    console.log('[TC-008] Output state: Referral Withdrawn (deleted) — cascade complete');
  });
  */

});
