/**
 * ATC: TC-007 — End Date Later (Extension / Re-enrollment)
 *
 * After TC-006 disenrolls the participant, this test re-enrolls them by
 * going through the full Draft → Referred → Enrolled flow (same as TC-001),
 * which triggers an S350 extension transaction to MMIS.
 *
 * Flow:
 * 1. Navigate to enrollment list → verify Disenrolled state
 * 2. Create Draft enrollment via "+ New Program Enrollment"
 * 3. Create Referred enrollment via "+ New Program Enrollment"
 * 4. Create Enrolled enrollment via "+ New Program Enrollment" (triggers MMIS S350)
 * 5. Verify SU response
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-006 must have completed (participant in Disenrolled state).
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

const DATA = SCENARIOS.TC_007;
const ENROLLMENT_START_DATE = DATA.bcInput.enrollmentStartDate;  // 07/01/2026
const EXTENDED_END_DATE = DATA.bcInput.newEnrollmentEndDate!;    // 12/31/2299

/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

// ─── Helper: Create enrollment via + New Program Enrollment ───────────────────

async function createEnrollment(pg: Page, opts: { status: string; statusReason: string; startDate: string; endDate?: string }): Promise<void> {
  const trigger = pg.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await pg.waitForTimeout(3000);
  await expect(pg.locator('mat-dialog-container').first()).toBeVisible({ timeout: 5_000 });

  const programInput = pg.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await pg.waitForTimeout(300);
  await programInput.fill('IRIS', { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: /IRIS/ }).first().click();
  await pg.waitForTimeout(1000);

  const statusInput = pg.locator('input[aria-label="Status"]').first();
  await statusInput.click({ force: true });
  await pg.waitForTimeout(300);
  await statusInput.fill(opts.status, { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: new RegExp(opts.status, 'i') }).first().click();
  await pg.waitForTimeout(1500);

  const reasonInput = pg.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await pg.waitForTimeout(300);
  await reasonInput.fill(opts.statusReason.substring(0, 10), { force: true });
  await pg.waitForTimeout(1500);
  const reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) { await reasonOpt.click(); }
  await pg.waitForTimeout(500);

  const startInput = pg.locator('input[id^="startDate_"]').first();
  await startInput.click({ force: true });
  await startInput.fill('', { force: true });
  await startInput.pressSequentially(opts.startDate, { delay: 50 });
  await startInput.evaluate(el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true })); });
  await startInput.press('Tab');
  await pg.waitForTimeout(500);

  if (opts.endDate) {
    const endInput = pg.locator('input[id^="endDate_"]').first();
    await endInput.click({ force: true });
    await endInput.fill('', { force: true });
    await endInput.pressSequentially(opts.endDate, { delay: 50 });
    await endInput.evaluate(el => { el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new Event('blur', { bubbles: true })); });
    await endInput.press('Tab');
    await pg.waitForTimeout(500);
  }

  await pg.getByRole('button', { name: 'Save' }).first().click({ force: true });
  await pg.waitForTimeout(5000);
  await pg.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  const stillOpen = await pg.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (stillOpen) {
    const errors = await pg.locator('mat-error').all();
    for (const e of errors) { console.error(`  Error: ${(await e.textContent())?.trim()}`); }
  }
  expect(stillOpen, 'Dialog did not close after save — validation errors present').toBe(false);
}

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
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ─── Precondition Check ─────────────────────────────────────────────────────

  test('ATC-ES-034 - Precondition: Participant is Disenrolled', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const irisState = await getCurrentIrisState(page);
    console.log(`[TC-007] State: IRIS=${irisState}`);

    expect(irisState, 'Precondition failed: participant must be Disenrolled. Run TC-006 first.').toBe('Disenrolled');
  });

  // ─── Draft → Referred → Enrolled (same as TC-001 flow) ─────────────────────

  test('ATC-ES-035 - Create Draft enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Draft', statusReason: 'Not Applicable', startDate: ENROLLMENT_START_DATE });
    console.log('[TC-007] Draft enrollment created');
  });

  test('ATC-ES-036 - Create Referred enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Referred', statusReason: 'IRIS Consultant', startDate: ENROLLMENT_START_DATE });
    console.log('[TC-007] Referred enrollment created');
  });

  test('ATC-ES-037 - Create Enrolled enrollment (triggers MMIS S350 extension)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Enrolled', statusReason: 'Not Applicable', startDate: ENROLLMENT_START_DATE, endDate: EXTENDED_END_DATE });
    console.log(`[TC-007] Enrolled enrollment created with end date ${EXTENDED_END_DATE} — MMIS S350 triggered`);
  });

  // ─── Verify MMIS Sync ──────────────────────────────────────────────────────

  test('ATC-ES-038 - Verify MMIS sync completes with SU response', async () => {
    // Navigate to enrollment detail
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
    if (await enrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await enrolledRow.dblclick();
      await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    } else {
      const opened = await openFirstEnrollmentDetail(page);
      expect(opened).toBe(true);
    }

    if (MOCK_MMIS) {
      // ─── Mock path: Use database to set MMIS Success ──────────────────────
      const key = extractProgramEnrollmentKeyFromUrl(page.url());
      expect(key, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
      await page.waitForTimeout(5000);
      const mockResult = await mockMmisSuccess(key!);
      expect(mockResult, 'mockMmisSuccess failed — stored procedure missing?').toBe(true);
      console.log(`[TC-007] MMIS Success mocked for key: ${key}`);
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
        console.log(`[TC-007] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

        if (status.responseStatus !== null) break;

        if (attempt < maxAttempts) {
          console.log(`[TC-007] Still pending — waiting ${pollInterval / 1000}s...`);
          await page.waitForTimeout(pollInterval);
        }
      }

      await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

      expect(status.responseStatus, 'Expected SU or SE response from MMIS but sync did not complete').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);

      console.log('[TC-007] ✓ MMIS extension transaction completed successfully (' + status.responseStatus + ')');
    }
  });

});
