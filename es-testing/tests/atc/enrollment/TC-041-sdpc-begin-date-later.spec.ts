/**
 * ATC: TC-041 — SDPC Begin Date Changed to Later
 * Similar to TC-020 but for SDPC program.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  verifyEnrolledPrecondition,
  editEnrolledProgramEnrollment,
  verifyEditEnrollmentMmisSync,
  EditEnrollmentStepConfig,
  DisenrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_041;
const NEW_BEGIN_DATE = DATA.bcInput.newEnrollmentStartDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-041: SDPC Begin Date Later', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-041] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  const getStepConfig = (): EditEnrollmentStepConfig => ({
    program: 'SDPC',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-041]',
    newStartDate: NEW_BEGIN_DATE,
  });

  test('ATC-ES-154 - Precondition: SDPC is Enrolled', async () => {
    const precondConfig: DisenrollmentStepConfig = { program: 'SDPC', startDate: '', newEndDate: '', participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-041]' };
    await verifyEnrolledPrecondition(page, precondConfig);
  });

  test('ATC-ES-155 - Change SDPC begin date to later', async () => {
    await editEnrolledProgramEnrollment(page, getStepConfig());
  });

  test('ATC-ES-156 - Verify MMIS sync (2 transactions: S310+S300)', async () => {
    await verifyEditEnrollmentMmisSync(page, getStepConfig());
  });
});
