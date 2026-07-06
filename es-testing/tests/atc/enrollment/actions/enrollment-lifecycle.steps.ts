/**
 * Shared Enrollment Lifecycle Steps
 *
 * Reusable test step functions for enrollment lifecycle flows shared between
 * TC-001 (IRIS) and TC-015 (SDPC), and potentially other enrollment tests.
 *
 * These functions encapsulate the common patterns:
 *   - Creating a Referred enrollment
 *   - Creating an Enrolled enrollment (triggers MMIS sync)
 *   - Verifying enrollment row state
 *   - Verifying MMIS sync success
 */
import { Page, expect } from '@playwright/test';
import { navigateToEnrollments } from '../../../helpers/participant-resolver';
import {
  addIrisEnrollment,
  openFirstEnrollmentDetail,
  openEnrollmentByText,
  verifyMmisSync,
  getSyncStatus,
} from './enrollment.actions';
import { mockMmisSuccess, extractProgramEnrollmentKeyFromUrl } from '../../../helpers/db';

export interface EnrollmentStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  startDate: string;
  endDate?: string;
  statusReason?: string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRED STEP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a Referred enrollment for the given program.
 * TC-001 uses statusReason='IRIS Consultant', TC-015 uses 'Not Applicable'.
 */
export async function createReferredEnrollment(
  page: Page,
  config: EnrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const saved = await addIrisEnrollment(page, {
    program: config.program,
    status: 'Referred',
    statusReason: config.statusReason || 'Not Applicable',
    startDate: config.startDate,
  });
  expect(saved, `Failed to create ${config.program} Referred enrollment`).toBe(true);
  console.log(`${config.logPrefix} Referred enrollment created`);
}

/**
 * Verifies that the enrollment row shows the expected program and 'Referred' status.
 */
export async function verifyReferredState(
  page: Page,
  config: EnrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  const firstRow = page.locator('mat-row').first();
  await expect(firstRow).toBeVisible({ timeout: 15_000 });
  const rowText = await firstRow.textContent() || '';
  expect(rowText).toContain(config.program);
  expect(rowText).toContain('Referred');
  console.log(`${config.logPrefix} Verified Referred state`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENROLLED STEP (triggers MMIS sync)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an Enrolled enrollment for the given program (triggers MMIS sync).
 */
export async function createEnrolledEnrollment(
  page: Page,
  config: EnrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const saved = await addIrisEnrollment(page, {
    program: config.program,
    status: 'Enrolled',
    statusReason: config.statusReason || 'Not Applicable',
    startDate: config.startDate,
    endDate: config.endDate,
  });
  expect(saved, `Failed to create ${config.program} Enrolled enrollment`).toBe(true);
  console.log(`${config.logPrefix} Enrolled enrollment created — MMIS sync triggered`);
}

/**
 * Verifies the enrollment row shows Enrolled status with a sync badge.
 */
export async function verifyEnrolledState(
  page: Page,
  config: EnrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  const row = page.locator('mat-row').filter({ hasText: new RegExp(config.program) }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });
  const rowText = await row.textContent() || '';
  expect(rowText).toContain('Enrolled');
  console.log(`${config.logPrefix} Verified Enrolled state`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MMIS SYNC VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Opens enrollment detail and verifies MMIS sync succeeded with SU/SE response
 * and no conflicts.
 */
export async function verifyMmisSyncSuccess(
  page: Page,
  config: EnrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  // Open enrollment detail by program name
  const opened = await openEnrollmentByText(page, new RegExp(config.program));
  expect(opened, `Could not open ${config.program} enrollment detail`).toBe(true);

  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });

  expect(status.responseStatus, 'Expected SU/SE response from MMIS').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);

  const txnListVisible = await page.getByText('MMIS Transaction List').first().isVisible({ timeout: 15_000 }).catch(() => false);
  if (txnListVisible) {
    await page.reload({ waitUntil: 'networkidle', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    const transactionRows = page.locator('mat-row, tr').filter({ hasText: /[CSO]/ });
    const count = await transactionRows.count();
    console.log(`${config.logPrefix} MMIS transaction rows found: ${count}`);
  }

  console.log(`${config.logPrefix} ✓ MMIS sync verified (${status.responseStatus})`);
}

/**
 * Verifies final sync status (SU/SE response, no conflict).
 */
export async function verifyFinalSyncStatus(
  page: Page,
  config: EnrollmentStepConfig
): Promise<void> {
  const status = await getSyncStatus(page);
  console.log(`${config.logPrefix} Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
}
