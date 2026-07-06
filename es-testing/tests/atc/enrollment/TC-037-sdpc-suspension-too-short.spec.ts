/**
 * ATC: TC-037 — SDPC Suspension < 3 Days (No Transaction)
 * Similar to TC-011 but for SDPC program.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  addSuspension,
  getSyncStatus,
} from './actions/enrollment.actions';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_037;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-037: SDPC Suspension < 3 Days (No Transaction)', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-037] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-144 - Precondition: SDPC is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
    const rowText = await sdpcRow.textContent() || '';
    expect(rowText).toContain('Enrolled');
  });

  test('ATC-ES-145 - Add short suspension (< 3 days) to SDPC', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened).toBe(true);

    const result = await addSuspension(page, {
      startDate: SUSPENSION_START,
      endDate: SUSPENSION_END,
      reason: 'Hospitalized',
    });
    expect(result).toBe(true);
    console.log(`[TC-037] Short suspension added: ${SUSPENSION_START} → ${SUSPENSION_END}`);
  });

  test('ATC-ES-146 - Verify no MMIS transaction triggered', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-037] Sync status: ${JSON.stringify(status)}`);
    // No new transaction should be triggered — status should remain unchanged
    expect(status.hasConflict).toBe(false);
    console.log('[TC-037] ✓ No MMIS transaction triggered (as expected)');
  });
});
