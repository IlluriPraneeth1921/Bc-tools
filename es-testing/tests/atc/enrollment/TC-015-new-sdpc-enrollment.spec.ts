/**
 * ATC: TC-015 — New SDPC Enrollment
 *
 * Lifecycle: Verify IRIS Enrolled → SDPC Assessing → SDPC Referred → SDPC Enrolled → Verify MMIS sync
 *
 * Prerequisite: Participant must already be enrolled in the IRIS program.
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Person UUID: c7a3862e-f166-466d-a5fb-b4670130aebd
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
} from './actions/enrollment.actions';
import {
  createReferredEnrollment,
  verifyReferredState,
  createEnrolledEnrollment,
  verifyEnrolledState,
  verifyMmisSyncSuccess,
  verifyFinalSyncStatus,
  EnrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { SCENARIOS } from '../../data/scenario-test-data';
import { closeDb } from '../../helpers/db';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

// ─── Test Data ────────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_015;
const ENROLLMENT_START = DATA.bcInput.enrollmentStartDate;   // 06/01/2026 for Assessing & Referred
const ENROLLED_START = '06/02/2026';                         // 06/02/2026 for Enrolled step
const ENROLLMENT_END = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('TC-015: New SDPC Enrollment', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('TC-015', participantUuid);
    console.log(`[TC-015] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    if (MOCK_MMIS) await closeDb();
    await page.close();
  });

  // Shared config for reusable lifecycle steps
  const getStepConfig = (overrides?: Partial<EnrollmentStepConfig>): EnrollmentStepConfig => ({
    program: 'SDPC',
    startDate: ENROLLMENT_START,
    endDate: ENROLLMENT_END,
    statusReason: 'Not Applicable',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-015]',
    ...overrides,
  });

  // ─── Precondition: Participant must already be enrolled in IRIS ──────────

  test('ATC-ES-064 - Precondition: Verify participant has IRIS enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const irisRow = page.locator('mat-row').filter({ hasText: /IRIS/ }).first();
      await expect(irisRow).toBeVisible({ timeout: 15_000 });
      const rowText = await irisRow.textContent() || '';
      console.log(`[TC-015] IRIS row: ${rowText.trim().substring(0, 120)}`);
      expect(rowText).toContain('IRIS');
      expect(rowText).toContain('Enrolled');
      console.log('[TC-015] ✓ Precondition met — participant is enrolled in IRIS');
      tracker.record('ATC-ES-064 - Precondition: Verify participant has IRIS enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-064 - Precondition: Verify participant has IRIS enrollment', 'failed', (err as Error).message);
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

  // ─── Step 1: Create SDPC Assessing enrollment ───────────────────────────

  test('ATC-ES-065a - Create SDPC Assessing enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

      const saved = await addIrisEnrollment(page, {
        program: 'SDPC',
        status: 'Assessing',
        statusReason: 'Not Applicable',
        startDate: ENROLLMENT_START,
      });
      expect(saved, 'Failed to create SDPC Assessing enrollment').toBe(true);
      console.log('[TC-015] SDPC Assessing created');
      tracker.record('ATC-ES-065a - Create SDPC Assessing enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-065a - Create SDPC Assessing enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-065a-verify - State check: SDPC row is Assessing', async () => {
    test.setTimeout(30_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });
      const sdpcRow = page.locator('mat-row').filter({ hasText: /SDPC/ }).first();
      await expect(sdpcRow).toBeVisible({ timeout: 15_000 });
      const rowText = await sdpcRow.textContent() || '';
      console.log(`[TC-015] SDPC row: ${rowText.trim().substring(0, 120)}`);
      expect(rowText).toContain('SDPC');
      expect(rowText).toContain('Assessing');
      tracker.record('ATC-ES-065a-verify - State check: SDPC row is Assessing', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-065a-verify - State check: SDPC row is Assessing', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 2: Create SDPC Referred enrollment (shared step) ──────────────

  test('ATC-ES-065b - Create SDPC Referred enrollment', async () => {
    test.setTimeout(60_000);
    try {
      await createReferredEnrollment(page, getStepConfig());
      tracker.record('ATC-ES-065b - Create SDPC Referred enrollment', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-065b - Create SDPC Referred enrollment', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-065b-verify - State check: SDPC row is Referred', async () => {
    test.setTimeout(30_000);
    try {
      await verifyReferredState(page, getStepConfig());
      tracker.record('ATC-ES-065b-verify - State check: SDPC row is Referred', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-065b-verify - State check: SDPC row is Referred', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── Step 3: Create SDPC Enrolled enrollment (shared step, triggers MMIS) ─

  test('ATC-ES-065c - Create SDPC Enrolled enrollment (triggers MMIS)', async () => {
    test.setTimeout(60_000);
    try {
      await createEnrolledEnrollment(page, getStepConfig({ startDate: ENROLLED_START }));
      tracker.record('ATC-ES-065c - Create SDPC Enrolled enrollment (triggers MMIS)', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-065c - Create SDPC Enrolled enrollment (triggers MMIS)', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-066 - Verify SDPC enrollment appears as Enrolled', async () => {
    test.setTimeout(30_000);
    try {
      await verifyEnrolledState(page, getStepConfig({ startDate: ENROLLED_START }));
      tracker.record('ATC-ES-066 - Verify SDPC enrollment appears as Enrolled', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-066 - Verify SDPC enrollment appears as Enrolled', 'failed', (err as Error).message);
      throw err;
    }
  });

  // ─── MMIS Verification (shared steps) ───────────────────────────────────

  test('ATC-ES-067 - Verify MMIS sync success and SU response', async () => {
    test.setTimeout(90_000);
    try {
      await verifyMmisSyncSuccess(page, getStepConfig({ startDate: ENROLLED_START }));
      tracker.record('ATC-ES-067 - Verify MMIS sync success and SU response', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-067 - Verify MMIS sync success and SU response', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('ATC-ES-068 - Verify SU response and no conflict', async () => {
    test.setTimeout(30_000);
    try {
      await verifyFinalSyncStatus(page, getStepConfig({ startDate: ENROLLED_START }));
      tracker.record('ATC-ES-068 - Verify SU response and no conflict', 'passed');
    } catch (err) {
      tracker.record('ATC-ES-068 - Verify SU response and no conflict', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
