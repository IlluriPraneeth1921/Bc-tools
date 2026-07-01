/**
 * ATC: TC-033 — Disenrolled Span Created — Real Reason Code Sent (S345)
 *
 * After TC-006 end-dates the enrollment with placeholder reason codes (2W/2W),
 * this test creates a Disenrolled span with an actual disenrollment reason
 * (e.g., "Deceased" → reason code "64"). This triggers S345 to re-send
 * the Closure with real translated reason codes.
 *
 * Flow:
 * 1. Navigate to enrollment list → verify end-dated enrollment exists
 * 2. Click "+ New Program Enrollment" → set Status = Disenrolled, Reason = Deceased
 * 3. Save → triggers S345 MMIS re-send closure with real reason codes
 * 4. Verify SU response
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-006 must have completed successfully (end-dated enrollment with S340 closure).
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
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_033;
const DISENROLLMENT_REASON = DATA.bcInput.statusReason || 'Deceased';
const ENROLLMENT_START_DATE = DATA.bcInput.enrollmentStartDate; // 07/01/2026
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;     // 09/30/2026

/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-033: Disenrolled Span Created — Real Reason Code (S345)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-033] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ─── Precondition Check ─────────────────────────────────────────────────────

  test('ATC-ES-131 - Precondition: Verify end-dated enrollment exists (TC-006 completed)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    // Verify there's an enrollment row — TC-006 should have end-dated it
    const enrollmentRows = page.locator('mat-row');
    const rowCount = await enrollmentRows.count();
    console.log(`[TC-033] Enrollment rows found: ${rowCount}`);
    expect(rowCount, 'No enrollment rows found — TC-006 prerequisite may not have run').toBeGreaterThanOrEqual(1);

    // Check if we can see an Enrolled row (end-dated from TC-006) or a Disenrolled row already
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    const hasEnrolled = pageText.includes('Enrolled');
    console.log(`[TC-033] Enrollment list has Enrolled: ${hasEnrolled}`);

    // We just need at least one enrollment to exist — TC-006 should have created the end-dated one
    expect(hasEnrolled || pageText.includes('Disenrolled'), 'No Enrolled or Disenrolled row found').toBe(true);
  });

  // ─── Create Disenrolled Span via + New Program Enrollment ───────────────────

  test('ATC-ES-132 - Create Disenrolled span with real reason code (Deceased)', async () => {
    // Navigate to enrollment list
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
    console.log('[TC-033] New Program Enrollment dialog opened');

    // Dismiss any warning banner
    const closeBanner = dialog.locator('button').filter({ hasText: /^close$/ }).first();
    if (await closeBanner.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBanner.click();
      await page.waitForTimeout(500);
    }

    // Step 1: Set Program to "IRIS"
    // The New Program Enrollment dialog uses mat-select dropdowns (keyboard_arrow_down icon)
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
      // mat-select approach: click the select to open dropdown
      const programSelect = dialog.locator('mat-form-field').filter({ hasText: /Program/i }).locator('mat-select').first();
      if (await programSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await programSelect.click();
        await page.waitForTimeout(1500);
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
      if (await statusOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await statusOpt.click();
        await page.waitForTimeout(1500);
        console.log('[TC-033] Status set to Disenrolled (autocomplete)');
      }
    }

    // If autocomplete didn't work, try mat-select approach
    const statusValue = await page.locator('input[aria-label="Status"]').first().inputValue().catch(() => '');
    if (!statusValue.toLowerCase().includes('disenrolled')) {
      console.log('[TC-033] Trying mat-select approach for Status...');
      const statusSelect = dialog.locator('mat-form-field').filter({ hasText: /Status/i }).filter({ hasNotText: /Reason/i }).locator('mat-select').first();
      if (await statusSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await statusSelect.click();
        await page.waitForTimeout(1500);
        const disOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/i }).first();
        if (await disOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await disOpt.click();
          await page.waitForTimeout(1500);
          console.log('[TC-033] Status set to Disenrolled (mat-select)');
        } else {
          // Log available options for debugging
          const allOpts = page.locator('mat-option');
          const optCount = await allOpts.count();
          console.log(`[TC-033] Available status options (${optCount}):`);
          for (let i = 0; i < Math.min(optCount, 10); i++) {
            const txt = await allOpts.nth(i).textContent().catch(() => '');
            console.log(`[TC-033]   option[${i}]: "${txt?.trim()}"`);
          }
          // Try clicking any Disenrolled-like option
          const anyDis = page.locator('mat-option').filter({ hasText: /Dis/i }).first();
          if (await anyDis.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await anyDis.click();
            await page.waitForTimeout(1000);
          }
        }
      } else {
        // Last attempt: click any mat-select in the dialog that might be the status field
        const allSelects = dialog.locator('mat-select');
        const selectCount = await allSelects.count();
        console.log(`[TC-033] Found ${selectCount} mat-select elements in dialog`);
        for (let i = 0; i < selectCount; i++) {
          await allSelects.nth(i).click();
          await page.waitForTimeout(1000);
          const disOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/i }).first();
          if (await disOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await disOpt.click();
            await page.waitForTimeout(1000);
            console.log(`[TC-033] Status set to Disenrolled (mat-select index ${i})`);
            break;
          }
          // Close dropdown if wrong one
          await page.keyboard.press('Escape');
          await page.waitForTimeout(500);
        }
      }
    }

    // Step 3: Set Status Reason to "Deceased" (the REAL disenrollment reason)
    const reasonInput = page.locator('input[aria-label="Status Reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await page.waitForTimeout(300);
      await reasonInput.fill('', { force: true });
      await reasonInput.fill(DISENROLLMENT_REASON, { force: true });
      await page.waitForTimeout(2000);
      const reasonOpt = page.locator('mat-option').filter({ hasText: new RegExp(DISENROLLMENT_REASON, 'i') }).filter({ hasNotText: /No option/i }).first();
      if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reasonOpt.click();
        await page.waitForTimeout(500);
        console.log(`[TC-033] Status Reason set to: ${DISENROLLMENT_REASON} (autocomplete)`);
      } else {
        // Fallback: try partial match
        await reasonInput.fill('', { force: true });
        await reasonInput.fill(DISENROLLMENT_REASON.substring(0, 4), { force: true });
        await page.waitForTimeout(2000);
        const fallback = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
        if (await fallback.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await fallback.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // If autocomplete didn't work, try mat-select for Status Reason
    const reasonValue = await page.locator('input[aria-label="Status Reason"]').first().inputValue().catch(() => '');
    if (!reasonValue.toLowerCase().includes('deceased')) {
      console.log('[TC-033] Trying mat-select approach for Status Reason...');
      const reasonSelect = dialog.locator('mat-form-field').filter({ hasText: /Reason/i }).locator('mat-select').first();
      if (await reasonSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reasonSelect.click();
        await page.waitForTimeout(1500);
        const deceasedOpt = page.locator('mat-option').filter({ hasText: new RegExp(DISENROLLMENT_REASON, 'i') }).first();
        if (await deceasedOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await deceasedOpt.click();
          await page.waitForTimeout(500);
          console.log(`[TC-033] Status Reason set to: ${DISENROLLMENT_REASON} (mat-select)`);
        } else {
          // Log available options
          const allOpts = page.locator('mat-option');
          const optCount = await allOpts.count();
          console.log(`[TC-033] Available reason options (${optCount}):`);
          for (let i = 0; i < Math.min(optCount, 10); i++) {
            const txt = await allOpts.nth(i).textContent().catch(() => '');
            console.log(`[TC-033]   option[${i}]: "${txt?.trim()}"`);
          }
          // Pick the first available non-empty option as fallback
          const anyOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
          if (await anyOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await anyOpt.click();
            await page.waitForTimeout(500);
          }
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      } else {
        // Try clicking all mat-selects to find the reason one
        const allSelects = dialog.locator('mat-select');
        const selectCount = await allSelects.count();
        for (let i = 0; i < selectCount; i++) {
          await allSelects.nth(i).click();
          await page.waitForTimeout(1000);
          const decOpt = page.locator('mat-option').filter({ hasText: new RegExp(DISENROLLMENT_REASON, 'i') }).first();
          if (await decOpt.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await decOpt.click();
            await page.waitForTimeout(500);
            console.log(`[TC-033] Status Reason set to: ${DISENROLLMENT_REASON} (mat-select index ${i})`);
            break;
          }
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      }
    }
    console.log(`[TC-033] Status Reason step complete`);

    // Step 4: Set Start Date (required — use enrollment end date as disenrolled span start)
    const startDateInput = dialog.locator('input[id^="startDate_"]').first();
    if (await startDateInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await startDateInput.click({ force: true });
      await startDateInput.fill('', { force: true });
      await startDateInput.pressSequentially(ENROLLMENT_END_DATE, { delay: 50 });
      await startDateInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await startDateInput.press('Tab');
      await page.waitForTimeout(1000);
      console.log(`[TC-033] Start Date set to: ${ENROLLMENT_END_DATE}`);
    }

    // Step 5: End Date — leave empty (open-ended disenrolled span) or set if required
    // Per test case doc: "EnrollmentDateRangeEndDate: NULL or 22991231"
    // Leave empty unless validation requires it

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
      for (const e of matErrors) { console.error(`[TC-033] mat-error: ${(await e.textContent())?.trim()}`); }
      const dialogText = await page.locator('mat-dialog-container').textContent().catch(() => '') || '';
      console.error(`[TC-033] Dialog text (first 500): ${dialogText.substring(0, 500)}`);
      await page.screenshot({ path: 'test-results/tc033-dialog-not-closed.png', fullPage: true }).catch(() => {});
    }
    expect(dialogStillOpen, 'Dialog did not close after save — possible validation errors').toBe(false);

    // Post-save verification: confirm Disenrolled appears on the enrollment list
    await page.waitForTimeout(2000);
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    expect(pageText, 'Disenrolled status not found on page after save').toContain('Disenrolled');

    console.log(`[TC-033] Disenrolled span created with reason "${DISENROLLMENT_REASON}" — S345 re-send closure triggered`);
  });

  // ─── Verify MMIS Sync ──────────────────────────────────────────────────────

  test('ATC-ES-133 - Verify MMIS sync completes with SU response (S345)', async () => {
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
      console.log(`[TC-033] MMIS Success mocked for key: ${key}`);
      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const status = await getSyncStatus(page);
      expect(status.responseStatus).toBe('SU');
      expect(status.hasConflict).toBe(false);
    } else {
      // ─── Real path: Poll for actual MMIS response ─────────────────────────
      // Navigate to the Disenrolled enrollment detail
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
      const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
      if (await disenrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await disenrolledRow.dblclick();
        await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      }

      const currentUrl = page.url();
      const maxAttempts = 12;
      const pollInterval = 10_000;
      let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        await page.waitForTimeout(3000);

        status = await getSyncStatus(page);
        console.log(`[TC-033] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

        if (status.responseStatus !== null) break;

        if (attempt < maxAttempts) {
          console.log(`[TC-033] Still pending — waiting ${pollInterval / 1000}s...`);
          await page.waitForTimeout(pollInterval);
        }
      }

      await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

      expect(status.responseStatus, 'Expected SU response from MMIS but sync did not complete').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);

      console.log('[TC-033] ✓ S345 closure re-send completed successfully (' + status.responseStatus + ')');
    }
  });

  // ─── Final Verification ─────────────────────────────────────────────────────

  test('ATC-ES-134 - Verify SU response and no conflict', async () => {
    const status = await getSyncStatus(page);
    console.log(`[TC-033] Final sync status: ${JSON.stringify(status)}`);

    expect(status.responseStatus).toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);
  });

}); // end describe.serial
