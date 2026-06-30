import { Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

/**
 * Fills a mat-autocomplete field by typing and selecting from the dropdown.
 * Handles readonly inputs and Angular Material overlays using evaluate() to
 * dispatch events directly, bypassing Playwright's actionability checks.
 */
async function selectAutocomplete(page: Page, inputSelector: string, value: string) {
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
  await page.waitForTimeout(300);

  await page.locator(inputSelector).first().fill(value, { force: true });
  await page.waitForTimeout(1000);

  const option = page.locator('mat-option').filter({ hasText: value }).first();
  await option.waitFor({ state: 'visible', timeout: 15_000 });
  await option.click();
  await page.waitForTimeout(500);
}

/**
 * Logs in via Cognito and completes context selection (Org/Location/Staff).
 * Handles multiple scenarios:
 * - Fresh login (Cognito → Acknowledge → Context → App)
 * - Already authenticated but needs context (skip Cognito)
 * - Fully authenticated (skip everything)
 */
export async function loginAndSelectContext(page: Page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 45_000 });

  // Wait to see where we land — Cognito, context page, or app home
  await page.waitForTimeout(3000);
  const currentUrl = page.url();

  // ─── Step 1: Cognito login (if redirected) ─────────────────────────────────
  if (currentUrl.includes('amazoncognito.com') || currentUrl.includes('auth') || await page.locator('input[placeholder="Username"], #signInFormUsername').first().isVisible({ timeout: 5_000 }).catch(() => false)) {
    // Try the standard Cognito hosted UI form first
    const form = page.locator(
      '.modal-content-mobile.visible-md form[name="cognitoSignInForm"], ' +
      '.modal-content-desktop form[name="cognitoSignInForm"]'
    ).first();
    const formFound = await form.isVisible({ timeout: 5_000 }).catch(() => false);

    if (formFound) {
      await form.locator('#signInFormUsername').fill(process.env.TEST_USER!, { force: true });
      await form.locator('#signInFormPassword').fill(process.env.TEST_PASSWORD!, { force: true });
      await form.locator('input[name="signInSubmitButton"]').click({ force: true });
    } else {
      // Fallback: simpler Cognito login form (different layout)
      const usernameInput = page.locator('input[placeholder="Username"], input[name="username"], #signInFormUsername').first();
      const passwordInput = page.locator('input[placeholder="Password"], input[name="password"], #signInFormPassword').first();
      const signInBtn = page.locator('button:has-text("Sign in"), input[name="signInSubmitButton"], button[type="submit"]').first();

      await usernameInput.waitFor({ state: 'visible', timeout: 10_000 });
      await usernameInput.fill(process.env.TEST_USER!, { force: true });
      await passwordInput.fill(process.env.TEST_PASSWORD!, { force: true });
      await signInBtn.click({ force: true });
    }

    // Wait for redirect back to the app
    await page.waitForURL(
      url => url.href.includes(new URL(BASE).hostname),
      { waitUntil: 'domcontentloaded', timeout: 45_000 }
    );
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
  }

  // ─── Step 2: Acknowledge dialog (if present) ──────────────────────────────
  const ack = page.getByRole('button', { name: 'Acknowledge' });
  const ackVisible = await ack.isVisible({ timeout: 5_000 }).catch(() => false);
  if (ackVisible) {
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button'))
        .find(el => el.textContent?.trim() === 'Acknowledge');
      if (b) (b as HTMLButtonElement).click();
    });
    await ack.waitFor({ state: 'hidden', timeout: 15_000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
  }

  // ─── Step 3: Context selection (if present) ────────────────────────────────
  await page.waitForTimeout(1000);
  const onContextPage = page.url().includes('choose-context');
  const orgInput = page.locator('input[id^="organization_"]').first();
  const orgVisible = await orgInput.isVisible({ timeout: 5_000 }).catch(() => false);

  if (onContextPage || orgVisible) {
    // Wait for org input to be ready
    await orgInput.waitFor({ state: 'visible', timeout: 15_000 });

    await selectAutocomplete(page, 'input[id^="organization_"]', process.env.TEST_ORG!);
    await selectAutocomplete(page, 'input[id^="location_"]', process.env.TEST_LOCATION!);
    await selectAutocomplete(page, 'input[id^="staffDelegation_"]', process.env.TEST_STAFF!);

    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(url => !url.href.includes('choose-context'), { timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 });
  }

  // ─── Step 4: Verify we're in the app ───────────────────────────────────────
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
}

export { BASE };
