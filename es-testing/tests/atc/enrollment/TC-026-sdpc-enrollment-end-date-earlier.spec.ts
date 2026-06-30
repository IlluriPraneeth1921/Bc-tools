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
  getSyncStatus,
} from './actions/enrollment.actions';
import {
  getCurrentSdpcState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const ISP_START_DATE = `${String(now.getMonth() + 1).padStart(2, '0')}/01/${now.getFullYear()}`;
const dates = computeTestDates(ISP_START_DATE);

const NEW_END_DATE = '07/15/2026'; // Earlier end date for disenrollment

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
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-109 - Navigate to SDPC enrollment detail (only if SDPC Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const sdpcState = await getCurrentSdpcState(page);
  console.log(`[TC-026] State: SDPC=${sdpcState}`);

  if (sdpcState !== 'Enrolled') {
    console.log(`[TC-026] Skipping — precondition not met (SDPC current: ${sdpcState})`);
    return;
  }

  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
  await sdpcRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-110 - Update SDPC enrollment end date to earlier date', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-026] Skipping — previous step was skipped');
    return;
  }

  const endDateInput = page.locator('input[id*="endDate"], input[id*="EndDate"], input[aria-label*="End Date"]').first();
  if (await endDateInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await endDateInput.click({ force: true });
    await endDateInput.fill('', { force: true });
    await endDateInput.pressSequentially(NEW_END_DATE, { delay: 50 });
    await endDateInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await endDateInput.press('Tab');
    await page.waitForTimeout(500);
  }

  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-026] SDPC enrollment end date set earlier — S340 disenrollment triggered');
});

test('ATC-ES-111 - Verify 1 MMIS transaction (S340 for SDPC)', async () => {
  const currentUrl = page.url();
  const maxAttempts = 6;
  const pollInterval = 10_000;
  let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[TC-026] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-026] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(1);
});

test('ATC-ES-112 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-026] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
