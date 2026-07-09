/**
 * ATC: TC-048 — SDPC Disenrolled Span — Real Reason Code (S345)
 * Similar to TC-033 but for SDPC program.
 * Prerequisite: SDPC must be Disenrolled (TC-026 completed).
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { createDisenrolledWithEarlierEndDate, verifyDisenrollmentMmisSync, DisenrollmentStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_048;
const DISENROLLMENT_REASON = DATA.bcInput.statusReason || 'Deceased';
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-048: SDPC Disenrolled Span — Real Reason Code (S345)', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-048', participantUuid);
    console.log(`[TC-048] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): DisenrollmentStepConfig => ({ program: 'SDPC', startDate: ENROLLMENT_END_DATE, newEndDate: ENROLLMENT_END_DATE, statusReason: DISENROLLMENT_REASON, participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-048]' });

  test('ATC-ES-169 - Precondition: SDPC end-dated enrollment exists', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      const hasValidState = rowText.includes('Enrolled') || rowText.includes('Disenrolled');
      expect(hasValidState).toBe(true);
      console.log('[TC-048] ✓ Precondition met — SDPC enrollment exists');
      tracker.record('ATC-ES-169 - Precondition: SDPC end-dated enrollment exists', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-169 - Precondition: SDPC end-dated enrollment exists', 'failed', (err as Error).message);
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

  test('ATC-ES-170 - Create SDPC Disenrolled span with reason (Deceased)', async () => {
    test.setTimeout(60_000);
    try {
      await createDisenrolledWithEarlierEndDate(page, getStepConfig());
      tracker.record('ATC-ES-170 - Create SDPC Disenrolled span with reason (Deceased)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-170 - Create SDPC Disenrolled span with reason (Deceased)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-171 - Verify MMIS sync (S345 re-send with real reason code)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyDisenrollmentMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-171 - Verify MMIS sync (S345 re-send with real reason code)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-171 - Verify MMIS sync (S345 re-send with real reason code)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
