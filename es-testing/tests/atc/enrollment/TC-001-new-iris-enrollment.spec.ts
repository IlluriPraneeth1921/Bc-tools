/**
 * ATC: TC-001 — New IRIS Enrollment Happy Path
 *
 * Lifecycle: Pristine Check → (Reset if needed) → Draft → Referred → Enrolled (verify MMIS sync)
 *
 * Behavior:
 * - Checks MMIS Snapshot to determine if participant has an active waiver enrollment.
 * - If active enrollment exists in MMIS, performs TC-008 (Referral Withdrawn) to reset
 *   the participant to pristine state before proceeding.
 * - Then runs full Draft → Referred → Enrolled flow.
 *
 * IMPORTANT: Tests run in serial mode. If any step fails, all subsequent steps are skipped.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Person UUID: c7a3862e-f166-466d-a5fb-b4670130aebd
 * Enrollment Start Date: 07/01/2026 (must match ISP start date)
 *
 * TODO: Automate Carity database cleanup (currently manual).
 *       See tasklist.md for details.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, openFirstEnrollmentDetail, getSyncStatus } from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';

// ─── Configuration ────────────────────────────────────────────────────────────

const ISP_START_DATE = '07/01/2026';

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

async function verifySyncOnDetail(pg: Page, label: string): Promise<void> {
  await navigateToEnrollments(pg, participantUuid);
  await pg.waitForTimeout(2000);
  const opened = await openFirstEnrollmentDetail(pg);
  expect(opened).toBe(true);
  await pg.waitForTimeout(5000);
  const status = await getSyncStatus(pg);
  console.log(`[${label}] Sync: ${JSON.stringify(status)}`);
  const valid = status.hasPending || status.responseStatus !== null || status.statusText.includes('Success') || status.statusText.includes('Succeeded') || status.statusText.includes('Pending');
  expect(valid).toBe(true);
  expect(status.hasConflict).toBe(false);
  await expect(pg.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
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
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

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
  });

  test('ATC-ES-005 - State check: First row is Draft', async () => {
    await verifyFirstRowState(page, ['IRIS', 'Draft'], 'ATC-ES-005');
  });

  test('ATC-ES-006 - Create Referred enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Referred', statusReason: 'IRIS Consultant', startDate: ISP_START_DATE });
  });

  test('ATC-ES-007 - State check: First row is Referred', async () => {
    await verifyFirstRowState(page, ['IRIS', 'Referred'], 'ATC-ES-007');
  });

  test('ATC-ES-008 - Create Enrolled enrollment (triggers MMIS)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await createEnrollment(page, { status: 'Enrolled', statusReason: 'Not Applicable', startDate: ISP_START_DATE, endDate: '12/31/2299' });
  });

  test('ATC-ES-009 - Verify: First row is Enrolled with sync badge', async () => {
    await verifyFirstRowState(page, ['IRIS', 'Enrolled'], 'ATC-ES-009');
    const rowText = await page.locator('mat-row').first().textContent() || '';
    expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
  });

  test('ATC-ES-010 - Verify: Enrolled detail — MMIS sync, no conflict', async () => {
    await verifySyncOnDetail(page, 'ATC-ES-010');
  });

});
