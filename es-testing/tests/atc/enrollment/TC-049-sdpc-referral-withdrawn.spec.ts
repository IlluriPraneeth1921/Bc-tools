/**
 * ATC: TC-049 — SDPC Referral Withdrawn (Reset to Pristine)
 *
 * Changes SDPC enrollment status to "Referral Withdrawn", deleting the
 * existing MMIS SDPC span. This resets the SDPC enrollment to pristine state.
 * Expects 1 MMIS transaction (Delete span via S310).
 *
 * Similar to TC-008 (IRIS Referral Withdrawn) but for SDPC program.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Prerequisite: SDPC enrollment must exist (Enrolled/Referred/Draft state).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  editEnrollment,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-049: SDPC Referral Withdrawn', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-049] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-172 - Precondition: SDPC enrollment exists', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
    const rowText = await sdpcRow.textContent() || '';
    console.log(`[TC-049] SDPC row: ${rowText.trim().substring(0, 100)}`);
    // Must be in a state that can be withdrawn (Enrolled, Referred, or Draft)
    const canWithdraw = rowText.includes('Enrolled') || rowText.includes('Referred') || rowText.includes('Draft');
    expect(canWithdraw, `SDPC must be Enrolled/Referred/Draft to withdraw. Got: ${rowText.substring(0, 60)}`).toBe(true);
  });

  test('ATC-ES-173 - Open SDPC enrollment and change status to Referral Withdrawn', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /SDPC/);
    expect(opened, 'Could not open SDPC enrollment detail').toBe(true);

    const edited = await editEnrollment(page, {
      status: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
    console.log('[TC-049] SDPC status changed to Referral Withdrawn — MMIS delete triggered');
  });

  test('ATC-ES-174 - Verify MMIS sync SU response', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU response from MMIS').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
    console.log(`[TC-049] ✓ SDPC MMIS delete sync verified (${status.responseStatus})`);
  });

  test('ATC-ES-175 - Verify SDPC enrollment is withdrawn', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    // Verify SDPC row no longer shows active enrollment
    const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
    const sdpcVisible = await sdpcRow.isVisible({ timeout: 5_000 }).catch(() => false);
    if (sdpcVisible) {
      const rowText = await sdpcRow.textContent() || '';
      // Should show Referral Withdrawn or not be present
      expect(
        rowText.includes('Referral Withdrawn') || rowText.includes('Withdrawn'),
        `SDPC should be Withdrawn but got: ${rowText.substring(0, 60)}`
      ).toBe(true);
    }
    console.log('[TC-049] ✓ SDPC enrollment successfully withdrawn — pristine state restored');
  });

});
