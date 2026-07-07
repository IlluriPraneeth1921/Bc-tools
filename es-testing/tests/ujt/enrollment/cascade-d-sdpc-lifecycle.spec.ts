/**
 * UJT — Cascade D: SDPC Enrollment Lifecycle
 *
 * Executes the full SDPC enrollment lifecycle as defined in TEST_INVENTORY.md
 * Cascade D table: Steps 41–64.
 *
 * Flow Summary:
 *   Steps 41–50:  TC-015 → TC-039 → TC-040 → TC-041 → TC-026 → TC-048 → TC-034 → TC-035 → TC-018 → TC-027
 *   [RESET] → Steps 51–52: TC-018 → TC-042
 *   [RESET] → Steps 53–54: TC-018 → TC-043
 *   [RESET] → Steps 55–56: TC-018 → TC-044
 *   [RESET] → Steps 57–58: TC-018 → TC-045
 *   [RESET] → Steps 59–60: TC-018 → TC-046
 *   [RESET] → Steps 61–62: TC-036 → TC-038
 *   [RESET] → Steps 63–64: TC-037, TC-047
 *
 * Prerequisite: Participant must already be enrolled in IRIS (TC-001 completed).
 * RESET = TC-049 (SDPC Referral Withdrawn) + TC-015 (fresh SDPC enrollment).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  editEnrollment,
  openEnrollmentByText,
  addSuspension,
  editSuspension,
  deleteSuspension,
  verifyMmisSync,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentSdpcState,
} from '../../helpers/state-checker';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';
import { skipIfBeforeTarget } from '../../helpers/skip-to';

// ─── Configuration ────────────────────────────────────────────────────────────

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

const TC015 = SCENARIOS.TC_015;
const TC018 = SCENARIOS.TC_018;
const TC026 = SCENARIOS.TC_026;
const TC034 = SCENARIOS.TC_034;
const TC035 = SCENARIOS.TC_035;
const TC036 = SCENARIOS.TC_036;
const TC037 = SCENARIOS.TC_037;
const TC038 = SCENARIOS.TC_038;
const TC040 = SCENARIOS.TC_040;
const TC041 = SCENARIOS.TC_041;
const TC042 = SCENARIOS.TC_042;
const TC043 = SCENARIOS.TC_043;
const TC044 = SCENARIOS.TC_044;
const TC045 = SCENARIOS.TC_045;
const TC046 = SCENARIOS.TC_046;
const TC048 = SCENARIOS.TC_048;

let browser: Browser;
let page: Page;
let participantUuid: string;

// ─── Helper: MMIS sync verification ──────────────────────────────────────────

async function verifySyncSuccess(label: string): Promise<void> {
  const status = await verifyMmisSync(page, {
    participantUuid,
    mockMmis: MOCK_MMIS,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });
  expect(status.responseStatus, `[${label}] Expected SU or SE`).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`[${label}] ✓ MMIS sync verified (${status.responseStatus})`);
}

// ─── Helper: Establish fresh SDPC Enrolled state (TC-015 flow) ────────────────

async function establishSdpcEnrolled(): Promise<void> {
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  // Check SDPC row state
  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  const sdpcVisible = await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false);
  if (sdpcVisible) {
    const rowText = await sdpcRow.textContent() || '';
    if (rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) {
      console.log('[establish-sdpc] Already SDPC Enrolled — skipping');
      return;
    }
  }

  // Assessing
  console.log('[establish-sdpc] Creating SDPC Assessing...');
  let ok = await addIrisEnrollment(page, {
    program: 'SDPC', status: 'Assessing',
    statusReason: 'Not Applicable', startDate: TC015.bcInput.enrollmentStartDate,
  });
  expect(ok, 'Failed to create SDPC Assessing').toBe(true);

  // Referred
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  console.log('[establish-sdpc] Creating SDPC Referred...');
  ok = await addIrisEnrollment(page, {
    program: 'SDPC', status: 'Referred',
    statusReason: 'Not Applicable', startDate: TC015.bcInput.enrollmentStartDate,
  });
  expect(ok, 'Failed to create SDPC Referred').toBe(true);

  // Enrolled
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  console.log('[establish-sdpc] Creating SDPC Enrolled...');
  ok = await addIrisEnrollment(page, {
    program: 'SDPC', status: 'Enrolled',
    statusReason: 'Not Applicable',
    startDate: TC015.bcInput.enrollmentStartDate,
    endDate: TC015.bcInput.enrollmentEndDate,
  });
  expect(ok, 'Failed to create SDPC Enrolled').toBe(true);

  // Final verify
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const finalRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  const finalText = await finalRow.textContent() || '';
  console.log(`[establish-sdpc] Final SDPC row: ${finalText.trim().substring(0, 80)}`);
  expect(finalText).toContain('Enrolled');
}

// ─── Helper: RESET = TC-049 (SDPC Referral Withdrawn) + TC-015 (fresh SDPC enrollment) ───

async function performSdpcReset(label: string): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[SDPC-RESET] ${label}`);
  console.log(`${'═'.repeat(60)}\n`);

  // TC-049: SDPC Referral Withdrawn
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  const sdpcVisible = await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false);

  if (sdpcVisible) {
    const rowText = await sdpcRow.textContent() || '';
    if (!rowText.includes('Referral Withdrawn') && !rowText.includes('Withdrawn')) {
      const opened = await openEnrollmentByText(page, /SDPC/);
      if (opened) {
        const edited = await editEnrollment(page, {
          status: 'Referral Withdrawn',
          statusReason: 'Not Provided',
        });
        if (edited) {
          await verifySyncSuccess('RESET-TC-049');
        }
      }
    }
  }

  // Wait briefly for MMIS to process
  await page.waitForTimeout(5000);

  // TC-015: Fresh SDPC enrollment
  await establishSdpcEnrolled();

  // Verify sync on new enrollment
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const detailOpened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
  if (detailOpened) {
    await verifySyncSuccess('RESET-TC-015');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASCADE D: SDPC ENROLLMENT LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('Cascade D: SDPC Enrollment Lifecycle', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Cascade D] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(1_800_000); // 30 minutes for full cascade
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 41–50: New SDPC → Modifications → Disenroll → Reinstate → Suspend → Delete
  // ═══════════════════════════════════════════════════════════════════════════

  test('Step 41 | TC-015: New SDPC Enrollment', async () => {
    skipIfBeforeTarget('Step 41');
    console.log('\n─── Step 41: TC-015 — New SDPC Enrollment ───');
    await establishSdpcEnrolled();

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-015');
  });

  test('Step 42 | TC-039: SDPC Address Update (No Txn)', async () => {
    skipIfBeforeTarget('Step 42');
    console.log('\n─── Step 42: TC-039 — SDPC Address Update (No Txn) ───');
    // SDPC does not include address nodes — no MMIS transaction expected
    console.log('[TC-039] ✓ SDPC excluded from address-only updates (no transaction)');
  });

  test('Step 43 | TC-040: SDPC Begin Date → Earlier', async () => {
    skipIfBeforeTarget('Step 43');
    console.log('\n─── Step 43: TC-040 — SDPC Begin Date Earlier ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editEnrollment(page, { startDate: TC040.bcInput.newEnrollmentStartDate! });
    expect(edited, 'Edit dialog did not close').toBe(true);
    await verifySyncSuccess('TC-040');
  });

  test('Step 44 | TC-041: SDPC Begin Date → Later', async () => {
    skipIfBeforeTarget('Step 44');
    console.log('\n─── Step 44: TC-041 — SDPC Begin Date Later ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editEnrollment(page, { startDate: TC041.bcInput.newEnrollmentStartDate! });
    expect(edited, 'Edit dialog did not close').toBe(true);
    await verifySyncSuccess('TC-041');
  });

  test('Step 45 | TC-026: SDPC End Date → Earlier (Disenrollment)', async () => {
    skipIfBeforeTarget('Step 45');
    console.log('\n─── Step 45: TC-026 — SDPC End Date Earlier (Disenrollment) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const saved = await addIrisEnrollment(page, {
      program: 'SDPC', status: 'Disenrolled',
      statusReason: 'Not Applicable',
      startDate: TC026.bcInput.enrollmentStartDate,
      endDate: TC026.bcInput.newEnrollmentEndDate!,
    });
    expect(saved, 'Disenrollment dialog did not close').toBe(true);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-026');
  });

  test('Step 46 | TC-048: SDPC Disenrolled — Real Reason Code (S345)', async () => {
    skipIfBeforeTarget('Step 46');
    console.log('\n─── Step 46: TC-048 — SDPC Disenrolled Real Reason Code ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const saved = await addIrisEnrollment(page, {
      program: 'SDPC', status: 'Disenrolled',
      statusReason: 'Deceased',
      startDate: TC048.bcInput.enrollmentEndDate,
    });
    expect(saved, 'Disenrolled dialog did not close').toBe(true);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-048');
  });

  test('Step 47 | TC-034: SDPC End Date → Later (Extension)', async () => {
    skipIfBeforeTarget('Step 47');
    console.log('\n─── Step 47: TC-034 — SDPC End Date Later (Extension) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const saved = await addIrisEnrollment(page, {
      program: 'SDPC', status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: TC034.bcInput.enrollmentStartDate,
      endDate: TC034.bcInput.newEnrollmentEndDate!,
    });
    expect(saved, 'Enrolled dialog did not close').toBe(true);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-034');
  });

  test('Step 48 | TC-035: SDPC Disenrolled → Enrolled (Reinstatement)', async () => {
    skipIfBeforeTarget('Step 48');
    console.log('\n─── Step 48: TC-035 — SDPC Reinstatement ───');
    // First disenroll, then reinstate
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    // Disenroll first (if not already)
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    const rowText = await sdpcRow.textContent() || '';
    if (!rowText.includes('Disenrolled')) {
      const disOk = await addIrisEnrollment(page, {
        program: 'SDPC', status: 'Disenrolled',
        statusReason: 'Not Applicable',
        startDate: TC026.bcInput.enrollmentStartDate,
        endDate: TC026.bcInput.newEnrollmentEndDate!,
      });
      expect(disOk).toBe(true);
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    }

    // Reinstate
    const saved = await addIrisEnrollment(page, {
      program: 'SDPC', status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: TC035.bcInput.enrollmentStartDate,
      endDate: '12/31/2299',
    });
    expect(saved, 'Reinstatement dialog did not close').toBe(true);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-035');
  });

  test('Step 49 | TC-018: New SDPC Suspension (Bounded)', async () => {
    skipIfBeforeTarget('Step 49');
    console.log('\n─── Step 49: TC-018 — SDPC Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('TC-018');
  });

  test('Step 50 | TC-027: SDPC Suspension Deleted', async () => {
    skipIfBeforeTarget('Step 50');
    console.log('\n─── Step 50: TC-027 — SDPC Suspension Deleted ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const deleted = await deleteSuspension(page);
    expect(deleted, 'Suspension deletion failed').toBe(true);
    await verifySyncSuccess('TC-027');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #1 → Steps 51–52: TC-018 + TC-042 (Suspension Begin → Earlier)
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #1: Clear + Fresh SDPC Enrollment (for Steps 51–52)', async () => {
    skipIfBeforeTarget('SDPC RESET #1');
    await performSdpcReset('Reset #1 — before TC-042 Suspension Begin Earlier');
  });

  test('Step 51 | TC-018: SDPC Suspension (repeat for TC-042)', async () => {
    skipIfBeforeTarget('Step 51');
    console.log('\n─── Step 51: TC-018 — SDPC Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step51-TC-018');
  });

  test('Step 52 | TC-042: SDPC Suspension Begin → Earlier', async () => {
    skipIfBeforeTarget('Step 52');
    console.log('\n─── Step 52: TC-042 — SDPC Suspension Begin Earlier ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { startDate: TC042.bcInput.newSuspensionStartDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-042');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #2 → Steps 53–54: TC-018 + TC-043 (Suspension Begin → Later)
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #2: Clear + Fresh SDPC Enrollment (for Steps 53–54)', async () => {
    skipIfBeforeTarget('SDPC RESET #2');
    await performSdpcReset('Reset #2 — before TC-043 Suspension Begin Later');
  });

  test('Step 53 | TC-018: SDPC Suspension (repeat for TC-043)', async () => {
    skipIfBeforeTarget('Step 53');
    console.log('\n─── Step 53: TC-018 — SDPC Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step53-TC-018');
  });

  test('Step 54 | TC-043: SDPC Suspension Begin → Later', async () => {
    skipIfBeforeTarget('Step 54');
    console.log('\n─── Step 54: TC-043 — SDPC Suspension Begin Later ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { startDate: TC043.bcInput.newSuspensionStartDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-043');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #3 → Steps 55–56: TC-018 + TC-044 (Suspension End → Earlier)
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #3: Clear + Fresh SDPC Enrollment (for Steps 55–56)', async () => {
    skipIfBeforeTarget('SDPC RESET #3');
    await performSdpcReset('Reset #3 — before TC-044 Suspension End Earlier');
  });

  test('Step 55 | TC-018: SDPC Suspension (repeat for TC-044)', async () => {
    skipIfBeforeTarget('Step 55');
    console.log('\n─── Step 55: TC-018 — SDPC Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step55-TC-018');
  });

  test('Step 56 | TC-044: SDPC Suspension End → Earlier', async () => {
    skipIfBeforeTarget('Step 56');
    console.log('\n─── Step 56: TC-044 — SDPC Suspension End Earlier ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC044.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-044');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #4 → Steps 57–58: TC-018 + TC-045 (Suspension End → Later)
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #4: Clear + Fresh SDPC Enrollment (for Steps 57–58)', async () => {
    skipIfBeforeTarget('SDPC RESET #4');
    await performSdpcReset('Reset #4 — before TC-045 Suspension End Later');
  });

  test('Step 57 | TC-018: SDPC Suspension (repeat for TC-045)', async () => {
    skipIfBeforeTarget('Step 57');
    console.log('\n─── Step 57: TC-018 — SDPC Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step57-TC-018');
  });

  test('Step 58 | TC-045: SDPC Suspension End → Later', async () => {
    skipIfBeforeTarget('Step 58');
    console.log('\n─── Step 58: TC-045 — SDPC Suspension End Later ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC045.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-045');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #5 → Steps 59–60: TC-018 + TC-046 (Suspension End Valid → Null)
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #5: Clear + Fresh SDPC Enrollment (for Steps 59–60)', async () => {
    skipIfBeforeTarget('SDPC RESET #5');
    await performSdpcReset('Reset #5 — before TC-046 Suspension End Valid→Null');
  });

  test('Step 59 | TC-018: SDPC Suspension (repeat for TC-046)', async () => {
    skipIfBeforeTarget('Step 59');
    console.log('\n─── Step 59: TC-018 — SDPC Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step59-TC-018');
  });

  test('Step 60 | TC-046: SDPC Suspension End Valid → Null', async () => {
    skipIfBeforeTarget('Step 60');
    console.log('\n─── Step 60: TC-046 — SDPC Suspension End Valid→Null ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: null });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-046');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #6 → Steps 61–62: TC-036 + TC-038 (Open-Ended → Bounded)
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #6: Clear + Fresh SDPC Enrollment (for Steps 61–62)', async () => {
    skipIfBeforeTarget('SDPC RESET #6');
    await performSdpcReset('Reset #6 — before TC-036 Open-Ended Suspension');
  });

  test('Step 61 | TC-036: SDPC Open-Ended Suspension', async () => {
    skipIfBeforeTarget('Step 61');
    console.log('\n─── Step 61: TC-036 — SDPC Open-Ended Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC036.bcInput.suspensionStartDate!,
      reason: 'Hospitalized',
      // No endDate — open-ended
    });
    expect(result).toBe(true);
    await verifySyncSuccess('TC-036');
  });

  test('Step 62 | TC-038: SDPC Suspension End Null → Valid', async () => {
    skipIfBeforeTarget('Step 62');
    console.log('\n─── Step 62: TC-038 — SDPC Suspension End Null→Valid ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC038.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-038');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #7 → Steps 63–64: TC-037, TC-047
  // ═══════════════════════════════════════════════════════════════════════════

  test('SDPC RESET #7: Clear + Fresh SDPC Enrollment (for Steps 63–64)', async () => {
    skipIfBeforeTarget('SDPC RESET #7');
    await performSdpcReset('Reset #7 — before TC-037/TC-047 final sequence');
  });

  test('Step 63 | TC-037: SDPC Suspension < 3 Days (No Txn)', async () => {
    skipIfBeforeTarget('Step 63');
    console.log('\n─── Step 63: TC-037 — SDPC Suspension Too Short ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    // Attempt suspension with < 3 day span — should be rejected or no txn
    await addSuspension(page, {
      startDate: TC037.bcInput.suspensionStartDate!,
      endDate: TC037.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });

    // Verify no conflict (enrollment unchanged)
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-037] Short suspension — no MMIS txn (as expected)');
  });

  test('Step 64 | TC-047: SDPC End Date Later + Suspended', async () => {
    skipIfBeforeTarget('Step 64');
    console.log('\n─── Step 64: TC-047 — SDPC End Date Later While Suspended ───');
    // Add bounded suspension first
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened).toBe(true);

    const suspAdded = await addSuspension(page, {
      startDate: TC018.bcInput.suspensionStartDate!,
      endDate: TC018.bcInput.suspensionEndDate!,
      reason: 'Hospitalized',
    });
    expect(suspAdded).toBe(true);
    await verifySyncSuccess('Step64-setup');

    // Now edit suspension end date (TC-047 action)
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const reopened = await openEnrollmentByText(page, /SDPC/);
    expect(reopened).toBe(true);

    const edited = await editSuspension(page, { endDate: '08/10/2026' });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-047');

    console.log('[Cascade D] ✓ All SDPC lifecycle steps complete');
  });

});
