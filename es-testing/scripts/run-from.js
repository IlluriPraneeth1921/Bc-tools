/**
 * run-from.js — Run a Playwright test starting from a specific step.
 *
 * Usage:
 *   node scripts/run-from.js <spec-file> <step-id>
 *
 * npm script shortcut:
 *   npm run test:tc006:from -- ATC-ES-033
 *
 * The SKIP_TO env var is scoped to the child process only —
 * it does NOT persist in your PowerShell session.
 */
const { execSync } = require('child_process');
const path = require('path');

const specFile = process.argv[2];
const skipTo = process.argv[3] || '';

if (!specFile) {
  console.error('Usage: node scripts/run-from.js <spec-file> <step-id>');
  console.error('Example: node scripts/run-from.js tests/atc/enrollment/TC-006-enrollment-end-date-earlier.spec.ts ATC-ES-033');
  process.exit(1);
}

if (!skipTo) {
  console.error('Error: No step ID provided. Which step do you want to skip to?');
  console.error('Example: npm run test:tc006:from -- ATC-ES-033');
  process.exit(1);
}

// Auto-detect project from path (ujt vs atc)
const project = specFile.includes('/ujt/') || specFile.includes('\\ujt\\') ? 'ujt' : 'atc';

const cmd = `npx playwright test ${specFile} --project=${project}`;
console.log(`[run-from] Skipping to: ${skipTo}`);
console.log(`[run-from] Running: ${cmd}\n`);

try {
  execSync(cmd, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, SKIP_TO: skipTo },
  });
} catch (e) {
  process.exit(e.status || 1);
}
