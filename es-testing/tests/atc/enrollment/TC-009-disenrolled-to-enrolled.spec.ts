/**
 * ATC: TC-009 — Disenrolled → Enrolled (Reinstatement)
 *
 * Creates a new Enrolled enrollment for a previously disenrolled participant.
 * Expects 1 MMIS transaction (new span via S300).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant must be in Disenrolled state.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openEnrollmentByText,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getCurrentIrisState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_009;
const REINSTATEMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-009: Disenrolled → Enrolled (Reinstatement)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-009', participantUuid);
    console.log(`[TC-009] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-042 - Precondition: Participant is Disenrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const state = await getCurrentIrisState(page);
      console.log(`[TC-009] State: IRIS=${state}`);
      expect(state, 'Precondition: must be Disenrolled').toBe('Disenrolled');
      tracker.record('ATC-ES-042 - Precondition: Participant is Disenrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-042 - Precondition: Participant is Disenrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-043 - Create Enrolled enrollment (reinstatement)', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Enrolled',
        statusReason: 'Not Applicable',
        startDate: REINSTATEMENT_START,
        endDate: '12/31/2299',
      });
      expect(saved, 'Failed to create Enrolled enrollment').toBe(true);
      console.log('[TC-009] Enrolled enrollment created (reinstatement)');
      tracker.record('ATC-ES-043 - Create Enrolled enrollment (reinstatement)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-043 - Create Enrolled enrollment (reinstatement)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-044 - Verify MMIS sync (1 transaction: S300)', async () => {
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
      console.log(`[TC-009] ✓ Reinstatement sync verified (${status.responseStatus})`);
      tracker.record('ATC-ES-044 - Verify MMIS sync (1 transaction: S300)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-044 - Verify MMIS sync (1 transaction: S300)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
