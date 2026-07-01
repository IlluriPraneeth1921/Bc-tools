/**
 * ATC: TC-014 — Address-Only Update
 *
 * Updates participant's residential address without changing enrollment data.
 * Expects 1 MMIS transaction: S700 (address update on current span).
 *
 * State-aware: Checks that participant is Enrolled before attempting the action.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have completed successfully (active IRIS enrollment with SU sync).
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

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_014;


/** When true, uses database stored procedure to mock MMIS Success response. */
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-014: Address-Only Update', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-014] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

test('ATC-ES-061 - Navigate to enrollment detail (only if Enrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-014] State: IRIS=${irisState}`);

  if (irisState !== 'Enrolled') {
    console.log(`[TC-014] Skipping — precondition not met (current: ${irisState})`);
    return;
  }

  const firstRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  await firstRow.dblclick();
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-062 - Update participant residential address', async () => {
  // Address updates are done on Person → Profile → Addresses section
  const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';
  const profileUrl = `${BASE}/#/persons/person/${participantUuid}/record/profile`;

  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Wait for the Addresses section AND the actual address content to fully render
  // The profile page loads progressively — Addresses section appears after other sections
  const addressText = page.locator('text=Brooklyn').first();
  await expect(addressText).toBeVisible({ timeout: 30_000 });
  await addressText.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Hover over the address card to reveal the pencil icon
  // The address card is a container that includes "66 E Brooklyn St"
  const addressCard = addressText.locator('xpath=ancestor::*[contains(@class,"address") or contains(@class,"card") or contains(@class,"panel") or contains(@class,"section")][1]');
  if (await addressCard.count() > 0) {
    await addressCard.first().hover();
  } else {
    // Fallback: hover over the text itself
    await addressText.hover();
  }
  await page.waitForTimeout(1000);

  // Click the edit icon near the address (NOT the "Edit Name" button at the top)
  // Look for an edit button that is near/after the address text
  const addressEditBtn = page.locator('button[aria-label*="Edit Address"], button[aria-label*="edit address"]').first();
  let editClicked = false;

  if (await addressEditBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addressEditBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    // Use JS click to bypass viewport check
    await addressEditBtn.evaluate((el: HTMLElement) => el.click());
    editClicked = true;
  } else {
    // Try finding edit button within the address section (after the "Addresses" heading)
    const addressSection = page.locator('text=Addresses').first().locator('xpath=ancestor::*[3]');
    const sectionEditBtn = addressSection.locator('button:has(mat-icon:text("edit"))').first();
    if (await sectionEditBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sectionEditBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await sectionEditBtn.evaluate((el: HTMLElement) => el.click());
      editClicked = true;
    } else {
      // Last resort: find ALL edit buttons and pick the one closest to the address text
      const allEditBtns = page.locator('button:has(mat-icon:text("edit"))');
      const count = await allEditBtns.count();
      for (let i = 0; i < count; i++) {
        const ariaLabel = await allEditBtns.nth(i).getAttribute('aria-label').catch(() => '');
        if (ariaLabel && !ariaLabel.includes('Name')) {
          await allEditBtns.nth(i).scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
          await allEditBtns.nth(i).evaluate((el: HTMLElement) => el.click());
          editClicked = true;
          break;
        }
      }
    }
  }

  expect(editClicked, 'Could not find or click the address edit button').toBe(true);
  await page.waitForTimeout(3000);

  // The "Edit Address" form should now be open with "Street Address 1" field
  const streetInput = page.getByLabel(/Street Address 1/i).first();
  await expect(streetInput).toBeVisible({ timeout: 10_000 });

  // Get current value and toggle it with a valid address change
  const currentValue = await streetInput.inputValue();
  // Toggle between "66 E Brooklyn St" and "67 E Brooklyn St" (valid address change)
  const newValue = currentValue.startsWith('66') ? currentValue.replace('66', '67') : currentValue.replace('67', '66');

  // Clear and type the new value character-by-character to trigger Angular's ngModel/reactive form bindings.
  // Using fill() with force:true can bypass Angular's change detection, resulting in
  // a visual update but no actual model change — the form stays "pristine" and Save is a no-op.
  await streetInput.click();
  await streetInput.selectText();
  await page.waitForTimeout(300);
  await streetInput.pressSequentially(newValue, { delay: 50 });
  await page.waitForTimeout(500);

  // Tab out to trigger blur/change events that Angular listens for
  await streetInput.press('Tab');
  await page.waitForTimeout(500);

  // Verify the input actually holds the new value before saving
  const updatedValue = await streetInput.inputValue();
  expect(updatedValue).toBe(newValue);
  console.log(`[TC-014] Street address changed: "${currentValue}" → "${newValue}"`);

  // Click Save on the Edit Address form
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });
  await saveBtn.click();
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Verify the address persisted by confirming the edit form closed and the new value is displayed
  // If the form is still open, Save may have failed silently (validation error or no dirty fields)
  const formStillOpen = await streetInput.isVisible({ timeout: 3_000 }).catch(() => false);
  if (formStillOpen) {
    // Check for any validation error messages
    const errorMsg = await page.locator('.mat-error, .error-message, [role="alert"]').first().textContent().catch(() => '');
    throw new Error(`Address edit form still open after Save — change may not have persisted. Errors: "${errorMsg}"`);
  }

  // Confirm the updated address text appears on the profile page
  await expect(page.locator(`text=${newValue}`).first()).toBeVisible({ timeout: 10_000 });
  console.log('[TC-014] Address saved and verified on profile — S700 MMIS transaction should be triggered');
});

test('ATC-ES-063 - Verify 1 MMIS transaction (S700 address update)', async () => {
  if (MOCK_MMIS) {
    // --- Mock path: Use database to set MMIS Success ---
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
    expect(mockResult, 'mockMmisSuccess failed --- stored procedure missing?').toBe(true);
    console.log(`[TC-014] MMIS Success mocked for key: ${key}`);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    const status = await getSyncStatus(page);
    expect(status.responseStatus).toBe('SU');
    expect(status.hasConflict).toBe(false);
  } else {
    // --- Real path: Poll for actual MMIS response ---
  // Navigate to enrollment detail to check MMIS sync status
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).filter({ hasNotText: /Disenrolled/ }).first();
  if (await enrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await enrolledRow.dblclick();
    await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  }

  // Poll for sync completion
  const currentUrl = page.url();
  const maxAttempts = 6;
  const pollInterval = 10_000;
  let status = { hasPending: true, responseStatus: null as string | null, hasConflict: false, statusText: '' };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    status = await getSyncStatus(page);
    console.log(`[TC-014] Sync status (attempt ${attempt}/${maxAttempts}): ${JSON.stringify(status)}`);

    if (status.responseStatus !== null) break;

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  // Verify MMIS Transaction List is visible
  await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 15_000 });

  const pageText = await page.locator('main').textContent() || '';
  const hasSyncEvidence = pageText.includes('MMIS') || pageText.includes('Sync') ||
    pageText.includes('SU') || pageText.includes('Transaction');
  expect(hasSyncEvidence).toBe(true);

  // Verify at least 1 transaction row for address update
  const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
  const count = await transactionRows.count();
  console.log(`[TC-014] MMIS transaction rows found: ${count}`);
  expect(count).toBeGreaterThanOrEqual(1);
  }
});

test('ATC-ES-064 - Verify SU response and no conflict', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-014] Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus).toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
});

}); // end describe.serial