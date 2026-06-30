/**
 * ATC: TC-007 — End Date Later (Extension)
 *
 * Updates a disenrolled enrollment's end date to a later date (extending it).
 * Expects 1 MMIS transaction (Open/update span end date via S350).
 *
 * Flow (matches TC-008 pattern — pencil icon → edit dialog):
 * 1. Navigate to enrollment list → double-click Disenrolled row → detail page
 * 2. Click pencil icon → Edit Program Enrollment dialog
 * 3. Change Status back to "Enrolled", set End Date to 12/31/2299 (open-ended)
 * 4. Save → triggers MMIS extension transaction
 * 5. Verify SU response
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-006 must have completed (participant in Disenrolled state with end date 09/30/2026).
 *
 * IMPORTANT: Tests run in serial mode. If any step fails, all subsequent steps are skipped.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  getSyncStatus,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Configuration ────────────────────────────────────────────────────────────

// Extend end date back to open-ended (12/31/2299)
const EXTENDED_END_DATE = SCENARIOS.TC_007.bcInput.newEnrollmentEndDate!;

// ─── State ────────────────────────────────────────────────────────────────────

let browser: Browser;
let page: Page;
let participantUuid: string;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-007: End Date Later (Extension)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-007] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

  // ─── Precondition Check ─────────────────────────────────────────────────────

  test('ATC-ES-034 - Precondition: Participant is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const irisState = await getCurrentIrisState(page);
    console.log(`[TC-007] State: IRIS=${irisState}`);

    expect(irisState, 'Precondition failed: participant must be Disenrolled. Run TC-006 first.').toBe('Disenrolled');
  });

  // ─── Navigate to Enrollment Detail ──────────────────────────────────────────

  test('ATC-ES-035 - Navigate to enrollment detail page', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    // Find the Disenrolled IRIS row (or first IRIS row which should be Disenrolled after TC-006)
    const disenrolledRow = page.locator('mat-row').filter({ hasText: /IRIS/ }).first();
    await expect(disenrolledRow).toBeVisible({ timeout: 15_000 });
    await disenrolledRow.dblclick();
    await page.waitForURL(/\/programenrollments\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const currentUrl = page.url();
    console.log(`[TC-007] Detail page URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/programenrollments\/programenrollment\/[0-9a-f-]+/i);
  });

  // ─── Open Edit Dialog and Extend End Date ───────────────────────────────────

  test('ATC-ES-036 - Open edit dialog and extend end date to 12/31/2299', async () => {
    // Wait for Overview section to render
    await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Click pencil icon — retry up to 3 times
    const pencil = page.locator('button.mat-icon-button:has(mat-icon:text("edit"))').first();
    await expect(pencil).toBeVisible({ timeout: 10_000 });

    let dialogOpened = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[TC-007] Clicking pencil icon (attempt ${attempt})...`);
      await pencil.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await pencil.click();
      await page.waitForTimeout(3000);

      const dialog = page.locator('mat-dialog-container');
      dialogOpened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
      if (dialogOpened) {
        console.log('[TC-007] Edit dialog opened');
        break;
      }
      console.log(`[TC-007] Dialog not open after attempt ${attempt} — retrying...`);
      await page.waitForTimeout(1000);
    }

    expect(dialogOpened, 'Edit Program Enrollment dialog did not open after clicking pencil icon').toBe(true);

    // Change Status back to "Enrolled"
    const statusInput = page.locator('input[aria-label="Status"]').first();
    await expect(statusInput).toBeVisible({ timeout: 10_000 });
    await statusInput.click({ force: true });
    await page.waitForTimeout(300);
    await statusInput.fill('', { force: true });
    await statusInput.fill('Enrolled', { force: true });
    await page.waitForTimeout(1500);

    const statusOpt = page.locator('mat-option').filter({ hasText: /^Enrolled$/i }).first();
    if (await statusOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await statusOpt.click();
      await page.waitForTimeout(1500);
    } else {
      // Try broader match
      const statusOptAlt = page.locator('mat-option').filter({ hasText: /Enrolled/i }).filter({ hasNotText: /Disenrolled/i }).first();
      await expect(statusOptAlt).toBeVisible({ timeout: 5_000 });
      await statusOptAlt.click();
      await page.waitForTimeout(1500);
    }

    // Select Status Reason (pick first available — "Not Applicable" preferred)
    const reasonInput = page.locator('input[aria-label="Status Reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await page.waitForTimeout(300);
      await reasonInput.fill('', { force: true });
      await reasonInput.fill('Not Applicable', { force: true });
      await page.waitForTimeout(1500);
      const reasonOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
      if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reasonOpt.click();
        await page.waitForTimeout(500);
      } else {
        // Fallback: clear and pick first
        await reasonInput.fill('', { force: true });
        await page.waitForTimeout(1000);
        const fallbackOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
        if (await fallbackOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await fallbackOpt.click();
          await page.waitForTimeout(500);
        }
      }
    }

    // Set End Date to later date (12/31/2299 = open-ended)
    const endDateInput = page.locator('input[id^="endDate_"]').first();
    await expect(endDateInput).toBeVisible({ timeout: 5_000 });
    await endDateInput.click({ force: true });
    await endDateInput.fill('', { force: true });
    await endDateInput.pressSequentially(EXTENDED_END_DATE, { delay: 50 });
    await endDateInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await endDateInput.press('Tab');
    await page.waitForTimeout(500);

    // Click Save
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
      const errors = await page.locator('mat-error').all();
      for (const e of errors) { console.error(`[TC-007] Error: ${(await e.textContent())?.trim()}`); }
    }
    expect(dialogStillOpen, 'Dialog did not close after save — possible validation errors').toBe(false);

    console.log(`[TC-007] Status changed to Enrolled, End Date = ${EXTENDED_END_DATE} — MMIS extension triggered`);
  });

  // ─── Verify MMIS Sync ──────────────────────────────────────────────────────

  test('ATC-ES-037 - Verify MMIS sync completes with SU response', async () => {
    // Poll for sync completion
    // Use page.goto() instead of reload to force Angular to re-fetch sync state
    const currentUrl = page.url();
    const maxAttempts = 12;
    const pollInterval = 10_000;
    let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(3000);

      status = await getSyncStatus(page);
      console.log(`[TC-007] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

      if (status.responseStatus !== null) {
        break;
      }

      if (attempt < maxAttempts) {
        console.log(`[TC-007] Still pending — waiting ${pollInterval / 1000}s...`);
        await page.waitForTimeout(pollInterval);
      }
    }

    // Verify MMIS Transaction List is visible
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

    expect(status.responseStatus, 'Expected SU or SE response from MMIS but sync did not complete').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    console.log('[TC-007] ✓ MMIS extension transaction completed successfully (' + status.responseStatus + ')');
  });

});
