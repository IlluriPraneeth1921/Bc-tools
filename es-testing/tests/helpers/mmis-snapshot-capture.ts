/**
 * MMIS Snapshot Capture
 *
 * Captures the MMIS Snapshot page (Waiver Enrollment + SDPC sections) as
 * both structured JSON and a full-page screenshot, then attaches them to
 * the Playwright test report via testInfo.attach().
 *
 * Usage:
 *   import { captureAndAttachMmisSnapshot } from '../../helpers/mmis-snapshot-capture';
 *
 *   test('Capture MMIS before', async ({}, testInfo) => {
 *     await captureAndAttachMmisSnapshot(page, participantUuid, 'before', testInfo);
 *   });
 */
import { Page, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BASE } from './login';
import { ensureSessionAlive } from './auth-tokens';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MmisSnapshotCapture {
  capturedAt: string;
  phase: string;
  participantUuid: string;
  url: string;
  waiverEnrollmentText: string;
  sdpcEnrollmentText: string;
  fullPageText: string;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Navigates to the MMIS Snapshot page, clicks Refresh, then extracts the
 * Waiver Enrollment and SDPC enrollment sections as text. Attaches both
 * a JSON artifact and a screenshot to the test report.
 *
 * @param page       - Playwright page (must be authenticated)
 * @param uuid       - Participant UUID
 * @param phase      - Label for the capture (e.g., 'before', 'after')
 * @param testInfo   - Playwright TestInfo for attaching artifacts
 */
export async function captureAndAttachMmisSnapshot(
  page: Page,
  uuid: string,
  phase: string,
  testInfo: TestInfo,
): Promise<MmisSnapshotCapture | null> {
  const mmisUrl = `${BASE}/#/persons/person/${uuid}/record/mmis-data`;

  // Navigate to MMIS page
  await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Verify we landed on the MMIS page
  if (!page.url().includes(uuid) || !page.url().includes('mmis-data')) {
    // Session may have expired — try recovery
    const recovered = await ensureSessionAlive(page);
    if (recovered) {
      await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    if (!page.url().includes('mmis-data')) {
      console.warn(`[mmis-capture] Could not reach MMIS page for ${phase} capture`);
      return null;
    }
  }

  // Click Refresh and wait for fresh data
  const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();
  if (await refreshBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    // Capture current refresh time so we can detect when new data loads
    const oldRefreshText = await page.locator('text=Last Successful Refresh Time').first()
      .textContent().catch(() => '') || '';

    await refreshBtn.click();

    // Wait for refresh time to update (indicates new data loaded)
    await page.waitForFunction(
      (oldText) => {
        const el = document.body.innerText;
        const match = el.match(/Last Successful Refresh Time[:\s]*([\d\/\s:APM]+)/i);
        return match && !el.includes(oldText);
      },
      oldRefreshText,
      { timeout: 45_000 }
    ).catch(() => {});

    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Wait for SDPC Enrollment section
  await page.locator('text=SDPC Enrollment').first()
    .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  // Scroll to SDPC Enrollment so both Waiver + SDPC are in view
  const sdpcHeading = page.locator('text=SDPC Enrollment').first();
  if (await sdpcHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await sdpcHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  // Extract section text
  const fullPageText = await page.locator('body').textContent().catch(() => '') || '';
  const waiverEnrollmentText = extractSection(fullPageText, 'Waiver Enrollment');
  const sdpcEnrollmentText = extractSection(fullPageText, 'SDPC Enrollment');

  const capture: MmisSnapshotCapture = {
    capturedAt: new Date().toISOString(),
    phase,
    participantUuid: uuid,
    url: page.url(),
    waiverEnrollmentText,
    sdpcEnrollmentText,
    fullPageText: fullPageText.substring(0, 3000), // cap for report readability
  };

  // Attach JSON to report
  await testInfo.attach(`mmis-snapshot-${phase}.json`, {
    body: JSON.stringify(capture, null, 2),
    contentType: 'application/json',
  });

  // Attach screenshot — clip to the area showing Waiver + SDPC sections
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(`mmis-snapshot-${phase}.png`, {
    body: screenshot,
    contentType: 'image/png',
  });

  return capture;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts text between a section heading and the next major heading.
 * Looks for the sectionName in the page text and grabs content until
 * the next section heading pattern.
 */
function extractSection(pageText: string, sectionName: string): string {
  const idx = pageText.indexOf(sectionName);
  if (idx === -1) return `(${sectionName} section not found)`;

  const afterHeading = pageText.substring(idx, idx + 1500);
  // Cut at the next section-like boundary (common MMIS Snapshot headings)
  const nextSection = afterHeading.search(
    /\n\s*(MCO|Cost Share|Waiver Enrollment|SDPC Enrollment|Demographics|Eligibility|Financial|Medicare|Third Party|Managed Care)/i
  );
  // Only cut if the match is AFTER our own heading (not matching ourselves)
  const section = (nextSection > sectionName.length)
    ? afterHeading.substring(0, nextSection)
    : afterHeading.substring(0, 800);
  return section.trim();
}

// ─── Disk-based capture (for afterAll — no testInfo available) ────────────────

/**
 * Captures the MMIS Snapshot page and returns the screenshot buffer.
 * Navigates to MMIS, clicks Refresh, waits for SDPC Enrollment to appear,
 * scrolls it into view, then takes a full-page screenshot.
 * Use this when you need the buffer without attaching to testInfo.
 */
export async function captureMmisScreenshot(page: Page, uuid: string): Promise<Buffer | null> {
  const mmisUrl = `${BASE}/#/persons/person/${uuid}/record/mmis-data`;

  try {
    await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    if (!page.url().includes('mmis-data')) {
      const recovered = await ensureSessionAlive(page);
      if (recovered) {
        await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(2000);
      }
      if (!page.url().includes('mmis-data')) return null;
    }

    // Click Refresh and wait for fresh data
    const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();
    if (await refreshBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      // Capture current refresh time so we can detect when new data loads
      const oldRefreshText = await page.locator('text=Last Successful Refresh Time').first()
        .textContent().catch(() => '') || '';

      await refreshBtn.click();

      // Wait for refresh time to update (indicates new data loaded)
      await page.waitForFunction(
        (oldText) => {
          const el = document.body.innerText;
          const match = el.match(/Last Successful Refresh Time[:\s]*([\d\/\s:APM]+)/i);
          return match && !el.includes(oldText);
        },
        oldRefreshText,
        { timeout: 45_000 }
      ).catch(() => {});

      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Wait for SDPC Enrollment section
    await page.locator('text=SDPC Enrollment').first()
      .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    // Scroll to SDPC Enrollment so both sections are visible
    const sdpcHeading = page.locator('text=SDPC Enrollment').first();
    if (await sdpcHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sdpcHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    return await page.screenshot({ fullPage: true });
  } catch (err) {
    console.warn(`[mmis-capture] Failed to capture MMIS screenshot: ${(err as Error).message}`);
    return null;
  }
}

// ─── Legacy disk-based capture ───────────────────────────────────────────────

/**
 * Captures MMIS snapshot and writes it directly to the test-results directory.
 * Use this in afterAll hooks where testInfo.attach() is not available.
 * Guaranteed to run regardless of test pass/fail.
 *
 * @param page   - Playwright page (must be authenticated)
 * @param uuid   - Participant UUID
 * @param phase  - Label (e.g., 'after')
 * @param testId - Test case identifier (e.g., 'TC-001') for the filename
 */
export async function captureMmisSnapshotToDisk(
  page: Page,
  uuid: string,
  phase: string,
  testId: string,
): Promise<void> {
  const mmisUrl = `${BASE}/#/persons/person/${uuid}/record/mmis-data`;
  const outputDir = path.resolve(__dirname, '../../test-results');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Click Refresh
    const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();
    if (await refreshBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await refreshBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
      // Wait for SDPC Enrollment section to appear
      await page.locator('text=SDPC Enrollment').first()
        .waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Scroll to SDPC Enrollment so both Waiver + SDPC are in view
    const sdpcHeading = page.locator('text=SDPC Enrollment').first();
    if (await sdpcHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await sdpcHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    // Extract text
    const fullPageText = await page.locator('body').textContent().catch(() => '') || '';
    const waiverEnrollmentText = extractSection(fullPageText, 'Waiver Enrollment');
    const sdpcEnrollmentText = extractSection(fullPageText, 'SDPC Enrollment');

    const capture: MmisSnapshotCapture = {
      capturedAt: new Date().toISOString(),
      phase,
      participantUuid: uuid,
      url: page.url(),
      waiverEnrollmentText,
      sdpcEnrollmentText,
      fullPageText: fullPageText.substring(0, 3000),
    };

    // Write JSON
    const jsonPath = path.join(outputDir, `${testId}-mmis-snapshot-${phase}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(capture, null, 2), 'utf-8');

    // Write screenshot
    const screenshotPath = path.join(outputDir, `${testId}-mmis-snapshot-${phase}.png`);
    const screenshot = await page.screenshot({ fullPage: true });
    fs.writeFileSync(screenshotPath, screenshot);
  } catch (err) {
    console.warn(`[mmis-capture] Failed to capture ${phase} snapshot: ${(err as Error).message}`);
  }
}
