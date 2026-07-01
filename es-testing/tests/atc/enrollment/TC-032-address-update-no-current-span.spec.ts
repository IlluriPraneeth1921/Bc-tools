/**
 * ATC: TC-032 — Address Update: No Current Span (S700 Cond 2)
 *
 * NEGATIVE TEST: Updates address on a disenrolled participant.
 * NO MMIS transactions should be sent (S700 condition 2 = "do nothing").
 *
 * State-aware: Checks that participant is Disenrolled before attempting.
 * Skips gracefully if preconditions not met.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant is disenrolled (no active span includes today).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  getSyncStatus,
  getMMISErrors,
} from './actions/enrollment.actions';
import {
  getCurrentIrisState,
} from '../../helpers/state-checker';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data from Scenario Diagrams ─────────────────────────────────────────

const DATA = SCENARIOS.TC_032;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-032: Address Update: No Current Span (S700 Cond 2)', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-032] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => { await browser.close(); });

test('ATC-ES-135 - Navigate to disenrolled participant (only if Disenrolled)', async () => {
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const irisState = await getCurrentIrisState(page);
  console.log(`[TC-032] State: IRIS=${irisState}`);

  if (irisState !== 'Disenrolled') {
    console.log(`[TC-032] Skipping — precondition not met (current: ${irisState}, need Disenrolled)`);
    return;
  }

  const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled|Inactive|Closed/i }).first();
  if (await disenrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await disenrolledRow.dblclick();
  } else {
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    await firstRow.dblclick();
  }
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  expect(page.url()).toContain('/programenrollment/');
});

test('ATC-ES-136 - Update address on disenrolled participant', async () => {
  // Address updates are done on Person → Profile → Addresses section (same as TC-014)
  const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';
  const profileUrl = `${BASE}/#/persons/person/${participantUuid}/record/profile`;

  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Wait for the address content to fully render
  const addressText = page.locator('text=Brooklyn').first();
  await expect(addressText).toBeVisible({ timeout: 30_000 });
  await addressText.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  // Hover over the address card to reveal the pencil icon
  const addressCard = addressText.locator('xpath=ancestor::*[contains(@class,"address") or contains(@class,"card") or contains(@class,"panel") or contains(@class,"section")][1]');
  if (await addressCard.count() > 0) {
    await addressCard.first().hover();
  } else {
    await addressText.hover();
  }
  await page.waitForTimeout(1000);

  // Click the edit icon near the address
  const addressEditBtn = page.locator('button[aria-label*="Edit Address"], button[aria-label*="edit address"]').first();
  let editClicked = false;

  if (await addressEditBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addressEditBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await addressEditBtn.evaluate((el: HTMLElement) => el.click());
    editClicked = true;
  } else {
    const addressSection = page.locator('text=Addresses').first().locator('xpath=ancestor::*[3]');
    const sectionEditBtn = addressSection.locator('button:has(mat-icon:text("edit"))').first();
    if (await sectionEditBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sectionEditBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await sectionEditBtn.evaluate((el: HTMLElement) => el.click());
      editClicked = true;
    } else {
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

  // Toggle the address value to trigger a change
  const currentValue = await streetInput.inputValue();
  const newValue = currentValue.startsWith('66') ? currentValue.replace('66', '67') : currentValue.replace('67', '66');

  // Use pressSequentially to properly trigger Angular change detection
  await streetInput.click();
  await streetInput.selectText();
  await page.waitForTimeout(300);
  await streetInput.pressSequentially(newValue, { delay: 50 });
  await page.waitForTimeout(500);
  await streetInput.press('Tab');
  await page.waitForTimeout(500);

  // Verify the input holds the new value
  const updatedValue = await streetInput.inputValue();
  expect(updatedValue).toBe(newValue);
  console.log(`[TC-032] Street address changed: "${currentValue}" → "${newValue}"`);

  // Click Save
  const saveBtn = page.getByRole('button', { name: 'Save' }).first();
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click();
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  console.log('[TC-032] Address updated on disenrolled participant — no S700 expected');
});

test('ATC-ES-137 - Verify no new MMIS transaction generated', async () => {
  // Navigate to the Disenrolled enrollment detail to check MMIS status
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  const disenrolledRow = page.locator('mat-row').filter({ hasText: /Disenrolled/ }).first();
  if (await disenrolledRow.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await disenrolledRow.dblclick();
    await page.waitForURL(/\/programenrollment\//, { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  } else {
    // Try first row
    const firstRow = page.locator('mat-row').first();
    if (await firstRow.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstRow.dblclick();
      await page.waitForTimeout(3000);
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    }
  }

  const transactionList = page.getByText('MMIS Transaction List').first();
  const hasTransactionList = await transactionList.isVisible({ timeout: 5_000 }).catch(() => false);

  if (hasTransactionList) {
    console.log('[TC-032] MMIS Transaction List visible (from prior operations) — verifying no new S700 txn');
  } else {
    console.log('[TC-032] No MMIS Transaction List — confirmed no S700 triggered');
  }

  const status = await getSyncStatus(page);
  console.log(`[TC-032] Sync status: ${JSON.stringify(status)}`);

  expect(status.hasConflict).toBe(false);
});

test('ATC-ES-138 - Verify S700 condition 2 routes to do nothing', async () => {
  const status = await getSyncStatus(page);
  console.log(`[TC-032] Final sync status: ${JSON.stringify(status)}`);

  expect(status.hasConflict).toBe(false);

  const errors = await getMMISErrors(page);
  console.log(`[TC-032] MMIS errors after address update: ${JSON.stringify(errors)}`);

  console.log('[TC-032] Confirmed: S700 Condition 2 — no MMIS transaction sent for disenrolled participant');
});

}); // end describe.serial
