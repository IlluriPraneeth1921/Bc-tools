/**
 * Coverage Report Generator — Pipeline Testing
 *
 * Parses Playwright JSON results and generates a coverage report showing:
 * - Total test counts (pass/fail/skip by type: ATC, UJT, API)
 * - Module coverage (tests per module, pass rates)
 * - Tag coverage (tests per plan tag: smoke, regression, journey, 508)
 * - Test ID registry (all test IDs with status)
 *
 * Usage:
 *   node scripts/coverage-report.js
 *   node scripts/coverage-report.js --json    (output as JSON)
 *   node scripts/coverage-report.js --csv     (output as CSV)
 *
 * Reads from: reports/results.json (Playwright JSON reporter output)
 * Outputs to: reports/coverage-report.txt, reports/coverage-report.json, reports/coverage-report.csv
 */

const fs = require('fs');
const path = require('path');

// ─── Configuration ───────────────────────────────────────────────────────────
const RESULTS_FILE = path.resolve(__dirname, '../reports/results.json');
const REPORT_DIR = path.resolve(__dirname, '../reports');
const OUTPUT_TXT = path.join(REPORT_DIR, 'coverage-report.txt');
const OUTPUT_JSON = path.join(REPORT_DIR, 'coverage-report.json');
const OUTPUT_CSV = path.join(REPORT_DIR, 'coverage-report.csv');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseTestId(title) {
  // Extract test ID like ATC-AUTH-001, UJT-PIP-001, API-FIL-001
  const match = title.match(/(ATC|UJT|API)-[A-Z]+-\d+/);
  return match ? match[0] : null;
}

function parseModule(tags) {
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

function parseTestType(testId) {
  if (!testId) return 'Unknown';
  if (testId.startsWith('ATC-')) return 'ATC';
  if (testId.startsWith('UJT-')) return 'UJT';
  if (testId.startsWith('API-')) return 'API';
  return 'Unknown';
}

function parsePlanTags(tags) {
  const plans = ['@smoke', '@regression', '@journey', '@508', '@negative', '@boundary', '@validation', '@recovery'];
  return tags.filter(t => plans.includes(t));
}

// ─── Main ────────────────────────────────────────────────────────────────────

function generateReport() {
  // Check if results file exists
  if (!fs.existsSync(RESULTS_FILE)) {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  Coverage Report — No Results Found                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║                                                              ║');
    console.log('║  Run tests first to generate results:                        ║');
    console.log('║    npx playwright test --config=playwright.config.ts         ║');
    console.log('║                                                              ║');
    console.log('║  Then run this report:                                       ║');
    console.log('║    node scripts/coverage-report.js                           ║');
    console.log('║                                                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    // Generate a skeleton report from test files instead
    return generateSkeletonReport();
  }

  const rawData = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  const suites = rawData.suites || [];
  const tests = [];

  // Flatten all tests from suites
  function extractTests(suite) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          tests.push({
            title: spec.title,
            tags: spec.tags || [],
            status: test.status,
            duration: test.results?.[0]?.duration || 0,
            retries: (test.results?.length || 1) - 1,
            projectName: test.projectName || '',
          });
        }
      }
    }
    if (suite.suites) {
      for (const child of suite.suites) {
        extractTests(child);
      }
    }
  }

  for (const suite of suites) {
    extractTests(suite);
  }

  // Build metrics
  const report = buildMetrics(tests);
  outputReport(report);
}

function buildMetrics(tests) {
  const metrics = {
    generated: new Date().toISOString(),
    summary: {
      total: tests.length,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0,
      passRate: '0%',
    },
    byType: { ATC: { total: 0, passed: 0, failed: 0 }, UJT: { total: 0, passed: 0, failed: 0 }, API: { total: 0, passed: 0, failed: 0 } },
    byModule: {},
    byPlan: {},
    testRegistry: [],
  };

  for (const test of tests) {
    const testId = parseTestId(test.title);
    const type = parseTestType(testId);
    const module = parseModule(test.tags);
    const plans = parsePlanTags(test.tags);

    // Summary
    if (test.status === 'passed' || test.status === 'expected') {
      metrics.summary.passed++;
    } else if (test.status === 'failed' || test.status === 'unexpected') {
      metrics.summary.failed++;
    } else if (test.status === 'skipped') {
      metrics.summary.skipped++;
    } else if (test.status === 'flaky') {
      metrics.summary.flaky++;
    }

    // By type
    if (metrics.byType[type]) {
      metrics.byType[type].total++;
      if (test.status === 'passed' || test.status === 'expected') {
        metrics.byType[type].passed++;
      } else if (test.status === 'failed' || test.status === 'unexpected') {
        metrics.byType[type].failed++;
      }
    }

    // By module
    if (!metrics.byModule[module]) {
      metrics.byModule[module] = { total: 0, passed: 0, failed: 0, skipped: 0 };
    }
    metrics.byModule[module].total++;
    if (test.status === 'passed' || test.status === 'expected') {
      metrics.byModule[module].passed++;
    } else if (test.status === 'failed' || test.status === 'unexpected') {
      metrics.byModule[module].failed++;
    } else {
      metrics.byModule[module].skipped++;
    }

    // By plan tag
    for (const plan of plans) {
      if (!metrics.byPlan[plan]) {
        metrics.byPlan[plan] = { total: 0, passed: 0, failed: 0 };
      }
      metrics.byPlan[plan].total++;
      if (test.status === 'passed' || test.status === 'expected') {
        metrics.byPlan[plan].passed++;
      } else if (test.status === 'failed' || test.status === 'unexpected') {
        metrics.byPlan[plan].failed++;
      }
    }

    // Test registry
    metrics.testRegistry.push({
      id: testId || test.title.slice(0, 40),
      type,
      module,
      status: test.status,
      duration: test.duration,
      tags: test.tags,
    });
  }

  metrics.summary.passRate = metrics.summary.total > 0
    ? `${((metrics.summary.passed / metrics.summary.total) * 100).toFixed(1)}%`
    : '0%';

  return metrics;
}

function generateSkeletonReport() {
  // Scan test files to build a coverage map from source
  const testDirs = {
    atc: path.resolve(__dirname, '../atc'),
    ujt: path.resolve(__dirname, '../ujt'),
    api: path.resolve(__dirname, '../api'),
  };

  const testIds = [];

  function scanDir(dir, type) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir, { recursive: true });
    for (const file of files) {
      if (!file.endsWith('.spec.ts')) continue;
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const matches = content.matchAll(/(ATC|UJT|API)-[A-Z]+-\d+/g);
      for (const match of matches) {
        if (!testIds.includes(match[0])) {
          testIds.push(match[0]);
        }
      }
    }
  }

  scanDir(testDirs.atc, 'ATC');
  scanDir(testDirs.ujt, 'UJT');
  scanDir(testDirs.api, 'API');

  const atcCount = testIds.filter(id => id.startsWith('ATC-')).length;
  const ujtCount = testIds.filter(id => id.startsWith('UJT-')).length;
  const apiCount = testIds.filter(id => id.startsWith('API-')).length;

  const report = {
    generated: new Date().toISOString(),
    source: 'skeleton (no test run results available)',
    summary: {
      total: testIds.length,
      atc: atcCount,
      ujt: ujtCount,
      api: apiCount,
      status: 'NOT_RUN',
    },
    testIds: testIds.sort(),
  };

  const txt = [
    '═══════════════════════════════════════════════════════════════',
    '  PIPELINE TESTING — COVERAGE REPORT (Skeleton)',
    '  Generated: ' + report.generated,
    '  Source: Test file scan (no execution results available)',
    '═══════════════════════════════════════════════════════════════',
    '',
    '  REGISTERED TEST CASES',
    '  ─────────────────────',
    `  Total Test IDs:  ${testIds.length}`,
    `  ATCs:            ${atcCount}`,
    `  UJTs:            ${ujtCount}`,
    `  API Tests:       ${apiCount}`,
    '',
    '  ALL TEST IDs',
    '  ────────────',
    ...testIds.map(id => `    ${id}`),
    '',
    '═══════════════════════════════════════════════════════════════',
    '  Run tests to get execution coverage:',
    '    npx playwright test --config=playwright.config.ts',
    '    node scripts/coverage-report.js',
    '═══════════════════════════════════════════════════════════════',
  ].join('\n');

  // Ensure report directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_TXT, txt);
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2));
  console.log(txt);
  console.log(`\nReport saved to: ${OUTPUT_TXT}`);
  console.log(`JSON saved to: ${OUTPUT_JSON}`);
}

function outputReport(metrics) {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const outputCsv = args.includes('--csv');

  // Ensure report directory exists
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  // ─── Text Report ─────────────────────────────────────────────────────────
  const txt = [
    '═══════════════════════════════════════════════════════════════',
    '  PIPELINE TESTING — TEST COVERAGE REPORT',
    '  Generated: ' + metrics.generated,
    '═══════════════════════════════════════════════════════════════',
    '',
    '  SUMMARY',
    '  ───────',
    `  Total Tests:   ${metrics.summary.total}`,
    `  Passed:        ${metrics.summary.passed}`,
    `  Failed:        ${metrics.summary.failed}`,
    `  Skipped:       ${metrics.summary.skipped}`,
    `  Flaky:         ${metrics.summary.flaky}`,
    `  Pass Rate:     ${metrics.summary.passRate}`,
    '',
    '  BY TEST TYPE',
    '  ────────────',
    `  ATC (Atomic):      ${metrics.byType.ATC.total} total | ${metrics.byType.ATC.passed} pass | ${metrics.byType.ATC.failed} fail`,
    `  UJT (Journey):     ${metrics.byType.UJT.total} total | ${metrics.byType.UJT.passed} pass | ${metrics.byType.UJT.failed} fail`,
    `  API (Endpoint):    ${metrics.byType.API.total} total | ${metrics.byType.API.passed} pass | ${metrics.byType.API.failed} fail`,
    '',
    '  BY MODULE',
    '  ─────────',
    ...Object.entries(metrics.byModule).map(([mod, data]) =>
      `  ${mod.padEnd(15)} ${String(data.total).padStart(3)} total | ${String(data.passed).padStart(3)} pass | ${String(data.failed).padStart(3)} fail | ${data.total > 0 ? ((data.passed / data.total) * 100).toFixed(0) : 0}%`
    ),
    '',
    '  BY PLAN TAG',
    '  ───────────',
    ...Object.entries(metrics.byPlan).map(([tag, data]) =>
      `  ${tag.padEnd(15)} ${String(data.total).padStart(3)} total | ${String(data.passed).padStart(3)} pass | ${String(data.failed).padStart(3)} fail`
    ),
    '',
    '═══════════════════════════════════════════════════════════════',
  ].join('\n');

  fs.writeFileSync(OUTPUT_TXT, txt);
  console.log(txt);
  console.log(`\nText report saved to: ${OUTPUT_TXT}`);

  // ─── JSON Report ─────────────────────────────────────────────────────────
  if (outputJson || true) {
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(metrics, null, 2));
    console.log(`JSON report saved to: ${OUTPUT_JSON}`);
  }

  // ─── CSV Report ──────────────────────────────────────────────────────────
  if (outputCsv || true) {
    const csvLines = [
      'TestID,Type,Module,Status,Duration(ms),Tags',
      ...metrics.testRegistry.map(t =>
        `${t.id},${t.type},${t.module},${t.status},${t.duration},"${t.tags.join('; ')}"`
      ),
    ];
    fs.writeFileSync(OUTPUT_CSV, csvLines.join('\n'));
    console.log(`CSV report saved to: ${OUTPUT_CSV}`);
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────
generateReport();
