/**
 * State Checker — Shared utility for reading current enrollment/suspension state.
 *
 * Every test case uses this to determine the participant's current state
 * before deciding whether to execute its action or skip.
 * This prevents flakiness from sequential assumptions and speeds up re-runs.
 */
import { Page } from '@playwright/test';

export type IrisEnrollmentState =
  | 'Enrolled'
  | 'Referred'
  | 'Draft'
  | 'Disenrolled'
  | null;

export interface EnrollmentStateInfo {
  /** Most recent IRIS enrollment status */
  irisState: IrisEnrollmentState;
  /** Most recent SDPC enrollment status */
  sdpcState: IrisEnrollmentState;
  /** Whether an active suspension exists (bounded or open-ended) */
  hasSuspension: boolean;
  /** Whether the sync shows SU response */
  hasSyncSuccess: boolean;
  /** Whether a conflict/error exists */
  hasConflict: boolean;
  /** Raw text of first IRIS enrollment row */
  firstIrisRowText: string;
  /** Total enrollment rows visible */
  rowCount: number;
}

/**
 * Reads the current IRIS enrollment state from the enrollment list.
 * Returns the most recent IRIS enrollment status or null if none exist.
 */
export async function getCurrentIrisState(page: Page): Promise<IrisEnrollmentState> {
  const rows = page.locator('mat-row');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';
    if (!rowText.includes('IRIS')) continue;

    if (rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) return 'Enrolled';
    if (rowText.includes('Referred')) return 'Referred';
    if (rowText.includes('Draft')) return 'Draft';
    if (rowText.includes('Disenrolled')) return 'Disenrolled';
  }

  return null;
}

/**
 * Reads the current SDPC enrollment state from the enrollment list.
 */
export async function getCurrentSdpcState(page: Page): Promise<IrisEnrollmentState> {
  const rows = page.locator('mat-row');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';
    if (!rowText.includes('SDPC')) continue;

    if (rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) return 'Enrolled';
    if (rowText.includes('Referred')) return 'Referred';
    if (rowText.includes('Draft')) return 'Draft';
    if (rowText.includes('Disenrolled')) return 'Disenrolled';
  }

  return null;
}

/**
 * Full state snapshot — reads all relevant enrollment/suspension/sync information.
 */
export async function getFullEnrollmentState(page: Page): Promise<EnrollmentStateInfo> {
  const rows = page.locator('mat-row');
  const count = await rows.count();

  let irisState: IrisEnrollmentState = null;
  let sdpcState: IrisEnrollmentState = null;
  let hasSuspension = false;
  let hasSyncSuccess = false;
  let hasConflict = false;
  let firstIrisRowText = '';

  for (let i = 0; i < count; i++) {
    const rowText = (await rows.nth(i).textContent()) || '';

    // IRIS state (first match wins — most recent)
    if (rowText.includes('IRIS') && !irisState) {
      if (rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) irisState = 'Enrolled';
      else if (rowText.includes('Referred')) irisState = 'Referred';
      else if (rowText.includes('Draft')) irisState = 'Draft';
      else if (rowText.includes('Disenrolled')) irisState = 'Disenrolled';
      firstIrisRowText = rowText.trim().substring(0, 150);
    }

    // SDPC state (first match wins)
    if (rowText.includes('SDPC') && !sdpcState) {
      if (rowText.includes('Enrolled') && !rowText.includes('Disenrolled')) sdpcState = 'Enrolled';
      else if (rowText.includes('Referred')) sdpcState = 'Referred';
      else if (rowText.includes('Draft')) sdpcState = 'Draft';
      else if (rowText.includes('Disenrolled')) sdpcState = 'Disenrolled';
    }

    // Suspension indicators
    if (/suspend/i.test(rowText)) hasSuspension = true;

    // Sync indicators
    if (rowText.includes('Success') || rowText.includes('SU')) hasSyncSuccess = true;
    if (/conflict|error|FL/i.test(rowText)) hasConflict = true;
  }

  return {
    irisState,
    sdpcState,
    hasSuspension,
    hasSyncSuccess,
    hasConflict,
    firstIrisRowText,
    rowCount: count,
  };
}

/**
 * Checks if the enrollment detail page shows an active suspension.
 */
export async function hasActiveSuspension(page: Page): Promise<boolean> {
  const pageText = await page.locator('main').textContent().catch(() => '') || '';
  return /suspend/i.test(pageText) && !/deleted/i.test(pageText);
}

/**
 * Checks if the enrollment detail page shows a bounded suspension (has end date).
 */
export async function hasBoundedSuspension(page: Page): Promise<boolean> {
  const suspensionRows = page.locator('mat-row, tr').filter({ hasText: /suspend/i });
  const count = await suspensionRows.count();

  for (let i = 0; i < count; i++) {
    const text = (await suspensionRows.nth(i).textContent()) || '';
    // Look for two dates (start + end) in the row = bounded
    const dates = text.match(/\d{2}\/\d{2}\/\d{4}/g) || [];
    if (dates.length >= 2) return true;
  }

  return false;
}

/**
 * Checks if the enrollment detail page shows an open-ended suspension (no end date).
 */
export async function hasOpenEndedSuspension(page: Page): Promise<boolean> {
  const hasSusp = await hasActiveSuspension(page);
  const hasBounded = await hasBoundedSuspension(page);
  return hasSusp && !hasBounded;
}

/**
 * Determines the current MMIS sync response status from the enrollment detail.
 */
export async function getMmisSyncResponse(page: Page): Promise<'SU' | 'SE' | 'FL' | 'Pending' | null> {
  const pageText = await page.locator('main').textContent().catch(() => '') || '';

  // Check for human-readable status text first
  if (/\bSucceeded\b|\bSuccess\b/i.test(pageText)) return 'SU';
  if (/\bWarning\b/i.test(pageText) && !/\bFail\b|\bconflict\b/i.test(pageText)) return 'SU';
  if (/\bFail\b|\bFailed\b|\bRejected\b/i.test(pageText)) return 'FL';

  // Check for raw codes with word boundaries
  if (/\bSU\b/.test(pageText)) return 'SU';
  if (/\bSE\b/.test(pageText)) return 'SE';
  if (/\bFL\b/.test(pageText)) return 'FL';

  // Only return Pending if nothing else matched
  if (/Synchronization Pending/i.test(pageText)) return 'Pending';

  return null;
}

/**
 * Computes dates relative to ISP start for use across test cases.
 */
export function computeTestDates(ispStartDate: string): {
  enrollmentStart: string;
  disenrollStart: string;
  disenrollEnd: string;
  suspensionStart: string;
  suspensionEnd: string;
} {
  const [m, , y] = ispStartDate.split('/').map(Number);

  // Disenrollment = next month from enrollment
  const disenrollMonth = m + 1 > 12 ? 1 : m + 1;
  const disenrollYear = m + 1 > 12 ? y + 1 : y;

  // Suspension start = 10 days after enrollment start
  const suspStart = new Date(y, m - 1, 10);
  // Suspension end = 31 days after suspension start (> 3 day minimum)
  const suspEnd = new Date(y, m - 1, 10 + 31);

  return {
    enrollmentStart: ispStartDate,
    disenrollStart: `${String(disenrollMonth).padStart(2, '0')}/01/${disenrollYear}`,
    disenrollEnd: '12/31/2299',
    suspensionStart: `${String(suspStart.getMonth() + 1).padStart(2, '0')}/${String(suspStart.getDate()).padStart(2, '0')}/${suspStart.getFullYear()}`,
    suspensionEnd: `${String(suspEnd.getMonth() + 1).padStart(2, '0')}/${String(suspEnd.getDate()).padStart(2, '0')}/${suspEnd.getFullYear()}`,
  };
}
