/**
 * ATC: TC-040 — SDPC Begin Date Changed to Earlier
 * Similar to TC-019 but for SDPC program.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  verifyEnrolledPrecondition,
  editEnrolledProgramEnrollment,
  verifyEditEnrollmentMmisSync,
  EditEnrollmentStepConfig,
  DisenrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_040;
const NEW_BEGIN_DATE = DATA.bcInput.newEnrollmentStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-040: SDPC Begin Date Earlier', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-040', participantUuid);
    console.log(`[TC-040] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): EditEnrollmentStepConfig => ({
    program: 'SDPC',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-040]',
    newStartDate: NEW_BEGIN_DATE,
  });

  test('ATC-ES-151 - Precondition: SDPC is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      const precondConfig: DisenrollmentStepConfig = { program: 'SDPC', startDate: '', newEndDate: '', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-040]' };
      await verifyEnrolledPrecondition(page, precondConfig);
      tracker.record('ATC-ES-151 - Precondition: SDPC is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-151 - Precondition: SDPC is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-152 - Change SDPC begin date to earlier', async () => {
    test.setTimeout(60_000);
    try {
      await editEnrolledProgramEnrollment(page, getStepConfig());
      tracker.record('ATC-ES-152 - Change SDPC begin date to earlier', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-152 - Change SDPC begin date to earlier', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-153 - Verify MMIS sync (2 transactions: S310+S300)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyEditEnrollmentMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-153 - Verify MMIS sync (2 transactions: S310+S300)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-153 - Verify MMIS sync (2 transactions: S310+S300)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
