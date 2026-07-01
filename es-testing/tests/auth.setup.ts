/**
 * Auth Setup — Token Capture for Subsequent Test Runs
 *
 * Performs a single UI login via Cognito Hosted UI + context selection,
 * then captures all auth tokens (localStorage, sessionStorage, cookies)
 * and saves them to `.auth/stored-tokens.json`.
 *
 * Subsequent test runs will attempt to inject these saved tokens directly,
 * skipping the slow Cognito login + context selection flow entirely.
 *
 * Run manually when tokens expire:
 *   npx playwright test tests/auth.setup.ts --project=atc
 *
 * Or let `authenticateWithTokenInjection()` handle it automatically —
 * it falls back to full login and re-captures when tokens are invalid.
 */

import { test as setup } from '@playwright/test';
import { loginAndSelectContext } from './helpers/login';
import {
  captureAuthTokens,
  saveTokensToDisk,
  saveStorageStateFile,
} from './helpers/auth-tokens';

setup('capture-auth-tokens', async ({ page }) => {
  setup.setTimeout(120_000);

  console.log('[auth.setup] Starting full UI login to capture tokens...');

  // Perform full login (Cognito + Acknowledge + Context selection)
  await loginAndSelectContext(page);

  // Capture everything from browser storage
  const tokens = await captureAuthTokens(page);

  console.log(`[auth.setup] Captured:`);
  console.log(`  localStorage entries: ${Object.keys(tokens.localStorage).length}`);
  console.log(`  sessionStorage entries: ${Object.keys(tokens.sessionStorage).length}`);
  console.log(`  cookies: ${tokens.cookies.length}`);
  if (tokens.expiresAt) {
    console.log(`  token expires: ${tokens.expiresAt}`);
  }

  // Save to disk
  await saveTokensToDisk(tokens);
  await saveStorageStateFile(tokens);

  console.log('[auth.setup] ✓ Auth tokens captured and saved. Next test run will use injection.');
});
