/**
 * ATC: TC-003 — ICA Transfer: Close Old + Open New Span
 *
 * Transfers participant to a new ICA agency, closing the old agency span
 * and opening a new one. Expects 2 MMIS transactions.
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
  performIcaTransfer,
  getSyncStatus,
  hasConflictBadge,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

const DATA = SCENARIOS.TC_003;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-003: ICA Transfer: Close Old + Open New Span', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-003] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-016 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-003] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);
    expect(state.irisState, 'Precondition failed: participant must be Enrolled.').toBe('Enrolled');
  });

  test('ATC-ES-017 - Navigate to enrollment detail and perform ICA transfer', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    const transferred = await performIcaTransfer(page);
    expect(transferred).toBe(true);
    console.log('[TC-003] ICA transfer action completed');
  });

  test('ATC-ES-018 - Verify MMIS sync (2 transactions)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-003] ✓ ICA transfer sync completed (${status.responseStatus})`);
  });

  test('ATC-ES-019 - Verify no conflict after ICA transfer', async () => {
    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);
    const conflictVisible = await hasConflictBadge(page);
    expect(conflictVisible).toBe(false);
  });

});
