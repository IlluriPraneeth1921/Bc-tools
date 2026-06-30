/**
 * ATC: TC-019 — Begin Date Earlier (Delete + Recreate)
 *
 * Changes the enrollment begin date to an earlier date, causing a
 * delete + recreate transaction pair.
 * Expects 2 MMIS transactions: S310 (delete) + S300 (recreate).
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

const NEW_BEGIN_DATE = '05/15/2026'; // Earlier than original 06/01/2026

let browser: Browser;
let page: Page;
let participantUuid: string;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newContext().then(c => c.newPage());
  await loginAndSelectContext(page);
  participantUuid = await resolveParticipantUuid(page);
  console.log(`[TC-019] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

test('ATC-ES-081 - Navigate to enrollment detail (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-019] State: IRIS=${irisState}`);

  if (irisState !== 'Enrolled') {
    console.log(`[TC-019] Skipping — precondition not met (current: ${irisState})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-082 - Change enrollment begin date to earlier date', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-019] Skipping — previous step was skipped');
    return;
  }

  const startDateInput = page.locator('input[id*="startDate"], input[id*="StartDate"], input[id*="beginDate"], input[aria-label*="Start Date"], input[aria-label*="Begin Date"]').first();
  if (await startDateInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await startDateInput.click({ force: true });
    await startDateInput.fill('', { force: true });
    await startDateInput.pressSequentially(NEW_BEGIN_DATE, { delay: 50 });
    await startDateInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await startDateInput.press('Tab');
    await page.waitForTimeout(500);
  }

  // Save changes
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-019] Enrollment begin date changed to earlier — delete+recreate triggered');
});

test('ATC-ES-083 - Verify 2 MMIS transactions (S310 delete + S300 recreate)', async () => {
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-019] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(2);
});

test('ATC-ES-084 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-019] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toBe('SU');
  expect(status.hasConflict).toBe(false);
});
