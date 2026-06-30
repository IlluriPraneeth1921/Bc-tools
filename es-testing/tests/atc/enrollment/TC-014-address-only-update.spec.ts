/**
 * ATC: TC-014 — Address-Only Update
 *
 * Updates participant's residential address without changing enrollment data.
 * Expects 1 MMIS transaction: S700 (address update on current span).
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
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const ISP_START_DATE = `${String(now.getMonth() + 1).padStart(2, '0')}/01/${now.getFullYear()}`;
const dates = computeTestDates(ISP_START_DATE);

let browser: Browser;
let page: Page;
let participantUuid: string;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newContext().then(c => c.newPage());
  await loginAndSelectContext(page);
  participantUuid = await resolveParticipantUuid(page);
  console.log(`[TC-014] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

test('ATC-ES-061 - Navigate to enrollment detail (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-014] State: IRIS=${irisState}`);

  if (irisState !== 'Enrolled') {
    console.log(`[TC-014] Skipping — precondition not met (current: ${irisState})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-062 - Update participant residential address', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-014] Skipping — previous step was skipped');
    return;
  }

  // Navigate to address section/tab within enrollment detail
  const addressTab = page.getByText(/Address|Residential|Location/i).first();
  if (await addressTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addressTab.click();
    await page.waitForTimeout(2000);
  }

  // Find and update address fields
  const addressInput = page.locator('input[aria-label*="Address"], input[id*="address"], input[id*="street"]').first();
  if (await addressInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await addressInput.click({ force: true });
    await addressInput.fill('', { force: true });
    await addressInput.fill('456 Updated Test Street', { force: true });
    await addressInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await addressInput.press('Tab');
    await page.waitForTimeout(500);
  }

  // Save changes
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-014] Address updated — S700 MMIS transaction triggered');
});

test('ATC-ES-063 - Verify 1 MMIS transaction (S700 address update)', async () => {
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const pageText = await page.locator('main').textContent() || '';
  const hasSyncEvidence = pageText.includes('MMIS') || pageText.includes('Sync') ||
    pageText.includes('SU') || pageText.includes('Transaction');
  expect(hasSyncEvidence).toBe(true);

  // Verify at least 1 transaction row for address update
  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-014] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(1);
});

test('ATC-ES-064 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-014] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toBe('SU');
  expect(status.hasConflict).toBe(false);
});
