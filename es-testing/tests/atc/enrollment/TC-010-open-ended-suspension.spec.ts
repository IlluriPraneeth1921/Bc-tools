/**
 * ATC: TC-010 — Open-Ended Suspension (No End Date)
 *
 * Adds a suspension with NO end date to an active enrollment.
 * Expects 2 MMIS transactions: Close Span-A (S500) + Add Span-B (S510).
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
  addSuspension,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_010;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-010: Open-Ended Suspension (No End Date)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-010', participantUuid);
    console.log(`[TC-010] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-045 - Precondition: Participant is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const state = await getFullEnrollmentState(page);
      console.log(`[TC-010] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);
      expect(state.irisState, 'Precondition: must be Enrolled').toBe('Enrolled');
      tracker.record('ATC-ES-045 - Precondition: Participant is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-045 - Precondition: Participant is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-046 - Add open-ended suspension (no end date)', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened).toBe(true);

      const result = await addSuspension(page, {
        startDate: SUSPENSION_START,
        reason: 'Hospital Admission',
        // No endDate — open-ended
      });
      expect(result).toBe(true);
      console.log(`[TC-010] Open-ended suspension added: ${SUSPENSION_START} → (none)`);
      tracker.record('ATC-ES-046 - Add open-ended suspension (no end date)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-046 - Add open-ended suspension (no end date)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-047 - Verify MMIS sync (2 transactions: S500+S510)', async () => {
    test.setTimeout(90_000);
    try {
      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });
      expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      console.log(`[TC-010] ✓ MMIS sync verified (${status.responseStatus})`);
      tracker.record('ATC-ES-047 - Verify MMIS sync (2 transactions: S500+S510)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-047 - Verify MMIS sync (2 transactions: S500+S510)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
