/**
 * ATC: TC-033 — Disenrolled Span Created — Real Reason Code Sent (S345)
 *
 * After TC-006 end-dates the enrollment with placeholder reason codes (2W/2W),
 * this test creates a Disenrolled span with an actual disenrollment reason
 * (e.g., "Deceased" → reason code "64"). This triggers S345 to re-send
 * the Closure with real translated reason codes.
 *
 * Similar to TC-006 but uses statusReason="Deceased" instead of "Not Applicable".
 *
 * Flow:
 * 1. Navigate to enrollment list → verify end-dated enrollment exists
 * 2. Click "+ New Program Enrollment" → set Status=Disenrolled, Reason=Deceased
 * 3. Save → triggers S345 MMIS re-send closure with real reason codes
 * 4. Verify SU response
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: TC-006 must have completed successfully (end-dated enrollment with S340 closure).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
} from './actions/enrollment.actions';
import {
  createDisenrolledWithEarlierEndDate,
  verifyDisenrollmentMmisSync,
  verifyFinalSyncStatus,
  DisenrollmentStepConfig,
  EnrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_033;
const DISENROLLMENT_REASON = DATA.bcInput.statusReason || 'Deceased';
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-033: Disenrolled Span Created — Real Reason Code (S345)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-033', participantUuid);
    console.log(`[TC-033] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // Shared config for disenrollment steps — uses "Deceased" as the real reason
  const getStepConfig = (): DisenrollmentStepConfig => ({
    program: 'IRIS',
    startDate: ENROLLMENT_END_DATE,  // Re-send uses the end date as start
    newEndDate: ENROLLMENT_END_DATE,
    statusReason: DISENROLLMENT_REASON,
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-033]',
  });

  test('ATC-ES-131 - Precondition: Verify end-dated enrollment exists (TC-006 completed)', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const enrollmentRows = page.locator('mat-row');
      const rowCount = await enrollmentRows.count();
      console.log(`[TC-033] Enrollment rows found: ${rowCount}`);
      expect(rowCount, 'No enrollment rows found — TC-006 prerequisite may not have run').toBeGreaterThanOrEqual(1);

      const pageText = await page.locator('body').textContent().catch(() => '') || '';
      const hasValidState = pageText.includes('Enrolled') || pageText.includes('Disenrolled');
      expect(hasValidState, 'No Enrolled or Disenrolled row found').toBe(true);
      console.log('[TC-033] ✓ Precondition met — end-dated enrollment exists');
      tracker.record('ATC-ES-131 - Precondition: Verify end-dated enrollment exists (TC-006 completed)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-131 - Precondition: Verify end-dated enrollment exists (TC-006 completed)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('Capture MMIS snapshot (before)', async () => {
    test.setTimeout(60_000);
    try {
      const screenshot = await captureMmisScreenshot(page, participantUuid);
      if (screenshot) tracker.setBeforeScreenshot(screenshot);
      tracker.record('Capture MMIS snapshot (before)', 'passed');
    } catch (err) {
      tracker.record('Capture MMIS snapshot (before)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-132 - Create Disenrolled span with real reason code (Deceased)', async () => {
    test.setTimeout(60_000);
    try {
      await createDisenrolledWithEarlierEndDate(page, getStepConfig());
      tracker.record('ATC-ES-132 - Create Disenrolled span with real reason code (Deceased)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-132 - Create Disenrolled span with real reason code (Deceased)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-133 - Verify MMIS sync completes with SU response (S345)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyDisenrollmentMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-133 - Verify MMIS sync completes with SU response (S345)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-133 - Verify MMIS sync completes with SU response (S345)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-134 - Verify SU response and no conflict', async () => {
    test.setTimeout(30_000);
    try {
      // Reuse EnrollmentStepConfig-based verifyFinalSyncStatus
      const syncConfig: EnrollmentStepConfig = {
        program: 'IRIS',
        startDate: ENROLLMENT_END_DATE,
        participantUuid,
        mockMmis: MOCK_MMIS,
        logPrefix: '[TC-033]',
      };
      await verifyFinalSyncStatus(page, syncConfig);
      tracker.record('ATC-ES-134 - Verify SU response and no conflict', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-134 - Verify SU response and no conflict', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
