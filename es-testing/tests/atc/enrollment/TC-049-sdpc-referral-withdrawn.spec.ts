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
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  editEnrollment,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-049: SDPC Referral Withdrawn', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-049', participantUuid);
    console.log(`[TC-049] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  test('ATC-ES-172 - Precondition: SDPC enrollment exists', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      console.log(`[TC-049] SDPC row: ${rowText.trim().substring(0, 100)}`);
      // Must be in a state that can be withdrawn (Enrolled, Referred, or Draft)
      const canWithdraw = rowText.includes('Enrolled') || rowText.includes('Referred') || rowText.includes('Draft');
      expect(canWithdraw, `SDPC must be Enrolled/Referred/Draft to withdraw. Got: ${rowText.substring(0, 60)}`).toBe(true);
      tracker.record('ATC-ES-172 - Precondition: SDPC enrollment exists', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-172 - Precondition: SDPC enrollment exists', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('Capture MMIS snapshot (before)', async () => {
    test.setTimeout(60_000);
    try {
      const screenshot = await captureMmisScreenshot(page, participantUuid);
      if (screenshot) tracker.setBeforeScreenshot(screenshot);
      tracker.record('Capture MMIS snapshot (before)', 'passed');
    } catch (err) {
      tracker.record('Capture MMIS snapshot (before)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-173 - Open SDPC enrollment and change status to Referral Withdrawn', async () => {
    test.setTimeout(60_000);
    try {
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
      tracker.record('ATC-ES-173 - Open SDPC enrollment and change status to Referral Withdrawn', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-173 - Open SDPC enrollment and change status to Referral Withdrawn', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-174 - Verify MMIS sync SU response', async () => {
    test.setTimeout(90_000);
    try {
      const status = await verifyMmisSync(page, {
        participantUuid,
        mockMmis: MOCK_MMIS,
        mockFn: mockMmisSuccess,
        extractKeyFn: extractProgramEnrollmentKeyFromUrl,
      });

      expect(status.responseStatus, 'Expected SU response from MMIS').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
      console.log(`[TC-049] ✓ SDPC MMIS delete sync verified (${status.responseStatus})`);
      tracker.record('ATC-ES-174 - Verify MMIS sync SU response', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-174 - Verify MMIS sync SU response', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-175 - Verify SDPC enrollment is withdrawn', async () => {
    test.setTimeout(30_000);
    try {
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
      tracker.record('ATC-ES-175 - Verify SDPC enrollment is withdrawn', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-175 - Verify SDPC enrollment is withdrawn', 'failed', (err as Error).message);
      throw err;
    }
  });

});
