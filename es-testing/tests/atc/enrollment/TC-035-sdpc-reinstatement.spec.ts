/**
 * ATC: TC-035 — SDPC Disenrolled → Enrolled (Reinstatement)
 * Similar to TC-009 but for SDPC program.
 * Prerequisite: SDPC must be Disenrolled.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  reinstateEnrollment,
  verifyReinstatementMmisSync,
  ReinstatementStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_035;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-035: SDPC Disenrolled → Enrolled (Reinstatement)', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-035] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  const getStepConfig = (): ReinstatementStepConfig => ({
    program: 'SDPC',
    startDate: ENROLLMENT_START,
    endDate: '12/31/2299',
    statusReason: 'Not Applicable',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-035]',
  });

  test('ATC-ES-138 - Precondition: SDPC is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
    const rowText = await sdpcRow.textContent() || '';
    expect(rowText).toContain('Disenrolled');
    console.log('[TC-035] ✓ Precondition met — SDPC is Disenrolled');
  });

  test('ATC-ES-139 - Create SDPC Enrolled enrollment (reinstatement)', async () => {
    await reinstateEnrollment(page, getStepConfig());
  });

  test('ATC-ES-140 - Verify MMIS sync (S300 reinstatement)', async () => {
    await verifyReinstatementMmisSync(page, getStepConfig());
  });
});
