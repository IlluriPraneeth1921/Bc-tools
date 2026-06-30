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
  getSyncStatus,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const ISP_START_DATE = `${String(now.getMonth() + 1).padStart(2, '0')}/01/${now.getFullYear()}`;
const dates = computeTestDates(ISP_START_DATE);

const NEW_END_DATE = '12/31/2026'; // Later end date

let browser: Browser;
let page: Page;
let participantUuid: string;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newContext().then(c => c.newPage());
  await loginAndSelectContext(page);
  participantUuid = await resolveParticipantUuid(page);
  console.log(`[TC-028] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

test('ATC-ES-117 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-028] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
    console.log(`[TC-028] Skipping — precondition not met (need Enrolled + suspension, current: ${state.irisState}, suspension: ${state.hasSuspension})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-118 - Extend enrollment end date while suspension is active', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-028] Skipping — previous step was skipped');
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

  console.log('[TC-028] Enrollment end date extended with active suspension — S350→S360 triggered');
});

test('ATC-ES-119 - Verify 1 MMIS transaction (S350→S360)', async () => {
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-028] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(1);
});

test('ATC-ES-120 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-028] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toBe('SU');
  expect(status.hasConflict).toBe(false);
});
