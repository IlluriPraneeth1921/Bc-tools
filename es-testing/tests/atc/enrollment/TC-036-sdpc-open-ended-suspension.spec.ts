/**
 * ATC: TC-036 — SDPC Open-Ended Suspension (No End Date)
 * Similar to TC-010 but for SDPC program.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  openEnrolledProgramDetail,
  addOpenEndedSuspension,
  verifySuspensionMmisSync,
  SuspensionStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_036;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-036: SDPC Open-Ended Suspension (No End Date)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-036', participantUuid);
    console.log(`[TC-036] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): SuspensionStepConfig => ({
    program: 'SDPC',
    suspensionStartDate: SUSPENSION_START,
    reason: 'Hospitalized',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-036]',
  });

  test('ATC-ES-141 - Precondition: SDPC is Enrolled — open detail', async () => {
    test.setTimeout(60_000);
    try {
      await openEnrolledProgramDetail(page, getStepConfig());
      tracker.record('ATC-ES-141 - Precondition: SDPC is Enrolled — open detail', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-141 - Precondition: SDPC is Enrolled — open detail', 'failed', (err as Error).message);
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

  test('ATC-ES-142 - Add open-ended suspension (no end date)', async () => {
    test.setTimeout(60_000);
    try {
      await addOpenEndedSuspension(page, getStepConfig());
      tracker.record('ATC-ES-142 - Add open-ended suspension (no end date)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-142 - Add open-ended suspension (no end date)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-143 - Verify MMIS sync (2 transactions: S500+S510)', async () => {
    test.setTimeout(90_000);
    try {
      await verifySuspensionMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-143 - Verify MMIS sync (2 transactions: S500+S510)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-143 - Verify MMIS sync (2 transactions: S500+S510)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
