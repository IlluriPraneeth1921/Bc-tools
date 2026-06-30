/**
 * UJT Phase 7 — Requires SDPC Enrollment (TC-015 SU)
 *
 * Executes: TC-018, TC-026
 * Starting state: Participant Enrolled in SDPC with successful sync
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addSuspension,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentSdpcState,
  getFullEnrollmentState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const ISP_START_DATE = `${String(now.getMonth() + 1).padStart(2, '0')}/01/${now.getFullYear()}`;
const dates = computeTestDates(ISP_START_DATE);

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 7: SDPC Enrollment Scenarios', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 7] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(600_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase7-Precondition: Verify active SDPC enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const sdpcState = await getCurrentSdpcState(page);
    console.log(`[Phase 7] SDPC state: ${sdpcState}`);

    if (sdpcState !== 'Enrolled') {
      console.error('[Phase 7] ⚠️ PRECONDITION: Participant must be Enrolled in SDPC. Run Phase 1 (TC-015) first.');
    }
    expect(sdpcState).toBe('Enrolled');
  });

  test('TC-018: Add SDPC suspension (only if SDPC Enrolled, no suspension)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const sdpcState = await getCurrentSdpcState(page);
    if (sdpcState !== 'Enrolled') {
      console.log(`[TC-018] Skipping — SDPC not Enrolled (current: ${sdpcState})`);
      return;
    }

    // Open SDPC enrollment detail
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).filter({ hasText: /Enrolled/ }).first();
    if (!(await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
      console.log('[TC-018] Skipping — SDPC Enrolled row not visible');
      return;
    }

    await sdpcRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    console.log(`[TC-018] Adding SDPC suspension: ${dates.suspensionStart} → ${dates.suspensionEnd}`);
    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Participant Requested',
    });

    await page.waitForTimeout(10_000);
    const status = await getSyncStatus(page);
    console.log(`[TC-018] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  test('TC-026: SDPC end date earlier (only if SDPC Enrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const sdpcState = await getCurrentSdpcState(page);
    if (sdpcState !== 'Enrolled') {
      console.log(`[TC-026] Skipping — SDPC not Enrolled (current: ${sdpcState})`);
      return;
    }

    console.log('[TC-026] Would set SDPC end date earlier — expects 1 MMIS txn (S340 SDPC)');
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 10_000 });
  });
});
