/**
 * ATC: TC-042 — SDPC Suspension Begin Date Earlier
 * Similar to TC-021 but for SDPC program.
 * Prerequisite: SDPC must have bounded suspension (TC-018 completed).
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

const DATA = SCENARIOS.TC_042;
const NEW_SUSPENSION_BEGIN = DATA.bcInput.newSuspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-042: SDPC Suspension Begin Date Earlier', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-042] Participant UUID: ${participantUuid}`);
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
    logPrefix: '[TC-042]',
    newSuspensionStartDate: NEW_SUSPENSION_BEGIN,
  });

  test('ATC-ES-157 - Edit SDPC suspension begin date to earlier', async () => {
    await editProgramSuspension(page, getStepConfig());
  });

  test('ATC-ES-158 - Verify MMIS sync (4 transactions: S400+S410+S300+S510)', async () => {
    await verifyEditSuspensionMmisSync(page, getStepConfig());
  });
});
