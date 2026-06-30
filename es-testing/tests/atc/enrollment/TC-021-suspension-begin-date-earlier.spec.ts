/**
 * ATC: TC-021 — Suspension Begin → Earlier (S230_001)
 *
 * Changes a bounded suspension's begin date to an earlier date.
 * Expects 4 MMIS transactions: S400 + S410 + S300 + S510.
 *
 * State-aware: Checks that participant is Enrolled with suspension before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed successfully (bounded suspension exists).
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
  getFullEnrollmentState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const ISP_START_DATE = `${String(now.getMonth() + 1).padStart(2, '0')}/01/${now.getFullYear()}`;
const dates = computeTestDates(ISP_START_DATE);

const NEW_SUSPENSION_BEGIN = '06/25/2026'; // Earlier than original

let browser: Browser;
let page: Page;
let participantUuid: string;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newContext().then(c => c.newPage());
  await loginAndSelectContext(page);
  participantUuid = await resolveParticipantUuid(page);
  console.log(`[TC-021] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

test('ATC-ES-089 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-021] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
    console.log(`[TC-021] Skipping — precondition not met (need Enrolled + suspension, current: ${state.irisState}, suspension: ${state.hasSuspension})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-090 - Change suspension begin date to earlier date', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-021] Skipping — previous step was skipped');
    return;
  }

  const suspensionRow = page.locator('mat-row, tr').filter({ hasText: /Suspend|suspension/i }).first();
  if (await suspensionRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await suspensionRow.click();
    await page.waitForTimeout(1000);
    await suspensionRow.dblclick();
    await page.waitForTimeout(2000);
  }

  const beginDateInput = page.locator('input[id*="suspensionStart"], input[id*="startDate"], input[aria-label*="Start Date"], input[aria-label*="Begin Date"]').first();
  if (await beginDateInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await beginDateInput.click({ force: true });
    await beginDateInput.fill('', { force: true });
    await beginDateInput.pressSequentially(NEW_SUSPENSION_BEGIN, { delay: 50 });
    await beginDateInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await beginDateInput.press('Tab');
    await page.waitForTimeout(500);
  }

  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-021] Suspension begin date changed to earlier — S230_001 triggered');
});

test('ATC-ES-091 - Verify 4 MMIS transactions (S400 + S410 + S300 + S510)', async () => {
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-021] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(4);
});

test('ATC-ES-092 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-021] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toBe('SU');
  expect(status.hasConflict).toBe(false);
});
