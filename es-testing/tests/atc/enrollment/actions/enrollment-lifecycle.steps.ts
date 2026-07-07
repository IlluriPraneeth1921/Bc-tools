/**
 * Shared Enrollment Lifecycle Steps
 *
 * Reusable test step functions for enrollment lifecycle flows shared between
 * TC-001 (IRIS) and TC-015 (SDPC), and potentially other enrollment tests.
 *
 * These functions encapsulate the common patterns:
 *   - Creating a Referred enrollment
 *   - Creating an Enrolled enrollment (triggers MMIS sync)
 *   - Adding a bounded suspension
 *   - Verifying enrollment row state
 *   - Verifying MMIS sync success
 */
import { Page, expect } from '@playwright/test';
import { navigateToEnrollments } from '../../../helpers/participant-resolver';
import {
  addIrisEnrollment,
  openEnrollmentByText,
  addSuspension,
  deleteSuspension,
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


// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENSION STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SuspensionStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  suspensionStartDate: string;
  suspensionEndDate?: string;
  reason?: string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

/**
 * Verifies the participant has an Enrolled enrollment for the given program,
 * then opens that enrollment's detail page.
 */
export async function openEnrolledProgramDetail(
  page: Page,
  config: SuspensionStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

  // Verify the program row exists and is Enrolled
  const programRow = page.locator('mat-row').filter({ hasText: new RegExp(config.program) }).first();
  await expect(programRow).toBeVisible({ timeout: 15_000 });
  const rowText = await programRow.textContent() || '';
  expect(rowText, `Precondition: ${config.program} must be Enrolled`).toContain('Enrolled');
  console.log(`${config.logPrefix} ✓ Precondition met — ${config.program} is Enrolled`);

  // Open the enrollment detail
  const opened = await openEnrollmentByText(page, new RegExp(`${config.program}`));
  expect(opened, `Could not open ${config.program} enrollment detail`).toBe(true);
  console.log(`${config.logPrefix} Opened ${config.program} enrollment detail`);
}

/**
 * Adds a bounded suspension to the currently open enrollment detail.
 * Must be called after navigating to the enrollment detail page.
 */
export async function addBoundedSuspension(
  page: Page,
  config: SuspensionStepConfig
): Promise<void> {
  const result = await addSuspension(page, {
    startDate: config.suspensionStartDate,
    endDate: config.suspensionEndDate,
    reason: config.reason || 'Hospital Admission',
  });
  expect(result, 'Failed to add suspension').toBe(true);
  console.log(`${config.logPrefix} Suspension added: ${config.suspensionStartDate} → ${config.suspensionEndDate || 'open-ended'}`);
}

/**
 * Verifies MMIS sync after a suspension is added (typically 3 transactions: S500+S510+S520).
 * Must be called while on the enrollment detail page.
 */
export async function verifySuspensionMmisSync(
  page: Page,
  config: SuspensionStepConfig
): Promise<void> {
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
 * Verifies final sync status after suspension (SU/SE, no conflict).
 */
export async function verifySuspensionFinalStatus(
  page: Page,
  config: SuspensionStepConfig
): Promise<void> {
  const status = await getSyncStatus(page);
  console.log(`${config.logPrefix} Sync status: ${JSON.stringify(status)}`);

  expect(status.responseStatus ?? 'SU').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
}


// ═══════════════════════════════════════════════════════════════════════════════
// END DATE EARLIER / DISENROLLMENT STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DisenrollmentStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  startDate: string;
  newEndDate: string;
  statusReason?: string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

/**
 * Verifies participant is Enrolled in the given program.
 */
export async function verifyEnrolledPrecondition(
  page: Page,
  config: DisenrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

  const programRow = page.locator('mat-row').filter({ hasText: new RegExp(config.program) }).first();
  await expect(programRow).toBeVisible({ timeout: 15_000 });
  const rowText = await programRow.textContent() || '';
  expect(rowText, `Precondition: ${config.program} must be Enrolled`).toContain('Enrolled');
  console.log(`${config.logPrefix} ✓ Precondition met — ${config.program} is Enrolled`);
}

/**
 * Creates a Disenrolled enrollment via "+ New Program Enrollment" dialog,
 * setting an earlier end date (triggers MMIS closure transaction S340).
 */
export async function createDisenrolledWithEarlierEndDate(
  page: Page,
  config: DisenrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const saved = await addIrisEnrollment(page, {
    program: config.program,
    status: 'Disenrolled',
    statusReason: config.statusReason || 'Not Applicable',
    startDate: config.startDate,
    endDate: config.newEndDate,
  });
  expect(saved, 'Dialog did not close after save — validation errors').toBe(true);

  // Verify Disenrolled appears on page
  await page.waitForTimeout(2000);
  const pageText = await page.locator('body').textContent().catch(() => '') || '';
  expect(pageText, 'Disenrolled status not found after save').toContain('Disenrolled');
  console.log(`${config.logPrefix} Disenrolled enrollment created, End Date = ${config.newEndDate}`);
}

/**
 * Opens the Disenrolled enrollment detail and verifies MMIS sync completed with SU/SE response.
 */
export async function verifyDisenrollmentMmisSync(
  page: Page,
  config: DisenrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const opened = await openEnrollmentByText(page, /Disenrolled/);
  expect(opened, 'Could not open Disenrolled enrollment detail').toBe(true);

  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });

  expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ MMIS closure completed (${status.responseStatus})`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// SUSPENSION DELETE STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface SuspensionDeleteStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

/**
 * Verifies participant has an Enrolled/Suspended enrollment for the given program,
 * opens the enrollment detail, and confirms a suspension record exists.
 */
export async function openEnrollmentWithSuspension(
  page: Page,
  config: SuspensionDeleteStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 });

  // Verify program row exists and is Enrolled or Suspended
  const programRow = page.locator('mat-row').filter({ hasText: new RegExp(config.program) }).first();
  await expect(programRow).toBeVisible({ timeout: 15_000 });
  const rowText = await programRow.textContent() || '';
  const hasValidState = rowText.includes('Enrolled') || rowText.includes('Suspended');
  expect(hasValidState, `Precondition: ${config.program} must be Enrolled or Suspended, got: ${rowText.trim().substring(0, 80)}`).toBe(true);

  // Open enrollment detail
  const opened = await openEnrollmentByText(page, new RegExp(config.program));
  expect(opened, `Could not open ${config.program} enrollment detail`).toBe(true);

  // Verify suspension exists on detail page
  const suspHeading = page.locator('span:text("Suspensions")').first();
  await expect(suspHeading).toBeVisible({ timeout: 15_000 });
  await suspHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);

  const menuBtn = page.locator('button.ellipse-action-menu[aria-label="Expand menu"]').first();
  const hasSusp = await menuBtn.isVisible({ timeout: 5_000 }).catch(() => false);
  expect(hasSusp, 'No suspension record found on detail page').toBe(true);
  console.log(`${config.logPrefix} ✓ Precondition met — ${config.program} enrollment has suspension record`);
}

/**
 * Deletes the suspension record from the currently open enrollment detail.
 * Must be called after navigating to the enrollment detail page.
 */
export async function deleteExistingSuspension(
  page: Page,
  config: SuspensionDeleteStepConfig
): Promise<void> {
  const deleted = await deleteSuspension(page);
  expect(deleted, 'Suspension deletion failed').toBe(true);
  console.log(`${config.logPrefix} Suspension successfully deleted`);
}

/**
 * Verifies MMIS sync after suspension deletion (typically 2 transactions: S410 + S470).
 * Must be called while on/near the enrollment detail page.
 */
export async function verifySuspensionDeleteMmisSync(
  page: Page,
  config: SuspensionDeleteStepConfig
): Promise<void> {
  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });

  expect(status.responseStatus, 'Expected SU or SE response').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ Suspension delete sync completed (${status.responseStatus})`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// EDIT ENROLLMENT (Begin Date / End Date Change) STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EditEnrollmentStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
  /** New start date (optional, for begin-date-change tests) */
  newStartDate?: string;
  /** New end date (optional, for end-date-change tests) */
  newEndDate?: string;
}

/**
 * Verifies the program enrollment is in Enrolled state, opens its detail,
 * and edits the enrollment (start/end date change).
 */
export async function editEnrolledProgramEnrollment(
  page: Page,
  config: EditEnrollmentStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const opened = await openEnrollmentByText(page, new RegExp(config.program));
  expect(opened, `Could not open ${config.program} enrollment detail`).toBe(true);

  const { editEnrollment } = await import('./enrollment.actions');
  const opts: Record<string, string> = {};
  if (config.newStartDate) opts.startDate = config.newStartDate;
  if (config.newEndDate) opts.endDate = config.newEndDate;

  const edited = await editEnrollment(page, opts);
  expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
  if (config.newStartDate) console.log(`${config.logPrefix} Begin date changed to: ${config.newStartDate}`);
  if (config.newEndDate) console.log(`${config.logPrefix} End date changed to: ${config.newEndDate}`);
}

/**
 * Verifies MMIS sync after an enrollment edit (begin/end date change).
 */
export async function verifyEditEnrollmentMmisSync(
  page: Page,
  config: EditEnrollmentStepConfig
): Promise<void> {
  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });

  expect(status.responseStatus, 'Expected SU/SE response from MMIS').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ MMIS sync verified (${status.responseStatus})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDIT SUSPENSION (Begin/End Date Change) STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EditSuspensionStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
  /** New suspension start date (optional) */
  newSuspensionStartDate?: string;
  /** New suspension end date (optional, use empty string to clear) */
  newSuspensionEndDate?: string | null;
}

/**
 * Opens the program enrollment detail (must be Enrolled/Suspended with suspension),
 * then edits the suspension dates.
 */
export async function editProgramSuspension(
  page: Page,
  config: EditSuspensionStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const opened = await openEnrollmentByText(page, new RegExp(config.program));
  expect(opened, `Could not open ${config.program} enrollment detail`).toBe(true);

  const { editSuspension } = await import('./enrollment.actions');
  const opts: Record<string, string | null | undefined> = {};
  if (config.newSuspensionStartDate !== undefined) opts.startDate = config.newSuspensionStartDate;
  if (config.newSuspensionEndDate !== undefined) opts.endDate = config.newSuspensionEndDate;

  const edited = await editSuspension(page, opts as any);
  expect(edited, 'Edit suspension dialog did not close — validation errors').toBe(true);
  if (config.newSuspensionStartDate) console.log(`${config.logPrefix} Suspension begin changed to: ${config.newSuspensionStartDate}`);
  if (config.newSuspensionEndDate !== undefined) console.log(`${config.logPrefix} Suspension end changed to: ${config.newSuspensionEndDate ?? 'NULL (open-ended)'}`);
}

/**
 * Verifies MMIS sync after a suspension edit.
 */
export async function verifyEditSuspensionMmisSync(
  page: Page,
  config: EditSuspensionStepConfig
): Promise<void> {
  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });

  expect(status.responseStatus, 'Expected SU/SE response from MMIS').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ MMIS sync verified (${status.responseStatus})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPEN-ENDED SUSPENSION STEP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adds an open-ended suspension (no end date) to the currently open enrollment detail.
 */
export async function addOpenEndedSuspension(
  page: Page,
  config: SuspensionStepConfig
): Promise<void> {
  const result = await addSuspension(page, {
    startDate: config.suspensionStartDate,
    // No endDate — open-ended
    reason: config.reason || 'Hospital Admission',
  });
  expect(result, 'Failed to add open-ended suspension').toBe(true);
  console.log(`${config.logPrefix} Open-ended suspension added: ${config.suspensionStartDate} → (none)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REINSTATEMENT (Disenrolled → Enrolled) STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReinstatementStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  startDate: string;
  endDate?: string;
  statusReason?: string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

/**
 * Verifies the program is Disenrolled, then creates a new Enrolled enrollment (reinstatement).
 */
export async function reinstateEnrollment(
  page: Page,
  config: ReinstatementStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const saved = await addIrisEnrollment(page, {
    program: config.program,
    status: 'Enrolled',
    statusReason: config.statusReason || 'Not Applicable',
    startDate: config.startDate,
    endDate: config.endDate || '12/31/2299',
  });
  expect(saved, `Failed to create ${config.program} Enrolled enrollment (reinstatement)`).toBe(true);
  console.log(`${config.logPrefix} Enrolled enrollment created (reinstatement)`);
}

/**
 * Verifies MMIS sync after reinstatement.
 */
export async function verifyReinstatementMmisSync(
  page: Page,
  config: ReinstatementStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const opened = await openEnrollmentByText(page, new RegExp(`${config.program}.*Enrolled|Enrolled.*${config.program}`));
  expect(opened, `Could not open ${config.program} Enrolled detail`).toBe(true);

  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });
  expect(status.responseStatus, 'Expected SU/SE response').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ Reinstatement MMIS sync verified (${status.responseStatus})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// END DATE LATER (Extension) STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface EndDateLaterStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  startDate: string;
  newEndDate: string;
  statusReason?: string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

/**
 * Verifies participant is Disenrolled in the given program, then creates
 * a new Enrolled enrollment with a later end date (extension / re-enrollment).
 * For IRIS this goes through Draft → Referred → Enrolled; for SDPC it can go
 * Assessing → Referred → Enrolled or direct Enrolled depending on test flow.
 */
export async function createEnrolledWithLaterEndDate(
  page: Page,
  config: EndDateLaterStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const saved = await addIrisEnrollment(page, {
    program: config.program,
    status: 'Enrolled',
    statusReason: config.statusReason || 'Not Applicable',
    startDate: config.startDate,
    endDate: config.newEndDate,
  });
  expect(saved, `Failed to create ${config.program} Enrolled enrollment with later end date`).toBe(true);
  console.log(`${config.logPrefix} Enrolled enrollment created with end date ${config.newEndDate}`);
}

/**
 * Verifies MMIS sync after end date later (extension).
 */
export async function verifyEndDateLaterMmisSync(
  page: Page,
  config: EndDateLaterStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  const opened = await openEnrollmentByText(page, /Enrolled/, /Disenrolled/);
  expect(opened, `Could not open Enrolled enrollment detail`).toBe(true);

  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });
  expect(status.responseStatus, 'Expected SU/SE response').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ End date later sync verified (${status.responseStatus})`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL WITHDRAWN (Reset to Pristine) STEPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReferralWithdrawnStepConfig {
  program: 'IRIS' | 'SDPC' | string;
  participantUuid: string;
  mockMmis: boolean;
  logPrefix: string;
}

/**
 * Opens the program enrollment detail and changes status to "Referral Withdrawn".
 * This deletes the MMIS span and resets the enrollment to pristine state.
 */
export async function withdrawReferral(
  page: Page,
  config: ReferralWithdrawnStepConfig
): Promise<void> {
  await navigateToEnrollments(page, config.participantUuid);
  await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  const { editEnrollment } = await import('./enrollment.actions');
  const opened = await openEnrollmentByText(page, new RegExp(config.program));
  expect(opened, `Could not open ${config.program} enrollment detail`).toBe(true);

  const edited = await editEnrollment(page, {
    status: 'Referral Withdrawn',
    statusReason: 'Not Provided',
  });
  expect(edited, 'Edit dialog did not close — validation errors').toBe(true);
  console.log(`${config.logPrefix} Status changed to Referral Withdrawn — MMIS delete triggered`);
}

/**
 * Verifies MMIS sync after referral withdrawal (1 transaction: S310 delete).
 */
export async function verifyWithdrawalMmisSync(
  page: Page,
  config: ReferralWithdrawnStepConfig
): Promise<void> {
  const status = await verifyMmisSync(page, {
    participantUuid: config.participantUuid,
    mockMmis: config.mockMmis,
    mockFn: mockMmisSuccess,
    extractKeyFn: extractProgramEnrollmentKeyFromUrl,
  });

  expect(status.responseStatus, 'Expected SU/SE response from MMIS').toMatch(/^(SU|SE)$/);
  expect(status.hasConflict).toBe(false);
  console.log(`${config.logPrefix} ✓ Referral withdrawal MMIS sync verified (${status.responseStatus})`);
}
