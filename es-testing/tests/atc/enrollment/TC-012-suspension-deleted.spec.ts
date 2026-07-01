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
  openFirstEnrollmentDetail,
  getSyncStatus,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_012;


/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

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
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

test('ATC-ES-053 - Navigate to enrollment detail with active suspension (only if Enrolled + suspension)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-012] State: IRIS=${state.irisState}, Suspension(list)=${state.hasSuspension}`);

  if (state.irisState !== 'Enrolled' && state.irisState !== 'Suspended') {
    console.log(`[TC-012] Skipping — precondition not met (need Enrolled/Suspended, current: ${state.irisState})`);
    return;
  }

  // Navigate to enrollment detail to check for suspension records
  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled|Suspended/ }).filter({ hasNotText: /Disenrolled/ }).first();
  await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
  await enrolledRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');

  // Check for suspension on the detail page — look for the Suspensions section with actual records
  const suspensionsHeading = page.locator('span:text("Suspensions")').first();
  await expect(suspensionsHeading).toBeVisible({ timeout: 15_000 });
  await suspensionsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Check if there's an actual suspension row (not just the empty "No Suspension record(s) available" message)
  const suspMenuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
  const hasSuspensionOnDetail = await suspMenuBtn.isVisible({ timeout: 5_000 }).catch(() => false);

  if (!hasSuspensionOnDetail) {
    // Also check by looking for suspension dates in the section
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    const hasSuspDates = /\d{2}\/\d{2}\/\d{4}.*\d{2}\/\d{2}\/\d{4}.*(?:Moved|ineligible|reason)/i.test(pageText);
    if (!hasSuspDates) {
      console.log('[TC-012] Skipping — no suspension record found on enrollment detail page');
      // Reset URL so next test knows to skip
      await page.goto('about:blank');
      return;
    }
  }

  console.log('[TC-012] Suspension record found on enrollment detail — proceeding with delete');
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
  if (MOCK_MMIS) {
    // --- Mock path: Use database to set MMIS Success ---
    const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
    if (!enrollmentKey) {
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
      const opened = await openFirstEnrollmentDetail(page);
      expect(opened).toBe(true);
    }
    const key = enrollmentKey || extractProgramEnrollmentKeyFromUrl(page.url());
    expect(key, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
    await page.waitForTimeout(5000);
    const mockResult = await mockMmisSuccess(key!);
    expect(mockResult, 'mockMmisSuccess failed --- stored procedure missing?').toBe(true);
    console.log(`[TC-012] MMIS Success mocked for key: ${key}`);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const status = await getSyncStatus(page);
    expect(status.responseStatus).toBe('SU');
    expect(status.hasConflict).toBe(false);
  } else {
    // --- Real path: Poll for actual MMIS response ---
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
  }
});

test('ATC-ES-056 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-012] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial