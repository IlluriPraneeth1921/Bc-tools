/**
 * ATC: TC-041 — SDPC Begin Date Changed to Later
 * Similar to TC-020 but for SDPC program.
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

const DATA = SCENARIOS.TC_041;
const NEW_BEGIN_DATE = DATA.bcInput.newEnrollmentStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-041: SDPC Begin Date Later', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-041', participantUuid);
    console.log(`[TC-041] Participant UUID: ${participantUuid}`);
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
    logPrefix: '[TC-041]',
    newStartDate: NEW_BEGIN_DATE,
  });

  test('ATC-ES-154 - Precondition: SDPC is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      const precondConfig: DisenrollmentStepConfig = { program: 'SDPC', startDate: '', newEndDate: '', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-041]' };
      await verifyEnrolledPrecondition(page, precondConfig);
      tracker.record('ATC-ES-154 - Precondition: SDPC is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-154 - Precondition: SDPC is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-155 - Change SDPC begin date to later', async () => {
    test.setTimeout(60_000);
    try {
      await editEnrolledProgramEnrollment(page, getStepConfig());
      tracker.record('ATC-ES-155 - Change SDPC begin date to later', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-155 - Change SDPC begin date to later', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-156 - Verify MMIS sync (2 transactions: S310+S300)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyEditEnrollmentMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-156 - Verify MMIS sync (2 transactions: S310+S300)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-156 - Verify MMIS sync (2 transactions: S310+S300)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
