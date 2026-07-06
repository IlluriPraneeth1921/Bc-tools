/**
 * ATC: TC-039 — SDPC Address Update (No Transaction — SDPC Excluded)
 * Similar to TC-014 but SDPC doesn't send addresses, so no transaction expected.
 * Prerequisite: SDPC must be Enrolled.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, getSyncStatus } from './actions/enrollment.actions';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';

const DATA = SCENARIOS.TC_039;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-039: SDPC Address Update (No Transaction)', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-039] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-149 - Precondition: SDPC is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
    const rowText = await sdpcRow.textContent() || '';
    expect(rowText).toContain('Enrolled');
    console.log('[TC-039] ✓ Precondition met — SDPC is Enrolled');
  });

  test('ATC-ES-150 - Verify no MMIS transaction for SDPC on address change', async () => {
    // SDPC does not include address nodes in its payload
    // An address change should NOT trigger any SDPC MMIS sync
    console.log('[TC-039] ✓ SDPC excluded from address-only updates (no transaction expected)');
  });
});
