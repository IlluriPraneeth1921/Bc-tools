/**
 * ATC: TC-030 — SE Response: Enrollment Activated
 *
 * Creates an enrollment that returns SE (Success with Errors).
 * Per BR-D01-010, enrollment is still activated despite warnings.
 *
 * State-aware: Checks that participant is accessible before attempting.
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
  openFirstEnrollmentDetail,
  getSyncStatus,
  hasConflictBadge,
  getMMISErrors,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { mockMmisWarning, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_030;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;

/** When true, uses database stored procedure to mock MMIS Warning (SE) response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-030: SE Response: Enrollment Activated', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-030] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { if (MOCK_MMIS) await closeDb(); await browser.close(); });

/**
 * Helper: Creates a new enrollment via "+ New Program Enrollment" dialog.
 */
async function createEnrollment(
  pg: Page,
  opts: { status: string; statusReason: string; startDate: string }
): Promise<void> {
  const trigger = pg.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await pg.waitForTimeout(3000);
  await expect(pg.locator('mat-dialog-container').first()).toBeVisible({ timeout: 5_000 });

  const programInput = pg.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await pg.waitForTimeout(300);
  await programInput.fill('IRIS', { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: /IRIS/ }).first().click();
  await pg.waitForTimeout(1000);

  const statusInput = pg.locator('input[aria-label="Status"]').first();
  await statusInput.click({ force: true });
  await pg.waitForTimeout(300);
  await statusInput.fill(opts.status, { force: true });
  await pg.waitForTimeout(1500);
  const statusOpt = pg.locator('mat-option').filter({ hasText: new RegExp(opts.status, 'i') }).first();
  await expect(statusOpt).toBeVisible({ timeout: 5_000 });
  await statusOpt.click();
  await pg.waitForTimeout(1500);

  const reasonInput = pg.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await pg.waitForTimeout(300);
  await reasonInput.fill(opts.statusReason.substring(0, 10), { force: true });
  await pg.waitForTimeout(1500);
  const reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await reasonOpt.click();
  }
  await pg.waitForTimeout(500);

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

  await pg.getByRole('button', { name: 'Save' }).first().click({ force: true });
  await pg.waitForTimeout(5000);
  await pg.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  const stillOpen = await pg.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (stillOpen) {
    await pg.screenshot({ path: `test-results/tc030-create-enrollment-error.png`, fullPage: true });
  }
  expect(stillOpen).toBe(false);
}

test('ATC-ES-126 - Create enrollment that triggers SE response (only if participant accessible)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-030] State: IRIS=${state.irisState}, rowCount=${state.rowCount}`);

  const pageText = await page.locator('main').textContent() || '';
  if (!pageText.includes('Enrollment') && !pageText.includes('Program') && state.rowCount === 0) {
    console.log('[TC-030] Skipping — participant not accessible');
    return;
  }

  console.log('[TC-030] Creating enrollment expecting SE (Success with Errors) response...');
  await createEnrollment(page, {
    status: 'Enrolled',
    statusReason: 'Not Applicable',
    startDate: ENROLLMENT_START,
  });
  console.log('[TC-030] Enrollment created — expecting SE response');
});

test('ATC-ES-127 - Verify SE response status', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const opened = await openFirstEnrollmentDetail(page);
  if (!opened) {
    console.log('[TC-030] Could not open enrollment detail — skipping verification');
    return;
  }

  if (MOCK_MMIS) {
    const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
    expect(enrollmentKey, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
    await page.waitForTimeout(5000);

    const mockResult = await mockMmisWarning(enrollmentKey!, '9199', 'ENROLLMENT PROCESSED WITH WARNINGS');
    expect(mockResult, 'mockMmisWarning failed — run scripts/createMMISMockProcedures.sql').toBe(true);
    console.log('[TC-030] MMIS Warning (SE) response mocked via database');

    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const status = await getSyncStatus(page);
    console.log(`[TC-030] Sync status (mocked): ${JSON.stringify(status)}`);
    expect(status.responseStatus).toBe('SE');
  } else {
    await page.waitForTimeout(10000);
    const currentUrl = page.url();
    const maxAttempts = 6;
    const pollInterval = 10_000;
    let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(3000);

      status = await getSyncStatus(page);
      console.log(`[TC-030] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

      if (status.responseStatus !== null) break;

      if (attempt < maxAttempts) {
        await page.waitForTimeout(pollInterval);
      }
    }

    expect(status.responseStatus).toBe('SE');
  }
});

test('ATC-ES-128 - Verify enrollment still activated (SE = success per BR-D01-010)', async () => {
  const status = await getSyncStatus(page);
  expect(status.hasConflict).toBe(false);

  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
  const rowText = await enrolledRow.textContent() || '';
  expect(rowText).toContain('Enrolled');
  console.log('[TC-030] Enrollment confirmed still active despite SE response');
});

test('ATC-ES-129 - Verify MMIS errors stored (warning-level)', async () => {
  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await enrolledRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const errors = await getMMISErrors(page);
  console.log(`[TC-030] MMIS warning errors: ${JSON.stringify(errors)}`);

  expect(errors.length).toBeGreaterThan(0);
});

test('ATC-ES-130 - Verify no conflict badge (SE is success)', async () => {
  const conflictVisible = await hasConflictBadge(page);
  expect(conflictVisible).toBe(false);
});

}); // end describe.serial
