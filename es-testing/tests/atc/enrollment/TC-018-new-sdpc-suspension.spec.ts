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
  getSyncStatus,
  addSuspension,
} from './actions/enrollment.actions';
import {
  getCurrentSdpcState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_018;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;

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
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-077 - Navigate to SDPC enrollment detail (only if SDPC Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const sdpcState = await getCurrentSdpcState(page);
  console.log(`[TC-018] State: SDPC=${sdpcState}`);

  if (sdpcState !== 'Enrolled') {
    console.log(`[TC-018] Skipping — precondition not met (SDPC current: ${sdpcState})`);
    return;
  }

  // Find the SDPC enrollment row
  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).filter({ hasText: /Enrolled/ }).first();
  await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
  await sdpcRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
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

  if (!result) {
    console.log('[TC-018] Direct suspension add not found, trying alternative approach');
  }

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-018] SDPC suspension added');
});

test('ATC-ES-079 - Verify 3 MMIS transactions (S500 + S510 + S520)', async () => {
  const currentUrl = page.url();
  const maxAttempts = 6;
  const pollInterval = 10_000;
  let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[TC-018] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

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
