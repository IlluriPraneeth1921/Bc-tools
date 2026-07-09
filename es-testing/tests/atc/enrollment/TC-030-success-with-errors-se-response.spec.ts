/**
 * ATC: TC-030 — SE Response: Enrollment Activated with Warnings
 *
 * Lifecycle: Pristine Check → (Reset if needed) → Draft → Referred → Enrolled → SE (success with warnings)
 *
 * Creates an enrollment following the standard lifecycle. The Enrolled step triggers
 * the MMIS sync which returns SE (Success with Errors). Per BR-D01-010, enrollment
 * is still activated despite warnings — no conflict badge shown.
 *
 * Test Participant: MA ID 1430000013
 * Prerequisite: Participant must be accessible with ISP start date set.
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
  getMMISErrors,
  openEnrollmentByText,
  pollForMmisResponse,
} from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { mockMmisWarning, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_030;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let isPristine = false;
let tracker: StepTracker;

test.describe.serial('TC-030: SE Response — Enrollment Activated with Warnings', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-030', participantUuid);
    console.log(`[TC-030] Participant UUID: ${participantUuid}, MOCK_MMIS: ${MOCK_MMIS}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // ─── Preconditions ────────────────────────────────────────────────────────

  test('ATC-ES-126 - Precondition: Participant is accessible', async () => {
    test.setTimeout(60_000);
    try {
      const accessible = await navigateToParticipant(page, participantUuid);
      expect(accessible).toBe(true);
      tracker.record('ATC-ES-126 - Precondition: Participant is accessible', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-126 - Precondition: Participant is accessible', 'failed', (err as Error).message);
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

  test('ATC-ES-127 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
    test.setTimeout(60_000);
    try {
      const mmisState = await getMmisSnapshotState(page, participantUuid);
      console.log(`[TC-030] MMIS Snapshot: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
      expect(mmisState.loaded).toBe(true);

      if (!mmisState.hasActiveWaiverEnrollment) {
        isPristine = true;
        console.log('[TC-030] ✓ Pristine state — no active MMIS waiver enrollment');
      } else {
        isPristine = false;
        console.log('[TC-030] ✗ Active enrollment found — reset required');
      }
      tracker.record('ATC-ES-127 - Check MMIS Snapshot: Determine waiver enrollment state', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-127 - Check MMIS Snapshot: Determine waiver enrollment state', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-128 - Reset: Ensure pristine state (if not pristine)', async () => {
    test.setTimeout(60_000);
    try {
      if (isPristine) {
        console.log('[TC-030] Skipping reset — already pristine');
        tracker.record('ATC-ES-128 - Reset: Ensure pristine state (if not pristine)', 'skipped');
        return;
      }

      const resetSuccess = await ensurePristineState(page, participantUuid);
      expect(resetSuccess, 'Failed to reset participant to pristine state').toBe(true);
      isPristine = true;
      console.log('[TC-030] ✓ Reset complete');
      tracker.record('ATC-ES-128 - Reset: Ensure pristine state (if not pristine)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-128 - Reset: Ensure pristine state (if not pristine)', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 1: Create Draft enrollment ──────────────────────────────────────

  test('ATC-ES-129 - Create Draft enrollment', async () => {
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
      console.log('[TC-030] Draft enrollment created');
      tracker.record('ATC-ES-129 - Create Draft enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-129 - Create Draft enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-130 - State check: First row is Draft', async () => {
    test.setTimeout(30_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      expect(rowText).toContain('IRIS');
      expect(rowText).toContain('Draft');
      console.log('[TC-030] ✓ Draft state verified');
      tracker.record('ATC-ES-130 - State check: First row is Draft', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-130 - State check: First row is Draft', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 2: Create Referred enrollment ───────────────────────────────────

  test('ATC-ES-131 - Create Referred enrollment', async () => {
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
      console.log('[TC-030] Referred enrollment created');
      tracker.record('ATC-ES-131 - Create Referred enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-131 - Create Referred enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-132 - State check: First row is Referred', async () => {
    test.setTimeout(30_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      const firstRow = page.locator('mat-row').first();
      await expect(firstRow).toBeVisible({ timeout: 15_000 });
      const rowText = await firstRow.textContent() || '';
      expect(rowText).toContain('IRIS');
      expect(rowText).toContain('Referred');
      console.log('[TC-030] ✓ Referred state verified');
      tracker.record('ATC-ES-132 - State check: First row is Referred', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-132 - State check: First row is Referred', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 3: Create Enrolled enrollment (triggers MMIS sync → SE) ─────────

  test('ATC-ES-133 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
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
      console.log('[TC-030] Enrolled enrollment created — expecting SE response');
      tracker.record('ATC-ES-133 - Create Enrolled enrollment (triggers MMIS sync)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-133 - Create Enrolled enrollment (triggers MMIS sync)', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 4: Verify SE response (success with warnings) ──────────────────

  test('ATC-ES-134 - Verify SE response status', async () => {
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

        const mockResult = await mockMmisWarning(enrollmentKey!, '9199', 'ENROLLMENT PROCESSED WITH WARNINGS');
        expect(mockResult, 'mockMmisWarning failed — run scripts/createMMISMockProcedures.sql').toBe(true);
        console.log('[TC-030] MMIS Warning (SE) response mocked via database');

        await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
        await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 });

        const status = await getSyncStatus(page);
        console.log(`[TC-030] Sync status (mocked): ${JSON.stringify(status)}`);
        expect(status.responseStatus).toBe('SE');
      } else {
        const status = await pollForMmisResponse(page, { maxAttempts: 6, pollIntervalMs: 10_000 });
        console.log(`[TC-030] Sync status: ${JSON.stringify(status)}`);
        expect(status.responseStatus, 'Expected SU or SE — enrollment must succeed').toMatch(/^(SU|SE)$/);

        if (status.responseStatus === 'SU') {
          console.log('[TC-030] ⚠ MMIS returned SU (no warnings). SE-specific assertions will be skipped. Use MOCK_MMIS=true for full SE coverage.');
        }
      }
      tracker.record('ATC-ES-134 - Verify SE response status', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-134 - Verify SE response status', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 5: Verify enrollment still activated (SE = success) ─────────────

  test('ATC-ES-135 - Verify enrollment still activated (SE = success per BR-D01-010)', async () => {
    test.setTimeout(60_000);
    try {
      const status = await getSyncStatus(page);
      expect(status.hasConflict).toBe(false);

      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
      await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
      const rowText = await enrolledRow.textContent() || '';
      expect(rowText).toContain('Enrolled');
      console.log('[TC-030] ✓ Enrollment confirmed still active');
      tracker.record('ATC-ES-135 - Verify enrollment still activated (SE = success per BR-D01-010)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-135 - Verify enrollment still activated (SE = success per BR-D01-010)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-136 - Verify MMIS errors stored (warning-level)', async () => {
    test.setTimeout(60_000);
    try {
      const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
      expect(opened, 'Could not open enrollment detail').toBe(true);

      const errors = await getMMISErrors(page);
      console.log(`[TC-030] MMIS warning errors: ${JSON.stringify(errors)}`);

      if (MOCK_MMIS) {
        expect(errors.length).toBeGreaterThan(0);
      } else {
        console.log(`[TC-030] Error count: ${errors.length} (non-mocked — may be 0 if SU)`);
      }
      tracker.record('ATC-ES-136 - Verify MMIS errors stored (warning-level)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-136 - Verify MMIS errors stored (warning-level)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-137 - Verify no conflict badge (SE is success)', async () => {
    test.setTimeout(30_000);
    try {
      const conflictVisible = await hasConflictBadge(page);
      expect(conflictVisible).toBe(false);
      tracker.record('ATC-ES-137 - Verify no conflict badge (SE is success)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-137 - Verify no conflict badge (SE is success)', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
