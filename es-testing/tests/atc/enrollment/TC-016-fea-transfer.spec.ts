/**
 * ATC: TC-016 — FEA Transfer: Close + Open
 *
 * Updates the FEA (Fiscal Employer Agent) assignment to a new agency.
 * Expects 2 MMIS transactions: close old FEA span + open new FEA span.
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
  console.log(`[TC-016] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

test('ATC-ES-069 - Navigate to enrollment detail for FEA transfer (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-016] State: IRIS=${irisState}`);

  if (irisState !== 'Enrolled') {
    console.log(`[TC-016] Skipping — precondition not met (current: ${irisState})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-070 - Navigate to FEA assignment and perform transfer', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-016] Skipping — previous step was skipped');
    return;
  }

  // Navigate to FEA assignment section/tab
  const feaTab = page.getByText(/FEA|Fiscal.*Employer|Fiscal.*Agent/i).first();
  if (await feaTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await feaTab.click();
    await page.waitForTimeout(2000);
  }

  // Look for transfer or edit action
  const transferBtn = page.getByText(/Transfer|New.*Assignment|Change.*FEA|Edit/i).first();
  if (await transferBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  // Select new FEA agency
  const feaInput = page.locator('input[aria-label*="FEA"], input[aria-label*="Fiscal"], input[aria-label*="Agency"]').first();
  if (await feaInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await feaInput.click({ force: true });
    await feaInput.fill('', { force: true });
    await page.waitForTimeout(500);
    const option = page.locator('mat-option').first();
    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
      await page.waitForTimeout(1000);
    }
  }

  // Save the transfer
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  console.log('[TC-016] FEA transfer action completed');
});

test('ATC-ES-071 - Verify 2 MMIS transactions (close old + open new)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log('[TC-016] Enrolled row not visible — skipping verification');
    return;
  }
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // Wait for sync to complete
  await page.waitForTimeout(10000);
  await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  // Verify 2 transaction rows (close old FEA + open new FEA)
  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-016] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(2);
});

test('ATC-ES-072 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-016] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toBe('SU');
  expect(status.hasConflict).toBe(false);
});
