/**
 * ATC: TC-043 — SDPC Suspension Begin Date Later
 * Similar to TC-022 but for SDPC program.
 * Prerequisite: SDPC must have bounded suspension.
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  editProgramSuspension,
  verifyEditSuspensionMmisSync,
  EditSuspensionStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const DATA = SCENARIOS.TC_043;
const NEW_SUSPENSION_BEGIN = DATA.bcInput.newSuspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-043: SDPC Suspension Begin Date Later', () => {
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-043', participantUuid);
    console.log(`[TC-043] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  const getStepConfig = (): EditSuspensionStepConfig => ({
    program: 'SDPC',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-043]',
    newSuspensionStartDate: NEW_SUSPENSION_BEGIN,
  });

  test('ATC-ES-159 - Edit SDPC suspension begin date to later', async () => {
    test.setTimeout(60_000);
    try {
      await editProgramSuspension(page, getStepConfig());
      tracker.record('ATC-ES-159 - Edit SDPC suspension begin date to later', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-159 - Edit SDPC suspension begin date to later', 'failed', (err as Error).message);
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

  test('ATC-ES-160 - Verify MMIS sync (3 transactions: S410+S510+S400)', async () => {
    test.setTimeout(90_000);
    try {
      await verifyEditSuspensionMmisSync(page, getStepConfig());
      tracker.record('ATC-ES-160 - Verify MMIS sync (3 transactions: S410+S510+S400)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-160 - Verify MMIS sync (3 transactions: S410+S510+S400)', 'failed', (err as Error).message);
      throw err;
    }
  });
});
