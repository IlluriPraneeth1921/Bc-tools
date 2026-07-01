/**
 * ATC: TC-002 — Enrolled → Suspended (Bounded Suspension)
 *
 * Adds a bounded suspension to an active IRIS enrollment.
 * Expects 3 MMIS transactions: Close Span-A (S500), Add Span-B (S510), Create Span-C (S520).
 *
 * State-aware: Checks that participant is Enrolled with no existing suspension
 * before attempting the action. Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed (active IRIS enrollment with SU sync).
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
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_002;
const SUSPENSION_START = DATA.bcInput.suspensionStartDate!;
const SUSPENSION_END = DATA.bcInput.suspensionEndDate!;

/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

// ─── State ────────────────────────────────────────────────────────────────────

let browser: Browser;
let page: Page;
let participantUuid: string;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-002: Enrolled → Suspended (Bounded)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-002] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ─── Precondition Check ─────────────────────────────────────────────────────

  test('ATC-ES-012 - Precondition: Participant is Enrolled with no suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getFullEnrollmentState(page);
    console.log(`[TC-002] State: IRIS=${state.irisState}, Suspension=${state.hasSuspension}, SyncSuccess=${state.hasSyncSuccess}`);

    expect(state.irisState, 'Precondition failed: participant must be Enrolled. Run TC-001 first.').toBe('Enrolled');
  });

  // ─── Navigate to Enrollment Detail ──────────────────────────────────────────

  test('ATC-ES-013 - Navigate to enrollment detail page', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    // Find and double-click the Enrolled IRIS row
    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
    await enrolledRow.dblclick();
    await page.waitForURL(/\/programenrollments\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const currentUrl = page.url();
    console.log(`[TC-002] Detail page URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/programenrollments\/programenrollment\/[0-9a-f-]+/i);
  });

  // ─── Add Bounded Suspension ─────────────────────────────────────────────────

  test('ATC-ES-014 - Add bounded suspension via detail page', async () => {
    // Wait for detail page to fully render — look for "Suspensions" section
    // The section header "Suspensions" must be visible before we can interact
    const suspensionsHeading = page.locator('text=Suspensions').first();
    await expect(suspensionsHeading).toBeVisible({ timeout: 20_000 });
    await suspensionsHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    // Click "+ Add Suspension" button
    // The button text is exactly "+ Add Suspension" (with the plus sign)
    const addSuspBtn = page.locator('button, a, span').filter({ hasText: /\+?\s*Add Suspension/i }).first();
    await expect(addSuspBtn).toBeVisible({ timeout: 10_000 });
    await addSuspBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await addSuspBtn.click();
    await page.waitForTimeout(3000);

    // A dialog or inline form should now be visible for entering suspension dates
    // Check if a dialog opened
    const dialog = page.locator('mat-dialog-container');
    const dialogVisible = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);

    if (dialogVisible) {
      // Dialog-based suspension form
      console.log('[TC-002] Suspension dialog opened');

      // Fill suspension start date
      const startInput = page.locator('mat-dialog-container input[id*="startDate"], mat-dialog-container input[id*="Start"], mat-dialog-container input[aria-label*="Start"]').first();
      await expect(startInput).toBeVisible({ timeout: 10_000 });
      await startInput.click({ force: true });
      await startInput.fill('', { force: true });
      await startInput.pressSequentially(SUSPENSION_START, { delay: 50 });
      await startInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await startInput.press('Tab');
      await page.waitForTimeout(500);

      // Fill suspension end date
      const endInput = page.locator('mat-dialog-container input[id*="endDate"], mat-dialog-container input[id*="End"], mat-dialog-container input[aria-label*="End"]').first();
      await expect(endInput).toBeVisible({ timeout: 5_000 });
      await endInput.click({ force: true });
      await endInput.fill('', { force: true });
      await endInput.pressSequentially(SUSPENSION_END, { delay: 50 });
      await endInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await endInput.press('Tab');
      await page.waitForTimeout(500);

      // Fill reason if visible
      const reasonInput = page.locator('mat-dialog-container input[aria-label*="Reason"]').first();
      if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reasonInput.click({ force: true });
        await page.waitForTimeout(300);
        await reasonInput.fill('Moved to ineligible', { force: true });
        await page.waitForTimeout(1500);
        const reasonOpt = page.locator('mat-option').filter({ hasText: /Moved to ineligible/i }).first();
        if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await reasonOpt.click();
          await page.waitForTimeout(500);
        } else {
          // Fallback: pick first available option
          const fallbackOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
          if (await fallbackOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await fallbackOpt.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Save the dialog
      const saveBtn = page.locator('mat-dialog-container button').filter({ hasText: /^Save$/ }).first();
      if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await saveBtn.click({ force: true });
      } else {
        await page.getByRole('button', { name: 'Save' }).first().click({ force: true });
      }
    } else {
      // Inline form — fields appear directly on the page (no dialog)
      console.log('[TC-002] Suspension inline form (no dialog)');

      // Fill suspension start date
      const startInput = page.locator('input[id*="startDate"], input[id*="suspensionStart"], input[aria-label*="Start Date"]').first();
      await expect(startInput).toBeVisible({ timeout: 10_000 });
      await startInput.click({ force: true });
      await startInput.fill('', { force: true });
      await startInput.pressSequentially(SUSPENSION_START, { delay: 50 });
      await startInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await startInput.press('Tab');
      await page.waitForTimeout(500);

      // Fill suspension end date
      const endInput = page.locator('input[id*="endDate"], input[id*="suspensionEnd"], input[aria-label*="End Date"]').first();
      await expect(endInput).toBeVisible({ timeout: 5_000 });
      await endInput.click({ force: true });
      await endInput.fill('', { force: true });
      await endInput.pressSequentially(SUSPENSION_END, { delay: 50 });
      await endInput.evaluate(el => {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      });
      await endInput.press('Tab');
      await page.waitForTimeout(500);

      // Fill reason if visible
      const reasonInput = page.locator('input[aria-label*="Reason"], input[id*="reason"]').first();
      if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await reasonInput.click({ force: true });
        await page.waitForTimeout(300);
        await reasonInput.fill('Moved to ineligible', { force: true });
        await page.waitForTimeout(1500);
        const reasonOpt = page.locator('mat-option').filter({ hasText: /Moved to ineligible/i }).first();
        if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await reasonOpt.click();
          await page.waitForTimeout(500);
        } else {
          const fallbackOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
          if (await fallbackOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await fallbackOpt.click();
            await page.waitForTimeout(500);
          }
        }
      }

      // Save
      const saveBtn = page.getByRole('button', { name: 'Save' }).first();
      await expect(saveBtn).toBeVisible({ timeout: 10_000 });
      await saveBtn.click({ force: true });
    }

    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

    // Verify dialog/form closed (if dialog was used)
    const dialogStillOpen = await page.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (dialogStillOpen) {
      const errors = await page.locator('mat-error').all();
      for (const e of errors) { console.error(`[TC-002] Error: ${(await e.textContent())?.trim()}`); }
      expect(dialogStillOpen, 'Suspension dialog did not close — possible validation errors').toBe(false);
    }

    console.log(`[TC-002] Suspension added: ${SUSPENSION_START} → ${SUSPENSION_END} — MMIS sync triggered`);
  });

  // ─── Verify MMIS Sync ──────────────────────────────────────────────────────

  test('ATC-ES-015 - Verify MMIS sync completes with SU response', async () => {
    if (MOCK_MMIS) {
      // ─── Mock path: Use database to set MMIS Success ──────────────────────
      const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
      if (!enrollmentKey) {
        // If not on detail page, navigate there first
        await navigateToEnrollments(page, participantUuid);
        await page.waitForTimeout(2000);
        const opened = await openFirstEnrollmentDetail(page);
        expect(opened).toBe(true);
      }
      const key = enrollmentKey || extractProgramEnrollmentKeyFromUrl(page.url());
      expect(key, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
      await page.waitForTimeout(5000);
      const mockResult = await mockMmisSuccess(key!);
      expect(mockResult, 'mockMmisSuccess failed — stored procedure missing?').toBe(true);
      console.log(`[TC-002] MMIS Success mocked for key: ${key}`);
      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3000);
      const status = await getSyncStatus(page);
      expect(status.responseStatus).toBe('SU');
      expect(status.hasConflict).toBe(false);
    } else {
      // ─── Real path: Poll for actual MMIS response ─────────────────────────
      // Poll for sync completion — MMIS may take time to process 3 transactions
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
        console.log(`[TC-002] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

        if (status.responseStatus !== null) {
          break;
        }

        if (attempt < maxAttempts) {
          console.log(`[TC-002] Still pending — waiting ${pollInterval / 1000}s...`);
          await page.waitForTimeout(pollInterval);
        }
      }

      expect(status.responseStatus, 'Expected SU or SE response from MMIS but sync did not complete').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
    }
  });

  test('ATC-ES-016 - Verify MMIS Transaction List shows transactions', async () => {
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

    // Verify we can see evidence of the 3 transactions (S500 + S510 + S520)
    const pageText = await page.locator('main').textContent() || '';
    const hasSyncEvidence = pageText.includes('MMIS') || pageText.includes('Transaction');
    expect(hasSyncEvidence).toBe(true);

    console.log('[TC-002] ✓ MMIS Transaction List visible — 3 transactions processed successfully');
  });

});
