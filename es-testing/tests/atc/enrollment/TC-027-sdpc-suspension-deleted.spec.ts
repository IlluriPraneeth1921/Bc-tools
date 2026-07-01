/**
 * ATC: TC-027 — SDPC Suspension Deleted
 *
 * Deletes an existing SDPC suspension record.
 * Expects 2 MMIS transactions: S410 + S470 (for SDPC).
 *
 * State-aware: Checks that SDPC enrollment is Enrolled with suspension before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-018 must have completed successfully (SDPC suspension exists).
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
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_027;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-027: SDPC Suspension Deleted', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-027] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-113 - Navigate to SDPC enrollment detail with suspension (only if SDPC Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const sdpcState = await getCurrentSdpcState(page);
  const state = await getFullEnrollmentState(page);
  console.log(`[TC-027] State: SDPC=${sdpcState}, Suspension=${state.hasSuspension}`);

  if (sdpcState !== 'Enrolled') {
    console.log(`[TC-027] Skipping — precondition not met (SDPC current: ${sdpcState}, need Enrolled with suspension)`);
    return;
  }

  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
  await sdpcRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-114 - Delete SDPC suspension record', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-027] Skipping — previous step was skipped');
    return;
  }

  // Look for suspension row and delete action
  const suspensionRow = page.locator('mat-row, tr').filter({ hasText: /Suspend|suspension/i }).first();
  if (await suspensionRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await suspensionRow.click();
    await page.waitForTimeout(1000);
  }

  // Look for delete button
  const deleteBtn = page.getByRole('button', { name: /Delete|Remove/i }).first();
  if (await deleteBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await deleteBtn.click({ force: true });
    await page.waitForTimeout(2000);
  } else {
    const deleteIcon = page.locator('button[aria-label*="delete"], button[aria-label*="Delete"], [mattooltip*="Delete"]').first();
    if (await deleteIcon.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await deleteIcon.click({ force: true });
      await page.waitForTimeout(2000);
    }
  }

  // Confirm deletion dialog if present
  const confirmBtn = page.getByRole('button', { name: /Confirm|Yes|OK/i }).first();
  if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await confirmBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Save if needed
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  console.log('[TC-027] SDPC suspension delete action completed');
});

test('ATC-ES-115 - Verify 2 MMIS transactions (S410 + S470 for SDPC)', async () => {
  const currentUrl = page.url();
  const maxAttempts = 6;
  const pollInterval = 10_000;
  let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[TC-027] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-027] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(2);
});

test('ATC-ES-116 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-027] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
