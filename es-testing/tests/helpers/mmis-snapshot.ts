/**
 * MMIS Snapshot Helper
 *
 * Navigates to the MMIS Snapshot page for a participant and reads waiver
 * enrollment state directly from MMIS (not Carity). Used to determine if
 * a participant is in "pristine" state (no active waiver enrollment in MMIS).
 *
 * URL pattern: /#/persons/person/{uuid}/record/mmis-data
 */
import { Page } from '@playwright/test';
import { BASE } from './login';

export interface WaiverEnrollmentRecord {
  waiverProgram: string;
  waiverAgency: string;
  effectiveDate: string;
  endDate: string;
  waiverStatus: string;
}

export interface MmisSnapshotState {
  /** Whether the MMIS Snapshot page loaded successfully */
  loaded: boolean;
  /** Whether any waiver enrollment records exist */
  hasWaiverEnrollment: boolean;
  /** Whether there is an ACTIVE waiver enrollment (Status = "A") */
  hasActiveWaiverEnrollment: boolean;
  /** All waiver enrollment records found */
  waiverRecords: WaiverEnrollmentRecord[];
  /** Raw text of the Waiver Enrollment section */
  rawText: string;
}

/**
 * Navigates to the MMIS Snapshot page and clicks Refresh to get latest data.
 * Returns the current waiver enrollment state from MMIS.
 */
export async function getMmisSnapshotState(page: Page, participantUuid: string): Promise<MmisSnapshotState> {
  const url = `${BASE}/#/persons/person/${participantUuid}/record/mmis-data`;
  console.log(`[mmis-snapshot] Navigating to: ${url}`);

  // Navigate with generous timeout — Angular hash routes can be slow
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(5000);

  // Wait for the page content to render — try multiple indicators
  // The Angular app may show different text depending on version/config
  let pageRendered = false;
  let pageText = '';

  // Strategy 1: Wait for "Waiver Enrollment" text which is always on the MMIS data page
  const waiverText = page.locator('text=Waiver Enrollment').first();
  pageRendered = await waiverText.isVisible({ timeout: 20_000 }).catch(() => false);

  if (!pageRendered) {
    // Strategy 2: Wait for any meaningful content in main area via text scan
    const mainContent = page.locator('main, app-root, .app-root, [class*="content"]').first();
    await mainContent.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
    pageText = await page.locator('body').textContent().catch(() => '') || '';
    pageRendered = /MMIS|Snapshot|Waiver|Enrollment|No Waiver|MCO|Cost Share|Eligibility/i.test(pageText);
  }

  if (!pageRendered) {
    // Strategy 2: Look for Refresh button (might have different casing/name)
    const refreshBtn = page.locator('button').filter({ hasText: /Refresh|refresh|Load|load/i }).first();
    pageRendered = await refreshBtn.isVisible({ timeout: 10_000 }).catch(() => false);
  }

  if (!pageRendered) {
    // Strategy 3: Full page.goto retry (not reload — forces fresh Angular bootstrap)
    console.log('[mmis-snapshot] Page did not render — retrying with fresh navigation...');
    await page.waitForTimeout(2000);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(5000);

    pageText = await page.locator('body').textContent().catch(() => '') || '';
    pageRendered = /MMIS|Snapshot|Waiver|Enrollment|Refresh|No Waiver|MCO|Cost Share|Eligibility/i.test(pageText);
  }

  if (!pageRendered) {
    // Strategy 4: Maybe we need to navigate to person first, then to mmis-data tab
    console.log('[mmis-snapshot] Still not rendered — navigating to person dashboard first...');
    await page.goto(`${BASE}/#/persons/person/${participantUuid}/dashboard`, { waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 }).catch(() => {});
    await page.waitForTimeout(5000);

    pageText = await page.locator('body').textContent().catch(() => '') || '';
    pageRendered = /MMIS|Snapshot|Waiver|Enrollment|Refresh|No Waiver|MCO|Cost Share|Eligibility/i.test(pageText);
  }

  if (!pageRendered) {
    console.warn('[mmis-snapshot] MMIS Snapshot page did not render after all retries');
    console.warn(`[mmis-snapshot] Current URL: ${page.url()}`);
    console.warn(`[mmis-snapshot] Page text (first 300): ${pageText.substring(0, 300)}`);
    return { loaded: false, hasWaiverEnrollment: false, hasActiveWaiverEnrollment: false, waiverRecords: [], rawText: '' };
  }

  console.log('[mmis-snapshot] Page rendered successfully');

  // Click Refresh button to get latest MMIS data
  const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();
  if (await refreshBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    console.log('[mmis-snapshot] Clicking Refresh button...');
    await refreshBtn.click();
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(3000);
  } else {
    console.log('[mmis-snapshot] No Refresh button found — using page as-is');
  }

  // Re-read page text after refresh
  pageText = await page.locator('body').textContent().catch(() => '') || '';
  const loaded = true; // If we got here, page rendered

  // Parse Waiver Enrollment section
  const waiverRecords: WaiverEnrollmentRecord[] = [];
  let hasWaiverEnrollment = false;
  let hasActiveWaiverEnrollment = false;

  // Look for table rows in the Waiver Enrollment section
  // The table has columns: Waiver Program | Waiver Agency | Effective Date | End Date | Waiver Status
  const rows = page.locator('table tr, mat-row').filter({ hasNotText: /Waiver Program.*Waiver Agency/i });
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';

    // Skip header rows and empty rows
    if (!rowText.trim() || rowText.includes('Waiver Program') && rowText.includes('Waiver Agency')) continue;

    // Check if this row contains waiver enrollment data
    // Look for patterns: program code (like "003"), dates (MM/DD/YYYY), status (single char like "A", "I")
    const datePattern = /\d{2}\/\d{2}\/\d{4}/g;
    const dates = rowText.match(datePattern) || [];

    if (dates.length >= 1) {
      hasWaiverEnrollment = true;

      // Extract cells - try mat-cell or td elements
      const cells = rows.nth(i).locator('mat-cell, td');
      const cellCount = await cells.count();

      let record: WaiverEnrollmentRecord = {
        waiverProgram: '',
        waiverAgency: '',
        effectiveDate: '',
        endDate: '',
        waiverStatus: '',
      };

      if (cellCount >= 5) {
        record.waiverProgram = ((await cells.nth(0).textContent()) || '').trim();
        record.waiverAgency = ((await cells.nth(1).textContent()) || '').trim();
        record.effectiveDate = ((await cells.nth(2).textContent()) || '').trim();
        record.endDate = ((await cells.nth(3).textContent()) || '').trim();
        record.waiverStatus = ((await cells.nth(4).textContent()) || '').trim();
      } else {
        // Fallback: try to parse from row text
        // Status is typically a single character at the end
        const statusMatch = rowText.match(/\b([AI])\s*$/);
        if (statusMatch) record.waiverStatus = statusMatch[1];
        if (dates[0]) record.effectiveDate = dates[0];
        if (dates[1]) record.endDate = dates[1];
      }

      if (record.waiverStatus === 'A') {
        hasActiveWaiverEnrollment = true;
      }

      waiverRecords.push(record);
      console.log(`[mmis-snapshot] Found waiver record: Program=${record.waiverProgram}, Status=${record.waiverStatus}, Eff=${record.effectiveDate}, End=${record.endDate}`);
    }
  }

  // Secondary check: scan full page text for "Waiver Enrollment" section with status "A"
  if (!hasWaiverEnrollment) {
    // Check if there's any content after "Waiver Enrollment" header that contains data
    const waiverSection = pageText.split(/Waiver Enrollment/i)[1] || '';
    if (waiverSection.match(/\d{2}\/\d{2}\/\d{4}/)) {
      hasWaiverEnrollment = true;
      if (/\bA\b/.test(waiverSection.substring(0, 200))) {
        hasActiveWaiverEnrollment = true;
      }
    }
  }

  const result: MmisSnapshotState = {
    loaded,
    hasWaiverEnrollment,
    hasActiveWaiverEnrollment,
    waiverRecords,
    rawText: pageText.substring(pageText.indexOf('Waiver Enrollment'), pageText.indexOf('Waiver Enrollment') + 500),
  };

  console.log(`[mmis-snapshot] Result: loaded=${loaded}, hasWaiver=${hasWaiverEnrollment}, hasActive=${hasActiveWaiverEnrollment}, records=${waiverRecords.length}`);
  return result;
}

/**
 * Quick check: Is the participant in pristine state (no active MMIS waiver enrollment)?
 */
export async function isParticipantPristine(page: Page, participantUuid: string): Promise<boolean> {
  const state = await getMmisSnapshotState(page, participantUuid);
  return !state.hasActiveWaiverEnrollment;
}
