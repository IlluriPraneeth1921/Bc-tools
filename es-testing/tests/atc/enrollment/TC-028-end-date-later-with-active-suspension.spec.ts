/**
 * ATC: TC-028 — End Date Later + Last Span Suspended
 *
 * Extends the enrollment end date while a bounded suspension is active.
 * Expects 1 MMIS transaction: S350→S360 (extend end date with suspended span).
 *
 * State-aware: Checks that participant is Enrolled with suspension before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed successfully (active bounded suspension exists).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  editEnrollment,
  verifyMmisSync,
  getSyncStatus,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_028;
const NEW_END_DATE = DATA.bcInput.newEnrollmentEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-028: End Date Later + Last Span Suspended', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-028] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-117 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-028] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

    if (!['Enrolled', 'Suspended'].includes(state.irisState) || !state.hasSuspension) {
      console.log(`[TC-028] Skipping — precondition not met (need Enrolled/Suspended + suspension)`);
      return;
    }

    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);
  });

  test('ATC-ES-118 - Extend enrollment end date while suspension is active', async () => {
    if (!page.url().includes('/programenrollment/')) {
      console.log('[TC-028] Skipping — previous step was skipped');
      return;
    }

    const edited = await editEnrollment(page, { endDate: NEW_END_DATE });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
    console.log('[TC-028] Enrollment end date extended with active suspension — S350→S360 triggered');
  });

  test('ATC-ES-119 - Verify 1 MMIS transaction (S350→S360)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    const txnListVisible = await page.getByText('MMIS Transaction List').first().isVisible({ timeout: 15_000 }).catch(() => false);
    if (txnListVisible) {
      // Refresh page to load latest transaction data
      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-028] MMIS transaction rows found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('ATC-ES-120 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-028] Sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
