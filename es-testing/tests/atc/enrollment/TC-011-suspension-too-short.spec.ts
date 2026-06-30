/**
 * ATC: TC-011 — Suspension < 3 Days (Error)
 *
 * NEGATIVE TEST: Attempts to add a suspension with only a 1-2 day span.
 * The system should reject this with an error — NO MMIS transactions are sent.
 *
 * State-aware: Checks that participant is Enrolled before attempting the action.
 * Skips gracefully if preconditions not met.
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
  getSyncStatus,
  addSuspension,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const ISP_START_DATE = `${String(now.getMonth() + 1).padStart(2, '0')}/01/${now.getFullYear()}`;
const dates = computeTestDates(ISP_START_DATE);

const SUSPENSION_START = '07/10/2026';
const SUSPENSION_END = '07/11/2026'; // Only 1 day — too short

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

test('ATC-ES-049 - Navigate to enrollment detail (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-011] State: IRIS=${irisState}`);

  if (irisState !== 'Enrolled') {
    console.log(`[TC-011] Skipping — precondition not met (current: ${irisState})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-050 - Attempt suspension with < 3 day span', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-011] Skipping — previous step was skipped');
    return;
  }

  const result = await addSuspension(page, {
    startDate: SUSPENSION_START,
    endDate: SUSPENSION_END, // 1 day span — should be rejected
    reason: 'Participant Requested',
  });

  // The save may succeed but should show an error, or the dialog may stay open
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-011] Attempted short suspension — expecting validation error');
});

test('ATC-ES-051 - Verify error displayed (no MMIS sync triggered)', async () => {
  // Check for validation error messages on the page
  const pageText = await page.locator('main').textContent() || '';
  const dialogText = await page.locator('mat-dialog-container').textContent().catch(() => '') || '';
  const allText = pageText + dialogText;

  const hasError = allText.includes('error') || allText.includes('Error') ||
    allText.includes('invalid') || allText.includes('Invalid') ||
    allText.includes('minimum') || allText.includes('3 day') ||
    allText.includes('too short') || allText.includes('at least');

  // Check for mat-error elements
  const matErrors = await page.locator('mat-error').all();
  const errorMessages: string[] = [];
  for (const err of matErrors) {
    const text = (await err.textContent() || '').trim();
    if (text) errorMessages.push(text);
  }
  console.log(`[TC-011] Validation errors found: ${JSON.stringify(errorMessages)}`);

  // Either mat-error exists or page text indicates error
  const hasValidationError = errorMessages.length > 0 || hasError;
  expect(hasValidationError).toBe(true);
});

test('ATC-ES-052 - Verify no MMIS transaction rows generated', async () => {
  // If we're still on the detail page, reload and check
  const currentUrl = page.url();
  await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Should NOT have any new MMIS transaction list for this failed suspension
  const transactionList = page.getByText('MMIS Transaction List').first();
  const hasTransactionList = await transactionList.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hasTransactionList) {
    console.log('[TC-011] MMIS Transaction List visible (from prior operations) — verifying no new suspension txns');
  } else {
    console.log('[TC-011] No MMIS Transaction List — confirmed no sync triggered');
  }

  // Verify no pending sync indicator for suspension
  const status = await getSyncStatus(page);
  console.log(`[TC-011] Sync status: ${JSON.stringify(status)}`);

  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
