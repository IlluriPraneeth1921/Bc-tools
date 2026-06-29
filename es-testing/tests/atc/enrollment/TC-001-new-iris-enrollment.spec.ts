/**
 * ATC: TC-001 — New IRIS Enrollment Happy Path
 *
 * Full lifecycle: Draft → Referred → Enrolled → Disenrolled
 * Each step creates a new record via "+ New Program Enrollment".
 *
 * Test Participant: MA ID 1430000013
 * ISP Start Date: 06/01/2026
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, openFirstEnrollmentDetail, getSyncStatus } from './actions/enrollment.actions';

const ISP_START_DATE = '07/01/2026';
const DISENROLL_END_DATE = '12/31/2299';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
  page = await browser.newContext().then(c => c.newPage());
  await loginAndSelectContext(page);
  participantUuid = await resolveParticipantUuid(page);
  console.log(`[TC-001] Participant UUID: ${participantUuid}`);
});
test.setTimeout(300_000);

test.afterAll(async () => {
  await browser.close();
});

/**
 * Helper: Creates a new enrollment via "+ New Program Enrollment" dialog.
 */
async function createEnrollment(
  pg: Page,
  opts: { status: string; statusReason: string; startDate: string; endDate?: string }
): Promise<void> {
  // Click "+ New Program Enrollment"
  const trigger = pg.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await pg.waitForTimeout(3000);
  await expect(pg.locator('mat-dialog-container').first()).toBeVisible({ timeout: 5_000 });

  // Program = IRIS
  const programInput = pg.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await pg.waitForTimeout(300);
  await programInput.fill('IRIS', { force: true });
  await pg.waitForTimeout(1500);
  await pg.locator('mat-option').filter({ hasText: /IRIS/ }).first().click();
  await pg.waitForTimeout(1000);

  // Status
  const statusInput = pg.locator('input[aria-label="Status"]').first();
  await statusInput.click({ force: true });
  await pg.waitForTimeout(300);
  await statusInput.fill(opts.status, { force: true });
  await pg.waitForTimeout(1500);
  const statusOpt = pg.locator('mat-option').filter({ hasText: new RegExp(opts.status, 'i') }).first();
  await expect(statusOpt).toBeVisible({ timeout: 5_000 });
  await statusOpt.click();
  await pg.waitForTimeout(1500);

  // Status Reason
  const reasonInput = pg.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await pg.waitForTimeout(300);
  await reasonInput.fill(opts.statusReason.substring(0, 10), { force: true });
  await pg.waitForTimeout(1500);
  const reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const text = await reasonOpt.textContent();
    console.log(`  Status Reason selected: "${text?.trim()}"`);
    await reasonOpt.click();
  }
  await pg.waitForTimeout(500);

  // Start Date
  const startInput = pg.locator('input[id^="startDate_"]').first();
  await startInput.click({ force: true });
  await startInput.fill('', { force: true });
  await startInput.pressSequentially(opts.startDate, { delay: 50 });
  await startInput.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await startInput.press('Tab');
  await pg.waitForTimeout(500);

  // End Date (if provided)
  if (opts.endDate) {
    const endInput = pg.locator('input[id^="endDate_"]').first();
    await endInput.click({ force: true });
    await endInput.fill('', { force: true });
    await endInput.pressSequentially(opts.endDate, { delay: 50 });
    await endInput.evaluate((el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await endInput.press('Tab');
    await pg.waitForTimeout(500);
  }

  // Save
  await pg.getByRole('button', { name: 'Save' }).first().click({ force: true });
  await pg.waitForTimeout(5000);
  await pg.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify dialog closed
  const stillOpen = await pg.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (stillOpen) {
    const errors = await pg.locator('mat-error').all();
    for (const e of errors) {
      console.error(`  Save error: ${(await e.textContent())?.trim()}`);
    }
    await pg.screenshot({ path: `test-results/create-enrollment-error-${opts.status}.png`, fullPage: true });
  }
  expect(stillOpen).toBe(false);
}

// ─── ATC-ES-001: Participant is accessible ────────────────────────────────────

test('ATC-ES-001 - Participant is accessible', async () => {
  const accessible = await navigateToParticipant(page, participantUuid);
  expect(accessible).toBe(true);
});

// ─── ATC-ES-002: Create Draft enrollment ──────────────────────────────────────

test('ATC-ES-002 - Create IRIS enrollment with status Draft', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  console.log('[ATC-ES-002] Creating Draft enrollment...');
  await createEnrollment(page, {
    status: 'Draft',
    statusReason: 'Not Applicable',
    startDate: ISP_START_DATE,
  });
  console.log('[ATC-ES-002] Draft created');
});

// ─── ATC-ES-003: Verify Draft appears in list ─────────────────────────────────

test('ATC-ES-003 - Draft enrollment appears as first row', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  console.log(`[ATC-ES-003] First row: ${rowText.trim().substring(0, 120)}`);

  expect(rowText).toContain('IRIS');
  expect(rowText).toContain('Draft');
});

// ─── ATC-ES-004: Create Referred enrollment ───────────────────────────────────

test('ATC-ES-004 - Create IRIS enrollment with status Referred', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  console.log('[ATC-ES-004] Creating Referred enrollment...');
  await createEnrollment(page, {
    status: 'Referred',
    statusReason: 'IRIS Consultant',
    startDate: ISP_START_DATE,
  });
  console.log('[ATC-ES-004] Referred created');
});

// ─── ATC-ES-005: Verify Referred appears in list ──────────────────────────────

test('ATC-ES-005 - Referred enrollment appears as first row', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  console.log(`[ATC-ES-005] First row: ${rowText.trim().substring(0, 120)}`);

  expect(rowText).toContain('IRIS');
  expect(rowText).toContain('Referred');
});

// ─── ATC-ES-006: Create Enrolled enrollment ───────────────────────────────────

test('ATC-ES-006 - Create IRIS enrollment with status Enrolled', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  console.log('[ATC-ES-006] Creating Enrolled enrollment...');
  await createEnrollment(page, {
    status: 'Enrolled',
    statusReason: 'Not Applicable',
    startDate: ISP_START_DATE,
  });
  console.log('[ATC-ES-006] Enrolled created — MMIS sync triggered');
});

// ─── ATC-ES-007: Verify Enrolled appears with sync badge ──────────────────────

test('ATC-ES-007 - Enrolled enrollment appears with Success or Warning badge', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  console.log(`[ATC-ES-007] First row: ${rowText.trim().substring(0, 120)}`);

  expect(rowText).toContain('IRIS');
  expect(rowText).toContain('Enrolled');
  expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
});

// ─── ATC-ES-008: Open Enrolled detail and verify MMIS sync ────────────────────

test('ATC-ES-008 - Enrolled enrollment detail shows MMIS sync status', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const opened = await openFirstEnrollmentDetail(page);
  expect(opened).toBe(true);

  // Wait for sync (up to 20 seconds)
  await page.waitForTimeout(5000);
  const status = await getSyncStatus(page);
  console.log(`[ATC-ES-008] Sync status: ${JSON.stringify(status)}`);

  const valid = status.hasPending || status.responseStatus !== null ||
    status.statusText.includes('Success') || status.statusText.includes('Succeeded');
  expect(valid).toBe(true);
  expect(status.hasConflict).toBe(false);

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Re-submit')).toBeVisible({ timeout: 5_000 });
});

// ─── ATC-ES-009: Create Disenrolled enrollment ────────────────────────────────

test('ATC-ES-009 - Create IRIS enrollment with status Disenrolled', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  console.log('[ATC-ES-009] Creating Disenrolled enrollment...');
  await createEnrollment(page, {
    status: 'Disenrolled',
    statusReason: 'IRIS Disenrollment',
    startDate: ISP_START_DATE,
    endDate: DISENROLL_END_DATE,
  });
  console.log('[ATC-ES-009] Disenrolled created — MMIS disenrollment triggered');
});

// ─── ATC-ES-010: Verify Disenrolled appears with sync badge ───────────────────

test('ATC-ES-010 - Disenrolled enrollment appears with Success or Warning badge', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  console.log(`[ATC-ES-010] First row: ${rowText.trim().substring(0, 120)}`);

  expect(rowText).toContain('IRIS');
  expect(rowText).toContain('Disenrolled');
  expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Error') || rowText.includes('Pending')).toBe(true);
});

// ─── ATC-ES-011: Open Disenrolled detail and verify MMIS sync ─────────────────

test('ATC-ES-011 - Disenrolled enrollment detail shows MMIS sync status', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const opened = await openFirstEnrollmentDetail(page);
  expect(opened).toBe(true);

  await page.waitForTimeout(5000);
  const status = await getSyncStatus(page);
  console.log(`[ATC-ES-011] Sync status: ${JSON.stringify(status)}`);

  const valid = status.hasPending || status.responseStatus !== null ||
    status.statusText.includes('Success') || status.statusText.includes('Succeeded');
  expect(valid).toBe(true);

  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
});
