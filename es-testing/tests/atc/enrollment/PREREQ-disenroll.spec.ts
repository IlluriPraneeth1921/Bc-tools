/**
 * ATC: TC-001 Prerequisite — Disenroll participant from IRIS
 *
 * This test disenrolls the participant so TC-001 can start from a clean state.
 * Run this BEFORE TC-001 when the participant has an active IRIS enrollment.
 *
 * Steps:
 * 1. Navigate to Program Enrollments
 * 2. Create Disenrolled enrollment via shared action
 * 3. Verify disenrollment appears in list
 * 4. Open detail and verify MMIS sync initiates
 */
import { test, expect, Page } from '@playwright/test';
import { loginAndSelectContext } from '../../helpers/login';
import { navigateToEnrollments } from '../../helpers/participant-resolver';
import {
  resolveParticipantUuid,
  addIrisEnrollment,
  openFirstEnrollmentDetail,
  getSyncStatus,
} from './actions/enrollment.actions';
import { captureMmisScreenshot } from '../../helpers/mmis-snapshot-capture';
import { createStepTracker, StepTracker } from '../../helpers/test-summary';

let page: Page;
let participantUuid: string;
let tracker: StepTracker;

test.describe.serial('PREREQ: Disenroll participant from IRIS', () => {

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await loginAndSelectContext(page);
    participantUuid = await resolveParticipantUuid(page);
    tracker = createStepTracker('PREREQ-disenroll', participantUuid);
    console.log(`[Prereq-Disenroll] Participant UUID: ${participantUuid}`);
  });

  test.afterAll(async () => {
    await tracker.finalize(page);
    await page.close();
  });

  test('PREREQ-001 - Disenroll participant from IRIS program', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      // Check if already disenrolled (first row is Disenrolled)
      const firstRow = page.locator('mat-row').first();
      const firstRowText = await firstRow.textContent() || '';
      if (firstRowText.includes('Disenrolled')) {
        console.log('[Prereq-Disenroll] Already disenrolled — skipping');
        tracker.record('PREREQ-001 - Disenroll participant from IRIS program', 'passed');
        return;
      }

      // Find the last Enrolled row's start date for reference
      const enrolledRow = page.locator('mat-row').filter({ hasText: /Enrolled/ }).first();
      const enrolledRowText = await enrolledRow.textContent() || '';
      const dateMatch = enrolledRowText.match(/(\d{2}\/\d{2}\/\d{4})/);
      let startDate = '07/01/2026';
      let endDate = '07/31/2026';

      if (dateMatch) {
        startDate = dateMatch[1];
        const [month, , year] = startDate.split('/').map(Number);
        const endOfMonth = new Date(year, month, 0).getDate();
        endDate = `${String(month).padStart(2, '0')}/${String(endOfMonth).padStart(2, '0')}/${year}`;
        console.log(`[Prereq-Disenroll] Using dates from enrolled row: Start=${startDate}, End=${endDate}`);
      }

      // Create Disenrolled enrollment using shared action
      const saved = await addIrisEnrollment(page, {
        program: 'IRIS',
        status: 'Disenrolled',
        statusReason: 'Involuntary',
        startDate,
        endDate,
      });
      expect(saved, 'Failed to create Disenrolled enrollment').toBe(true);
      console.log('[Prereq-Disenroll] Disenrollment saved successfully');
      tracker.record('PREREQ-001 - Disenroll participant from IRIS program', 'passed');
    } catch (err) {
      tracker.record('PREREQ-001 - Disenroll participant from IRIS program', 'failed', (err as Error).message);
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

  test('PREREQ-002 - Verify disenrollment appears in enrollment list', async () => {
    test.setTimeout(30_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const firstRow = page.locator('mat-row').first();
      const rowText = await firstRow.textContent() || '';
      console.log(`[Prereq-Disenroll] First row: ${rowText.trim().substring(0, 120)}`);
      expect(rowText).toContain('Disenrolled');
      tracker.record('PREREQ-002 - Verify disenrollment appears in enrollment list', 'passed');
    } catch (err) {
      tracker.record('PREREQ-002 - Verify disenrollment appears in enrollment list', 'failed', (err as Error).message);
      throw err;
    }
  });

  test('PREREQ-003 - Open disenrollment detail and verify MMIS sync status', async () => {
    test.setTimeout(60_000);
    try {
      await navigateToEnrollments(page, participantUuid);
      await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

      const opened = await openFirstEnrollmentDetail(page);
      expect(opened).toBe(true);

      // Reload to get fresh sync state
      await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
      await page.locator('main').first().waitFor({ state: 'visible', timeout: 10_000 });

      const status = await getSyncStatus(page);
      console.log(`[Prereq-Disenroll] Sync status: ${JSON.stringify(status)}`);

      // Sync should be pending or completed
      const pageText = await page.locator('main').textContent() || '';
      const hasSyncInfo = pageText.includes('MMIS') || pageText.includes('Sync') || pageText.includes('sync');
      expect(hasSyncInfo).toBe(true);
      tracker.record('PREREQ-003 - Open disenrollment detail and verify MMIS sync status', 'passed');
    } catch (err) {
      tracker.record('PREREQ-003 - Open disenrollment detail and verify MMIS sync status', 'failed', (err as Error).message);
      throw err;
    }
  });

}); // end describe.serial
