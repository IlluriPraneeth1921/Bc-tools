# Enrollment Service Tests — Running Guide

## Prerequisites

- Node.js 18+
- Chromium (installed via `npx playwright install chromium`)
- `.env` file configured at `es-testing/.env`

## Quick Start

```bash
cd es-testing
npm install
npx playwright install chromium
```

## Running Tests

### All tests (both ATC and UJT projects)

```bash
npm test
```

### ATCs only (Atomic Test Cases)

```bash
npm run test:atc
```

### UJTs only (User Journey Tests)

```bash
npm run test:ujt
```

### TC-001 specifically

```bash
npm run test:tc001
```

### Single test by name

```bash
npx playwright test --grep "ATC-ES-001"
npx playwright test --grep "ATC-ES-00[1-5]"
npx playwright test --grep "Step 1"
```

### Run with visible browser (headed mode)

```bash
npx playwright test --headed --project=atc
```

### Run a specific file

```bash
npx playwright test tests/atc/enrollment/TC-001-new-iris-enrollment.spec.ts --project=atc
npx playwright test tests/ujt/enrollment/TC-001-new-iris-enrollment-journey.spec.ts --project=ujt
```

## Viewing Reports

```bash
npm run report
```

HTML report is generated at `reports/html/`.

## Environment Configuration (.env)

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Blue Compass application URL |
| `TEST_USER` | Cognito login username |
| `TEST_PASSWORD` | Cognito login password |
| `TEST_ORG` | Organization for context selection |
| `TEST_LOCATION` | Location for context selection |
| `TEST_STAFF` | Staff delegation for context selection |
| `TEST_MA_ID` | Test participant Medicaid ID |
| `TEST_PERSON_UUID` | Test participant UUID (skip search if set) |

## Project Structure

```
tests/
├── helpers/
│   ├── login.ts                 # Cognito auth + context selection
│   └── participant-resolver.ts  # Global search, navigation utilities
├── atc/
│   └── enrollment/
│       ├── actions/
│       │   └── enrollment.actions.ts   # Reusable action functions
│       └── TC-001-new-iris-enrollment.spec.ts
└── ujt/
    └── enrollment/
        └── TC-001-new-iris-enrollment-journey.spec.ts
```

**ATCs** — Atomic Test Cases. Each test verifies one behavior. Run fast, independent.

**UJTs** — User Journey Tests. Sequential steps composing ATCs into end-to-end flows.

**Actions** — Shared functions imported by both ATCs and UJTs. Avoids logic duplication.

## Debugging

### Run with trace (opens trace viewer on failure)

```bash
npx playwright test --trace on --project=atc
```

### Show last trace

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

### Screenshots

Screenshots are captured automatically on failure. They land in `test-results/`.

## Notes

- The F2 environment uses **double-click** to open person records from search results.
- The global search bar (`Search Persons`) + Enter is the reliable way to find participants.
- Login handles three states: fresh Cognito login, Acknowledge dialog, and context selection. If already authenticated, it skips gracefully.
