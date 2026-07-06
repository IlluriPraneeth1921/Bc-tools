/**
 * ATC: TC-033 — Disenrolled Span Created — Real Reason Code Sent (S345)
 *
 * After TC-006 end-dates the enrollment with placeholder reason codes (2W/2W),
 * this test creates a Disenrolled span with an actual disenrollment reason
 * (e.g., "Deceased" → reason code "64"). This triggers S345 to re-send
 * the Closure with real translated reason codes.
 *
 * Similar to TC-006 but uses statusReason="Deceased" instead of "Not Applicable".
 *
 * Flow:
 * 1. Navigate to enrollment list → verify end-dated enrollment exists
 * 2. Click "+ New Program Enrollment" → set Status=Disenrolled, Reason=Deceased
 * 3. Save → triggers S345 MMIS re-send closure with real reason codes
 * 4. Verify SU response
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: TC-006 must have completed successfully (end-dated enrollment with S340 closure).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
} from './actions/enrollment.actions';
import {
  createDisenrolledWithEarlierEndDate,
  verifyDisenrollmentMmisSync,
  verifyFinalSyncStatus,
  DisenrollmentStepConfig,
  EnrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_033;
const DISENROLLMENT_REASON = DATA.bcInput.statusReason || 'Deceased';
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
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

  // Shared config for disenrollment steps — uses "Deceased" as the real reason
  const getStepConfig = (): DisenrollmentStepConfig => ({
    program: 'IRIS',
    startDate: ENROLLMENT_END_DATE,  // Re-send uses the end date as start
    newEndDate: ENROLLMENT_END_DATE,
    statusReason: DISENROLLMENT_REASON,
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-033]',
  });

  test('ATC-ES-131 - Precondition: Verify end-dated enrollment exists (TC-006 completed)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const enrollmentRows = page.locator('mat-row');
    const rowCount = await enrollmentRows.count();
    console.log(`[TC-033] Enrollment rows found: ${rowCount}`);
    expect(rowCount, 'No enrollment rows found — TC-006 prerequisite may not have run').toBeGreaterThanOrEqual(1);

    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    const hasValidState = pageText.includes('Enrolled') || pageText.includes('Disenrolled');
    expect(hasValidState, 'No Enrolled or Disenrolled row found').toBe(true);
    console.log('[TC-033] ✓ Precondition met — end-dated enrollment exists');
  });

  test('ATC-ES-132 - Create Disenrolled span with real reason code (Deceased)', async () => {
    await createDisenrolledWithEarlierEndDate(page, getStepConfig());
  });

  test('ATC-ES-133 - Verify MMIS sync completes with SU response (S345)', async () => {
    await verifyDisenrollmentMmisSync(page, getStepConfig());
  });

  test('ATC-ES-134 - Verify SU response and no conflict', async () => {
    // Reuse EnrollmentStepConfig-based verifyFinalSyncStatus
    const syncConfig: EnrollmentStepConfig = {
      program: 'IRIS',
      startDate: ENROLLMENT_END_DATE,
      participantUuid,
      mockMmis: MOCK_MMIS,
      logPrefix: '[TC-033]',
    };
    await verifyFinalSyncStatus(page, syncConfig);
  });

}); // end describe.serial
