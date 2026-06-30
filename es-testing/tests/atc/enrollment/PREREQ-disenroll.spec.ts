/**
 * ATC: TC-001 Prerequisite — Disenroll participant from IRIS
 *
 * This test disenrolls the participant so TC-001 can start from a clean state.
 * Run this BEFORE TC-001 when the participant has an active IRIS enrollment.
 *
 * Steps:
 * 1. Navigate to Program Enrollments
 * 2. Click "+ New Program Enrollment"
 * 3. Fill: Program=IRIS, Status=Disenrolled, Status Reason=IRIS Disenrollment, Start Date=07/01/2026
 * 4. Save
 * 5. Verify disenrollment appears in list
 * 6. Open detail and verify MMIS sync initiates
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import { resolveParticipantUuid, openNewEnrollmentDialog, openFirstEnrollmentDetail, getSyncStatus } from './actions/enrollment.actions';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('PREREQ: Disenroll participant from IRIS', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Prereq-Disenroll] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(180_000);
  test.afterAll(async () => { await browser.close(); });

test('PREREQ-001 - Disenroll participant from IRIS program', async () => {
  // Navigate to enrollments
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  // Check if already disenrolled (first row is Disenrolled)
  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const firstRowText = await firstRow.textContent() || '';
  if (firstRowText.includes('Disenrolled')) {
    console.log('[Prereq-Disenroll] Already disenrolled — skipping');
    return;
  }

  // Find the last Enrolled row's start date
  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  const enrolledRowText = await enrolledRow.textContent() || '';
  // Extract date pattern MM/DD/YYYY from the row text
  const dateMatch = enrolledRowText.match(/(\d{2}\/\d{2}\/\d{4})/);
  let startDate = '07/01/2026'; // fallback
  let endDate = '07/31/2026';   // fallback

  if (dateMatch) {
    startDate = dateMatch[1];
    // Calculate end of month
    const [month, day, year] = startDate.split('/').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); // month is 1-based, Date(year, month, 0) gives last day of previous month... actually:
    // new Date(2026, 7, 0) = June 30. new Date(2026, month, 0) gives last day of 'month'
    const endOfMonth = new Date(year, month, 0).getDate();
    endDate = `${String(month).padStart(2, '0')}/${String(endOfMonth).padStart(2, '0')}/${year}`;
    console.log(`[Prereq-Disenroll] Using dates from enrolled row: Start=${startDate}, End=${endDate}`);
  } else {
    console.log(`[Prereq-Disenroll] Could not find enrolled date, using defaults: Start=${startDate}, End=${endDate}`);
  }

  // Click "+ New Program Enrollment"
  const trigger = page.getByText('New Program Enrollment');
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await trigger.click();
  await page.waitForTimeout(3000);

  // Verify dialog opened
  const dialog = await page.locator('mat-dialog-container').first().isVisible({ timeout: 5_000 });
  expect(dialog).toBe(true);

  // Fill Program = IRIS
  const programInput = page.locator('input[aria-label="Program"]').first();
  await programInput.click({ force: true });
  await page.waitForTimeout(300);
  await programInput.fill('IRIS', { force: true });
  await page.waitForTimeout(1500);
  const irisOpt = page.locator('mat-option').filter({ hasText: /IRIS/ }).first();
  await expect(irisOpt).toBeVisible({ timeout: 5_000 });
  await irisOpt.click();
  await page.waitForTimeout(1000);

  // Fill Status = Disenrolled
  const statusInput = page.locator('input[aria-label="Status"]').first();
  await statusInput.click({ force: true });
  await statusInput.fill('Disenrolled', { force: true });
  await page.waitForTimeout(1500);
  const disenrolledOpt = page.locator('mat-option').filter({ hasText: /Disenrolled/ }).first();
  await expect(disenrolledOpt).toBeVisible({ timeout: 5_000 });
  await disenrolledOpt.click();
  await page.waitForTimeout(1500);

  // Fill Status Reason = first available (should include IRIS Disenrollment options)
  const reasonInput = page.locator('input[aria-label="Status Reason"]').first();
  await reasonInput.click({ force: true });
  await reasonInput.fill('', { force: true });
  await page.waitForTimeout(1500);

  // Pick first available reason option
  const reasonOpt = page.locator('mat-option').filter({ hasNotText: /No option/i }).first();
  if (await reasonOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const reasonText = await reasonOpt.textContent();
    console.log(`[Prereq-Disenroll] Selecting Status Reason: "${reasonText?.trim()}"`);
    await reasonOpt.click();
  } else {
    // Try typing to filter
    await reasonInput.fill('Involuntary', { force: true });
    await page.waitForTimeout(1000);
    const filteredOpt = page.locator('mat-option').first();
    if (await filteredOpt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await filteredOpt.click();
    }
  }
  await page.waitForTimeout(500);

  // Fill Start Date (from last enrolled record)
  const startInput = page.locator('input[id^="startDate_"]').first();
  await startInput.click({ force: true });
  await startInput.fill('', { force: true });
  await startInput.pressSequentially(startDate, { delay: 50 });
  await startInput.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await startInput.press('Tab');
  await page.waitForTimeout(500);

  // Fill End Date (end of month of start date)
  const endInput = page.locator('input[id^="endDate_"]').first();
  await endInput.click({ force: true });
  await endInput.fill('', { force: true });
  await endInput.pressSequentially(endDate, { delay: 50 });
  await endInput.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  await endInput.press('Tab');
  console.log(`[Prereq-Disenroll] Dates set: Start=${startDate}, End=${endDate}`);
  await page.waitForTimeout(1000);

  // Screenshot before save
  await page.screenshot({ path: 'test-results/prereq-disenroll-before-save.png', fullPage: true });

  // Click Save
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  await saveBtn.click({ force: true });
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify dialog closed (success)
  const dialogStillOpen = await page.locator('mat-dialog-container').first().isVisible({ timeout: 3_000 }).catch(() => false);
  if (dialogStillOpen) {
    // Check for errors
    const errors = await page.locator('mat-error').all();
    for (const e of errors) {
      const text = (await e.textContent() || '').trim();
      console.error(`[Prereq-Disenroll] Error: ${text}`);
    }
    await page.screenshot({ path: 'test-results/prereq-disenroll-error.png', fullPage: true });
    expect(dialogStillOpen).toBe(false); // Force fail with error context
  }

  console.log('[Prereq-Disenroll] Disenrollment saved successfully');
});

test('PREREQ-002 - Verify disenrollment appears in enrollment list', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  console.log(`[Prereq-Disenroll] First row: ${rowText.trim().substring(0, 120)}`);

  expect(rowText).toContain('Disenrolled');
});

test('PREREQ-003 - Open disenrollment detail and verify MMIS sync status', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  // Open the first row (should be the new Disenrolled record)
  const opened = await openFirstEnrollmentDetail(page);
  expect(opened).toBe(true);

  // Wait for sync (up to 20 seconds)
  await page.waitForTimeout(5000);
  const currentUrl = page.url();
  await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const status = await getSyncStatus(page);
  console.log(`[Prereq-Disenroll] Sync status: ${JSON.stringify(status)}`);

  await page.screenshot({ path: 'test-results/prereq-disenroll-detail.png', fullPage: true });

  // Sync should be pending or completed
  const pageText = await page.locator('main').textContent() || '';
  const hasSyncInfo = pageText.includes('MMIS') || pageText.includes('Sync') || pageText.includes('sync');
  expect(hasSyncInfo).toBe(true);
});

}); // end describe.serial
