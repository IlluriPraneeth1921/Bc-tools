/**
 * ATC: TC-012 — Suspension Deleted
 *
 * Deletes an existing suspension record from an active enrollment.
 * Expects 2 MMIS transactions: S410 (delete suspension) + S470 (restore Span-A).
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
  openEnrollmentByText,
  deleteSuspension,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_012;
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

  test('ATC-ES-053 - Precondition: Enrolled with active suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-012] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

    if (state.irisState !== 'Enrolled' && state.irisState !== 'Suspended') {
      console.log(`[TC-012] Precondition not met: need Enrolled/Suspended, current: ${state.irisState}`);
      test.skip();
      return;
    }

    // Open enrollment detail and verify suspension exists
    const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
    expect(opened, 'Could not open enrollment detail').toBe(true);

    const suspHeading = page.locator('span:text("Suspensions")').first();
    await expect(suspHeading).toBeVisible({ timeout: 15_000 });
    await suspHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    const menuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
    const hasSusp = await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasSusp, 'No suspension record found on detail page').toBe(true);
    console.log('[TC-012] Suspension record found — proceeding with delete');
  });

  test('ATC-ES-054 - Delete existing suspension record', async () => {
    if (!page.url().includes('/programenrollment/')) {
      console.log('[TC-012] Skipping — previous step was skipped');
      test.skip();
      return;
    }

    const deleted = await deleteSuspension(page);
    expect(deleted, 'Suspension deletion failed').toBe(true);
    console.log('[TC-012] Suspension successfully deleted');
  });

  test('ATC-ES-055 - Verify MMIS sync (2 transactions: S410 + S470)', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-012] ✓ Suspension delete sync completed (${status.responseStatus})`);
  });

});
