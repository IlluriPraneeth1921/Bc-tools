/**
 * ATC: TC-027 — SDPC Suspension Deleted
 *
 * Deletes an existing suspension record from an active SDPC enrollment.
 * Expects 2 MMIS transactions: S410 (delete suspension) + S470 (restore span).
 *
 * Similar to TC-012 (IRIS suspension deleted) but targets the SDPC program.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: TC-018 must have completed successfully (SDPC suspension exists).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import {
  resolveParticipantUuid,
} from './actions/enrollment.actions';
import {
  openEnrollmentWithSuspension,
  deleteExistingSuspension,
  verifySuspensionDeleteMmisSync,
  SuspensionDeleteStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_027;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-027: SDPC Suspension Deleted', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-027', participantUuid);
    console.log(`[TC-027] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // Shared config for suspension delete steps
  const getStepConfig = (): SuspensionDeleteStepConfig => ({
    program: 'SDPC',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-027]',
  });

  test('ATC-ES-113 - Precondition: SDPC is Enrolled with suspension', async () => {
    test.setTimeout(60_000);
    try {
      await openEnrollmentWithSuspension(page, getStepConfig());
      tracker.record('ATC-ES-113 - Precondition: SDPC is Enrolled with suspension', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-113 - Precondition: SDPC is Enrolled with suspension', 'failed', (err as Error).message);
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

  test('ATC-ES-114 - Delete SDPC suspension record', async () => {
    test.setTimeout(60_000);
    try {
      await deleteExistingSuspension(page, getStepConfig());
      tracker.record('ATC-ES-114 - Delete SDPC suspension record', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-114 - Delete SDPC suspension record', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-115 - Verify MMIS sync (2 transactions: S410 + S470)', async () => {
    test.setTimeout(90_000);
    try {
      await verifySuspensionDeleteMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-115 - Verify MMIS sync (2 transactions: S410 + S470)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-115 - Verify MMIS sync (2 transactions: S410 + S470)', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
