/**
 * ATC: TC-007 — End Date Later (Extension / Re-enrollment)
 *
 * After TC-006 disenrolls the participant, this test re-enrolls them by
 * going through the full Draft → Referred → Enrolled flow (same as TC-001),
 * which triggers an S350 extension transaction to MMIS.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-006 must have completed (participant in Disenrolled state).
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
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_007;
const ENROLLMENT_START_DATE = DATA.bcInput.enrollmentStartDate;
const EXTENDED_END_DATE = DATA.bcInput.newEnrollmentEndDate!;

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-007: End Date Later (Extension)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-007', participantUuid);
    console.log(`[TC-007] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-034 - Precondition: Participant is Disenrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const irisState = await getCurrentIrisState(page);
      console.log(`[TC-007] State: IRIS=${irisState}`);
      expect(irisState, 'Precondition failed: participant must be Disenrolled.').toBe('Disenrolled');
      tracker.record('ATC-ES-034 - Precondition: Participant is Disenrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-034 - Precondition: Participant is Disenrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-035 - Create Draft enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Draft',
        statusReason: 'Not Applicable',
        startDate: ENROLLMENT_START_DATE,
      });
      expect(saved, 'Failed to create Draft enrollment').toBe(true);
      console.log('[TC-007] Draft enrollment created');
      tracker.record('ATC-ES-035 - Create Draft enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-035 - Create Draft enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-036 - Create Referred enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Referred',
        statusReason: 'IRIS Consultant',
        startDate: ENROLLMENT_START_DATE,
      });
      expect(saved, 'Failed to create Referred enrollment').toBe(true);
      console.log('[TC-007] Referred enrollment created');
      tracker.record('ATC-ES-036 - Create Referred enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-036 - Create Referred enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-037 - Create Enrolled enrollment (triggers MMIS S350 extension)', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Enrolled',
        statusReason: 'Not Applicable',
        startDate: ENROLLMENT_START_DATE,
        endDate: EXTENDED_END_DATE,
      });
      expect(saved, 'Failed to create Enrolled enrollment').toBe(true);
      console.log(`[TC-007] Enrolled enrollment created with end date ${EXTENDED_END_DATE}`);
      tracker.record('ATC-ES-037 - Create Enrolled enrollment (triggers MMIS S350 extension)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-037 - Create Enrolled enrollment (triggers MMIS S350 extension)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-038 - Verify MMIS sync completes with SU response', async () => {
    test.setTimeout(90_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });

      expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      console.log(`[TC-007] ✓ Extension sync completed (${status.responseStatus})`);
      tracker.record('ATC-ES-038 - Verify MMIS sync completes with SU response', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-038 - Verify MMIS sync completes with SU response', 'failed', (err as Error).message);
      throw err;
    }
  });

});
