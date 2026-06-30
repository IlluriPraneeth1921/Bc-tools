# BC Tools Validation Helper

Automated test suite for validating the Blue Compass (Carity) enrollment webservice integration with Wisconsin DHS MMIS.

## Projects

| Folder | Description |
|--------|-------------|
| `es-testing/` | Enrollment Service end-to-end tests (Playwright) |
| `pipeline-testing/` | Pipeline validation tests |

## Enrollment Service Testing (`es-testing/`)

Comprehensive Playwright-based test automation covering the ICD-D01 V6.0 Enrollment Webservice contract between Blue Compass and MMIS.

### Quick Start

```bash
cd es-testing
npm install
npx playwright install chromium
npm test
```

### Test Coverage

- **32 test cases** covering all 11 S100 trigger conditions
- **IRIS** (28 tests) and **SDPC** (4 tests) programs
- **24/24 business rules** covered (BR-D01-001 through BR-D01-024)
- Positive (SU), negative (FL), and edge case (SE) response scenarios

### Test Participant

| Attribute | Value |
|-----------|-------|
| Medicaid ID (MA ID) | **1430000013** |

### Documentation

- [Test Strategy](es-testing/.kiro/test-strategy-v1.md) — Automation strategy document
- [Test Inventory](es-testing/test-cases/TEST_INVENTORY.md) — Complete test case inventory with decision table coverage
- [Test Participant](es-testing/test-cases/TEST_PARTICIPANT.md) — Shared test participant data profile
- [Tests README](es-testing/tests/README.md) — Running guide with commands and execution order

## Prerequisites

- Node.js 18+
- Playwright with Chromium
- Access to the Blue Compass F2 environment
- Test participant (MA ID 1430000013) configured in the target environment
