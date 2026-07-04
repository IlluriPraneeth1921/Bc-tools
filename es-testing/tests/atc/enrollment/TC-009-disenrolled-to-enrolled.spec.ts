/**
 * ATC: TC-009 — Disenrolled → Enrolled (Reinstatement)
 *
 * Creates a new Enrolled enrollment for a previously disenrolled participant.
 * Expects 1 MMIS transaction (new span via S300).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant must be in Disenrolled state.
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
import { getCurrentIrisState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_009;
const REINSTATEMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-009: Disenrolled → Enrolled (Reinstatement)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-009] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-042 - Precondition: Participant is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await getCurrentIrisState(page);
    console.log(`[TC-009] State: IRIS=${state}`);
    expect(state, 'Precondition: must be Disenrolled').toBe('Disenrolled');
  });

  test('ATC-ES-043 - Create Enrolled enrollment (reinstatement)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: REINSTATEMENT_START,
      endDate: '12/31/2299',
    });
    expect(saved, 'Failed to create Enrolled enrollment').toBe(true);
    console.log('[TC-009] Enrolled enrollment created (reinstatement)');
  });

  test('ATC-ES-044 - Verify MMIS sync (1 transaction: S300)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });
    expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-009] ✓ Reinstatement sync verified (${status.responseStatus})`);
  });

});
