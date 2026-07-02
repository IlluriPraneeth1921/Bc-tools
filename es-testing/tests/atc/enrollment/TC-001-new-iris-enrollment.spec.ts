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
  openFirstEnrollmentDetail,
  getSyncStatus,
  verifyMmisSync,
} from './actions/enrollment.actions';
import { getMmisSnapshotState } from '../../helpers/mmis-snapshot';
import { ensurePristineState } from '../../helpers/reset-enrollment';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl, closeDb } from '../../helpers/db';
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
    await page.waitForTimeout(2000);

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Draft',
      statusReason: 'Not Applicable',
      startDate: ISP_START_DATE,
    });
    expect(saved, 'Failed to create Draft enrollment').toBe(true);
    console.log('[TC-001] Draft enrollment created');
  });

  test('ATC-ES-005 - State check: First row is Draft', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    expect(rowText).toContain('Draft');
  });

  test('ATC-ES-006 - Create Referred enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Referred',
      statusReason: 'IRIS Consultant',
      startDate: ISP_START_DATE,
    });
    expect(saved, 'Failed to create Referred enrollment').toBe(true);
    console.log('[TC-001] Referred enrollment created');
  });

  test('ATC-ES-007 - State check: First row is Referred', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('IRIS');
    expect(rowText).toContain('Referred');
  });

  test('ATC-ES-008 - Create Enrolled enrollment (triggers MMIS sync)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Enrolled',
      statusReason: 'Not Applicable',
      startDate: ISP_START_DATE,
      endDate: ENROLLMENT_END_DATE,
    });
    expect(saved, 'Failed to create Enrolled enrollment').toBe(true);
    console.log('[TC-001] Enrolled enrollment created — MMIS sync triggered');
  });

  test('ATC-ES-009 - Verify: First row is Enrolled with sync badge', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const firstRow = page.locator('mat-row').first();
    await expect(firstRow).toBeVisible({ timeout: 15_000 });
    const rowText = await firstRow.textContent() || '';
    expect(rowText).toContain('Enrolled');
    expect(rowText.includes('Success') || rowText.includes('Warning') || rowText.includes('Pending')).toBe(true);
  });

  test('ATC-ES-010 - Verify: MMIS sync success, no conflict', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const opened = await openFirstEnrollmentDetail(page);
    expect(opened).toBe(true);

    const status = await verifyMmisSync(page, {
      participantUuid,
      mockMmis: MOCK_MMIS,
      mockFn: mockMmisSuccess,
      extractKeyFn: extractProgramEnrollmentKeyFromUrl,
    });

    expect(status.responseStatus, 'Expected SU or SE response from MMIS').toMatch(/^(SU|SE)$/);
    expect(status.hasConflict).toBe(false);

    await expect(page.getByText('MMIS Transaction List').first()).toBeVisible({ timeout: 10_000 });
    console.log(`[TC-001] ✓ Enrollment created and MMIS sync verified (${status.responseStatus})`);
  });

});
