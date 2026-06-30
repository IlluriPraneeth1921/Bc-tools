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

### Individual test cases

```bash
npm run test:tc001
npm run test:tc002
npm run test:tc003
npm run test:tc004
npm run test:tc005
```

### Run by phase (respects prerequisite order)

```bash
npm run test:phase1   # TC-001, TC-004, TC-015, TC-029, TC-030 (no prerequisites)
npm run test:phase2   # TC-002, TC-003, TC-005, TC-006, TC-010, TC-011, TC-014, TC-016, TC-019, TC-020
npm run test:phase3   # TC-007, TC-009, TC-032 (requires disenrolled state)
npm run test:phase5   # TC-012, TC-017, TC-021-TC-025, TC-028, TC-031 (requires suspension)
```

### Run prerequisite (disenroll before TC-001)

```bash
npm run test:prereq
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
npx playwright test tests/atc/enrollment/TC-002-enrolled-to-suspended.spec.ts --project=atc
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
| `TEST_MA_ID` | Test participant Medicaid ID (default: 1430000013) |
| `TEST_PERSON_UUID` | Test participant UUID (skip search if set) |

## Test Participant

| Attribute | Value |
|-----------|-------|
| Medicaid ID (MA ID) | **1430000013** |
| Used In | All 32 test cases (TC-001 through TC-032) |

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
│       ├── TC-001-new-iris-enrollment.spec.ts
│       ├── TC-001-prereq-disenroll.spec.ts
│       ├── TC-002-enrolled-to-suspended.spec.ts
│       ├── TC-003-ica-transfer.spec.ts
│       ├── TC-004-hard-error-fea-dates.spec.ts
│       ├── TC-005-medicaid-id-mismatch.spec.ts
│       ├── TC-006-enrollment-end-date-earlier.spec.ts
│       ├── TC-007-enrollment-end-date-later.spec.ts
│       ├── TC-008-referral-withdrawn.spec.ts
│       ├── TC-009-disenrolled-to-enrolled.spec.ts
│       ├── TC-010-open-ended-suspension.spec.ts
│       ├── TC-011-suspension-too-short.spec.ts
│       ├── TC-012-suspension-deleted.spec.ts
│       ├── TC-013-suspension-end-null-to-valid.spec.ts
│       ├── TC-014-address-only-update.spec.ts
│       ├── TC-015-new-sdpc-enrollment.spec.ts
│       ├── TC-016-fea-transfer.spec.ts
│       ├── TC-017-ica-transfer-during-suspension.spec.ts
│       ├── TC-018-new-sdpc-suspension.spec.ts
│       ├── TC-019-enrollment-begin-date-changed.spec.ts
│       ├── TC-020-enrollment-begin-date-changed-later.spec.ts
│       ├── TC-021-suspension-begin-date-earlier.spec.ts
│       ├── TC-022-suspension-begin-date-later.spec.ts
│       ├── TC-023-suspension-end-date-earlier.spec.ts
│       ├── TC-024-suspension-end-date-later.spec.ts
│       ├── TC-025-suspension-end-date-valid-to-null.spec.ts
│       ├── TC-026-sdpc-enrollment-end-date-earlier.spec.ts
│       ├── TC-027-sdpc-suspension-deleted.spec.ts
│       ├── TC-028-end-date-later-with-active-suspension.spec.ts
│       ├── TC-029-multiple-mmis-errors.spec.ts
│       ├── TC-030-success-with-errors-se-response.spec.ts
│       ├── TC-031-ica-transfer-with-existing-span-c.spec.ts
│       └── TC-032-address-update-no-current-span.spec.ts
└── ujt/
    └── enrollment/
        └── TC-001-new-iris-enrollment-journey.spec.ts
```

## Test Case Categories

### ATCs (Atomic Test Cases)

Each test verifies one behavior. Run fast, independent.

| Category | Test Cases | Description |
|----------|------------|-------------|
| **Enrollment CRUD** | TC-001, TC-004, TC-005, TC-006, TC-007, TC-008, TC-009, TC-015, TC-019, TC-020, TC-029, TC-030 | Create/update enrollment records |
| **Suspension Lifecycle** | TC-002, TC-010, TC-011, TC-012, TC-013, TC-018, TC-021-TC-025, TC-027 | Add/modify/delete suspension records |
| **Agency Transfers** | TC-003, TC-016, TC-017, TC-031 | ICA/FEA assignment changes |
| **Address Updates** | TC-014, TC-032 | Address-only changes |
| **Error/Edge Cases** | TC-004, TC-011, TC-029, TC-032 | Negative tests and boundary conditions |

### UJTs (User Journey Tests)

Sequential steps composing ATCs into end-to-end flows.

### Actions

Shared functions imported by both ATCs and UJTs. Avoids logic duplication.

## Test Execution Order (Recommended)

Tests have prerequisite chains. Execute in phases:

```
Phase 1 — Baseline (no prerequisites):
  TC-001  New IRIS Enrollment
  TC-004  Hard Error — FEA Dates
  TC-015  New SDPC Enrollment
  TC-029  Multiple MMIS Errors
  TC-030  SE Response — Activation Test

Phase 2 — Requires active IRIS enrollment (TC-001):
  TC-002  Enrolled → Suspended
  TC-003  ICA Transfer
  TC-005  Medicaid ID Mismatch
  TC-006  End Date → Earlier
  TC-010  Open-Ended Suspension
  TC-011  Suspension Too Short
  TC-014  Address-Only Update
  TC-016  FEA Transfer
  TC-019  Begin Date → Earlier
  TC-020  Begin Date → Later

Phase 3 — Requires disenrolled state (TC-006):
  TC-007  End Date → Later
  TC-009  Disenrolled → Enrolled
  TC-032  Address Update — No Current Span

Phase 4 — Requires separate active enrollment:
  TC-008  Referral Withdrawn

Phase 5 — Requires bounded suspension (TC-002):
  TC-012  Suspension Deleted
  TC-017  ICA Transfer During Suspension
  TC-021  Suspension Begin → Earlier
  TC-022  Suspension Begin → Later
  TC-023  Suspension End → Earlier
  TC-024  Suspension End → Later
  TC-025  Suspension End: Valid → Null
  TC-028  End Date Later + Active Suspension
  TC-031  ICA Transfer — Span-C Exists

Phase 6 — Requires open-ended suspension (TC-010):
  TC-013  Suspension End: Null → Valid

Phase 7 — Requires SDPC enrollment (TC-015):
  TC-018  New SDPC Suspension
  TC-026  SDPC End Date → Earlier

Phase 8 — Requires SDPC suspension (TC-018):
  TC-027  SDPC Suspension Deleted
```

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
- All tests use MA ID **1430000013** — ensure this participant exists in the target environment.
- Each test manages its own setup/teardown via the `beforeAll`/`afterAll` lifecycle hooks.
- Tests use `test.setTimeout(300_000)` (5 minutes) to accommodate MMIS sync delays.
