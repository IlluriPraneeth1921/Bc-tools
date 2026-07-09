/**
 * Test Summary Report Generator
 *
 * Produces a clean per-TC output folder with:
 *   - mmis-snapshot-before.png  (MMIS state before test)
 *   - mmis-snapshot-after.png   (MMIS state after test, pass or fail)
 *   - enrollment-final-state.png (Enrollment list at end of test)
 *   - summary.json              (pass/fail, timestamps, step outcomes)
 *
 * Usage in a serial test:
 *   const tracker = createStepTracker('TC-001', participantUuid);
 *   // In each test: tracker.record('step name', passed)
 *   // In afterAll:  await tracker.finalize(page)
 */
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BASE } from './login';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StepResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

export interface TestSummary {
  testId: string;
  participant: string;
  result: 'passed' | 'failed';
  failedAt?: string;
  error?: string;
  startedAt: string;
  completedAt: string;
  steps: StepResult[];
  artifacts: {
    mmisBeforeCapture: string;
    mmisAfterCapture: string;
    enrollmentFinalState: string;
  };
}

export interface StepTracker {
  /** Record a step outcome. Call at the end of each test. */
  record(name: string, status: 'passed' | 'failed' | 'skipped', error?: string): void;
  /** Store the MMIS "before" screenshot buffer (captured in first test). */
  setBeforeScreenshot(buffer: Buffer): void;
  /** Finalize: capture after screenshots, write all artifacts to disk. */
  finalize(page: Page): Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OUTPUT_ROOT = path.resolve(__dirname, '../../reports/tc-summaries');

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Creates a step tracker for a test case.
 * Call `record()` after each test step, then `finalize()` in afterAll.
 */
export function createStepTracker(testId: string, participantUuid: string): StepTracker {
  const steps: StepResult[] = [];
  const startedAt = new Date().toISOString();
  let beforeScreenshot: Buffer | null = null;

  return {
    record(name: string, status: 'passed' | 'failed' | 'skipped', error?: string) {
      steps.push({ name, status, ...(error ? { error } : {}) });
    },

    setBeforeScreenshot(buffer: Buffer) {
      beforeScreenshot = buffer;
    },

    async finalize(page: Page) {
      const completedAt = new Date().toISOString();
      const outputDir = path.join(OUTPUT_ROOT, testId);

      // Clean only this TC's folder (overwrite previous run for this TC)
      if (fs.existsSync(outputDir)) {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
      fs.mkdirSync(outputDir, { recursive: true });

      // ─── MMIS After Screenshot ───────────────────────────────────────
      let mmisAfterBuffer: Buffer | null = null;
      try {
        const mmisUrl = `${BASE}/#/persons/person/${participantUuid}/record/mmis-data`;
        await page.goto(mmisUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(2000);

        // Capture current refresh time so we can detect when new data loads
        const refreshTimeLocator = page.locator('text=Last Successful Refresh Time').first();
        const oldRefreshText = await refreshTimeLocator.textContent().catch(() => '') || '';

        // Click Refresh
        const refreshBtn = page.locator('button').filter({ hasText: /Refresh/i }).first();
        if (await refreshBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
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

        // Wait for SDPC Enrollment section to be visible
        await page.locator('text=SDPC Enrollment').first()
          .waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

        // Scroll to SDPC Enrollment so both sections are captured
        const sdpcHeading = page.locator('text=SDPC Enrollment').first();
        if (await sdpcHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await sdpcHeading.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
        }

        mmisAfterBuffer = await page.screenshot({ fullPage: true });
      } catch (err) {
        console.warn(`[test-summary] Failed to capture MMIS after screenshot: ${(err as Error).message}`);
      }

      // ─── Enrollment Final State Screenshot ───────────────────────────
      let enrollmentBuffer: Buffer | null = null;
      try {
        const enrollmentUrl = `${BASE}/#/persons/person/${participantUuid}/programenrollments`;
        await page.goto(enrollmentUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
        await page.locator('mat-row').first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(1000);

        enrollmentBuffer = await page.screenshot({ fullPage: true });
      } catch (err) {
        console.warn(`[test-summary] Failed to capture enrollment screenshot: ${(err as Error).message}`);
      }

      // ─── Write Artifacts ─────────────────────────────────────────────
      const beforeFile = 'mmis-snapshot-before.png';
      const afterFile = 'mmis-snapshot-after.png';
      const enrollmentFile = 'enrollment-final-state.png';

      if (beforeScreenshot) {
        fs.writeFileSync(path.join(outputDir, beforeFile), beforeScreenshot);
      }
      if (mmisAfterBuffer) {
        fs.writeFileSync(path.join(outputDir, afterFile), mmisAfterBuffer);
      }
      if (enrollmentBuffer) {
        fs.writeFileSync(path.join(outputDir, enrollmentFile), enrollmentBuffer);
      }

      // ─── Write Summary JSON ──────────────────────────────────────────
      const failedStep = steps.find(s => s.status === 'failed');
      const summary: TestSummary = {
        testId,
        participant: participantUuid,
        result: failedStep ? 'failed' : 'passed',
        ...(failedStep ? { failedAt: failedStep.name, error: failedStep.error } : {}),
        startedAt,
        completedAt,
        steps,
        artifacts: {
          mmisBeforeCapture: beforeFile,
          mmisAfterCapture: afterFile,
          enrollmentFinalState: enrollmentFile,
        },
      };

      fs.writeFileSync(
        path.join(outputDir, 'summary.json'),
        JSON.stringify(summary, null, 2),
        'utf-8',
      );
    },
  };
}
