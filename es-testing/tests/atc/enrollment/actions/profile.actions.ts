/**
 * Profile Page Actions
 *
 * Reusable actions for the Person → Profile page.
 * Handles address editing, which has a unique UI pattern:
 *   - Hover over address card to reveal edit (pencil) icon
 *   - Click edit icon → inline edit form appears (not a dialog)
 *   - Modify fields → Save → form closes
 */
import { Page, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

/**
 * Navigates to the participant's profile page.
 * Waits for the Addresses section to render (loads progressively).
 */
export async function navigateToProfile(page: Page, participantUuid: string): Promise<void> {
  const profileUrl = `${BASE}/#/persons/person/${participantUuid}/record/profile`;
  await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  // Wait for the Addresses heading to appear (section loads progressively)
  await page.locator('text=Addresses').first().waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  // Scroll to it and give Angular time to render the address cards
  const addressesHeading = page.locator('text=Addresses').first();
  if (await addressesHeading.isVisible().catch(() => false)) {
    await addressesHeading.scrollIntoViewIfNeeded();
  }
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
}

/**
 * Opens the address edit form on the profile page.
 *
 * The UI pattern:
 *   1. Address card has a pencil/edit icon that may require hover to reveal
 *   2. The icon may have aria-label "Edit Address" or be a generic mat-icon "edit"
 *   3. Must NOT click the "Edit Name" button at the top of the page
 *
 * Returns true if the edit form opened (Street Address 1 input is visible).
 */
export async function openAddressEditForm(page: Page): Promise<boolean> {
  // Wait for actual address content to appear (e.g. a street address text)
  const addressContent = page.locator('text=/\\d+.*\\b(St|Ave|Rd|Dr|Blvd|Ln|Ct|Way)\\b/i').first();
  if (await addressContent.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await addressContent.scrollIntoViewIfNeeded();
    // Hover to potentially reveal the edit icon
    await addressContent.hover();
    await page.waitForTimeout(500); // brief yield for hover effects
  }

  // Strategy 1: Direct aria-label button
  const addressEditBtn = page.locator(
    'button[aria-label*="Edit Address"], button[aria-label*="edit address"]'
  ).first();
  if (await addressEditBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await addressEditBtn.scrollIntoViewIfNeeded();
    await addressEditBtn.evaluate((el: HTMLElement) => el.click());
    const streetInput = page.getByLabel(/Street Address 1/i).first();
    if (await streetInput.isVisible({ timeout: 5_000 }).catch(() => false)) return true;
  }

  // Strategy 2: Edit button near the "Addresses" heading
  const addressesHeading = page.locator('text=Addresses').first();
  if (await addressesHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addressesHeading.scrollIntoViewIfNeeded();
    const section = addressesHeading.locator('xpath=ancestor::*[3]');
    const sectionEditBtn = section.locator('button:has(mat-icon:text("edit"))').first();
    if (await sectionEditBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await sectionEditBtn.scrollIntoViewIfNeeded();
      await sectionEditBtn.evaluate((el: HTMLElement) => el.click());
      const streetInput = page.getByLabel(/Street Address 1/i).first();
      if (await streetInput.isVisible({ timeout: 5_000 }).catch(() => false)) return true;
    }
  }

  // Strategy 3: Find all edit buttons, skip any labeled "Name"
  const allEditBtns = page.locator('button:has(mat-icon:text("edit"))');
  const count = await allEditBtns.count();
  for (let i = 0; i < count; i++) {
    const ariaLabel = await allEditBtns.nth(i).getAttribute('aria-label').catch(() => '') || '';
    if (ariaLabel.includes('Name')) continue;
    await allEditBtns.nth(i).scrollIntoViewIfNeeded();
    await allEditBtns.nth(i).evaluate((el: HTMLElement) => el.click());
    const streetInput = page.getByLabel(/Street Address 1/i).first();
    if (await streetInput.isVisible({ timeout: 5_000 }).catch(() => false)) return true;
  }

  return false;
}

/**
 * Updates the street address on the profile page.
 *
 * Flow:
 *   1. Navigate to profile page
 *   2. Open address edit form
 *   3. Toggle "Street Address 1" (66 ↔ 67 prefix swap)
 *   4. Save and verify form closed
 *
 * Returns the new address value, or null if the update failed.
 */
export async function updateStreetAddress(page: Page, participantUuid: string): Promise<string | null> {
  await navigateToProfile(page, participantUuid);

  const formOpened = await openAddressEditForm(page);
  if (!formOpened) {
    console.error('[profile] Could not open address edit form');
    return null;
  }

  const streetInput = page.getByLabel(/Street Address 1/i).first();
  const currentValue = await streetInput.inputValue();

  // Toggle between "66 E Brooklyn St" and "67 E Brooklyn St"
  const newValue = currentValue.startsWith('66')
    ? currentValue.replace('66', '67')
    : currentValue.replace('67', '66');

  // Clear and retype — use selectText + pressSequentially to trigger Angular ngModel dirty state
  await streetInput.click();
  await streetInput.selectText();
  await page.waitForTimeout(300);
  await streetInput.pressSequentially(newValue, { delay: 50 });
  // Tab out to trigger blur/change events that Angular listens for
  await streetInput.press('Tab');
  await page.waitForTimeout(500);

  // Verify value took
  const updatedValue = await streetInput.inputValue();
  if (updatedValue !== newValue) {
    console.error(`[profile] Input value mismatch: expected "${newValue}", got "${updatedValue}"`);
    return null;
  }

  // Scroll down to make Save button visible (it's at the bottom of the form)
  const saveBtn = page.locator('button').filter({ hasText: /Save/i }).first();
  await saveBtn.scrollIntoViewIfNeeded();
  await expect(saveBtn).toBeVisible({ timeout: 5_000 });

  // Check if Save is enabled
  const isDisabled = await saveBtn.isDisabled();
  if (isDisabled) {
    console.log('[profile] Save button is disabled — forcing form dirty');
    await streetInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(500);
  }

  // Click save
  await saveBtn.evaluate((el: HTMLElement) => el.click());
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  // Wait for form to close
  await streetInput.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
  const formStillOpen = await streetInput.isVisible({ timeout: 2_000 }).catch(() => false);
  if (formStillOpen) {
    const errorMsg = await page.locator('.mat-error, .error-message, [role="alert"]')
      .first().textContent().catch(() => '');
    console.error(`[profile] Form still open after save. Errors: "${errorMsg}"`);
    await page.screenshot({ path: 'test-results/tc014-form-not-closed.png', fullPage: true }).catch(() => {});
    return null;
  }

  // Confirm new value appears on page
  await expect(page.locator(`text=${newValue}`).first()).toBeVisible({ timeout: 10_000 });
  console.log(`[profile] Address updated: "${currentValue}" → "${newValue}"`);
  return newValue;
}
