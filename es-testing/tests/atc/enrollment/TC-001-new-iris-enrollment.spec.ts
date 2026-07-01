/**
 * ATC: TC-001 — New IRIS Enrollment Happy Path
 *
 * Lifecycle: Pristine Check → (Reset if needed) → Draft → Referred → Enrolled → Verify MMIS sync
 *
 * Behavior:
 * - Checks MMIS Snapshot to determine if participant has an active waiver enrollment.
 * - If active enrollment exists in MMIS, performs TC-008 (Referral Withdrawn) to reset.
 * - Then runs full Draft → Referred → Enrolled flow.
 * - Verifies MMIS sync via real MMIS or mocked response (controlled by MOCK_MMIS flag).
 *
 * IMPORTANT: Tests run in serial mode. If any step fails, all subsequent steps are skipped.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Person UUID: c7a3862e-f166-466d-a5fb-b4670130aebd
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, openFirstEnrollmentDetail, getSyncStatus } from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_001;
const ISP_START_DATE = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;

/** When true, uses database stored procedure to mock MMIS Success response instead of waiting for real MMIS. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

// ─── State ────────────────────────────────────────────────────────────────────

let browser: Browser;
let page: Page;
let participantUuid: string;
let isPristine = false;

// ─── Helper: Create enrollment ────────────────────────────────────────────────

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
  expect(stillOpen).toBe(false);
}

// ─── State checkers ───────────────────────────────────────────────────────────

async function verifyFirstRowState(pg: Page, expectedTexts: string[], label: string): Promise<void> {
  await navigateToEnrollments(pg, participantUuid);
  await pg.waitForTimeout(2000);
  const firstRow = pg.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  console.log(`[${label}] First row: ${rowText.trim().substring(0, 130)}`);
  for (const t of expectedTexts) { expect(rowText).toContain(t); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS — Serial mode: stops on first failure
// ═══════════════════════════════════════════════════════════════════════════════

test.describe.serial('TC-001: New IRIS Enrollment Happy Path', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-001] UUID: ${participantUuid}`);
    console.log(`[TC-001] MOCK_MMIS: ${MOCK_MMIS}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-001 - Precondition: Participant is accessible', async () => {
    const accessible = await navigateToParticipant(page, participantUuid);
    expect(accessible).toBe(true);
  });

  test('ATC-ES-002 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
    const mmisState = await getMmisSnapshotState(page, participantUuid);

    console.log(`[TC-001] MMIS Snapshot: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
    if (mmisState.waiverRecords.length > 0) {
      for (const rec of mmisState.waiverRecords) {
        console.log(`[TC-001]   Record: Program=${rec.waiverProgram}, Agency=${rec.waiverAgency}, Status=${rec.waiverStatus}, Eff=${rec.effectiveDate}, End=${rec.endDate}`);
      }
    }

    expect(mmisState.loaded).toBe(true);

    if (!mmisState.hasActiveWaiverEnrollment) {
      isPristine = true;
      console.log('[TC-001] ✓ Participant is in pristine state — no active MMIS waiver enrollment');
    } else {
      isPristine = false;
      console.log('[TC-001] ✗ Active MMIS waiver enrollment found — reset required');
    }
  });

  test('ATC-ES-003 - Reset: Withdraw referral to clear MMIS (if not pristine)', async () => {
    if (isPristine) {
      console.log('[TC-001] Skipping reset — already pristine');
      return;
    }

    console.log('[TC-001] Performing TC-008 Referral Withdrawn to reset MMIS state...');
    const resetSuccess = await ensurePristineState(page, participantUuid);

    expect(resetSuccess, 'FATAL: Failed to reset participant to pristine state via Referral Withdrawn. Cannot proceed with TC-001.').toBe(true);
    isPristine = true;
    console.log('[TC-001] ✓ Reset complete — participant is now pristine');
  });

  test('ATC-ES-004 - Create Draft enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Draft', statusReason: 'Not Applicable', startDate: ISP_START_DATE });
    console.log('[TC-001] Draft enrollment created');
  });

  test('ATC-ES-005 - State check: First row is Draft', async () => {
    await verifyFirstRowState(page, ['IRIS', 'Draft'], 'ATC-ES-005');
  });

  test('ATC-ES-006 - Create Referred enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Referred', statusReason: 'IRIS Consultant', startDate: ISP_START_DATE });
    console.log('[TC-001] Referred enrollment created');
  });

  test('ATC-ES-007 - State check: First row is Referred', async () => {
    await verifyFirstRowState(page, ['IRIS', 'Referred'], 'ATC-ES-007');
  });

  test('ATC-ES-008 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Enrolled', statusReason: 'Not Applicable', startDate: ISP_START_DATE, endDate: ENROLLMENT_END_DATE });
    console.log('[TC-001] Enrolled enrollment created — MMIS sync triggered');
  });

  test('ATC-ES-009 - Verify: First row is Enrolled with sync badge', async () => {
    await verifyFirstRowState(page, ['IRIS', 'Enrolled'], 'ATC-ES-009');
    const rowText = await page.locator('mat-row').first().textContent() || '';
    expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
  });

  test('ATC-ES-010 - Verify: Enrolled detail — MMIS sync success, no conflict', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openFirstEnrollmentDetail(page);
    expect(opened).toBe(true);

    if (MOCK_MMIS) {
      // ─── Mock path: Use database to set MMIS Success ──────────────────────
      const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
      expect(enrollmentKey, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();
      console.log(`[TC-001] ProgramEnrollmentKey: ${enrollmentKey}`);

      // Wait for the app to create the ProgramEnrollmentExtension row
      await page.waitForTimeout(5000);

      const mockResult = await mockMmisSuccess(enrollmentKey!);
      expect(mockResult, 'mockMmisSuccess failed — check stored procedure exists in database').toBe(true);
      console.log('[TC-001] MMIS Success response mocked via database');

      // Refresh the page to pick up the mocked status
      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const status = await getSyncStatus(page);
      console.log(`[TC-001] Sync status (mocked): ${JSON.stringify(status)}`);
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
        console.log(`[TC-001] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

        if (status.responseStatus !== null) break;

        if (attempt < maxAttempts) {
          await page.waitForTimeout(pollInterval);
        }
      }

      expect(status.responseStatus, 'Expected SU or SE response from MMIS').toMatch(/^(SU|SE)$/);
      expect(status.hasConflict).toBe(false);
    }

    // Verify MMIS Transaction List section is visible
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
    console.log('[TC-001] ✓ Enrollment created and MMIS sync verified');
  });

});
