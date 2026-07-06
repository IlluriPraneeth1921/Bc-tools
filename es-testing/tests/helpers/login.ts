import { Page, expect } from '@playwright/test';
import { authenticateWithTokenInjection } from './auth-tokens';

const BASE = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

/**
 * Whether to attempt token injection before falling back to UI login.
 * Set USE_TOKEN_INJECTION=false in .env to disable.
 */
const USE_TOKEN_INJECTION = process.env.USE_TOKEN_INJECTION !== 'false';

/**
 * Fills a mat-autocomplete combobox field by typing and selecting from the dropdown.
 * Uses keyboard.type() to trigger Angular's autocomplete panel naturally,
 * then uses dispatchEvent('click') on the mat-option for reliable selection.
 *
 * This approach mirrors the carity test pattern — avoids evaluate() hacks
 * and works reliably with Angular Material's overlay system.
 */
async function selectAutocomplete(page: Page, inputSelector: string, value: string, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const input = page.locator(inputSelector).first();
      await input.waitFor({ state: 'visible', timeout: 30_000 });

      // Focus and clear the field
      await input.focus();
      await input.clear();

      // Type the value character by character — this triggers Angular's
      // autocomplete filter naturally through real keyboard events
      await page.keyboard.type(value, { delay: 50 });

      // Wait for mat-option to appear in the overlay
      const option = page.locator('mat-option').filter({ hasText: new RegExp(value, 'i') }).first();
      await expect(option).toBeVisible({ timeout: 15_000 });

      // Use dispatchEvent('click') for reliable selection through Angular's event system
      await option.dispatchEvent('click');

      // Verify the input was populated (Angular commits the selection)
      await expect(input).not.toHaveValue('', { timeout: 5_000 });

      // Wait for any overlay to close
      await page.locator('.cdk-overlay-backdrop, .mat-autocomplete-panel')
        .first().waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});

      return; // Success
    } catch (err) {
      console.warn(`[login] Autocomplete "${value}" failed (attempt ${attempt}/${retries}): ${(err as Error).message?.substring(0, 120)}`);
      if (attempt === retries) throw err;

      // Close any stale overlay before retrying
      await page.keyboard.press('Escape');
      await page.locator('body').click({ position: { x: 0, y: 0 }, force: true }).catch(() => {});
      await page.waitForTimeout(1500);
    }
  }
}


/**
 * Logs in via Cognito and completes context selection (Org/Location/Staff).
 *
 * If USE_TOKEN_INJECTION is enabled (default), attempts to inject previously
 * saved tokens first, falling back to full UI login if they're expired.
 *
 * When this function returns, the page is guaranteed to be fully inside the
 * app (verified by reaching /#/home). If authentication fails, it throws.
 */
export async function loginAndSelectContext(page: Page) {
  if (USE_TOKEN_INJECTION) {
    const result = await authenticateWithTokenInjection(page, {
      onLoginRequired: (p) => performFullLogin(p),
    });
    // authenticateWithTokenInjection already verified we reached the app
    return;
  }

  // Direct UI login (token injection disabled)
  await performFullLogin(page);
}

/**
 * Performs the full UI login flow: Cognito → Acknowledge → Context → App.
 */
async function performFullLogin(page: Page) {
  // Determine if we're already on Cognito (e.g., from failed token injection)
  let currentUrl = page.url();
  const alreadyOnCognito = currentUrl.includes('amazoncognito.com') ||
    currentUrl.includes('/login') || currentUrl.includes('/auth');

  if (!alreadyOnCognito) {
    // Force fresh Cognito redirect by clearing all auth state
    await page.context().clearCookies();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });

    // Reload with clean state — should redirect to Cognito
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    }).catch(() => {});

    // Wait for Cognito redirect — the Angular OIDC client will detect missing
    // tokens and redirect. This can take a few seconds.
    console.log('[login] Waiting for Cognito redirect...');
    await page.waitForURL(
      url => url.href.includes('amazoncognito.com') || url.href.includes('/login'),
      { timeout: 30_000 }
    ).catch(() => {});

    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    currentUrl = page.url();
    console.log(`[login] After clearing state — URL: ${currentUrl}`);
  }

  // ─── Step 1: Cognito login ──────────────────────────────────────────────────
  await performCognitoLogin(page, currentUrl);

  // ─── Step 2: Acknowledge dialog ─────────────────────────────────────────────
  await dismissAcknowledgeDialog(page);

  // ─── Step 3: Context selection ──────────────────────────────────────────────
  await handleContextSelection(page);

  // ─── Step 4: Verify we're in the app ────────────────────────────────────────
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  const finalUrl = page.url();
  if (finalUrl.includes('amazoncognito.com') || finalUrl.includes('choose-context')) {
    await page.screenshot({ path: 'test-results/login-failed-debug.png', fullPage: true }).catch(() => {});
    const bodyText = await page.locator('body').innerText().catch(() => '') || '';
    console.error(`[login] STUCK — Page text (first 300): ${bodyText.substring(0, 300)}`);
    throw new Error(`[login] Failed to complete login. Stuck at: ${finalUrl}`);
  }
}


/**
 * Handles Cognito hosted UI login form submission.
 * Supports both Cognito Hosted UI v1 (classic) and v2 (managed login):
 * - v1: #signInFormUsername / #signInFormPassword / input[name="signInSubmitButton"]
 * - v2 (managed): Various input fields with different IDs/names
 * Uses force:true on fills to handle multiple form variants.
 */
async function performCognitoLogin(page: Page, currentUrl: string) {
  // Always re-check the live URL — redirect may have happened after the parameter was captured
  const liveUrl = page.url();
  const onCognito = liveUrl.includes('amazoncognito.com') ||
    liveUrl.includes('/login') || currentUrl.includes('amazoncognito.com');
  
  if (!onCognito) {
    // One more check — wait briefly for a possible late redirect
    await page.waitForTimeout(3000);
    const recheckUrl = page.url();
    if (!recheckUrl.includes('amazoncognito.com') && !recheckUrl.includes('/login')) {
      console.log(`[login] Not on Cognito (URL: ${recheckUrl}) — skipping Cognito login`);
      return;
    }
  }

  console.log(`[login] On Cognito page — URL: ${page.url()}`);

  // Wait for page to fully load — Cognito managed login is a SPA
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Broad selector: find ANY visible text input that could be username
  const usernameSelectors = [
    '#signInFormUsername',
    'input[name="username"]',
    'input[type="email"]',
    'input[autocomplete="username"]',
    'input[id*="username"]',
    'input[id*="signIn"]',
    'input[placeholder*="ser"]',       // "Username" or "User"
    'input[placeholder*="mail"]',      // "Email"
  ].join(', ');

  const passwordSelectors = [
    '#signInFormPassword',
    'input[name="password"]',
    'input[type="password"]',
    'input[autocomplete="current-password"]',
  ].join(', ');

  const submitSelectors = [
    'input[name="signInSubmitButton"]',
    'button[type="submit"]',
    'button[name="signInSubmitButton"]',
    'input[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Sign In")',
    'button:has-text("Log in")',
  ].join(', ');

  // Wait for username input to appear — Cognito has DUAL forms (mobile + desktop).
  // Both have identical IDs but only one set is visible (based on viewport).
  // We must target the VISIBLE instance, not just .first() which grabs the hidden mobile one.
  const usernameField = page.locator(usernameSelectors).locator('visible=true').first();
  const usernameVisible = await usernameField.waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => true).catch(() => false);

  if (!usernameVisible) {
    // Dump page info for debugging
    const bodyText = await page.locator('body').innerText().catch(() => '(empty)');
    const inputs = await page.locator('input').count().catch(() => 0);
    const buttons = await page.locator('button').count().catch(() => 0);
    console.error(`[login] Cognito form NOT found! Page has ${inputs} inputs, ${buttons} buttons.`);
    console.error(`[login] Page text (first 500): ${bodyText.substring(0, 500)}`);
    // Try to dump all input attributes for debugging
    const inputDetails = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(el => ({
        id: el.id, name: el.name, type: el.type, placeholder: el.placeholder,
        visible: el.offsetParent !== null,
      }));
    }).catch(() => []);
    console.error(`[login] Inputs on page: ${JSON.stringify(inputDetails)}`);
    throw new Error('[login] Cognito login form not found — unable to authenticate');
  }

  console.log('[login] Cognito form detected — filling credentials...');

  // Fill username — target the VISIBLE instance (Cognito has hidden duplicate forms)
  await usernameField.fill(process.env.TEST_USER!, { force: true });
  await page.waitForTimeout(500);

  // Fill password — target visible instance
  const passwordField = page.locator(passwordSelectors).locator('visible=true').first();
  await passwordField.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await passwordField.fill(process.env.TEST_PASSWORD!, { force: true });
  await page.waitForTimeout(500);

  // Click submit — target visible instance
  const submitBtn = page.locator(submitSelectors).locator('visible=true').first();
  await submitBtn.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await submitBtn.click({ force: true });
  console.log('[login] Submit clicked — waiting for redirect...');

  // Wait for redirect back to app
  const appHostname = new URL(BASE).hostname;
  await page.waitForURL(url => url.href.includes(appHostname), {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  }).catch(async () => {
    // Check if we're still on Cognito — maybe wrong credentials or form changed
    const stillOnCognito = page.url().includes('amazoncognito.com');
    if (stillOnCognito) {
      console.log('[login] Still on Cognito after submit — checking for error messages...');
      const errorText = await page.locator('[id*="error"], .error, [class*="error"], [role="alert"]')
        .first().textContent().catch(() => '');
      if (errorText) {
        console.error(`[login] Cognito error: ${errorText.trim()}`);
      }
      // Retry: try submitting again
      const retryBtn = page.locator(submitSelectors).first();
      if (await retryBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await retryBtn.click({ force: true });
        await page.waitForURL(url => url.href.includes(appHostname), {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        }).catch(() => {});
      }
    }
  });

  await page.waitForLoadState('networkidle', { timeout: 45_000 }).catch(() => {});
  console.log(`[login] Cognito login complete — URL: ${page.url()}`);
}


/**
 * Dismisses the Acknowledge dialog if present.
 * Uses expect() with visibility check — clicks once and waits for dismissal.
 * Does NOT spam clicks (that restarts background processing).
 */
async function dismissAcknowledgeDialog(page: Page) {
  const ackButton = page.getByRole('button', { name: 'Acknowledge' });
  const isVisible = await ackButton.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!isVisible) return;

  console.log('[login] Acknowledge dialog detected — clicking...');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

  await ackButton.click({ timeout: 10_000 });
  const dismissed = await ackButton.waitFor({ state: 'hidden', timeout: 90_000 })
    .then(() => true).catch(() => false);

  if (!dismissed) {
    // Single retry
    console.log('[login] Acknowledge still visible — retrying...');
    await page.waitForTimeout(2000);
    await ackButton.click({ timeout: 10_000 }).catch(() => {});
    const retriedDismiss = await ackButton.waitFor({ state: 'hidden', timeout: 60_000 })
      .then(() => true).catch(() => false);
    if (!retriedDismiss) {
      throw new Error('[login] FATAL: Acknowledge dialog could not be dismissed.');
    }
  }

  console.log('[login] Acknowledge dismissed');
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
}

/**
 * Handles context selection page (Organization → Location → Staff → Log In).
 * Uses the cascading autocomplete pattern with proper waits between each field.
 */
async function handleContextSelection(page: Page) {
  await page.waitForTimeout(1500);

  const onContextPage = page.url().includes('choose-context');
  const orgInput = page.locator('input[id^="organization_"]').first();
  const orgVisible = await orgInput.isVisible({ timeout: 8_000 }).catch(() => false);

  if (!onContextPage && !orgVisible) {
    // Check if we're already in the app (no context needed)
    const url = page.url();
    if (url.includes('/#/') && !url.endsWith('/#/')) return;

    // Try navigating to context page
    if (url.endsWith('/#/') || url.endsWith('/#/home')) {
      await page.goto(BASE + '/#/choose-context', { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      const nowVisible = await orgInput.isVisible({ timeout: 8_000 }).catch(() => false);
      if (!nowVisible) return; // Already authenticated with context
    } else {
      return; // Already in app
    }
  }

  await performContextSelection(page);
}


/**
 * Performs context selection (Organization → Location → Staff → Log In).
 * Each field is a cascading dependency — Location loads after Organization,
 * Staff loads after Location. Uses expect() for robust waits instead of
 * arbitrary timeouts.
 */
async function performContextSelection(page: Page) {
  const orgInput = page.locator('input[id^="organization_"]').first();

  // Wait for the form to be fully interactive
  await expect(orgInput).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

  // 1. Organization (first in cascade)
  await selectAutocomplete(page, 'input[id^="organization_"]', process.env.TEST_ORG!);

  // 2. Location (cascading — wait for it to become interactive after Org selection)
  const locationInput = page.locator('input[id^="location_"]').first();
  await expect(locationInput).toBeVisible({ timeout: 30_000 });
  await expect(locationInput).toBeEnabled({ timeout: 10_000 });
  await selectAutocomplete(page, 'input[id^="location_"]', process.env.TEST_LOCATION!);

  // 3. Staff (cascading — wait for it to become interactive after Location selection)
  const staffInput = page.locator('input[id^="staffDelegation_"]').first();
  await expect(staffInput).toBeVisible({ timeout: 30_000 });
  await expect(staffInput).toBeEnabled({ timeout: 10_000 });
  await selectAutocomplete(page, 'input[id^="staffDelegation_"]', process.env.TEST_STAFF!);

  // 4. Click "Log In" button
  const loginBtn = page.getByRole('button', { name: /log in/i });
  await expect(loginBtn).toBeVisible({ timeout: 10_000 });
  await loginBtn.click();

  // Wait for navigation away from context page
  await page.waitForURL(url => !url.href.includes('choose-context'), { timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  console.log(`[login] Context selection complete — URL: ${page.url()}`);
}

export { BASE };
