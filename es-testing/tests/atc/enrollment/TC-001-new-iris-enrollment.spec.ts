/**
 * ATC: TC-001 — New IRIS Enrollment Happy Path
 *
 * Lifecycle: Pristine Check → (Reset if needed) → Draft → Referred → Enrolled → Verify MMIS sync
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Person UUID: c7a3862e-f166-466d-a5fb-b4670130aebd
 *
 * Report output (test-results/TC-001/):
 *   - mmis-snapshot-before.png   MMIS Waiver+SDPC state before test
 *   - mmis-snapshot-after.png    MMIS Waiver+SDPC state after test (pass or fail)
 *   - enrollment-final-state.png Enrollment list at end of run
 *   - summary.json               Pass/fail, timestamps, per-step outcomes
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
} from './actions/enrollment.actions';
import {
  createReferredEnrollment,
  createEnrolledEnrollment,
  verifyMmisSyncSuccess,
  EnrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_001;
const ISP_START_DATE = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let isPristine = false;
let tracker: StepTracker;

test.describe.serial('TC-001: New IRIS Enrollment Happy Path', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-001', participantUuid);
    console.log(`[TC-001] UUID: ${participantUuid}, MOCK_MMIS: ${MOCK_MMIS}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // Shared config for reusable lifecycle steps
  const getStepConfig = (overrides?: Partial<EnrollmentStepConfig>): EnrollmentStepConfig => ({
    program: 'IRIS',
    startDate: ISP_START_DATE,
    endDate: ENROLLMENT_END_DATE,
    statusReason: 'IRIS Consultant',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-001]',
    ...overrides,
  });

  test('ATC-ES-001 - Precondition: Participant is accessible', async () => {
    test.setTimeout(60_000);
    try {
      const accessible = await navigateToParticipant(page, participantUuid);
      expect(accessible).toBe(true);
      tracker.record('ATC-ES-001 - Precondition: Participant is accessible', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-001 - Precondition: Participant is accessible', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-001a - Capture MMIS snapshot (before)', async () => {
    test.setTimeout(60_000);
    try {
      const screenshot = await captureMmisScreenshot(page, participantUuid);
      if (screenshot) tracker.setBeforeScreenshot(screenshot);
      tracker.record('ATC-ES-001a - Capture MMIS snapshot (before)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-001a - Capture MMIS snapshot (before)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-002 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
    test.setTimeout(60_000);
    try {
      const mmisState = await getMmisSnapshotState(page, participantUuid);
      expect(mmisState.loaded).toBe(true);

      if (!mmisState.hasActiveWaiverEnrollment) {
        isPristine = true;
        console.log('[TC-001] ✓ Pristine state — no active MMIS waiver enrollment');
      } else {
        isPristine = false;
        console.log('[TC-001] ✗ Active enrollment found — reset required');
      }
      tracker.record('ATC-ES-002 - Check MMIS Snapshot', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-002 - Check MMIS Snapshot', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-003 - Reset: Withdraw referral to clear MMIS (if not pristine)', async () => {
    test.setTimeout(120_000);
    try {
      if (isPristine) {
        console.log('[TC-001] Skipping reset — already pristine');
        tracker.record('ATC-ES-003 - Reset', 'skipped');
        return;
      }
      const resetSuccess = await ensurePristineState(page, participantUuid);
      expect(resetSuccess, 'Failed to reset participant to pristine state').toBe(true);
      isPristine = true;
      console.log('[TC-001] ✓ Reset complete');
      tracker.record('ATC-ES-003 - Reset', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-003 - Reset', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-004 - Create Draft enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row, [class*="enrollment"]').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

      const firstRow = page.locator('mat-row').first();
      const rowText = await firstRow.textContent().catch(() => '') || '';
      if (rowText.includes('Draft') || rowText.includes('Referred') || rowText.includes('Enrolled')) {
        console.log(`[TC-001] Enrollment already exists — skipping Draft creation`);
        tracker.record('ATC-ES-004 - Create Draft enrollment', 'skipped');
        return;
      }

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Draft',
        statusReason: 'Not Applicable',
        startDate: ISP_START_DATE,
      });
      expect(saved, 'Failed to create Draft enrollment').toBe(true);
      console.log('[TC-001] Draft enrollment created');
      tracker.record('ATC-ES-004 - Create Draft enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-004 - Create Draft enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-005 - State check: First row is Draft or beyond', async () => {
    test.setTimeout(30_000);
    try {
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      expect(rowText).toContain('IRIS');
      const validState = rowText.includes('Draft') || rowText.includes('Referred') || rowText.includes('Enrolled');
      expect(validState, `Expected Draft/Referred/Enrolled but got: ${rowText.substring(0, 80)}`).toBe(true);
      tracker.record('ATC-ES-005 - State check: Draft or beyond', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-005 - State check: Draft or beyond', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-006 - Create Referred enrollment', async () => {
    test.setTimeout(60_000);
    try {
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      if (rowText.includes('Referred') || rowText.includes('Enrolled')) {
        console.log(`[TC-001] Already at ${rowText.includes('Enrolled') ? 'Enrolled' : 'Referred'} — skipping`);
        tracker.record('ATC-ES-006 - Create Referred enrollment', 'skipped');
        return;
      }
      await createReferredEnrollment(page, getStepConfig());
      tracker.record('ATC-ES-006 - Create Referred enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-006 - Create Referred enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-007 - State check: First row is Referred or beyond', async () => {
    test.setTimeout(30_000);
    try {
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      const validState = rowText.includes('Referred') || rowText.includes('Enrolled');
      expect(validState, `Expected Referred/Enrolled but got: ${rowText.substring(0, 80)}`).toBe(true);
      tracker.record('ATC-ES-007 - State check: Referred or beyond', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-007 - State check: Referred or beyond', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-008 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
    test.setTimeout(90_000);
    try {
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      if (rowText.includes('Enrolled')) {
        console.log('[TC-001] Already Enrolled — skipping');
        tracker.record('ATC-ES-008 - Create Enrolled enrollment', 'skipped');
        return;
      }
      await createEnrolledEnrollment(page, getStepConfig({ statusReason: 'Not Applicable' }));
      tracker.record('ATC-ES-008 - Create Enrolled enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-008 - Create Enrolled enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-009 - Verify: First row is Enrolled with sync badge', async () => {
    test.setTimeout(30_000);
    try {
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      expect(rowText).toContain('Enrolled');
      expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
      tracker.record('ATC-ES-009 - Verify: Enrolled with sync badge', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-009 - Verify: Enrolled with sync badge', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-010 - Verify: MMIS sync success, no conflict', async () => {
    test.setTimeout(90_000);
    try {
      await verifyMmisSyncSuccess(page, getStepConfig({ statusReason: 'Not Applicable' }));
      tracker.record('ATC-ES-010 - Verify: MMIS sync success', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-010 - Verify: MMIS sync success', 'failed', (err as Error).message);
      throw err;
    }
  });

});
