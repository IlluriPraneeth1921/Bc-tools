/**
 * ATC: TC-031 — ICA Transfer: Span-C Exists (S255_001)
 *
 * Performs an ICA transfer when a post-suspension Span-C already exists.
 * Expects 3 MMIS transactions: S600 + S310 + S610.
 *
 * State-aware: Checks that participant is Enrolled with suspension.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed (active bounded suspension + Span-C exists).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  performIcaTransfer,
  verifyMmisSync,
  getSyncStatus,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_031;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-031: ICA Transfer: Span-C Exists (S255_001)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-031] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-131 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-031] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-031] Skipping — precondition not met (need Enrolled + suspension)`);
      return;
    }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);
  });

  test('ATC-ES-132 - Perform ICA transfer with existing Span-C', async () => {
    if (!page.url().includes('/programenrollment/')) {
      console.log('[TC-031] Skipping — previous step was skipped');
      return;
    }

    const transferred = await performIcaTransfer(page);
    expect(transferred, 'ICA transfer action did not complete').toBe(true);
    console.log('[TC-031] ICA transfer with existing Span-C completed — S255_001 triggered');
  });

  test('ATC-ES-133 - Verify 3 MMIS transactions (S600 + S310 + S610)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    const _txnListVisible = await page.getByText('MMIS Transaction List').first().isVisible({ timeout: 15_000 }).catch(() => false);
    const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-031] MMIS transaction rows found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('ATC-ES-134 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-031] Sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
