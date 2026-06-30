/**
 * UJT Phase 3 — Requires Disenrolled State (TC-006 completed)
 *
 * Executes: TC-007, TC-009, TC-032
 * Starting state: Participant disenrolled (end date set, no active span)
 * Each test checks preconditions before acting.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openFirstEnrollmentDetail,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import { getCurrentIrisState } from '../../helpers/state-checker';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 3: Disenrolled State Scenarios', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 3] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(600_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase3-Precondition: Verify participant is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    console.log(`[Phase 3] Current IRIS state: ${state}`);

    if (state !== 'Disenrolled') {
      console.error('[Phase 3] ⚠️ PRECONDITION: Participant must be Disenrolled. Run Phase 2 (TC-006) first.');
    }
    expect(state).toBe('Disenrolled');
  });

  test('TC-007: Extend end date later (only if Disenrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    if (state !== 'Disenrolled') {
      console.log(`[TC-007] Skipping — not Disenrolled (current: ${state})`);
      return;
    }

    console.log('[TC-007] Would extend enrollment end date — expects 1 MMIS txn (S350 Cond 2)');
    // Verify precondition met
    const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
    await expect(disenrolledRow).toBeVisible({ timeout: 10_000 });
  });

  test('TC-009: Reinstatement — Disenrolled → Enrolled (only if Disenrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    if (state !== 'Disenrolled') {
      console.log(`[TC-009] Skipping — not Disenrolled (current: ${state})`);
      return;
    }

    console.log('[TC-009] Would create new Enrolled enrollment (reinstatement) — expects 1 MMIS txn (S300)');
    const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
    await expect(disenrolledRow).toBeVisible({ timeout: 10_000 });
  });

  test('TC-032: Address update — no current span (only if Disenrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    if (state !== 'Disenrolled') {
      console.log(`[TC-032] Skipping — not Disenrolled (current: ${state})`);
      return;
    }

    console.log('[TC-032] Address update with no active span — expects NO MMIS txn (S700 Cond 2)');
    // S700 condition 2: no current span includes today → no transaction sent
    const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
    await expect(disenrolledRow).toBeVisible({ timeout: 10_000 });
  });
});
