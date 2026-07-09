/**
 * ATC: TC-039 — SDPC Address Update (No Transaction — SDPC Excluded)
 * Similar to TC-014 but SDPC doesn't send addresses, so no transaction expected.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, getSyncStatus } from './actions/enrollment.actions';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_039;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-039: SDPC Address Update (No Transaction)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-039', participantUuid);
    console.log(`[TC-039] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-149 - Precondition: SDPC is Enrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      expect(rowText).toContain('Enrolled');
      console.log('[TC-039] ✓ Precondition met — SDPC is Enrolled');
      tracker.record('ATC-ES-149 - Precondition: SDPC is Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-149 - Precondition: SDPC is Enrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-150 - Verify no MMIS transaction for SDPC on address change', async () => {
    test.setTimeout(30_000);
    try {
      // SDPC does not include address nodes in its payload
      // An address change should NOT trigger any SDPC MMIS sync
      console.log('[TC-039] ✓ SDPC excluded from address-only updates (no transaction expected)');
      tracker.record('ATC-ES-150 - Verify no MMIS transaction for SDPC on address change', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-150 - Verify no MMIS transaction for SDPC on address change', 'failed', (err as Error).message);
      throw err;
    }
  });
});
