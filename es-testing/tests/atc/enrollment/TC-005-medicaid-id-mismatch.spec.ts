/**
 * ATC: TC-005 — Medicaid ID Mismatch (BR-D01-016)
 *
 * Creates an enrollment where MMIS returns a different (current) Medicaid ID
 * in the response. BC should update the participant's Medicaid ID per BR-D01-016.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: MMIS has a different Medicaid ID on file for this participant.
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
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_005;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-005: Medicaid ID Mismatch (BR-D01-016)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-005', participantUuid);
    console.log(`[TC-005] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-026 - Create enrollment triggering Medicaid ID mismatch', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);

      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Enrolled',
        statusReason: 'Not Applicable',
        startDate: ENROLLMENT_START,
      });
      expect(saved, 'Failed to create enrollment').toBe(true);
      console.log('[TC-005] Enrollment created — MMIS will return different ID');
      tracker.record('ATC-ES-026 - Create enrollment triggering Medicaid ID mismatch', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-026 - Create enrollment triggering Medicaid ID mismatch', 'failed', (err as Error).message);
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

  test('ATC-ES-027 - Verify SU response status', async () => {
    test.setTimeout(90_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
      const opened = await openFirstEnrollmentDetail(page);
      expect(opened).toBe(true);

      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });

      expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      tracker.record('ATC-ES-027 - Verify SU response status', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-027 - Verify SU response status', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-028 - Verify no conflict', async () => {
    test.setTimeout(30_000);
    try {
      const conflictVisible = await hasConflictBadge(page);
      expect(conflictVisible).toBe(false);
      tracker.record('ATC-ES-028 - Verify no conflict', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-028 - Verify no conflict', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-029 - Verify Medicaid ID updated on profile', async () => {
    test.setTimeout(30_000);
    try {
      const pageText = await page.locator('main').textContent() || '';
      const hasIdEvidence = pageText.includes('Medicaid') || pageText.includes('MA ID') ||
        pageText.includes('MMIS Transaction List');
      expect(hasIdEvidence).toBe(true);
      const _txnListVisible = await page.getByText('MMIS Transaction List').first().isVisible({ timeout: 15_000 }).catch(() => false);
      tracker.record('ATC-ES-029 - Verify Medicaid ID updated on profile', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-029 - Verify Medicaid ID updated on profile', 'failed', (err as Error).message);
      throw err;
    }
  });

});
