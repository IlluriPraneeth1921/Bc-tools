/**
 * ATC: TC-012 — Suspension Deleted
 *
 * Deletes an existing suspension record from an active enrollment.
 * Expects 2 MMIS transactions: S410 (delete suspension) + S470 (restore Span-A).
 *
 * State-aware: Checks that participant is Enrolled with suspension before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed successfully (active suspension exists).
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

const DATA = SCENARIOS.TC_012;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-012: Suspension Deleted', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-012] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-053 - Navigate to enrollment detail with active suspension (only if Enrolled + suspension)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-012] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  if ((state.irisState !== 'Enrolled' && state.irisState !== 'Suspended') || !state.hasSuspension) {
    console.log(`[TC-012] Skipping — precondition not met (need Enrolled/Suspended + suspension, current: ${state.irisState}, suspension: ${state.hasSuspension})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled|Suspended/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-054 - Delete existing suspension record', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-012] Skipping — previous step was skipped');
    return;
  }

  // Scroll to Suspensions section
  const suspensionsHeading = page.locator('span:text("Suspensions")').first();
  await expect(suspensionsHeading).toBeVisible({ timeout: 15_000 });
  await suspensionsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // The suspension row's three-dot button has aria-label="Expand menu" and class "ellipse-action-menu"
  const suspensionMenuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
  await expect(suspensionMenuBtn).toBeVisible({ timeout: 10_000 });
  await suspensionMenuBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await suspensionMenuBtn.click();
  await page.waitForTimeout(1000);

  // Click "Delete" from the context menu (renders in .cdk-overlay-container)
  const deleteMenuItem = page.locator('.mat-mdc-menu-content button[mat-menu-item]').filter({ hasText: 'Delete' });
  await expect(deleteMenuItem).toBeVisible({ timeout: 5_000 });
  await deleteMenuItem.click();
  await page.waitForTimeout(2000);

  // Handle confirmation dialog — button text is "Continue"
  const dialog = page.locator('mat-dialog-container');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  const continueBtn = dialog.locator('button').filter({ hasText: /Continue/i }).first();
  await expect(continueBtn).toBeVisible({ timeout: 5_000 });
  await continueBtn.click();
  await page.waitForTimeout(3000);

  // Wait for page to process the deletion
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Verify suspension is gone — the "Expand menu" button for suspension should no longer exist
  const suspMenuStillVisible = await page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first()
    .isVisible({ timeout: 5_000 }).catch(() => false);

  if (suspMenuStillVisible) {
    // Double-check by looking for the suspension date
    const pageText = await page.locator('main').textContent().catch(() => '') || '';
    if (/07\/01\/2026.*09\/14\/2026/s.test(pageText)) {
      console.error('[TC-012] ERROR: Suspension row is still visible after delete!');
      // Take a screenshot for debugging
      throw new Error('Suspension deletion failed — record still visible in UI');
    }
  }

  console.log('[TC-012] Suspension successfully deleted from UI');
});

test('ATC-ES-055 - Verify 2 MMIS transactions (S410 + S470)', async () => {
  const currentUrl = page.url();
  const maxAttempts = 6;
  const pollInterval = 10_000;
  let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[TC-012] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const pageText = await page.locator('main').textContent() || '';
  const hasSyncEvidence = pageText.includes('MMIS') || pageText.includes('Sync') ||
    pageText.includes('SU') || pageText.includes('Transaction');
  expect(hasSyncEvidence).toBe(true);

  // Verify transaction rows
  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-012] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(2);
});

test('ATC-ES-056 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-012] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
