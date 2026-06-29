---
title: "Carity / Bender-OS Test Automation Strategy"
author: "QA Team"
status: "Updated"
created: "2026-05-19"
last-updated: "2026-06-19"
program: "Carity / Bender-OS"
revision-history:
  - version: "1.0"
    date: "2026-05-19"
    author: "QA Team"
    changes: "Initial draft — merged ATC, UJT, and organizational model"
  - version: "1.1"
    date: "2026-05-20"
    author: "QA Team"
    changes: "Added Related Documents section with links to guides and templates"
  - version: "1.2"
    date: "2026-05-27"
    author: "QA Team"
    changes: "Gap analysis additions: authentication/security section, database/API validation section, Katalon migration reference, updated playwright.config.ts with auth projects + reporters + screenshot/video/trace, utils/ folder in project structure, @flaky/@deprecated tags added to tag hierarchy, accessibility ATC example added, API test level added to levels table"
  - version: "1.3"
    date: "2026-05-28"
    author: "QA Team"
    changes: "Added Section 19: Test Data Management; Section 20: Complex Prerequisites — chained API seeding fixture pattern; Section 21: Navigation — simple vs multi-step navigation rules"
  - version: "2.0"
    date: "2026-05-29"
    author: "QA Team"
    changes: "Added Section 22: Azure Test Plan Integration — complete end-to-end example of UJT tagging, test-plan-mapping.json strategy, reporter testPointMapper configuration, and ADO pipeline flow"
  - version: "2.1"
    date: "2026-06-01"
    author: "QA Team"
    changes: "Create a use case for dedicated standalone endpoint to deletion of person records (backlog)"
  - version: "3.0"
    date: "2026-06-03"
    author: "QA Team"
    changes: "Added Section 23: Requirement ID Coverage Tagging and Unified Test Case Mapper; Section 24: ADO Test Case Lifecycle Management (create/update/delete via script); Section 25: Metrics — Regression Automation Coverage, Code Coverage, RTM; Section 26: ATC/Test Plan Workflow alignment (New Request vs Enhancement flows)"
  - version: "4.0"
    date: "2026-06-19"
    author: "QA Team"
    changes: "V1 overhaul — compliance report against actual Bender-OS implementation; added Unit Test Strategy (Section 2A); Property-Based Testing (Section 2B); Contract Testing as formal level (Section 2C); Load Testing reference (Section 2D); replaced Page Object pattern with ViewConfig + Action Functions pattern; formalized QA Engineer role; added Common Library patterns; added Operational Playbook; updated project structure to match actual codebase"
---

# Compliance Report: Strategy vs Implementation

> **Generated**: 19 June 2026
> **Scope**: Review of `docs/test-strategy.md` (v3.0) against actual test implementations in `src/*/__tests__/` and `tests/`

## Summary

The original test strategy was written for "Carity" — a healthcare case management system. The actual codebase implementing tests is "Bender-OS" — a personal AI operating system with chat, skills, jobs, and document management. Both projects are maintained by the same team and share architectural patterns.

| # | Area | Strategy Says | Reality | Status | Resolution |
|---|------|--------------|---------|--------|------------|
| 1 | Domain | Carity: person/organization/location modules | Bender-OS: chat/sessions/skills/jobs/documents/settings modules | GAP | Strategy now covers **both** — Carity patterns remain as organizational context; Bender-OS patterns documented as active implementation |
| 2 | UI Pattern | Page Object classes (`PersonPage.ts`, `ME_PersonPage.ts`) | `ViewConfig` + `ViewPage` config-driven pattern + action functions | GAP | **Page Object pattern removed** — replaced with ViewConfig + Action Functions pattern (Section 8) |
| 3 | Profiles | `profiles/*.profile.json` with env/credential/data overrides | `.env` file + `LIVE_MODE` toggle + env vars | PARTIAL | Profiles concept **retained for future** — current Bender-OS uses simplified env-var approach |
| 4 | ADO Integration | `test-plan-mapping.json`, `playwright-azure-reporter`, `manage-ado-test-cases.ts` | Not yet implemented in Bender-OS | PLANNED | Section retained — marked as planned integration |
| 5 | Customer/State Model | Standard vs Customer-specific (ME, MN, MO, TX, WI) | Not applicable to Bender-OS | CONTEXT | Section retained for organizational context (Carity) |
| 6 | Unit Tests | "No — developer-owned, separate tooling" | Jest + ts-jest + fast-check + aws-sdk-client-mock, 65%/80% thresholds, same repo | GAP | **Now formally covered** in Section 2A |
| 7 | Property-Based Testing | Not mentioned | Extensive use of `fast-check` in both unit tests (12 property files) and Playwright API tests | GAP | **Formally adopted** in Section 2B |
| 8 | Contract/Schema Testing | "Not yet — future consideration" | `tests/validation/` with GraphQL schema validator, factory contract tests | GAP | **Promoted to formal test level** in Section 2C |
| 9 | Load Testing | `@perf` tag mentioned, no tooling specified | k6 load test in `tests/load/concurrent-requests.js` | PARTIAL | Documented as example in Section 2D |
| 10 | Mocking | Strategy describes `mssql` + API seeding fixtures | Actual: `MockApi` class (GraphQL route interception, Cognito mock, operation constants, error/timeout simulation) | GAP | Fully documented in Section 28: Common Library |
| 11 | Test Data | Factory pattern with `AutoTest_` prefix | Deterministic factories with `Partial<T>` overrides, typed interfaces for all GraphQL types | ALIGNED | Enhanced with actual factory patterns |
| 12 | Config | `playwright.config.ts` with `setup`, `atc`, `ujt` projects | Multi-project: `atc-mock`, `atc-live`, `ujt-mock`, `ujt-live`, `api`, `validation`, `mobile`, `firefox`, `webkit` | ENHANCED | Config section updated to match actual |
| 13 | Accessibility | axe-core mentioned | Full `accessibility.fixture.ts` with `assertAccessible()`, HTML violation reports, WCAG 2.1 AA scanning | ALIGNED | Documented actual implementation |
| 14 | Flakiness | Process described | `scripts/flakiness-reporter.ts` with history tracking, trend analysis | ALIGNED | Documented actual tooling |
| 15 | Reporters | HTML + JUnit + JSON + list | Actual matches strategy; `pdf`, `summary`, `code_coverage` reporters referenced in strategy do NOT exist | GAP | Corrected — only actual reporters documented |
| 16 | Role Definition | "QA team" owns ATCs/UJTs, "Developers" own unit tests | QA Engineers in this team write both unit tests and Playwright tests | GAP | **New role definition** added — QA Engineer as developer-analyst hybrid |

## Compliance Status

- **ALIGNED**: 4 items — no action needed
- **GAP**: 8 items — resolved in this document
- **PARTIAL**: 2 items — documented with current state + future plan
- **PLANNED**: 1 item — retained with implementation timeline
- **CONTEXT**: 1 item — retained for organizational knowledge

---

# Carity / Bender-OS Test Automation Strategy

## 1. Overview

This document defines the complete test automation strategy for the Carity application ecosystem, including the Bender-OS AI assistant platform. It establishes:

- **Four test levels**: Unit Tests, Atomic Test Cases (ATCs), User Journey Tests (UJTs), and Contract Tests
- **Advanced test techniques**: Property-based testing, schema validation, load testing
- **Organizational model**: How tests are structured across Standard and Customer-specific implementations
- **Test Suite and Plan hierarchy**: How suites, plans, and test cases relate
- **Profile-driven execution**: How the same tests run across multiple environments
- **CI/CD integration**: When and how tests execute in the pipeline
- **Common library**: Shared patterns, mocks, and utilities for all test levels
- **Operational playbook**: How to run, debug, and maintain the test system

> **Companion document**: For a narrative guide with step-by-step instructions, training plans, and worked examples, see the [QA Guide — Quality Assurance with Playwright](../guides/QA%20Guide%20-%20Quality%20Assurance%20with%20Playwright.md). This strategy document defines *what* we do; the QA Guide explains *how* to do it.

### 1.1 QA Engineer Role Definition

The QA Engineer in this organization is a **hybrid developer-analyst** who operates at the intersection of software engineering and quality assurance. This role is formally recognized as distinct from both traditional QA analysts and software developers.

| Capability | Description |
|-----------|-------------|
| **Development** | Writes production-quality TypeScript, builds test frameworks, creates shared libraries, implements CI/CD pipelines |
| **Testing** | Designs test strategies, writes ATCs/UJTs, performs exploratory testing, validates accessibility |
| **Architecture** | Designs mock infrastructure, fixture patterns, data factories, schema validators |
| **Analysis** | Interprets test metrics, identifies coverage gaps, traces requirements to tests |
| **Operations** | Maintains test environments, debugs flaky tests, manages test data lifecycle |

**Ownership boundaries:**

| Artifact | Primary Owner | Secondary Owner |
|----------|--------------|-----------------|
| Unit tests (`src/*/__tests__/`) | QA Engineer | Software Developer |
| Property-based tests | QA Engineer | Software Developer |
| Playwright ATCs/UJTs | QA Engineer | — |
| Contract/Schema tests | QA Engineer | Software Developer |
| Load tests | QA Engineer | DevOps |
| Test infrastructure (fixtures, mocks, factories) | QA Engineer | — |
| CI/CD pipeline config | QA Engineer | DevOps |

---

## 2. Test Levels

### 2.1 Atomic Test Cases (ATC)

An Atomic Test Case validates exactly **one behavior** with a single primary assertion. ATCs are the foundation of the test pyramid.

| Principle | Description |
|-----------|-------------|
| **Single Responsibility** | Tests exactly one behavior |
| **Independence** | No dependency on other tests' execution order |
| **Self-Contained** | Manages its own setup and teardown |
| **Deterministic** | Same result every run |
| **Fast** | Executes in seconds |
| **Clear Failure** | Fails for exactly one reason |

**Naming Convention**: `ATC-<MODULE>-<SEQUENCE>`

**Examples (Carity)**:
- `ATC-PER-001` — First name required validation
- `ATC-PER-002` — Person record created successfully
- `ATC-ORG-015` — Organization phone max length enforced
- `ATC-PER-ACC-001` — Add Person form passes axe-core audit

**Examples (Bender-OS)**:
- `ATC-CHT-001` — Chat view displays with message input
- `ATC-CHT-002` — Send message triggers agent invocation
- `ATC-SES-001` — Session list loads with entries
- `ATC-A11Y-CHT-001` — Chat view has no WCAG 2.1 AA violations

**Implementation**: Each ATC maps to a Playwright `test()` block following Arrange-Act-Assert. Each ATC also exposes a reusable **action function** that User Journey Tests can import.

**Template**: See [`templates/atomic-testcase-template.md`](../../templates/atomic-testcase-template.md)

### 2.2 User Journey Tests (UJT)

A User Journey Test validates a **complete end-to-end business scenario** by composing ATC action functions in sequence and adding cross-layer verification (UI + API/Database).

| Principle | Description |
|-----------|-------------|
| **Composition** | Imports and calls ATC action functions — never duplicates logic |
| **Sequential** | Steps depend on prior steps completing |
| **Cross-Layer** | Verifies data persistence from UI through to database |
| **Few in Number** | Covers critical paths only (test pyramid top) |
| **Traceable** | Each step maps to a referenced ATC via coverage matrix |

**Naming Convention**: `UJT-<MODULE>-<SEQUENCE>`

**Examples (Carity)**:
- `UJT-PER-001` — Add person and verify database persistence
- `UJT-PER-002` — Search person, edit demographics, verify changes saved

**Examples (Bender-OS)**:
- `UJT-CHT-001` — Login, send message, receive agent response, verify displayed, logout
- `UJT-SKL-001` — Upload skill, enable, trigger via chat, verify job created

**Implementation**: Each UJT imports action functions from `tests/atc/<module>/actions/<module>.actions.ts`. Journey-specific logic (API verification, cross-layer checks) is inline.

**Template**: See [`templates/user-journey-testcase-template.md`](../../templates/user-journey-testcase-template.md)

### 2.3 Relationship: Test Pyramid

```
+------------------------------------------------------------------+
|                        Test Pyramid                                |
|                                                                  |
|                          /\                                       |
|                         /  \        User Journey Tests (UJT)      |
|                        /UJT \       - Few, critical paths         |
|                       /------\      - Sequential, slower          |
|                      /        \     - Cross-layer verification    |
|                     / Contract  \   Contract / Schema Tests       |
|                    /  & Schema   \  - Factory ↔ schema drift      |
|                   /--------------\ - API contract validation      |
|                  /      ATC       \                               |
|                 /                   \ Atomic Test Cases (ATC)     |
|                /---------------------\ - Many, parallel, fast    |
|               /    Property-Based     \                           |
|              /      & Unit Tests       \ - Code-level logic      |
|             /_____________________________\                       |
+------------------------------------------------------------------+
```

### 2.4 Levels of Testing — Complete Picture

| Level | Owner | Scope | Tooling | In This Strategy? |
|-------|-------|-------|---------|-------------------|
| **Unit Tests** | QA Engineer / Developer | Code-level logic (functions, classes, methods) | Jest + ts-jest | Yes — Section 2A |
| **Property-Based Tests** | QA Engineer / Developer | Invariant verification across random inputs | fast-check + Jest | Yes — Section 2B |
| **Atomic Test Cases (ATCs)** | QA Engineer | UI-level single behavior verification | Playwright | Yes — primary focus |
| **Contract / Schema Tests** | QA Engineer | API contract validation between mock and real | Playwright + custom validator | Yes — Section 2C |
| **User Journey Tests (UJTs)** | QA Engineer | UI + API + DB end-to-end workflows | Playwright | Yes — primary focus |
| **Load / Performance Tests** | QA Engineer / DevOps | Response time, concurrency, rate limiting | k6 | Yes — Section 2D |
| **Manual Exploratory Testing** | QA Engineer | Unscripted investigation of edge cases and usability | — | Complements automation |
| **Accessibility Tests (508)** | QA Engineer | WCAG 2.1 AA / Section 508 compliance | @axe-core/playwright | Yes — `@accessibility` tagged ATCs |
| **Standalone API Tests** | QA Engineer | GraphQL/REST API validation independent of UI | Playwright APIRequestContext | Yes — `tests/api/` |

**Key boundaries:**
- QA Engineers own all test levels in this strategy. Developers contribute to unit tests and property tests.
- ATCs and UJTs operate at the UI and integration level — they verify user-facing behavior, not internal implementation.
- Manual exploratory testing remains valuable for discovering issues that scripted tests can't anticipate.

---

## 2A. Unit Test Strategy

> **[NEW — v4.0]** Formally incorporates unit testing into the strategy. Unit tests are co-owned by QA Engineers and Developers.

### 2A.1 Framework and Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest 30.x with ts-jest |
| Language | TypeScript (ES2022 target) |
| Test environment | Node.js |
| Coverage tool | Istanbul (built into Jest) |
| Config file | `jest.config.ts` at repo root |

### 2A.2 Coverage Thresholds

These are enforced in CI — builds fail if thresholds are not met:

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| **Branches** | 65% | Allows for uncovered error paths in early modules |
| **Functions** | 80% | All public functions must be tested |
| **Lines** | 80% | High coverage on business logic |
| **Statements** | 79% | Aligned with lines |

### 2A.3 Directory Structure

```
src/
  lambdas/
    __tests__/
      unit/                    # Isolated function-level tests
        background-job-processor.test.ts
        pricing.test.ts
        schedule-dispatcher.test.ts
        skill-execution.test.ts
        ...
      properties/              # Property-based tests (fast-check)
        cost-calculation.property.test.ts
        input-sanitization.property.test.ts
        session-id-uniqueness.property.test.ts
        ...
      integration/             # Tests requiring multiple modules
        agentcore-invoker.test.ts
        notification-flow.integration.test.ts
        ...
      mocks/                   # Shared mock utilities
        index.ts               # Barrel export
        dynamodb.ts            # DynamoDB mock factories
        secrets-manager.ts     # SecretsManager mock factories
      setup.test.ts            # Jest setup / sanity check
  appsync/
    __tests__/                 # AppSync resolver tests
  agent/
    __tests__/                 # Agent module tests
```

### 2A.4 Mocking Patterns for Unit Tests

#### Pattern 1: Module-Level `jest.mock()` with Manual Factories

Used for AWS SDK clients where module-level instantiation prevents DI:

```typescript
const mockDdbSend = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({})),
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: (...args: unknown[]) => mockDdbSend(...args) })),
  },
  GetCommand: jest.fn((input) => ({ _type: 'Get', ...input })),
  UpdateCommand: jest.fn((input) => ({ _type: 'Update', ...input })),
}));
```

#### Pattern 2: Shared Mock Factories (Recommended)

Reusable mock factories from `src/lambdas/__tests__/mocks/`:

```typescript
import { createMockDynamoDBClient, createMockSecretsManager } from '../__tests__/mocks';

const { mockSend, mockClient } = createMockDynamoDBClient({ taskExists: true });
const { mockSend: smSend } = createMockSecretsManager(DEFAULT_TEST_CONFIG);
```

#### Pattern 3: Environment Variable Setup

Lambda handlers read config from env vars — set them before importing:

```typescript
process.env.BACKGROUND_JOBS_TABLE_NAME = 'test-background-jobs';
process.env.SESSIONS_TABLE_NAME = 'test-sessions';
process.env.AWS_REGION = 'us-east-1';
```

### 2A.5 Unit Test Naming Convention

```
describe('<module-name>', () => {
  it('should <expected behavior> when <condition>', () => { ... });
});
```

### 2A.6 When to Write Unit Tests

| Scenario | Required? |
|----------|-----------|
| New Lambda handler | Yes — happy path + error cases |
| New shared utility function | Yes — all branches |
| Bug fix | Yes — regression test proving the fix |
| Internal refactor (no behavior change) | No — existing tests should still pass |
| Configuration-only change | No |

---

## 2B. Property-Based Testing

> **[NEW — v4.0]** Formally adopted. Property-based tests verify invariants hold across thousands of randomized inputs.

### 2B.1 Framework

| Tool | Version | Usage |
|------|---------|-------|
| fast-check | ^3.23.2 | Both Jest unit tests and Playwright API tests |

### 2B.2 What Is Property-Based Testing?

Instead of testing with specific example inputs, property-based tests generate thousands of randomized inputs and verify that mathematical properties (invariants) always hold. If a counterexample is found, fast-check automatically shrinks it to the minimal failing case.

### 2B.3 When to Use Property-Based Tests

| Use Case | Example | Property |
|----------|---------|----------|
| Mathematical calculations | Cost/pricing functions | Non-negativity, monotonicity, determinism |
| Input validation / sanitization | User input fields | Never produces unsafe output regardless of input |
| ID generation | Session IDs, job IDs | Uniqueness, format compliance |
| State machines | Job status transitions | Only valid transitions occur |
| Serialization | JSON round-trips | Encode/decode is identity |
| Schedule/cron parsing | Cron expressions | Parsed schedule produces valid next-run times |

### 2B.4 Property Categories

| Property | Meaning | Example |
|----------|---------|---------|
| **Invariant** | Always true regardless of input | `cost >= 0` for any token count |
| **Idempotent** | Applying twice = applying once | `sanitize(sanitize(x)) === sanitize(x)` |
| **Monotonic** | More input → same or more output | More tokens → higher cost |
| **Round-trip** | Encode then decode = original | `parse(format(date)) === date` |
| **Commutativity** | Order doesn't matter | `merge(a, b) === merge(b, a)` |
| **Deterministic** | Same input = same output | `f(x) === f(x)` always |

### 2B.5 Actual Implementation Example

```typescript
// src/lambdas/__tests__/properties/cost-calculation.property.test.ts
import fc from 'fast-check';
import { calculateCost } from '../../shared/pricing';

const STANDARD_PRICING = { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 };

it('cost is never negative for any non-negative token counts', () => {
  fc.assert(
    fc.property(
      fc.nat({ max: 1_000_000 }),
      fc.nat({ max: 1_000_000 }),
      (inputTokens, outputTokens) => {
        const cost = calculateCost(inputTokens, outputTokens, STANDARD_PRICING);
        expect(cost).toBeGreaterThanOrEqual(0);
      },
    ),
    { numRuns: 200 },
  );
});
```

### 2B.6 Property Tests in Playwright API Tests

Property-based testing also applies at the API level (`tests/api/property-tests.api.spec.ts`):

```typescript
import { test, expect } from './fixtures/api.fixture';
import fc from 'fast-check';

test('API property: session creation is idempotent on list', async ({ gql }) => {
  // Create N sessions, verify list always returns at least N
  const count = fc.sample(fc.nat({ min: 1, max: 3 }), 1)[0];
  // ... test that creating sessions never corrupts existing ones
});
```

### 2B.7 Coverage: Current Property Test Files

| File | Properties Tested |
|------|-------------------|
| `cost-calculation.property.test.ts` | Non-negativity, monotonicity, zero-identity, determinism |
| `input-sanitization.property.test.ts` | Safety invariant — no XSS output |
| `session-id-uniqueness.property.test.ts` | Uniqueness across generations |
| `schedule-cron-validation.property.test.ts` | Valid cron always produces valid next-run |
| `card-schema-validity.property.test.ts` | Card output always matches schema |
| `idempotent-actions.property.test.ts` | Duplicate action calls are safe |
| `non-blocking-resilience.property.test.ts` | Non-critical failures never crash |
| `notification-gating.property.test.ts` | Disabled notifications never send |
| `deep-link-format.property.test.ts` | Generated links always parse |
| `card-action-updates.property.test.ts` | Card updates produce valid state |
| `card-content-completeness.property.test.ts` | All required fields present |
| `unknown-action-safety.property.test.ts` | Unknown actions handled gracefully |

---

## 2C. Contract / Schema Testing

> **[NEW — v4.0]** Promoted to formal test level. Contract tests verify that test data factories remain in sync with actual API schemas.

### 2C.1 Purpose

Contract tests catch **drift** between:
- Mock response shapes used in Playwright tests ↔ actual API schema
- Factory outputs ↔ real GraphQL/REST/OpenAPI types
- Frontend expectations ↔ backend contract

Without contract tests, mocks can become stale — tests pass against mocks but the real API has changed. Contract tests are the safety net.

### 2C.2 Supported Schema Sources

| Source Type | File Pattern | Parser |
|-------------|-------------|--------|
| **GraphQL** | `*.graphql`, `schema.graphql` | `parsers/graphql-parser.ts` |
| **OpenAPI / Swagger** | `*.yaml`, `*.json` (OpenAPI 3.x) | `parsers/openapi-parser.ts` |
| **JSON Schema** | `*.schema.json` | `parsers/jsonschema-parser.ts` |

### 2C.3 How It Works

The `schema-validator.ts` utility:
1. Parses the schema source file to extract expected type fields
2. Calls the factory function to produce a test object
3. Validates: required fields present, no extra fields (strict mode), correct types
4. Reports missing, extra, or mistyped fields

```typescript
// tests/validation/factory-contracts.spec.ts
import { assertFactoryMatchesSchema, SchemaSource } from './schema-validator';
import { createSessionDetailResponse } from '../atc/fixtures/test-data';

const GRAPHQL_SCHEMA: SchemaSource = {
  type: 'graphql',
  path: '../src/appsync/schema.graphql',
};

test('Session factory matches GraphQL Session type', {
  tag: ['@validation', '@schema', '@regression'],
}, () => {
  assertFactoryMatchesSchema({
    schemaSource: GRAPHQL_SCHEMA,
    typeName: 'Session',
    factory: () => createSessionDetailResponse().data.session,
    allowExtraFields: false,
  });
});
```

### 2C.4 When Contract Tests Fail

| Failure | Meaning | Fix |
|---------|---------|-----|
| Missing required field | Schema added a new field | Add to factory + interface |
| Extra field not in schema | Schema removed a field | Remove from factory + interface |
| Wrong type (array vs object) | Schema type changed | Update factory shape |

### 2C.5 Contract Test Coverage

Every test data factory that produces a GraphQL response type MUST have a corresponding contract test. Current coverage:

| Type | Factory | Contract Test |
|------|---------|---------------|
| Session | `createSessionDetailResponse()` | Yes |
| UserSettings | `createSettingsResponse()` | Yes |
| SkillMetadata | `createSkill()` | Yes |
| BackgroundJob | `createJob()` | Yes |
| Document | `createDocument()` | Yes |
| ScheduledJob | `createScheduledJob()` | Yes |
| AgentResponseChunk | `createInvokeAgentResponse()` | Yes |
| Soul | `createSoulResponse()` | Yes |

### 2C.6 Adding Contract Tests for New Schema Sources

To validate REST/OpenAPI contracts:

```typescript
const OPENAPI_SPEC: SchemaSource = {
  type: 'openapi',
  path: '../docs/api/openapi.yaml',
  apiPath: '/api/v1/users',
  method: 'get',
  statusCode: '200',
};

test('User list factory matches OpenAPI response schema', () => {
  assertFactoryMatchesSchema({
    schemaSource: OPENAPI_SPEC,
    typeName: 'UserListResponse',
    factory: () => createUserListResponse(),
    allowExtraFields: false,
  });
});
```

---

## 2D. Load / Performance Testing

> **[NEW — v4.0]** Documented as reference implementation.

### 2D.1 Tool

| Tool | Version | Usage |
|------|---------|-------|
| k6 | Latest | Load testing via HTTP/GraphQL |

### 2D.2 Usage Example

The project includes a k6 load test at `tests/load/concurrent-requests.js`:

```bash
# Install k6: https://k6.io/docs/get-started/installation/
k6 run tests/load/concurrent-requests.js
```

**Environment variables required:**
- `APPSYNC_ENDPOINT` — GraphQL URL
- `COGNITO_TOKEN` — Valid JWT access token
- `SESSION_ID` — Existing session ID

### 2D.3 Test Scenario

The current load test sends 5 concurrent `InvokeAgent` mutations to verify:
- Frontend message queuing works correctly
- Backend handles concurrent requests without data loss
- Rate limiting kicks in at configured threshold

**Thresholds:**
- At least 80% of requests succeed (4/5)
- P95 response time under 5 seconds

### 2D.4 When to Run

| Trigger | Scenario |
|---------|----------|
| Pre-release | Verify no performance regressions |
| After scaling changes | Verify new limits hold |
| After infrastructure changes | Verify latency is acceptable |

---

## 3. Test Suite and Plan Hierarchy

### 3.1 Organizational Model

The test automation follows a strict hierarchy supporting both **Standard** (shared across all clients) and **Customer-specific** (unique to a state implementation) test artifacts:

```
Application (Carity)
 |
 +-- Standard Test Suites (shared across all customers)
 |    +-- Test Suite (module-level grouping)
 |         +-- Test Plan (smoke, regression, journey, 508)
 |              +-- User Journey Tests (UJTs)
 |              +-- Atomic Test Cases (ATCs)
 |
 +-- Customer-Specific Test Suites (per state implementation)
      +-- Customer (ME, MN, MO, TX, WI)
           +-- Test Suite (module or feature-level grouping)
                +-- Test Plan (smoke, regression, journey, 508)
                     +-- User Journey Tests (customer UJTs)
                     +-- Atomic Test Cases (customer ATCs — may reuse Standard + add custom)
```

| Level | What It Is | Standard Example | Customer Example |
|-------|-----------|-----------------|-----------------|
| **Application** | The system under test | Carity Standard | Carity ME (Maine) |
| **Test Suite** | All test plans for one module/feature | Person Module Suite | ME Person Module Suite |
| **Test Plan** | A purpose-driven collection of tests | Smoke Plan | ME Smoke Plan |
| **User Journey Test** | A full user journey (composed from ATCs) | UJT-PER-001 - Add a new person | UJT-ME-PER-001 - Add person with MaineCare ID |
| **Atomic Test Case** | A single behavior verification | ATC-PER-001 - First name validation | ATC-ME-PER-001 - MaineCare ID format validation |

### 3.2 Standard vs Customer-Specific Tests

| Aspect | Standard | Customer-Specific |
|--------|----------|-------------------|
| **Scope** | Core functionality shared by all states | State-specific fields, workflows, business rules |
| **Examples** | Add person, add address, add phone | Maine: MaineCare ID; Missouri: MO-specific intake |
| **Configs** | `chatConfig`, `settingsConfig` (Bender-OS) | `ME_chatConfig` (customer override) |
| **Profiles** | `std-f1`, `std-qc` | `me-qc`, `mn-qc`, `mo-qc`, `tx-qc`, `wi-qc` |
| **Tags** | `@person`, `@organization`, `@chat`, `@session` | `@me`, `@mn`, `@mo`, `@tx`, `@wi` |
| **Reuse** | ATC actions reused by all customers | Extends Standard actions + adds custom ones |

### 3.3 Customer Test Patterns

**Pattern 1: Extend Standard** — Run Standard tests + add customer-specific ATCs/UJTs

**Pattern 2: Override Standard** — Replace Standard behavior with customer-specific logic

**Pattern 3: Customer-Only** — Features that exist only for one customer

---

## 4. Standard Test Plan Types

Every test suite (Standard or customer-specific) SHOULD include these plans:

| Plan | Tag | Purpose | When to Run | Target Duration |
|------|-----|---------|-------------|-----------------|
| **Smoke** | `@smoke` | Critical path, fast validation | Every PR, every deploy | < 5 min |
| **Regression** | `@regression` | Full feature coverage (ATCs) | Nightly, before release | < 30 min |
| **Journey** | `@journey` | Complete user journeys (UJTs) | Nightly | < 60 min |
| **508 Compliance** | `@accessibility` | WCAG 2.1 AA / Section 508 accessibility | Weekly, before release | < 15 min |
| **Performance** | `@perf` | Response time and load validation | Weekly | varies |

### Plan Composition

| Plan | Contains |
|------|----------|
| **Smoke** | Critical ATCs + critical UJTs (happy path only) |
| **Regression** | All ATCs for the module |
| **Journey** | All UJTs for the module |
| **Accessibility** | Accessibility-focused ATCs (axe-core) |
| **Performance** | Performance-focused ATCs and load tests |

### Non-Functional Test Types

| Type | Tag | Purpose | Examples | When to Run |
|------|-----|---------|----------|-------------|
| **Security** | `@security` | Verify resistance to attack vectors | XSS input, auth bypass, CSRF | Weekly + pre-release |
| **Negative** | `@negative` | Graceful handling of invalid inputs | Malformed API responses, network timeouts, expired tokens | Nightly regression |
| **Boundary** | `@boundary` | Behavior at field and data limits | Max-length strings, min/max numeric, date boundaries | Nightly regression |
| **Error Recovery** | `@recovery` | Users can recover from system errors | Session timeout → re-login → resume | Weekly |
| **Load/Stress** | `@perf` | Response times and stability under load | Concurrent requests, rate limiting | Weekly + pre-release |

### Accessibility (508) Testing Methodology

#### What Is Automated vs Manual

| Check Type | Automated (ATCs) | Manual (Exploratory) |
|-----------|-------------------|---------------------|
| **Color contrast** | Yes — axe-core | Verify with actual users |
| **ARIA labels present** | Yes — Playwright a11y assertions | — |
| **Keyboard navigation** | Partially — tab order, focus | Full keyboard-only workflow |
| **Screen reader compatibility** | No — requires assistive tech | NVDA/JAWS per release |
| **Form label associations** | Yes — axe-core `for`/`id` | — |
| **Heading hierarchy** | Yes — DOM structure check | — |
| **Dynamic content announcements** | No | Manual with screen reader |

#### Actual Accessibility Implementation (Bender-OS)

```typescript
// tests/atc/fixtures/accessibility.fixture.ts provides:
// - makeAxeBuilder: factory for AxeBuilder (WCAG 2.1 AA)
// - assertAccessible: one-liner scan with HTML violation report attachment

import { test, expect } from '../fixtures/accessibility.fixture';

test('ATC-A11Y-CHT-001 - Chat view has no WCAG 2.1 AA violations', {
  tag: ['@chat', '@accessibility', '@regression', '@ATC-A11Y-CHT-001'],
}, async ({ chatView, assertAccessible }) => {
  await assertAccessible();
});

// Scoped scan:
test('ATC-A11Y-CHT-002 - Message input is accessible', {
  tag: ['@chat', '@accessibility', '@regression', '@ATC-A11Y-CHT-002'],
}, async ({ chatView, assertAccessible }) => {
  await assertAccessible({ include: 'message-input' });
});
```

---

## 5. Test Suite Registry and Metadata

### 5.1 Suite Registry (`suites.json`)

```json
{
  "application": "Carity",
  "version": "1.0.0",
  "suites": [
    {
      "id": "person-module",
      "name": "Person Module",
      "client": "Standard",
      "description": "Tests covering person record management",
      "plans": ["smoke", "regression", "journey", "accessibility"]
    },
    {
      "id": "me-person-module",
      "name": "ME Person Module",
      "client": "ME",
      "description": "Maine-specific person module tests",
      "extends": "person-module",
      "plans": ["smoke", "regression", "journey"]
    }
  ]
}
```

### 5.2 Per-Suite Metadata — Standard (`suite.json`)

```json
{
  "id": "person-module",
  "name": "Person Module",
  "client": "Standard",
  "description": "Tests covering person record CRUD, addresses, phones, emails, contacts",
  "owner": "QA Team",
  "plans": {
    "smoke": {
      "description": "Critical path validation for person module",
      "tags": "@person and @smoke and not @customer",
      "max_duration_minutes": 5,
      "run_on": ["pr", "deploy"]
    },
    "regression": {
      "description": "Full regression coverage — all ATCs",
      "tags": "@person and @regression and not @customer",
      "max_duration_minutes": 30,
      "run_on": ["nightly", "release"]
    }
  }
}
```

---

## 6. Test Profiles and Test Data Management

### 6.1 What Is a Profile?

A profile binds an **environment** (URL, browser, timeouts) + **credentials** + **test data configuration** together. Tests run against a specific profile, and the same test suite executes against multiple profiles without code changes.

> **Note (Bender-OS current state)**: Bender-OS currently uses a simplified approach with `.env` files and the `LIVE_MODE` toggle. The profile system described below is planned for adoption when multi-environment testing is required.

### 6.2 Available Profiles

| Profile ID | Environment | Client | Purpose |
|-----------|-------------|--------|---------|
| `std-qc` | QC | Standard | Quality Control testing |
| `std-f1` | Dev F1 | Standard | Development environment 1 |
| `std-staging` | Staging | Standard | Pre-production validation |
| `me-qc` | QC | Maine | Maine client QC |

### 6.3 Current Bender-OS Environment Configuration

```
tests/
  .env              # Local environment (not committed)
  .env.example      # Template with required variables
```

Required environment variables:
```
BASE_URL=http://localhost:5173
LIVE_MODE=true|false
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```

### 6.4 Profile File Structure (Future — `profiles/<id>.profile.json`)

```json
{
  "id": "std-f1",
  "name": "Standard F1 Development",
  "client": "Standard",
  "environment": "DevF1",
  "config": {
    "baseUrl": "https://std-f1.carity.example.com",
    "browser": "chromium",
    "headless": true,
    "viewport": { "width": 1920, "height": 1080 },
    "timeouts": {
      "default": 30000,
      "navigation": 60000,
      "action": 10000
    }
  },
  "credentials": {
    "username": "${STD_F1_USERNAME}",
    "password": "${STD_F1_PASSWORD}"
  },
  "testData": {
    "personDefaults": {
      "gender": "Male",
      "state": "Alabama"
    },
    "overrides": {}
  }
}
```

### 6.5 Environment Management

#### Shared Environment Contention

1. **Namespaced test data** — All automated test data uses `AutoTest_` prefix + unique timestamp.
2. **Parallel-safe design** — ATCs create their own data and clean up.
3. **Pipeline locking** (if needed) — For UJTs that modify shared state.
4. **Environment health checks** — Verify environment is responsive before test execution.

---

## 7. Tagging Strategy

Every test (ATC or UJT) MUST have these tags:

### Standard Test

```
@chat @regression @ATC-CHT-001
```

### Customer-Specific Test

```
@me @person @regression @customer @ATC-ME-PER-001
```

### Tag Hierarchy

| # | Tag Type | Required | Format | Examples |
|---|----------|----------|--------|----------|
| 1 | Customer (if applicable) | Yes (customer only) | `@<code>` | `@me`, `@mn`, `@mo`, `@tx`, `@wi` |
| 2 | Module | Yes | `@<module>` | `@chat`, `@session`, `@skills`, `@jobs`, `@person`, `@organization` |
| 3 | Plan | Yes | `@<plan>` | `@smoke`, `@regression`, `@journey`, `@accessibility` |
| 4 | Test ID | Yes | `@<ID>` | `@ATC-CHT-001`, `@UJT-CHT-001`, `@API-SES-001` |
| 5 | Customer marker | Yes (customer only) | `@customer` | `@customer` |
| 6 | Priority (optional) | No | `@<level>` | `@critical`, `@high`, `@medium`, `@low` |
| 7 | Category (optional) | No | `@<type>` | `@validation`, `@navigation`, `@crud`, `@schema` |
| 8 | Status (optional) | No | `@<status>` | `@wip`, `@skip`, `@flaky`, `@deprecated` |

---

## 8. Project Structure

### 8.1 Bender-OS — Actual Implementation

```
tests/
  playwright.config.ts                # Multi-project Playwright config
  auth.setup.ts                       # Live mode auth — saves storageState
  package.json                        # Playwright workspace dependencies
  .env                                # Environment config (not committed)
  .env.example                        # Template
  atc/                                # Atomic Test Cases
    fixtures/
      app.fixture.ts                  # Pre-configured views (chatView, settingsView, loginPage)
      mock-api.ts                     # MockApi class — unified GraphQL/Cognito/app-config mocking
      mock-page.fixture.ts            # Base fixture with mock infrastructure
      mock-auth.fixture.ts            # Auth-specific fixture
      mock-appsync.fixture.ts         # Legacy AppSync fixture (being replaced by MockApi)
      accessibility.fixture.ts        # axe-core integration (assertAccessible)
      view-config.ts                  # ViewConfig + ViewPage pattern
      selectors.ts                    # Centralized UI selectors
      test-data.ts                    # Deterministic test data factories
    configs/                          # ViewConfig definitions per view
    chat/
      actions/
        chat.actions.ts               # Reusable action functions for UJT composition
      chat-messaging.spec.ts          # Chat ATCs
      chat-accessibility.spec.ts      # Chat a11y ATCs
      chat-performance.spec.ts        # Chat perf ATCs
      chat-streaming.spec.ts          # Streaming behavior ATCs
    sessions/
      actions/
        sessions.actions.ts
      sessions.spec.ts
    skills/                           # Skills module ATCs
    jobs/                             # Background jobs ATCs
    settings/                         # Settings ATCs
    documents/                        # Documents ATCs
    auth/                             # Auth ATCs (login, logout, refresh)
    navigation/                       # Navigation ATCs
    connection/                       # Connection/offline ATCs
    state/                            # State management ATCs
    tasks/                            # Tasks ATCs
    scheduled-jobs/                   # Scheduled jobs ATCs
    file-upload/                      # File upload ATCs
    learning/                         # Learning/feedback ATCs
  ujt/                                # User Journey Tests
    fixtures/
      ujt.fixture.ts                  # UJT-specific fixture (wraps MockApi)
    chat/
      chat.journey.spec.ts
    sessions/
    skills/
    jobs/
    settings/
    documents/
    auth/
    file-upload/
    learning/
    scheduled-jobs/
  api/                                # API-level tests (GraphQL direct)
    fixtures/
      api.fixture.ts                  # Authenticated GraphQL client
      graphql-queries.ts              # Raw GraphQL query strings
    sessions.api.spec.ts
    skills.api.spec.ts
    settings.api.spec.ts
    documents.api.spec.ts
    jobs.api.spec.ts
    tasks.api.spec.ts
    chat.api.spec.ts
    config-files.api.spec.ts
    learning.api.spec.ts
    scheduled-jobs.api.spec.ts
    property-tests.api.spec.ts        # Property-based API tests
    *-negative.api.spec.ts            # Negative API tests
  validation/                         # Contract / Schema tests
    factory-contracts.spec.ts         # All factory ↔ schema validations
    schema-validator.ts               # Generic multi-format validator
    parsers/
      graphql-parser.ts
      openapi-parser.ts
      jsonschema-parser.ts
  load/                               # Load/performance tests
    concurrent-requests.js            # k6 concurrent requests test
  scripts/
    flakiness-reporter.ts             # Post-run flakiness analysis
  reports/                            # Generated reports (gitignored)
  results/                            # Test output (gitignored)
```

### 8.2 Unit Tests — Actual Implementation

```
src/
  lambdas/
    __tests__/
      unit/                           # 30+ unit test files
      properties/                     # 12 property-based test files
      integration/                    # 5 integration test files
      mocks/
        index.ts                      # Barrel export
        dynamodb.ts                   # DynamoDB mock factories
        secrets-manager.ts            # SecretsManager mock factories
      setup.test.ts
  appsync/
    __tests__/                        # AppSync resolver tests
  agent/
    __tests__/                        # Agent module tests
```

### 8.3 Carity Target Structure (Organizational Context)

```
tests/
  person/
    actions/
      person.actions.ts
      atc-per-002.action.ts
    add-person.spec.ts
    person-validation.spec.ts
    add-person.journey.spec.ts
  organization/
    actions/
      organization.actions.ts
    ...
  me/                                 # Maine customer-specific
    person/
      actions/
        me-person.actions.ts
      me-person.spec.ts
      me-person.journey.spec.ts
fixtures/
  auth.setup.ts
  auth.fixture.ts
  api.fixture.ts
  cleanup.fixture.ts
data/
  person-factory.ts
  me-person-factory.ts
utils/
  db-utils.ts
  data-utils.ts
profiles/
  profiles.json
  std-f1.profile.json
  me-qc.profile.json
```

---

## 9. CI/CD Execution Strategy

```
+--------------------------------------------------+
|  PR / Commit                                      |
|  1. Unit tests (Jest, parallel)      ~1 min      |
|  2. Contract tests (schema drift)    ~30 sec     |
|  3. ATCs (parallel, fast)            ~2 min      |
|  4. If ATCs pass -> Smoke UJTs       ~5 min      |
+--------------------------------------------------+
|  Nightly                                          |
|  1. Full unit + property tests       ~3 min      |
|  2. All ATCs (parallel)              ~5 min      |
|  3. All UJTs (sequential)            ~30 min     |
|  4. Contract validation              ~1 min      |
|  5. Cross-browser smoke              ~5 min      |
+--------------------------------------------------+
|  Pre-Release                                      |
|  1. Full unit suite + coverage       ~3 min      |
|  2. Full ATC suite                   ~5 min      |
|  3. Full UJT suite                   ~45 min     |
|  4. Accessibility                    ~10 min     |
|  5. Load tests                       ~5 min      |
+--------------------------------------------------+
```

### Execution Commands

```bash
# ─── Unit Tests ──────────────────────────────────────────
# All unit + property tests
npx jest

# With coverage
npx jest --coverage

# Specific module
npx jest --testPathPattern="background-job"

# Property tests only
npx jest --testPathPattern="properties/"

# ─── Playwright (Mock Mode — no backend) ─────────────────
# All ATCs
npx playwright test --config=tests/playwright.config.ts --project=atc-mock

# All UJTs
npx playwright test --config=tests/playwright.config.ts --project=ujt-mock

# Schema validation
npx playwright test --config=tests/playwright.config.ts --project=validation

# Accessibility (mobile viewport)
npx playwright test --config=tests/playwright.config.ts --project=mobile

# Cross-browser smoke (Firefox)
npx playwright test --config=tests/playwright.config.ts --project=firefox

# Cross-browser smoke (WebKit)
npx playwright test --config=tests/playwright.config.ts --project=webkit

# ─── Playwright (Live Mode — real backend) ────────────────
# ATCs against real backend
$env:LIVE_MODE="true"; npx playwright test --config=tests/playwright.config.ts --project=atc-live

# UJTs against real backend
$env:LIVE_MODE="true"; npx playwright test --config=tests/playwright.config.ts --project=ujt-live

# API tests (GraphQL direct)
$env:LIVE_MODE="true"; npx playwright test --config=tests/playwright.config.ts --project=api

# ─── Headful (visible browser) ───────────────────────────
npx playwright test --config=tests/playwright.config.ts --project=atc-mock --headed
npx playwright test --config=tests/playwright.config.ts --project=atc-mock --headed --slow-mo=500

# ─── Filtering ───────────────────────────────────────────
# By tag
npx playwright test --config=tests/playwright.config.ts --grep "@smoke"
npx playwright test --config=tests/playwright.config.ts --grep "@chat"

# By test ID
npx playwright test --config=tests/playwright.config.ts --grep "@ATC-CHT-001"

# ─── Load Tests ──────────────────────────────────────────
k6 run tests/load/concurrent-requests.js

# ─── Reports ─────────────────────────────────────────────
npx playwright show-report tests/reports/html
npm run report:flakiness
```

### Test Reporting & Visibility

#### Report Formats

| Format | Purpose | Audience |
|--------|---------|----------|
| **HTML Report** | Detailed test results with screenshots, traces, a11y reports | QA engineers (debugging) |
| **JUnit XML** | Machine-readable results for CI/CD integration | Azure DevOps pipeline |
| **JSON** | Programmatic access for dashboards, flakiness reporter | Metrics tooling |
| **Console (list)** | Real-time progress during local runs | Developer/QA running tests |
| **Coverage (lcov)** | Unit test code coverage | CI gates, SonarQube |

#### Playwright Report Configuration (Actual)

```typescript
reporter: [
  ['html', { open: 'never', outputFolder: 'reports/html', port: 9323 }],
  ['junit', { outputFile: 'reports/junit-results.xml' }],
  ['json', { outputFile: 'reports/results.json' }],
  ['list'],
],
```

---

## 10. Playwright Configuration (Actual)

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) { /* ... parse and set env vars ... */ }

const isLiveMode = process.env.LIVE_MODE === 'true';
const baseURL = process.env.BASE_URL || 'http://localhost:5173';
const authFile = path.resolve(__dirname, '.auth/storage-state.json');

export default defineConfig({
  outputDir: path.resolve(__dirname, 'results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : (isLiveMode ? 1 : 0),
  workers: isLiveMode ? 7 : (process.env.CI ? 4 : undefined),
  timeout: isLiveMode ? 60_000 : 30_000,

  reporter: [
    ['html', { open: 'never', outputFolder: path.resolve(__dirname, 'reports/html'), port: 9323 }],
    ['junit', { outputFile: path.resolve(__dirname, 'reports/junit-results.xml') }],
    ['json', { outputFile: path.resolve(__dirname, 'reports/results.json') }],
    ['list'],
  ],

  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    // Auth Setup (live mode only)
    ...(isLiveMode ? [{ name: 'auth-setup', testMatch: /auth\.setup\.ts/, use: { ...devices['Desktop Chrome'] } }] : []),

    // ATC Mock Mode (default)
    { name: 'atc-mock', testDir: './atc', testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.journey.spec.ts', '**/auth.setup.ts'], use: { ...devices['Desktop Chrome'] } },

    // ATC Live Mode (requires LIVE_MODE=true)
    ...(isLiveMode ? [{ name: 'atc-live', testDir: './atc', testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.journey.spec.ts', '**/auth.setup.ts'],
      dependencies: ['auth-setup'], use: { ...devices['Desktop Chrome'], storageState: authFile } }] : []),

    // UJT Mock Mode
    { name: 'ujt-mock', testDir: './ujt', testMatch: '**/*.journey.spec.ts',
      fullyParallel: false, timeout: 60_000, use: { ...devices['Desktop Chrome'] } },

    // UJT Live Mode
    ...(isLiveMode ? [{ name: 'ujt-live', testDir: './ujt', testMatch: '**/*.journey.spec.ts',
      fullyParallel: false, timeout: 180_000,
      dependencies: ['auth-setup'], use: { ...devices['Desktop Chrome'], storageState: authFile } }] : []),

    // API Tests (live mode only)
    ...(isLiveMode ? [{ name: 'api', testDir: './api', testMatch: '**/*.api.spec.ts',
      timeout: 30_000, dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], storageState: authFile } }] : []),

    // Mobile Viewport (accessibility)
    { name: 'mobile', testDir: './atc', testMatch: '**/*-accessibility.spec.ts',
      testIgnore: ['**/*.journey.spec.ts'], use: { ...devices['Pixel 5'] } },

    // Schema Validation (contract tests)
    { name: 'validation', testDir: './validation', testMatch: '**/*.spec.ts',
      timeout: 10_000, use: { ...devices['Desktop Chrome'] } },

    // Cross-Browser Smoke (Firefox)
    { name: 'firefox', testDir: './atc', testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.journey.spec.ts'], grep: /@smoke/, use: { ...devices['Desktop Firefox'] } },

    // Cross-Browser Smoke (WebKit)
    { name: 'webkit', testDir: './atc', testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.journey.spec.ts'], grep: /@smoke/, use: { ...devices['Desktop Safari'] } },
  ],

  // Auto-start Vite dev server
  webServer: {
    command: `node ${path.resolve(__dirname, '../node_modules/vite/bin/vite.js')}`,
    cwd: path.resolve(__dirname, '../src/chat'),
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

---

## 11. Quality Gates & Metrics

### Coverage Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test coverage (branches) | 65% | Jest --coverage |
| Unit test coverage (lines/functions) | 80% | Jest --coverage |
| ATC coverage | 100% of acceptance criteria | Every AC has at least one ATC |
| UJT coverage | 100% of critical user stories | Every critical story has a UJT |
| Contract test coverage | 100% of mock factories | Every factory has a schema validation |
| Module coverage | All modules have smoke + regression plans | Suite registry is complete |

### CI/CD Quality Gates

| Gate | Condition | Blocks |
|------|-----------|--------|
| PR merge | Unit tests pass + coverage thresholds met + ATCs pass (0 failures) | Merge to main/develop |
| Deploy to QC | Smoke ATCs + Smoke UJTs pass | Deployment promotion |
| Release candidate | Full regression + journey + contract suite pass | Release sign-off |
| Flakiness threshold | < 2% of tests flagged as flaky | Pipeline health |

### Execution Time SLAs

| Plan | Target Duration | Escalation If Exceeded |
|------|----------------|----------------------|
| Unit tests | < 3 minutes | Investigate immediately |
| Smoke (PR) | < 5 minutes | Investigate immediately — blocks PRs |
| Regression (nightly) | < 30 minutes | Review within 1 sprint |
| Journey (nightly) | < 60 minutes | Review within 1 sprint |
| Full suite (pre-release) | < 90 minutes | Optimize before next release |

### Health Metrics (Tracked Weekly)

| Metric | Definition | Target |
|--------|-----------|--------|
| Flakiness rate | % of tests that pass/fail non-deterministically over 7 days | < 2% |
| Defect escape rate | Bugs found in production without corresponding ATC | < 5% |
| Mean time to green | Average time from ATC failure to fix merged | < 24 hours |
| Coverage drift | New acceptance criteria without corresponding ATCs | 0 (tracked per sprint) |
| Test maintenance ratio | Hours maintaining tests vs writing new tests | < 20% maintenance |

---

## 12. Flaky Test Management

### What Is a Flaky Test?

A flaky test passes and fails non-deterministically on the same code. Flaky tests erode trust in the pipeline.

### Root Cause Categories

| Category | Cause | Fix Approach |
|----------|-------|-------------|
| **Timing** | Race conditions, animations, async operations | Use Playwright auto-waiting; explicit `waitFor` |
| **Test data** | Shared mutable state, stale data | Each test creates its own data |
| **Environment** | Network latency, server load | Increase timeouts for CI; mock externals |
| **Shared state** | Browser state leaking between tests | Isolated browser contexts |
| **Non-deterministic UI** | Random ordering, dynamic IDs | Stable selectors; wait for content |

### Detection & Tooling

The project includes `tests/scripts/flakiness-reporter.ts` which:
1. Reads `reports/results.json` after each run
2. Identifies flaky tests (passed on retry)
3. Appends to `reports/flakiness-history.json` (last 50 runs)
4. Prints trend analysis: most flaky tests, per-run count

```bash
npm run report:flakiness
```

### Quarantine Process

1. Test fails non-deterministically → Engineer confirms (repeat-each=10)
2. Add `@flaky` tag + create fix ticket (SLA: 5 business days)
3. `@flaky` tests move to separate CI job (non-blocking)
4. Fix implemented → remove `@flaky` tag → test returns to main pipeline
5. Maximum quarantine: 2 sprints. If not fixed, rewrite or delete.

### Retry Policy

| Context | Retries | Rationale |
|---------|---------|-----------|
| Local development | 0 | Immediate honest feedback |
| PR pipeline | 0 | Flaky tests should be quarantined |
| Nightly regression (CI) | 2 | Allows for transient environment issues |
| Live mode | 1 | Balance confidence vs environment noise |

---

## 13. Test Maintenance & Lifecycle

### When to Deprecate Tests

| Trigger | Action | Process |
|---------|--------|---------|
| Requirement removed | Deprecate corresponding ATCs/UJT steps | `@deprecated` tag → remove after 1 sprint |
| Feature decommissioned | Remove entire feature's test suite | Archive to `_archived/` for 1 sprint |
| ATC superseded by better test | Replace old ATC | Update coverage matrix |
| Test permanently flaky with no viable fix | Delete and document gap | Log in test health report |
| Technology migration | Rewrite affected ATCs | Old tests archived during transition |

### Handling Requirement Changes

1. Update or create ATC for the changed behavior
2. Verify UJT still passes (if ATC is composed into a UJT)
3. Update coverage matrix
4. Update tags if plan membership changes

### Review Cadence

| Review | Frequency | Focus |
|--------|-----------|-------|
| Test health review | Quarterly | Coverage gaps, flakiness trends, deprecated cleanup |
| Coverage audit | Per sprint | New criteria without ATCs (drift = 0 target) |
| Flakiness triage | Weekly | `@flaky` tag age, fix progress |
| Execution time review | Monthly | SLA compliance, slow test identification |
| Suite pruning | Bi-annually | Remove obsolete, consolidate overlapping |

---

## 14. Checklists

### New Atomic Test Case (ATC)

- [ ] ID assigned (`ATC-<MODULE>-<SEQ>`) and unique
- [ ] Tests exactly ONE behavior
- [ ] Independent of other test execution order
- [ ] Has its own setup (Arrange) and cleanup (teardown)
- [ ] Linked to requirement or acceptance criterion
- [ ] Exposes reusable action function in `actions/` folder
- [ ] Tagged: module + plan + ID + priority
- [ ] Can run in parallel without conflicts

### New User Journey Test (UJT)

- [ ] ID assigned (`UJT-<MODULE>-<SEQ>`) and unique
- [ ] Imports ATC action functions — no duplicated logic
- [ ] Each step references an ATC in the coverage matrix
- [ ] Includes API verification for data persistence (live mode)
- [ ] Test data is unique per run (timestamps/UUIDs)
- [ ] Cleanup handles both success and failure paths
- [ ] Tagged: module + `@journey` + ID + `@critical`

### New Unit Test

- [ ] Tests one function/method behavior per `it()` block
- [ ] Uses shared mock factories where available
- [ ] Does not depend on external services (fully mocked)
- [ ] Covers happy path + at least one error path
- [ ] Does not lower coverage below thresholds

### New Contract Test

- [ ] Corresponding factory exists in `test-data.ts`
- [ ] Schema source file path is correct
- [ ] `allowExtraFields: false` (strict mode)
- [ ] All required fields present in factory output
- [ ] Test added to `factory-contracts.spec.ts`

### Definition of Done — Test Coverage

A user story is considered "adequately tested" when:

- [ ] All acceptance criteria have corresponding ATCs (1+ ATC per criterion)
- [ ] Critical path has at least one UJT covering the happy-path journey
- [ ] Contract tests updated if new API types introduced
- [ ] Unit tests cover new business logic (coverage thresholds met)
- [ ] Tests pass in both mock and live modes (where applicable)
- [ ] No flaky tests introduced (run `--repeat-each=5` to confirm stability)
- [ ] All tests tagged per tagging strategy

---

## 15. Related Documents

### Guides

| Document | Location | Description |
|----------|----------|-------------|
| [QA Guide — Quality Assurance with Playwright](../guides/QA%20Guide%20-%20Quality%20Assurance%20with%20Playwright.md) | `docs/guides/` | Comprehensive guide for QA engineers |
| [BA Guide — Writing EARS Requirements](../guides/BA%20Guide%20-%20Writing%20EARS%20Requirements%20for%20Kiro%20Specs.md) | `docs/guides/` | How BAs write requirements that feed into the test pipeline |
| [FRD Standard](../guides/FRD%20Standard%20-%20Functional%20Requirements%20Document%20Standard.md) | `docs/guides/` | Standard format for functional requirements documents |
| [Glossary](../glossary.md) | `docs/glossary.md` | Definitions for key terms |

### Templates

| Template | Location | Description |
|----------|----------|-------------|
| [Atomic Test Case (ATC)](../../templates/atomic-testcase-template.md) | `templates/` | Template for writing ATCs |
| [User Journey Test (UJT)](../../templates/user-journey-testcase-template.md) | `templates/` | Template for composing UJTs |
| [Generic Test Case](../../templates/generic-testcase-template.md) | `templates/` | Industry-standard test case format |

---

## 16. Authentication and Security

### 16.1 UI Authentication — storageState Pattern (Actual Implementation)

```typescript
// tests/auth.setup.ts — runs once before all live-mode tests
import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/.auth/storage-state.json';

setup('authenticate', async ({ page }) => {
  setup.setTimeout(60_000);
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  if (!email || !password) {
    throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set');
  }

  await page.goto('/login');
  await page.locator('login-view input[type="email"]').fill(email);
  await page.locator('login-view input[type="password"]').fill(password);
  await page.locator('login-view button[type="submit"]').click();
  await expect(page.locator('chat-view')).toBeVisible({ timeout: 20_000 });
  await page.context().storageState({ path: authFile });
});
```

### 16.2 Mock Mode Authentication

In mock mode, auth is handled by token injection — no real login:

```typescript
// Inside app.fixture.ts authenticatedPage fixture:
await page.addInitScript((tokens) => {
  sessionStorage.setItem('bender_refresh_token', tokens.refreshToken);
}, MOCK_TOKENS);
mockApi.mockSuccessfulLogin();
```

### 16.3 API Authentication — GraphQL Client

API tests use Playwright's `APIRequestContext` with the saved storageState session:

```typescript
// tests/api/fixtures/api.fixture.ts
export const test = base.extend<{ gql: GraphQLClient }>({
  gql: async ({ request }, use) => {
    let endpoint = `${baseURL}/graphql`;
    if (isLiveMode) {
      const configResp = await request.get(`${baseURL}/app-config.json`);
      const config = await configResp.json();
      endpoint = config.appsyncEndpoint || endpoint;
    }
    const client: GraphQLClient = {
      async query(op, query, vars) { return request.post(endpoint, { data: { query, variables: vars, operationName: op } }); },
      async mutate(op, mutation, vars) { return request.post(endpoint, { data: { query: mutation, variables: vars, operationName: op } }); },
    };
    await use(client);
  },
});
```

### 16.4 Secrets Management

| Tier | Where | What Goes Here |
|------|-------|----------------|
| **Local development** | `tests/.env` (not committed) | Developer credentials |
| **CI/CD pipeline** | ADO pipeline variables (secret) | QC/Staging credentials, API keys |
| **Production secrets** | Azure Key Vault / AWS Secrets Manager | Production credentials |

---

## 17. Database and API Validation

### 17.1 Database Connectivity (Carity Context)

UJTs requiring cross-layer DB verification use the `mssql` npm package:

```typescript
// utils/db-utils.ts
import sql from 'mssql';

export const dbUtils = {
  getRecord: async (table: string, id: string) => {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input('id', sql.NVarChar, id)
      .query(`SELECT * FROM ${table} WHERE Id = @id`);
    await pool.close();
    return result.recordset[0];
  },
};
```

### 17.2 API Validation (Bender-OS — Actual Implementation)

Bender-OS UJTs and API tests verify via GraphQL:

```typescript
// API-level assertion in live mode
const result = await gql.query(OPERATIONS.GetSession, GET_SESSION, { sessionId });
expect(result.errors).toBeUndefined();
expect(result.data.session.id).toBe(sessionId);
expect(result.data.session.messages).toBeInstanceOf(Array);
```

### 17.3 Cross-Layer UJT Pattern

```typescript
test('UJT-PER-001 - Add person and verify API persistence', {
  tag: ['@person', '@journey', '@UJT-PER-001']
}, async ({ page, request }) => {
  const data = generatePersonData();

  // UI actions (composed from ATC action functions)
  await fillFirstName(personPage, data.firstName);
  await createPersonRecord(personPage);

  // API layer verification
  const apiResponse = await request.get(`/api/persons/${personId}`);
  expect(apiResponse.status()).toBe(200);

  // Database layer verification (Carity)
  const dbRecord = await dbUtils.getRecord('Person', personId);
  expect(dbRecord.FirstName).toBe(data.firstName);
});
```

---

## 18. Katalon to Playwright Migration Reference

### 18.1 Component Mapping

| Katalon Construct | Playwright Equivalent | Location |
|---|---|---|
| `Object Repository/` (`.rs` files) | Centralized selectors (`SELECTORS` object) | `tests/atc/fixtures/selectors.ts` |
| `Keywords/Utils_Keywords.groovy` | `utils/data-utils.ts` | `utils/data-utils.ts` |
| `Keywords/WebApp_Keywords.groovy` | ViewConfig + Action functions | `tests/atc/fixtures/view-config.ts` + `actions/` |
| `Keywords/Carity_Keywords.groovy` | ATC action functions | `tests/atc/<module>/actions/` |
| `Keywords/API_Keywords.groovy` | API fixture + GraphQL client | `tests/api/fixtures/api.fixture.ts` |
| `Profiles/*.glbl` | `.env` + `LIVE_MODE` toggle (profiles planned) | `tests/.env` |
| `Test Listeners/AccessTokenAndCookieHeaderListener.groovy` | `auth.setup.ts` + MockApi Cognito routes | `tests/auth.setup.ts` |
| `Data Files/*.xlsx` | TypeScript factory functions | `tests/atc/fixtures/test-data.ts` |
| `Drivers/axe-selenium-*.jar` | `@axe-core/playwright` | `accessibility.fixture.ts` |

### 18.2 Migration Priority Order

| Priority | Module / Component | Reason |
|---|---|---|
| P1 | Auth setup | Blocks all other tests |
| P1 | MockApi infrastructure | Required for all mock-mode tests |
| P1 | Chat module (Bender-OS) / Person module (Carity) | Highest TC count |
| P2 | Sessions, Skills, Jobs modules | High TC count |
| P3 | Documents, Settings | Lower complexity |

---

## 19. Test Data Management

### 19.1 Test Data Decision Guide

| Situation | Approach | Where It Lives |
|-----------|----------|----------------|
| Values that must be unique per run | Generate in factory with timestamp/UUID | `test-data.ts` / `data/{module}-factory.ts` |
| Environment-specific values | Profile override or `.env` | `profiles/` or `.env` |
| Simple one-off value for a single test | Inline in the test | Directly in `test()` block |
| Complex preconditions requiring multiple API calls | Named fixture function | `fixtures/{module}.fixture.ts` |
| Mock API response shapes | Deterministic factories with `Partial<T>` overrides | `tests/atc/fixtures/test-data.ts` |

### 19.2 Factory Pattern (Bender-OS — Actual Implementation)

```typescript
// tests/atc/fixtures/test-data.ts
export function createSessionListResponse(sessions?: Partial<Session>[]) {
  const defaults: Session[] = [{
    id: 'session-1',
    messages: [{ role: 'user', content: 'Hello', timestamp: '2026-06-01T10:00:00Z' }],
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:01:00Z',
  }];
  const items = sessions
    ? sessions.map((s, i) => ({ ...defaults[0], id: `session-${i + 1}`, ...s }))
    : defaults;
  return { data: { sessions: { sessions: items, nextToken: null } } };
}
```

**Key pattern**: All factories accept `Partial<T>` overrides, produce the full GraphQL response shape (`{ data: { ... } }`), and return deterministic values.

### 19.3 PHI / HIPAA Safety Rules (Carity Context)

- Never use real patient data in factories, fixtures, or spec files
- Never assert directly on PHI field values — assert presence or use seeded synthetic value
- Never log raw API response bodies — strip PHI fields

---

## 20. Complex Prerequisites — Chained API Seeding

### 20.1 The Solution — Named Fixture Functions

```typescript
// fixtures/pcp.fixture.ts
export async function seedPersonReadyForPCP(
  request: APIRequestContext,
  overrides: Partial<PCPSeedOptions> = {}
) {
  const personRes = await request.post('/api/persons', { data: { ... } });
  const person = await personRes.json();
  await request.post(`/api/persons/${person.id}/locations`, { ... });
  await request.post(`/api/persons/${person.id}/staff`, { ... });
  return { personId: person.id };
}
```

### 20.2 Rules for Fixture Functions

- Name after what it produces: `seedPersonReadyForPCP`, `seedActiveEnrollment`
- Accept an `overrides` parameter for test-specific variation
- Throw descriptive errors if guard conditions fail
- Return only the IDs the test needs
- Clean up in `afterEach`

---

## 21. Navigation

### 21.1 The Core Rule

Every test navigates fresh — there is no assumed starting point. Navigation is the **last step of Arrange**, after all API seeding/mock registration.

### 21.2 ViewConfig Navigation (Bender-OS Pattern)

```typescript
// tests/atc/fixtures/view-config.ts
export interface ViewConfig {
  route: string;                              // URL path
  readySelector: string;                      // Element indicating view loaded
  defaultMocks: Record<string, () => unknown>; // Mocks needed to render
  panels?: Record<string, string>;            // Named panel selectors
  navigationSteps?: (page: Page) => Promise<void>; // Multi-step nav
}

// Usage:
const chatConfig: ViewConfig = {
  route: '/',
  readySelector: SELECTORS.chatView,
  defaultMocks: {
    ListSessions: () => createSessionListResponse(),
    GetSession: () => createSessionDetailResponse(),
    GetSettings: () => createSettingsResponse(),
  },
};
```

### 21.3 Navigation Decision Guide

| Situation | Approach |
|-----------|----------|
| View has a direct URL | `ViewConfig.route` or `page.goto()` |
| View requires 2+ UI steps | `ViewConfig.navigationSteps` |
| Navigation is reused by UJTs | Export as action function |
| Navigation IS the behavior being tested | Keep in the Act step |

---

## 22. Azure Test Plan Integration — UJT Tagging and Mapping Strategy

> **Status: PLANNED** — This integration is designed but not yet implemented in Bender-OS.

### 22.1 Key Decisions

| Decision | Rationale |
|----------|-----------|
| Only UJTs sync to Azure Test Plans | ATCs are fast, numerous — pushing every ATC into TFS creates noise |
| ATCs report to CI/CD pipeline only | ATC results go to JUnit XML and HTML report |
| No numeric ADO IDs in Playwright test tags | Numeric IDs are fragile and meaningless to humans |
| ADO IDs live in one mapping file only | `test-plan-mapping.json` is single source of truth |

### 22.2 Mapping File Structure

```json
{
  "UJT-PCP-001": 711124,
  "UJT-PER-001": 711200,
  "UJT-CHT-001": 711300
}
```

### 22.3 Reporter Configuration (When Implemented)

```typescript
['@alex_neo/playwright-azure-reporter', {
  orgUrl: process.env.ADO_ORG_URL,
  projectName: process.env.ADO_PROJECT,
  planId: parseInt(process.env.ADO_TEST_PLAN_ID!),
  token: process.env.ADO_PAT_TOKEN,
  publishTestResultsMode: 'testRun',
  testPointMapper: async (testCase, testPoints) => {
    const ujtTag = testCase.tags?.find(t => t.startsWith('@UJT-'));
    if (!ujtTag) return [];
    const ujtId = ujtTag.replace('@', '');
    const adoId = mapping[ujtId];
    if (!adoId) return [];
    return testPoints.filter(tp => tp.testCase.id === adoId);
  },
}]
```

### 22.4 Open Items

| Item | Owner | Status |
|------|-------|--------|
| Dedicated service account provisioning | Utsav / DevOps | Pending |
| TFS → Playwright connectivity | Utsav | Under investigation |
| PHI masking from test evidence | QA Team | Backlog |
| Enhancement story auto-update test plans | Team | In design |

---

## 23. Requirement ID Coverage Tagging

### 23.1 Requirement ID Naming Convention

```
REQ-{MODULE}-{SEQ}
```

Examples: `REQ-PER-001`, `REQ-CHT-001`, `REQ-SKL-001`

### 23.2 Tag Structure with Requirement IDs

```typescript
// ATC — one primary requirement
test('ATC-CHT-003 - User message displayed after send', {
  tag: ['@chat', '@regression', '@ATC-CHT-003', '@REQ-CHT-002']
}, ...)

// UJT — may cover multiple requirements
test('UJT-CHT-001 - Full chat interaction lifecycle', {
  tag: ['@chat', '@journey', '@UJT-CHT-001', '@REQ-CHT-001', '@REQ-CHT-002']
}, ...)
```

---

## 24. Unified Test Case Mapper (`test-plan-mapping.json`)

### 24.1 File Structure

```json
{
  "version": "2.0",
  "module": "chat",
  "lastSync": null,
  "requirements": {
    "REQ-CHT-001": {
      "title": "User can send messages and receive agent responses",
      "status": "active",
      "adoStoryId": "823001",
      "tests": {
        "ATC-CHT-001": { "type": "ATC", "title": "Chat view displays with message input", "adoId": null, "action": "none" },
        "UJT-CHT-001": { "type": "UJT", "title": "Full chat interaction lifecycle", "adoId": null, "action": "create" }
      }
    }
  }
}
```

### 24.2 Action Field Values

| `action` | Meaning | Script behavior |
|----------|---------|-----------------|
| `"create"` | New UJT — no ADO Test Case exists | Creates TC in ADO, writes back `adoId` |
| `"update"` | UJT title or steps changed | Updates TC in ADO |
| `"delete"` | UJT removed | Sets TC state to "Closed" |
| `"none"` | Stable — no action needed | Skips |

---

## 25. Metrics Strategy

### 25.1 Metric 1 — Regression Automation Coverage

```
Regression Automation Coverage = (Automated UJTs / Total Regression TCs) x 100
```

### 25.2 Metric 2 — Code Coverage

```
Code Coverage = (Lines covered by unit tests / Total lines) x 100
```

**Targets**: 65% branches, 80% lines/functions (enforced by Jest config)

### 25.3 Metric 3 — RTM (Requirements Traceability Matrix)

Generated from `test-plan-mapping.json`:
- Every requirement traces to at least one test (coverage completeness)
- Every test traces back to a requirement (no orphan tests)

**RTM red flags:**
- `covered: false` → requirement has no tests — gap
- `adoLinked: false` on a UJT → sync missing
- Test ID with no requirement → orphan test

---

## 26. ATC / Test Plan Workflow Alignment

### 26.1 New Requirement Flow

```
New ReqID → QA creates ATC + UJT + tags @REQ-{ID}
  → Add entry to test-plan-mapping.json (action: "create")
  → QA runs manage-ado-test-cases.ts → creates ADO Test Case
  → Pipeline syncs results → Test Plan updated
```

### 26.2 Enhancement Flow

```
Enhancement ReqID → QA fetches existing Test Plan entry
  → Maps existing ATCs/UJTs to the requirement
  → Updates affected ATCs, adds new ones
  → Sets action: "update" in mapper for changed UJTs
  → Runs manage-ado-test-cases.ts → updates ADO Test Cases
```

### 26.3 Key Constraints

- UJT titles must never change after ADO Test Case creation
- One test, one home — each test ID in exactly one requirement block
- ATCs never sync to ADO — CI/CD only
- `adoSteps` in mapper are source of truth for ADO Test Case steps

---

## 27. Backlog Items (Carried Forward)

| Item | Owner | Status | Notes |
|------|-------|--------|-------|
| Dedicated service account for ADO integration | Utsav / DevOps | Pending | Required before pipeline sync |
| Dedicated DELETE endpoint for person records | Dev team | Backlog | Needed for UJT cleanup (Carity) |
| PHI masking from test evidence before ADO gates | QA Team | Backlog | |
| Enhancement story auto-update test plans | Team | In design | Covered by `action: "update"` |
| Code coverage integration with unit test pipeline | Dev + QA | Done | Jest --coverage with Istanbul |
| RTM dashboard in ADO | QA Team | Backlog | `reports/rtm.json` artefact ready |
| Profile system implementation for Bender-OS | QA Team | Backlog | Currently using .env approach |

---

## 28. Common Library — Shared Patterns and Utilities

> **[NEW — v4.0]** Documents the reusable test infrastructure that should be treated as a shared library.

### 28.1 MockApi Class (`tests/atc/fixtures/mock-api.ts`)

The **single source of truth** for all mock infrastructure. Both ATC and UJT fixtures delegate to this class.

#### Features

| Feature | Method | Description |
|---------|--------|-------------|
| Default setup | `setupDefaults()` | Registers app-config + Cognito + GraphQL routes |
| Operation mock | `mockOperation(name, response)` | Mock a specific GraphQL operation |
| Delayed response | `mockOperationWithDelay(name, response, ms)` | Test loading states |
| GraphQL error | `mockOperationError(name, message)` | Test error handling |
| HTTP error | `mockOperationHttpError(name, status)` | Test 400/401/403/404/500 |
| Network timeout | `simulateNetworkTimeout(name)` | Test timeout behavior |
| Structured errors | `simulateBadRequest()`, `simulateUnauthorized()`, `simulateForbidden()`, `simulateNotFound()`, `simulateServerError()` | Named error helpers |
| Request verification | `getInterceptedRequests()` | Assert specific operations were called |
| Operation waiter | `waitForOperation(name)` | Wait for an operation to be called |
| Auth simulation | `mockSuccessfulLogin()`, `mockFailedLogin()`, `mockNewPasswordChallenge()`, `mockSuccessfulRefresh()`, `mockFailedRefresh()` | Cognito behavior control |

#### Operation Constants

```typescript
import { OPERATIONS } from '../fixtures/mock-api';

// Prevents typos, enables autocomplete
mockApi.mockOperation(OPERATIONS.ListSessions, createSessionListResponse());
mockApi.mockOperation(OPERATIONS.InvokeAgent, createInvokeAgentResponse());
```

Available operations: `ListSessions`, `GetSession`, `CreateSession`, `DeleteSession`, `ShareSession`, `SearchUsers`, `InvokeAgent`, `GetSettings`, `UpdateSettings`, `GetSoul`, `UpdateSoul`, `ResetSoul`, `ListConfigFiles`, `GetDownloadUrl`, `SaveConfigFile`, `ListSkills`, `UploadSkill`, `EnableSkill`, `DisableSkill`, `DeleteSkill`, `ListPendingSkills`, `ListAllSkills`, `ApproveSkill`, `RejectSkill`, `ListDepartments`, `ListTasks`, `CreateTask`, `UpdateTask`, `DeleteTask`, `ListBackgroundJobs`, `CancelBackgroundJob`, `ListScheduledJobs`, `CreateScheduledJob`, `DeleteScheduledJob`, `ToggleScheduledJob`, `UpdateScheduledJob`, `ListDocuments`, `GenerateDocumentUploadUrl`, `DeleteDocument`, `UpdateDocument`, `GenerateUploadUrl`, `RateResponse`, `SubmitCorrection`

### 28.2 ViewConfig + ViewPage Pattern (`tests/atc/fixtures/view-config.ts`)

Replaces traditional Page Object classes with a **config-driven** approach:

```typescript
// Define a view's config once:
export const chatConfig: ViewConfig = {
  route: '/',
  readySelector: SELECTORS.chatView,
  defaultMocks: {
    ListSessions: () => createSessionListResponse(),
    GetSession: () => createSessionDetailResponse(),
    GetSettings: () => createSettingsResponse(),
  },
  panels: { sidebar: '.sidebar', input: SELECTORS.messageInput },
};

// ViewPage handles mock registration + navigation + ready-wait automatically
const view = new ViewPage(page, chatConfig, mockApi);
await view.goto(); // registers mocks → navigates → waits for readySelector
```

**Advantages over Page Objects:**
- No class inheritance chains
- Mocks are co-located with the view definition
- Adding a new view = adding a config object (no new class file)
- `ViewPage.panel(name)` provides named region access

### 28.3 Centralized Selectors (`tests/atc/fixtures/selectors.ts`)

All element selectors in one file — refactoring-safe:

```typescript
export const SELECTORS = {
  chatView: 'chat-view',
  loginView: 'login-view',
  settingsView: 'settings-view',
  messageInput: 'message-input',
  messageList: 'chat-message-list',
  typingIndicator: 'typing-indicator',
  sessionList: 'session-list',
  // ... 50+ selectors
} as const;
```

If a component is renamed, update here and all tests follow.

### 28.4 Action Functions Pattern (`tests/atc/<module>/actions/`)

Reusable functions that perform a single atomic behavior — the building blocks for UJTs:

```typescript
// tests/atc/chat/actions/chat.actions.ts
export async function sendMessage(page: Page, message: string): Promise<void> {
  const messageInput = page.locator(SELECTORS.messageInput);
  const textarea = messageInput.locator(SELECTORS.messageTextarea).first();
  await textarea.fill(message);
  const sendButton = messageInput.locator(SELECTORS.sendButton);
  if (await sendButton.first().isVisible()) {
    await sendButton.first().click();
  } else {
    await textarea.press('Enter');
  }
}

export async function verifyUserMessageDisplayed(page: Page, text: string): Promise<void> {
  const messageList = page.locator(SELECTORS.messageList);
  await expect(messageList.locator(`text=${text}`).last()).toBeVisible({ timeout: 10_000 });
}
```

**Composition in UJTs:**
```typescript
// tests/ujt/chat/chat.journey.spec.ts
import { sendMessage, verifyChatViewDisplayed, verifyMessageInputCleared } from '../../atc/chat/actions/chat.actions';
import { logout } from '../../atc/auth/actions/auth.actions';

test('UJT-CHT-001: Full chat interaction lifecycle', async ({ authenticatedPage }) => {
  await verifyChatViewDisplayed(authenticatedPage);
  await sendMessage(authenticatedPage, 'Hello');
  await verifyMessageInputCleared(authenticatedPage);
  await logout(authenticatedPage);
});
```

### 28.5 Test Data Factories (`tests/atc/fixtures/test-data.ts`)

Centralized, typed factories for all GraphQL response shapes:

| Factory | Produces |
|---------|----------|
| `createSessionListResponse(sessions?)` | ListSessions response |
| `createSessionDetailResponse(opts?)` | GetSession response |
| `createInvokeAgentResponse(opts?)` | InvokeAgent response |
| `createSettingsResponse(opts?)` | GetSettings response |
| `createSkillsListResponse(skills?)` | ListSkills response |
| `createJobsListResponse(jobs?)` | ListBackgroundJobs response |
| `createDeleteSessionResponse()` | DeleteSession response |
| `createCreateSessionResponse()` | CreateSession response |
| `createSoulResponse(opts?)` | GetSoul response |
| `createSkill(overrides?)` | Single skill object |
| `createJob(overrides?)` | Single job object |
| `createDocument(overrides?)` | Single document object |
| `createScheduledJob(overrides?)` | Single scheduled job object |

**Pattern:** All accept `Partial<T>` overrides, return full response envelope `{ data: { ... } }`.

### 28.6 Schema Validator (`tests/validation/schema-validator.ts`)

Multi-format contract validator supporting GraphQL, OpenAPI, and JSON Schema:

```typescript
assertFactoryMatchesSchema({
  schemaSource: { type: 'graphql', path: '../src/appsync/schema.graphql' },
  typeName: 'Session',
  factory: () => createSessionDetailResponse().data.session,
  allowExtraFields: false,
  ignoreFields: ['usage'],
});
```

### 28.7 Unit Test Mock Factories (`src/lambdas/__tests__/mocks/`)

Reusable factories for AWS SDK mocking:

```typescript
import { createMockDynamoDBClient, createMockSecretsManager, DEFAULT_TEST_CONFIG } from '../__tests__/mocks';

// DynamoDB mock with configurable behavior
const { mockSend } = createMockDynamoDBClient({ taskExists: true });

// Secrets Manager mock
const { mockSend: smSend } = createMockSecretsManager(DEFAULT_TEST_CONFIG);

// Failing variants for error path testing
const { mockSend: failSend } = createFailingMockDynamoDBClient(new Error('Connection timeout'));
```

### 28.8 Accessibility Fixture (`tests/atc/fixtures/accessibility.fixture.ts`)

One-liner accessibility assertions with rich HTML failure reports:

```typescript
// Simple: full-page scan
await assertAccessible();

// Scoped: specific region
await assertAccessible({ include: 'message-input' });

// Custom tags
await assertAccessible({ tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] });
```

On failure, attaches an HTML report to the Playwright report with:
- Violation severity, ID, description
- WCAG tags and help links
- Affected elements with fix suggestions

### 28.9 Flakiness Reporter (`tests/scripts/flakiness-reporter.ts`)

Post-run analysis tool:
- Reads `reports/results.json`
- Identifies flaky tests (passed on retry)
- Maintains `reports/flakiness-history.json` (last 50 runs)
- Prints: current run summary, most flaky tests across history, trend line

```bash
npm run report:flakiness
```

---

## 29. Operational Playbook — How to Operate This Test System

> **[NEW — v4.0]** Practical guide for day-to-day test system operations.

### 29.1 Running Tests Locally

#### Prerequisites

```bash
# Install dependencies (from repo root)
npm install

# Install Playwright browsers
npx playwright install --with-deps chromium

# Copy env template (tests/ directory)
cp tests/.env.example tests/.env
# Edit tests/.env with your credentials (for live mode)
```

#### Quick Reference

| Task | Command |
|------|---------|
| Run all unit tests | `npx jest` |
| Run unit tests with coverage | `npx jest --coverage` |
| Run all ATCs (mock mode) | `npx playwright test --config=tests/playwright.config.ts --project=atc-mock` |
| Run all UJTs (mock mode) | `npx playwright test --config=tests/playwright.config.ts --project=ujt-mock` |
| Run contract tests | `npx playwright test --config=tests/playwright.config.ts --project=validation` |
| Run with visible browser | Append `--headed` |
| Run with slow motion | Append `--headed --slow-mo=500` |
| Debug with inspector | Append `--debug` |
| Open last HTML report | `npx playwright show-report tests/reports/html` |
| Check flakiness | `npm run report:flakiness` (from tests/) |

#### Live Mode (requires running backend)

```powershell
$env:LIVE_MODE="true"; npx playwright test --config=tests/playwright.config.ts --project=atc-live
$env:LIVE_MODE="true"; npx playwright test --config=tests/playwright.config.ts --project=ujt-live
$env:LIVE_MODE="true"; npx playwright test --config=tests/playwright.config.ts --project=api
```

### 29.2 Adding a New ATC

1. Create spec file: `tests/atc/<module>/<feature>.spec.ts`
2. Create action function: `tests/atc/<module>/actions/<module>.actions.ts`
3. Add tags: `['@<module>', '@regression', '@ATC-<MODULE>-<SEQ>']`
4. Register mocks via `mockApi.mockOperation()` in the test
5. Run in isolation: `npx playwright test --grep "@ATC-<MODULE>-<SEQ>"`
6. Verify stability: `npx playwright test --grep "@ATC-<MODULE>-<SEQ>" --repeat-each=5`

### 29.3 Adding a New UJT

1. Create spec file: `tests/ujt/<module>/<feature>.journey.spec.ts`
2. Import action functions from ATC modules
3. Use `test.describe.serial()` for sequential execution
4. Add tags: `['@<module>', '@journey', '@UJT-<MODULE>-<SEQ>', '@critical']`
5. Add cross-layer verification (API/DB) for live mode
6. Test in both mock and live modes

### 29.4 Adding a New Mock Operation

1. Add the operation name to `OPERATIONS` const in `mock-api.ts`
2. Create a factory function in `test-data.ts` returning the response shape
3. Add a contract test in `tests/validation/factory-contracts.spec.ts`
4. Use in tests: `mockApi.mockOperation(OPERATIONS.NewOperation, createNewResponse())`

### 29.5 Adding a New Module

1. Create directory: `tests/atc/<module>/` and `tests/atc/<module>/actions/`
2. Create action barrel: `tests/atc/<module>/actions/<module>.actions.ts`
3. Create spec files following naming convention
4. Create UJT directory: `tests/ujt/<module>/`
5. Add factory functions to `test-data.ts` for new response types
6. Add contract tests for new types
7. Add ViewConfig if module has a dedicated view

### 29.6 Debugging a Failing Test

1. **Run in headed mode**: `--headed --slow-mo=1000`
2. **Run with debug inspector**: `--debug`
3. **Check the trace**: `npx playwright show-trace tests/results/<test>/trace.zip`
4. **Check screenshots**: `tests/results/<test>/` (captured on failure)
5. **Check video**: `tests/results/<test>/video.webm` (retained on failure)
6. **Verify mocks**: Use `mockApi.getInterceptedRequests()` to check what was called
7. **Check flakiness**: Run `--repeat-each=10` to confirm determinism

### 29.7 Dual-Mode Testing (Mock vs Live)

All fixtures support dual-mode. In mock mode, `MockApi` intercepts routes. In live mode, mocks are no-ops and real requests flow through.

**How it works in fixtures:**

```typescript
// MockApi methods are no-ops in live mode:
mockOperation(name, response) {
  if (isLiveMode) return; // ← no-op
  this.mocks.set(name, response);
}
```

**Conditional test logic:**

```typescript
test('ATC-CHT-003', async ({ authenticatedPage, mockApi }) => {
  // Setup differs by mode
  mockApi.mockOperation(OPERATIONS.InvokeAgent, response); // no-op in live

  // Act is the same
  await sendMessage(authenticatedPage, 'Hello');

  // Assert may differ
  if (process.env.LIVE_MODE === 'true') {
    // Live: wait for real agent response
    await expect(typingIndicator).toBeHidden({ timeout: 60_000 });
  } else {
    // Mock: verify mock was called
    const requests = mockApi.getInterceptedRequests();
    expect(requests.find(r => r.operationName === 'InvokeAgent')).toBeDefined();
  }
});
```

### 29.8 CI/CD Pipeline Operations

#### GitHub Actions (Current — PR Tests)

```yaml
# .github/workflows/pr-tests.yml
- Run unit tests (Jest)
- Run ATCs (mock mode, parallel)
- Run contract tests (validation project)
- Run cross-browser smoke (Firefox, WebKit)
```

#### Nightly (Scheduled)

```yaml
# .github/workflows/nightly-live-tests.yml
- Run full unit suite with coverage
- Run all ATCs (mock mode)
- Run all UJTs (mock mode)
- Run API tests (live mode)
- Generate flakiness report
```

### 29.9 Troubleshooting Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Project "act-live" not found` | Wrong project name or `LIVE_MODE` not set | Use `atc-live` and set `$env:LIVE_MODE="true"` |
| Auth setup fails | Missing env vars | Check `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` in `.env` |
| Mock mode test times out | `readySelector` never visible | Check mock is registered for the operation the UI needs to render |
| Contract test fails | Schema changed | Update the factory in `test-data.ts` to match new schema |
| Flaky test in CI | Timing race | Add explicit `waitFor` or increase timeout; if persistent, quarantine with `@flaky` |
| `SELECTORS.xyz` not found | Component renamed | Update `selectors.ts` (single point of change) |

---

## 30. Candidates for Common Library Extraction

> **[NEW — v4.0]** Patterns that are repeated across modules and should be formalized into a shared library package.

### 30.1 Patterns Already Shared (in `tests/atc/fixtures/`)

| Utility | File | Consumers |
|---------|------|-----------|
| MockApi class | `mock-api.ts` | All ATC specs, UJT fixture |
| ViewConfig + ViewPage | `view-config.ts` | All view-based tests |
| Selectors registry | `selectors.ts` | All Playwright tests |
| Test data factories | `test-data.ts` | All specs + contract tests |
| Accessibility fixture | `accessibility.fixture.ts` | All `*-accessibility.spec.ts` |
| App fixture (pre-configured views) | `app.fixture.ts` | Most ATC specs |

### 30.2 Patterns to Extract into Shared Library

| Pattern | Current Location | Proposed Library Module | Benefit |
|---------|-----------------|----------------------|---------|
| GraphQL operation constants | `mock-api.ts` OPERATIONS | `@bender-os/test-lib/operations` | Shared between ATC, UJT, API tests |
| Factory base patterns (Partial override, response envelope) | `test-data.ts` | `@bender-os/test-lib/factories` | Type-safe factory builder |
| Schema validation engine | `validation/schema-validator.ts` | `@bender-os/test-lib/contracts` | Reusable across multiple repos |
| Flakiness reporter | `scripts/flakiness-reporter.ts` | `@bender-os/test-lib/reporters` | Reusable tooling |
| Unit test mock factories (DynamoDB, SecretsManager) | `src/lambdas/__tests__/mocks/` | `@bender-os/test-lib/aws-mocks` | Consistent mocking across all lambdas |
| Dual-mode test helper (isLiveMode, NOOP patterns) | Scattered across fixtures | `@bender-os/test-lib/dual-mode` | Single implementation of the pattern |

### 30.3 Proposed Library Structure

```
packages/
  test-lib/
    src/
      operations.ts        # GraphQL operation name constants
      factories/
        base.ts            # createFactory<T>() helper
        session.ts         # Session factories
        settings.ts        # Settings factories
        ...
      contracts/
        schema-validator.ts
        parsers/
      aws-mocks/
        dynamodb.ts
        secrets-manager.ts
        s3.ts
      dual-mode/
        index.ts           # isLiveMode, noopInterceptor, etc.
      reporters/
        flakiness.ts
    package.json
    tsconfig.json
```

### 30.4 Migration Plan (When Ready)

1. Extract into `packages/test-lib/` workspace package
2. Add to root `package.json` workspaces
3. Update imports in all test files: `from '@bender-os/test-lib/...'`
4. Publish as internal package if multi-repo usage needed

---

## 31. Summary of Changes from v3.0 to v4.0

| Section | Change Type | Description |
|---------|-------------|-------------|
| Compliance Report | NEW | Gap analysis between strategy doc and actual implementation |
| Section 1.1 | NEW | QA Engineer role definition (developer-analyst hybrid) |
| Section 2A | NEW | Unit Test Strategy (Jest, coverage thresholds, mocking patterns) |
| Section 2B | NEW | Property-Based Testing (fast-check, invariants, 12 property files) |
| Section 2C | NEW | Contract / Schema Testing (promoted to formal level) |
| Section 2D | NEW | Load Testing (k6 reference implementation) |
| Section 2.4 | UPDATED | Full test levels table including all new levels |
| Section 4 | UPDATED | `@accessibility` tag replaces `@508` for consistency |
| Section 8 | REWRITTEN | Actual Bender-OS project structure (ViewConfig, not Page Objects) |
| Section 9 | UPDATED | CI/CD includes unit tests, contract tests, load tests |
| Section 10 | REWRITTEN | Actual playwright.config.ts with all projects |
| Section 11 | UPDATED | Coverage targets include unit test thresholds |
| Section 12 | UPDATED | Documents actual flakiness-reporter.ts tooling |
| Section 15 | UPDATED | Reporter list corrected (removed non-existent pdf/summary/code_coverage) |
| Section 28 | NEW | Common Library — all shared patterns documented |
| Section 29 | NEW | Operational Playbook — how to run/debug/maintain |
| Section 30 | NEW | Candidates for library extraction |

---
