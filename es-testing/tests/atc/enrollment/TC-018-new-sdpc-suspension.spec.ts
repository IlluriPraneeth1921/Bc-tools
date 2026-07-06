/**
 * ATC: TC-018 — New SDPC Suspension (Bounded)
 *
 * Adds a bounded suspension to an active SDPC enrollment.
 * Expects 3 MMIS transactions: Close Span-A (S500), Add Span-B (S510), Create Span-C (S520).
 *
 * Similar to TC-002 (IRIS suspension) but targets the SDPC program enrollment.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: TC-015 must have completed successfully (active SDPC enrollment with SU sync).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import {
  resolveParticipantUuid,
} from './actions/enrollment.actions';
import {
  openEnrolledProgramDetail,
  addBoundedSuspension,
  verifySuspensionMmisSync,
  verifySuspensionFinalStatus,
  SuspensionStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_018;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-018: New SDPC Suspension (Bounded)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-018] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // Shared config for suspension steps
  const getStepConfig = (): SuspensionStepConfig => ({
    program: 'SDPC',
    suspensionStartDate: SUSPENSION_START,
    suspensionEndDate: SUSPENSION_END,
    reason: 'Hospitalized',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-018]',
  });

  test('ATC-ES-077 - Precondition: SDPC is Enrolled — open enrollment detail', async () => {
    await openEnrolledProgramDetail(page, getStepConfig());
  });

  test('ATC-ES-078 - Add bounded suspension to SDPC enrollment', async () => {
    await addBoundedSuspension(page, getStepConfig());
  });

  test('ATC-ES-079 - Verify MMIS sync (3 transactions: S500+S510+S520)', async () => {
    await verifySuspensionMmisSync(page, getStepConfig());
  });

  test('ATC-ES-080 - Verify SU response and no conflict', async () => {
    await verifySuspensionFinalStatus(page, getStepConfig());
  });

}); // end describe.serial
