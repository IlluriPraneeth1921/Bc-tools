/**
 * ATC: TC-044 — SDPC Suspension End Date Earlier
 * Similar to TC-023 but for SDPC program.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { editProgramSuspension, verifyEditSuspensionMmisSync, EditSuspensionStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_044;
const NEW_SUSPENSION_END = DATA.bcInput.newSuspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';
let browser: Browser; let page: Page; let participantUuid: string;

test.describe.serial('TC-044: SDPC Suspension End Date Earlier', () => {
  test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); page = await browser.newContext().then(c => c.newPage()); await loginAndSelectContext(page); participantUuid = await resolveParticipantUuid(page); console.log(`[TC-044] Participant UUID: ${participantUuid}`); });
  test.setTimeout(300_000);
  test.afterAll(async () => { if (MOCK_MMIS) await closeDb(); await browser.close(); });

  const getStepConfig = (): EditSuspensionStepConfig => ({ program: 'SDPC', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-044]', newSuspensionEndDate: NEW_SUSPENSION_END });

  test('ATC-ES-161 - Edit SDPC suspension end date to earlier', async () => { await editProgramSuspension(page, getStepConfig()); });
  test('ATC-ES-162 - Verify MMIS sync (4 transactions: S440+S310+S510+S520)', async () => { await verifyEditSuspensionMmisSync(page, getStepConfig()); });
});
