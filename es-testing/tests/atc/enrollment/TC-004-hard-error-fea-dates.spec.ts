/**
 * ATC: TC-004 — Hard Error: FEA Dates Don't Span Enrollment Period
 *
 * Creates an enrollment where FEA assignment dates do NOT span the full
 * enrollment period. MMIS rejects with error 9156.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: FEA assignment with end date earlier than enrollment end date.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openFirstEnrollmentDetail,
  getSyncStatus,
  hasConflictBadge,
  isResubmitVisible,
  getMMISErrors,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { mockMmisFailed, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

const DATA = SCENARIOS.TC_004;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-004: Hard Error: FEA Dates Don\'t Span Enrollment Period', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-004', participantUuid);
    console.log(`[TC-004] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-021 - Create enrollment with invalid FEA dates', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const state = await getFullEnrollmentState(page);
      console.log(`[TC-004] State: IRIS=${state.irisState}, rowCount=${state.rowCount}`);

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Enrolled',
        statusReason: 'Not Applicable',
        startDate: ENROLLMENT_START,
      });
      expect(saved, 'Failed to create enrollment').toBe(true);
      console.log('[TC-004] Enrollment created — expecting MMIS rejection');
      tracker.record('ATC-ES-021 - Create enrollment with invalid FEA dates', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-021 - Create enrollment with invalid FEA dates', 'failed', (err as Error).message);
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

  test('ATC-ES-022 - Verify FL response status', async () => {
    test.setTimeout(90_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
      const opened = await openFirstEnrollmentDetail(page);
      expect(opened, 'Could not open enrollment detail').toBe(true);

      if (MOCK_MMIS) {
        const key = extractProgramEnrollmentKeyFromUrl(page.url());
        expect(key).not.toBeNull();
        const mockResult = await mockMmisFailed(key!, '9156', 'FEA DATES DO NOT SPAN ENROLLMENT PERIOD');
        expect(mockResult).toBe(true);
        console.log('[TC-004] MMIS Failed response mocked');
        await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(3000);
        const status = await getSyncStatus(page);
        expect(status.responseStatus).toBe('FL');
      } else {
        const status = await verifyMmisSync(page, {
          participantUuid,
          mockMmis: false,
          maxAttempts: 6,
          pollIntervalMs: 10_000,
        });
        expect(status.responseStatus).toBe('FL');
      }
      tracker.record('ATC-ES-022 - Verify FL response status', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-022 - Verify FL response status', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-023 - Verify conflict badge displayed', async () => {
    test.setTimeout(30_000);
    try {
      const conflictVisible = await hasConflictBadge(page);
      expect(conflictVisible).toBe(true);
      tracker.record('ATC-ES-023 - Verify conflict badge displayed', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-023 - Verify conflict badge displayed', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-024 - Verify error 9156 in MMIS errors', async () => {
    test.setTimeout(30_000);
    try {
      const errors = await getMMISErrors(page);
      const pageText = await page.locator('main').textContent() || '';
      const has9156 = pageText.includes('9156') || errors.some(e => e.includes('9156'));
      expect(has9156).toBe(true);
      tracker.record('ATC-ES-024 - Verify error 9156 in MMIS errors', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-024 - Verify error 9156 in MMIS errors', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-025 - Verify Re-submit button visible', async () => {
    test.setTimeout(30_000);
    try {
      const resubmitVisible = await isResubmitVisible(page);
      expect(resubmitVisible).toBe(true);
      tracker.record('ATC-ES-025 - Verify Re-submit button visible', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-025 - Verify Re-submit button visible', 'failed', (err as Error).message);
      throw err;
    }
  });

});
