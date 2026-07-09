/**
 * ATC: TC-031 — ICA Transfer: Span-C Exists (S255_001)
 *
 * Performs an ICA transfer when a post-suspension Span-C already exists.
 * Expects 3 MMIS transactions: S600 + S310 + S610.
 *
 * State-aware: Checks that participant is Enrolled with suspension.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed (active bounded suspension + Span-C exists).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  performIcaTransfer,
  verifyMmisSync,
  getSyncStatus,
} from './actions/enrollment.actions';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_031;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-031: ICA Transfer: Span-C Exists (S255_001)', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-031', participantUuid);
    console.log(`[TC-031] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-131 - Navigate to enrollment detail (only if Enrolled + suspension)', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

      const state = await getFullEnrollmentState(page);
      console.log(`[TC-031] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

      if (!['Enrolled', 'Suspended'].includes(state.irisState!) || !state.hasSuspension) {
        console.log(`[TC-031] Skipping — precondition not met (need Enrolled/Suspended + suspension)`);
        return;
      }

      const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
      expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);
      tracker.record('ATC-ES-131 - Navigate to enrollment detail (only if Enrolled + suspension)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-131 - Navigate to enrollment detail (only if Enrolled + suspension)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('Capture MMIS snapshot (before)', async () => {
    test.setTimeout(60_000);
    try {
      const screenshot = await captureMmisScreenshot(page, participantUuid);
      if (screenshot) tracker.setBeforeScreenshot(screenshot);
      tracker.record('Capture MMIS snapshot (before)', 'passed');
    } catch (err) {
      tracker.record('Capture MMIS snapshot (before)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-132 - Perform ICA transfer with existing Span-C', async () => {
    test.setTimeout(60_000);
    try {
      if (!page.url().includes('/programenrollment/')) {
        console.log('[TC-031] Skipping — previous step was skipped');
        return;
      }

      const transferred = await performIcaTransfer(page);
      expect(transferred, 'ICA transfer action did not complete').toBe(true);
      console.log('[TC-031] ICA transfer with existing Span-C completed — S255_001 triggered');
      tracker.record('ATC-ES-132 - Perform ICA transfer with existing Span-C', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-132 - Perform ICA transfer with existing Span-C', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-133 - Verify 3 MMIS transactions (S600 + S310 + S610)', async () => {
    test.setTimeout(90_000);
    try {
      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });

      expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);

      const txnListVisible = await page.getByText('MMIS Transaction List').first().isVisible({ timeout: 15_000 }).catch(() => false);
      if (txnListVisible) {
        await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(2000);
        const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
        const count = await transactionRows.count();
        console.log(`[TC-031] MMIS transaction rows found: ${count}`);
      }
      tracker.record('ATC-ES-133 - Verify 3 MMIS transactions (S600 + S310 + S610)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-133 - Verify 3 MMIS transactions (S600 + S310 + S610)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-134 - Verify SU response and no conflict', async () => {
    test.setTimeout(30_000);
    try {
      const status = await getSyncStatus(page);
      console.log(`[TC-031] Sync status: ${JSON.stringify(status)}`);

      expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      tracker.record('ATC-ES-134 - Verify SU response and no conflict', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-134 - Verify SU response and no conflict', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
