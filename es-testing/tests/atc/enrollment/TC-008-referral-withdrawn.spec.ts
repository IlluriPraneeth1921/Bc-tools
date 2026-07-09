/**
 * ATC: TC-008 — Referral Withdrawn
 *
 * Changes enrollment status to "Referral Withdrawn", deleting the existing
 * MMIS span. Expects 1 MMIS transaction (Delete span via S310).
 *
 * Flow:
 * 1. Verify active MMIS waiver enrollment exists (precondition)
 * 2. Open enrollment detail → Edit → Status = "Referral Withdrawn"
 * 3. Verify MMIS sync SU
 * 4. Verify MMIS Snapshot shows no waiver enrollment
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have been executed successfully first.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  editEnrollment,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { waitForEmptyWaiverEnrollment } from '../../helpers/reset-enrollment';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-008: Referral Withdrawn', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-008', participantUuid);
    console.log(`[TC-008] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-038 - Precondition: Active MMIS waiver enrollment exists', async () => {
    test.setTimeout(60_000);
    try {
      const mmisState = await getMmisSnapshotState(page, participantUuid);
      console.log(`[TC-008] MMIS: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
      expect(mmisState.loaded).toBe(true);
      expect(mmisState.hasActiveWaiverEnrollment, 'No active MMIS waiver enrollment. Run TC-001 first.').toBe(true);
      tracker.record('ATC-ES-038 - Precondition: Active MMIS waiver enrollment exists', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-038 - Precondition: Active MMIS waiver enrollment exists', 'failed', (err as Error).message);
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

  test('ATC-ES-039 - Open enrollment detail and change status to Referral Withdrawn', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

      const edited = await editEnrollment(page, {
        status: 'Referral Withdrawn',
        statusReason: 'Not Provided',
      });
      expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
      console.log('[TC-008] Status changed to Referral Withdrawn — MMIS delete triggered');
      tracker.record('ATC-ES-039 - Open enrollment detail and change status to Referral Withdrawn', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-039 - Open enrollment detail and change status to Referral Withdrawn', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-041 - Verify SU response', async () => {
    test.setTimeout(90_000);
    try {
      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });

      expect(status.responseStatus, 'Expected SU response from MMIS').toBe('SU');
      expect(status.hasConflict).toBe(false);
      console.log('[TC-008] ✓ MMIS delete sync verified (SU)');
      tracker.record('ATC-ES-041 - Verify SU response', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-041 - Verify SU response', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-042 - Verify MMIS Snapshot shows no waiver enrollment', async () => {
    test.setTimeout(90_000);
    try {
      const cleared = await waitForEmptyWaiverEnrollment(page, participantUuid, {
        maxAttempts: 10,
        pollIntervalMs: 10_000,
      });
      expect(cleared, 'MMIS still shows waiver enrollment after withdrawal').toBe(true);
      console.log('[TC-008] ✓ MMIS confirmed: No Waiver Enrollment — deletion successful');
      tracker.record('ATC-ES-042 - Verify MMIS Snapshot shows no waiver enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-042 - Verify MMIS Snapshot shows no waiver enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

});
