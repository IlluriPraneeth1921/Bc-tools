/**
 * ATC: TC-045 — SDPC Suspension End Date Later
 * Similar to TC-024 but for SDPC program.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { editProgramSuspension, verifyEditSuspensionMmisSync, EditSuspensionStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_045;
const NEW_SUSPENSION_END = DATA.bcInput.newSuspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-045: SDPC Suspension End Date Later', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-045', participantUuid);
    console.log(`[TC-045] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): EditSuspensionStepConfig => ({ program: 'SDPC', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-045]', newSuspensionEndDate: NEW_SUSPENSION_END });

  test('ATC-ES-163 - Edit SDPC suspension end date to later', async () => {
    test.setTimeout(60_000);
    try {
      await editProgramSuspension(page, getStepConfig());
      tracker.record('ATC-ES-163 - Edit SDPC suspension end date to later', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-163 - Edit SDPC suspension end date to later', 'failed', (err as Error).message);
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

  test('ATC-ES-164 - Verify MMIS sync (3 transactions: S310+S445+S520)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyEditSuspensionMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-164 - Verify MMIS sync (3 transactions: S310+S445+S520)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-164 - Verify MMIS sync (3 transactions: S310+S445+S520)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
