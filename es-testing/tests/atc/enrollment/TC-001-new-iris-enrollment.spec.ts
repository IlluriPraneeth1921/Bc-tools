/**
 * ATC: TC-001 — New IRIS Enrollment Happy Path
 *
 * Lifecycle: Pristine Check → (Reset if needed) → Draft → Referred → Enrolled → Verify MMIS sync
 *
 * Test Participant: MA ID 1430000013 (THREE TESTFEI)
 * Person UUID: c7a3862e-f166-466d-a5fb-b4670130aebd
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToParticipant, navigateToEnrollments } from '../../helpers/participant-resolver';
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
  EnrollmentStepConfig,
} from './actions/enrollment-lifecycle.steps';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { closeDb } from '../../helpers/db';
import { SCENARIOS } from '../../data/scenario-test-data';

// ─── Configuration ────────────────────────────────────────────────────────────

const DATA = SCENARIOS.TC_001;
const ISP_START_DATE = DATA.bcInput.enrollmentStartDate;
const ENROLLMENT_END_DATE = DATA.bcInput.enrollmentEndDate;
const MOCK_MMIS = process.env.MOCK_MMIS === 'true';

let browser: Browser;
let page: Page;
let participantUuid: string;
let isPristine = false;

test.describe.serial('TC-001: New IRIS Enrollment Happy Path', () => {

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[TC-001] UUID: ${participantUuid}, MOCK_MMIS: ${MOCK_MMIS}`);
  });
  test.setTimeout(300_000);
  test.afterAll(async () => {
    if (MOCK_MMIS) await closeDb();
    await browser.close();
  });

  // Shared config for reusable lifecycle steps
  const getStepConfig = (overrides?: Partial<EnrollmentStepConfig>): EnrollmentStepConfig => ({
    program: 'IRIS',
    startDate: ISP_START_DATE,
    endDate: ENROLLMENT_END_DATE,
    statusReason: 'IRIS Consultant',
    participantUuid,
    mockMmis: MOCK_MMIS,
    logPrefix: '[TC-001]',
    ...overrides,
  });

  test('ATC-ES-001 - Precondition: Participant is accessible', async () => {
    const accessible = await navigateToParticipant(page, participantUuid);
    expect(accessible).toBe(true);
  });

  test('ATC-ES-002 - Check MMIS Snapshot: Determine waiver enrollment state', async () => {
    const mmisState = await getMmisSnapshotState(page, participantUuid);
    console.log(`[TC-001] MMIS Snapshot: loaded=${mmisState.loaded}, hasActive=${mmisState.hasActiveWaiverEnrollment}`);
    expect(mmisState.loaded).toBe(true);

    if (!mmisState.hasActiveWaiverEnrollment) {
      isPristine = true;
      console.log('[TC-001] ✓ Pristine state — no active MMIS waiver enrollment');
    } else {
      isPristine = false;
      console.log('[TC-001] ✗ Active enrollment found — reset required');
    }
  });

  test('ATC-ES-003 - Reset: Withdraw referral to clear MMIS (if not pristine)', async () => {
    if (isPristine) {
      console.log('[TC-001] Skipping reset — already pristine');
      return;
    }

    const resetSuccess = await ensurePristineState(page, participantUuid);
    expect(resetSuccess, 'Failed to reset participant to pristine state').toBe(true);
    isPristine = true;
    console.log('[TC-001] ✓ Reset complete');
  });

  test('ATC-ES-004 - Create Draft enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.locator('mat-row, [class*="enrollment"]').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Skip if already at Draft or beyond (Referred/Enrolled from prior run)
    const firstRow = page.locator('mat-row').first();
    const rowText = await firstRow.textContent().catch(() => '') || '';
    if (rowText.includes('Draft') || rowText.includes('Referred') || rowText.includes('Enrolled')) {
      console.log(`[TC-001] Enrollment already exists (${rowText.includes('Draft') ? 'Draft' : rowText.includes('Referred') ? 'Referred' : 'Enrolled'}) — skipping Draft creation`);
      return;
    }

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Draft',
      statusReason: 'Not Applicable',
      startDate: ISP_START_DATE,
    });
    expect(saved, 'Failed to create Draft enrollment').toBe(true);
    console.log('[TC-001] Draft enrollment created');
  });

  test('ATC-ES-005 - State check: First row is Draft or beyond', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    // Accept Draft, Referred, or Enrolled — the lifecycle may have progressed
    const validState = rowText.includes('Draft') || rowText.includes('Referred') || rowText.includes('Enrolled');
    expect(validState, `Expected Draft/Referred/Enrolled but got: ${rowText.substring(0, 80)}`).toBe(true);
  });

  // ─── Referred step (shared with TC-015) ─────────────────────────────────

  test('ATC-ES-006 - Create Referred enrollment', async () => {
    // Skip if already at Referred or beyond
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    if (rowText.includes('Referred') || rowText.includes('Enrolled')) {
      console.log(`[TC-001] Already at ${rowText.includes('Enrolled') ? 'Enrolled' : 'Referred'} — skipping Referred creation`);
      return;
    }
    await createReferredEnrollment(page, getStepConfig());
  });

  test('ATC-ES-007 - State check: First row is Referred or beyond', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    const validState = rowText.includes('Referred') || rowText.includes('Enrolled');
    expect(validState, `Expected Referred/Enrolled but got: ${rowText.substring(0, 80)}`).toBe(true);
  });

  // ─── Enrolled step (shared with TC-015, triggers MMIS sync) ─────────────

  test('ATC-ES-008 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
    // Skip if already Enrolled
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    if (rowText.includes('Enrolled')) {
      console.log('[TC-001] Already Enrolled — skipping Enrolled creation');
      return;
    }
    await createEnrolledEnrollment(page, getStepConfig({ statusReason: 'Not Applicable' }));
  });

  test('ATC-ES-009 - Verify: First row is Enrolled with sync badge', async () => {
    await navigateToEnrollments(page, participantUuid);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('Enrolled');
    expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
  });

  // ─── MMIS Verification (shared with TC-015) ─────────────────────────────

  test('ATC-ES-010 - Verify: MMIS sync success, no conflict', async () => {
    await verifyMmisSyncSuccess(page, getStepConfig({ statusReason: 'Not Applicable' }));
  });

});
