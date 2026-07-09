/**
 * ATC: TC-047 — SDPC End Date Later with Suspension
 * Similar to TC-028 but for SDPC program.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { editProgramSuspension, verifyEditSuspensionMmisSync, EditSuspensionStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_047;
const NEW_SUSPENSION_END = DATA.bcInput.newSuspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-047: SDPC End Date Later with Suspension', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-047', participantUuid);
    console.log(`[TC-047] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): EditSuspensionStepConfig => ({ program: 'SDPC', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-047]', newSuspensionEndDate: NEW_SUSPENSION_END });

  test('ATC-ES-167 - Edit SDPC suspension to trigger post-suspension span', async () => {
    test.setTimeout(60_000);
    try {
      await editProgramSuspension(page, getStepConfig());
      tracker.record('ATC-ES-167 - Edit SDPC suspension to trigger post-suspension span', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-167 - Edit SDPC suspension to trigger post-suspension span', 'failed', (err as Error).message);
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

  test('ATC-ES-168 - Verify MMIS sync (1 transaction: S360)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyEditSuspensionMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-168 - Verify MMIS sync (1 transaction: S360)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-168 - Verify MMIS sync (1 transaction: S360)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
