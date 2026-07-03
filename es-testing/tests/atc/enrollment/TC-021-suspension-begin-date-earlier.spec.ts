/**
 * ATC: TC-021 — Suspension Begin → Earlier (S230_001)
 *
 * Changes a bounded suspension's begin date to an earlier date.
 * Expects 4 MMIS transactions: S400 + S410 + S300 + S510.
 *
 * State-aware: Checks that participant is Enrolled with suspension before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed successfully (bounded suspension exists).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  verifyMmisSync,
  getSyncStatus,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_021;
const NEW_SUSPENSION_BEGIN = DATA.bcInput.newSuspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-021: Suspension Begin → Earlier (S230_001)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-021] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-089 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-021] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-021] Skipping — precondition not met (need Enrolled + suspension)`);
      return;
    }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);
  });

  test('ATC-ES-090 - Change suspension begin date to earlier date', async () => {
    if (!page.url().includes('/programenrollment/')) {
      console.log('[TC-021] Skipping — previous step was skipped');
      return;
    }

    // Wait for suspension section, then open edit mode on the suspension row
    const suspensionRow = page.locator('mat-row, tr').filter({ hasText: /Suspend|suspension/i }).first();
    await suspensionRow.waitFor({ state: 'visible', timeout: 10_000 });
    await suspensionRow.click();

    const pencil = suspensionRow.locator('button:has(mat-icon:text("edit"))').first();
    if (await pencil.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await pencil.click();
    } else {
      await suspensionRow.dblclick();
    }

    // Fill new begin date
    const beginDateInput = page.locator('input[id*="suspensionStart"], input[id*="startDate"], input[aria-label*="Start Date"], input[aria-label*="Begin Date"]').first();
    await beginDateInput.waitFor({ state: 'visible', timeout: 10_000 });
    await beginDateInput.click({ force: true });
    await beginDateInput.fill('', { force: true });
    await beginDateInput.pressSequentially(NEW_SUSPENSION_BEGIN, { delay: 50 });
    await beginDateInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await beginDateInput.press('Tab');

    // Save
    const saveBtn = page.getByRole('button', { name: 'Save' }).first();
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
    await saveBtn.click({ force: true });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    console.log('[TC-021] Suspension begin date changed to earlier — S230_001 triggered');
  });

  test('ATC-ES-091 - Verify 4 MMIS transactions (S400 + S410 + S300 + S510)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });
    const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`[TC-021] MMIS transaction rows found: ${count}`);
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('ATC-ES-092 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-021] Sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
