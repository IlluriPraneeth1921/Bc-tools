/**
 * ATC: TC-027 — SDPC Suspension Deleted
 *
 * Deletes an existing suspension record from an active SDPC enrollment.
 * Expects 2 MMIS transactions: S410 (delete suspension) + S470 (restore span).
 *
 * Similar to TC-012 (IRIS suspension deleted) but targets the SDPC program.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: TC-018 must have completed successfully (SDPC suspension exists).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import {
  resolveParticipantUuid,
} from './actions/enrollment.actions';
import {
  openEnrollmentWithSuspension,
  deleteExistingSuspension,
  verifySuspensionDeleteMmisSync,
  SuspensionDeleteStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_027;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-027: SDPC Suspension Deleted', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-027] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // Shared config for suspension delete steps
  const getStepConfig = (): SuspensionDeleteStepConfig => ({
    program: 'SDPC',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-027]',
  });

  test('ATC-ES-113 - Precondition: SDPC is Enrolled with suspension', async () => {
    await openEnrollmentWithSuspension(page, getStepConfig());
  });

  test('ATC-ES-114 - Delete SDPC suspension record', async () => {
    await deleteExistingSuspension(page, getStepConfig());
  });

  test('ATC-ES-115 - Verify MMIS sync (2 transactions: S410 + S470)', async () => {
    await verifySuspensionDeleteMmisSync(page, getStepConfig());
  });

}); // end describe.serial
