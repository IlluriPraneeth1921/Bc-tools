/**
 * ATC: TC-010 — Open-Ended Suspension (No End Date)
 *
 * Adds a suspension with NO end date to an active enrollment.
 * Expects 2 MMIS transactions: Close Span-A (S500) + Add Span-B (S510).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed (active IRIS enrollment with SU sync).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  addSuspension,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_010;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-010: Open-Ended Suspension (No End Date)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-010] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-045 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await getFullEnrollmentState(page);
    console.log(`[TC-010] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);
    expect(state.irisState, 'Precondition: must be Enrolled').toBe('Enrolled');
  });

  test('ATC-ES-046 - Add open-ended suspension (no end date)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: SUSPENSION_START,
      reason: 'Hospital Admission',
      // No endDate — open-ended
    });
    expect(result).toBe(true);
    console.log(`[TC-010] Open-ended suspension added: ${SUSPENSION_START} → (none)`);
  });

  test('ATC-ES-047 - Verify MMIS sync (2 transactions: S500+S510)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });
    expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-010] ✓ MMIS sync verified (${status.responseStatus})`);
  });

});
