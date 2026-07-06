/**
 * ATC: TC-045 — SDPC Suspension End Date Later
 * Similar to TC-024 but for SDPC program.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { editProgramSuspension, verifyEditSuspensionMmisSync, EditSuspensionStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_045;
const NEW_SUSPENSION_END = DATA.bcInput.newSuspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';
let browser: Browser; let page: Page; let participantUuid: string;

test.describe.serial('TC-045: SDPC Suspension End Date Later', () => {
  test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); page = await browser.newContext().then(c => c.newPage()); await loginAndSelectContext(page); participantUuid = await resolveParticipantUuid(page); console.log(`[TC-045] Participant UUID: ${participantUuid}`); });
  test.setTimeout(300_000);
  test.afterAll(async () => { if (MOCK_MMIS) await closeDb(); await browser.close(); });

  const getStepConfig = (): EditSuspensionStepConfig => ({ program: 'SDPC', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-045]', newSuspensionEndDate: NEW_SUSPENSION_END });

  test('ATC-ES-163 - Edit SDPC suspension end date to later', async () => { await editProgramSuspension(page, getStepConfig()); });
  test('ATC-ES-164 - Verify MMIS sync (3 transactions: S310+S445+S520)', async () => { await verifyEditSuspensionMmisSync(page, getStepConfig()); });
});
