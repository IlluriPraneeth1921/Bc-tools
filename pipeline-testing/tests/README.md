# Playwright Test Suite — Pipeline Verification Tool

Comprehensive Playwright-based test automation for the pl-test Data Pipeline Verification Tool. Follows the [Carity Test Automation Strategy](../docs/test-strategy.md).

## Test Summary

| Type | Count | Description |
|------|-------|-------------|
| **ATCs** (Atomic Test Cases) | 62 | Single-behavior UI tests with mock API |
| **UJTs** (User Journey Tests) | 11 | End-to-end sequential workflows |
| **API Tests** | 48 | Direct REST endpoint validation |
| **Total** | **121** | |

## Quick Start

```powershell
# Install dependencies
cd tests
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium

# Create .env from template
copy .env.example .env

# Run all tests (mock mode — no backend required)
npx playwright test --config=playwright.config.ts
```

## Project Structure

```
tests/
├── playwright.config.ts          # Multi-project config (atc-mock, ujt-mock, api, etc.)
├── package.json                  # Dependencies and npm scripts
├── tsconfig.json                 # TypeScript configuration
├── auth.setup.ts                 # Authentication setup for live mode
├── .env.example                  # Environment variable template
├── .gitignore                    # Excludes node_modules, results, .auth
│
├── fixtures/                     # Shared test fixtures and utilities
│   ├── app.fixture.ts            # App-level fixture (authenticatedPage, mockApi)
│   ├── api.fixture.ts            # API test fixture (REST client helper)
│   ├── mock-api.ts               # Mock API interceptor (mocks FastAPI responses)
│   ├── test-data.ts              # Test data factories (AutoTest_ prefix)
│   └── selectors.ts              # Centralized DOM selectors for Streamlit UI
│
├── atc/                          # Atomic Test Cases (by module)
│   ├── auth/                     # Authentication (login, validation)
│   │   ├── actions/              # Reusable action functions
│   │   └── auth.spec.ts          # ATC-AUTH-001 through ATC-AUTH-007
│   ├── files/                    # File upload, parse, S3 operations
│   │   ├── actions/
│   │   └── files-upload.spec.ts  # ATC-FIL-001 through ATC-FIL-010
│   ├── compare/                  # Pipeline comparison (4 stages)
│   │   ├── actions/
│   │   └── compare.spec.ts       # ATC-CMP-001 through ATC-CMP-010
│   ├── cleanup/                  # Data cleanup operations
│   │   ├── actions/
│   │   └── cleanup.spec.ts       # ATC-CLN-001 through ATC-CLN-010
│   ├── test-runs/                # Test run history and management
│   │   ├── actions/
│   │   └── test-runs.spec.ts     # ATC-TRN-001 through ATC-TRN-010
│   └── navigation/               # Navigation, dashboard, accessibility
│       ├── navigation.spec.ts             # ATC-NAV-001 through ATC-NAV-010
│       └── navigation-accessibility.spec.ts  # ATC-NAV-508-001 through 005
│
├── ujt/                          # User Journey Tests (sequential)
│   ├── fixtures/
│   │   └── ujt.fixture.ts        # UJT-specific fixture (dual mock/live mode)
│   ├── pipeline/
│   │   └── pipeline-verification.journey.spec.ts  # UJT-PIP-001, UJT-PIP-002
│   ├── files/
│   │   └── file-management.journey.spec.ts        # UJT-FIL-001 through 003
│   ├── compare/
│   │   └── compare-verification.journey.spec.ts   # UJT-CMP-001 through 003
│   └── cleanup/
│       └── cleanup-lifecycle.journey.spec.ts      # UJT-CLN-001 through 003
│
├── api/                          # Direct REST API tests (live mode)
│   ├── health.api.spec.ts        # API-HLT-001 through 004
│   ├── files.api.spec.ts         # API-FIL-001 through 012
│   ├── compare.api.spec.ts       # API-CMP-001 through 010
│   ├── test-runs.api.spec.ts     # API-TRN-001 through 010
│   └── cleanup.api.spec.ts       # API-CLN-001 through 012
│
├── scripts/                      # Report generation scripts
│   ├── coverage-report.js        # Parses results.json → pass rates, module coverage
│   └── test-matrix.js            # Scans specs → Requirements Traceability Matrix
│
└── reports/                      # Generated reports (after test runs)
    ├── html/                     # Playwright HTML report (interactive)
    ├── test-matrix.md            # Test Coverage Matrix (from source scan)
    ├── coverage-report.txt       # Human-readable coverage summary
    ├── coverage-report.json      # Machine-readable coverage data
    ├── coverage-report.csv       # Spreadsheet-compatible results
    ├── junit-results.xml         # CI/CD integration (ADO, Jenkins)
    └── results.json              # Raw Playwright JSON results
```

## Running Tests

### Mock Mode (default — no backend required)

```powershell
# All ATC tests (mocked APIs, fast)
npx playwright test --config=playwright.config.ts --project=atc-mock

# All UJT tests (sequential, mocked APIs)
npx playwright test --config=playwright.config.ts --project=ujt-mock

# Accessibility tests only
npx playwright test --config=playwright.config.ts --project=accessibility

# Cross-browser or all mock projects together
npx playwright test --config=playwright.config.ts --project=atc-mock --project=ujt-mock
```

### Live Mode (requires running FastAPI + Streamlit)

Start the backend first:
```powershell
# Terminal 1: FastAPI
cd pl-test
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Streamlit
cd pl-test
streamlit run src/web/app.py
```

Then run live tests:
```powershell
# ATC live (against real backend)
$env:LIVE_MODE="true"; npx playwright test --config=playwright.config.ts --project=atc-live

# UJT live (against real backend, sequential)
$env:LIVE_MODE="true"; npx playwright test --config=playwright.config.ts --project=ujt-live

# API tests (direct REST endpoint testing)
$env:LIVE_MODE="true"; npx playwright test --config=playwright.config.ts --project=api

# All live projects together
$env:LIVE_MODE="true"; npx playwright test --config=playwright.config.ts --project=atc-live --project=ujt-live --project=api
```

### Headed Mode (visible browser)

```powershell
# Watch tests run in a visible browser
npx playwright test --config=playwright.config.ts --project=atc-mock --headed

# Slow motion for debugging
npx playwright test --config=playwright.config.ts --project=atc-mock --headed --slow-mo=500
```

### Debug Mode

```powershell
# Open Playwright Inspector
npx playwright test --config=playwright.config.ts --project=atc-mock --debug
```

### Filtering Tests

```powershell
# By tag (plan)
npx playwright test --config=playwright.config.ts --grep "@smoke"
npx playwright test --config=playwright.config.ts --grep "@regression"
npx playwright test --config=playwright.config.ts --grep "@journey"
npx playwright test --config=playwright.config.ts --grep "@508"
npx playwright test --config=playwright.config.ts --grep "@negative"

# By module
npx playwright test --config=playwright.config.ts --grep "@files"
npx playwright test --config=playwright.config.ts --grep "@compare"
npx playwright test --config=playwright.config.ts --grep "@cleanup"

# By specific test ID
npx playwright test --config=playwright.config.ts --grep "@ATC-FIL-001"
npx playwright test --config=playwright.config.ts --grep "@UJT-PIP-001"
npx playwright test --config=playwright.config.ts --grep "@API-HLT-001"

# Exclude journeys (ATCs only, fast)
npx playwright test --config=playwright.config.ts --grep-invert "@journey"
```

## Reports & Coverage

```powershell
# View the HTML report from last test run
npx playwright show-report reports/html

# Generate coverage report (after running tests)
node scripts/coverage-report.js

# Generate test coverage matrix (from source — no test run needed)
node scripts/test-matrix.js
```

### Report Formats

| Format | File | Purpose |
|--------|------|---------|
| HTML | `reports/html/` | Interactive report with screenshots, traces, video |
| JUnit XML | `reports/junit-results.xml` | CI/CD integration (Azure DevOps, Jenkins) |
| JSON | `reports/results.json` | Programmatic access for dashboards |
| Coverage TXT | `reports/coverage-report.txt` | Quick pass/fail summary |
| Coverage JSON | `reports/coverage-report.json` | Metrics for dashboards |
| Coverage CSV | `reports/coverage-report.csv` | Spreadsheet import |
| Test Matrix | `reports/test-matrix.md` | Requirements Traceability Matrix |

## Available Projects

| Project | Mode | Description |
|---------|------|-------------|
| `atc-mock` | Mock | Atomic test cases with mocked FastAPI responses |
| `ujt-mock` | Mock | User journey tests (sequential, mocked API) |
| `accessibility` | Mock | 508 compliance tests (axe-core) |
| `atc-live` | Live | Atomic test cases against running backend |
| `ujt-live` | Live | User journeys against running backend |
| `api` | Live | Direct REST API endpoint tests |

> Live projects require `$env:LIVE_MODE="true"` to be set before running.

## Test Levels & Naming

### ATCs (Atomic Test Cases) — `ATC-<MODULE>-<NNN>`

Single-behavior tests. Fast, parallel, independent. Each ATC exports a reusable action function that UJTs can compose.

| Module Code | Module | Test IDs |
|-------------|--------|----------|
| AUTH | Authentication | ATC-AUTH-001 to 007 |
| FIL | File Management | ATC-FIL-001 to 010 |
| CMP | Compare/Verification | ATC-CMP-001 to 010 |
| CLN | Cleanup | ATC-CLN-001 to 010 |
| TRN | Test Runs | ATC-TRN-001 to 010 |
| NAV | Navigation/Dashboard | ATC-NAV-001 to 010, ATC-NAV-508-001 to 005 |

### UJTs (User Journey Tests) — `UJT-<MODULE>-<NNN>`

Complete workflows composed from ATC actions. Sequential, slower, cross-page.

| Journey | Test IDs | Critical Path? |
|---------|----------|----------------|
| Pipeline Verification | UJT-PIP-001, 002 | Yes |
| File Management | UJT-FIL-001, 002, 003 | Yes |
| Compare & Mismatches | UJT-CMP-001, 002, 003 | Yes |
| Cleanup Lifecycle | UJT-CLN-001, 002, 003 | No |

### API Tests — `API-<MODULE>-<NNN>`

Direct REST endpoint tests. No UI, tests FastAPI responses directly.

| Module | Test IDs | Endpoint Group |
|--------|----------|----------------|
| HLT | API-HLT-001 to 004 | GET /, GET /health |
| FIL | API-FIL-001 to 012 | /api/files/* |
| CMP | API-CMP-001 to 010 | /api/compare/* |
| TRN | API-TRN-001 to 010 | /api/test-runs/* |
| CLN | API-CLN-001 to 012 | /api/cleanup/* |

## Tagging Strategy

Every test has these tags:

```
@<module> @<plan> @<TEST-ID>
```

| Tag | Purpose | Example |
|-----|---------|---------|
| `@smoke` | Critical path, fast (<5 min) | PR validation |
| `@regression` | Full module coverage | Nightly run |
| `@journey` | End-to-end workflows (UJTs) | Nightly run |
| `@508` | WCAG 2.1 AA accessibility | Weekly |
| `@negative` | Error/invalid input handling | Regression |
| `@boundary` | Edge cases, limits | Regression |
| `@validation` | Input validation rules | Regression |
| `@critical` | Must-pass before release | Pre-release |

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests (default projects) |
| `npm run test:atc` | ATCs in mock mode |
| `npm run test:ujt` | UJTs in mock mode |
| `npm run test:api:win` | API tests (Windows, sets LIVE_MODE) |
| `npm run test:smoke-mock` | Smoke tests only (mock) |
| `npm run test:headed` | All tests with visible browser |
| `npm run test:debug` | Open Playwright Inspector |
| `npm run report` | Open HTML report |
| `npm run report:coverage` | Generate coverage report |

## Environment Variables

Create a `.env` file from `.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:8501` | Streamlit UI URL |
| `API_BASE_URL` | `http://localhost:8000` | FastAPI backend URL |
| `PL_TEST_USERNAME` | `admin` | Login username |
| `PL_TEST_PASSWORD` | `pltest2026` | Login password |
| `LIVE_MODE` | `false` | Enable live mode projects |
| `DB_SERVER` | — | Database host (for UJT cross-layer verification) |
| `TEST_MCD_ID_PREFIX` | `000000000` | Test data isolation prefix |
| `TEST_INTERFACE_TYPE` | `icd_d06` | Default interface for tests |

## CI/CD Integration

### Azure DevOps Pipeline

```yaml
steps:
  - script: |
      cd tests
      npm ci
      npx playwright install --with-deps chromium
    displayName: 'Install Playwright'

  - script: |
      cd tests
      npx playwright test --config=playwright.config.ts --grep "@smoke"
    displayName: 'Run Smoke Tests'
    env:
      LIVE_MODE: 'true'
      BASE_URL: $(BASE_URL)
      API_BASE_URL: $(API_BASE_URL)
      PL_TEST_USERNAME: $(PL_TEST_USERNAME)
      PL_TEST_PASSWORD: $(PL_TEST_PASSWORD)

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'tests/reports/junit-results.xml'
    condition: always()
```

## Adding New Tests

1. **New ATC**: Create `tests/atc/<module>/<module>-<feature>.spec.ts` with action function in `actions/`
2. **New UJT**: Create `tests/ujt/<module>/<feature>.journey.spec.ts`, import actions from ATCs
3. **New API test**: Create `tests/api/<module>.api.spec.ts` using the `api` fixture

Follow the naming convention: `ATC-<MODULE>-<NNN>`, `UJT-<MODULE>-<NNN>`, `API-<MODULE>-<NNN>`

Always tag with: module + plan + test ID. Run `node scripts/test-matrix.js` after adding tests to verify coverage.
