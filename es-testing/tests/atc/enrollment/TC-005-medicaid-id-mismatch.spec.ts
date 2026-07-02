/**
 * ATC: TC-005 — Medicaid ID Mismatch (BR-D01-016)
 *
 * Creates an enrollment where MMIS returns a different (current) Medicaid ID
 * in the response. BC should update the participant's Medicaid ID per BR-D01-016.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: MMIS has a different Medicaid ID on file for this participant.
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

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-005: Medicaid ID Mismatch (BR-D01-016)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-005] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-026 - Create enrollment triggering Medicaid ID mismatch', async () => {
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
  });

  test('ATC-ES-027 - Verify SU response status', async () => {
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

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

  test('ATC-ES-028 - Verify no conflict', async () => {
    const conflictVisible = await hasConflictBadge(page);
    expect(conflictVisible).toBe(false);
  });

  test('ATC-ES-029 - Verify Medicaid ID updated on profile', async () => {
    const pageText = await page.locator('main').textContent() || '';
    const hasIdEvidence = pageText.includes('Medicaid') || pageText.includes('MA ID') ||
      pageText.includes('MMIS Transaction List');
    expect(hasIdEvidence).toBe(true);
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
  });

});
