/**
 * ATC: TC-002 — Enrolled → Suspended (Bounded Suspension)
 *
 * Adds a bounded suspension to an active IRIS enrollment.
 * Expects 3 MMIS transactions: Close Span-A (S500), Add Span-B (S510), Create Span-C (S520).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed (active IRIS enrollment with SU sync).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  addSuspension,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

const DATA = SCENARIOS.TC_002;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-002: Enrolled → Suspended (Bounded)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-002', participantUuid);
    console.log(`[TC-002] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-012 - Precondition: Participant is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const state = await getFullEnrollmentState(page);
      console.log(`[TC-002] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);
      expect(state.irisState, 'Precondition: must be Enrolled. Run TC-001 first.').toBe('Enrolled');
      tracker.record('ATC-ES-012 - Precondition: Participant is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-012 - Precondition: Participant is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-014 - Add bounded suspension', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened).toBe(true);

      const result = await addSuspension(page, {
        startDate: SUSPENSION_START,
        endDate: SUSPENSION_END,
        reason: 'Hospital Admission',
      });
      expect(result).toBe(true);
      console.log(`[TC-002] Suspension added: ${SUSPENSION_START} → ${SUSPENSION_END}`);
      tracker.record('ATC-ES-014 - Add bounded suspension', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-014 - Add bounded suspension', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-015 - Verify MMIS sync (3 transactions: S500+S510+S520)', async () => {
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
      console.log(`[TC-002] ✓ MMIS sync verified (${status.responseStatus})`);
      tracker.record('ATC-ES-015 - Verify MMIS sync (3 transactions: S500+S510+S520)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-015 - Verify MMIS sync (3 transactions: S500+S510+S520)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
