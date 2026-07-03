/**
 * Assignment Page Actions
 *
 * Reusable actions for the Person → Assignments → Location Assignments page.
 * URL: /#/persons/person/{uuid}/assignments/location-assignments
 *
 * UI Pattern for ICA Transfer:
 *   1. Navigate to location-assignments page
 *   2. Find the active ICA row (status = "Active", type = "ICA")
 *   3. Click the three-dot menu (⋮) on that row
 *   4. Wait for "Transfer" menu item to appear (loads slowly)
 *   5. Click "Transfer" → opens "Location Assignment Transfer" panel/form
 *   6. Select new Location from dropdown
 *   7. Fill Effective Start Date
 *   8. Click Save
 */
import { Page, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

export interface IcaTransferOptions {
  /** New location name as shown in dropdown (e.g. 'TMG (The Management Group)') */
  newLocation: string;
  /** Effective start date (MM/DD/YYYY) */
  effectiveDate: string;
}

/**
 * Navigates to the participant's Location Assignments page.
 */
export async function navigateToAssignments(page: Page, participantUuid: string): Promise<void> {
  const url = `${BASE}/#/persons/person/${participantUuid}/assignments/location-assignments`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
}

/**
 * Performs an ICA transfer via the Location Assignments page.
 *
 * Flow:
 *   1. Find the active ICA row in the assignments table
 *   2. Click the three-dot (⋮) menu on that row
 *   3. Wait for "Transfer" menu item (loads slowly) and click it
 *   4. In the "Location Assignment Transfer" form:
 *      - Select Location from dropdown
 *      - Fill Effective Start Date
 *   5. Click Save
 *
 * Returns true if the transfer was saved successfully.
 */
export async function performIcaTransferViaAssignments(
  page: Page,
  participantUuid: string,
  opts: IcaTransferOptions,
): Promise<boolean> {
  await navigateToAssignments(page, participantUuid);

  // Find the active ICA row — wait specifically for a row containing both "Active" and "ICA"
  const icaRow = page.locator('mat-row').filter({ hasText: 'Active' }).filter({ hasText: 'ICA' }).first();
  await icaRow.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  if (!(await icaRow.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.error('[assignment] No active ICA row found');
    return false;
  }
  console.log('[assignment] Found active ICA row');

  // Click the three-dot (⋮) menu button on the ICA row
  await icaRow.scrollIntoViewIfNeeded();

  // The menu button has aria-label="more options" and class contains "mat-mdc-menu-trigger"
  const menuBtn = icaRow.locator('button[aria-label="more options"], button.mat-mdc-menu-trigger').first();
  await menuBtn.waitFor({ state: 'visible', timeout: 10_000 });

  // Click via evaluate to bypass any CDK overlay backdrop interception
  await menuBtn.evaluate((el: HTMLElement) => el.click());

  // Wait for the CDK overlay menu to appear
  await page.locator('.cdk-overlay-container .mat-mdc-menu-panel, .cdk-overlay-container [role="menu"]')
    .waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});

  // Wait for "Transfer" menu item — it takes 1-2 seconds to load
  const transferItem = page.locator('[role="menuitem"]').filter({ hasText: /Transfer/ }).first();

  if (!(await transferItem.isVisible({ timeout: 10_000 }).catch(() => false))) {
    // Broader fallback: any button/span in the overlay with "Transfer" text
    const fallbackTransfer = page.locator('.cdk-overlay-container button, .cdk-overlay-container span')
      .filter({ hasText: /^Transfer$/ }).first();
    if (!(await fallbackTransfer.isVisible({ timeout: 5_000 }).catch(() => false))) {
      console.error('[assignment] Transfer menu item did not appear');
      return false;
    }
    await fallbackTransfer.click({ force: true });
  } else {
    await transferItem.click({ force: true });
  }

  // Wait for the transfer form to appear after clicking Transfer
  // The form contains an "Effective Start Date" input and a Location mat-select
  // Wait for any sign the form loaded — date input or a new mat-select appearing
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // Give the panel/side-sheet time to animate in
  await page.waitForTimeout(2_000);

  // Look for the Effective Start Date input as indicator the form loaded
  // Angular Material date inputs may have various attributes depending on configuration:
  //  - placeholder containing MM/DD or mm/dd
  //  - aria-label with "Effective", "Start Date", or "Date"
  //  - matInput inside a mat-form-field whose mat-label mentions "Effective" or "Date"
  const effInput = page.locator([
    'input[placeholder*="MM/DD"]',
    'input[placeholder*="mm/dd"]',
    'input[placeholder*="M/D"]',
    'input[aria-label*="Effective"]',
    'input[aria-label*="Start Date"]',
    'input[aria-label*="start date"]',
    'input[aria-label*="Date"]',
    'input[matInput]',
  ].join(', ')).first();
  await effInput.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  if (!(await effInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
    // Broader fallback: look for any input inside a mat-form-field that has a label containing "Effective" or "Date"
    const formFieldInput = page.locator('mat-form-field:has(mat-label:text-matches("Effective|Date|date", "i")) input').first();
    await formFieldInput.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});

    if (!(await formFieldInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      console.error('[assignment] Transfer form did not open — no date input found');
      return false;
    }
    console.log('[assignment] Transfer form opened (via mat-form-field fallback)');
  } else {
    console.log('[assignment] Transfer form opened');
  }

  // Select Location from the dropdown IN the transfer form
  // The form's mat-select is labeled "Location" — find it by looking near the "Location*" label
  // Use the mat-select that is inside the transfer form panel (not the page nav)
  const formPanel = page.locator('.cdk-overlay-pane, [class*="side-panel"], [class*="transfer"]').last();
  let locDropdown = formPanel.locator('mat-select').first();

  if (!(await locDropdown.isVisible({ timeout: 5_000 }).catch(() => false))) {
    // Fallback: find mat-select near the "Location" label text
    locDropdown = page.locator('mat-select').filter({
      has: page.locator('[class*="select-trigger"], .mat-mdc-select-trigger')
    }).last(); // last mat-select is more likely the form one (not nav)
  }

  if (await locDropdown.isVisible({ timeout: 5_000 }).catch(() => false)) {
    // Click the arrow to open
    await locDropdown.click({ force: true });

    // Wait for options to load
    await page.locator('mat-option').first().waitFor({ state: 'visible', timeout: 10_000 });

    // TMG is at the bottom — scroll the panel to the end
    const panel = page.locator('.mat-mdc-select-panel, .mat-select-panel').first();
    if (await panel.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
      await page.waitForTimeout(500); // yield for scroll rendering
    }

    // Now find and click TMG
    const locationOpt = page.locator('mat-option').filter({ hasText: new RegExp(opts.newLocation, 'i') }).first();
    await locationOpt.scrollIntoViewIfNeeded().catch(() => {});

    if (await locationOpt.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await locationOpt.click({ force: true });
      await page.locator('mat-option').first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    } else {
      console.error(`[assignment] Location option "${opts.newLocation}" not found after scrolling`);
      return false;
    }
  } else {
    console.error('[assignment] Location mat-select not found in transfer form');
    return false;
  }

  // Fill Effective Start Date
  // Use a broader strategy: find any date input in the transfer form area
  let effDateInput = page.locator('input[aria-label*="Effective"], input[placeholder*="MM/DD"], input[placeholder*="mm/dd"]').first();

  if (!(await effDateInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
    // Try mat-form-field approach
    effDateInput = page.locator('mat-form-field:has(mat-label:text-matches("Effective|Date|Start", "i")) input').first();
  }

  if (!(await effDateInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
    // Last resort: look for a matInput inside overlay/panel area that looks like a date field
    const allInputs = page.locator('.cdk-overlay-container input, [class*="side-panel"] input, mat-form-field input');
    const count = await allInputs.count();
    for (let i = 0; i < count; i++) {
      const placeholder = await allInputs.nth(i).getAttribute('placeholder').catch(() => '') || '';
      const ariaLabel = await allInputs.nth(i).getAttribute('aria-label').catch(() => '') || '';
      const type = await allInputs.nth(i).getAttribute('type').catch(() => '') || '';
      if (placeholder.match(/[Mm\/Dd]/i) || ariaLabel.match(/date|effective|start/i) || type === 'date') {
        effDateInput = allInputs.nth(i);
        break;
      }
    }
  }

  if (await effDateInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await effDateInput.evaluate((el: HTMLElement) => {
      (el as HTMLInputElement).focus();
      (el as HTMLInputElement).click();
    });
    await effDateInput.fill('', { force: true });
    await effDateInput.pressSequentially(opts.effectiveDate, { delay: 50 });
    await effDateInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    await effDateInput.press('Tab');
    console.log(`[assignment] Effective date set: ${opts.effectiveDate}`);
  } else {
    console.error('[assignment] Effective Start Date input not found');
    return false;
  }

  // Click Save (also behind overlay — use evaluate)
  const saveBtn = page.locator('button').filter({ hasText: /Save/i }).first();
  await saveBtn.scrollIntoViewIfNeeded();
  if (await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await saveBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  } else {
    console.error('[assignment] Save button not found');
    return false;
  }

  console.log('[assignment] ICA transfer saved');
  return true;
}
