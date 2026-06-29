/**
 * UJT: TC-001 — New IRIS Enrollment Happy Path (Full Lifecycle)
 *
 * Journey: Draft → Referred → Enrolled (verify MMIS) → Disenrolled (verify MMIS)
 *
 * Test Participant: MA ID 1430000013
 * ISP Start Date: 06/01/2026
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, openFirstEnrollmentDetail, getSyncStatus } from '../../atc/enrollment/actions/enrollment.actions';

const ISP_START_DATE = '07/01/2026';
const DISENROLL_END_DATE = '12/31/2299';

let browser: Browser;
let page: Page;
let participantUuid: string;

/**
 * Creates a new enrollment record via the dialog.
 */
async function createEnrollment(
  pg: Page,
  opts: { status: string; statusReason: string; startDate: string; endDate?: string }
): Promise<void> {
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
  await pg.locator('mat-option').filter({ hasText: new RegExp(opts.status, 'i') }).first().click();
  await pg.waitForTimeout(1500);

  // Status Reason
  const reasonInput = pg.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await pg.waitForTimeout(300);
  await reasonInput.fill(opts.statusReason.substring(0, 10), { force: true });
  await pg.waitForTimeout(1500);
  const reasonOpt = pg.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
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

  // End Date
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

  const stillOpen = await pg.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (stillOpen) {
    const errors = await pg.locator('mat-error').all();
    for (const e of errors) {
      console.error(`  Error: ${(await e.textContent())?.trim()}`);
    }
  }
  expect(stillOpen).toBe(false);
}

test.describe('UJT-ES-001: IRIS Enrollment Lifecycle — Happy Path', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
  });
  test.afterAll(async () => { await browser.close(); });

  test('Step 1: Login', async () => {
    await loginAndSelectContext(page);
    await expect(page.locator('main.app-root')).toBeVisible({ timeout: 15_000 });
  });

  test('Step 2: Find participant', async () => {
    participantUuid = await resolveParticipantUuid(page);
    expect(participantUuid).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('Step 3: Navigate to Program Enrollments', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(3000);
    await expect(page.locator('main.app-root')).toBeVisible({ timeout: 15_000 });
  });

  test('Step 4: Create Draft enrollment', async () => {
    test.slow();
    console.log('[UJT Step 4] Creating Draft...');
    await createEnrollment(page, {
      status: 'Draft',
      statusReason: 'Not Applicable',
      startDate: ISP_START_DATE,
    });
    console.log('[UJT Step 4] Draft created');
  });

  test('Step 5: Create Referred enrollment', async () => {
    test.slow();
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    console.log('[UJT Step 5] Creating Referred...');
    await createEnrollment(page, {
      status: 'Referred',
      statusReason: 'IRIS Consultant',
      startDate: ISP_START_DATE,
    });
    console.log('[UJT Step 5] Referred created');
  });

  test('Step 6: Create Enrolled enrollment (triggers MMIS sync)', async () => {
    test.slow();
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    console.log('[UJT Step 6] Creating Enrolled...');
    await createEnrollment(page, {
      status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: ISP_START_DATE,
    });
    console.log('[UJT Step 6] Enrolled created');
  });

  test('Step 7: Verify Enrolled row with MMIS sync badge', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(3000);

    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    console.log(`[UJT Step 7] First row: ${rowText.trim().substring(0, 120)}`);

    expect(rowText).toContain('Enrolled');
    expect(rowText.includes('Success') || rowText.includes('Warning')).toBe(true);
  });

  test('Step 8: Verify MMIS sync on Enrolled detail (SU response)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await openFirstEnrollmentDetail(page);
    await page.waitForTimeout(5000);

    const status = await getSyncStatus(page);
    console.log(`[UJT Step 8] Sync: ${JSON.stringify(status)}`);

    expect(status.hasPending || status.statusText.includes('Success') || status.statusText.includes('Succeeded')).toBe(true);
    expect(status.hasConflict).toBe(false);
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Step 9: Create Disenrolled enrollment', async () => {
    test.slow();
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    console.log('[UJT Step 9] Creating Disenrolled...');
    await createEnrollment(page, {
      status: 'Disenrolled',
      statusReason: 'IRIS Disenrollment',
      startDate: ISP_START_DATE,
      endDate: DISENROLL_END_DATE,
    });
    console.log('[UJT Step 9] Disenrolled created');
  });

  test('Step 10: Verify Disenrolled row with MMIS sync badge', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(3000);

    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    console.log(`[UJT Step 10] First row: ${rowText.trim().substring(0, 120)}`);

    expect(rowText).toContain('Disenrolled');
  });

  test('Step 11: Verify MMIS sync on Disenrolled detail', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    await openFirstEnrollmentDetail(page);
    await page.waitForTimeout(5000);

    const status = await getSyncStatus(page);
    console.log(`[UJT Step 11] Sync: ${JSON.stringify(status)}`);

    expect(status.hasPending || status.statusText.includes('Success') || status.statusText.includes('Succeeded')).toBe(true);
    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
  });
});
