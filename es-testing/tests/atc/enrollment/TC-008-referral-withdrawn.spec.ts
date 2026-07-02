/**
 * ATC: TC-008 — Referral Withdrawn
 *
 * Changes enrollment status to "Referral Withdrawn", deleting the existing
 * MMIS span. Expects 1 MMIS transaction (Delete span via S310).
 *
 * Flow:
 * 1. Verify active MMIS waiver enrollment exists (precondition)
 * 2. Open enrollment detail → Edit → Status = "Referral Withdrawn"
 * 3. Verify MMIS sync SU
 * 4. Verify MMIS Snapshot shows no waiver enrollment
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: TC-001 must have been executed successfully first.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  openEnrollmentByText,
  editEnrollment,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { waitForEmptyWaiverEnrollment } from '../../helpers/reset-enrollment';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';

const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe.serial('TC-008: Referral Withdrawn', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-008] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  test('ATC-ES-038 - Precondition: Active MMIS waiver enrollment exists', async () => {
    const mmisState = await getMmisSnapshotState(page, participantUuid);
    console.log(`[TC-008] MMIS: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
    expect(mmisState.loaded).toBe(true);
    expect(mmisState.hasActiveWaiverEnrollment, 'No active MMIS waiver enrollment. Run TC-001 first.').toBe(true);
  });

  test('ATC-ES-039 - Open enrollment detail and change status to Referral Withdrawn', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open Enrolled enrollment detail').toBe(true);

    const edited = await editEnrollment(page, {
      status: 'Referral Withdrawn',
      statusReason: 'Not Provided',
    });
    expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
    console.log('[TC-008] Status changed to Referral Withdrawn — MMIS delete triggered');
  });

  test('ATC-ES-041 - Verify SU response', async () => {
    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU response from MMIS').toBe('SU');
    expect(status.hasConflict).toBe(false);
    console.log('[TC-008] ✓ MMIS delete sync verified (SU)');
  });

  test('ATC-ES-042 - Verify MMIS Snapshot shows no waiver enrollment', async () => {
    const cleared = await waitForEmptyWaiverEnrollment(page, participantUuid, {
      maxAttempts: 10,
      pollIntervalMs: 10_000,
    });
    expect(cleared, 'MMIS still shows waiver enrollment after withdrawal').toBe(true);
    console.log('[TC-008] ✓ MMIS confirmed: No Waiver Enrollment — deletion successful');
  });

});
