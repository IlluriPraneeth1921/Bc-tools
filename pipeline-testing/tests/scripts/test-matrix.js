/**
 * Test Coverage Matrix — Pipeline Testing
 *
 * Scans all test spec files and generates a Requirements Traceability Matrix (RTM)
 * showing which test IDs cover which modules and which plan types.
 *
 * Usage:
 *   node scripts/test-matrix.js
 *
 * Outputs to: reports/test-matrix.md
 */

const fs = require('fs');
const path = require('path');

const TEST_DIRS = [
  path.resolve(__dirname, '../atc'),
  path.resolve(__dirname, '../ujt'),
  path.resolve(__dirname, '../api'),
];

const REPORT_DIR = path.resolve(__dirname, '../reports');
const OUTPUT_FILE = path.join(REPORT_DIR, 'test-matrix.md');

function scanTestFiles() {
  const tests = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.spec.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        extractTestCases(content, fullPath, tests);
      }
    }
  }

  for (const dir of TEST_DIRS) {
    scanDir(dir);
  }

  return tests;
}

function extractTestCases(content, filePath, tests) {
  // Match test declarations with their tags
  const testRegex = /test\(['"]([^'"]+)['"],\s*\{[\s\S]*?tag:\s*\[([^\]]+)\]/g;
  let match;

  while ((match = testRegex.exec(content)) !== null) {
    const title = match[1];
    const tagsRaw = match[2];
    const tags = tagsRaw.match(/'@[^']+'/g)?.map(t => t.replace(/'/g, '')) || [];
    const testId = title.match(/(ATC|UJT|API)-[A-Z]+-\d+/)?.[0] || title.slice(0, 30);

    let type = 'Unknown';
    if (testId.startsWith('ATC-')) type = 'ATC';
    else if (testId.startsWith('UJT-')) type = 'UJT';
    else if (testId.startsWith('API-')) type = 'API';

    tests.push({
      id: testId,
      title,
      type,
      file: path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/'),
      tags,
      module: extractModule(tags),
      plans: extractPlans(tags),
    });
  }
}

function extractModule(tags) {
  const moduleMap = {
    '@auth': 'Auth',
    '@files': 'Files',
    '@compare': 'Compare',
    '@cleanup': 'Cleanup',
    '@test-runs': 'Test Runs',
    '@navigation': 'Navigation',
    '@health': 'Health',
    '@pipeline': 'Pipeline',
  };

  for (const tag of tags) {
    if (moduleMap[tag]) return moduleMap[tag];
  }
  return 'Unknown';
}

function extractPlans(tags) {
  const plans = ['@smoke', '@regression', '@journey', '@508', '@negative', '@boundary', '@validation'];
  return tags.filter(t => plans.includes(t));
}

function generateMatrix(tests) {
  const lines = [];

  lines.push('# Test Coverage Matrix — Pipeline Testing');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  const atcCount = tests.filter(t => t.type === 'ATC').length;
  const ujtCount = tests.filter(t => t.type === 'UJT').length;
  const apiCount = tests.filter(t => t.type === 'API').length;

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| **Total Tests** | ${tests.length} |`);
  lines.push(`| ATCs (Atomic Test Cases) | ${atcCount} |`);
  lines.push(`| UJTs (User Journey Tests) | ${ujtCount} |`);
  lines.push(`| API Tests | ${apiCount} |`);
  lines.push('');

  // Module coverage
  lines.push('## Module Coverage');
  lines.push('');
  lines.push('| Module | ATCs | UJTs | API | Total |');
  lines.push('|--------|------|------|-----|-------|');

  const modules = {};
  for (const test of tests) {
    if (!modules[test.module]) {
      modules[test.module] = { ATC: 0, UJT: 0, API: 0, total: 0 };
    }
    modules[test.module][test.type]++;
    modules[test.module].total++;
  }

  for (const [mod, counts] of Object.entries(modules).sort((a, b) => b[1].total - a[1].total)) {
    lines.push(`| ${mod} | ${counts.ATC} | ${counts.UJT} | ${counts.API} | ${counts.total} |`);
  }
  lines.push('');

  // Plan coverage
  lines.push('## Plan Tag Coverage');
  lines.push('');
  lines.push('| Plan Tag | Test Count |');
  lines.push('|----------|-----------|');

  const planCounts = {};
  for (const test of tests) {
    for (const plan of test.plans) {
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    }
  }

  for (const [plan, count] of Object.entries(planCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${plan} | ${count} |`);
  }
  lines.push('');

  // Full test registry
  lines.push('## Full Test Registry');
  lines.push('');
  lines.push('| ID | Type | Module | Plans | File |');
  lines.push('|----|------|--------|-------|------|');

  for (const test of tests.sort((a, b) => a.id.localeCompare(b.id))) {
    lines.push(`| ${test.id} | ${test.type} | ${test.module} | ${test.plans.join(', ')} | ${test.file} |`);
  }

  return lines.join('\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

const tests = scanTestFiles();
const markdown = generateMatrix(tests);

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

fs.writeFileSync(OUTPUT_FILE, markdown);

console.log(`Test Coverage Matrix generated: ${OUTPUT_FILE}`);
console.log(`Total tests found: ${tests.length}`);
console.log(`  ATCs: ${tests.filter(t => t.type === 'ATC').length}`);
console.log(`  UJTs: ${tests.filter(t => t.type === 'UJT').length}`);
console.log(`  API:  ${tests.filter(t => t.type === 'API').length}`);
