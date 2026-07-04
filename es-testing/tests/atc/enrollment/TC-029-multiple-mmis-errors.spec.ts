/**
 * ATC: TC-029 — Multiple MMIS Error Segments
 *
 * Lifecycle: Pristine Check → (Reset if needed) → Draft → Referred → Enrolled → FL with multiple errors
 *
 * NEGATIVE TEST: Follows the standard enrollment lifecycle to reach Enrolled status,
 * which triggers the MMIS sync. The participant has intentionally invalid data
 * (missing city + FEA dates don't span enrollment), resulting in multiple error segments.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant must be accessible with ISP start date set.
 *               Residential address city must be NULL/empty (triggers 9110).
 *               FEA end date must NOT span enrollment period (triggers 9156).
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openFirstEnrollmentDetail,
  getSyncStatus,
  hasConflictBadge,
  isResubmitVisible,
  getMMISErrors,
  pollForMmisResponse,
} from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { mockMmisFailed, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_029;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;
let isPristine = false;

test.describe.serial('TC-029: Multiple MMIS Error Segments', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-029] Participant UUID: ${participantUuid}, MOCK_MMIS: ${MOCK_MMIS}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ─── Preconditions ────────────────────────────────────────────────────────

  test('ATC-ES-121 - Precondition: Participant is accessible', async () => {
    const accessible = await navigateToParticipant(page, participantUuid);
    expect(accessible).toBe(true);
  });

  test('ATC-ES-122 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
    const mmisState = await getMmisSnapshotState(page, participantUuid);
    console.log(`[TC-029] MMIS Snapshot: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
    expect(mmisState.loaded).toBe(true);

    if (!mmisState.hasActiveWaiverEnrollment) {
      isPristine = true;
      console.log('[TC-029] ✓ Pristine state — no active MMIS waiver enrollment');
    } else {
      isPristine = false;
      console.log('[TC-029] ✗ Active enrollment found — reset required');
    }
  });

  test('ATC-ES-123 - Reset: Ensure pristine state (if not pristine)', async () => {
    if (isPristine) {
      console.log('[TC-029] Skipping reset — already pristine');
      return;
    }

    const resetSuccess = await ensurePristineState(page, participantUuid);
    expect(resetSuccess, 'Failed to reset participant to pristine state').toBe(true);
    isPristine = true;
    console.log('[TC-029] ✓ Reset complete');
  });

  // ─── Step 1: Create Draft enrollment ──────────────────────────────────────

  test('ATC-ES-124 - Create Draft enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row, [class*="enrollment"]').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Draft',
      statusReason: 'Not Applicable',
      startDate: ENROLLMENT_START,
    });
    expect(saved, 'Failed to create Draft enrollment').toBe(true);
    console.log('[TC-029] Draft enrollment created');
  });

  test('ATC-ES-125 - State check: First row is Draft', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    expect(rowText).toContain('Draft');
    console.log('[TC-029] ✓ Draft state verified');
  });

  // ─── Step 2: Create Referred enrollment ───────────────────────────────────

  test('ATC-ES-126 - Create Referred enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Referred',
      statusReason: 'IRIS Consultant',
      startDate: ENROLLMENT_START,
    });
    expect(saved, 'Failed to create Referred enrollment').toBe(true);
    console.log('[TC-029] Referred enrollment created');
  });

  test('ATC-ES-127 - State check: First row is Referred', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    expect(rowText).toContain('Referred');
    console.log('[TC-029] ✓ Referred state verified');
  });

  // ─── Step 3: Create Enrolled enrollment (triggers MMIS sync → FL) ─────────

  test('ATC-ES-128 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: ENROLLMENT_START,
      endDate: ENROLLMENT_END,
    });
    expect(saved, 'Failed to create Enrolled enrollment').toBe(true);
    console.log('[TC-029] Enrolled enrollment created — expecting multiple MMIS errors');
  });

  // ─── Step 4: Verify FL response with multiple errors ──────────────────────

  test('ATC-ES-129 - Verify FL response status', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const opened = await openFirstEnrollmentDetail(page);
    expect(opened, 'Could not open enrollment detail').toBe(true);

    if (MOCK_MMIS) {
      const enrollmentKey = extractProgramEnrollmentKeyFromUrl(page.url());
      expect(enrollmentKey, 'Could not extract ProgramEnrollmentKey from URL').not.toBeNull();

      // Wait for backend to create the extension row
      await page.waitForTimeout(5000);

      // Mock with multiple error codes
      await mockMmisFailed(enrollmentKey!, '9110', 'CITY IS MISSING');
      await mockMmisFailed(enrollmentKey!, '9156', 'FEA DATES DO NOT SPAN ENROLLMENT PERIOD');
      console.log('[TC-029] MMIS Failed response mocked with multiple errors (9110 + 9156)');

      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 });

      const status = await getSyncStatus(page);
      console.log(`[TC-029] Sync status (mocked): ${JSON.stringify(status)}`);
      expect(status.responseStatus).toBe('FL');
    } else {
      const status = await pollForMmisResponse(page, { maxAttempts: 6, pollIntervalMs: 10_000 });
      console.log(`[TC-029] Sync status: ${JSON.stringify(status)}`);
      expect(status.responseStatus).toBe('FL');
    }
  });

  test('ATC-ES-130 - Verify multiple MMIS error segments', async () => {
    const errors = await getMMISErrors(page);
    console.log(`[TC-029] MMIS errors: ${JSON.stringify(errors)}`);
    expect(errors.length).toBeGreaterThan(1);
  });

  test('ATC-ES-131 - Verify conflict badge displayed', async () => {
    const conflictVisible = await hasConflictBadge(page);
    expect(conflictVisible).toBe(true);
  });

  test('ATC-ES-132 - Verify Re-submit button visible', async () => {
    const resubmitVisible = await isResubmitVisible(page);
    expect(resubmitVisible).toBe(true);
  });

}); // end describe.serial
