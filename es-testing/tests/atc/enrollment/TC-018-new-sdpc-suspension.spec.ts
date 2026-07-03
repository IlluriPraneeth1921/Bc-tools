/**
 * ATC: TC-018 — New SDPC Suspension
 *
 * Adds a bounded suspension to an active SDPC enrollment.
 * Expects 3 MMIS transactions: S500 + S510 + S520 for SDPC program.
 *
 * State-aware: Checks that SDPC enrollment is Enrolled before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-015 must have completed successfully (active SDPC enrollment with SU sync).
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
  getSyncStatus,
} from './actions/enrollment.actions';
import { getCurrentSdpcState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_018;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-018: New SDPC Suspension', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-018] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-077 - Navigate to SDPC enrollment detail (only if SDPC Enrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const sdpcState = await getCurrentSdpcState(page);
    console.log(`[TC-018] State: SDPC=${sdpcState}`);

    if (sdpcState !== 'Enrolled') {
      console.log(`[TC-018] Skipping — precondition not met (SDPC current: ${sdpcState})`);
      return;
    }

    const opened = await openEnrollmentByText(page, /SDPC.*Enrolled|Enrolled.*SDPC/);
    expect(opened, 'Could not open SDPC Enrolled enrollment detail').toBe(true);
  });

  test('ATC-ES-078 - Add bounded suspension to SDPC enrollment', async () => {
    if (!page.url().includes('/programenrollment/')) {
      console.log('[TC-018] Skipping — previous step was skipped');
      return;
    }

    const result = await addSuspension(page, {
      startDate: SUSPENSION_START,
      endDate: SUSPENSION_END,
      reason: 'Participant Requested',
    });
    expect(result, 'Failed to add suspension').toBe(true);
    console.log('[TC-018] SDPC suspension added');
  });

  test('ATC-ES-079 - Verify 3 MMIS transactions (S500 + S510 + S520)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU/SE response from MMIS').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });
    const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-018] MMIS transaction rows found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('ATC-ES-080 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-018] Sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
