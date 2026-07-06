/**
 * ATC: TC-043 — SDPC Suspension Begin Date Later
 * Similar to TC-022 but for SDPC program.
 * Prerequisite: SDPC must have bounded suspension.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  editProgramSuspension,
  verifyEditSuspensionMmisSync,
  EditSuspensionStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_043;
const NEW_SUSPENSION_BEGIN = DATA.bcInput.newSuspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-043: SDPC Suspension Begin Date Later', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-043] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  const getStepConfig = (): EditSuspensionStepConfig => ({
    program: 'SDPC',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-043]',
    newSuspensionStartDate: NEW_SUSPENSION_BEGIN,
  });

  test('ATC-ES-159 - Edit SDPC suspension begin date to later', async () => {
    await editProgramSuspension(page, getStepConfig());
  });

  test('ATC-ES-160 - Verify MMIS sync (3 transactions: S410+S510+S400)', async () => {
    await verifyEditSuspensionMmisSync(page, getStepConfig());
  });
});
