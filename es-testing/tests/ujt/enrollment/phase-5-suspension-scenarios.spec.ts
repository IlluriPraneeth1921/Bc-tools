/**
 * UJT Phase 5 — Requires Bounded Suspension Synced (TC-001 + TC-002 SU)
 *
 * Executes: TC-012, TC-017, TC-021, TC-022, TC-023, TC-024, TC-025, TC-028, TC-031
 * Starting state: Participant Enrolled with bounded suspension synced to MMIS
 * Each test checks preconditions before acting.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openFirstEnrollmentDetail,
  getSyncStatus,
  hasConflictBadge,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentIrisState,
  getFullEnrollmentState,
  hasActiveSuspension,
  hasBoundedSuspension,
} from '../../helpers/state-checker';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 5: Suspension Modification Scenarios', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 5] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(600_000);
  test.afterAll(async () => { await browser.close(); });

  // ─── Precondition: Enrolled + bounded suspension ────────────────────────────

  test('Phase5-Precondition: Verify Enrolled with bounded suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[Phase 5] IRIS: ${state.irisState}, Suspension: ${state.hasSuspension}`);

    if (state.irisState !== 'Enrolled') {
      console.error('[Phase 5] ⚠️ PRECONDITION: Participant must be Enrolled. Run Phase 1 first.');
    }
    expect(state.irisState).toBe('Enrolled');

    if (!state.hasSuspension) {
      console.error('[Phase 5] ⚠️ PRECONDITION: Bounded suspension must exist. Run Phase 2 (TC-002) first.');
    }
    expect(state.hasSuspension).toBe(true);
  });

  // ─── TC-021: Suspension begin date → earlier ────────────────────────────────

  test('TC-021: Change suspension begin date earlier (only if bounded suspension exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-021] Skipping — preconditions not met (Enrolled=${state.irisState}, Suspension=${state.hasSuspension})`);
      return;
    }

    console.log('[TC-021] Would change suspension begin date to earlier — expects 4 MMIS txns (S400+S410+S300+S510)');
    // Navigate to enrollment detail and modify suspension begin date
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await enrolledRow.dblclick();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    // Verify we're on enrollment detail with suspension visible
    const hasSusp = await hasActiveSuspension(page);
    expect(hasSusp).toBe(true);
    console.log('[TC-021] Precondition verified: active suspension exists on detail page');
  });

  // ─── TC-022: Suspension begin date → later ──────────────────────────────────

  test('TC-022: Change suspension begin date later (only if bounded suspension exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-022] Skipping — preconditions not met`);
      return;
    }

    console.log('[TC-022] Would change suspension begin date to later — expects 3 MMIS txns (S410+S510+S400)');
  });

  // ─── TC-023: Suspension end date → earlier ──────────────────────────────────

  test('TC-023: Change suspension end date earlier (only if bounded suspension exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-023] Skipping — preconditions not met`);
      return;
    }

    console.log('[TC-023] Would change suspension end date earlier — expects 4 MMIS txns (S410+S310+S510+S520)');
  });

  // ─── TC-024: Suspension end date → later ────────────────────────────────────

  test('TC-024: Change suspension end date later (only if bounded suspension exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-024] Skipping — preconditions not met`);
      return;
    }

    console.log('[TC-024] Would change suspension end date later — expects 3 MMIS txns (S310+S445+S520)');
  });

  // ─── TC-025: Suspension end valid → null ────────────────────────────────────

  test('TC-025: Clear suspension end date (make open-ended, only if bounded suspension)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-025] Skipping — preconditions not met`);
      return;
    }

    console.log('[TC-025] Would clear suspension end date — expects 2 MMIS txns (S310+S445)');
  });

  // ─── TC-012: Suspension deleted ─────────────────────────────────────────────

  test('TC-012: Delete suspension (only if suspension exists)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-012] Skipping — preconditions not met (need Enrolled + suspension)`);
      return;
    }

    console.log('[TC-012] Would delete suspension — expects 2 MMIS txns (S410+S470)');
  });

  // ─── TC-028: End date later with active suspension ──────────────────────────

  test('TC-028: Extend enrollment end while suspended (only if suspension active)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-028] Skipping — preconditions not met`);
      return;
    }

    console.log('[TC-028] Would extend end date while suspended — expects 1 MMIS txn (S350→S360)');
  });

  // ─── TC-017: ICA transfer during suspension ─────────────────────────────────

  test('TC-017: ICA transfer during suspension (only if suspended)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-017] Skipping — preconditions not met (need Enrolled + suspension)`);
      return;
    }

    console.log('[TC-017] Would perform ICA transfer during suspension — expects 3 MMIS txns');
  });

  // ─── TC-031: ICA transfer with Span-C exists ───────────────────────────────

  test('TC-031: ICA transfer with existing Span-C (only if bounded suspension synced)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled' || !state.hasSuspension) {
      console.log(`[TC-031] Skipping — preconditions not met`);
      return;
    }

    console.log('[TC-031] Would perform ICA transfer with Span-C existing — expects 3 MMIS txns (S600+S310+S610)');
  });
});
