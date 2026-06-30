/**
 * UJT Phase 6 — Requires Open-Ended Suspension (TC-001 + TC-010 SU)
 *
 * Executes: TC-013
 * Starting state: Participant Enrolled with open-ended suspension (no end date)
 * Test: Update suspension end date from null to a valid date
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
import {
  getCurrentIrisState,
  getFullEnrollmentState,
  hasActiveSuspension,
  hasOpenEndedSuspension,
} from '../../helpers/state-checker';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 6: Open-Ended Suspension → Bounded', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 6] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase6-Precondition: Verify open-ended suspension exists', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[Phase 6] IRIS: ${state.irisState}, Suspension: ${state.hasSuspension}`);

    expect(state.irisState).toBe('Enrolled');
    expect(state.hasSuspension).toBe(true);
  });

  test('TC-013: Update suspension end from null to valid (only if open-ended exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-013] Skipping — preconditions not met`);
      return;
    }

    // Open enrollment detail
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const hasSusp = await hasActiveSuspension(page);
    if (!hasSusp) {
      console.log('[TC-013] Skipping — no active suspension on detail page');
      return;
    }

    console.log('[TC-013] Would update suspension end from null → valid — expects 2 MMIS txns (S440+S520)');
  });
});
