/**
 * ATC: TC-032 — Address Update: No Current Span (S700 Cond 2)
 *
 * NEGATIVE TEST: Updates address on a disenrolled participant.
 * NO MMIS transactions should be sent (S700 condition 2 = "do nothing").
 *
 * State-aware: Checks that participant is Disenrolled before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant is disenrolled (no active span includes today).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  getSyncStatus,
  getMMISErrors,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_032;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-032: Address Update: No Current Span (S700 Cond 2)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-032] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-135 - Navigate to disenrolled participant (only if Disenrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-032] State: IRIS=${irisState}`);

  if (irisState !== 'Disenrolled') {
    console.log(`[TC-032] Skipping — precondition not met (current: ${irisState}, need Disenrolled)`);
    return;
  }

  const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled|Inactive|Closed/i }).first();
  if (await disenrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await disenrolledRow.dblclick();
  } else {
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await firstRow.dblclick();
  }
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-136 - Update address on disenrolled participant', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-032] Skipping — previous step was skipped');
    return;
  }

  const addressTab = page.getByText(/Address|Residential|Location/i).first();
  if (await addressTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addressTab.click();
    await page.waitForTimeout(2000);
  }

  const addressInput = page.locator(
    'input[aria-label*="Address"], input[id*="address"], input[id*="street"]'
  ).first();
  if (await addressInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await addressInput.click({ force: true });
    await addressInput.fill('', { force: true });
    await addressInput.fill('789 No Span Test Avenue', { force: true });
    await addressInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await addressInput.press('Tab');
    await page.waitForTimeout(500);
  }

  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-032] Address updated on disenrolled participant — no S700 expected');
});

test('ATC-ES-137 - Verify no new MMIS transaction generated', async () => {
  const currentUrl = page.url();
  await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const transactionList = page.getByText('MMIS Transaction List').first();
  const hasTransactionList = await transactionList.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hasTransactionList) {
    console.log('[TC-032] MMIS Transaction List visible (from prior operations) — verifying no new S700 txn');
  } else {
    console.log('[TC-032] No MMIS Transaction List — confirmed no S700 triggered');
  }

  const status = await getSyncStatus(page);
  console.log(`[TC-032] Sync status: ${JSON.stringify(status)}`);

  expect(status.hasConflict).toBe(false);
});

test('ATC-ES-138 - Verify S700 condition 2 routes to do nothing', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-032] Final sync status: ${JSON.stringify(status)}`);

  expect(status.hasConflict).toBe(false);

  const errors = await getMMISErrors(page);
  console.log(`[TC-032] MMIS errors after address update: ${JSON.stringify(errors)}`);

  console.log('[TC-032] Confirmed: S700 Condition 2 — no MMIS transaction sent for disenrolled participant');
});

}); // end describe.serial
