/**
 * Skip-To Helper
 *
 * Allows resuming a serial test suite from a specific step by skipping
 * earlier steps. Useful when you've manually fixed application/participant
 * state and want to continue from a specific test step.
 *
 * Usage:
 *   Set environment variable SKIP_TO to the test title prefix or step ID.
 *
 *   Examples:
 *     SKIP_TO=ATC-ES-033    → skips all steps before ATC-ES-033
 *     SKIP_TO=3             → skips the first 2 steps (1-indexed)
 *
 *   Command line:
 *     $env:SKIP_TO="ATC-ES-033"; npm run test:tc006
 *     (or on cmd: set SKIP_TO=ATC-ES-033 & npm run test:tc006)
 *
 * How it works:
 *   Call `shouldSkip(testTitle)` at the top of each test step.
 *   It returns true for all steps until the target step is reached.
 *   Once the target is found (or passed), all subsequent steps run normally.
 */
import { test } from '@playwright/test';

const SKIP_TO = process.env.SKIP_TO?.trim() || '';

let targetReached = false;

/**
 * Check if the current test step should be skipped.
 * Call this at the beginning of each test() block.
 *
 * @param testTitle - The title of the current test step (from test('title', ...))
 * @returns void - Calls test.skip() internally if the step should be skipped
 */
export function skipIfBeforeTarget(testTitle: string): void {
  if (!SKIP_TO) return; // No SKIP_TO set — run everything

  if (targetReached) return; // Already past the target — run normally

  // Check if this step matches the target
  const isTarget = testTitle.includes(SKIP_TO) || isNumericMatch(testTitle);

  if (isTarget) {
    targetReached = true;
    console.log(`[skip-to] ▶ Resuming from: "${testTitle}"`);
    return; // Run this step
  }

  // Not yet at target — skip this step
  console.log(`[skip-to] ⏭ Skipping: "${testTitle}" (waiting for "${SKIP_TO}")`);
  test.skip(true, `Skipped — resuming from SKIP_TO="${SKIP_TO}"`);
}

/**
 * Numeric match: SKIP_TO=3 means skip steps 1 and 2 (by step order).
 * We track call count internally.
 */
let stepCounter = 0;

function isNumericMatch(_testTitle: string): boolean {
  const num = parseInt(SKIP_TO, 10);
  if (isNaN(num)) return false;

  stepCounter++;
  return stepCounter >= num;
}

/**
 * Reset state between describe blocks (call in beforeAll if running
 * multiple serial suites in one file).
 */
export function resetSkipState(): void {
  targetReached = false;
  stepCounter = 0;
}
