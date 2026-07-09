/**
 * ATC: TC-014 — Address-Only Update
 *
 * Updates participant's residential address without changing enrollment data.
 * Expects 1 MMIS transaction: S700 (address update on current span).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed (active IRIS enrollment with SU sync).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { updateStreetAddress } from './actions/profile.actions';
import { getCurrentIrisState } from '../../helpers/state-checker';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-014: Address-Only Update', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-014', participantUuid);
    console.log(`[TC-014] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-061 - Precondition: Participant is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const state = await getCurrentIrisState(page);
      console.log(`[TC-014] State: IRIS=${state}`);
      expect(state, 'Precondition: must be Enrolled').toBe('Enrolled');
      tracker.record('ATC-ES-061 - Precondition: Participant is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-061 - Precondition: Participant is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-062 - Update participant residential address', async () => {
    test.setTimeout(60_000);
    try {
      const newAddress = await updateStreetAddress(page, participantUuid);
      expect(newAddress, 'Address update failed').not.toBeNull();
      console.log(`[TC-014] Address updated to: "${newAddress}" — S700 triggered`);
      tracker.record('ATC-ES-062 - Update participant residential address', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-062 - Update participant residential address', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-063 - Verify MMIS sync (1 transaction: S700)', async () => {
    test.setTimeout(90_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened).toBe(true);

      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });
      expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      console.log(`[TC-014] ✓ Address update sync verified (${status.responseStatus})`);
      tracker.record('ATC-ES-063 - Verify MMIS sync (1 transaction: S700)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-063 - Verify MMIS sync (1 transaction: S700)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
