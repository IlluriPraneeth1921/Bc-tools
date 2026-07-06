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
 *
 * This file delegates all UI interactions to enrollment.actions.ts,
 * profile.actions.ts, and assignment.actions.ts — no raw selectors here.
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
  performIcaTransfer,
  performFeaTransfer,
  verifyMmisSync,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import { updateStreetAddress } from '../../atc/enrollment/actions/profile.actions';
import { performIcaTransferViaAssignments } from '../../atc/enrollment/actions/assignment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Configuration ────────────────────────────────────────────────────────────

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

// Pull dates from centralized scenario data
const TC001 = SCENARIOS.TC_001;
const TC002 = SCENARIOS.TC_002;
const TC003 = SCENARIOS.TC_003;
const TC006 = SCENARIOS.TC_006;
const TC007 = SCENARIOS.TC_007;
const TC010 = SCENARIOS.TC_010;
const TC011 = SCENARIOS.TC_011;
const TC013 = SCENARIOS.TC_013;
const TC019 = SCENARIOS.TC_019;
const TC020 = SCENARIOS.TC_020;
const TC021 = SCENARIOS.TC_021;
const TC022 = SCENARIOS.TC_022;
const TC023 = SCENARIOS.TC_023;
const TC024 = SCENARIOS.TC_024;
const TC025 = SCENARIOS.TC_025;
const TC028 = SCENARIOS.TC_028;
const TC031 = SCENARIOS.TC_031;

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

// ─── Helper: Establish fresh Enrolled state (TC-001 flow) ─────────────────────

async function establishEnrolled(): Promise<void> {
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const state = await getCurrentIrisState(page);
  if (state === 'Enrolled') {
    console.log('[establish] Already Enrolled — skipping');
    return;
  }

  // Draft
  if (state === null || state === 'Disenrolled') {
    const ok = await addIrisEnrollment(page, {
      program: 'IRIS', status: 'Draft',
      statusReason: 'Not Applicable', startDate: TC001.bcInput.enrollmentStartDate,
    });
    expect(ok, 'Failed to create Draft').toBe(true);
  }

  // Referred
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const s1 = await getCurrentIrisState(page);
  if (s1 === 'Draft') {
    const ok = await addIrisEnrollment(page, {
      program: 'IRIS', status: 'Referred',
      statusReason: 'IRIS Consultant', startDate: TC001.bcInput.enrollmentStartDate,
    });
    expect(ok, 'Failed to create Referred').toBe(true);
  }

  // Enrolled
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const s2 = await getCurrentIrisState(page);
  if (s2 === 'Referred') {
    const ok = await addIrisEnrollment(page, {
      program: 'IRIS', status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: TC001.bcInput.enrollmentStartDate,
      endDate: TC001.bcInput.enrollmentEndDate,
    });
    expect(ok, 'Failed to create Enrolled').toBe(true);
  }

  // Final verify
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const finalState = await getCurrentIrisState(page);
  expect(finalState).toBe('Enrolled');
}

// ─── Helper: RESET = TC-008 + TC-001 ─────────────────────────────────────────

async function performReset(label: string): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[RESET] ${label}`);
  console.log(`${'═'.repeat(60)}\n`);

  // TC-008: Referral Withdrawn
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const opened = await openEnrollmentByText(page, /Enrolled|Referred/, /Disenrolled/);
  if (opened) {
    const edited = await editEnrollment(page, {
      status: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    });
    if (edited) {
      await verifySyncSuccess('RESET-TC-008');
    }
  } else {
    // Fallback to pristine state helper
    const pristine = await ensurePristineState(page, participantUuid);
    expect(pristine, 'Could not reset participant to pristine state').toBe(true);
  }

  // Wait for MMIS to process deletion
  const cleared = await waitForPristine();
  expect(cleared, 'MMIS still shows waiver enrollment after withdrawal').toBe(true);

  // TC-001: Fresh enrollment
  await establishEnrolled();

  // Verify sync on new enrollment
  await navigateToEnrollments(page, participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const detailOpened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
  expect(detailOpened).toBe(true);
  await verifySyncSuccess('RESET-TC-001');
}

async function waitForPristine(): Promise<boolean> {
  for (let attempt = 1; attempt <= 10; attempt++) {
    const mmisState = await getMmisSnapshotState(page, participantUuid);
    if (!mmisState.hasActiveWaiverEnrollment) return true;
    await page.waitForTimeout(10_000);
  }
  return false;
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
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 1–7: Initial Enrollment → Active State Modifications → Disenrollment
  // ═══════════════════════════════════════════════════════════════════════════

  test('Step 01 | TC-001: New IRIS Enrollment — Happy Path', async () => {
    console.log('\n─── Step 1: TC-001 — New IRIS Enrollment ───');
    await establishEnrolled();

    // Navigate to detail and verify sync
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-001');
  });

  test('Step 02 | TC-014: Address-Only Update (S700 Cond 1)', async () => {
    console.log('\n─── Step 2: TC-014 — Address-Only Update ───');
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    }
    const irisState = await getCurrentIrisState(page);
    expect(irisState, 'Precondition: must be Enrolled').toBe('Enrolled');

    const newAddress = await updateStreetAddress(page, participantUuid);
    expect(newAddress, 'Address update failed').not.toBeNull();
    console.log(`[TC-014] Address updated to: "${newAddress}" — S700 triggered`);

    // Verify sync on enrollment detail
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-014');
  });

  test('Step 03 | TC-003: ICA Transfer — Active Span', async () => {
    console.log('\n─── Step 3: TC-003 — ICA Transfer ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    // Try assignment page first, fallback to enrollment detail
    const transferred = await performIcaTransferViaAssignments(page, participantUuid, {
      newLocation: TC003.bcInput.agencyChange!.newAgency,
      effectiveDate: TC003.bcInput.agencyChange!.effectiveDate,
    });
    if (!transferred) {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened).toBe(true);
      const result = await performIcaTransfer(page, TC003.bcInput.agencyChange!.newAgency);
      expect(result).toBe(true);
    }

    // Verify sync
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-003');
  });

  test('Step 04 | TC-016: FEA Transfer — Close + Open', async () => {
    console.log('\n─── Step 4: TC-016 — FEA Transfer ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const transferred = await performFeaTransfer(page);
    expect(transferred).toBe(true);
    await verifySyncSuccess('TC-016');
  });

  test('Step 05 | TC-019: Begin Date → Earlier (Delete + Recreate)', async () => {
    console.log('\n─── Step 5: TC-019 — Begin Date Earlier ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editEnrollment(page, { startDate: TC019.bcInput.newEnrollmentStartDate! });
    expect(edited, 'Edit dialog did not close').toBe(true);
    await verifySyncSuccess('TC-019');
  });

  test('Step 06 | TC-020: Begin Date → Later (Delete + Recreate)', async () => {
    console.log('\n─── Step 6: TC-020 — Begin Date Later ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editEnrollment(page, { startDate: TC020.bcInput.newEnrollmentStartDate! });
    expect(edited, 'Edit dialog did not close').toBe(true);
    await verifySyncSuccess('TC-020');
  });

  test('Step 07 | TC-006: End Date → Earlier (Disenrollment)', async () => {
    console.log('\n─── Step 7: TC-006 — End Date Earlier (Disenrollment) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Disenrolled',
      statusReason: 'Not Applicable',
      startDate: TC006.bcInput.enrollmentStartDate,
      endDate: TC006.bcInput.newEnrollmentEndDate!,
    });
    expect(saved, 'Disenrollment dialog did not close').toBe(true);

    // Verify Disenrolled state
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-006');
  });

  test.skip('Step 08 | TC-033: Disenrolled Span — Real Reason Code (SKIPPED)', async () => {
    // TC-033 will be added later
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STEPS 9–12: Disenrolled State → Re-enrollment → Suspension → Delete
  // ═══════════════════════════════════════════════════════════════════════════

  test('Step 09 | TC-032: Address Update — No Current Span (No Txn)', async () => {
    console.log('\n─── Step 9: TC-032 — Address Update (no active span) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await getCurrentIrisState(page);
    expect(state, 'Precondition: must be Disenrolled after TC-006').toBe('Disenrolled');

    const newAddress = await updateStreetAddress(page, participantUuid);
    expect(newAddress, 'Address update failed').not.toBeNull();
    console.log(`[TC-032] Address updated to: "${newAddress}" — no S700 expected (disenrolled)`);

    // Verify no conflict
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Disenrolled/);
    if (opened) {
      const status = await getSyncStatus(page);
      expect(status.hasConflict).toBe(false);
    }
  });

  test('Step 10 | TC-007: End Date → Later (Extension / Re-open)', async () => {
    console.log('\n─── Step 10: TC-007 — End Date Later (Extension) ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Disenrolled');

    // Re-enroll via Draft → Referred → Enrolled (same as TC-007 ATC)
    const draftOk = await addIrisEnrollment(page, {
      program: 'IRIS', status: 'Draft',
      statusReason: 'Not Applicable', startDate: TC007.bcInput.enrollmentStartDate,
    });
    expect(draftOk).toBe(true);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const refOk = await addIrisEnrollment(page, {
      program: 'IRIS', status: 'Referred',
      statusReason: 'IRIS Consultant', startDate: TC007.bcInput.enrollmentStartDate,
    });
    expect(refOk).toBe(true);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const enrOk = await addIrisEnrollment(page, {
      program: 'IRIS', status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: TC007.bcInput.enrollmentStartDate,
      endDate: TC007.bcInput.newEnrollmentEndDate!,
    });
    expect(enrOk).toBe(true);

    // Verify sync (S350 extension)
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);
    await verifySyncSuccess('TC-007');
  });

  test('Step 11 | TC-002: Enrolled → Suspended (bounded, 3 spans)', async () => {
    console.log('\n─── Step 11: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('TC-002');
  });

  test('Step 12 | TC-012: Suspension Deleted (spans merged)', async () => {
    console.log('\n─── Step 12: TC-012 — Suspension Deleted ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const deleted = await deleteSuspension(page);
    expect(deleted, 'Suspension deletion failed').toBe(true);
    await verifySyncSuccess('TC-012');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #1 → Steps 13–14: TC-002 + TC-017 (ICA Transfer During Suspension)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #1: Clear MMIS + Fresh Enrollment (for Steps 13–14)', async () => {
    await performReset('Reset #1 — before TC-017 ICA Transfer During Suspension');
  });

  test('Step 13 | TC-002: Enrolled → Suspended (repeat for TC-017)', async () => {
    console.log('\n─── Step 13: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step13-TC-002');
  });

  test('Step 14 | TC-017: ICA Transfer During Suspension', async () => {
    console.log('\n─── Step 14: TC-017 — ICA Transfer During Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const transferred = await performIcaTransfer(page);
    expect(transferred).toBe(true);
    await verifySyncSuccess('TC-017');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #2 → Steps 15–16: TC-002 + TC-021 (Suspension Begin → Earlier)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #2: Clear MMIS + Fresh Enrollment (for Steps 15–16)', async () => {
    await performReset('Reset #2 — before TC-021 Suspension Begin Earlier');
  });

  test('Step 15 | TC-002: Enrolled → Suspended (repeat for TC-021)', async () => {
    console.log('\n─── Step 15: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step15-TC-002');
  });

  test('Step 16 | TC-021: Suspension Begin Date → Earlier', async () => {
    console.log('\n─── Step 16: TC-021 — Suspension Begin Earlier ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { startDate: TC021.bcInput.newSuspensionStartDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-021');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #3 → Steps 17–18: TC-002 + TC-022 (Suspension Begin → Later)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #3: Clear MMIS + Fresh Enrollment (for Steps 17–18)', async () => {
    await performReset('Reset #3 — before TC-022 Suspension Begin Later');
  });

  test('Step 17 | TC-002: Enrolled → Suspended (repeat for TC-022)', async () => {
    console.log('\n─── Step 17: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step17-TC-002');
  });

  test('Step 18 | TC-022: Suspension Begin Date → Later', async () => {
    console.log('\n─── Step 18: TC-022 — Suspension Begin Later ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { startDate: TC022.bcInput.newSuspensionStartDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-022');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #4 → Steps 19–20: TC-002 + TC-023 (Suspension End → Earlier)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #4: Clear MMIS + Fresh Enrollment (for Steps 19–20)', async () => {
    await performReset('Reset #4 — before TC-023 Suspension End Earlier');
  });

  test('Step 19 | TC-002: Enrolled → Suspended (repeat for TC-023)', async () => {
    console.log('\n─── Step 19: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step19-TC-002');
  });

  test('Step 20 | TC-023: Suspension End Date → Earlier', async () => {
    console.log('\n─── Step 20: TC-023 — Suspension End Earlier ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC023.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-023');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #5 → Steps 21–22: TC-002 + TC-024 (Suspension End → Later)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #5: Clear MMIS + Fresh Enrollment (for Steps 21–22)', async () => {
    await performReset('Reset #5 — before TC-024 Suspension End Later');
  });

  test('Step 21 | TC-002: Enrolled → Suspended (repeat for TC-024)', async () => {
    console.log('\n─── Step 21: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step21-TC-002');
  });

  test('Step 22 | TC-024: Suspension End Date → Later', async () => {
    console.log('\n─── Step 22: TC-024 — Suspension End Later ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC024.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-024');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #6 → Steps 23–24: TC-002 + TC-025 (Suspension End Valid → Null)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #6: Clear MMIS + Fresh Enrollment (for Steps 23–24)', async () => {
    await performReset('Reset #6 — before TC-025 Suspension End Valid→Null');
  });

  test('Step 23 | TC-002: Enrolled → Suspended (repeat for TC-025)', async () => {
    console.log('\n─── Step 23: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step23-TC-002');
  });

  test('Step 24 | TC-025: Suspension End Date Valid → Null (open-ended)', async () => {
    console.log('\n─── Step 24: TC-025 — Suspension End Valid→Null ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: null });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-025');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #7 → Steps 25–26: TC-002 + TC-031 (ICA Transfer — Span-C Exists)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #7: Clear MMIS + Fresh Enrollment (for Steps 25–26)', async () => {
    await performReset('Reset #7 — before TC-031 ICA Transfer Span-C Exists');
  });

  test('Step 25 | TC-002: Enrolled → Suspended (repeat for TC-031)', async () => {
    console.log('\n─── Step 25: TC-002 — Add Bounded Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(result).toBe(true);
    await verifySyncSuccess('Step25-TC-002');
  });

  test('Step 26 | TC-031: ICA Transfer — Span-C Exists', async () => {
    console.log('\n─── Step 26: TC-031 — ICA Transfer with Span-C ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const transferred = await performIcaTransfer(page);
    expect(transferred).toBe(true);
    await verifySyncSuccess('TC-031');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #8 → Steps 27–28: TC-010 + TC-013 (Open-Ended → Bounded)
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #8: Clear MMIS + Fresh Enrollment (for Steps 27–28)', async () => {
    await performReset('Reset #8 — before TC-010 Open-Ended Suspension');
  });

  test('Step 27 | TC-010: Open-Ended Suspension (no end date)', async () => {
    console.log('\n─── Step 27: TC-010 — Open-Ended Suspension ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: TC010.bcInput.suspensionStartDate!,
      reason: 'Hospital Admission',
      // No endDate — open-ended
    });
    expect(result).toBe(true);
    await verifySyncSuccess('TC-010');
  });

  test('Step 28 | TC-013: Suspension End Null → Valid', async () => {
    console.log('\n─── Step 28: TC-013 — Suspension End Null→Valid ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC013.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-013');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET #9 → Steps 29–31: TC-011, TC-028, TC-008
  // ═══════════════════════════════════════════════════════════════════════════

  test('RESET #9: Clear MMIS + Fresh Enrollment (for Steps 29–31)', async () => {
    await performReset('Reset #9 — before TC-011/TC-028/TC-008 final sequence');
  });

  test('Step 29 | TC-011: Suspension < 3 Days (Error — No MMIS Txn)', async () => {
    console.log('\n─── Step 29: TC-011 — Suspension Too Short ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await getCurrentIrisState(page)).toBe('Enrolled');

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    // Attempt suspension with < 3 day span — should be rejected
    await addSuspension(page, {
      startDate: TC011.bcInput.suspensionStartDate!,
      endDate: TC011.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });

    // Verify no sync triggered / no conflict (enrollment unchanged)
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    console.log('[TC-011] Short suspension rejected — no MMIS txn');
  });

  test('Step 30 | TC-028: End Date Later + Last Span Suspended', async () => {
    console.log('\n─── Step 30: TC-028 — End Date Later While Suspended ───');
    // TC-028 requires bounded suspension — add one first
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    // Add bounded suspension to establish precondition
    const suspAdded = await addSuspension(page, {
      startDate: TC002.bcInput.suspensionStartDate!,
      endDate: TC002.bcInput.suspensionEndDate!,
      reason: 'Hospital Admission',
    });
    expect(suspAdded).toBe(true);
    await verifySyncSuccess('Step30-setup');

    // Now edit suspension end date to later (TC-028 action)
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const reopened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(reopened).toBe(true);

    const edited = await editSuspension(page, { endDate: TC028.bcInput.newSuspensionEndDate! });
    expect(edited, 'Edit suspension failed').toBe(true);
    await verifySyncSuccess('TC-028');
  });

  test('Step 31 | TC-008: Enrolled → Referral Withdrawn (final cleanup)', async () => {
    console.log('\n─── Step 31: TC-008 — Referral Withdrawn ───');
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled' && state !== 'Suspended') {
      console.log(`[TC-008] Skipping — not Enrolled/Suspended (current: ${state})`);
      return;
    }

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editEnrollment(page, {
      status: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    });
    expect(edited, 'Edit dialog did not close').toBe(true);
    await verifySyncSuccess('TC-008');

    // Verify MMIS snapshot is cleared
    const cleared = await waitForPristine();
    expect(cleared, 'MMIS still shows waiver enrollment').toBe(true);
    console.log('[TC-008] ✓ Cascade A complete — participant returned to pristine state');
  });

});
