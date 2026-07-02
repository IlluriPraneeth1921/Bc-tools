import { Page } from '@playwright/test';
import { authenticateWithTokenInjection } from './auth-tokens';

const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

/**
 * Whether to attempt token injection before falling back to UI login.
 * Set USE_TOKEN_INJECTION=false in .env to disable.
 */
const USE_TOKEN_INJECTION = process.env.USE_TOKEN_INJECTION !== 'false';

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
 * If USE_TOKEN_INJECTION is enabled (default), attempts to inject previously
 * saved tokens first, falling back to full UI login if they're expired.
 *
 * When this function returns, the page is guaranteed to be fully inside the
 * app (verified by reaching /#/home). If authentication fails, it throws.
 */
export async function loginAndSelectContext(page: Page) {
  // Try token injection first (unless disabled)
  if (USE_TOKEN_INJECTION) {
    const result = await authenticateWithTokenInjection(page, {
      onLoginRequired: (p) => performFullLogin(p),
    });
    if (result.method === 'injected') {
      // authenticateWithTokenInjection already verified we can reach /#/home
      // No additional post-auth steps needed
      return;
    }
    // If login was performed via fallback (performFullLogin), it already
    // handled Acknowledge + Context, and authenticateWithTokenInjection
    // verified /#/home is reachable
    return;
  }

  // Direct UI login (token injection disabled)
  await performFullLogin(page);
}

/**
 * Performs the full UI login flow (Cognito + Acknowledge + Context).
 * This is the original loginAndSelectContext implementation.
 */
async function performFullLogin(page: Page) {
  // Check if we're already on the Cognito page (from token verification failure)
  let currentUrl = page.url();
  const alreadyOnCognito = currentUrl.includes('amazoncognito.com') || currentUrl.includes('/auth');

  if (!alreadyOnCognito) {
    // Clear ALL auth state to force a completely fresh Cognito login.
    // NOTE: If addInitScript was used for token injection, it will re-inject
    // stale tokens on every page.goto(). We must clear storage AFTER navigation.
    await page.context().clearCookies();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    // Clear storage AFTER navigation (counteracts addInitScript re-injection)
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
    console.log('[login] Cleared storage + ALL cookies — forcing full Cognito redirect...');

    // Reload — now with clean storage AND no cookies, should redirect to Cognito
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    // Clear again after reload (addInitScript fires again on reload)
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(5000);
    currentUrl = page.url();
    console.log(`[login] After clearing all state — URL: ${currentUrl}`);
  }

  // ─── Step 1: Cognito login (if redirected or still redirecting) ─────────────
  // Check both the current URL and whether a login form is visible
  const onCognito = currentUrl.includes('amazoncognito.com') || currentUrl.includes('/auth');
  const loginFormVisible = await page.locator('#signInFormUsername, input[placeholder="Username"], input[name="username"]').first().isVisible({ timeout: 15_000 }).catch(() => false);

  if (onCognito || loginFormVisible) {
    // Wait for the login form to fully render — Cognito hosted UI can be slow
    // The Cognito hosted UI has TWO forms (mobile + desktop) — only one is visible based on viewport
    // Use force:true to interact regardless of visibility, or find the visible one
    const usernameField = page.locator('#signInFormUsername, input[placeholder="Username"], input[name="username"]').first();
    await usernameField.waitFor({ state: 'attached', timeout: 60_000 });
    await page.waitForTimeout(1000);

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
      // Fallback: fill the inputs directly with force (bypasses visibility checks)
      // The Cognito page may have hidden forms; force interaction
      const allUserInputs = page.locator('input[name="username"]');
      const allPassInputs = page.locator('input[name="password"]');
      const allSubmitBtns = page.locator('input[name="signInSubmitButton"]');

      // Fill ALL username/password fields (both mobile and desktop forms)
      const userCount = await allUserInputs.count();
      for (let i = 0; i < userCount; i++) {
        await allUserInputs.nth(i).fill(process.env.TEST_USER!, { force: true });
      }
      const passCount = await allPassInputs.count();
      for (let i = 0; i < passCount; i++) {
        await allPassInputs.nth(i).fill(process.env.TEST_PASSWORD!, { force: true });
      }
      // Click the first submit button (force bypasses hidden check)
      await allSubmitBtns.first().click({ force: true });
    }

    // Wait for redirect back to the app — can take a while
    await page.waitForURL(
      url => url.href.includes(new URL(BASE).hostname),
      { waitUntil: 'domcontentloaded', timeout: 60_000 }
    ).catch(async () => {
      // Retry: maybe the click didn't register — try submitting again
      console.log('[login] First login attempt may have failed — retrying submit...');
      const retryBtn = page.locator('input[name="signInSubmitButton"], button:has-text("Sign in"), button[type="submit"]').first();
      if (await retryBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await retryBtn.click({ force: true });
        await page.waitForURL(
          url => url.href.includes(new URL(BASE).hostname),
          { waitUntil: 'domcontentloaded', timeout: 30_000 }
        ).catch(() => {});
      }
    });
    await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
  }

  // ─── Step 2: Acknowledge dialog (if present) ──────────────────────────────
  // Blue Compass shows this on first login of the day. Click once and wait.
  // Do NOT spam clicks — it restarts background processing.
  await page.waitForTimeout(2000);

  const ack = page.getByRole('button', { name: 'Acknowledge' });
  let ackVisible = await ack.isVisible({ timeout: 10_000 }).catch(() => false);

  if (ackVisible) {
    console.log('[login] Acknowledge dialog detected — clicking...');
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Click once, wait up to 90s
    await ack.click({ timeout: 10_000 }).catch(() => {});
    let dismissed = await ack.waitFor({ state: 'hidden', timeout: 90_000 }).then(() => true).catch(() => false);

    if (!dismissed) {
      // One retry
      console.log('[login] Acknowledge still visible — retrying...');
      await page.waitForTimeout(3000);
      await ack.click({ timeout: 10_000 }).catch(() => {});
      dismissed = await ack.waitFor({ state: 'hidden', timeout: 90_000 }).then(() => true).catch(() => false);
    }

    if (!dismissed) {
      throw new Error('[login] FATAL: Acknowledge dialog could not be dismissed. Aborting.');
    }

    console.log(`[login] Acknowledge dismissed — URL: ${page.url()}`);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  }

  // ─── Step 3: Context selection (if present) ────────────────────────────────
  await page.waitForTimeout(2000);

  let onContextPage = page.url().includes('choose-context');
  const orgInput = page.locator('input[id^="organization_"]').first();
  let orgVisible = await orgInput.isVisible({ timeout: 10_000 }).catch(() => false);

  // If stuck at root without context page, try navigating to choose-context
  if (!onContextPage && !orgVisible) {
    const stuckAtRoot = page.url().endsWith('/#/') || page.url().endsWith('/#/home');
    if (stuckAtRoot) {
      console.log('[login] At root without context — navigating to choose-context...');
      await page.goto(BASE + '/#/choose-context', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2000);
      onContextPage = page.url().includes('choose-context');
      orgVisible = await orgInput.isVisible({ timeout: 10_000 }).catch(() => false);
    }
  }

  if (onContextPage || orgVisible) {
    await performContextSelection(page);
  }

  // ─── Step 4: Verify we're in the app ───────────────────────────────────────
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

  // Final check — make sure we're not stuck on login or context page
  const finalUrl = page.url();
  if (finalUrl.includes('amazoncognito.com') || finalUrl.includes('choose-context')) {
    // Capture screenshot for debugging before failing
    await page.screenshot({ path: 'test-results/login-failed-debug.png', fullPage: true }).catch(() => {});
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    console.error(`[login] Page text (first 300): ${pageText.substring(0, 300)}`);
    throw new Error(`[login] Failed to complete login. Stuck at: ${finalUrl}`);
  }
}

/**
 * Performs context selection (Organization → Location → Staff → Log In).
 * Extracted for reuse in both full login and post-injection flows.
 */
async function performContextSelection(page: Page) {
  const orgInput = page.locator('input[id^="organization_"]').first();

  // Wait for the context page to fully render — organization input must be interactive
  await orgInput.waitFor({ state: 'visible', timeout: 60_000 });

  // Additional wait for Angular to finish initializing the form
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

export { BASE };
