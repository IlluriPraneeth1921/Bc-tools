/**
 * ATC: TC-034 — SDPC End Date Later (Extension)
 * Similar to TC-007 but for SDPC program.
 * Prerequisite: TC-026 must have completed (SDPC is Disenrolled).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  createEnrolledWithLaterEndDate,
  verifyEndDateLaterMmisSync,
  EndDateLaterStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_034;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const NEW_END_DATE = DATA.bcInput.newEnrollmentEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-034: SDPC End Date Later (Extension)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-034', participantUuid);
    console.log(`[TC-034] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): EndDateLaterStepConfig => ({
    program: 'SDPC',
    startDate: ENROLLMENT_START,
    newEndDate: NEW_END_DATE,
    statusReason: 'Not Applicable',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-034]',
  });

  test('ATC-ES-135 - Precondition: SDPC is Disenrolled', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      expect(rowText).toContain('Disenrolled');
      console.log('[TC-034] ✓ Precondition met — SDPC is Disenrolled');
      tracker.record('ATC-ES-135 - Precondition: SDPC is Disenrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-135 - Precondition: SDPC is Disenrolled', 'failed', (err as Error).message);
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

  test('ATC-ES-136 - Create SDPC Enrolled with later end date (extension)', async () => {
    test.setTimeout(60_000);
    try {
      await createEnrolledWithLaterEndDate(page, getStepConfig());
      tracker.record('ATC-ES-136 - Create SDPC Enrolled with later end date (extension)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-136 - Create SDPC Enrolled with later end date (extension)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-137 - Verify MMIS sync (S350 extension)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyEndDateLaterMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-137 - Verify MMIS sync (S350 extension)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-137 - Verify MMIS sync (S350 extension)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
