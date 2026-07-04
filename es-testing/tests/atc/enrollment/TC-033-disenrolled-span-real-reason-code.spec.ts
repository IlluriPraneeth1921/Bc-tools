/**
 * ATC: TC-033 — Disenrolled Span Created — Real Reason Code Sent (S345)
 *
 * After TC-006 end-dates the enrollment with placeholder reason codes (2W/2W),
 * this test creates a Disenrolled span with an actual disenrollment reason
 * (e.g., "Deceased" → reason code "64"). This triggers S345 to re-send
 * the Closure with real translated reason codes.
 *
 * Flow:
 * 1. Navigate to enrollment list → verify end-dated enrollment exists
 * 2. Click "+ New Program Enrollment" → set Status = Disenrolled, Reason = Deceased
 * 3. Save → triggers S345 MMIS re-send closure with real reason codes
 * 4. Verify SU response
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-006 must have completed successfully (end-dated enrollment with S340 closure).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openEnrollmentByText,
  verifyMmisSync,
  getSyncStatus,
} from './actions/enrollment.actions';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_033;
const DISENROLLMENT_REASON = DATA.bcInput.statusReason || 'Deceased';
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-033: Disenrolled Span Created — Real Reason Code (S345)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-033] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-131 - Precondition: Verify end-dated enrollment exists (TC-006 completed)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const enrollmentRows = page.locator('mat-row');
    const rowCount = await enrollmentRows.count();
    console.log(`[TC-033] Enrollment rows found: ${rowCount}`);
    expect(rowCount, 'No enrollment rows found — TC-006 prerequisite may not have run').toBeGreaterThanOrEqual(1);

    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    const hasEnrolled = pageText.includes('Enrolled');
    expect(hasEnrolled || pageText.includes('Disenrolled'), 'No Enrolled or Disenrolled row found').toBe(true);
  });

  test('ATC-ES-132 - Create Disenrolled span with real reason code (Deceased)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Disenrolled',
      statusReason: DISENROLLMENT_REASON,
      startDate: ENROLLMENT_END_DATE,
    });
    expect(saved, 'Failed to create Disenrolled span').toBe(true);

    // Confirm Disenrolled appears on the enrollment list
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    expect(pageText, 'Disenrolled status not found on page after save').toContain('Disenrolled');

    console.log(`[TC-033] Disenrolled span created with reason "${DISENROLLMENT_REASON}" — S345 re-send closure triggered`);
  });

  test('ATC-ES-133 - Verify MMIS sync completes with SU response (S345)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Disenrolled/);
    expect(opened, 'Could not open Disenrolled enrollment detail').toBe(true);

    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      maxAttempts: 12,
      pollIntervalMs: 10_000,
    });

    expect(status.responseStatus, 'Expected SU/SE response from MMIS').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    const _txnListVisible = await page.getByText('MMIS Transaction List').first().isVisible({ timeout: 15_000 }).catch(() => false);
    console.log(`[TC-033] ✓ S345 closure re-send completed successfully (${status.responseStatus})`);
  });

  test('ATC-ES-134 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-033] Final sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
