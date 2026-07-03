/**
 * ATC: TC-030 — SE Response: Enrollment Activated
 *
 * Creates an enrollment that returns SE (Success with Errors).
 * Per BR-D01-010, enrollment is still activated despite warnings.
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
  getMMISErrors,
  openEnrollmentByText,
  pollForMmisResponse,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { mockMmisWarning, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_030;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-030: SE Response: Enrollment Activated', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-030] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-126 - Create enrollment that triggers SE response', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: ENROLLMENT_START,
    });
    expect(saved, 'Failed to create enrollment').toBe(true);
    console.log('[TC-030] Enrollment created — expecting SE response');
  });

  test('ATC-ES-127 - Verify SE response status', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openFirstEnrollmentDetail(page);
    expect(opened, 'Could not open enrollment detail').toBe(true);

    if (MOCK_MMIS) {
      const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
      expect(enrollmentKey, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();

      // Wait for backend to create the extension row
      await page.waitForTimeout(5000);

      const mockResult = await mockMmisWarning(enrollmentKey!, '9199', 'ENROLLMENT PROCESSED WITH WARNINGS');
      expect(mockResult, 'mockMmisWarning failed — run scripts/createMMISMockProcedures.sql').toBe(true);
      console.log('[TC-030] MMIS Warning (SE) response mocked via database');

      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 });

      const status = await getSyncStatus(page);
      console.log(`[TC-030] Sync status (mocked): ${JSON.stringify(status)}`);
      expect(status.responseStatus).toBe('SE');
    } else {
      const status = await pollForMmisResponse(page, { maxAttempts: 6, pollIntervalMs: 10_000 });
      console.log(`[TC-030] Sync status: ${JSON.stringify(status)}`);
      expect(status.responseStatus).toBe('SE');
    }
  });

  test('ATC-ES-128 - Verify enrollment still activated (SE = success per BR-D01-010)', async () => {
    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
    await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
    const rowText = await enrolledRow.textContent() || '';
    expect(rowText).toContain('Enrolled');
    console.log('[TC-030] Enrollment confirmed still active despite SE response');
  });

  test('ATC-ES-129 - Verify MMIS errors stored (warning-level)', async () => {
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open enrollment detail').toBe(true);

    const errors = await getMMISErrors(page);
    console.log(`[TC-030] MMIS warning errors: ${JSON.stringify(errors)}`);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('ATC-ES-130 - Verify no conflict badge (SE is success)', async () => {
    const conflictVisible = await hasConflictBadge(page);
    expect(conflictVisible).toBe(false);
  });

}); // end describe.serial
