/**
 * ATC: TC-046 — SDPC Suspension End: Valid → Null
 * Similar to TC-025 but for SDPC program.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { editProgramSuspension, verifyEditSuspensionMmisSync, EditSuspensionStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_046;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';
let browser: Browser; let page: Page; let participantUuid: string;

test.describe.serial('TC-046: SDPC Suspension End: Valid → Null', () => {
  test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); page = await browser.newContext().then(c => c.newPage()); await loginAndSelectContext(page); participantUuid = await resolveParticipantUuid(page); console.log(`[TC-046] Participant UUID: ${participantUuid}`); });
  test.setTimeout(300_000);
  test.afterAll(async () => { if (MOCK_MMIS) await closeDb(); await browser.close(); });

  const getStepConfig = (): EditSuspensionStepConfig => ({ program: 'SDPC', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-046]', newSuspensionEndDate: null });

  test('ATC-ES-165 - Edit SDPC suspension end date to null (open-ended)', async () => { await editProgramSuspension(page, getStepConfig()); });
  test('ATC-ES-166 - Verify MMIS sync (2 transactions: S310+S445)', async () => { await verifyEditSuspensionMmisSync(page, getStepConfig()); });
});
