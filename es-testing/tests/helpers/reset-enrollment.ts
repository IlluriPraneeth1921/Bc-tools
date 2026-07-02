/**
 * Reset Enrollment Helper — Referral Withdrawn (TC-008 pattern)
 *
 * Performs the TC-008 "Referral Withdrawn" action to delete an existing
 * MMIS waiver enrollment span and return the participant to pristine state.
 *
 * Uses shared actions from enrollment.actions.ts to avoid duplicating
 * UI interaction code.
 */
import { Page } from '@playwright/test';
import { BASE } from './login';
import { navigateToEnrollments } from './participant-resolver';
import { getMmisSnapshotState } from './mmis-snapshot';
import {
  openEnrollmentByText,
  editEnrollment,
} from '../atc/enrollment/actions/enrollment.actions';

export interface WithdrawResult {
  success: boolean;
  syncSuccess: boolean;
  reason: string;
}

/**
 * Performs the TC-008 Referral Withdrawn flow to reset MMIS state.
 *
 * 1. Navigate to enrollment list
 * 2. Open the active Enrolled/Referred row
 * 3. Edit enrollment: Status → "Referral Withdrawn"
 * 4. Wait for MMIS sync
 */
export async function withdrawReferralToReset(page: Page, participantUuid: string): Promise<WithdrawResult> {
  console.log('[reset-enrollment] Starting Referral Withdrawn flow...');

  // Navigate to enrollment list
  await navigateToEnrollments(page, participantUuid);
  await page.waitForTimeout(2000);

  // Open the active enrollment row
  const opened = await openEnrollmentByText(page, /Enrolled|Referred/, /Disenrolled/);
  if (!opened) {
    const msg = 'No Enrolled or Referred IRIS enrollment row found — cannot perform withdrawal';
    console.warn(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }

  // Edit enrollment: change status to Referral Withdrawn
  const edited = await editEnrollment(page, {
    status: 'Referral Withdrawn',
    statusReason: 'Not Provided',
  });

  if (!edited) {
    const msg = 'Edit dialog did not close — Referral Withdrawn may have failed';
    console.error(`[reset-enrollment] ${msg}`);
    return { success: false, syncSuccess: false, reason: msg };
  }

  console.log('[reset-enrollment] Status changed to Referral Withdrawn — MMIS delete triggered');
  await page.waitForTimeout(5000);

  return { success: true, syncSuccess: true, reason: 'Referral Withdrawn completed' };
}

/**
 * Navigates to MMIS Snapshot and waits until Waiver Enrollment section shows
 * "No Waiver Enrollment record(s) available."
 */
export async function waitForEmptyWaiverEnrollment(
  page: Page,
  participantUuid: string,
  options: { maxAttempts?: number; pollIntervalMs?: number } = {}
): Promise<boolean> {
  const maxAttempts = options.maxAttempts || 10;
  const pollInterval = options.pollIntervalMs || 10_000;
  const url = `${BASE}/#/persons/person/${participantUuid}/record/mmis-data`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`[reset-enrollment] Checking MMIS Snapshot (attempt ${attempt}/${maxAttempts})...`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const refreshBtn = page.getByRole('button', { name: /Refresh/i }).first();
    if (await refreshBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(3000);
    }

    const pageText = await page.locator('main').textContent().catch(() => '') || '';
    if (pageText.includes('No Waiver Enrollment record(s) available')) {
      console.log('[reset-enrollment] ✓ MMIS confirms pristine state');
      return true;
    }

    if (attempt < maxAttempts) {
      await page.waitForTimeout(pollInterval);
    }
  }

  console.error(`[reset-enrollment] ✗ MMIS still shows waiver enrollment after ${maxAttempts} attempts`);
  return false;
}

/**
 * Full reset flow: Check MMIS Snapshot, and if active enrollment exists,
 * perform TC-008 Referral Withdrawn to clear MMIS state.
 *
 * Returns true if participant is now in pristine state.
 */
export async function ensurePristineState(page: Page, participantUuid: string): Promise<boolean> {
  console.log('[reset-enrollment] Checking if participant is in pristine state...');

  const mmisState = await getMmisSnapshotState(page, participantUuid);

  if (!mmisState.hasActiveWaiverEnrollment) {
    console.log('[reset-enrollment] ✓ Already in pristine state');
    return true;
  }

  console.log('[reset-enrollment] Active MMIS enrollment found — resetting via Referral Withdrawn...');

  const result = await withdrawReferralToReset(page, participantUuid);
  if (!result.success) {
    console.error(`[reset-enrollment] Reset failed: ${result.reason}`);
    return false;
  }

  const cleared = await waitForEmptyWaiverEnrollment(page, participantUuid);
  if (!cleared) {
    console.error('[reset-enrollment] ✗ MMIS did not clear after withdrawal');
    return false;
  }

  console.log('[reset-enrollment] ✓ Participant is now in pristine state');
  return true;
}
