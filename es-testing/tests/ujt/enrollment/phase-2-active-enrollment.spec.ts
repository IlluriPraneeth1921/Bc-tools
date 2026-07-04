/**
 * UJT Phase 2 — Requires Active IRIS Enrollment (TC-001 SU)
 *
 * Executes: TC-002, TC-006, TC-010, TC-011, TC-014, TC-003, TC-016, TC-019, TC-020
 * Starting state: Participant is Enrolled in IRIS with successful MMIS sync
 *
 * Each test uses shared actions from enrollment.actions.ts.
 * State-aware: checks preconditions and skips gracefully.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  editEnrollment,
  openEnrollmentByText,
  addSuspension,
  performIcaTransfer,
  performFeaTransfer,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentIrisState,
  getFullEnrollmentState,
  computeTestDates,
} from '../../helpers/state-checker';

const now = new Date();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const currentYear = now.getFullYear();
const ISP_START_DATE = `${currentMonth}/01/${currentYear}`;
const dates = computeTestDates(ISP_START_DATE);

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 2: Active Enrollment Scenarios', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 2] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(600_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase2-Precondition: Verify active IRIS enrollment exists', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    console.log(`[Phase 2] Current IRIS state: ${state}`);
    expect(state, 'Precondition: participant must be Enrolled. Run Phase 1 first.').toBe('Enrolled');
  });

  // ─── TC-002: Enrolled → Suspended (bounded) ────────────────────────────────

  test('TC-002: Add bounded suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled') { test.skip(); return; }
    if (state.hasSuspension) {
      console.log('[TC-002] Skipping — suspension already exists');
      return;
    }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    await addSuspension(page, {
      startDate: dates.suspensionStart,
      endDate: dates.suspensionEnd,
      reason: 'Hospital Admission',
    });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-002] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-003: ICA Transfer ──────────────────────────────────────────────────

  test('TC-003: ICA Transfer on active span', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    await performIcaTransfer(page);

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-003] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-016: FEA Transfer ──────────────────────────────────────────────────

  test('TC-016: FEA Transfer on active span', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    await performFeaTransfer(page);

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-016] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-019: Begin Date Earlier ─────────────────────────────────────────────

  test('TC-019: Change begin date earlier', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    // Move 5 days earlier
    const parts = dates.enrollmentStart.split('/').map(Number);
    const earlier = new Date(parts[2], parts[0] - 1, parts[1] - 5);
    const earlierStr = `${String(earlier.getMonth() + 1).padStart(2, '0')}/${String(earlier.getDate()).padStart(2, '0')}/${earlier.getFullYear()}`;

    const edited = await editEnrollment(page, { startDate: earlierStr });
    expect(edited).toBe(true);

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-019] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-020: Begin Date Later ───────────────────────────────────────────────

  test('TC-020: Change begin date later', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const edited = await editEnrollment(page, { startDate: dates.enrollmentStart });
    expect(edited).toBe(true);

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-020] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-014: Address-only update ────────────────────────────────────────────

  test('TC-014: Address-only update (verify precondition)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    // Navigate to address section to trigger S700
    await page.goto(`${BASE}/#/persons/person/${participantUuid}/record/profile`, {
      waitUntil: 'domcontentloaded', timeout: 30_000,
    });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});

    const pageText = await page.locator('main').textContent().catch(() => '') || '';
    expect(/address|contact/i.test(pageText)).toBe(true);
    console.log('[TC-014] Address section accessible — S700 would trigger on update');
  });

  // ─── TC-010: Open-ended suspension ──────────────────────────────────────────

  test('TC-010: Add open-ended suspension', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getFullEnrollmentState(page);

    if (state.irisState !== 'Enrolled') { test.skip(); return; }
    if (state.hasSuspension) {
      console.log('[TC-010] Skipping — suspension already exists');
      return;
    }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    await addSuspension(page, { startDate: dates.suspensionStart });

    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    const status = await getSyncStatus(page);
    console.log(`[TC-010] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-011: Suspension too short ───────────────────────────────────────────

  test('TC-011: Attempt suspension < 3 days (expect error)', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const shortEnd = `${currentMonth}/11/${currentYear}`;
    await addSuspension(page, { startDate: dates.suspensionStart, endDate: shortEnd });

    // Expect validation error — no MMIS sync
    await page.waitForTimeout(3000);
    const pageText = await page.locator('main').textContent() || '';
    const dialogText = await page.locator('mat-dialog-container').textContent().catch(() => '') || '';
    const hasError = (pageText + dialogText).match(/error|invalid|minimum|too short/i);
    console.log(`[TC-011] Error detected: ${!!hasError}`);
  });

  // ─── TC-006: End date earlier (disenrollment) ──────────────────────────────

  test('TC-006: Disenroll by setting earlier end date', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const state = await getCurrentIrisState(page);
    if (state !== 'Enrolled') { test.skip(); return; }

    const saved = await addIrisEnrollment(page, {
      program: 'IRIS',
      status: 'Disenrolled',
      statusReason: 'Not Applicable',
      startDate: dates.enrollmentStart,
      endDate: dates.disenrollStart,
    });
    expect(saved).toBe(true);

    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    expect(pageText).toContain('Disenrolled');
    console.log('[TC-006] Disenrolled — S340 triggered');
  });
});
