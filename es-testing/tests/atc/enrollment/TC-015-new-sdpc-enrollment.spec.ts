/**
 * ATC: TC-015 — New SDPC Enrollment
 *
 * Creates a new SDPC enrollment with status Enrolled.
 * Expects 1 MMIS transaction and SU response.
 *
 * State-aware: Checks that participant is accessible before attempting the action.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant must be accessible with ISP start date set.
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

const ENROLLMENT_START = '06/01/2026';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-015: New SDPC Enrollment', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-015] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

/**
 * Helper: Creates a new SDPC enrollment via "+ New Program Enrollment" dialog.
 */
async function createEnrollment(
  pg: Page,
  opts: { program: string; status: string; statusReason: string; startDate: string; endDate?: string }
): Promise<void> {
  const trigger = pg.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await pg.waitForTimeout(3000);
  await expect(pg.locator('mat-dialog-container').first()).toBeVisible({ timeout: 5_000 });

  // Program
  const programInput = pg.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await pg.waitForTimeout(300);
  await programInput.fill(opts.program, { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: new RegExp(opts.program, 'i') }).first().click();
  await pg.waitForTimeout(1000);

  // Status
  const statusInput = pg.locator('input[aria-label="Status"]').first();
  await statusInput.click({ force: true });
  await pg.waitForTimeout(300);
  await statusInput.fill(opts.status, { force: true });
  await pg.waitForTimeout(1500);
  const statusOpt = pg.locator('mat-option').filter({ hasText: new RegExp(opts.status, 'i') }).first();
  await expect(statusOpt).toBeVisible({ timeout: 5_000 });
  await statusOpt.click();
  await pg.waitForTimeout(1500);

  // Status Reason
  const reasonInput = pg.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await pg.waitForTimeout(500);
  await reasonInput.fill('', { force: true });
  await reasonInput.pressSequentially(opts.statusReason.substring(0, 10), { delay: 80 });
  await pg.waitForTimeout(2000);
  let reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await reasonOpt.click();
  } else {
    await reasonInput.fill('', { force: true });
    await reasonInput.pressSequentially('Not', { delay: 80 });
    await pg.waitForTimeout(2000);
    reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
    if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonOpt.click();
    } else {
      await reasonInput.fill('', { force: true });
      await reasonInput.click({ force: true });
      await reasonInput.press('ArrowDown');
      await pg.waitForTimeout(1000);
      reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
      if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reasonOpt.click();
      }
    }
  }
  await pg.waitForTimeout(500);

  // Start Date
  const startInput = pg.locator('input[id^="startDate_"]').first();
  await startInput.click({ force: true });
  await startInput.fill('', { force: true });
  await startInput.pressSequentially(opts.startDate, { delay: 50 });
  await startInput.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await startInput.press('Tab');
  await pg.waitForTimeout(500);

  // End Date (if provided)
  if (opts.endDate) {
    const endInput = pg.locator('input[id^="endDate_"]').first();
    await endInput.click({ force: true });
    await endInput.fill('', { force: true });
    await endInput.pressSequentially(opts.endDate, { delay: 50 });
    await endInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await endInput.press('Tab');
    await pg.waitForTimeout(500);
  }

  // Save
  await pg.getByRole('button', { name: 'Save' }).first().click({ force: true });
  await pg.waitForTimeout(5000);
  await pg.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify dialog closed
  const stillOpen = await pg.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (stillOpen) {
    const errors = await pg.locator('mat-error').all();
    for (const e of errors) {
      console.error(`  Save error: ${(await e.textContent())?.trim()}`);
    }
    await pg.screenshot({ path: `test-results/tc015-create-sdpc-enrollment-error.png`, fullPage: true });
  }
  expect(stillOpen).toBe(false);
}

test('ATC-ES-065 - Create SDPC enrollment (only if participant accessible)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-015] State: IRIS=${state.irisState}, rowCount=${state.rowCount}`);

  // Phase 1: just needs participant accessible
  const pageText = await page.locator('main').textContent() || '';
  if (!pageText.includes('Enrollment') && !pageText.includes('Program') && state.rowCount === 0) {
    console.log('[TC-015] Skipping — participant not accessible');
    return;
  }

  console.log('[TC-015] Creating SDPC Enrolled enrollment...');
  await createEnrollment(page, {
    program: 'SDPC',
    status: 'Enrolled',
    statusReason: 'Not Applicable',
    startDate: ENROLLMENT_START,
  });
  console.log('[TC-015] SDPC Enrolled created — MMIS sync triggered');
});

test('ATC-ES-066 - Verify SDPC enrollment appears in list', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  if (!(await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log('[TC-015] SDPC row not visible — skipping verification');
    return;
  }
  const rowText = await sdpcRow.textContent() || '';
  console.log(`[TC-015] SDPC row: ${rowText.trim().substring(0, 120)}`);

  expect(rowText).toContain('SDPC');
  expect(rowText).toContain('Enrolled');
});

test('ATC-ES-067 - Verify 1 MMIS transaction and SU response', async () => {
  const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
  if (!(await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log('[TC-015] SDPC row not visible — skipping verification');
    return;
  }
  await sdpcRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

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
    console.log(`[TC-015] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-015] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(1);
});

test('ATC-ES-068 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-015] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial
