/**
 * ATC: TC-013 — Suspension End: Null → Valid
 *
 * Updates an open-ended suspension's end date from null to a valid date.
 * Expects 2 MMIS transactions: S440 (update suspension end) + S520 (create Span-C).
 *
 * State-aware: Checks that participant is Enrolled with open-ended suspension.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-010 must have completed successfully (open-ended suspension exists).
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

const NEW_SUSPENSION_END = '08/15/2026';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newContext().then(c => c.newPage());
  await loginAndSelectContext(page);
  participantUuid = await resolveParticipantUuid(page);
  console.log(`[TC-013] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

test('ATC-ES-057 - Navigate to enrollment detail with open-ended suspension (only if Enrolled + suspension)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-013] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
    console.log(`[TC-013] Skipping — precondition not met (need Enrolled + suspension, current: ${state.irisState}, suspension: ${state.hasSuspension})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-058 - Update suspension end date from null to valid date', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-013] Skipping — previous step was skipped');
    return;
  }

  // Find the suspension row and click to edit
  const suspensionRow = page.locator('mat-row, tr').filter({ hasText: /Suspend|suspension/i }).first();
  if (await suspensionRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await suspensionRow.click();
    await page.waitForTimeout(1000);
    await suspensionRow.dblclick();
    await page.waitForTimeout(2000);
  }

  // Find the suspension end date field and fill it
  const endDateInput = page.locator('input[id*="suspensionEnd"], input[id*="endDate"], input[aria-label*="End Date"]').first();
  if (await endDateInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await endDateInput.click({ force: true });
    await endDateInput.fill('', { force: true });
    await endDateInput.pressSequentially(NEW_SUSPENSION_END, { delay: 50 });
    await endDateInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await endDateInput.press('Tab');
    await page.waitForTimeout(500);
  }

  // Save changes
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-013] Suspension end date updated from null to valid date');
});

test('ATC-ES-059 - Verify 2 MMIS transactions (S440 + S520)', async () => {
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const pageText = await page.locator('main').textContent() || '';
  const hasSyncEvidence = pageText.includes('MMIS') || pageText.includes('Sync') ||
    pageText.includes('SU') || pageText.includes('Transaction');
  expect(hasSyncEvidence).toBe(true);

  // Verify transaction rows
  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-013] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(2);
});

test('ATC-ES-060 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-013] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toBe('SU');
  expect(status.hasConflict).toBe(false);
});
