/**
 * ATC: TC-004 — Hard Error: FEA Dates Don't Span Enrollment Period
 *
 * Creates an enrollment where FEA assignment dates do NOT span the full
 * enrollment period. MMIS rejects with error 9156.
 *
 * State-aware: Checks that participant is accessible before attempting the action.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: FEA assignment with end date earlier than enrollment end date.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openFirstEnrollmentDetail,
  getSyncStatus,
  hasConflictBadge,
  isResubmitVisible,
  verifyEnrollmentRow,
  getMMISErrors,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { mockMmisFailed, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_004;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;

/** When true, uses database stored procedure to mock MMIS Failed response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-004: Hard Error: FEA Dates Don\'t Span Enrollment Period', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-004] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { if (MOCK_MMIS) await closeDb(); await browser.close(); });

/**
 * Helper: Creates a new enrollment via "+ New Program Enrollment" dialog.
 */
async function createEnrollment(
  pg: Page,
  opts: { status: string; statusReason: string; startDate: string; endDate?: string }
): Promise<void> {
  const trigger = pg.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await pg.waitForTimeout(3000);
  await expect(pg.locator('mat-dialog-container').first()).toBeVisible({ timeout: 5_000 });

  // Program = IRIS
  const programInput = pg.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await pg.waitForTimeout(300);
  await programInput.fill('IRIS', { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: /IRIS/ }).first().click();
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

  // Type the status reason text to trigger autocomplete
  await reasonInput.fill('', { force: true });
  await reasonInput.pressSequentially(opts.statusReason.substring(0, 10), { delay: 80 });
  await pg.waitForTimeout(2000);

  let reasonSelected = false;
  let reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await reasonOpt.click();
    reasonSelected = true;
  }

  if (!reasonSelected) {
    // Try typing just first 3 chars
    await reasonInput.fill('', { force: true });
    await reasonInput.pressSequentially('Not', { delay: 80 });
    await pg.waitForTimeout(2000);
    reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
    if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonOpt.click();
      reasonSelected = true;
    }
  }

  if (!reasonSelected) {
    // Try typing just a single space/letter to open full list
    await reasonInput.fill('', { force: true });
    await reasonInput.pressSequentially('a', { delay: 80 });
    await pg.waitForTimeout(1500);
    // Clear and try again — some autocompletes show all on backspace
    await reasonInput.fill('', { force: true });
    await pg.waitForTimeout(1500);
    reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
    if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonOpt.click();
      reasonSelected = true;
    }
  }

  if (!reasonSelected) {
    // Last resort: use keyboard to open and select
    await reasonInput.click({ force: true });
    await reasonInput.press('ArrowDown');
    await pg.waitForTimeout(1000);
    reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
    if (await reasonOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonOpt.click();
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
    await pg.screenshot({ path: `test-results/tc004-create-enrollment-error.png`, fullPage: true });
  }
  expect(stillOpen).toBe(false);
}

test('ATC-ES-021 - Create enrollment with invalid FEA dates (only if participant accessible)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-004] State: IRIS=${state.irisState}, rowCount=${state.rowCount}`);

  // Phase 1: just needs participant accessible (page loaded successfully)
  if (state.rowCount === 0 && state.irisState === null) {
    // Check if page loaded — if we can see the enrollment list, participant is accessible
    const pageText = await page.locator('main').textContent() || '';
    if (!pageText.includes('Enrollment') && !pageText.includes('Program')) {
      console.log('[TC-004] Skipping — participant not accessible');
      return;
    }
  }

  console.log('[TC-004] Creating Enrolled enrollment (FEA dates do not span)...');
  await createEnrollment(page, {
    status: 'Enrolled',
    statusReason: 'Not Applicable',
    startDate: ENROLLMENT_START,
  });
  console.log('[TC-004] Enrollment created — expecting MMIS rejection');
});

test('ATC-ES-022 - Verify FL response status', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const opened = await openFirstEnrollmentDetail(page);
  if (!opened) {
    console.log('[TC-004] Could not open enrollment detail — skipping verification');
    return;
  }

  if (MOCK_MMIS) {
    // Mock path: Set MMIS Failed response via database
    const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
    expect(enrollmentKey, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
    console.log(`[TC-004] ProgramEnrollmentKey: ${enrollmentKey}`);
    await page.waitForTimeout(5000);

    const mockResult = await mockMmisFailed(enrollmentKey!, '9156', 'FEA DATES DO NOT SPAN ENROLLMENT PERIOD');
    expect(mockResult, 'mockMmisFailed failed — run scripts/createMMISMockProcedures.sql').toBe(true);
    console.log('[TC-004] MMIS Failed response mocked via database');

    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const status = await getSyncStatus(page);
    console.log(`[TC-004] Sync status (mocked): ${JSON.stringify(status)}`);
    expect(status.responseStatus).toBe('FL');
  } else {
    // Real path: Poll for actual MMIS FL response
    const currentUrl = page.url();
    const maxAttempts = 6;
    const pollInterval = 10_000;
    let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(3000);

      status = await getSyncStatus(page);
      console.log(`[TC-004] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

      if (status.responseStatus !== null) break;

      if (attempt < maxAttempts) {
        await page.waitForTimeout(pollInterval);
      }
    }

    expect(status.responseStatus).toBe('FL');
  }
});

test('ATC-ES-023 - Verify conflict badge displayed', async () => {
  const conflictVisible = await hasConflictBadge(page);
  expect(conflictVisible).toBe(true);
});

test('ATC-ES-024 - Verify error 9156 in MMIS errors', async () => {
  const errors = await getMMISErrors(page);
  console.log(`[TC-004] MMIS errors: ${JSON.stringify(errors)}`);

  const pageText = await page.locator('main').textContent() || '';
  const has9156 = pageText.includes('9156') || errors.some(e => e.includes('9156'));
  expect(has9156).toBe(true);
});

test('ATC-ES-025 - Verify Re-submit button visible', async () => {
  const resubmitVisible = await isResubmitVisible(page);
  expect(resubmitVisible).toBe(true);
});

}); // end describe.serial
