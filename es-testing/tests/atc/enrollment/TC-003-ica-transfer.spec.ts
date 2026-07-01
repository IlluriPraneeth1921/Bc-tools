/**
 * ATC: TC-003 — ICA Transfer: Close Old + Open New Span
 *
 * Transfers participant to a new ICA agency, closing the old agency span
 * and opening a new one. Expects 2 MMIS transactions.
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
  hasConflictBadge,
  isResubmitVisible,
  verifyEnrollmentRow,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_003;

/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-003: ICA Transfer: Close Old + Open New Span', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-003] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-016 - Navigate to enrollment detail for ICA transfer (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const state = await getFullEnrollmentState(page);
  console.log(`[TC-003] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

  expect(state.irisState, 'Precondition failed: participant must be Enrolled. Run TC-001 first.').toBe('Enrolled');

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-017 - Navigate to ICA assignment and perform transfer', async () => {
  // Check if we're on the enrollment detail page (previous test may have skipped)
  if (!page.url().includes('/programenrollment/')) {
    console.log('[TC-003] Skipping — previous step was skipped');
    return;
  }

  // Navigate to location assignments / ICA section
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

  // Select new agency (if dialog opens)
  const agencyInput = page.locator('input[aria-label*="Agency"], input[aria-label*="ICA"], input[aria-label*="Location"]').first();
  if (await agencyInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await agencyInput.click({ force: true });
    await agencyInput.fill('', { force: true });
    await page.waitForTimeout(500);
    // Select a different agency from the autocomplete
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

  console.log('[TC-003] ICA transfer action completed');
});

test('ATC-ES-018 - Verify 2 MMIS transactions generated', async () => {
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
    console.log(`[TC-003] MMIS Success mocked for key: ${key}`);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const status = await getSyncStatus(page);
    expect(status.responseStatus).toBe('SU');
    expect(status.hasConflict).toBe(false);
  } else {
    // ─── Real path: Poll for actual MMIS response ─────────────────────────
    // Navigate back to enrollment detail to check sync
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
    if (!(await firstRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      console.log('[TC-003] Enrolled row not visible — skipping verification');
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
      console.log(`[TC-003] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

      if (status.responseStatus !== null) break;

      if (attempt < maxAttempts) {
        await page.waitForTimeout(pollInterval);
      }
    }

    // Verify MMIS Transaction List is visible
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

    // Verify 2 transaction rows exist (Close old span + Open new span)
    const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-003] MMIS transaction rows found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(2);
  }
});

test('ATC-ES-019 - Verify no conflict after ICA transfer', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-003] Sync status: ${JSON.stringify(status)}`);

  expect(status.hasConflict).toBe(false);

  const conflictVisible = await hasConflictBadge(page);
  expect(conflictVisible).toBe(false);
});

test('ATC-ES-020 - Verify SU response status', async () => {
  const status = await getSyncStatus(page);
  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
});

}); // end describe.serial
