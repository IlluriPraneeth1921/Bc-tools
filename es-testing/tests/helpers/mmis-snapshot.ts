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
import { ensureSessionAlive } from './auth-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WaiverEnrollmentRecord {
  waiverProgram: string;
  waiverAgency: string;
  effectiveDate: string;
  endDate: string;
  waiverStatus: string;
}

export interface MmisSnapshotState {
  loaded: boolean;
  hasWaiverEnrollment: boolean;
  hasActiveWaiverEnrollment: boolean;
  waiverRecords: WaiverEnrollmentRecord[];
  rawText: string;
}

// ─── Navigation ──────────────────────────────────────────────────────────────

/**
 * Navigates to the MMIS Snapshot page. First loads the person root to establish
 * participant context, then navigates to the mmis-data sub-route.
 * Returns true if the page rendered MMIS content.
 */
async function navigateToMmisPage(page: Page, participantUuid: string): Promise<boolean> {
  const personUrl = `${BASE}/#/persons/person/${participantUuid}`;
  const mmisUrl = `${BASE}/#/persons/person/${participantUuid}/record/mmis-data`;

  // Step 1: Load person context
  await page.goto(personUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  if (!page.url().includes(participantUuid)) {
    console.log(`[mmis-snapshot] Could not reach person page. URL: ${page.url()}`);
    return false;
  }

  // Step 2: Navigate to MMIS data
  await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Step 3: Wait for MMIS content to appear
  return waitForMmisContent(page, 15_000);
}

/**
 * Polls for MMIS page content indicators (up to timeoutMs).
 */
async function waitForMmisContent(page: Page, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const visible = await page.locator('text=Waiver Enrollment').first().isVisible().catch(() => false)
      || await page.locator('text=No Waiver Enrollment').first().isVisible().catch(() => false)
      || await page.locator('button').filter({ hasText: /Refresh/i }).first().isVisible().catch(() => false);

    if (visible) {
      console.log('[mmis-snapshot] ✓ Page rendered');
      return true;
    }
    await page.waitForTimeout(2000);
  }
  return false;
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Navigates to the MMIS Snapshot page and reads waiver enrollment state.
 * Handles session recovery if the page fails to render.
 */
export async function getMmisSnapshotState(page: Page, participantUuid: string): Promise<MmisSnapshotState> {
  const emptyResult: MmisSnapshotState = { loaded: false, hasWaiverEnrollment: false, hasActiveWaiverEnrollment: false, waiverRecords: [], rawText: '' };

  console.log(`[mmis-snapshot] Navigating to MMIS Snapshot for ${participantUuid}`);

  // Attempt navigation (with one session-recovery retry)
  let rendered = await navigateToMmisPage(page, participantUuid);

  if (!rendered) {
    console.log('[mmis-snapshot] Page did not render — checking session...');
    const recovered = await ensureSessionAlive(page);
    if (recovered) {
      rendered = await navigateToMmisPage(page, participantUuid);
    }
  }

  if (!rendered) {
    console.warn(`[mmis-snapshot] Failed to render. URL: ${page.url()}`);
    return emptyResult;
  }

  // Click Refresh to get latest MMIS data
  const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();
  if (await refreshBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    console.log('[mmis-snapshot] Clicking Refresh...');
    await refreshBtn.click();
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Parse waiver enrollment records
  return parseWaiverEnrollment(page);
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/** Parses the waiver enrollment table on the MMIS Snapshot page. */
async function parseWaiverEnrollment(page: Page): Promise<MmisSnapshotState> {
  const pageText = await page.locator('body').textContent().catch(() => '') || '';
  const waiverRecords: WaiverEnrollmentRecord[] = [];
  let hasWaiverEnrollment = false;
  let hasActiveWaiverEnrollment = false;

  // Find table rows with dates (waiver data rows)
  const rows = page.locator('table tr, mat-row').filter({ hasNotText: /Waiver Program.*Waiver Agency/i });
  const rowCount = await rows.count();

  for (let i = 0; i < rowCount; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';
    if (!rowText.trim()) continue;

    const dates = rowText.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if (dates.length < 1) continue;

    hasWaiverEnrollment = true;
    const cells = rows.nth(i).locator('mat-cell, td');
    const cellCount = await cells.count();

    const record: WaiverEnrollmentRecord = {
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
      const statusMatch = rowText.match(/\b([AI])\s*$/);
      if (statusMatch) record.waiverStatus = statusMatch[1];
      if (dates[0]) record.effectiveDate = dates[0];
      if (dates[1]) record.endDate = dates[1];
    }

    if (record.waiverStatus === 'A') hasActiveWaiverEnrollment = true;
    waiverRecords.push(record);
    console.log(`[mmis-snapshot] Record: Program=${record.waiverProgram}, Status=${record.waiverStatus}, Eff=${record.effectiveDate}, End=${record.endDate}`);
  }

  // Fallback: scan page text if no table rows found
  if (!hasWaiverEnrollment) {
    const waiverSection = pageText.split(/Waiver Enrollment/i)[1] || '';
    if (waiverSection.match(/\d{2}\/\d{2}\/\d{4}/)) {
      hasWaiverEnrollment = true;
      if (/\bA\b/.test(waiverSection.substring(0, 200))) {
        hasActiveWaiverEnrollment = true;
      }
    }
  }

  const rawText = pageText.includes('Waiver Enrollment')
    ? pageText.substring(pageText.indexOf('Waiver Enrollment'), pageText.indexOf('Waiver Enrollment') + 500)
    : '';

  console.log(`[mmis-snapshot] Result: loaded=true, hasWaiver=${hasWaiverEnrollment}, hasActive=${hasActiveWaiverEnrollment}, records=${waiverRecords.length}`);
  return { loaded: true, hasWaiverEnrollment, hasActiveWaiverEnrollment, waiverRecords, rawText };
}

// ─── Convenience ─────────────────────────────────────────────────────────────

/** Quick check: Is the participant in pristine state (no active MMIS waiver enrollment)? */
export async function isParticipantPristine(page: Page, participantUuid: string): Promise<boolean> {
  const state = await getMmisSnapshotState(page, participantUuid);
  return state.loaded && !state.hasActiveWaiverEnrollment;
}
