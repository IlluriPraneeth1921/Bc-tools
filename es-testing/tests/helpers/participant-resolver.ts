import { Page, expect } from '@playwright/test';
import { BASE } from './login';

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
    timeout: 20_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  const root = page.locator('main.app-root');
  return await root.isVisible({ timeout: 15_000 }).catch(() => false);
}

/**
 * Navigates to the participant's program enrollments section.
 */
export async function navigateToEnrollments(page: Page, uuid: string): Promise<void> {
  await page.goto(`${BASE}/#/persons/person/${uuid}/programenrollments`, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  });
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await expect(page.locator('main.app-root')).toBeVisible({ timeout: 10_000 });
}
