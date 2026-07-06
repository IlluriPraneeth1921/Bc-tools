/**
 * ATC: TC-036 — SDPC Open-Ended Suspension (No End Date)
 * Similar to TC-010 but for SDPC program.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  openEnrolledProgramDetail,
  addOpenEndedSuspension,
  verifySuspensionMmisSync,
  SuspensionStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_036;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-036: SDPC Open-Ended Suspension (No End Date)', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-036] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  const getStepConfig = (): SuspensionStepConfig => ({
    program: 'SDPC',
    suspensionStartDate: SUSPENSION_START,
    reason: 'Hospitalized',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-036]',
  });

  test('ATC-ES-141 - Precondition: SDPC is Enrolled — open detail', async () => {
    await openEnrolledProgramDetail(page, getStepConfig());
  });

  test('ATC-ES-142 - Add open-ended suspension (no end date)', async () => {
    await addOpenEndedSuspension(page, getStepConfig());
  });

  test('ATC-ES-143 - Verify MMIS sync (2 transactions: S500+S510)', async () => {
    await verifySuspensionMmisSync(page, getStepConfig());
  });
});
