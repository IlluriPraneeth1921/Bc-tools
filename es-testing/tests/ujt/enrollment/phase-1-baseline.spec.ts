/**
 * UJT Phase 1 — Baseline Tests (No Prerequisites)
 *
 * Executes: TC-001, TC-015
 * Starting state: Clean participant (no active enrollment required)
 * Ending state: Active IRIS enrollment + Active SDPC enrollment
 *
 * This phase establishes the foundation for all subsequent phases.
 * TC-001 leaves participant Enrolled in IRIS with SU sync.
 * TC-015 leaves participant Enrolled in SDPC with SU sync.
 */
import { test, expect, Page, Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { loginAndSelectContext, BASE } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openEnrollmentByText,
  getSyncStatus,
} from '../../atc/enrollment/actions/enrollment.actions';
import {
  getCurrentIrisState,
  getCurrentSdpcState,
} from '../../helpers/state-checker';

const now = new Date();
const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
const currentYear = now.getFullYear();
let ISP_START_DATE = `${currentMonth}/01/${currentYear}`;

let browser: Browser;
let page: Page;
let participantUuid: string;

test.describe('UJT Phase 1: Baseline — TC-001, TC-015 (establish enrollment)', () => {
  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newContext().then(c => c.newPage());
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    console.log(`[Phase 1] Participant UUID: ${participantUuid}`);
  });
  test.setTimeout(600_000);
  test.afterAll(async () => { await browser.close(); });

  test('Phase1-Setup: Resolve ISP start date', async () => {
    await page.goto(`${BASE}/#/persons/person/${participantUuid}/personcenteredplan`, {
      waitUntil: 'domcontentloaded', timeout: 20_000,
    }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const pageText = await page.locator('main').textContent().catch(() => '') || '';
    const dateMatches = pageText.match(/(\d{2}\/\d{2}\/\d{4})/g) || [];

    if (dateMatches.length > 0) {
      const candidate = dateMatches[0]!;
      const [m, , y] = candidate.split('/').map(Number);
      const parsed = new Date(y, m - 1, 1);
      if (parsed <= now && y >= 2025) {
        ISP_START_DATE = candidate;
      }
    }
    console.log(`[Phase 1] ISP_START_DATE resolved: ${ISP_START_DATE}`);
  });

  // ─── TC-001: New IRIS Enrollment ────────────────────────────────────────────

  test('TC-001: Ensure participant has active IRIS enrollment with SU sync', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const state = await getCurrentIrisState(page);
    console.log(`[TC-001] Current IRIS state: ${state ?? '(none)'}`);

    if (state === 'Enrolled') {
      console.log('[TC-001] Already Enrolled — skipping creation');
      return;
    }

    // Progress through Draft → Referred → Enrolled
    if (state === null || state === 'Disenrolled') {
      await addIrisEnrollment(page, {
        program: 'IRIS', status: 'Draft', statusReason: 'Not Applicable', startDate: ISP_START_DATE,
      });
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
    }

    const stateAfterDraft = await getCurrentIrisState(page);
    if (stateAfterDraft === 'Draft') {
      await addIrisEnrollment(page, {
        program: 'IRIS', status: 'Referred', statusReason: 'IRIS Consultant', startDate: ISP_START_DATE,
      });
      await navigateToEnrollments(page, participantUuid);
      await page.waitForTimeout(2000);
    }

    const stateAfterReferred = await getCurrentIrisState(page);
    if (stateAfterReferred === 'Referred') {
      await addIrisEnrollment(page, {
        program: 'IRIS', status: 'Enrolled', statusReason: 'Not Applicable',
        startDate: ISP_START_DATE, endDate: '12/31/2299',
      });
    }

    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const finalState = await getCurrentIrisState(page);
    expect(finalState).toBe('Enrolled');
  });

  test('TC-001: Verify MMIS sync shows SU', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
    expect(opened).toBe(true);

    const status = await getSyncStatus(page);
    console.log(`[TC-001] Sync: ${JSON.stringify(status)}`);
    expect(status.hasConflict).toBe(false);
  });

  // ─── TC-015: New SDPC Enrollment ────────────────────────────────────────────

  test('TC-015: Ensure participant has active SDPC enrollment', async () => {
    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);

    const sdpcState = await getCurrentSdpcState(page);
    console.log(`[TC-015] Current SDPC state: ${sdpcState ?? '(none)'}`);

    if (sdpcState === 'Enrolled') {
      console.log('[TC-015] Already Enrolled in SDPC — skipping');
      return;
    }

    await addIrisEnrollment(page, {
      program: 'SDPC', status: 'Enrolled', statusReason: 'Not Applicable', startDate: ISP_START_DATE,
    });

    await navigateToEnrollments(page, participantUuid);
    await page.waitForTimeout(2000);
    const finalState = await getCurrentSdpcState(page);
    expect(finalState).toBe('Enrolled');
  });
});
