/**
 * ATC: TC-020 — Begin Date Later (Delete + Recreate)
 *
 * Changes the enrollment begin date to a later date via the Edit dialog.
 * Expects 2 MMIS transactions: S310 (delete) + S300 (recreate).
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
  editEnrollment,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_020;
const NEW_BEGIN_DATE = DATA.bcInput.newEnrollmentStartDate!;

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-020: Begin Date Later (Delete + Recreate)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-020', participantUuid);
    console.log(`[TC-020] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-085 - Precondition: Participant is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const irisState = await getCurrentIrisState(page);
      console.log(`[TC-020] State: IRIS=${irisState}`);
      expect(irisState, 'Precondition failed: participant must be Enrolled.').toBe('Enrolled');
      tracker.record('ATC-ES-085 - Precondition: Participant is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-085 - Precondition: Participant is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-086 - Change enrollment begin date to later date', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

      const edited = await editEnrollment(page, { startDate: NEW_BEGIN_DATE });
      expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
      console.log(`[TC-020] Begin date changed to: ${NEW_BEGIN_DATE}`);
      tracker.record('ATC-ES-086 - Change enrollment begin date to later date', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-086 - Change enrollment begin date to later date', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-087 - Verify MMIS sync (2 transactions: S310 + S300)', async () => {
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
      console.log(`[TC-020] ✓ MMIS sync completed (${status.responseStatus})`);
      tracker.record('ATC-ES-087 - Verify MMIS sync (2 transactions: S310 + S300)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-087 - Verify MMIS sync (2 transactions: S310 + S300)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
