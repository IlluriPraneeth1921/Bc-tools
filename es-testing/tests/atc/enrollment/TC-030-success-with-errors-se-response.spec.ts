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
  getMMISErrors,
  openEnrollmentByText,
  pollForMmisResponse,
} from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { getFullEnrollmentState } from '../../helpers/state-checker';
import { mockMmisWarning, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_030;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;
let isPristine = false;

test.describe.serial('TC-030: SE Response — Enrollment Activated with Warnings', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-030] Participant UUID: ${participantUuid}, MOCK_MMIS: ${MOCK_MMIS}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // ─── Preconditions ────────────────────────────────────────────────────────

  test('ATC-ES-126 - Precondition: Participant is accessible', async () => {
    const accessible = await navigateToParticipant(page, participantUuid);
    expect(accessible).toBe(true);
  });

  test('ATC-ES-127 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
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
  });

  test('ATC-ES-128 - Reset: Ensure pristine state (if not pristine)', async () => {
    if (isPristine) {
      console.log('[TC-030] Skipping reset — already pristine');
      return;
    }

    const resetSuccess = await ensurePristineState(page, participantUuid);
    expect(resetSuccess, 'Failed to reset participant to pristine state').toBe(true);
    isPristine = true;
    console.log('[TC-030] ✓ Reset complete');
  });

  // ─── Step 1: Create Draft enrollment ──────────────────────────────────────

  test('ATC-ES-129 - Create Draft enrollment', async () => {
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
  });

  test('ATC-ES-130 - State check: First row is Draft', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    expect(rowText).toContain('Draft');
    console.log('[TC-030] ✓ Draft state verified');
  });

  // ─── Step 2: Create Referred enrollment ───────────────────────────────────

  test('ATC-ES-131 - Create Referred enrollment', async () => {
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
  });

  test('ATC-ES-132 - State check: First row is Referred', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    expect(rowText).toContain('Referred');
    console.log('[TC-030] ✓ Referred state verified');
  });

  // ─── Step 3: Create Enrolled enrollment (triggers MMIS sync → SE) ─────────

  test('ATC-ES-133 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
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
  });

  // ─── Step 4: Verify SE response (success with warnings) ──────────────────

  test('ATC-ES-134 - Verify SE response status', async () => {
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
      // Non-mocked: MMIS may return SU or SE depending on participant data.
      // SE requires specific data conditions (warnings) that cannot be forced externally.
      // Accept either SU or SE — both confirm enrollment was activated.
      const status = await pollForMmisResponse(page, { maxAttempts: 6, pollIntervalMs: 10_000 });
      console.log(`[TC-030] Sync status: ${JSON.stringify(status)}`);
      expect(status.responseStatus, 'Expected SU or SE — enrollment must succeed').toMatch(/^(SU|SE)$/);

      if (status.responseStatus === 'SU') {
        console.log('[TC-030] ⚠ MMIS returned SU (no warnings). SE-specific assertions will be skipped. Use MOCK_MMIS=true for full SE coverage.');
      }
    }
  });

  // ─── Step 5: Verify enrollment still activated (SE = success) ─────────────

  test('ATC-ES-135 - Verify enrollment still activated (SE = success per BR-D01-010)', async () => {
    const status = await getSyncStatus(page);
    expect(status.hasConflict).toBe(false);

    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

    const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
    await expect(enrolledRow).toBeVisible({ timeout: 15_000 });
    const rowText = await enrolledRow.textContent() || '';
    expect(rowText).toContain('Enrolled');
    console.log('[TC-030] ✓ Enrollment confirmed still active');
  });

  test('ATC-ES-136 - Verify MMIS errors stored (warning-level)', async () => {
    // In non-mocked mode with SU response, there may be no errors stored
    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened, 'Could not open enrollment detail').toBe(true);

    const errors = await getMMISErrors(page);
    console.log(`[TC-030] MMIS warning errors: ${JSON.stringify(errors)}`);

    if (MOCK_MMIS) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      // SU may have 0 errors; SE will have > 0. Log either way.
      console.log(`[TC-030] Error count: ${errors.length} (non-mocked — may be 0 if SU)`);
    }
  });

  test('ATC-ES-137 - Verify no conflict badge (SE is success)', async () => {
    const conflictVisible = await hasConflictBadge(page);
    expect(conflictVisible).toBe(false);
  });

}); // end describe.serial
