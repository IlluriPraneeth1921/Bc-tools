/**
 * ATC: TC-048 — SDPC Disenrolled Span — Real Reason Code (S345)
 * Similar to TC-033 but for SDPC program.
 * Prerequisite: SDPC must be Disenrolled (TC-026 completed).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid } from './actions/enrollment.actions';
import { createDisenrolledWithEarlierEndDate, verifyDisenrollmentMmisSync, DisenrollmentStepConfig } from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_048;
const DISENROLLMENT_REASON = DATA.bcInput.statusReason || 'Deceased';
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';
let browser: Browser; let page: Page; let participantUuid: string;

test.describe.serial('TC-048: SDPC Disenrolled Span — Real Reason Code (S345)', () => {
  test.beforeAll(async () => { browser = await chromium.launch({ headless: true }); page = await browser.newContext().then(c => c.newPage()); await loginAndSelectContext(page); participantUuid = await resolveParticipantUuid(page); console.log(`[TC-048] Participant UUID: ${participantUuid}`); });
  test.setTimeout(300_000);
  test.afterAll(async () => { if (MOCK_MMIS) await closeDb(); await browser.close(); });

  const getStepConfig = (): DisenrollmentStepConfig => ({ program: 'SDPC', startDate: ENROLLMENT_END_DATE, newEndDate: ENROLLMENT_END_DATE, statusReason: DISENROLLMENT_REASON, participantUuid, mockMmis: MOCK_MMIS, logPrefix: '[TC-048]' });

  test('ATC-ES-169 - Precondition: SDPC end-dated enrollment exists', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
    const rowText = await sdpcRow.textContent() || '';
    const hasValidState = rowText.includes('Enrolled') || rowText.includes('Disenrolled');
    expect(hasValidState).toBe(true);
    console.log('[TC-048] ✓ Precondition met — SDPC enrollment exists');
  });

  test('ATC-ES-170 - Create SDPC Disenrolled span with reason (Deceased)', async () => { await createDisenrolledWithEarlierEndDate(page, getStepConfig()); });
  test('ATC-ES-171 - Verify MMIS sync (S345 re-send with real reason code)', async () => { await verifyDisenrollmentMmisSync(page, getStepConfig()); });
});
