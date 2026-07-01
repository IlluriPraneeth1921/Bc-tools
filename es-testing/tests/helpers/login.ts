import { Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

/**
 * Fills a mat-autocomplete field by typing and selecting from the dropdown.
 * Handles readonly inputs and Angular Material overlays using evaluate() to
 * dispatch events directly, bypassing Playwright's actionability checks.
 *
 * Includes retry logic for slow-loading dropdowns.
 */
async function selectAutocomplete(page: Page, inputSelector: string, value: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Wait for the input to be visible and enabled
      const input = page.locator(inputSelector).first();
      await input.waitFor({ state: 'visible', timeout: 30_000 });
      await input.waitFor({ state: 'attached', timeout: 5_000 });

      // Remove readonly and focus via evaluate
      await page.evaluate((sel) => {
        const el = document.querySelector(sel) as HTMLInputElement | null;
        if (el) {
          el.removeAttribute('readonly');
          el.focus();
          el.dispatchEvent(new Event('focusin', { bubbles: true }));
          el.click();
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, inputSelector);
      await page.waitForTimeout(500);

      // Clear and type the value
      await input.fill('', { force: true });
      await page.waitForTimeout(300);
      await input.fill(value, { force: true });

      // Wait for mat-option to appear — generous timeout for slow loads
      const option = page.locator('mat-option').filter({ hasText: value }).first();
      await option.waitFor({ state: 'visible', timeout: 20_000 });
      await option.click();
      await page.waitForTimeout(1000);

      // Success — verify the input now has a value
      const inputValue = await input.inputValue().catch(() => '');
      if (inputValue && inputValue.trim().length > 0) {
        return; // Successfully selected
      }

      // Value not set — retry
      console.warn(`[login] Autocomplete "${value}" selected but input empty (attempt ${attempt})`);
    } catch (err) {
      console.warn(`[login] Autocomplete failed for "${value}" (attempt ${attempt}/${retries}): ${(err as Error).message?.substring(0, 100)}`);
      if (attempt === retries) throw err;

      // Wait before retry — give the page time to load
      await page.waitForTimeout(3000);

      // Try clicking elsewhere to close any stale dropdown, then retry
      await page.locator('body').click({ position: { x: 0, y: 0 }, force: true }).catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Logs in via Cognito and completes context selection (Org/Location/Staff).
 * Handles multiple scenarios:
 * - Fresh login (Cognito → Acknowledge → Context → App)
 * - Already authenticated but needs context (skip Cognito)
 * - Fully authenticated (skip everything)
 *
 * Designed to be resilient against slow page loads on Blue Compass.
 */
export async function loginAndSelectContext(page: Page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });

  // Wait to see where we land — Cognito, context page, or app home
  // Use a longer initial wait since BC can be slow to redirect
  await page.waitForTimeout(3000);
  const currentUrl = page.url();

  // ─── Step 1: Cognito login (if redirected) ─────────────────────────────────
  if (currentUrl.includes('amazoncognito.com') || currentUrl.includes('auth') || await page.locator('input[placeholder="Username"], #signInFormUsername').first().isVisible({ timeout: 10_000 }).catch(() => false)) {
    // Try the standard Cognito hosted UI form first
    const form = page.locator(
      '.modal-content-mobile.visible-md form[name="cognitoSignInForm"], ' +
      '.modal-content-desktop form[name="cognitoSignInForm"]'
    ).first();
    const formFound = await form.isVisible({ timeout: 10_000 }).catch(() => false);

    if (formFound) {
      await form.locator('#signInFormUsername').fill(process.env.TEST_USER!, { force: true });
      await form.locator('#signInFormPassword').fill(process.env.TEST_PASSWORD!, { force: true });
      await form.locator('input[name="signInSubmitButton"]').click({ force: true });
    } else {
      // Fallback: simpler Cognito login form (different layout)
      const usernameInput = page.locator('input[placeholder="Username"], input[name="username"], #signInFormUsername').first();
      const passwordInput = page.locator('input[placeholder="Password"], input[name="password"], #signInFormPassword').first();
      const signInBtn = page.locator('button:has-text("Sign in"), input[name="signInSubmitButton"], button[type="submit"]').first();

      await usernameInput.waitFor({ state: 'visible', timeout: 15_000 });
      await usernameInput.fill(process.env.TEST_USER!, { force: true });
      await passwordInput.fill(process.env.TEST_PASSWORD!, { force: true });
      await signInBtn.click({ force: true });
    }

    // Wait for redirect back to the app — can take a while
    await page.waitForURL(
      url => url.href.includes(new URL(BASE).hostname),
      { waitUntil: 'domcontentloaded', timeout: 60_000 }
    );
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
  }

  // ─── Step 2: Acknowledge dialog (if present) ──────────────────────────────
  const ack = page.getByRole('button', { name: 'Acknowledge' });
  const ackVisible = await ack.isVisible({ timeout: 10_000 }).catch(() => false);
  if (ackVisible) {
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find(el => el.textContent?.trim() === 'Acknowledge');
      if (b) (b as HTMLButtonElement).click();
    });
    await ack.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  // ─── Step 3: Context selection (if present) ────────────────────────────────
  // Blue Compass context page can take a very long time to fully load.
  // Wait generously for the organization input to become visible.
  await page.waitForTimeout(2000);
  const onContextPage = page.url().includes('choose-context');
  const orgInput = page.locator('input[id^="organization_"]').first();
  const orgVisible = await orgInput.isVisible({ timeout: 10_000 }).catch(() => false);

  if (onContextPage || orgVisible) {
    // Wait for the context page to fully render — organization input must be interactive
    await orgInput.waitFor({ state: 'visible', timeout: 60_000 });

    // Additional wait for Angular to finish initializing the form
    // The autocomplete components need their data sources to be loaded
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Select Organization (first in cascade — must succeed before Location loads)
    await selectAutocomplete(page, 'input[id^="organization_"]', process.env.TEST_ORG!);

    // Wait for Location dropdown to load (cascading dependency on Organization)
    const locationInput = page.locator('input[id^="location_"]').first();
    await locationInput.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1500);

    // Select Location
    await selectAutocomplete(page, 'input[id^="location_"]', process.env.TEST_LOCATION!);

    // Wait for Staff dropdown to load (cascading dependency on Location)
    const staffInput = page.locator('input[id^="staffDelegation_"]').first();
    await staffInput.waitFor({ state: 'visible', timeout: 30_000 });
    await page.waitForTimeout(1500);

    // Select Staff
    await selectAutocomplete(page, 'input[id^="staffDelegation_"]', process.env.TEST_STAFF!);

    // Click "Log In" button
    const loginBtn = page.getByRole('button', { name: /log in/i });
    await loginBtn.waitFor({ state: 'visible', timeout: 10_000 });
    await page.waitForTimeout(500);
    await loginBtn.click();

    // Wait for navigation away from context page
    await page.waitForURL(url => !url.href.includes('choose-context'), { timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  // ─── Step 4: Verify we're in the app ───────────────────────────────────────
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

  // Final check — make sure we're not stuck on login or context page
  const finalUrl = page.url();
  if (finalUrl.includes('amazoncognito.com') || finalUrl.includes('choose-context')) {
    throw new Error(`[login] Failed to complete login. Stuck at: ${finalUrl}`);
  }
}

export { BASE };
