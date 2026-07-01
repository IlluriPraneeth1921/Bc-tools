/**
 * Token Injection — sessionStorage + localStorage Auth Bypass
 *
 * Injects Cognito tokens directly into browser storage, bypassing the full
 * Cognito Hosted UI login flow. This dramatically reduces test startup time
 * when the Cognito session is still valid.
 *
 * Pattern inspired by bender-os dual-mode execution model:
 * - In "inject" mode: tokens are written to storage before page load
 * - In "fallback" mode: if injection fails, falls back to full UI login
 *
 * How Cognito stores tokens (AWS Amplify/Cognito SDK):
 * - localStorage key pattern: `CognitoIdentityServiceProvider.<clientId>.<username>.<tokenType>`
 * - sessionStorage may also store: `amplify-signin-with-hostedUI` or session flags
 *
 * For Carity (Angular + Cognito Hosted UI), the tokens are stored after
 * the OAuth callback. This helper captures and restores those tokens.
 *
 * Usage:
 *   // Option A: Inject saved tokens (skips Cognito login entirely)
 *   await injectAuthTokens(page, savedTokens);
 *
 *   // Option B: Capture tokens after a successful login (for later reuse)
 *   const tokens = await captureAuthTokens(page);
 *
 *   // Option C: Full flow — try inject, fall back to UI login if expired
 *   await authenticateWithTokenInjection(page);
 */

import { Page, BrowserContext } from '@playwright/test';
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

/**
 * Known Cognito localStorage key patterns.
 * These are captured and restored to bypass login.
 */
const COGNITO_KEY_PATTERNS = [
  'CognitoIdentityServiceProvider',
  'amplify',
  'aws.cognito',
  'idToken',
  'accessToken',
  'refreshToken',
  'LastAuthUser',
  'clockDrift',
];

/**
 * Known sessionStorage key patterns for Carity/Angular apps.
 */
const SESSION_KEY_PATTERNS = [
  'amplify-signin-with-hostedUI',
  'amplify-redirected-from-hosted-ui',
  'userSession',
  'selectedOrganization',
  'selectedLocation',
  'selectedStaff',
  'context',
  'angular',
];

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Captures all auth-related tokens from the current browser page.
 * Call this AFTER a successful login to save tokens for later injection.
 *
 * Captures:
 * - All localStorage entries matching Cognito key patterns
 * - All sessionStorage entries matching known session patterns
 * - Cookies from the browser context
 */
export async function captureAuthTokens(page: Page): Promise<StoredTokens> {
  const tokens = await page.evaluate(({ localPatterns, sessionPatterns }) => {
    const localData: Record<string, string> = {};
    const sessionData: Record<string, string> = {};

    // Capture ALL localStorage (Cognito keys have complex patterns)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const matchesCognito = localPatterns.some((p: string) =>
          key.toLowerCase().includes(p.toLowerCase())
        );
        // Capture everything — we'll filter on restore if needed
        if (matchesCognito || key.startsWith('Cognito') || key.startsWith('aws')) {
          localData[key] = localStorage.getItem(key) || '';
        }
      }
    }

    // If no Cognito-specific keys found, capture ALL localStorage
    // (the app might use custom key names)
    if (Object.keys(localData).length === 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localData[key] = localStorage.getItem(key) || '';
        }
      }
    }

    // Capture sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionData[key] = sessionStorage.getItem(key) || '';
      }
    }

    return { localStorage: localData, sessionStorage: sessionData };
  }, { localPatterns: COGNITO_KEY_PATTERNS, sessionPatterns: SESSION_KEY_PATTERNS });

  // Capture cookies from the browser context
  const cookies = await page.context().cookies();
  const cookieData = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    expires: c.expires,
    httpOnly: c.httpOnly,
    secure: c.secure,
    sameSite: c.sameSite as 'Strict' | 'Lax' | 'None',
  }));

  const stored: StoredTokens = {
    localStorage: tokens.localStorage,
    sessionStorage: tokens.sessionStorage,
    cookies: cookieData,
    capturedAt: new Date().toISOString(),
  };

  // Try to determine token expiry from JWT (if present)
  const idTokenKey = Object.keys(tokens.localStorage).find(k => k.includes('idToken'));
  if (idTokenKey) {
    try {
      const jwt = tokens.localStorage[idTokenKey];
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      if (payload.exp) {
        stored.expiresAt = new Date(payload.exp * 1000).toISOString();
      }
    } catch {
      // JWT parsing failed — skip expiry detection
    }
  }

  return stored;
}

/**
 * Saves captured tokens to disk for reuse across test runs.
 * Stored at `.auth/stored-tokens.json` (gitignored).
 */
export async function saveTokensToDisk(tokens: StoredTokens): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_STORAGE_PATH, JSON.stringify(tokens, null, 2), 'utf-8');
  console.log(`[auth-tokens] Tokens saved to ${TOKEN_STORAGE_PATH}`);
}

/**
 * Loads previously saved tokens from disk.
 * Returns null if file doesn't exist or is corrupted.
 */
export function loadTokensFromDisk(): StoredTokens | null {
  if (!fs.existsSync(TOKEN_STORAGE_PATH)) {
    console.log('[auth-tokens] No saved tokens found on disk.');
    return null;
  }

  try {
    const raw = fs.readFileSync(TOKEN_STORAGE_PATH, 'utf-8');
    const tokens: StoredTokens = JSON.parse(raw);

    // Check if tokens are expired
    if (tokens.expiresAt) {
      const expiry = new Date(tokens.expiresAt);
      const now = new Date();
      if (now >= expiry) {
        console.log(`[auth-tokens] Saved tokens expired at ${tokens.expiresAt}. Will re-login.`);
        return null;
      }
      const minutesLeft = Math.round((expiry.getTime() - now.getTime()) / 60_000);
      console.log(`[auth-tokens] Tokens valid for ~${minutesLeft} minutes.`);
    }

    return tokens;
  } catch (err) {
    console.warn(`[auth-tokens] Failed to load tokens: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Injects stored tokens into the browser page via `addInitScript`.
 *
 * IMPORTANT: Must be called BEFORE navigating to the app URL.
 * `addInitScript` runs before any page JavaScript, so storage is
 * populated before the app's auth module reads it.
 *
 * Also restores cookies via the browser context.
 */
export async function injectAuthTokens(page: Page, tokens: StoredTokens): Promise<void> {
  const { localStorage: localData, sessionStorage: sessionData } = tokens;

  // Inject localStorage and sessionStorage via addInitScript
  // This runs in the page context before any app code executes
  await page.addInitScript(({ local, session }) => {
    for (const [key, value] of Object.entries(local)) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Storage quota or security error — skip
      }
    }
    for (const [key, value] of Object.entries(session)) {
      try {
        sessionStorage.setItem(key, value);
      } catch {
        // Storage quota or security error — skip
      }
    }
  }, { local: localData, session: sessionData });

  // Restore cookies via browser context
  if (tokens.cookies && tokens.cookies.length > 0) {
    const validCookies = tokens.cookies.filter(c => {
      // Skip expired cookies
      if (c.expires && c.expires > 0 && c.expires < Date.now() / 1000) return false;
      return true;
    });
    if (validCookies.length > 0) {
      await page.context().addCookies(validCookies);
    }
  }

  console.log(
    `[auth-tokens] Injected ${Object.keys(localData).length} localStorage + ` +
    `${Object.keys(sessionData).length} sessionStorage entries + ` +
    `${tokens.cookies?.length || 0} cookies`,
  );
}

/**
 * Injects tokens into a fresh BrowserContext using Playwright's storageState.
 * This is an alternative approach that sets storage state at the context level.
 *
 * Useful when creating new contexts that need pre-authenticated state.
 */
export function buildStorageState(tokens: StoredTokens): {
  cookies: StoredTokens['cookies'];
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
} {
  const baseUrl = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';
  const origin = new URL(baseUrl).origin;

  return {
    cookies: tokens.cookies || [],
    origins: [
      {
        origin,
        localStorage: Object.entries(tokens.localStorage).map(([name, value]) => ({
          name,
          value,
        })),
      },
    ],
  };
}

/**
 * Saves a Playwright-compatible storageState JSON file.
 * This can be referenced in playwright.config.ts via `storageState: '.auth/storage-state.json'`.
 */
export async function saveStorageStateFile(tokens: StoredTokens): Promise<string> {
  const storageState = buildStorageState(tokens);
  const filePath = path.resolve(AUTH_DIR, 'storage-state.json');

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(storageState, null, 2), 'utf-8');
  console.log(`[auth-tokens] Storage state saved to ${filePath}`);
  return filePath;
}

// ─── High-Level Orchestration ────────────────────────────────────────────────

/**
 * Checks whether injected tokens are still valid by navigating to the app
 * and verifying we're NOT redirected to Cognito.
 */
export async function verifyTokensValid(page: Page): Promise<boolean> {
  const baseUrl = process.env.BASE_URL || 'https://widhs-f2-carity.lower-widhs.aws.feisystems.com';

  await page.goto(baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const currentUrl = page.url();

  // If redirected to Cognito or stuck on login — tokens are invalid
  if (currentUrl.includes('amazoncognito.com') || currentUrl.includes('/auth')) {
    console.log('[auth-tokens] Token validation FAILED — redirected to Cognito.');
    return false;
  }

  // Check for "Acknowledge" dialog (means we passed Cognito but haven't completed context)
  const ackVisible = await page.getByRole('button', { name: 'Acknowledge' })
    .isVisible({ timeout: 5_000 }).catch(() => false);
  if (ackVisible) {
    console.log('[auth-tokens] Token validation PARTIAL — Acknowledge dialog present (tokens valid, context needed).');
    return true; // Tokens are valid; context selection still needed
  }

  // Check for context selection page
  if (currentUrl.includes('choose-context')) {
    console.log('[auth-tokens] Token validation PARTIAL — on context page (tokens valid).');
    return true;
  }

  console.log('[auth-tokens] Token validation SUCCESS — app loaded.');
  return true;
}

/**
 * Full authentication flow with token injection + fallback.
 *
 * Strategy:
 * 1. Try loading saved tokens from disk
 * 2. If found, inject into page and verify they work
 * 3. If expired or invalid, fall back to full UI login
 * 4. After successful login, capture and save tokens for next run
 *
 * This is the recommended entry point for test `beforeAll` hooks.
 */
export async function authenticateWithTokenInjection(
  page: Page,
  options?: { forceLogin?: boolean; onLoginRequired?: (page: Page) => Promise<void> },
): Promise<{ method: 'injected' | 'login'; tokensRefreshed: boolean }> {
  const { forceLogin = false, onLoginRequired } = options || {};

  if (!forceLogin) {
    // Attempt token injection
    const savedTokens = loadTokensFromDisk();

    if (savedTokens) {
      console.log('[auth-tokens] Attempting token injection...');
      await injectAuthTokens(page, savedTokens);

      const valid = await verifyTokensValid(page);
      if (valid) {
        console.log('[auth-tokens] ✓ Token injection successful — skipped Cognito login.');
        return { method: 'injected', tokensRefreshed: false };
      }

      console.log('[auth-tokens] ✗ Injected tokens invalid/expired — falling back to UI login.');
    }
  }

  // Fallback: Full UI login
  if (onLoginRequired) {
    console.log('[auth-tokens] Performing full UI login...');
    await onLoginRequired(page);
  } else {
    // Import and use the existing login helper
    const { loginAndSelectContext } = await import('./login');
    await loginAndSelectContext(page);
  }

  // Capture and save tokens for next run
  console.log('[auth-tokens] Capturing tokens after successful login...');
  const freshTokens = await captureAuthTokens(page);
  await saveTokensToDisk(freshTokens);
  await saveStorageStateFile(freshTokens);

  return { method: 'login', tokensRefreshed: true };
}
