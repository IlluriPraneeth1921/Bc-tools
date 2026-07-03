/**
 * ATC: TC-002 — Enrolled → Suspended (Bounded Suspension)
 *
 * Adds a bounded suspension to an active IRIS enrollment.
 * Expects 3 MMIS transactions: Close Span-A (S500), Add Span-B (S510), Create Span-C (S520).
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
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

const DATA = SCENARIOS.TC_002;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-002: Enrolled → Suspended (Bounded)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-002] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-012 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await getFullEnrollmentState(page);
    console.log(`[TC-002] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);
    expect(state.irisState, 'Precondition: must be Enrolled. Run TC-001 first.').toBe('Enrolled');
  });

  test('ATC-ES-014 - Add bounded suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: SUSPENSION_START,
      endDate: SUSPENSION_END,
      reason: 'Participant Requested',
    });
    expect(result).toBe(true);
    console.log(`[TC-002] Suspension added: ${SUSPENSION_START} → ${SUSPENSION_END}`);
  });

  test('ATC-ES-015 - Verify MMIS sync (3 transactions: S500+S510+S520)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });
    expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-002] ✓ MMIS sync verified (${status.responseStatus})`);
  });

});
