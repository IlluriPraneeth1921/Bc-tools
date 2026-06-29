# WI DHS Medicaid Provider File — Data Pipeline Testing Project

## Project Purpose

Build a **test verification system** that validates the existing data pipeline correctly processes the WI MMIS Medicaid Provider File Extract and maps data accurately through all stages to the Blue Compass (Carity) database.

**We are NOT building the data migration/processing pipeline.** Another team owns that. Our job is to:
1. Feed known test data into the pipeline
2. Verify the data lands correctly at each stage
3. Report mismatches between expected and actual results
4. Provide a repeatable, easy-to-operate process that replaces today's manual STTM verification

---

## Problem Statement

Currently, verifying source-to-target-table-mappings (STTM) is manual and takes too long. The existing process involves hand-checking whether data from the provider file was correctly transformed and loaded into the Carity database. This project automates that verification.

---

## Testing Approach

### Strategy: Loop Testing → Speed → Automation

1. **Loop Testing** — Run a set of test files covering key scenarios, verify results, review mismatches, cleanup, repeat
2. **Speed Improvement** — Optimize so a full test cycle (generate → verify → cleanup) runs in minutes, not hours
3. **Automation** — Eventually one command: `run_full_test_suite` that processes all files, verifies all stages, reports results, and cleans up

### Key Principle: Source-to-Destination Traceability

Every source file line must be traceable to its final resting place across all 4 stages. If a QA person asks "what happened to line 47 of the provider file?", the system should answer:
- ✅ Line 47 → MedicaidProviderRaw row (content matches)
- ✅ MedicaidProviderRaw → MedicaidProviderAddress row (fields correctly parsed)
- ❌ MedicaidProviderAddress → IncomingLocationAddresses (ZIP code not formatted correctly: expected "53703-1234", actual "537031234")
- ⬜ IncomingLocationAddresses → LocationAddresses (not checked — Stage 3 failed)

### Handling Lookups/Translations

The stored procedures perform vocabulary lookups during Stage 2→3 transformation using the `[InterfaceModule].[VocabularyLookupDisplayNames]` table. Our system:
1. Reads the SAME vocabulary tables the pipeline uses (source of truth)
2. Computes the expected result of each lookup
3. Compares against what actually landed in Stage 3 (Incoming tables)
4. If mismatch: report whether the issue is a bad lookup value, missing vocabulary entry, or stored procedure logic error

---

## Key Assumptions & Constraints

| Assumption | Detail |
|------------|--------|
| Pipeline has 4 stages | Raw → Parsed → Incoming/Mapped → Final Carity |
| Two databases, one server | Interface DB (`WiDHS.Qc.Interface.Carity.ToolTesting`) has Stages 1–3; Carity DB (`WiDHS.Qc.Carity.ToolTestig`) has Stage 4 |
| All tables are appended | Rows accumulate across file loads (not truncated); must filter by MCD ID marker |
| Vocabulary lives in the DB | `[InterfaceModule].[VocabularyLookupDisplayNames]` is the source of truth for all lookups |
| Stored procedures handle all transformation | Name formatting, ZIP, lookups, status logic — all in T-SQL |
| We have read access to both databases | Can query at any time to compare expected vs actual |
| We have write access to Verification DB | For expected state and mismatch report storage |
| We have write access to pipeline DBs for cleanup | Can delete test data via stored procedures |
| Test data uses reserved MCD ID prefix | `000000000xxxxx` range guarantees no collision with real data |
| Cleanup stored procs respect FK order | Delete child rows before parent rows |
| QA staff are non-technical | They interact ONLY through the web UI — no CLI, SQL, or AWS console |
| QA triggers pipeline processing separately | Our app only verifies results — it does NOT trigger the pipeline |
| Web app runs on ECS Fargate | Serverless container, accessible via browser through ALB |

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `design.md` | System design with confirmed 4-stage pipeline, actual table names, architecture decisions |
| `Medicaid Provider File Extract Layout 01.12.26.pdf` | Source file specification |
| `FG 2_WI DHS MES CMM_ICD-D06_Medicaid Provider File_v2.0 Unsubmitted Updates.xlsx` | Source-to-target mapping, business rules |
| `TEST_SCENARIOS_README.md` | Test file documentation |
| `DESIGN_PROPOSAL_MULTI_FILE.md` | Future plugin architecture for 20+ interfaces |
| `TASK_LIST.md` | Prerequisites, tasks, estimates, constraints |
| `QUESTIONS.md` | Answered questions (project decisions captured) |

---

## Test Lifecycle (QA Person's Perspective)

```
┌──────────────────────┐    ┌─────────────────────────────────────────────────────────────┐
│  Existing Pipeline   │    │              Our QA Test Application                        │
│  Application         │    │                                                             │
├──────────────────────┤    ├─────────────────────────────────────────────────────────────┤
│                      │    │                                                             │
│  1. QA triggers      │    │  2. uploads/selects   3. clicks        4. clicks            │
│     file processing  │    │     same .psv file     "Generate          "Compare"         │
│     (not our app)    │    │                        Expected State"                      │
│                      │    │       │                    │                 │              │
│  ┌────────────────┐  │    │       ▼                    ▼                 ▼              │
│  │ Pipeline runs  │  │    │  ┌──────────┐       ┌──────────┐       ┌──────────┐         │
│  │ (job engine +  │  │    │  │ Parse &  │       │ Compute  │       │ Query    │         │
│  │  stored procs) │  │    │  │ Show     │       │ expected │       │ actual   │         │
│  │                │  │    │  │ summary  │       │ state at │       │ DBs and  │         │
│  │ File → Raw →   │  │    │  │          │       │ all 4    │       │ compare  │         │
│  │ Parsed →       │  │    │  │ 3 provs  │       │ stages   │       │ field by │         │
│  │ Incoming →     │  │    │  │ 49 recs  │       │          │       │ field    │         │
│  │ Carity         │  │    │  └──────────┘       └──────────┘       └─────┬────┘         │
│  └────────────────┘  │    │                                              │              │
│                      │    │                                              ▼              │
│                      │    │                                        ┌──────────────┐     │
│                      │    │  5. QA reviews mismatch report         │ Mismatch     │     │
│                      │    │     (pass/fail per stage, drill-down)  │ Report       │     │
│                      │    │                                        │ Screen       │     │
│                      │    │  6. QA clicks "Cleanup" when done      └──────────────┘     │
│                      │    │     (removes test data from all DBs)                        │
│                      │    │                                                             │
└──────────────────────┘    └─────────────────────────────────────────────────────────────┘
```

### Lifecycle Steps

1. **GENERATE** — Upload test .psv file to S3 (known data with known expected outcomes) - Target Tool #2 
2. **PROCESS** — The existing pipeline (job engine + stored procs) picks up and processes the file through all 4 stages. *We do not control this step. The process is a Blackbox.*
3. **VERIFY** — Our system queries all 4 stages across 2 databases, compares actual state to expected state, records results
4. **REPORT** — Mismatch results stored in report DB table. QA reviews.
5. **CLEANUP** — Once QA confirms results (pass or bug logged), execute cleanup stored procedures to remove ALL test data from all stages, returning them to pristine state

---

## Data Isolation Strategy

**Critical requirement:** Our test data must NEVER intermingle with other people's data and testing.

### Approach: Reserved MCD ID Range + Test Run Tagging

| Mechanism | Detail |
|-----------|--------|
| **Reserved MCD IDs** | All test providers use MCD IDs from a dedicated range that real providers will never have (e.g., `000000000000001` through `000000000099999` or a prefix-based scheme) |
| **Test Run ID** | Every test execution gets a unique `TestRunId` (GUID or timestamp-based). All data inserted during that run is tagged with it. |
| **File Naming** | Test files use the `_T` environment suffix and/or a distinct naming pattern to avoid confusion with production files |
| **Cleanup Scope** | Cleanup stored procedures delete ONLY rows matching our reserved MCD IDs / TestRunId — never touches other data |

### Isolation Guarantees

- ✅ Our test MCD IDs never collide with real provider IDs or other testers' IDs
- ✅ Cleanup removes ONLY our data — verified by MCD ID range + TestRunId
- ✅ After cleanup, databases are in the same state as before our test ran
- ✅ Multiple test runs can coexist (different TestRunIds) if needed
- ✅ No FK constraint violations during cleanup (delete in correct dependency order)

### Cleanup Stored Procedure Design

```
-- Master cleanup: wipes all 4 stages across both databases for a given test run
EXEC sp_cleanup_full_test_run @TestRunId = '...', @McdIdRangeStart = '...', @McdIdRangeEnd = '...'

-- This calls in order (reverse stage order):
--   1. sp_cleanup_stage4_carity       (Carity DB: delete from child tables first, then parent — FK order)
--   2. sp_cleanup_stage3_incoming     (Interface DB: delete from Incoming* tables)
--   3. sp_cleanup_stage2_parsed       (Interface DB: delete from MedicaidProvider* tables)
--   4. sp_cleanup_stage1_raw          (Interface DB: delete from MedicaidProviderRaw)
--   5. sp_cleanup_mismatch_report     (optionally archive or delete verification results)
```

**Carity Cleanup Order** (child → parent to respect FK constraints):
1. LocationExtensionWaiverServices
2. LocationPointOfContactAssociatedPrograms
3. LocationServiceAreaCountyAreas / LocationTypeSubtypes
4. LocationAddresses / LocationPhones / LocationEmailAddresses
5. LocationIdentifiers / LocationCredentials / LocationSpecialty
6. LocationPointOfContact / LocationType / LocationTaxonomies
7. LocationSupportedPrograms / LocationExtension
8. PaymentSuspension / MedicaidEnrollment
9. OrganizationPointOfContactAssociatedPrograms
10. OrganizationAddresses / OrganizationPhones / OrganizationEmailAddresses
11. OrganizationIdentifiers / OrganizationCredentials
12. OrganizationBusinessTypes / OrganizationOrganizationTypes
13. OrganizationPointOfContact / OrganizationSupportedPrograms
14. Location (finally)
15. Organization (last)

---

## System Under Test — Detailed Processing Architecture

The pipeline under test is driven by a **job engine + stored procedures**. It operates in **4 distinct stages** across 2 databases:

- **Database 1:** `WiDHS.Qc.Interface.Carity.ToolTesting` (Stages 1–3)
- **Database 2:** `WiDHS.Qc.Carity.ToolTestig` (Stage 4)

```
┌──────────────┐  Job Engine   ┌─────────────────────┐  Stored Procs   ┌─────────────────────┐  Stored Procs  ┌─────────────────────┐  Stored Procs  ┌─────────────────────┐
│  Source File │ ────────────> │      STAGE 1        │ ──────────────> │      STAGE 2        │ ─────────────> │      STAGE 3        │ ─────────────> │      STAGE 4        │
│  (.psv)      │  (download +  │      Raw            │  (parse into    │      Parsed         │  (transform +  │      Incoming       │  (load to      │      Final          │
│              │   bulk load)  │                     │   typed tables) │                     │  map + lookup) │                     │   Carity)      │                     │
│              │               │  MedicaidProvider   │                 │  MedicaidProvider   │                │  Incoming           │                │  Organization       │
│              │               │  Raw                │                 │  Main               │                │  Organization       │                │  Location           │
│              │               │                     │                 │  Address            │                │  Location           │                │  LocationAddresses  │
│              │               │  (1 row per line)   │                 │  Tin                │                │  LocationAddresses  │                │  OrganizationAddr   │
│              │               │                     │                 │  Contract           │                │  ...                │                │  ...                │
│              │               │                     │                 │  Npi                │                │  (26+ tables)       │                │  (30+ tables)       │
│              │               │                     │                 │  ... (14 tables)    │                │                     │                │                     │
└──────────────┘               └─────────────────────┘                 └─────────────────────┘                └─────────────────────┘                └─────────────────────┘
                                [CustomerInterfaceModule]              [CustomerInterfaceModule]              [InterfaceModule]                     [OrganizationModule]
                                                                                                            [CustomerInterfaceModule]*            [CustomerOrganizationModule]
                                ─────── DB: WiDHS.Qc.Interface.Carity.ToolTesting ──────────────────────────────────────────────────              DB: WiDHS.Qc.Carity.ToolTestig
```

*\* IncomingLocationExtension and IncomingLocationExtensionWaiverServices are in CustomerInterfaceModule*

### Stage 1: Source File → MedicaidProviderRaw
| Aspect | Detail |
|--------|--------|
| **Database** | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| **Table** | `[CustomerInterfaceModule].[MedicaidProviderRaw]` |
| **Mechanism** | Job engine downloads .psv file from S3, bulk-loads |
| **Mapping** | 1 line in source file = 1 row (raw text stored as-is) |
| **Data model** | Appended (rows accumulate across file loads) |
| **What to verify** | Every source line has a corresponding row; content identical |

### Stage 2: MedicaidProviderRaw → Parsed Record-Type Tables
| Aspect | Detail |
|--------|--------|
| **Database** | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| **Schema** | `[CustomerInterfaceModule]` |
| **Mechanism** | Stored procedures parse raw rows, split into typed tables |
| **Data model** | Appended |
| **What to verify** | Pipe-delimited fields correctly split into columns; correct table assignment |

**Parsed tables:**

| Table | Record Type |
|-------|-------------|
| `MedicaidProviderMain` | 01 |
| `MedicaidProviderAddress` | 02 |
| `MedicaidProviderTin` | 03 |
| `MedicaidProviderContract` | 04 |
| `MedicaidProviderTypeAndSpecialty` | 05 |
| `MedicaidProviderNpi` | 06 |
| `MedicaidProviderTaxonomy` | 07 |
| `MedicaidProviderAcaPaymentHold` | 08 |
| `MedicaidProviderWaiverProgram` | 10 |
| `MedicaidProviderWaiverService` | 11 |
| `MedicaidProviderCountyAndTribeServed` | 12 |
| `MedicaidProviderLicense` | 13 |
| `MedicaidProviderCertificationAndCredentials` | 14 |
| `MedicaidProviderContact` | 02 (derived) |

### Stage 3: Parsed → Incoming/Mapped Tables
| Aspect | Detail |
|--------|--------|
| **Database** | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| **Schema** | `[InterfaceModule]` (+ some in `[CustomerInterfaceModule]`) |
| **Mechanism** | Stored procedures transform, apply vocabulary lookups, apply business rules |
| **Data model** | Appended |
| **What to verify** | Transformations correct (name, ZIP, address types); lookups resolved; business rules applied; dual-write to Org + Location Incoming tables |

**Key Incoming tables:** `IncomingOrganization`, `IncomingLocation`, `IncomingOrganizationAddresses`, `IncomingLocationAddresses`, `IncomingOrganizationIdentifiers`, `IncomingLocationIdentifiers`, `IncomingLocationSpecialty`, `IncomingLocationType`, `IncomingLocationTaxonomies`, `IncomingPaymentSuspension`, `IncomingMedicaidEnrollment`, and 15+ more.

### Stage 4: Incoming → Final Carity DB
| Aspect | Detail |
|--------|--------|
| **Database** | `WiDHS.Qc.Carity.ToolTestig` |
| **Schemas** | `[OrganizationModule]`, `[CustomerOrganizationModule]` |
| **Mechanism** | Stored procedures load from Incoming tables to final target tables |
| **Data model** | Appended |
| **What to verify** | All Incoming data transferred to final tables; GUIDs linked correctly across parent/child; no data loss |

**Key final tables:** `Organization`, `Location`, `LocationAddresses`, `OrganizationAddresses`, `LocationIdentifiers`, `OrganizationIdentifiers`, `LocationCredentials`, `LocationSpecialty`, `LocationTaxonomies`, `LocationType`, `LocationTypeSubtypes`, `PaymentSuspension`, `MedicaidEnrollment`, `LocationExtension`, `LocationExtensionWaiverServices`, and 15+ more.

### Data Flow Summary
| Stage | Source | Destination | Mechanism | Row Relationship |
|-------|--------|-------------|-----------|-----------------|
| 1 | .psv file line | MedicaidProviderRaw row | Job engine (bulk load) | 1:1 |
| 2 | MedicaidProviderRaw row | Record-type table row | Stored procedures (parse) | 1:1 |
| 3 | Record-type table rows | Incoming table rows | Stored procedures (transform + lookup) | 1:Many (one source row → multiple Incoming tables) |
| 4 | Incoming table rows | Final Carity table rows | Stored procedures (load) | 1:1 per table |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Language | Python |
| Cloud | AWS |
| Web Framework | Streamlit (simple, Python-native, no frontend code needed) |
| Hosting | AWS ECS Fargate (serverless container) |
| Source File Access | Upload via web UI or select from S3 |
| Database Server | SQL Server RDS (`mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com`) |
| Interface DB | `WiDHS.Qc.Interface.Carity.ToolTesting` (Stages 1–3) |
| Carity DB | `WiDHS.Qc.Carity.ToolTestig` (Stage 4) |
| Expected State Storage | SQL Server (TestVerification schema) |
| Cleanup Mechanism | Stored procedures (T-SQL) |
| Vocabulary Source | `[InterfaceModule].[VocabularyLookup]` + `[InterfaceModule].[VocabularyLookupDisplayNames]` (DB tables) |
| Data Isolation | Reserved MCD ID prefix (`000000000xxxxx`) |
| Authentication | Windows Integrated (Trusted_Connection) |

---

## What We're Building

### A Web Application for QA Staff

A simple web application that non-technical QA staff use to verify the data pipeline processed a file correctly. QA does NOT need to write SQL, use CLI tools, or understand AWS.

### QA Workflow (Step by Step)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        QA Person's Workflow                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STEP 1: QA goes to the existing pipeline application                   │
│           → Triggers processing of a test .psv file                     │
│           → Waits for pipeline to finish (existing app shows status)    │
│                                                                         │
│  STEP 2: QA navigates to OUR web application                            │
│           → Sees a simple dashboard                                     │
│                                                                         │
│  STEP 3: QA uploads or selects the SAME .psv file                       │
│           → Clicks "Load File"                                          │
│           → App parses file, shows summary (X providers, Y records)     │
│                                                                         │
│  STEP 4: QA clicks "Generate Expected State"                            │
│           → App computes what the databases SHOULD contain              │
│           → Shows progress bar while generating                         │
│                                                                         │
│  STEP 5: QA clicks "Compare / Run Verification"                         │
│           → App queries all 4 stages across 2 databases                 │
│           → Compares expected vs actual at each stage                   │
│           → Shows results in real-time                                  │
│                                                                         │
│  STEP 6: QA reviews the Mismatch Report                                 │
│           → Summary: "Stage 1: 50/50 PASS, Stage 2: 48/50 PASS,         │
│                       Stage 3: 145/148 PASS, Stage 4: ALL PASS          │
│                       — 5 mismatches found"                             │
│           → Drill-down: click a mismatch to see                         │
│             Source Line → Expected Value → Actual Value → Rule          │
│                                                                         │
│  STEP 7 (optional): QA clicks "Cleanup"                                 │
│           → Removes all test data from all 4 stages across both DBs     │
│           → Pristine state restored                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Web Application Screens

**Screen 1: Dashboard / Home**
- List of previous test runs (date, file, status, pass/fail counts)
- Button: "New Test Run"

**Screen 2: Load File**
- File upload widget (drag & drop .psv file)
- OR select from previously uploaded files
- Shows parse summary after loading: provider count, record count, record types found
- Button: "Generate Expected State"

**Screen 3: Expected State Generated**
- Shows what was computed (provider count, tables that will have expected data)
- Button: "Run Comparison"

**Screen 4: Mismatch Report**
- Summary bar: total checks, passes, failures per stage
- Filterable table of mismatches:
  - Source Line # | Provider MCD ID | Stage | Table | Column | Expected | Actual | Rule
- Color coding: green = pass, red = fail, yellow = skipped
- Export to CSV button
- Drill-down: click a provider to see all their checks

**Screen 5: Cleanup**
- Shows which test runs have data in the databases
- Button: "Cleanup Test Run [X]" → removes that run's data
- Confirmation dialog before executing

### Why Streamlit?

| Reason | Detail |
|--------|--------|
| No frontend code | Pure Python — same language as our backend |
| Fast to build | UI built in hours, not weeks |
| QA-friendly | Clean, simple interface out of the box |
| Interactive | Built-in widgets (file upload, buttons, tables, progress bars) |
| Deployable | Runs as a container on ECS Fargate — no server management |
| Data-native | Excellent for displaying tables, charts, and comparison results |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                              AWS                                    │
│                                                                     │
│  ┌───────────────┐        ┌──────────────────────────────────────┐  │
│  │  QA's Browser │───────>│  ALB (Application Load Balancer)     │  │
│  │               │  HTTPS │                                      │  │
│  └───────────────┘        └──────────────┬───────────────────────┘  │
│                                          │                          │
│                                          ▼                          │
│                            ┌──────────────────────────┐             │
│                            │  ECS Fargate             │             │
│                            │  (Streamlit container)   │             │
│                            │                          │             │
│                            │  • File parser           │             │
│                            │  • Expected state engine │             │
│                            │  • DB comparator         │             │
│                            │  • Mismatch reporter     │             │
│                            │  • Cleanup trigger       │             │
│                            └─────────┬────────────────┘             │
│                                      │                              │
│                    ┌─────────────────┼─────────────────┐            │
│                    ▼                 ▼                 ▼            │
│          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│          │Raw Staging DB│  │  Staged DB   │  │  Carity DB   │       │
│          │  (RDS)       │  │  (RDS)       │  │  (RDS)       │       │
│          └──────────────┘  └──────────────┘  └──────────────┘       │
│                                      │                              │
│                                      ▼                              │
│                            ┌──────────────────────────┐             │
│                            │  Verification DB (RDS)   │             │
│                            │  • Expected state tables │             │
│                            │  • Mismatch report table │             │
│                            │  • Test run history      │             │
│                            └──────────────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### NOT Building
- The data processing pipeline (owned by another team)
- File retrieval from SFTP (existing job engine)
- Pipeline orchestration/scheduling
- Retry logic for the pipeline itself

---

## Architecture (Our Test Verification System)

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                         Test Verification System (Python / AWS)                           │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌──────────────┐    ┌───────────────────────────────────────────────────────────────┐    │
│  │  Test Files  │    │              Expected State Engine                            │    │
│  │  (.psv in S3)│───>│                                                               │    │
│  └──────────────┘    │  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐ │    │
│                      │  │ Stage 1     │  │ Stage 2          │  │ Stage 3           │ │    │
│  ┌───────────┐       │  │ Expected:   │  │ Expected:        │  │ Expected:         │ │    │
│  │ Vocabulary│──────>│  │ Raw rows    │  │ Parsed record-   │  │ Transformed data  │ │    │
│  │ JSON Files│       │  │ (1:1 lines) │  │ type table rows  │  │ in Carity tables  │ │    │
│  └───────────┘       │  └──────┬──────┘  └────────┬─────────┘  └────────┬──────────┘ │    │
│                      └─────────┼──────────────────┼─────────────────────┼────────────┘    │
│                                │                  │                     │                 │
│                                ▼                  ▼                     ▼                 │
│                       ┌──────────────────────────────────────────────────────────────┐    │
│                       │                    Row-Level Comparator                      │    │
│                       │   For each source line:                                      │    │
│                       │     Compare Expected[Stage1] vs Actual[Raw Staging DB]       │    │
│                       │     Compare Expected[Stage2] vs Actual[Staged DB]            │    │
│                       │     Compare Expected[Stage3] vs Actual[Carity DB]            │    │
│                       └────────────────────────────────┬─────────────────────────────┘    │
│                                                        │                                  │
│            ┌───────────────────────────────────────────┼──────────────────────────┐       │
│            ▼                                           ▼                          ▼       │
│  ┌──────────────────┐              ┌───────────────────────────┐     ┌──────────────────┐ │
│  │  Raw Staging DB  │              │  Staged/Mapped DB         │     │    Carity DB     │ │
│  │  (actual state)  │              │  (actual state)           │     │  (actual state)  │ │
│  │                  │              │  RecordType01 table       │     │  Organization    │ │
│  │  Row per line    │              │  RecordType02 table       │     │  Location        │ │
│  │                  │              │  RecordType03 table       │     │  Addresses       │ │
│  │                  │              │  ...                      │     │  Identifiers     │ │
│  │                  │              │  RecordType14 table       │     │  Credentials     │ │
│  │                  │              │                           │     │  ...             │ │
│  └──────────────────┘              └────────────────────────── ┘     └──────────────────┘ │
│                                                        │                                  │
│                                                        ▼                                  │
│                                        ┌───────────────────────────┐                      │
│                                        │   Mismatch Report DB      │                      │
│                                        │   ─────────────────────   │                      │
│                                        │   • Source File Line #    │                      │
│                                        │   • Stage (1/2/3)         │                      │
│                                        │   • Provider MCD ID       │                      │
│                                        │   • Target Table          │                      │
│                                        │   • Target Column         │                      │
│                                        │   • Expected Value        │                      │
│                                        │   • Actual Value          │                      │
│                                        │   • Business Rule         │                      │
│                                        │   • Lookup Used           │                      │
│                                        │   • Status (PASS/FAIL)    │                      │
│                                        └─────────────┬─────────────┘                      │
│                                                      │                                    │
│                                                      ▼                                    │
│                                        ┌──────────────────────────┐                       │
│                                        │   QA Queries Mismatch    │                       │
│                                        │   Report Table Directly  │                       │
│                                        └──────────────────────────┘                       │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Expected State Generation

### Overview

The Expected State is the "answer key" — what each database stage SHOULD contain after the pipeline processes a given test file. Our Python application generates this by applying the same parsing, transformation, and business rules defined in the ICD-D06 specification to the source file.

### Where Expected State Is Stored

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Expected State Database                            │
│         (Separate DB or schema — TestVerification)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ExpectedState_Stage1 (Expected Raw Staging)                │    │
│  │  ─────────────────────────────────────────────              │    │
│  │  TestRunId | LineNumber | ExpectedRawText                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ExpectedState_Stage2_RecType01 (Expected Staged - Type 01) │    │
│  │  ─────────────────────────────────────────────              │    │
│  │  TestRunId | LineNumber | MedicaidProviderNumber |          │    │
│  │  ProviderFullName | ProviderNameType | OrgTypeCode |        │    │
│  │  OrgTypeDesc | MedicareA | MedicareB | ... (all fields)     │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ExpectedState_Stage2_RecType02 (Expected Staged - Type 02) │    │
│  │  ... (one table per record type, mirroring staged DB schema)│    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ExpectedState_Stage3_Organization                          │    │
│  │  ─────────────────────────────────────────────              │    │
│  │  TestRunId | McdId | BusinessProfileFullName |              │    │
│  │  BusinessProfileDBAName | BusinessProfileShortName |        │    │
│  │  StatusDisplayName | ProvenanceTypeDisplayName | ...        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ExpectedState_Stage3_Location                              │    │
│  │  ExpectedState_Stage3_OrganizationAddresses                 │    │
│  │  ExpectedState_Stage3_LocationAddresses                     │    │
│  │  ExpectedState_Stage3_OrganizationIdentifiers               │    │
│  │  ExpectedState_Stage3_LocationIdentifiers                   │    │
│  │  ExpectedState_Stage3_LocationCredentials                   │    │
│  │  ExpectedState_Stage3_LocationSpecialty                     │    │
│  │  ExpectedState_Stage3_LocationTaxonomies                    │    │
│  │  ExpectedState_Stage3_PaymentSuspension                     │    │
│  │  ExpectedState_Stage3_LocationSupportedPrograms             │    │
│  │  ExpectedState_Stage3_LocationExtensionWaiverServices       │    │
│  │  ExpectedState_Stage3_LocationType                          │    │
│  │  ... (one table per Carity target table)                    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Generation Process (Step by Step)

```
┌──────────────┐
│  Source .psv │
│  File        │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Parse Source File                                   │
│  • Read file line by line                                    │
│  • Assign line numbers                                       │
│  • Store raw text → ExpectedState_Stage1                     │
│  • Split by pipe delimiter                                   │
│  • Identify record type (first field)                        │
│  • Parse fields per record type layout spec                  │
│  • Store parsed fields → ExpectedState_Stage2_RecTypeXX      │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Group by Provider                                   │
│  • Group all record-type rows by Medicaid Provider Number    │
│  • Each provider gets: one Type01, multiple Type02-14 rows   │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Apply Business Rule Filters                         │
│  • BR-D06-005: Skip if Provider Type=90, Specialty=85x       │
│  • BR-D06-012: Skip if Billing Indicator = "R"               │
│  • Mark skipped providers as SKIPPED (expected to NOT exist  │
│    in Carity DB)                                             │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Apply Deduplication Rules                           │
│  • BR-D06-022: Multiple NPIs → keep only most recent         │
│    effective date (tiebreaker: last row in file)             │
│  • BR-D06-023: Multiple TINs per type → keep only most       │
│    recent effective date (tiebreaker: last row in file)      │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Apply Data Transformations                          │
│  • Name formatting: Personal → "First MI Last"               │
│  • ZIP code: 5-digit + 4-digit extension → "XXXXX-XXXX"      │
│  • Address type: S→"Rendering/Location Address", etc.        │
│  • Identifier types: MCD ID, NPI, TIN → TypeDisplayNames     │
│  • Credential types: License→"Licensed", Cert→"Certified"    │
│  • Waiver Service Status: "1"→IsActive=1, others→IsActive=0  │
│  • License Classification Desc → stored in Note field        │
│  • Special Program Desc → stored in Note field               │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────┐
│  STEP 6: Apply Vocabulary Lookups                             │
│  • Load vocab JSON files                                      │
│  • Provider Type Code → LocationTypeSubtypes.DisplayName      │
│  • Provider Specialty Code → LocationSpecialty.TypeDisplayName│
│  • Taxonomy Code → Grouping + Classification + Specialization │
│  • County Code → PhysicalAddressCountyAreaDisplayName         │
│  • ACA Indicator → PaymentSuspension.StatusDisplayName        │
│  • Waiver Program Code → ProgramKey                           │
│  • Waiver Service Code → WaiverServiceCodeDisplayName         │
│  • Org Type Description → Identifier                          │
│  • Billing Indicator → LocationType.PrimaryTypeDisplayName    │
│  • Licensure Board Desc → LicensureBoardDisplayName           │
│  • Certification Type Desc → CertificationTypeDisplayName     │
│                                                               │
│  If a lookup value is NOT FOUND in the vocab JSON:            │
│  • Mark as EXPECTED_LOOKUP_FAILURE                            │
│  • The pipeline should also fail on this (log error)          │
│  • If pipeline loads it anyway → that's a bug                 │
└───────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Determine Provider Status (BR-D06-020)              │
│  • Check: has active WVR contract (code="WVR", status="A",   │
│    effective ≤ today ≤ end date)?                            │
│  • Check: has active IRIS program (code="IRIS",              │
│    effective ≤ today ≤ end date)?                            │
│  • BOTH true → StatusDisplayName = "Active"                  │
│  • Otherwise → StatusDisplayName = "Inactive"                │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: Apply Default Values                                │
│  • ProvenanceTypeDisplayName = "MMIS"                        │
│  • ProvenanceTypeIdentifier = 12800001                       │
│  • ProvenanceTypeCodeSystemIdentifier = 1                    │
│  • OrganizationOrganizationTypes.DisplayName = "Provider"    │
│  • LocationPointOfContact.TypeDisplayName = "Contact Person" │
│  • LocationPhones.IsPrimary = 0                              │
│  • LocationEmailAddresses.IsPrimary = 0                      │
│  • LocationAddresses.isActive = 1                            │
│  • ... (all defaults from ICD-D06 mapping)                   │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 9: Generate Expected Target Rows                       │
│  • For each non-skipped provider, generate expected rows for │
│    EVERY target Carity table:                                │
│    - Organization (1 row)                                    │
│    - Location (1+ rows)                                      │
│    - OrganizationAddresses (per address type)                │
│    - LocationAddresses (per address type)                    │
│    - OrganizationIdentifiers (MCD ID + deduped NPI + TIN)    │ 
│    - LocationIdentifiers (same)                              │
│    - LocationType (1 row)                                    │
│    - LocationTypeSubtypes (per provider type)                │
│    - LocationSpecialty (per specialty)                       │
│    - LocationTaxonomies (per taxonomy code)                  │
│    - OrganizationCredentials (licenses + certifications)     │
│    - LocationCredentials (same)                              │
│    - PaymentSuspension (per ACA hold)                        │
│    - LocationSupportedPrograms (per waiver program)          │
│    - OrganizationSupportedPrograms (per waiver program)      │
│    - LocationExtensionWaiverServices (per waiver service)    │
│    - LocationServiceAreaCountyAreas (per county)             │
│    - OrganizationPhones / LocationPhones                     │
│    - OrganizationEmailAddresses / LocationEmailAddresses     │
│    - OrganizationPointOfContact / LocationPointOfContact     │
│    - MedicaidEnrollment (Revalidation Date)                  │
│    - OrganizationBusinessTypes                               │
│  • Store ALL expected rows → ExpectedState_Stage3_* tables   │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 10: Persist Expected State to DB                       │
│  • Write all ExpectedState tables to TestVerification schema │
│  • Tag every row with TestRunId for isolation                │
│  • Expected state is now queryable alongside actual state    │
└──────────────────────────────────────────────────────────────┘
```

### Expected State Storage Schema

All expected state tables live in a **TestVerification** schema (either a separate database or a schema within one of the existing DBs).

```sql
-- Stage 1: Expected raw staging rows
CREATE TABLE TestVerification.ExpectedState_Stage1 (
    TestRunId           UNIQUEIDENTIFIER NOT NULL,
    LineNumber          INT NOT NULL,
    ExpectedRawText     NVARCHAR(MAX) NOT NULL,
    PRIMARY KEY (TestRunId, LineNumber)
);

-- Stage 2: Expected staged rows (one table per record type)
-- Example for Record Type 01:
CREATE TABLE TestVerification.ExpectedState_Stage2_RecType01 (
    TestRunId                   UNIQUEIDENTIFIER NOT NULL,
    LineNumber                  INT NOT NULL,
    RecordType                  NVARCHAR(2),
    MedicaidProviderNumber      NVARCHAR(15),
    ProviderFullName            NVARCHAR(50),
    ProviderNameType            NVARCHAR(1),
    OrganizationTypeCode        NVARCHAR(1),
    OrganizationTypeDescription NVARCHAR(25),
    MedicarePartA               NVARCHAR(1),
    MedicarePartB               NVARCHAR(1),
    LocationStatusIndicator     NVARCHAR(1),
    BillingIndicator            NVARCHAR(1),
    XMLIndicator                NVARCHAR(1),
    ProviderDirectoryIndicator  NVARCHAR(1),
    MedicaidServiceProviderCount NVARCHAR(5),
    MedicaidMemberCount         NVARCHAR(5),
    RevalidationDate            NVARCHAR(8),
    LTCDelegateActionIndicator  NVARCHAR(1),
    LTCDelegateLastActionDate   NVARCHAR(8),
    PRIMARY KEY (TestRunId, LineNumber)
);

-- Example for Record Type 02:
CREATE TABLE TestVerification.ExpectedState_Stage2_RecType02 (
    TestRunId                   UNIQUEIDENTIFIER NOT NULL,
    LineNumber                  INT NOT NULL,
    RecordType                  NVARCHAR(2),
    MedicaidProviderNumber      NVARCHAR(15),
    AddressTypeCode             NVARCHAR(1),
    NameAddressSpecific         NVARCHAR(50),
    StreetAddress1              NVARCHAR(30),
    StreetAddress2              NVARCHAR(30),
    City                        NVARCHAR(30),
    State                       NVARCHAR(2),
    ZipCode                     NVARCHAR(5),
    ZipCodeExtension            NVARCHAR(4),
    PracticeLocationCountyCode  NVARCHAR(10),
    EmailAddress                NVARCHAR(256),
    ContactPerson               NVARCHAR(50),
    PhoneNumberContact          NVARCHAR(10),
    PhoneExtensionContact       NVARCHAR(4),
    PhoneNumberMemberUse        NVARCHAR(10),
    PRIMARY KEY (TestRunId, LineNumber)
);
-- ... similar tables for RecType03 through RecType14

-- Stage 3: Expected Carity rows (one table per target Carity table)
-- Example:
CREATE TABLE TestVerification.ExpectedState_Stage3_Organization (
    TestRunId                       UNIQUEIDENTIFIER NOT NULL,
    MedicaidProviderNumber          NVARCHAR(15) NOT NULL,
    BusinessProfileFullName         NVARCHAR(100),
    BusinessProfileDoingBusinessAsName NVARCHAR(100),
    BusinessProfileShortName        NVARCHAR(100),
    StatusDisplayName               NVARCHAR(50),
    ProvenanceTypeDisplayName       NVARCHAR(50),
    PRIMARY KEY (TestRunId, MedicaidProviderNumber)
);

CREATE TABLE TestVerification.ExpectedState_Stage3_LocationAddresses (
    TestRunId                       UNIQUEIDENTIFIER NOT NULL,
    MedicaidProviderNumber          NVARCHAR(15) NOT NULL,
    AddressTypeDisplayName          NVARCHAR(100) NOT NULL,
    FirstStreetAddress              NVARCHAR(250),
    SecondStreetAddress             NVARCHAR(250),
    CityName                        NVARCHAR(100),
    StateProvinceDisplayName        NVARCHAR(50),
    PostalCode                      NVARCHAR(10),
    CountyAreaDisplayName           NVARCHAR(100),
    CurrentDisplayName              NVARCHAR(10),    -- "Yes" or "No"
    IsActive                        BIT,
    PRIMARY KEY (TestRunId, MedicaidProviderNumber, AddressTypeDisplayName)
);

CREATE TABLE TestVerification.ExpectedState_Stage3_LocationIdentifiers (
    TestRunId                       UNIQUEIDENTIFIER NOT NULL,
    MedicaidProviderNumber          NVARCHAR(15) NOT NULL,
    TypeDisplayName                 NVARCHAR(100) NOT NULL,
    Value                           NVARCHAR(50) NOT NULL,
    EffectiveDateRangeStartDate     DATE,
    EffectiveDateRangeEndDate       DATE,
    PRIMARY KEY (TestRunId, MedicaidProviderNumber, TypeDisplayName, Value)
);

-- ... similar tables for all other Carity targets
-- (Full DDL to be generated during Phase 3 implementation)
```

### Why Store Expected State in a Database?

| Reason | Benefit |
|--------|---------|
| Queryable | QA can write ad-hoc queries to explore expected vs actual |
| Joinable | Can JOIN expected tables to actual tables for side-by-side comparison |
| Persistent | Survives across sessions; can re-run verification without regenerating |
| Auditable | Historical record of what we expected vs what we got |
| Shareable | Multiple team members can access the same expected state |
| Cleanup-friendly | Delete by TestRunId to reset cleanly |

### Comparison Logic

```sql
-- Example: Compare expected vs actual for LocationAddresses
SELECT
    e.TestRunId,
    e.MedicaidProviderNumber,
    e.AddressTypeDisplayName,
    e.PostalCode        AS Expected_PostalCode,
    a.PhysicalAddressPostalCode AS Actual_PostalCode,
    CASE WHEN e.PostalCode = a.PhysicalAddressPostalCode THEN 'PASS' ELSE 'FAIL' END AS Status
FROM TestVerification.ExpectedState_Stage3_LocationAddresses e
LEFT JOIN OrganizationModule.LocationAddresses a
    ON a.PhysicalAddressTypeDisplayName = e.AddressTypeDisplayName
    AND a.LocationKey IN (
        SELECT LocationKey FROM OrganizationModule.LocationIdentifiers
        WHERE Value = e.MedicaidProviderNumber
        AND TypeDisplayName = 'Medicaid Provider ID'
    )
WHERE e.TestRunId = @TestRunId;
```

This pattern repeats for every target table — compare expected row to actual row, field by field, and log PASS/FAIL to the MismatchReport table.

---

## Business Rules We Must Validate

These are the rules the processor is supposed to apply. Our system verifies they were applied correctly.

| Rule | What to Verify |
|------|---------------|
| BR-D06-004 | MCD Provider Number used for matching — verify correct provider was updated |
| BR-D06-005 | PHW Providers (Type=90, Specialty=85x) NOT loaded — verify absence |
| BR-D06-006 | Expired Waiver Program → Status "Inactive" on Org and Location |
| BR-D06-007 | Expired Waiver Program → Service Area End Date set |
| BR-D06-008 | Waiver Service End Date stored correctly |
| BR-D06-009/010/011 | Billing Indicator B/Y/N → Location Type "Waiver Service Provider" |
| BR-D06-012 | Billing Indicator "R" → Provider NOT loaded (verify absence); if previously loaded → deactivated |
| BR-D06-013 | 1 MCD ID = 1 Org + potentially many Locations |
| BR-D06-014 | Contract dates stored as Effective Date range |
| BR-D06-015 | Waiver Service Codes → correct services assigned |
| BR-D06-016 | Error Report generated (verify report exists and content is correct) |
| BR-D06-018 | Address Type "S" set as "Current" address |
| BR-D06-019 | ZIP code formatting (5 or 5-dash-4) |
| BR-D06-020 | Active status: WVR contract active + IRIS program active = Active |
| BR-D06-021 | Taxonomy → resolved Grouping/Classification/Specialization |
| BR-D06-022 | Multiple NPIs → only most recent loaded (tiebreaker: pick last) |
| BR-D06-023 | Multiple TINs → only most recent per type loaded (tiebreaker: pick last) |

### Status Logic Verification (BR-D06-020)
Active IRIS program keeps provider "Active" even if other programs (FAMCR, PACE, etc.) are expired.

### Deletion Verification
Provider absent from current file → verify Status set to "Inactive" in target DB.

### Billing Indicator "R" Transition
Provider changes from "B" → "R" → verify provider is deactivated (not deleted) in target.

---

## Data Transformations to Verify

| Transformation | Source | Expected Target |
|----------------|--------|-----------------|
| Name (Personal) | `LastName(1-25) FirstName(26-38) MI(39)` | `First MI Last` in BusinessProfileFullName |
| Name (Business) | Full field | Stored directly |
| Address Type S | "S" | "Rendering/Location Address" + Current = "Yes" |
| Address Type P | "P" | "Billing Address" |
| Address Type M | "M" | "Mailing Address" |
| Address Type I | "I" | "1099 Address" |
| ZIP Code | `53703` + `1234` | `53703-1234` |
| TIN Type S | "S" | TypeDisplayName = "Social Security Number" |
| TIN Type F | "F" | TypeDisplayName = "Federal Employer Identification Number" |
| MCD ID | value | TypeDisplayName = "Medicaid Provider ID" |
| NPI | value | TypeDisplayName = "National Provider Identifier" |
| License | Record Type 13 | TypeDisplayName = "Licensed" |
| Certification | Record Type 14 | TypeDisplayName = "Certified" |
| Waiver Service Status 1 | "1" | IsActive = 1 |
| Waiver Service Status 2-8 | "2"-"8" | IsActive = 0 |
| Provenance | n/a | "MMIS" / 12800001 / 1 |
| Contact Person NULL | NULL | Do NOT create Point of Contact record |

---

## Dual-Write Verification

Data is written to BOTH Organization-level and Location-level tables. Values **can diverge** between Org and Location. Our system must verify both levels independently.

| Org Table | Location Table | Notes |
|-----------|---------------|-------|
| OrganizationAddresses | LocationAddresses | Values can differ |
| OrganizationIdentifiers | LocationIdentifiers | Same MCD ID, NPI, TIN |
| OrganizationCredentials | LocationCredentials | Same license/cert data |
| OrganizationPhones | LocationPhones | Values can differ |
| OrganizationEmailAddresses | LocationEmailAddresses | Values can differ |
| OrganizationPointOfContact | LocationPointOfContact | Values can differ |
| OrganizationSupportedPrograms | LocationSupportedPrograms | Same program |

---

## Vocabulary/Lookup JSON Reference Files (Stubs)

These JSON files provide the mapping data our system uses to compute expected state. They will be filled with actual values later.

| File | Purpose |
|------|---------|
| `vocab/provider_types.json` | Provider Type Code → DisplayName |
| `vocab/provider_specialties.json` | Provider Specialty Code → TypeDisplayName |
| `vocab/taxonomy_codes.json` | Taxonomy Code → Grouping, Classification, Specialization |
| `vocab/county_codes.json` | County Code → DisplayName |
| `vocab/address_types.json` | Address Type Code → PhysicalAddressTypeDisplayName |
| `vocab/aca_status.json` | ACA Indicator → StatusDisplayName |
| `vocab/waiver_programs.json` | Waiver Program Code → ProgramKey |
| `vocab/waiver_services.json` | Waiver Service Code → WaiverServiceCodeDisplayName |
| `vocab/billing_indicators.json` | Billing Indicator → PrimaryTypeDisplayName |
| `vocab/org_business_types.json` | Organization Type Description → Identifier |
| `vocab/licensure_boards.json` | Licensure Board Description → Identifier |
| `vocab/certification_types.json` | Certification Type Description → Identifier |

---

## Test Data Files

All test files are documented in `TEST_SCENARIOS_README.md`:

- **Baseline files** (T_01 through T_08): Validate field handling (max lengths, empty fields, all codes, etc.)
- **Update files** (UPD01 through UPD07): Validate change detection (address, contract, demographics, NPI, waiver, new providers, termination)
- **Delete files** (DEL01 through DEL05): Validate absence detection (provider removal, sub-record removal)

---


## Mismatch Report Schema

```sql
CREATE TABLE TestVerification.MismatchReport (
    MismatchId          UNIQUEIDENTIFIER DEFAULT NEWID() PRIMARY KEY,
    TestRunId           UNIQUEIDENTIFIER NOT NULL,
    InterfaceType       NVARCHAR(20) NOT NULL,     -- e.g., "icd_d06", "icd_d07"
    TestRunTimestamp    DATETIME2 NOT NULL,
    SourceFileName      NVARCHAR(255) NOT NULL,
    SourceLineNumber    INT NOT NULL,
    ProviderMcdId       NVARCHAR(15) NOT NULL,
    RecordType          NVARCHAR(2),
    Stage               TINYINT NOT NULL,          -- 1=Raw, 2=Parsed, 3=Incoming, 4=Carity
    TargetDatabase      NVARCHAR(100) NOT NULL,
    TargetTable         NVARCHAR(200) NOT NULL,
    TargetColumn        NVARCHAR(200) NOT NULL,
    ExpectedValue       NVARCHAR(MAX),
    ActualValue         NVARCHAR(MAX),
    Status              NVARCHAR(10) NOT NULL,     -- PASS, FAIL, MISSING, SKIPPED
    BusinessRule        NVARCHAR(20),              -- BR-D06-xxx (nullable)
    LookupFile          NVARCHAR(100),             -- vocab JSON filename (nullable)
    ErrorCategory       NVARCHAR(50),              -- e.g., "Transformation", "Lookup", "Missing Row", "Extra Row"
    Notes               NVARCHAR(MAX)
);

CREATE TABLE TestVerification.TestRun (
    TestRunId           UNIQUEIDENTIFIER PRIMARY KEY,
    InterfaceType       NVARCHAR(20) NOT NULL,     -- e.g., "icd_d06"
    StartTimestamp      DATETIME2 NOT NULL,
    EndTimestamp        DATETIME2,
    SourceFileName      NVARCHAR(255) NOT NULL,
    McdIdRangeStart     NVARCHAR(15) NOT NULL,
    McdIdRangeEnd       NVARCHAR(15) NOT NULL,
    TotalSourceLines    INT,
    TotalProviders      INT,
    Stage1PassCount     INT,
    Stage1FailCount     INT,
    Stage2PassCount     INT,
    Stage2FailCount     INT,
    Stage3PassCount     INT,
    Stage3FailCount     INT,
    Stage4PassCount     INT,
    Stage4FailCount     INT,
    OverallStatus       NVARCHAR(10),              -- PASS, FAIL, PARTIAL
    CleanedUp           BIT DEFAULT 0
);
```
---