# Task List — ES Testing vs Bender-OS Pattern Comparison

**Created:** July 1, 2026  
**Reference:** `bender-os/tests/` (Playwright E2E) + `bender-os/docs/qa-review-report.md`  
**Goal:** Adopt bender-os best practices that apply to the Enrollment Service (ES) test suite.

---

## Summary

The bender-os project demonstrates a mature, industry-leading QA architecture with several patterns worth adopting. This task list identifies what's applicable to the ES testing project (which tests a different application — Blue Compass Carity — but uses the same Playwright infrastructure).

### Key Differences

| Aspect | bender-os | es-testing |
|--------|-----------|------------|
| App type | SPA (Lit Web Components) | Angular SPA (Material) |
| Auth | Cognito SDK (in-app login form) | Cognito Hosted UI + Context Selection |
| Backend | AppSync GraphQL + DynamoDB | REST + SQL Server (MMIS) |
| Test mode | Dual (mock + live) | Live only (real MMIS/DB) |
| Test scope | UI behaviors, streaming, sessions | Enrollment state transitions, MMIS sync |
| Workers | Parallel (7 workers live) | Serial (1 worker, state-dependent) |

---

## Phase 1: Infrastructure (HIGH PRIORITY)

### ✅ 1.1 Token Injection (sessionStorage + localStorage)

**Status:** DONE  
**Files:**
- `tests/helpers/auth-tokens.ts` — Core token injection module
- `tests/auth.setup.ts` — Token capture setup script
- `tests/helpers/login.ts` — Updated with injection + fallback pattern
- `.gitignore` — Added `.auth/` exclusion
- `.env` — Added `USE_TOKEN_INJECTION` flag

**Pattern adopted from bender-os:**
- `page.addInitScript()` for pre-page-load token injection
- `page.context().storageState()` for cookie + localStorage persistence
- Fallback to full UI login when tokens expire
- Token capture after successful login for next run

**Usage:**
```bash
# First run (captures tokens after UI login):
npm run test:auth-setup

# Subsequent runs (uses injected tokens, ~30s faster):
npm run test:tc001
```

---

### ⬜ 1.2 Playwright Storage State Integration

**Priority:** High  
**Effort:** 2 hours  
**Reference:** `bender-os/tests/playwright.config.ts` → `storageState: authFile`

Update `playwright.config.ts` to support a `storageState` project dependency pattern:
- Add an `auth-setup` project that runs before test projects
- Test projects depend on auth-setup and inherit the storage state
- Eliminates per-`describe.serial` `loginAndSelectContext()` calls

**Why:** Currently every test file calls `loginAndSelectContext()` in `beforeAll`. With storage state at the project level, login happens once and all tests share the session.

**Constraint:** The Carity "context selection" step (Org/Location/Staff) sets sessionStorage values that may not persist across context restarts. Need to verify this works before removing per-file login calls.

---

### ⬜ 1.3 Fixture Pattern (App-Level Test Fixtures)

**Priority:** Medium  
**Effort:** 1 day  
**Reference:** `bender-os/tests/atc/fixtures/app.fixture.ts`

Create a `tests/fixtures/es.fixture.ts` that provides:
- `authenticatedPage` — pre-authenticated page (via token injection or storage state)
- `enrollmentPage` — authenticated + navigated to enrollment detail for a participant
- `profilePage` — authenticated + navigated to participant profile

This removes boilerplate from each test file (`chromium.launch()`, `loginAndSelectContext()`, `resolveParticipantUuid()`, etc.)

---

### ⬜ 1.4 CI Pipeline Configuration

**Priority:** Medium  
**Effort:** 4 hours  
**Reference:** `bender-os/.github/workflows/pr-tests.yml`, `nightly-live-tests.yml`

Create GitHub Actions workflows:
- **PR Gate:** Run a smoke subset of enrollment tests (TC-001, TC-002, TC-014)
- **Nightly:** Run the full suite (all TC-* and phase-* tests)
- **Manual Dispatch:** Run with `--grep` filter for targeted execution
- Store HTML reports as artifacts (7-day retention)

---

## Phase 2: Test Quality Patterns (MEDIUM PRIORITY)

### ⬜ 2.1 Selectors Constants File

**Priority:** Medium  
**Effort:** 2 hours  
**Reference:** `bender-os/tests/atc/fixtures/selectors.ts`

Extract hardcoded selectors from test files into a centralized `tests/helpers/selectors.ts`:
```typescript
export const SELECTORS = {
  enrollmentRow: 'mat-row',
  syncStatus: '[data-testid="sync-status"]',
  mmisTransactionList: 'text=MMIS Transaction List',
  addressEditBtn: 'button[aria-label*="Edit Address"]',
  // ... etc
};
```

**Why:** Carity Angular components update frequently. A single location for selectors makes refactoring cheaper.

---

### ⬜ 2.2 Test Data Factories (Typed Scenario Data)

**Priority:** Medium  
**Effort:** 4 hours  
**Reference:** `bender-os/tests/atc/fixtures/test-data.ts`

Currently `tests/data/scenario-test-data.ts` has flat scenario objects. Enhance with:
- TypeScript interfaces for each scenario type
- Factory functions: `createEnrollmentScenario()`, `createSuspensionScenario()`
- Fixed timestamps for determinism
- Builder pattern for overrides

---

### ⬜ 2.3 Performance Budgets

**Priority:** Low  
**Effort:** 1 day  
**Reference:** `bender-os QA report` → Section 3.5

Add performance budget tests for Carity:
| Metric | Budget |
|--------|--------|
| Login → App ready | 30s |
| Navigate to enrollment detail | 10s |
| MMIS sync polling (per iteration) | 15s |
| Context selection (Org → ready) | 20s |

These validate that the app isn't degrading over time.

---

### ⬜ 2.4 Flakiness Reporter

**Priority:** Low  
**Effort:** 4 hours  
**Reference:** `bender-os/tests/scripts/flakiness-reporter.ts`

Create `scripts/flakiness-reporter.ts` that:
- Analyzes test result JSON from multiple runs
- Identifies tests with inconsistent pass/fail patterns
- Outputs a flakiness report with historical trends
- Integrates with CI artifact storage

---

## Phase 3: Coverage Expansion (LOWER PRIORITY)

### ⬜ 3.1 Negative Test Cases (Error Handling)

**Priority:** Medium  
**Effort:** 2 days  
**Reference:** `bender-os/tests/api/*-negative.api.spec.ts`

Add negative/error handling test cases:
- `TC-033-invalid-medicaid-id-format.spec.ts` — Non-numeric MA ID
- `TC-034-concurrent-enrollment-edits.spec.ts` — Two users editing same enrollment
- `TC-035-network-timeout-during-sync.spec.ts` — MMIS unavailable mid-transaction
- `TC-036-session-expired-during-workflow.spec.ts` — Token expires mid-test

---

### ⬜ 3.2 Accessibility Tests

**Priority:** Low  
**Effort:** 1 day  
**Reference:** `bender-os/tests/atc/auth/auth-accessibility.spec.ts`

Add WCAG 2.1 AA compliance tests for:
- Login/context selection page
- Enrollment list view
- Enrollment detail view
- Address edit form

Use `@axe-core/playwright` for automated scanning.

---

### ⬜ 3.3 Cross-Browser Smoke Tests

**Priority:** Low  
**Effort:** 4 hours  
**Reference:** `bender-os/tests/playwright.config.ts` → firefox/webkit projects

Add Firefox and WebKit projects to `playwright.config.ts` that run a smoke subset (TC-001 only). Validates Carity's Angular Material components render correctly across engines.

---

### ⬜ 3.4 API-Level Tests (Direct DB/Service Validation)

**Priority:** Low  
**Effort:** 3 days  
**Reference:** `bender-os/tests/api/*.api.spec.ts`

Create `tests/api/` directory with direct API/DB validation tests:
- `enrollment-lifecycle.api.spec.ts` — Query DB directly for enrollment state transitions
- `mmis-transactions.api.spec.ts` — Verify transaction table entries match expected payloads
- `sync-status.api.spec.ts` — Validate sync status progression without UI

These don't need a browser — faster feedback loop for backend validation.

---

## Phase 4: Patterns NOT Applicable to ES Testing

These bender-os patterns are documented for completeness but don't apply:

| Pattern | Why Not Applicable |
|---------|-------------------|
| Dual-mode execution (mock + live) | ES tests are always live (real MMIS integration required) |
| MockApi class | No frontend mocking needed — tests validate real backend responses |
| Property-based testing | Enrollment logic is in the backend (not testable via Playwright) |
| Factory-schema contract validation | No GraphQL schema to validate against |
| Streaming/subscription tests | No WebSocket/real-time features in Carity enrollment |
| ViewConfig pattern | Single-page workflow, not multi-view SPA navigation |

---

## Completed Items

- [x] **1.1** Token injection (sessionStorage + localStorage) — `auth-tokens.ts`
- [x] Existing: 32 ATC enrollment test cases (TC-001 through TC-032)
- [x] Existing: 8 UJT enrollment phases (phase-1 through phase-8)
- [x] Existing: DB helper (`db.ts`) for MMIS mock via stored procedure
- [x] Existing: State checker (`state-checker.ts`) for precondition validation
- [x] Existing: MMIS snapshot (`mmis-snapshot.ts`) for waiver state verification
- [x] Existing: Enrollment reset (`reset-enrollment.ts`) via TC-008 withdrawal pattern
