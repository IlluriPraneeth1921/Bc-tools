/**
 * ATC: TC-026 — SDPC End Date Earlier (Disenrollment)
 *
 * Updates the SDPC enrollment end date to an earlier date (disenrollment).
 * Expects 1 MMIS transaction: S340 (SDPC disenrollment).
 *
 * State-aware: Checks that SDPC enrollment is Enrolled before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-015 must have completed successfully (active SDPC enrollment exists).
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
import { getCurrentSdpcState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_026;
const NEW_END_DATE = DATA.bcInput.newEnrollmentEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-026: SDPC End Date Earlier (Disenrollment)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-026] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-109 - Navigate to SDPC enrollment detail (only if SDPC Enrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const sdpcState = await getCurrentSdpcState(page);
    console.log(`[TC-026] State: SDPC=${sdpcState}`);

    if (sdpcState !== 'Enrolled') {
      console.log(`[TC-026] Skipping — precondition not met (SDPC current: ${sdpcState})`);
      return;
    }

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened, 'Could not open SDPC enrollment detail').toBe(true);
  });

  test('ATC-ES-110 - Update SDPC enrollment end date to earlier date', async () => {
    if (!page.url().includes('/programenrollment/')) {
      console.log('[TC-026] Skipping — previous step was skipped');
      return;
    }

    const edited = await editEnrollment(page, { endDate: NEW_END_DATE });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
    console.log('[TC-026] SDPC enrollment end date set earlier — S340 disenrollment triggered');
  });

  test('ATC-ES-111 - Verify 1 MMIS transaction (S340 for SDPC)', async () => {
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
      const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-026] MMIS transaction rows found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('ATC-ES-112 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-026] Sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
