/**
 * ATC: TC-006 — End Date Earlier (Disenrollment)
 *
 * Creates a Disenrolled enrollment via "+ New Program Enrollment" dialog,
 * effectively setting an earlier end date and disenrolling the participant.
 * Expects 1 MMIS transaction (closure via S340).
 *
 * Flow:
 * 1. Navigate to enrollment list → verify Enrolled state
 * 2. Open "+ New Program Enrollment" dialog
 * 3. Set Status="Disenrolled", Start Date, End Date (earlier)
 * 4. Save → triggers MMIS closure transaction
 * 5. Verify SU response
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
  addIrisEnrollment,
  openEnrollmentByText,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_006;
const NEW_END_DATE = DATA.bcInput.newEnrollmentEndDate!;

/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-006: End Date Earlier (Disenrollment)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-006] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-030 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-006] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);
    expect(state.irisState, 'Precondition failed: participant must be Enrolled.').toBe('Enrolled');
  });

  test('ATC-ES-032 - Set Disenrolled with earlier end date via New Program Enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Disenrolled',
      statusReason: 'Not Applicable',
      startDate: DATA.bcInput.enrollmentStartDate,
      endDate: NEW_END_DATE,
    });
    expect(saved, 'Dialog did not close after save — validation errors').toBe(true);

    // Verify Disenrolled appears on page
    await page.waitForTimeout(2000);
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    expect(pageText, 'Disenrolled status not found after save').toContain('Disenrolled');
    console.log(`[TC-006] Disenrolled enrollment created, End Date = ${NEW_END_DATE}`);
  });

  test('ATC-ES-033 - Verify MMIS sync completes with SU response', async () => {
    // Navigate to the Disenrolled enrollment detail
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openEnrollmentByText(page, /Disenrolled/);
    expect(opened, 'Could not open Disenrolled enrollment detail').toBe(true);

    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-006] ✓ MMIS closure completed (${status.responseStatus})`);
  });

});
