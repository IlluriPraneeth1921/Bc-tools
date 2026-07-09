/**
 * ATC: TC-026 — SDPC End Date Earlier (Disenrollment)
 *
 * Creates a Disenrolled enrollment via "+ New Program Enrollment" dialog,
 * setting an earlier end date for the SDPC program (disenrollment).
 * Expects 1 MMIS transaction (closure via S340).
 *
 * Similar to TC-006 (IRIS disenrollment) but targets the SDPC program.
 *
 * Flow:
 * 1. Navigate to enrollment list → verify SDPC Enrolled state
 * 2. Open "+ New Program Enrollment" dialog
 * 3. Set Program="SDPC", Status="Disenrolled", Start Date, End Date (earlier)
 * 4. Save → triggers MMIS closure transaction
 * 5. Verify SU response
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: TC-015 must have completed successfully (active SDPC enrollment with SU sync).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import {
  resolveParticipantUuid,
} from './actions/enrollment.actions';
import {
  verifyEnrolledPrecondition,
  createDisenrolledWithEarlierEndDate,
  verifyDisenrollmentMmisSync,
  DisenrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_026;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const NEW_END_DATE = DATA.bcInput.newEnrollmentEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-026: SDPC End Date Earlier (Disenrollment)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-026', participantUuid);
    console.log(`[TC-026] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // Shared config for disenrollment steps
  const getStepConfig = (): DisenrollmentStepConfig => ({
    program: 'SDPC',
    startDate: ENROLLMENT_START,
    newEndDate: NEW_END_DATE,
    statusReason: 'Not Applicable',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-026]',
  });

  test('ATC-ES-109 - Precondition: SDPC is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await verifyEnrolledPrecondition(page, getStepConfig());
      tracker.record('ATC-ES-109 - Precondition: SDPC is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-109 - Precondition: SDPC is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-110 - Set Disenrolled with earlier end date via New Program Enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await createDisenrolledWithEarlierEndDate(page, getStepConfig());
      tracker.record('ATC-ES-110 - Set Disenrolled with earlier end date via New Program Enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-110 - Set Disenrolled with earlier end date via New Program Enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-111 - Verify MMIS sync completes with SU response (S340)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyDisenrollmentMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-111 - Verify MMIS sync completes with SU response (S340)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-111 - Verify MMIS sync completes with SU response (S340)', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
