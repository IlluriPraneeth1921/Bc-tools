/**
 * ATC: TC-008 — Referral Withdrawn
 *
 * Changes enrollment status to "Referral Withdrawn", deleting the existing
 * MMIS span. Expects 1 MMIS transaction (Delete span via S310).
 *
 * IMPORTANT: Tests run in serial mode. If any step fails, all subsequent steps are skipped.
 *
 * Precondition: Participant must have an active IRIS enrollment in MMIS (Waiver Status "A").
 *               TC-001 must have been executed successfully first.
 *
 * Flow:
 * 1. Navigate to MMIS Snapshot — verify active waiver enrollment exists
 * 2. Navigate to enrollment list — double-click Enrolled row → detail page
 * 3. Click pencil icon → Edit dialog
 * 4. Change Status to "Referral Withdrawn", Status Reason = "Not Provided"
 * 5. Save → triggers MMIS delete (S310)
 * 6. Verify MMIS Snapshot shows "No Waiver Enrollment record(s) available."
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Person UUID: c7a3862e-f166-466d-a5fb-b4670130aebd
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, openFirstEnrollmentDetail, getSyncStatus } from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { waitForEmptyWaiverEnrollment } from '../../helpers/reset-enrollment';
import { SCENARIOS } from '../../data/scenario-test-data';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_008;

// ─── State ────────────────────────────────────────────────────────────────────


/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-008: Referral Withdrawn', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-008] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-038 - Precondition: Verify active MMIS waiver enrollment exists', async () => {
    const mmisState = await getMmisSnapshotState(page, participantUuid);

    console.log(`[TC-008] MMIS Snapshot: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
    if (mmisState.waiverRecords.length > 0) {
      for (const rec of mmisState.waiverRecords) {
        console.log(`[TC-008]   Record: Program=${rec.waiverProgram}, Status=${rec.waiverStatus}, Eff=${rec.effectiveDate}, End=${rec.endDate}`);
      }
    }

    expect(mmisState.loaded, 'MMIS Snapshot page did not load').toBe(true);
    expect(mmisState.hasActiveWaiverEnrollment, 'Precondition failed: No active MMIS waiver enrollment found. TC-001 must run first.').toBe(true);
  });

  test('ATC-ES-039 - Navigate to enrollment detail page', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(3000);

    // Find the Enrolled IRIS row
    const rows = page.locator('mat-row');
    const rowCount = await rows.count();
    let targetRow = null;

    for (let i = 0; i < rowCount; i++) {
      const rowText = (await rows.nth(i).textContent()) || '';
      if (rowText.includes('IRIS') && rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) {
        targetRow = rows.nth(i);
        console.log(`[TC-008] Found Enrolled IRIS row at index ${i}`);
        break;
      }
    }

    expect(targetRow, 'No Enrolled IRIS enrollment row found in Carity').not.toBeNull();

    // Double-click to open detail page
    await targetRow!.dblclick();
    await page.waitForURL(/\/programenrollments\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const currentUrl = page.url();
    console.log(`[TC-008] Detail page URL: ${currentUrl}`);
    expect(currentUrl).toMatch(/\/programenrollments\/programenrollment\/[0-9a-f-]+/i);
  });

  test('ATC-ES-040 - Open Edit dialog and change status to Referral Withdrawn', async () => {
    // Wait for Overview section to render
    await page.locator('text=Overview').first().waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(2000);

    // Click pencil icon — retry up to 3 times
    const pencil = page.locator('button.mat-icon-button:has(mat-icon:text("edit"))').first();
    await expect(pencil).toBeVisible({ timeout: 10_000 });

    let dialogOpened = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[TC-008] Clicking pencil icon (attempt ${attempt})...`);
      await pencil.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await pencil.click();
      await page.waitForTimeout(3000);

      const dialog = page.locator('mat-dialog-container');
      dialogOpened = await dialog.isVisible({ timeout: 5_000 }).catch(() => false);
      if (dialogOpened) {
        console.log('[TC-008] Edit dialog opened');
        break;
      }
      console.log(`[TC-008] Dialog not open after attempt ${attempt} — retrying...`);
      await page.waitForTimeout(1000);
    }

    expect(dialogOpened, 'Edit Program Enrollment dialog did not open after clicking pencil icon').toBe(true);

    // Change Status to "Referral Withdrawn"
    const statusInput = page.locator('input[aria-label="Status"]').first();
    await expect(statusInput).toBeVisible({ timeout: 10_000 });
    await statusInput.click({ force: true });
    await page.waitForTimeout(300);
    await statusInput.fill('', { force: true });
    await statusInput.fill('Referral Withdrawn', { force: true });
    await page.waitForTimeout(1500);

    const statusOpt = page.locator('mat-option').filter({ hasText: /Referral Withdrawn/i }).first();
    await expect(statusOpt).toBeVisible({ timeout: 5_000 });
    await statusOpt.click();
    await page.waitForTimeout(1500);

    // Select Status Reason = "Not Provided"
    const reasonInput = page.locator('input[aria-label="Status Reason"]').first();
    if (await reasonInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await reasonInput.click({ force: true });
      await page.waitForTimeout(300);
      await reasonInput.fill('', { force: true });
      await reasonInput.fill('Not Provided', { force: true });
      await page.waitForTimeout(1500);
      const reasonOpt = page.locator('mat-option').filter({ hasText: /Not Provided/i }).first();
      if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await reasonOpt.click();
        await page.waitForTimeout(500);
      } else {
        // Fallback: pick first available
        const fallbackOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
        if (await fallbackOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await fallbackOpt.click();
          await page.waitForTimeout(500);
        }
      }
    }

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
      for (const e of errors) { console.error(`[TC-008] Error: ${(await e.textContent())?.trim()}`); }
    }
    expect(dialogStillOpen, 'Dialog did not close after save — possible validation errors').toBe(false);

    console.log('[TC-008] Status changed to Referral Withdrawn — MMIS delete triggered');
  });

  test('ATC-ES-041 - Verify SU response on enrollment detail', async () => {
    if (MOCK_MMIS) {
      // ─── Mock path: Use database to set MMIS Success ──────────────────────
      const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
      if (!enrollmentKey) {
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
      console.log(`[TC-008] MMIS Success mocked for key: ${key}`);
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
        console.log(`[TC-008] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

        if (status.responseStatus !== null) {
          break;
        }

        if (attempt < maxAttempts) {
          console.log(`[TC-008] Still pending — waiting ${pollInterval / 1000}s...`);
          await page.waitForTimeout(pollInterval);
        }
      }

      // Verify MMIS Transaction List is visible
      await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

      expect(status.responseStatus, 'Expected SU response from MMIS but sync did not complete').toBe('SU');
      expect(status.hasConflict).toBe(false);
    }
  });

  test('ATC-ES-042 - Verify MMIS Snapshot shows no waiver enrollment', async () => {
    const cleared = await waitForEmptyWaiverEnrollment(page, participantUuid, {
      maxAttempts: 10,
      pollIntervalMs: 10_000,
    });

    expect(cleared, 'MMIS Snapshot still shows waiver enrollment after Referral Withdrawn').toBe(true);
    console.log('[TC-008] ✓ MMIS confirmed: No Waiver Enrollment records — deletion successful');
  });

});
