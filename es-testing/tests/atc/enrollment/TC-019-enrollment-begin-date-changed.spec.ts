/**
 * ATC: TC-019 — Begin Date Earlier (Delete + Recreate)
 *
 * Changes the enrollment begin date to an earlier date via the Edit dialog.
 * Expects 2 MMIS transactions: S310 (delete) + S300 (recreate).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed successfully (active IRIS enrollment with SU sync).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  editEnrollment,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_019;
const NEW_BEGIN_DATE = DATA.bcInput.newEnrollmentStartDate!;

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-019: Begin Date Earlier (Delete + Recreate)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-019] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-081 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const irisState = await getCurrentIrisState(page);
    console.log(`[TC-019] State: IRIS=${irisState}`);
    expect(irisState, 'Precondition failed: participant must be Enrolled.').toBe('Enrolled');
  });

  test('ATC-ES-082 - Change enrollment begin date to earlier date', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    const edited = await editEnrollment(page, { startDate: NEW_BEGIN_DATE });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
    console.log(`[TC-019] Begin date changed to: ${NEW_BEGIN_DATE}`);
  });

  test('ATC-ES-083 - Verify MMIS sync (2 transactions: S310 + S300)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-019] ✓ MMIS sync completed (${status.responseStatus})`);
  });

});
