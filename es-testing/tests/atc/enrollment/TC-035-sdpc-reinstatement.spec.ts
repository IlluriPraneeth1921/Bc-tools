/**
 * ATC: TC-035 — SDPC Disenrolled → Enrolled (Reinstatement)
 * Similar to TC-009 but for SDPC program.
 * Prerequisite: SDPC must be Disenrolled.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  reinstateEnrollment,
  verifyReinstatementMmisSync,
  ReinstatementStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_035;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-035: SDPC Disenrolled → Enrolled (Reinstatement)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-035', participantUuid);
    console.log(`[TC-035] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): ReinstatementStepConfig => ({
    program: 'SDPC',
    startDate: ENROLLMENT_START,
    endDate: '12/31/2299',
    statusReason: 'Not Applicable',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-035]',
  });

  test('ATC-ES-138 - Precondition: SDPC is Disenrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      expect(rowText).toContain('Disenrolled');
      console.log('[TC-035] ✓ Precondition met — SDPC is Disenrolled');
      tracker.record('ATC-ES-138 - Precondition: SDPC is Disenrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-138 - Precondition: SDPC is Disenrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-139 - Create SDPC Enrolled enrollment (reinstatement)', async () => {
    test.setTimeout(60_000);
    try {
      await reinstateEnrollment(page, getStepConfig());
      tracker.record('ATC-ES-139 - Create SDPC Enrolled enrollment (reinstatement)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-139 - Create SDPC Enrolled enrollment (reinstatement)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-140 - Verify MMIS sync (S300 reinstatement)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyReinstatementMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-140 - Verify MMIS sync (S300 reinstatement)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-140 - Verify MMIS sync (S300 reinstatement)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
