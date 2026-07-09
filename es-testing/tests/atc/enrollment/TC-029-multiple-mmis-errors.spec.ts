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
import { test, expect, Page } from '@playwright/test';
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
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_029;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let isPristine = false;
let tracker: StepTracker;

test.describe.serial('TC-029: Multiple MMIS Error Segments', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-029', participantUuid);
    console.log(`[TC-029] Participant UUID: ${participantUuid}, MOCK_MMIS: ${MOCK_MMIS}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // ─── Preconditions ────────────────────────────────────────────────────────

  test('ATC-ES-121 - Precondition: Participant is accessible', async () => {
    test.setTimeout(60_000);
    try {
      const accessible = await navigateToParticipant(page, participantUuid);
      expect(accessible).toBe(true);
      tracker.record('ATC-ES-121 - Precondition: Participant is accessible', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-121 - Precondition: Participant is accessible', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('Capture MMIS snapshot (before)', async () => {
    test.setTimeout(60_000);
    try {
      const screenshot = await captureMmisScreenshot(page, participantUuid);
      if (screenshot) tracker.setBeforeScreenshot(screenshot);
      tracker.record('Capture MMIS snapshot (before)', 'passed');
    } catch (err) {
      tracker.record('Capture MMIS snapshot (before)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-122 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
    test.setTimeout(60_000);
    try {
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
      tracker.record('ATC-ES-122 - Check MMIS Snapshot: Determine waiver enrollment state', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-122 - Check MMIS Snapshot: Determine waiver enrollment state', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-123 - Reset: Ensure pristine state (if not pristine)', async () => {
    test.setTimeout(60_000);
    try {
      if (isPristine) {
        console.log('[TC-029] Skipping reset — already pristine');
        tracker.record('ATC-ES-123 - Reset: Ensure pristine state (if not pristine)', 'skipped');
        return;
      }

      const resetSuccess = await ensurePristineState(page, participantUuid);
      expect(resetSuccess, 'Failed to reset participant to pristine state').toBe(true);
      isPristine = true;
      console.log('[TC-029] ✓ Reset complete');
      tracker.record('ATC-ES-123 - Reset: Ensure pristine state (if not pristine)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-123 - Reset: Ensure pristine state (if not pristine)', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 1: Create Draft enrollment ──────────────────────────────────────

  test('ATC-ES-124 - Create Draft enrollment', async () => {
    test.setTimeout(60_000);
    try {
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
      tracker.record('ATC-ES-124 - Create Draft enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-124 - Create Draft enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-125 - State check: First row is Draft', async () => {
    test.setTimeout(30_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      expect(rowText).toContain('IRIS');
      expect(rowText).toContain('Draft');
      console.log('[TC-029] ✓ Draft state verified');
      tracker.record('ATC-ES-125 - State check: First row is Draft', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-125 - State check: First row is Draft', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 2: Create Referred enrollment ───────────────────────────────────

  test('ATC-ES-126 - Create Referred enrollment', async () => {
    test.setTimeout(60_000);
    try {
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
      tracker.record('ATC-ES-126 - Create Referred enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-126 - Create Referred enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-127 - State check: First row is Referred', async () => {
    test.setTimeout(30_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      expect(rowText).toContain('IRIS');
      expect(rowText).toContain('Referred');
      console.log('[TC-029] ✓ Referred state verified');
      tracker.record('ATC-ES-127 - State check: First row is Referred', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-127 - State check: First row is Referred', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 3: Create Enrolled enrollment (triggers MMIS sync → FL) ─────────

  test('ATC-ES-128 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
    test.setTimeout(60_000);
    try {
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
      tracker.record('ATC-ES-128 - Create Enrolled enrollment (triggers MMIS sync)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-128 - Create Enrolled enrollment (triggers MMIS sync)', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 4: Verify FL response with multiple errors ──────────────────────

  test('ATC-ES-129 - Verify FL response status', async () => {
    test.setTimeout(90_000);
    try {
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
      tracker.record('ATC-ES-129 - Verify FL response status', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-129 - Verify FL response status', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-130 - Verify multiple MMIS error segments', async () => {
    test.setTimeout(30_000);
    try {
      const errors = await getMMISErrors(page);
      console.log(`[TC-029] MMIS errors: ${JSON.stringify(errors)}`);
      expect(errors.length).toBeGreaterThan(1);
      tracker.record('ATC-ES-130 - Verify multiple MMIS error segments', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-130 - Verify multiple MMIS error segments', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-131 - Verify conflict badge displayed', async () => {
    test.setTimeout(30_000);
    try {
      const conflictVisible = await hasConflictBadge(page);
      expect(conflictVisible).toBe(true);
      tracker.record('ATC-ES-131 - Verify conflict badge displayed', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-131 - Verify conflict badge displayed', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-132 - Verify Re-submit button visible', async () => {
    test.setTimeout(30_000);
    try {
      const resubmitVisible = await isResubmitVisible(page);
      expect(resubmitVisible).toBe(true);
      tracker.record('ATC-ES-132 - Verify Re-submit button visible', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-132 - Verify Re-submit button visible', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
