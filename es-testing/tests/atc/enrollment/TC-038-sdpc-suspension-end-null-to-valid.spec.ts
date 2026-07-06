/**
 * ATC: TC-038 — SDPC Suspension End: Null → Valid
 * Similar to TC-013 but for SDPC program.
 * Prerequisite: TC-036 must have completed (SDPC has open-ended suspension).
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

const DATA = SCENARIOS.TC_038;
const NEW_SUSPENSION_END = DATA.bcInput.newSuspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-038: SDPC Suspension End: Null → Valid', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-038] Participant UUID: ${participantUuid}`);
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
    logPrefix: '[TC-038]',
    newSuspensionEndDate: NEW_SUSPENSION_END,
  });

  test('ATC-ES-147 - Edit SDPC suspension: set end date (null → valid)', async () => {
    await editProgramSuspension(page, getStepConfig());
  });

  test('ATC-ES-148 - Verify MMIS sync (2 transactions: S440+S520)', async () => {
    await verifyEditSuspensionMmisSync(page, getStepConfig());
  });
});
