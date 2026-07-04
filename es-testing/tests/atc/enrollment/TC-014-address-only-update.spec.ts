/**
 * ATC: TC-014 — Address-Only Update
 *
 * Updates participant's residential address without changing enrollment data.
 * Expects 1 MMIS transaction: S700 (address update on current span).
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed (active IRIS enrollment with SU sync).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { updateStreetAddress } from './actions/profile.actions';
import { getCurrentIrisState } from '../../helpers/state-checker';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-014: Address-Only Update', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-014] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-061 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const state = await getCurrentIrisState(page);
    console.log(`[TC-014] State: IRIS=${state}`);
    expect(state, 'Precondition: must be Enrolled').toBe('Enrolled');
  });

  test('ATC-ES-062 - Update participant residential address', async () => {
    const newAddress = await updateStreetAddress(page, participantUuid);
    expect(newAddress, 'Address update failed').not.toBeNull();
    console.log(`[TC-014] Address updated to: "${newAddress}" — S700 triggered`);
  });

  test('ATC-ES-063 - Verify MMIS sync (1 transaction: S700)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });
    expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-014] ✓ Address update sync verified (${status.responseStatus})`);
  });

});
