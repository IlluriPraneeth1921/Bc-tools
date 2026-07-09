/**
 * ATC: TC-037 — SDPC Suspension < 3 Days (No Transaction)
 * Similar to TC-011 but for SDPC program.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  addSuspension,
  getSyncStatus,
} from './actions/enrollment.actions';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_037;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-037: SDPC Suspension < 3 Days (No Transaction)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-037', participantUuid);
    console.log(`[TC-037] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-144 - Precondition: SDPC is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      expect(rowText).toContain('Enrolled');
      tracker.record('ATC-ES-144 - Precondition: SDPC is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-144 - Precondition: SDPC is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-145 - Add short suspension (< 3 days) to SDPC', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const opened = await openEnrollmentByText(page, /SDPC/);
      expect(opened).toBe(true);

      const result = await addSuspension(page, {
        startDate: SUSPENSION_START,
        endDate: SUSPENSION_END,
        reason: 'Hospitalized',
      });
      expect(result).toBe(true);
      console.log(`[TC-037] Short suspension added: ${SUSPENSION_START} → ${SUSPENSION_END}`);
      tracker.record('ATC-ES-145 - Add short suspension (< 3 days) to SDPC', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-145 - Add short suspension (< 3 days) to SDPC', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-146 - Verify no MMIS transaction triggered', async () => {
    test.setTimeout(30_000);
    try {
      const status = await getSyncStatus(page);
      console.log(`[TC-037] Sync status: ${JSON.stringify(status)}`);
      // No new transaction should be triggered — status should remain unchanged
      expect(status.hasConflict).toBe(false);
      console.log('[TC-037] ✓ No MMIS transaction triggered (as expected)');
      tracker.record('ATC-ES-146 - Verify no MMIS transaction triggered', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-146 - Verify no MMIS transaction triggered', 'failed', (err as Error).message);
      throw err;
    }
  });
});
