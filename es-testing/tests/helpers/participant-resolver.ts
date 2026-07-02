import { Page } from '@playwright/test';
import { BASE, loginAndSelectContext } from './login';
import { ensureSessionAlive } from './auth-tokens';

/**
 * Checks if the app has redirected to login/context selection and re-authenticates if needed.
 * This is a quick URL-only check for obvious redirects. For deeper detection
 * (silent token expiry), use `ensureSessionAlive` from auth-tokens.
 */
async function ensureAuthenticated(page: Page): Promise<boolean> {
  const currentUrl = page.url();

  // Obvious redirect-based detection
  if (currentUrl.includes('choose-context') || currentUrl.includes('amazoncognito.com') || currentUrl.includes('/auth')) {
    console.log('[participant-resolver] Session expired (URL redirect) — re-authenticating...');
    await loginAndSelectContext(page);
    return true;
  }

  return false;
}

/**
 * Searches for a participant using the global search bar (top header).
 * Types the query, presses Enter, then double-clicks the first result row.
 * Returns the person UUID if found, or null if not found.
 */
export async function findParticipantByGlobalSearch(page: Page, query: string): Promise<string | null> {
  // The global search bar is present on every page — "Search Persons"
  const searchInput = page.locator('input[placeholder="Search Persons"]').first();
  
  if (!(await searchInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
    console.log('[participant-resolver] Global search bar not visible');
    return null;
  }

  await searchInput.fill(query);
  await searchInput.press('Enter');
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  // Check for results
  const firstRow = page.locator('mat-row').first();
  if (!(await firstRow.isVisible({ timeout: 8_000 }).catch(() => false))) {
    console.log(`[participant-resolver] No results found for query: ${query}`);
    return null;
  }

  // Double-click to navigate to person record
  await firstRow.dblclick();
  await page.waitForTimeout(2000);
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  const url = page.url();
  const match = url.match(/persons\/person\/([0-9a-f-]{36})/i);
  if (match) return match[1];

  return null;
}

/**
 * Searches for a participant by Medicaid ID (MA ID) using global search.
 * Returns the person UUID if found, or null if not found.
 */
export async function findParticipantByMaId(page: Page, maId: string): Promise<string | null> {
  return findParticipantByGlobalSearch(page, maId);
}

/**
 * Searches for a participant by first/last name using global search.
 * Returns the person UUID if found, or null if not found.
 */
export async function findParticipantByName(
  page: Page,
  firstName: string,
  lastName: string
): Promise<string | null> {
  return findParticipantByGlobalSearch(page, `${firstName} ${lastName}`);
}

/**
 * Navigates to the participant's dashboard given their UUID.
 * Returns true if the dashboard loaded successfully.
 */
export async function navigateToParticipant(page: Page, uuid: string): Promise<boolean> {
  await page.goto(`${BASE}/#/persons/person/${uuid}/dashboard`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // Check if session expired and we got redirected
  const reAuthenticated = await ensureAuthenticated(page);
  if (reAuthenticated) {
    await page.goto(`${BASE}/#/persons/person/${uuid}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);
  }

  // Check multiple indicators that the person page loaded
  const indicators = [
    page.locator('main.app-root'),
    page.locator('app-root'),
    page.locator('main'),
    page.locator('[class*="dashboard"]'),
    page.locator('[class*="person"]'),
  ];

  for (const locator of indicators) {
    if (await locator.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      return true;
    }
  }

  // Fallback: check if URL contains person UUID (navigation succeeded)
  if (page.url().includes(uuid)) return true;

  // Page didn't render — check for silent session expiry via centralized detection
  const recovered = await ensureSessionAlive(page);
  if (recovered) {
    await page.goto(`${BASE}/#/persons/person/${uuid}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    return page.url().includes(uuid);
  }

  return false;
}

/**
 * Navigates to the participant's program enrollments section.
 */
export async function navigateToEnrollments(page: Page, uuid: string): Promise<void> {
  await page.goto(`${BASE}/#/persons/person/${uuid}/programenrollments`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Check if session expired and we got redirected
  const reAuthenticated = await ensureAuthenticated(page);
  if (reAuthenticated) {
    await page.goto(`${BASE}/#/persons/person/${uuid}/programenrollments`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Wait for page to render — try multiple selectors
  const rendered = await page.locator('main.app-root').first().isVisible({ timeout: 5_000 }).catch(() => false) ||
    await page.locator('app-root').first().isVisible({ timeout: 3_000 }).catch(() => false) ||
    await page.locator('main').first().isVisible({ timeout: 3_000 }).catch(() => false) ||
    page.url().includes(uuid);

  if (!rendered) {
    // Detect silent session expiry via centralized detection
    const recovered = await ensureSessionAlive(page);
    if (recovered) {
      // Re-navigate after fresh login
      await page.goto(`${BASE}/#/persons/person/${uuid}/programenrollments`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(3000);
    } else {
      // Not a token issue — just slow loading, give it more time
      await page.waitForTimeout(3000);
    }
  }
}
