/**
 * ATC: TC-018 — New SDPC Suspension (Bounded)
 *
 * Adds a bounded suspension to an active SDPC enrollment.
 * Expects 3 MMIS transactions: Close Span-A (S500), Add Span-B (S510), Create Span-C (S520).
 *
 * Similar to TC-002 (IRIS suspension) but targets the SDPC program enrollment.
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
  openEnrolledProgramDetail,
  addBoundedSuspension,
  verifySuspensionMmisSync,
  verifySuspensionFinalStatus,
  SuspensionStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_018;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-018: New SDPC Suspension (Bounded)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-018', participantUuid);
    console.log(`[TC-018] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // Shared config for suspension steps
  const getStepConfig = (): SuspensionStepConfig => ({
    program: 'SDPC',
    suspensionStartDate: SUSPENSION_START,
    suspensionEndDate: SUSPENSION_END,
    reason: 'Hospitalized',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-018]',
  });

  test('ATC-ES-077 - Precondition: SDPC is Enrolled — open enrollment detail', async () => {
    test.setTimeout(60_000);
    try {
      await openEnrolledProgramDetail(page, getStepConfig());
      tracker.record('ATC-ES-077 - Precondition: SDPC is Enrolled — open enrollment detail', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-077 - Precondition: SDPC is Enrolled — open enrollment detail', 'failed', (err as Error).message);
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

  test('ATC-ES-078 - Add bounded suspension to SDPC enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await addBoundedSuspension(page, getStepConfig());
      tracker.record('ATC-ES-078 - Add bounded suspension to SDPC enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-078 - Add bounded suspension to SDPC enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-079 - Verify MMIS sync (3 transactions: S500+S510+S520)', async () => {
    test.setTimeout(90_000);
    try {
      await verifySuspensionMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-079 - Verify MMIS sync (3 transactions: S500+S510+S520)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-079 - Verify MMIS sync (3 transactions: S500+S510+S520)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-080 - Verify SU response and no conflict', async () => {
    test.setTimeout(30_000);
    try {
      await verifySuspensionFinalStatus(page, getStepConfig());
      tracker.record('ATC-ES-080 - Verify SU response and no conflict', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-080 - Verify SU response and no conflict', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
