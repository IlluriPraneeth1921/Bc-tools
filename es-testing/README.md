# Enrollment Service Testing

Playwright-based automated tests for the Blue Compass IRIS/SDPC Enrollment Webservice (ICD-D01 V6.0).

## Overview

This project validates the complete enrollment lifecycle between Blue Compass (Carity) and the Wisconsin MMIS system. It covers enrollment creation, suspension management, agency transfers, address updates, and error handling.

## Test Participant

| Attribute | Value |
|-----------|-------|
| **Medicaid ID (MA ID)** | **1430000013** |
| Used In | All 32 test cases (TC-001 through TC-032) |

## Quick Start

```bash
npm install
npx playwright install chromium
cp .env.example .env   # Configure with your credentials
npm test
```

## Environment Configuration (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_URL` | Blue Compass application URL | `https://widhs-f2-carity.lower-widhs.aws.feisystems.com` |
| `TEST_USER` | Cognito login username | (your username) |
| `TEST_PASSWORD` | Cognito login password | (your password) |
| `TEST_ORG` | Organization for context selection | `Quantum Services` |
| `TEST_LOCATION` | Location for context selection | `Quantum Services Medical Equipment` |
| `TEST_STAFF` | Staff delegation for context selection | `Self` |
| `TEST_MA_ID` | Test participant Medicaid ID | `1430000013` |
| `TEST_PERSON_UUID` | Test participant UUID (skip search if set) | (UUID from database) |

## Running Tests

### All tests

```bash
npm test
```

### By project type

```bash
npm run test:atc    # Atomic Test Cases only
npm run test:ujt    # User Journey Tests only
```

### By test case

```bash
npm run test:tc001
npm run test:tc002
npm run test:tc003
npm run test:tc004
npm run test:tc005
```

### By execution phase (respects prerequisite chains)

```bash
npm run test:phase1   # No prerequisites: TC-001, TC-004, TC-015, TC-029, TC-030
npm run test:phase2   # Requires TC-001: TC-002, TC-003, TC-005, TC-006, etc.
npm run test:phase3   # Requires disenrolled: TC-007, TC-009, TC-032
npm run test:phase5   # Requires suspension: TC-012, TC-017, TC-021-TC-025, etc.
```

### Headed mode (visible browser)

```bash
npx playwright test --headed --project=atc
```

### With debugging trace

```bash
npx playwright test --trace on --project=atc
```

## Test Case Inventory (32 total)

| TC # | Scenario | Program | Expected | Txns |
|------|----------|---------|----------|------|
| TC-001 | New IRIS Enrollment — Happy Path | IRIS | SU | 1 |
| TC-002 | Enrolled → Suspended (with end date) | IRIS | SU | 3 |
| TC-003 | ICA Transfer — Active Span | IRIS | SU | 2 |
| TC-004 | Hard Error — FEA Dates Don't Span | IRIS | FL | 1 |
| TC-005 | Medicaid ID Mismatch (BR-D01-016) | IRIS | SU + ID swap | 1 |
| TC-006 | End Date → Earlier (Disenrollment) | IRIS | SU | 1 |
| TC-007 | End Date → Later (Extension) | IRIS | SU | 1 |
| TC-008 | Referral Withdrawn | IRIS | SU | 1 |
| TC-009 | Disenrolled → Enrolled (Reinstatement) | IRIS | SU | 1 |
| TC-010 | Open-Ended Suspension (no end date) | IRIS | SU | 2 |
| TC-011 | Suspension < 3 Days (Error) | IRIS | No Txn | 0 |
| TC-012 | Suspension Deleted | IRIS | SU | 2 |
| TC-013 | Suspension End: Null → Valid | IRIS | SU | 2 |
| TC-014 | Address-Only Update | IRIS | SU | 1 |
| TC-015 | New SDPC Enrollment | SDPC | SU | 1 |
| TC-016 | FEA Transfer | IRIS | SU | 2 |
| TC-017 | ICA Transfer During Suspension | IRIS | SU | 3 |
| TC-018 | New SDPC Suspension | SDPC | SU | 3 |
| TC-019 | Begin Date → Earlier | IRIS | SU | 2 |
| TC-020 | Begin Date → Later | IRIS | SU | 2 |
| TC-021 | Suspension Begin → Earlier | IRIS | SU | 4 |
| TC-022 | Suspension Begin → Later | IRIS | SU | 3 |
| TC-023 | Suspension End → Earlier | IRIS | SU | 4 |
| TC-024 | Suspension End → Later | IRIS | SU | 3 |
| TC-025 | Suspension End: Valid → Null | IRIS | SU | 2 |
| TC-026 | SDPC End Date → Earlier | SDPC | SU | 1 |
| TC-027 | SDPC Suspension Deleted | SDPC | SU | 2 |
| TC-028 | End Date Later + Suspension Active | IRIS | SU | 1 |
| TC-029 | Multiple MMIS Error Segments | IRIS | FL | 1 |
| TC-030 | SE Response — Enrollment Activated | IRIS | SE | 1 |
| TC-031 | ICA Transfer — Span-C Exists | IRIS | SU | 3 |
| TC-032 | Address Update — No Current Span | IRIS | No Txn | 0 |

## Project Structure

```
es-testing/
├── .env                    # Environment configuration (gitignored)
├── .gitignore
├── package.json            # Dependencies and scripts
├── playwright.config.ts    # Playwright configuration
├── docs/                   # Reference documentation
│   ├── carity-db.md
│   ├── Enrollment_Service_ICD_D01_V6.0_Complete_Context.md
│   └── Enrollment_Webservice_Decision_Tables.md
├── scripts/                # SQL setup/teardown scripts
│   ├── cleanup-enrollment-data.sql
│   └── update-isp-date.sql
├── test-cases/             # Test case specifications
│   ├── TC-001 through TC-032 (markdown specs)
│   ├── TEST_INVENTORY.md   # Coverage matrix
│   ├── TEST_PARTICIPANT.md # Shared participant data
│   └── TEMPLATE.md         # Template for new test cases
├── tests/                  # Playwright test implementations
│   ├── README.md           # Detailed running guide
│   ├── helpers/            # Shared utilities
│   │   ├── login.ts
│   │   └── participant-resolver.ts
│   ├── atc/                # Atomic Test Cases
│   │   └── enrollment/
│   │       ├── actions/enrollment.actions.ts
│   │       └── TC-*.spec.ts (32 spec files)
│   └── ujt/                # User Journey Tests
│       └── enrollment/
│           └── TC-001-new-iris-enrollment-journey.spec.ts
└── reports/                # Generated test reports
    └── html/
```

## Architecture

### Test Pattern

Each test follows the **Arrange-Act-Assert** pattern:

1. **beforeAll**: Launch browser, login, resolve test participant
2. **Test steps**: Navigate to enrollment, perform action, verify MMIS response
3. **afterAll**: Close browser

### Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `login.ts` | `tests/helpers/` | Cognito authentication + context selection |
| `participant-resolver.ts` | `tests/helpers/` | Global search, person navigation |
| `enrollment.actions.ts` | `tests/atc/enrollment/actions/` | Reusable enrollment operations |

### Test Fixtures (Setup/Teardown)

Each test manages its own lifecycle:
- **Setup**: `test.beforeAll()` launches browser, authenticates, resolves participant
- **Teardown**: `test.afterAll()` closes browser
- **Participant state**: Managed via test execution order (phases)
- **Data prerequisites**: Documented in each TC-XXX markdown file

## Key References

- [Test Strategy](/.kiro/test-strategy-v1.md)
- [ICD-D01 V6.0](docs/Enrollment_Service_ICD_D01_V6.0_Complete_Context.md)
- [Decision Tables](docs/Enrollment_Webservice_Decision_Tables.md)
- [Carity Database](docs/carity-db.md)

## Troubleshooting

### Login fails

- Verify `.env` credentials are correct
- Check if the F2 environment is accessible
- Try headed mode: `npx playwright test --headed`

### Participant not found

- Set `TEST_PERSON_UUID` in `.env` to skip search
- Verify participant exists with MA ID 1430000013

### MMIS sync timeout

- Tests use 5-minute timeouts for MMIS responses
- If sync takes longer, increase `test.setTimeout()` in the spec file
- Check if the MMIS environment is responding

### Screenshots on failure

All test failures automatically capture screenshots to `test-results/`.
