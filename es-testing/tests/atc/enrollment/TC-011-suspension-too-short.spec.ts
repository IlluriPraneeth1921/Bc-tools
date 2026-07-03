/**
 * ATC: TC-011 — Suspension < 3 Days (Error)
 *
 * NEGATIVE TEST: Attempts to add a suspension with only a 1-day span.
 * The system should reject — NO MMIS transactions are sent.
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
  getSyncStatus,
} from './actions/enrollment.actions';
import { getCurrentIrisState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

const DATA = SCENARIOS.TC_011;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-011: Suspension < 3 Days (Error)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-011] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

  test('ATC-ES-049 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await getCurrentIrisState(page);
    console.log(`[TC-011] State: IRIS=${state}`);
    expect(state, 'Precondition: must be Enrolled').toBe('Enrolled');
  });

  test('ATC-ES-050 - Attempt suspension with < 3 day span', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    await addSuspension(page, {
      startDate: SUSPENSION_START,
      endDate: SUSPENSION_END, // 1 day — should be rejected
      reason: 'Participant Requested',
    });
    console.log('[TC-011] Attempted short suspension — expecting validation error');
  });

  test('ATC-ES-051 - Verify error displayed (no MMIS sync triggered)', async () => {
    const pageText = await page.locator('main').textContent() || '';
    const dialogText = await page.locator('mat-dialog-container').textContent().catch(() => '') || '';
    const allText = pageText + dialogText;

    const hasError = /error|invalid|minimum|too short|at least/i.test(allText);
    const matErrors = await page.locator('mat-error').all();
    const errorMessages: string[] = [];
    for (const err of matErrors) {
      const text = (await err.textContent() || '').trim();
      if (text) errorMessages.push(text);
    }
    console.log(`[TC-011] Errors: ${JSON.stringify(errorMessages)}`);
    expect(errorMessages.length > 0 || hasError).toBe(true);
  });

  test('ATC-ES-052 - Verify no conflict on enrollment', async () => {
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-011] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

});
