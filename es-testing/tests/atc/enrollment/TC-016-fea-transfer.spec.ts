/**
 * ATC: TC-016 — FEA Transfer: Close + Open
 *
 * Updates the FEA (Fiscal Employer Agent) assignment to a new agency.
 * Expects 2 MMIS transactions: close old FEA span + open new FEA span.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed successfully (active IRIS enrollment with SU sync).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  performFeaTransfer,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_016;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-016: FEA Transfer: Close + Open', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-016', participantUuid);
    console.log(`[TC-016] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-069 - Precondition: Participant is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const irisState = await getCurrentIrisState(page);
      console.log(`[TC-016] State: IRIS=${irisState}`);
      expect(irisState, 'Precondition failed: participant must be Enrolled.').toBe('Enrolled');
      tracker.record('ATC-ES-069 - Precondition: Participant is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-069 - Precondition: Participant is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-070 - Navigate to enrollment detail and perform FEA transfer', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

      const transferred = await performFeaTransfer(page);
      expect(transferred).toBe(true);
      console.log('[TC-016] FEA transfer action completed');
      tracker.record('ATC-ES-070 - Navigate to enrollment detail and perform FEA transfer', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-070 - Navigate to enrollment detail and perform FEA transfer', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-071 - Verify MMIS sync (2 transactions: close old + open new)', async () => {
    test.setTimeout(90_000);
    try {
      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });

      expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      console.log(`[TC-016] ✓ FEA transfer sync completed (${status.responseStatus})`);
      tracker.record('ATC-ES-071 - Verify MMIS sync (2 transactions: close old + open new)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-071 - Verify MMIS sync (2 transactions: close old + open new)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
