/**
 * ATC: TC-012 — Suspension Deleted
 *
 * Deletes an existing suspension record from an active enrollment.
 * Expects 2 MMIS transactions: S410 (delete suspension) + S470 (restore Span-A).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-002 must have completed successfully (active suspension exists).
 */
import { test, expect, Page } from '@playwright/test';
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
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_012;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-012: Suspension Deleted', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-012', participantUuid);
    console.log(`[TC-012] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-053 - Precondition: Enrolled with active suspension', async () => {
    test.setTimeout(60_000);
    try {
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
      tracker.record('ATC-ES-053 - Precondition: Enrolled with active suspension', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-053 - Precondition: Enrolled with active suspension', 'failed', (err as Error).message);
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

  test('ATC-ES-054 - Delete existing suspension record', async () => {
    test.setTimeout(60_000);
    try {
      // The MMIS snapshot capture step navigates away from enrollment detail.
      // Navigate back to the enrollment detail page if we're not on it.
      if (!page.url().includes('/programenrollment/')) {
        console.log('[TC-012] Not on enrollment detail — navigating back');
        await navigateToEnrollments(page, participantUuid);
        await page.waitForTimeout(2000);
        const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
        if (!opened) {
          console.log('[TC-012] Could not re-open enrollment detail');
          test.skip();
          return;
        }
      }

      const deleted = await deleteSuspension(page);
      expect(deleted, 'Suspension deletion failed').toBe(true);
      console.log('[TC-012] Suspension successfully deleted');
      tracker.record('ATC-ES-054 - Delete existing suspension record', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-054 - Delete existing suspension record', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-055 - Verify MMIS sync (2 transactions: S410 + S470)', async () => {
    test.setTimeout(180_000);
    try {
      // Ensure we're on the enrollment detail page (where MMIS Transaction List is visible)
      if (!page.url().includes('/programenrollment/')) {
        await navigateToEnrollments(page, participantUuid);
        await page.waitForTimeout(2000);
        const opened = await openEnrollmentByText(page, /Enrolled|Suspended/, /Disenrolled/);
        if (!opened) throw new Error('[TC-012] Could not navigate to enrollment detail for sync verification');
      }

      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
        maxAttempts: 15,
        pollIntervalMs: 10_000,
      });

      expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      console.log(`[TC-012] ✓ Suspension delete sync completed (${status.responseStatus})`);
      tracker.record('ATC-ES-055 - Verify MMIS sync (2 transactions: S410 + S470)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-055 - Verify MMIS sync (2 transactions: S410 + S470)', 'failed', (err as Error).message);
      throw err;
    }
  });

});
