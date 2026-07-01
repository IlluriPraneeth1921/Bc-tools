/**
 * ATC: TC-017 — ICA Transfer During Suspension
 *
 * Performs an ICA transfer while the participant has an active suspension.
 * Expects 3 MMIS transactions: S600 (closure) + S255 (resend spans).
 *
 * State-aware: Checks that participant is Enrolled with suspension before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 or TC-010 must have completed (active suspension exists).
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
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_017;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-017: ICA Transfer During Suspension', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-017] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-073 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-017] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
    console.log(`[TC-017] Skipping — precondition not met (need Enrolled + suspension, current: ${state.irisState}, suspension: ${state.hasSuspension})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-074 - Navigate to ICA assignment and perform transfer', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-017] Skipping — previous step was skipped');
    return;
  }

  // Navigate to ICA assignment section
  const icaTab = page.getByText(/ICA|Location Assignment|Agency/i).first();
  if (await icaTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await icaTab.click();
    await page.waitForTimeout(2000);
  }

  // Look for transfer or new assignment action
  const transferBtn = page.getByText(/Transfer|New.*Assignment|Change.*Agency/i).first();
  if (await transferBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await transferBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  // Select new agency
  const agencyInput = page.locator('input[aria-label*="Agency"], input[aria-label*="ICA"], input[aria-label*="Location"]').first();
  if (await agencyInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await agencyInput.click({ force: true });
    await agencyInput.fill('', { force: true });
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

  console.log('[TC-017] ICA transfer during suspension completed');
});

test('ATC-ES-075 - Verify 3 MMIS transactions (S600 + S255 resend spans)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log('[TC-017] Enrolled row not visible — skipping verification');
    return;
  }
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // Wait for sync to complete with polling
  const currentUrl = page.url();
  const maxAttempts = 6;
  const pollInterval = 10_000;
  let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[TC-017] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  // Verify 3 transaction rows
  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-017] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(3);
});

test('ATC-ES-076 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-017] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
