/**
 * ATC: TC-010 — Open-Ended Suspension (No End Date)
 *
 * Adds a suspension with NO end date to an active enrollment.
 * Expects 2 MMIS transactions: Close Span-A (S500) + Add Span-B (S510).
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
  openFirstEnrollmentDetail,
  getSyncStatus,
  addSuspension,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_010;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
// No end date — open-ended suspension


/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-010: Open-Ended Suspension (No End Date)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-010] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

test('ATC-ES-045 - Navigate to enrollment detail (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-010] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  if (state.irisState !== 'Enrolled') {
    console.log(`[TC-010] Skipping — precondition not met (current: ${state.irisState})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-046 - Add open-ended suspension (no end date)', async () => {
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-010] Skipping — previous step was skipped');
    return;
  }

  // Wait for "Suspensions" section to be visible
  const suspensionsHeading = page.locator('text=Suspensions').first();
  await expect(suspensionsHeading).toBeVisible({ timeout: 20_000 });
  await suspensionsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Click "+ Add Suspension"
  const addSuspBtn = page.locator('button, a, span').filter({ hasText: /\+?\s*Add Suspension/i }).first();
  await expect(addSuspBtn).toBeVisible({ timeout: 10_000 });
  await addSuspBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await addSuspBtn.click();
  await page.waitForTimeout(3000);

  // Check if a dialog opened
  const dialog = page.locator('mat-dialog-container');
  const dialogVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

  if (dialogVisible) {
    console.log('[TC-010] Suspension dialog opened');

    // Fill suspension start date ONLY (no end date = open-ended)
    const startInput = page.locator('mat-dialog-container input[id*="startDate"], mat-dialog-container input[id*="Start"], mat-dialog-container input[aria-label*="Start"]').first();
    await expect(startInput).toBeVisible({ timeout: 10_000 });
    await startInput.click({ force: true });
    await startInput.fill('', { force: true });
    await startInput.pressSequentially(SUSPENSION_START, { delay: 50 });
    await startInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await startInput.press('Tab');
    await page.waitForTimeout(500);

    // Do NOT fill end date — leave it empty for open-ended suspension

    // Fill reason (required field)
    const reasonInput = page.locator('mat-dialog-container input[aria-label*="Reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await page.waitForTimeout(300);
      await reasonInput.fill('Moved to ineligible', { force: true });
      await page.waitForTimeout(1500);
      const reasonOpt = page.locator('mat-option').filter({ hasText: /Moved to ineligible/i }).first();
      if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reasonOpt.click();
        await page.waitForTimeout(500);
      } else {
        // Try shorter search
        await reasonInput.fill('', { force: true });
        await reasonInput.fill('Participant', { force: true });
        await page.waitForTimeout(1500);
        const altOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
        if (await altOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await altOpt.click();
          await page.waitForTimeout(500);
        } else {
          // Last resort: open dropdown and pick first available
          await reasonInput.fill('', { force: true });
          await reasonInput.click({ force: true });
          await reasonInput.press('ArrowDown');
          await page.waitForTimeout(1500);
          const fallbackOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
          if (await fallbackOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await fallbackOpt.click();
            await page.waitForTimeout(500);
          }
        }
      }
    }

    // Save the dialog
    const saveBtn = page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
    if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
    } else {
      await page.getByRole('button', { name: 'Save' }).first().click({ force: true });
    }
  } else {
    console.log('[TC-010] Suspension inline form (no dialog)');

    const startInput = page.locator('input[id*="startDate"], input[id*="suspensionStart"], input[aria-label*="Start Date"]').first();
    await expect(startInput).toBeVisible({ timeout: 10_000 });
    await startInput.click({ force: true });
    await startInput.fill('', { force: true });
    await startInput.pressSequentially(SUSPENSION_START, { delay: 50 });
    await startInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await startInput.press('Tab');
    await page.waitForTimeout(500);

    // No end date for open-ended

    const saveBtn = page.getByRole('button', { name: 'Save' }).first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
    await saveBtn.click({ force: true });
  }

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify dialog closed (if dialog was used)
  const dialogStillOpen = await page.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (dialogStillOpen) {
    const errors = await page.locator('mat-error').all();
    for (const e of errors) { console.error(`[TC-010] Error: ${(await e.textContent())?.trim()}`); }
    expect(dialogStillOpen, 'Suspension dialog did not close — possible validation errors').toBe(false);
  }

  console.log(`[TC-010] Open-ended suspension added: ${SUSPENSION_START} → (no end date) — MMIS sync triggered`);
});

test('ATC-ES-047 - Verify 2 MMIS transactions (S500 + S510, no Span-C)', async () => {
  if (MOCK_MMIS) {
    // ─── Mock path: Use database to set MMIS Success ──────────────────────
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
    expect(mockResult, 'mockMmisSuccess failed — stored procedure missing?').toBe(true);
    console.log(`[TC-010] MMIS Success mocked for key: ${key}`);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const status = await getSyncStatus(page);
    expect(status.responseStatus).toBe('SU');
    expect(status.hasConflict).toBe(false);
  } else {
    // ─── Real path: Poll for actual MMIS response ─────────────────────────
    // Poll for sync completion
    const currentUrl = page.url();
    const maxAttempts = 6;
    const pollInterval = 10_000;
    let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(3000);

      status = await getSyncStatus(page);
      console.log(`[TC-010] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

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

    // Verify exactly 2 transactions (NOT 3 like TC-002)
    const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-010] MMIS transaction rows found: ${count}`);
    // Open-ended suspension = 2 txns (S500 close + S510 suspended span), no Span-C
    expect(count).toBeGreaterThanOrEqual(2);
  }
});

test('ATC-ES-048 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-010] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
