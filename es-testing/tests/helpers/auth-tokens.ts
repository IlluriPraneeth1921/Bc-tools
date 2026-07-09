/**
 * Token Injection & Session Management
 *
 * Handles authentication for Playwright tests against Blue Compass (Carity).
 * 
 * Flow:
 * 1. Try injecting saved tokens from disk → verify by reaching person page
 * 2. If injection fails → clear ALL auth state → full Cognito UI login
 * 3. After successful login → capture and save tokens for next run
 *
 * The key insight: Blue Compass requires BOTH valid Cognito tokens AND
 * a completed context selection (Org/Location/Staff). Token injection only
 * works if the saved tokens include the full session state.
 */

import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StoredTokens {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  capturedAt: string;
  expiresAt?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOKEN_STORAGE_PATH = path.resolve(__dirname, '../../.auth/stored-tokens.json');
const AUTH_DIR = path.resolve(__dirname, '../../.auth');

// ─── Token Storage ───────────────────────────────────────────────────────────

/** Saves captured tokens to disk for reuse across test runs. */
export async function saveTokensToDisk(tokens: StoredTokens): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
  console.log(`[auth-tokens] Tokens saved`);
}

/** Loads previously saved tokens from disk. Returns null if missing/expired. */
export function loadTokensFromDisk(): StoredTokens | null {
  if (!fs.existsSync(TOKEN_STORAGE_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(TOKEN_STORAGE_PATH, 'utf-8');
    const tokens: StoredTokens = JSON.parse(raw);

    if (tokens.expiresAt) {
      const expiry = new Date(tokens.expiresAt);
      if (new Date() >= expiry) {
        console.log(`[auth-tokens] Saved tokens expired — will re-login.`);
        return null;
      }
    }
    return tokens;
  } catch (err) {
    console.warn(`[auth-tokens] Failed to load tokens: ${(err as Error).message}`);
    return null;
  }
}

/** Deletes stored tokens from disk. */
export function deleteStoredTokens(): void {
  if (fs.existsSync(TOKEN_STORAGE_PATH)) {
    fs.unlinkSync(TOKEN_STORAGE_PATH);
  }
  const stateFile = path.resolve(AUTH_DIR, 'storage-state.json');
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

/** Saves a Playwright-compatible storageState JSON file. */
export async function saveStorageStateFile(tokens: StoredTokens): Promise<string> {
  const baseUrl = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';
  const origin = new URL(baseUrl).origin;
  const storageState = {
    cookies: tokens.cookies || [],
    origins: [{
      origin,
      localStorage: Object.entries(tokens.localStorage).map(([name, value]) => ({ name, value })),
    }],
  };
  const filePath = path.resolve(AUTH_DIR, 'storage-state.json');
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2), 'utf-8');
  return filePath;
}

// ─── Token Capture ───────────────────────────────────────────────────────────

/** Captures all auth-related tokens from the current browser page (after successful login). */
export async function captureAuthTokens(page: Page): Promise<StoredTokens> {
  const tokens = await page.evaluate(() => {
    const localData: Record<string, string> = {};
    const sessionData: Record<string, string> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) localData[key] = localStorage.getItem(key) || '';
    }
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) sessionData[key] = sessionStorage.getItem(key) || '';
    }
    return { localStorage: localData, sessionStorage: sessionData };
  });

  const cookies = await page.context().cookies();
  const cookieData = cookies.map(c => ({
    name: c.name, value: c.value, domain: c.domain, path: c.path,
    expires: c.expires, httpOnly: c.httpOnly, secure: c.secure,
    sameSite: c.sameSite as 'Strict' | 'Lax' | 'None',
  }));

  const stored: StoredTokens = {
    localStorage: tokens.localStorage,
    sessionStorage: tokens.sessionStorage,
    cookies: cookieData,
    capturedAt: new Date().toISOString(),
  };

  // Detect expiry from JWT if present
  const idTokenKey = Object.keys(tokens.localStorage).find(k => k.includes('idToken'));
  if (idTokenKey) {
    try {
      const jwt = tokens.localStorage[idTokenKey];
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      if (payload.exp) stored.expiresAt = new Date(payload.exp * 1000).toISOString();
    } catch { /* skip */ }
  }

  return stored;
}

// ─── Token Injection ─────────────────────────────────────────────────────────

/** 
 * Injects stored tokens using addInitScript (runs BEFORE Angular bootstraps).
 * This is critical — Angular's OIDC client reads tokens from storage during
 * initialization. If tokens aren't there when the app boots, the OIDC client
 * stays uninitialized and all API calls fail with 401.
 *
 * Also adds cookies to the context before any navigation.
 */
export async function injectAuthTokens(page: Page, tokens: StoredTokens): Promise<void> {
  const { localStorage: localData, sessionStorage: sessionData } = tokens;

  // Inject localStorage and sessionStorage via addInitScript
  // This runs in the page context BEFORE any app code executes
  await page.addInitScript(({ local, session }) => {
    for (const [key, value] of Object.entries(local)) {
      try { localStorage.setItem(key, value); } catch {}
    }
    for (const [key, value] of Object.entries(session)) {
      try { sessionStorage.setItem(key, value); } catch {}
    }
  }, { local: localData, session: sessionData });

  // Restore cookies via browser context (before any navigation)
  if (tokens.cookies?.length) {
    const validCookies = tokens.cookies.filter(c =>
      !(c.expires && c.expires > 0 && c.expires < Date.now() / 1000)
    );
    if (validCookies.length) {
      await page.context().addCookies(validCookies);
    }
  }
}

// ─── Verification ────────────────────────────────────────────────────────────

/**
 * Verifies the session is fully alive by navigating to /#/home and checking
 * that we don't get redirected to Cognito or stuck on Acknowledge/Context.
 * 
 * Does NOT call LoadUserContext API — that can return 401 during the initial
 * app bootstrap even with valid tokens (race condition with OIDC client init).
 * Instead, we verify we can reach the person page (requires full auth + context).
 */
export async function verifyFullyAuthenticated(page: Page): Promise<boolean> {
  const baseUrl = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';
  const personUuid = process.env.TEST_PERSON_UUID;

  // Navigate to the person page (requires full auth + context)
  const targetUrl = personUuid
    ? `${baseUrl}/#/persons/person/${personUuid}/dashboard`
    : `${baseUrl}/#/home`;

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const url = page.url();

  // FAIL: Redirected to Cognito
  if (url.includes('amazoncognito.com') || url.includes('/auth')) {
    return false;
  }

  // FAIL: Stuck on Acknowledge
  if (await page.getByRole('button', { name: 'Acknowledge' }).isVisible({ timeout: 2_000 }).catch(() => false)) {
    return false;
  }

  // FAIL: Stuck on context selection
  if (url.includes('choose-context') || await page.locator('input[id^="organization_"]').first().isVisible({ timeout: 2_000 }).catch(() => false)) {
    return false;
  }

  // SUCCESS: If we have a person UUID, check we landed on the person page
  if (personUuid && url.includes(personUuid)) {
    return true;
  }

  // SUCCESS: On home or any app page (not redirected)
  if (url.includes('/#/') && !url.endsWith('/#/')) {
    return true;
  }

  // FAIL: Redirected to root /#/ (likely context not set)
  return false;
}

// ─── Clean Login (no shortcuts) ──────────────────────────────────────────────

/**
 * Clears ALL browser auth state: localStorage, sessionStorage, cookies.
 * Also clears storage AFTER navigation to counteract any addInitScript that
 * may be re-injecting stale tokens on page load.
 * This forces a completely fresh Cognito login on next navigation.
 */
export async function clearAllAuthState(page: Page): Promise<void> {
  const baseUrl = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

  // Clear ALL cookies (including Cognito domain) to prevent silent renew
  await page.context().clearCookies();

  // Navigate to app origin so we can clear its storage
  // (addInitScript will fire here and re-inject, but we clear AFTER)
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });

  // Delete stored tokens file so they aren't re-injected on next attempt
  deleteStoredTokens();
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

/**
 * Full authentication flow: try injection, fall back to clean login.
 *
 * 1. If USE_TOKEN_INJECTION is enabled and tokens exist on disk:
 *    - Inject tokens → verify with LoadUserContext API
 *    - If verified → done (fast path)
 * 2. If injection fails or is disabled:
 *    - Clear ALL auth state (storage, cookies, stored tokens)
 *    - Perform full Cognito UI login (username/password → Acknowledge → Context)
 *    - Capture and save fresh tokens for next run
 *
 * When this function returns, the browser is fully authenticated.
 */
export async function authenticateWithTokenInjection(
  page: Page,
  options?: { onLoginRequired?: (page: Page) => Promise<void> },
): Promise<{ method: 'injected' | 'login'; tokensRefreshed: boolean }> {
  const useInjection = process.env.USE_TOKEN_INJECTION !== 'false';

  // ─── Try Token Injection ─────────────────────────────────────────────────
  if (useInjection) {
    const savedTokens = loadTokensFromDisk();
    if (savedTokens) {
      await injectAuthTokens(page, savedTokens);

      // Navigate to verify (addInitScript will fire on this navigation)
      const valid = await verifyFullyAuthenticated(page);
      if (valid) {
        console.log('[auth-tokens] ✓ Token injection successful');
        return { method: 'injected', tokensRefreshed: false };
      }

      console.log('[auth-tokens] ✗ Token injection failed — doing full login');
      // IMPORTANT: addInitScript is still active on this page and will re-inject
      // stale tokens on every navigation. We must clear storage after each navigation
      // in performFullLogin to counteract it. clearAllAuthState handles this.
    }
  }

  // ─── Full Clean Login ────────────────────────────────────────────────────
  // Clear everything to prevent stale state from interfering
  await clearAllAuthState(page);

  if (options?.onLoginRequired) {
    await options.onLoginRequired(page);
  } else {
    const { loginAndSelectContext } = await import('./login');
    await loginAndSelectContext(page);
  }

  const postLoginUrl = page.url();

  // Capture and save tokens for next run
  const freshTokens = await captureAuthTokens(page);
  await saveTokensToDisk(freshTokens);
  await saveStorageStateFile(freshTokens);

  return { method: 'login', tokensRefreshed: true };
}

// ─── Mid-Test Session Recovery ───────────────────────────────────────────────

/**
 * Call this when a page fails to render mid-test. Checks if session is alive,
 * and if not, performs a full clean re-authentication.
 *
 * @returns true if re-auth was performed (caller should retry navigation),
 *          false if session was fine (issue is something else)
 */
export async function ensureSessionAlive(page: Page): Promise<boolean> {
  const alive = await verifyFullyAuthenticated(page);
  if (alive) return false;

  console.log('[auth-tokens] Session expired — re-authenticating...');
  await clearAllAuthState(page);

  const { loginAndSelectContext } = await import('./login');
  // Force full login (no injection)
  const originalEnv = process.env.USE_TOKEN_INJECTION;
  process.env.USE_TOKEN_INJECTION = 'false';
  try {
    await loginAndSelectContext(page);
  } finally {
    if (originalEnv !== undefined) process.env.USE_TOKEN_INJECTION = originalEnv;
    else delete process.env.USE_TOKEN_INJECTION;
  }

  // Save fresh tokens
  const freshTokens = await captureAuthTokens(page);
  await saveTokensToDisk(freshTokens);
  await saveStorageStateFile(freshTokens);

  return true;
}

// ─── Legacy Exports (backward compat) ────────────────────────────────────────

export async function verifyTokensValid(page: Page): Promise<boolean> {
  return verifyFullyAuthenticated(page);
}

export async function isSessionExpired(page: Page): Promise<boolean> {
  return !(await verifyFullyAuthenticated(page));
}
