/**
 * ATC: TC-029 — Multiple MMIS Error Segments
 *
 * NEGATIVE TEST: Creates an enrollment that triggers multiple MMIS errors.
 * Expects FL response with multiple error segments, conflict badge visible,
 * and re-submit button visible.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant must be accessible with ISP start date set.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openFirstEnrollmentDetail,
  getSyncStatus,
  hasConflictBadge,
  isResubmitVisible,
  getMMISErrors,
  pollForMmisResponse,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { mockMmisFailed, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_029;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-029: Multiple MMIS Error Segments', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-029] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-121 - Create enrollment with multiple data issues', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: ENROLLMENT_START,
    });
    expect(saved, 'Failed to create enrollment').toBe(true);
    console.log('[TC-029] Enrollment created — expecting multiple MMIS errors');
  });

  test('ATC-ES-122 - Verify FL response status', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openFirstEnrollmentDetail(page);
    expect(opened, 'Could not open enrollment detail').toBe(true);

    if (MOCK_MMIS) {
      const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
      expect(enrollmentKey, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();

      // Wait for backend to create the extension row
      await page.waitForTimeout(5000);

      // Mock with multiple error codes
      await mockMmisFailed(enrollmentKey!, '9156', 'FEA DATES DO NOT SPAN ENROLLMENT PERIOD');
      await mockMmisFailed(enrollmentKey!, '9171', 'NO WAIVER ENROLLMENT FOUND TO CLOSE');
      console.log('[TC-029] MMIS Failed response mocked with multiple errors');

      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 });

      const status = await getSyncStatus(page);
      console.log(`[TC-029] Sync status (mocked): ${JSON.stringify(status)}`);
      expect(status.responseStatus).toBe('FL');
    } else {
      const status = await pollForMmisResponse(page, { maxAttempts: 6, pollIntervalMs: 10_000 });
      console.log(`[TC-029] Sync status: ${JSON.stringify(status)}`);
      expect(status.responseStatus).toBe('FL');
    }
  });

  test('ATC-ES-123 - Verify multiple MMIS error segments', async () => {
    const errors = await getMMISErrors(page);
    console.log(`[TC-029] MMIS errors: ${JSON.stringify(errors)}`);
    expect(errors.length).toBeGreaterThan(1);
  });

  test('ATC-ES-124 - Verify conflict badge displayed', async () => {
    const conflictVisible = await hasConflictBadge(page);
    expect(conflictVisible).toBe(true);
  });

  test('ATC-ES-125 - Verify Re-submit button visible', async () => {
    const resubmitVisible = await isResubmitVisible(page);
    expect(resubmitVisible).toBe(true);
  });

}); // end describe.serial
