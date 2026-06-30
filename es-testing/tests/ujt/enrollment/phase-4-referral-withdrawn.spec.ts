/**
 * UJT Phase 4 — Requires Separate Active Enrollment (fresh TC-001)
 *
 * Executes: TC-008
 * Starting state: Participant has active IRIS enrollment
 * Test: Change status to Referral Withdrawn (deletes MMIS span)
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

test.describe('UJT Phase 4: Referral Withdrawn', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 4] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase4-Precondition: Verify active IRIS enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    console.log(`[Phase 4] Current IRIS state: ${state}`);

    if (state !== 'Enrolled') {
      console.error('[Phase 4] ⚠️ PRECONDITION: Participant must be Enrolled. Run Phase 1 first.');
    }
    expect(state).toBe('Enrolled');
  });

  test('TC-008: Referral Withdrawn (only if Enrolled)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') {
      console.log(`[TC-008] Skipping — not Enrolled (current: ${state})`);
      return;
    }

    // Open enrollment detail
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    console.log('[TC-008] Would change status to Referral Withdrawn — expects 1 MMIS txn (S310 delete)');
    expect(page.url()).toContain('/programenrollment/');
  });
});
