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
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
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

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-007: End Date Later (Extension)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-007] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-034 - Precondition: Participant is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const irisState = await getCurrentIrisState(page);
    console.log(`[TC-007] State: IRIS=${irisState}`);
    expect(irisState, 'Precondition failed: participant must be Disenrolled.').toBe('Disenrolled');
  });

  test('ATC-ES-035 - Create Draft enrollment', async () => {
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
  });

  test('ATC-ES-036 - Create Referred enrollment', async () => {
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
  });

  test('ATC-ES-037 - Create Enrolled enrollment (triggers MMIS S350 extension)', async () => {
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
  });

  test('ATC-ES-038 - Verify MMIS sync completes with SU response', async () => {
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
  });

});
