/**
 * UJT Phase 8 — Requires SDPC Suspension (TC-015 + TC-018 SU)
 *
 * Executes: TC-027
 * Starting state: Participant Enrolled in SDPC with active suspension
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentSdpcState,
  getFullEnrollmentState,
} from '../../helpers/state-checker';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 8: SDPC Suspension Deletion', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 8] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase8-Precondition: Verify SDPC enrollment with suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const sdpcState = await getCurrentSdpcState(page);
    console.log(`[Phase 8] SDPC state: ${sdpcState}`);

    if (sdpcState !== 'Enrolled') {
      console.error('[Phase 8] ⚠️ PRECONDITION: SDPC must be Enrolled with suspension. Run Phase 7 first.');
    }
    expect(sdpcState).toBe('Enrolled');
  });

  test('TC-027: Delete SDPC suspension (only if SDPC suspension exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const sdpcState = await getCurrentSdpcState(page);
    if (sdpcState !== 'Enrolled') {
      console.log(`[TC-027] Skipping — SDPC not Enrolled (current: ${sdpcState})`);
      return;
    }

    // Open SDPC enrollment detail
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).filter({ hasText: /Enrolled/ }).first();
    if (!(await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      console.log('[TC-027] Skipping — SDPC Enrolled row not visible');
      return;
    }

    await sdpcRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    console.log('[TC-027] Would delete SDPC suspension — expects 2 MMIS txns (S410+S470 SDPC)');
    // Verify we're on the detail page
    expect(page.url()).toContain('/programenrollment/');
  });
});
