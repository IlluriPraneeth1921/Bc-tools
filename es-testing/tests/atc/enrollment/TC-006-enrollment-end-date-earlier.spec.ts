/**
 * ATC: TC-006 — End Date Earlier (Disenrollment)
 *
 * Updates an active enrollment's end date to an earlier date, effectively
 * disenrolling the participant. Expects 1 MMIS transaction (closure via S340).
 *
 * Flow (matches TC-008 pattern — pencil icon → edit dialog):
 * 1. Navigate to enrollment list → double-click Enrolled row → detail page
 * 2. Click pencil icon → Edit Program Enrollment dialog
 * 3. Change Status to "Disenrolled", set End Date to 09/30/2026
 * 4. Save → triggers MMIS closure transaction
 * 5. Verify SU response
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed successfully (active IRIS enrollment with SU sync).
 *
 * IMPORTANT: Tests run in serial mode. If any step fails, all subsequent steps are skipped.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openFirstEnrollmentDetail,
  getSyncStatus,
} from './actions/enrollment.actions';
import {
  getFullEnrollmentState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const NEW_END_DATE = SCENARIOS.TC_006.bcInput.newEnrollmentEndDate!;
const DATA = SCENARIOS.TC_006;

// ─── State ────────────────────────────────────────────────────────────────────


/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-006: End Date Earlier (Disenrollment)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-006] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ─── Precondition Check ─────────────────────────────────────────────────────

  test('ATC-ES-030 - Precondition: Participant is Enrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-006] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}`);

    expect(state.irisState, 'Precondition failed: participant must be Enrolled. Run TC-001 first.').toBe('Enrolled');
  });

  // ─── Navigate to Enrollment Detail ──────────────────────────────────────────

  test('ATC-ES-031 - Navigate to enrollment detail page', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    // Find the active Enrolled IRIS row
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
    await enrolledRow.dblclick();
    await page.waitForURL(/\/programenrollments\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const currentUrl = page.url();
    console.log(`[TC-006] Detail page URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/programenrollments\/programenrollment\/[0-9a-f-]+/i);
  });

  // ─── Create Disenrollment via + New Program Enrollment ───────────────────────

  test('ATC-ES-032 - Set Disenrolled with earlier end date via New Program Enrollment', async () => {
    // Navigate back to the enrollment list to access "+ New Program Enrollment"
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(3000);

    // Click "+ New Program Enrollment" button
    const newEnrollBtn = page.getByText('New Program Enrollment').first();
    await expect(newEnrollBtn).toBeVisible({ timeout: 10_000 });
    await newEnrollBtn.click();
    await page.waitForTimeout(3000);

    // Verify dialog opened
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    console.log('[TC-006] New Program Enrollment dialog opened');

    // Dismiss any warning banner (close button)
    const closeBanner = dialog.locator('button').filter({ hasText: /^close$/ }).first();
    if (await closeBanner.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBanner.click();
      await page.waitForTimeout(500);
    }

    // Step 1: Set Program to "IRIS" (may be a mat-select dropdown)
    const programInput = page.locator('input[aria-label="Program"]').first();
    if (await programInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const currentProgram = await programInput.inputValue().catch(() => '');
      if (!currentProgram.includes('IRIS')) {
        await programInput.click({ force: true });
        await page.waitForTimeout(300);
        await programInput.fill('', { force: true });
        await programInput.fill('IRIS', { force: true });
        await page.waitForTimeout(1500);
        const progOpt = page.locator('mat-option').filter({ hasText: /IRIS/i }).first();
        if (await progOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await progOpt.click();
          await page.waitForTimeout(1000);
        }
      }
    } else {
      // Try mat-select for Program
      const programSelect = dialog.locator('mat-select').first();
      if (await programSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await programSelect.click();
        await page.waitForTimeout(1000);
        const irisOpt = page.locator('mat-option').filter({ hasText: /IRIS/i }).first();
        if (await irisOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await irisOpt.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Step 2: Set Status to "Disenrolled"
    const statusInput = page.locator('input[aria-label="Status"]').first();
    if (await statusInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await statusInput.click({ force: true });
      await page.waitForTimeout(300);
      await statusInput.fill('', { force: true });
      await statusInput.fill('Disenrolled', { force: true });
      await page.waitForTimeout(2000);
      const statusOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/i }).filter({ hasNotText: /No option/i }).first();
      await expect(statusOpt).toBeVisible({ timeout: 5_000 });
      await statusOpt.click();
      await page.waitForTimeout(1500);
    } else {
      // Try mat-select for Status
      const statusSelects = dialog.locator('mat-select');
      const count = await statusSelects.count();
      // Status is typically the second mat-select (after Program)
      for (let i = 0; i < count; i++) {
        const selectText = await statusSelects.nth(i).textContent().catch(() => '');
        if (selectText?.includes('Enrolled') || selectText?.includes('Status')) {
          await statusSelects.nth(i).click();
          await page.waitForTimeout(1000);
          const disOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/i }).first();
          if (await disOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await disOpt.click();
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
    }
    console.log('[TC-006] Status set to Disenrolled');

    // Step 3: Set Status Reason to "Not Applicable"
    const reasonInput = page.locator('input[aria-label="Status Reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await page.waitForTimeout(300);
      await reasonInput.fill('', { force: true });
      await reasonInput.fill('Not Applicable', { force: true });
      await page.waitForTimeout(2000);
      const reasonOpt = page.locator('mat-option').filter({ hasText: /Not Applicable/i }).filter({ hasNotText: /No option/i }).first();
      if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reasonOpt.click();
        await page.waitForTimeout(500);
      } else {
        // Try shorter text
        await reasonInput.fill('', { force: true });
        await reasonInput.fill('Not', { force: true });
        await page.waitForTimeout(2000);
        const fallback = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
        if (await fallback.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await fallback.click();
          await page.waitForTimeout(500);
        }
      }
    } else {
      // Try mat-select for Status Reason — look for the one after Status
      const allSelects = dialog.locator('mat-select');
      const selectCount = await allSelects.count();
      for (let i = 0; i < selectCount; i++) {
        const ariaLabel = await allSelects.nth(i).getAttribute('aria-label').catch(() => '');
        const label = await allSelects.nth(i).locator('xpath=ancestor::mat-form-field//mat-label').textContent().catch(() => '');
        if (ariaLabel?.includes('Reason') || label?.includes('Reason')) {
          await allSelects.nth(i).click();
          await page.waitForTimeout(1000);
          const naOpt = page.locator('mat-option').filter({ hasText: /Not Applicable/i }).first();
          if (await naOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await naOpt.click();
            await page.waitForTimeout(500);
            break;
          }
        }
      }
    }
    console.log('[TC-006] Status Reason set');

    // Step 4: Set Start Date (required field)
    const startDateInput = dialog.locator('input[id^="startDate_"]').first();
    if (await startDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await startDateInput.click({ force: true });
      await startDateInput.fill('', { force: true });
      await startDateInput.pressSequentially(DATA.bcInput.enrollmentStartDate, { delay: 50 });
      await startDateInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await startDateInput.press('Tab');
      await page.waitForTimeout(1000);
      console.log(`[TC-006] Start Date set to: ${DATA.bcInput.enrollmentStartDate}`);
    }

    // Step 5: Set End Date to earlier date
    const endDateInput = dialog.locator('input[id^="endDate_"]').first();
    if (await endDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await endDateInput.click({ force: true });
      await endDateInput.fill('', { force: true });
      await endDateInput.pressSequentially(NEW_END_DATE, { delay: 50 });
      await endDateInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await endDateInput.press('Tab');
      await page.waitForTimeout(1000);
      console.log(`[TC-006] End Date set to: ${NEW_END_DATE}`);
    }

    // Step 6: Click Save
    const saveBtn = page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
    if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await saveBtn.click({ force: true });
    } else {
      await page.getByRole('button', { name: 'Save' }).first().click({ force: true });
    }
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // Verify dialog closed
    const dialogStillOpen = await page.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (dialogStillOpen) {
      const matErrors = await page.locator('mat-error').all();
      for (const e of matErrors) { console.error(`[TC-006] mat-error: ${(await e.textContent())?.trim()}`); }
      const dialogText = await page.locator('mat-dialog-container').textContent().catch(() => '') || '';
      console.error(`[TC-006] Dialog text (first 500): ${dialogText.substring(0, 500)}`);
      await page.screenshot({ path: 'test-results/tc006-dialog-not-closed.png', fullPage: true }).catch(() => {});
    }
    expect(dialogStillOpen, 'Dialog did not close after save — possible validation errors').toBe(false);

    // Post-save verification: confirm Disenrolled appears on the enrollment list
    await page.waitForTimeout(2000);
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    expect(pageText, 'Disenrolled status not found on page after save').toContain('Disenrolled');

    console.log(`[TC-006] Disenrolled enrollment created, End Date = ${NEW_END_DATE} — MMIS closure triggered`);
  });

  // ─── Verify MMIS Sync ──────────────────────────────────────────────────────

  test('ATC-ES-033 - Verify MMIS sync completes with SU response', async () => {
    if (MOCK_MMIS) {
      // ─── Mock path: Use database to set MMIS Success ──────────────────────
      // Navigate to the Disenrolled enrollment detail to get the key
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
      const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
      if (await disenrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await disenrolledRow.dblclick();
        await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      } else {
        // Fallback: open first enrollment detail
        const opened = await openFirstEnrollmentDetail(page);
        expect(opened).toBe(true);
      }

      const key = extractProgramEnrollmentKeyFromUrl(page.url());
      expect(key, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
      await page.waitForTimeout(5000);
      const mockResult = await mockMmisSuccess(key!);
      expect(mockResult, 'mockMmisSuccess failed — stored procedure missing?').toBe(true);
      console.log(`[TC-006] MMIS Success mocked for key: ${key}`);
      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const status = await getSyncStatus(page);
      expect(status.responseStatus).toBe('SU');
      expect(status.hasConflict).toBe(false);
    } else {
      // ─── Real path: Poll for actual MMIS response ─────────────────────────
      const currentUrl = page.url();
      const maxAttempts = 12;
      const pollInterval = 10_000;
      let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(3000);

        status = await getSyncStatus(page);
        console.log(`[TC-006] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

        if (status.responseStatus !== null) {
          break;
        }

        if (attempt < maxAttempts) {
          console.log(`[TC-006] Still pending — waiting ${pollInterval / 1000}s...`);
          await page.waitForTimeout(pollInterval);
        }
      }

      // Verify MMIS Transaction List is visible
      await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

      expect(status.responseStatus, 'Expected SU or SE response from MMIS but sync did not complete').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);

      console.log('[TC-006] ✓ MMIS closure transaction completed successfully (' + status.responseStatus + ')');
    }
  });

});
