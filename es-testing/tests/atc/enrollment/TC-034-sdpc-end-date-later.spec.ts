/**
 * ATC: TC-034 — SDPC End Date Later (Extension)
 * Similar to TC-007 but for SDPC program.
 * Prerequisite: TC-026 must have completed (SDPC is Disenrolled).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import {
  createEnrolledWithLaterEndDate,
  verifyEndDateLaterMmisSync,
  EndDateLaterStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_034;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const NEW_END_DATE = DATA.bcInput.newEnrollmentEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-034: SDPC End Date Later (Extension)', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-034] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  const getStepConfig = (): EndDateLaterStepConfig => ({
    program: 'SDPC',
    startDate: ENROLLMENT_START,
    newEndDate: NEW_END_DATE,
    statusReason: 'Not Applicable',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-034]',
  });

  test('ATC-ES-135 - Precondition: SDPC is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
    const rowText = await sdpcRow.textContent() || '';
    expect(rowText).toContain('Disenrolled');
    console.log('[TC-034] ✓ Precondition met — SDPC is Disenrolled');
  });

  test('ATC-ES-136 - Create SDPC Enrolled with later end date (extension)', async () => {
    await createEnrolledWithLaterEndDate(page, getStepConfig());
  });

  test('ATC-ES-137 - Verify MMIS sync (S350 extension)', async () => {
    await verifyEndDateLaterMmisSync(page, getStepConfig());
  });
});
