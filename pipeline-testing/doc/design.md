# Pipeline Validation Helper — System Design Document

## Status: STABLE MVP

---

## 1. Purpose

A web application that allows non-technical QA staff to verify the correctness of the WI DHS data pipeline by:
1. Loading a known test file (from S3 or local upload)
2. Parsing the file using the appropriate interface plugin
3. Generating the expected database state at each of 4 pipeline stages
4. Persisting expected state to the TestVerification schema
5. Comparing expected vs actual across all 4 stages (field-by-field)
6. Displaying a mismatch report with drill-down, filtering, and CSV export
7. Cleaning up test data from all databases when done

The system uses a **plugin architecture** supporting multiple interface file types. Currently implemented:
- **ICD-D06**: Medicaid Provider File (.psv) — fully tested
- **ICD-D12**: FSIA Functional Screen File (.txt) — implemented, partial testing completed 
- **ICD-D05** IRIS Auth Request | **Outbound** | Pipe-delimited | Authorization # | HDR + DTL + TLR | .txt | Reverse: DB→file generation | YAML spec exists — analyzed, pending implementation
- **ICD-D05** IRIS Auth Response | **Inbound** | Pipe-delimited | Authorization # | DTL only (no HDR) | .log | 4 stages (updates existing records) | YAML spec exists — analyzed, pending implementation
 

The architecture is designed to support 20+ interfaces using the same core framework.

---

## 2. Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 4-stage verification | Confirmed by database inspection, 4 distinct processing hops |
| 2 | Vocabulary from DB tables | `VocabularyLookupDisplayNames` is the source of truth the pipeline uses |
| 3 | Marker-based isolation (Entity ID prefix) | Appended data model requires filtering; Medicaid ID or member ID flows through all stages |
| 4 | Plugin architecture | Proven with ICD-D06, generalized for all future interfaces |
| 5 | Streamlit + FastAPI (split architecture) | Streamlit for QA-friendly UI; FastAPI for typed REST API with OpenAPI docs |
| 6 | Single container with supervisor | Simplifies deployment — one Fargate task runs both services |
| 7 | ARM64 / Graviton | 20% cost savings over x86 with identical performance |
| 8 | Internal ALB (not internet-facing) | Application is internal-only, accessed via VPN, working with PHI/PII|
| 9 | Expected state persistence to DB | Enables audit trail, re-comparison without re-parse, and mismatch drill-down |
| 10 | Streaming progress via SSE | Real-time UI updates during multi-stage comparisons |
| 11 | For ICD_D06, Stage 3 → Stage 4 is a straight copy No additional transformations at that hop|But for the ICD_D12 FSIA, is interfaced to a custom form module and requires complex mappings|
| 12 | ICD_D06 Record Type 09 (Value Added) is ignored | No parsed table exists for it |
| 13 | Generic cleanup via plugin config metadata | Plugins declare tables + FK order; framework executes generically |
| 14 | S3 bucket name set at deploy time | Same bucket shared; prefix isolates test files by interface type |

---

## 3. Overall Application Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 pl-test Application                                      │
│                                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              Web Layer                                              │ │
│  │                                                                                     │ │
│  │  ┌──────────────────────┐          ┌──────────────────────────────────────────────┐ │ │
│  │  │  Streamlit UI (:8501)│──HTTP───>│  FastAPI Backend (:8000)                     │ │ │
│  │  │                      │          │                                              │ │ │
│  │  │  • Dashboard         │          │  • /api/test-runs/    (CRUD)                 │ │ │
│  │  │  • Load File         │          │  • /api/files/        (parse, S3, upload)    │ │ │
│  │  │  • Compare           │          │  • /api/compare/      (run, progress, stage) │ │ │
│  │  │  • Mismatches        │          │  • /api/cleanup/      (run, pipeline, bulk)  │ │ │
│  │  │  • Cleanup           │          │  • /health            (health check)         │ │ │
│  │  │  • Test Runs         │          │                                              │ │ │
│  │  └──────────────────────┘          └──────────────┬───────────────────────────────┘ │ │
│  │                                                   │                                 │ │
│  └───────────────────────────────────────────────────┼─────────────────────────────────┘ │
│                                                      │                                   │
│  ┌───────────────────────────────────────────────────┼────────────────────────────────┐  │
│  │                           Service Layer           │                                │  │
│  │                                                   ▼                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐   │  │
│  │  │                     Interface Plugin System                                 │   │  │
│  │  │                                                                             │   │  │
│  │  │  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │   │  │
│  │  │  │  ICD-D06        │     │  ICD-D12        │     │  ICD-Dxx        │        │   │  │
│  │  │  │  (.psv parser)  │     │  (.txt parser)  │     │  (future)       │        │   │  │
│  │  │  │  ExpectedState  │     │  ExpectedState  │     │                 │        │   │  │
│  │  │  │  Comparator     │     │  Comparator     │     │                 │        │   │  │
│  │  │  │  CleanupConfig  │     │  CleanupConfig  │     │                 │        │   │  │
│  │  │  └─────────────────┘     └─────────────────┘     └─────────────────┘        │   │  │
│  │  └─────────────────────────────────────────────────────────────────────────────┘   │  │
│  │                                                                                    │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                        │  │
│  │  │ VocabClient    │  │ S3Client       │  │ DatabaseManager│                        │  │
│  │  │ (lookups)      │  │ (test files)   │  │ (pyodbc)       │                        │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                        │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. AWS Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                    AWS (us-east-1)                                   │
│                                                                                      │
│  ┌──────────────┐                                                                    │
│  │ QA Browser   │─────VPN────┐                                                       │
│  └──────────────┘            │                                                       │
│                              ▼                                                       │
│  ┌──────────────────────────────────────────────────────────────────────────────┐    │
│  │                         VPC (Existing — Shared)                              │    │
│  │                                                                              │    │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │    │
│  │  │              ALB (Internal, not internet-facing)                        │ │    │
│  │  │              :80 → Streamlit (:8501)                                    │ │    │
│  │  │              :8000 → FastAPI (:8000)                                    │ │    │
│  │  └───────────────────────────────┬─────────────────────────────────────────┘ │    │
│  │                                  ▼                                           │    │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐ │    │
│  │  │           ECS Fargate (ARM64 / Graviton)                                │ │    │
│  │  │           0.5 vCPU / 1 GB RAM / 1 task                                  │ │    │
│  │  │                                                                         │ │    │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐    │ │    │
│  │  │  │  Container (supervisord)                                        │    │ │    │
│  │  │  │  ┌─────────────┐    ┌───────────────────┐                       │    │ │    │
│  │  │  │  │ Streamlit   │    │  FastAPI (uvicorn)│                       │    │ │    │
│  │  │  │  │ :8501       │───>│  :8000            │                       │    │ │    │
│  │  │  │  └─────────────┘    └────────┬──────────┘                       │    │ │    │
│  │  │  └──────────────────────────────┼──────────────────────────────────┘    │ │    │
│  │  └─────────────────────────────────┼───────────────────────────────────────┘ │    │
│  │                                    │                                         │    │
│  │               ┌────────────────────┼───────────────────────┐                 │    │
│  │               │                    │                       │                 │    │
│  │               ▼                    ▼                       ▼                 │    │
│  │  ┌──────────────────┐  ┌───────────────────┐   ┌────────────────────┐        │    │
│  │  │  Secrets Manager │  │  S3 Bucket        │   │  RDS SQL Server    │        │    │
│  │  │  (DB + App creds)│  │  (test files)     │   │  (shared instance) │        │    │
│  │  └──────────────────┘  └───────────────────┘   │                    │        │    │
│  │                                                │  ┌──────────────┐  │        │    │
│  │  ┌──────────────────┐                          │  │Interface DB  │  │        │    │
│  │  │  CloudWatch Logs │                          │  │(Stages 1-3)  │  │        │    │
│  │  │  (/ecs/pl-test)  │                          │  ├──────────────┤  │        │    │
│  │  └──────────────────┘                          │  │Carity DB     │  │        │    │
│  │                                                │  │(Stage 4)     │  │        │    │
│  │  ┌──────────────────┐                          │  └──────────────┘  │        │    │
│  │  │  ECR (image repo)│                          └────────────────────┘        │    │
│  │  └──────────────────┘                                                        │    │
│  │                                                                              │    │
│  └──────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **ECS Fargate** | Runs the application container (ARM64/Graviton) | 0.5 vCPU, 1 GB RAM, 1 desired task |
| **Application Load Balancer** | Routes traffic to container (internal only) | Port 80→8501 (UI), Port 8000→8000 (API) |
| **ECR** | Stores the Docker image (ARM64) | Auto-built by CDK from Dockerfile |
| **Secrets Manager** | Stores DB credentials + app login credentials | 2 secrets: `pl-test/db-credentials`, `pl-test/app-credentials` |
| **S3** | Stores test data files (.psv, .txt) by interface type | Bucket name set at deploy time; prefix: `test-files/{interface_type}/` |
| **CloudWatch Logs** | Container logs with 2-week retention | Log group: `/ecs/pl-test` |
| **RDS SQL Server** | Pipeline databases (shared instance, managed separately) | Single server hosting both Interface DB and Carity DB |
| **VPC** | Network isolation (existing, shared with other apps) | Private subnets only; no NAT Gateway |

### 4.2 Cost Estimate (Monthly)

| Service | Specification | Estimated Cost |
|---------|--------------|----------------|
| **ECS Fargate (ARM64)** | 0.5 vCPU × 730 hrs × $0.03238/hr + 1 GB × 730 hrs × $0.00356/hr | ~$12.60/month |
| **Application Load Balancer** | 1 ALB + 2 listeners + low LCU usage | ~$18.00/month |
| **ECR** | ~500 MB image storage + negligible transfer | ~$0.05/month |
| **Secrets Manager** | 2 secrets × $0.40/secret + API calls | ~$0.82/month |
| **S3** | <1 GB test files storage + minimal requests | ~$0.03/month |
| **CloudWatch Logs** | ~2 GB/month ingestion + 2-week retention | ~$1.00/month |
| **Data Transfer** | Internal only (within VPC) | $0.00 |
| | | |
| **Total (pl-test only)** | | **~$32.50/month** |

*Note: RDS SQL Server costs are managed separately — the database is shared with other applications.*

---

## 5. Database Infrastructure

### 5.1 Server

| Property | Value |
|----------|-------|
| Host | `mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com` |
| Engine | SQL Server on RDS |
| Authentication | SQL Authentication (username/password via Secrets Manager) |
| Local Dev Auth | Windows Integrated (Trusted_Connection) |
| Encryption | TrustServerCertificate=True |
| ODBC Driver | Microsoft ODBC Driver 18 for SQL Server |

### 5.2 Databases

| Database | Purpose | Schemas |
|----------|---------|---------|
| `WiDHS.Qc.Interface.Carity.ToolTesting` | Stages 1–3 + TestVerification schema | `CustomerInterfaceModule`, `InterfaceModule`, `TestVerification` |
| `WiDHS.Qc.Carity.ToolTestig` | Stage 4 (Final) | `OrganizationModule`, `CustomerOrganizationModule`, `CustomFormModule`, `PersonModule`, `CaseModule`, `ProgramEnrollmentModule` |

*Note: The Carity DB name has a typo ("ToolTestig") — this is the actual name on the server.*

### 5.3 TestVerification Schema (Application-Owned)

The `[TestVerification]` schema is created and managed by pl-test. It stores test run tracking, expected state, and mismatch results:

| Table | Purpose |
|-------|---------|
| `TestRun` | Tracks each verification execution (ID, timestamps, file, status, stage pass/fail counts) |
| `ExpectedState_Stage1_Raw` | Expected raw text per source line |
| `ExpectedState_Stage2_Parsed` | Expected parsed field values (EAV: entity/table/column/value) |
| `ExpectedState_Stage3_Incoming` | Expected transformed values with vocab + business rule references |
| `ExpectedState_Stage4_Final` | Expected final Carity values (same as Stage 3, different target DB/schema) |
| `MismatchReport` | Field-level comparison results (expected vs actual, status, error category) |

**DDL scripts**: `pl-test/database/001_create_schema.sql` through `007_create_expected_state_stage4.sql`

---

## 6. Confirmed 4-Stage Pipeline

```
┌──────────────┐       ┌───────────────┐       ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Source File │──────>│   STAGE 1     │──────>│   STAGE 2     │──────>│   STAGE 3     │──────>│   STAGE 4     │
│  (.psv/.txt) │       │   Raw         │       │   Parsed      │       │   Incoming    │       │   Final       │
│              │       │               │       │               │       │               │       │               │
│              │       │  1 row per    │       │  1 row per    │       │  Transformed  │       │  Final        │
│              │       │  file line    │       │  record field │       │  + vocab      │       │  Carity       │
│              │       │  (raw text)   │       │  (typed cols) │       │  lookups      │       │  tables       │
│              │       │               │       │  (14 tables)  │       │  (26 tables)  │       │  (30 tables)  │
└──────────────┘       └───────────────┘       └───────────────┘       └───────────────┘       └───────────────┘
                        CustomerInterface       CustomerInterface       InterfaceModule          OrganizationModule
                        Module                  Module                                           CustomerOrganizationModule

                       ◄─────── DB: WiDHS.Qc.Interface.Carity.ToolTesting ──────────────────►   DB: WiDHS.Qc.Carity.ToolTestig
```

### 6.1 Stage 1: Raw

| Property | Value |
|----------|-------|
| Database | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| Tables | `[CustomerInterfaceModule].[MedicaidProviderRaw]` (D06), `[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw]` (D12) |
| Mapping | 1 source file line = 1 row (raw text as-is) |
| Data Model | Appended |

### 6.2 Stage 2: Parsed

| Property | Value |
|----------|-------|
| Database | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| Schema | `[CustomerInterfaceModule]` |
| Data Model | Appended |

**ICD-D06 Tables (one per record type):**

| Table | Record Type | Description |
|-------|-------------|-------------|
| `MedicaidProviderMain` | 01 | Main provider info |
| `MedicaidProviderAddress` | 02 | Addresses (S, M, P, I) |
| `MedicaidProviderContact` | 02 (derived) | Contact person (from Address Type S and P only) |
| `MedicaidProviderTin` | 03 | Tax ID numbers |
| `MedicaidProviderContract` | 04 | Contracts |
| `MedicaidProviderTypeAndSpecialty` | 05 | Provider type + specialty |
| `MedicaidProviderNpi` | 06 | NPIs |
| `MedicaidProviderTaxonomy` | 07 | Taxonomy codes |
| `MedicaidProviderAcaPaymentHold` | 08 | ACA payment suspension |
| `MedicaidProviderWaiverProgram` | 10 | Waiver programs |
| `MedicaidProviderWaiverService` | 11 | Waiver services |
| `MedicaidProviderCountyAndTribeServed` | 12 | Counties served |
| `MedicaidProviderLicense` | 13 | Licenses |
| `MedicaidProviderCertificationAndCredentials` | 14 | Certifications |

*Record Type 09 (Value Added) is ignored — no parsed table exists.*

**ICD-D12 Tables:**

| Table | Record Type | Description |
|-------|-------------|-------------|
| `LongTermCareFunctionalScreenForm` | DTL | Parsed detail record — one row per member with 68 typed columns |

Stage 2 for D12 is a single table with all fields parsed into named columns (e.g., `MemberId`, `BathingHelpCode`, `EligibilityCalculatedDate`). System-managed columns include `PersonKey`, `HasErrors`, `IsReadyToProcess`, `InterfaceBatchKey`.

### 6.3 Stage 3: Incoming/Mapped

| Property | Value |
|----------|-------|
| Database | `WiDHS.Qc.Interface.Carity.ToolTesting` |
| Schema | `[InterfaceModule]` |
| Data Model | Appended |

**Tables (26 Incoming tables mapping to Stage 4 targets):**

| Incoming Table | → Stage 4 Target |
|----------------|-------------------|
| `IncomingOrganization` | `Organization` |
| `IncomingLocation` | `Location` |
| `IncomingOrganizationAddresses` | `OrganizationAddresses` |
| `IncomingLocationAddresses` | `LocationAddresses` |
| `IncomingOrganizationIdentifiers` | `OrganizationIdentifiers` |
| `IncomingLocationIdentifiers` | `LocationIdentifiers` |
| `IncomingOrganizationCredentials` | `OrganizationCredentials` |
| `IncomingLocationCredentials` | `LocationCredentials` |
| `IncomingOrganizationPhones` | `OrganizationPhones` |
| `IncomingLocationPhones` | `LocationPhones` |
| `IncomingOrganizationEmailAddresses` | `OrganizationEmailAddresses` |
| `IncomingLocationEmailAddresses` | `LocationEmailAddresses` |
| `IncomingOrganizationPointOfContact` | `OrganizationPointOfContact` |
| `IncomingLocationPointOfContact` | `LocationPointOfContact` |
| `IncomingOrganizationPointOfContactAssociatedPrograms` | `OrganizationPointOfContactAssociatedPrograms` |
| `IncomingLocationPointOfContactAssociatedPrograms` | `LocationPointOfContactAssociatedPrograms` |
| `IncomingOrganizationBusinessTypes` | `OrganizationBusinessTypes` |
| `IncomingOrganizationOrganizationTypes` | `OrganizationOrganizationTypes` |
| `IncomingOrganizationSupportedPrograms` | `OrganizationSupportedPrograms` |
| `IncomingLocationSupportedPrograms` | `LocationSupportedPrograms` |
| `IncomingLocationSpecialty` | `LocationSpecialty` |
| `IncomingLocationTaxonomies` | `LocationTaxonomies` |
| `IncomingLocationType` | `LocationType` |
| `IncomingLocationTypeSubtypes` | `LocationTypeSubtypes` |
| `IncomingMedicaidEnrollment` | `MedicaidEnrollment` |
| `IncomingPaymentSuspension` | `PaymentSuspension` |

### 6.4 Stage 4: Final (Carity)

| Property | Value |
|----------|-------|
| Database | `WiDHS.Qc.Carity.ToolTestig` |
| Schemas | `[OrganizationModule]`, `[CustomerOrganizationModule]` (D06); `[CustomFormModule]`, `[PersonModule]` (D12) |
| Data Model | Appended |

**ICD-D06**: Transfer logic is a straight copy from Stage 3 Incoming tables (no additional transformations).

**ICD-D12**: Data flows directly from Stage 2 (parsed) to Stage 4. The pipeline applies composite business rules to determine Yes/No answers (PersonalCare, DME, SupportiveHomeCare, etc.) and writes to:
- `CustomFormInstance` — one per member, linked to CustomFormDefinitionKey `964B0DFB-ED99-4F5A-8449-B43C013B9062` (Version 55)
- `CaseCustomFormInstance` — links form instance to the member's active case
- `FieldAnswerBase` — one per field answer per form instance
- `SimpleSingleSelectFieldAnswer` — Yes/No composite answers
- `DateFieldAnswer` — eligibility determination date
- `PersonModule.PersonEmployment` — employment records (BR-D12-009)

**Prerequisite data** (must exist in Carity DB for D12 processing):
- `PersonModule.Person` — base person record
- `PersonModule.PersonMedicaidNumbers` — Medicaid ID (used for person matching)
- `CaseModule.Case` — active case
- `ProgramEnrollmentModule.ProgramEnrollment` — IRIS program enrollment

---

## 7. Comparison Engine

### 7.1 How Comparison Works

The comparison flow persists expected state to the database before comparing. This enables:
- Audit trail of what was expected at each stage
- Re-comparison without re-parsing the source file
- Drill-down from mismatch report back to expected values

```
Source File
    │
    ▼
┌──────────────────┐     ┌──────────────────────────────────────────────────────────┐
│  Plugin Parser   │────>│  Expected State Generator (per plugin)                   │
└──────────────────┘     │                                                          │
                         │  generate_stage1() → INSERT ExpectedState_Stage1_Raw     │
                         │  generate_stage2() → INSERT ExpectedState_Stage2_Parsed  │
                         │  generate_stage3() → INSERT ExpectedState_Stage3_Incoming│
                         │  generate_stage4() → INSERT ExpectedState_Stage4_Final   │
                         └────────────────────────┬─────────────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────────┐
                         │  Comparator (per plugin)                             │
                         │                                                      │
                         │  compare_stage1(expected) → query DB, diff fields    │
                         │  compare_stage2(expected) → query DB, diff fields    │
                         │  compare_stage3(expected) → query DB, diff fields    │
                         │  compare_stage4(expected) → query DB, diff fields    │
                         │                                                      │
                         │  → INSERT mismatches into MismatchReport             │
                         └────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                         ┌──────────────────────────────────────────────────────┐
                         │  TestRun finalized (UPDATE stage pass/fail counts)   │
                         └──────────────────────────────────────────────────────┘
```

### 7.2 Streaming Progress

Long-running comparisons push progress updates to the UI via Server-Sent Events (SSE):

```
GET /api/compare/progress/{test_run_id}

→ Event stream: {"step": "generating", "stage": 2, "detail": "...", "completed_stages": 1, "total_stages": 4}
```

### 7.3 Comparison Checkpoints

| Checkpoint | From → To | Key Verifications |
|------------|-----------|-------------------|
| **1** | File → Stage 1 (Raw) | Row count matches source lines; raw text content identical |
| **2** | Stage 1 → Stage 2 (Parsed) | Record type routing; pipe-delimited field parsing; contact derivation; row counts |
| **3** | Stage 2 → Stage 3 (Incoming) | Vocabulary lookups resolved; business rules applied (PHW filter, dedup, status); dual-write to Org + Location |
| **4** | Stage 3 → Stage 4 (Final) | 1:1 transfer; value fidelity; GUID linkage; no data loss |

### 7.4 Per-Stage Execution

Comparisons can be run all-at-once or per-stage:

- `POST /api/compare/run` — Runs all 4 stages sequentially
- `POST /api/compare/run-stage` — Runs a single specified stage

Both persist expected state and mismatches to the database.

---

## 8. Plugin Architecture

### 8.1 Design Philosophy

The plugin system follows the **Strategy + Abstract Factory** pattern. Each interface file type (ICD-D06, ICD-D12, future ICD-D07, etc.) is encapsulated in a self-contained plugin module that provides all interface-specific behavior while delegating orchestration, persistence, and presentation to the core framework.

Key design principles:
- **Open/Closed**: New interfaces are added by creating a new plugin module — zero changes to core framework code.
- **Interface Segregation**: Plugins only implement what differs; shared concerns (DB connections, SSE streaming, cleanup execution, UI rendering) are in the core.
- **Declarative Cleanup**: Plugins declare their table/FK metadata; the framework executes DELETE cascades generically.
- **Vocabulary Indirection**: Plugins provide lookup key mappings; the generic `VocabClient` resolves them at runtime against the shared `VocabularyLookupDisplayNames` table.

### 8.2 Plugin Contract (Abstract Base Classes)

Every interface plugin implements the `InterfacePlugin` abstract class and provides factory methods for the three primary components:

```python
class InterfacePlugin(ABC):
    """Registry entry and factory for a single interface type."""

    # ─── Identity ───────────────────────────────────────────────────────────
    interface_type: str           # "icd_d06", "icd_d12"
    display_name: str             # Human-readable name for UI
    file_extensions: List[str]    # Accepted file suffixes
    description: str              # Tooltip/help text
    entity_id_field_name: str     # Column used for data isolation filtering
    default_stages: List[int]     # Which stages this interface uses (e.g., [1,2,4])
    vocab_lookup_keys: Dict       # Plugin-specific vocabulary key mappings

    # ─── Factory Methods ────────────────────────────────────────────────────
    def create_parser() -> BaseParser
    def create_expected_state_generator(parsed_file, vocab_client) -> BaseExpectedStateGenerator
    def create_comparator(entity_id_prefix) -> BaseComparator

    # ─── Declarative Cleanup Metadata ───────────────────────────────────────
    pipeline_cleanup_config: List[Dict]    # Interface DB tables (Stages 1-3)
    carity_cleanup_config: List[Dict]      # Carity DB tables (Stage 4)
```

The three factory-produced components form the **verification triad**:

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                   InterfacePlugin                            │
                    │         (metadata + factory + cleanup config)                │
                    └───────────┬─────────────────────┬─────────────────┬──────────┘
                                │                     │                 │
                                ▼                     ▼                 ▼
                    ┌──────────────────┐   ┌────────────────────┐  ┌───────────────┐
                    │   BaseParser     │   │ BaseExpectedState  │  │ BaseComparator│
                    │                  │   │ Generator          │  │               │
                    │ parse_file()     │   │                    │  │ compare_stageN│
                    │ parse_content()  │   │ generate_stage1()  │  │               │
                    │                  │   │ generate_stage2()  │  │ (queries DB,  │
                    │ → ParsedFile     │   │ generate_stage3()  │  │  diffs fields)│
                    │                  │   │ generate_stage4()  │  │               │
                    └──────────────────┘   └────────────────────┘  └───────────────┘
                           │                       │                       │
                           │                       │                       │
                    File bytes in          Business rules +         SQL queries +
                    → structured           vocab resolution         field-level diff
                      domain model         → expected rows          → MismatchRecords
```

### 8.3 Component Lifecycle

```
Plugin Registration (startup)
    │
    ├── IcdD06Plugin registered as "icd_d06"
    ├── IcdD12Plugin registered as "icd_d12"
    └── ... (future plugins auto-discovered via entry points)

Per-Verification Execution
    │
    ├── 1. create_parser() → parse source file → ParsedFile
    ├── 2. create_expected_state_generator(parsed_file, vocab_client)
    │       └── generate_stage1() through generate_stage4()
    │           └── Returns List[Dict] per stage (EAV rows)
    ├── 3. Persist expected state to TestVerification schema
    ├── 4. create_comparator(entity_id_prefix)
    │       └── compare_stage1() through compare_stage4()
    │           └── Returns ComparatorResult (pass_count + mismatches)
    └── 5. Persist mismatches → finalize TestRun
```

### 8.4 Parser Abstraction

Parsers handle the physical file format and produce a normalized `ParsedFile` domain model. The abstraction boundary is strict: parsers know nothing about databases, vocabulary, or business rules.

| Interface | File Format | Parser Strategy |
|-----------|------------|-----------------|
| ICD-D06 | Pipe-delimited (.psv), 14 record types, 1500+ fields | Split on `\|`, route by `RecordType` column, type coerce per record schema |
| ICD-D12 | Fixed-width space-delimited (.txt), 2 record types, 69 fields | Positional extraction at known offsets, 1-char delimiter between fields |
| Future ICD-D07 | CSV or XML (TBD) | Would implement `parse_content()` with appropriate library |

### 8.5 Expected State Generator: Business Rule Encoding

The expected state generator is where **domain knowledge lives**. Each interface's business rules, composite field derivations, and vocabulary resolutions are encoded here. This is the "oracle" that answers: *given this inbound file, what should the database contain at each stage?*

For ICD-D12, the business rules include:

| Rule ID | Logic | Implementation |
|---------|-------|---------------|
| BR-D12-ADL | PersonalCare=Yes if any of 6 ADL help codes ∈ {001, 002} | `_determine_personal_care_needed()` |
| BR-D12-IADL | SupportiveHomeCare=Yes if any of 11 IADL/cognition fields indicate need | `_determine_supportive_home_care()` |
| BR-D12-MedAdmin | MedAdmin=Yes if MED_MGT_HELP_LVL_CD ∈ {003, 005, 006} | `_determine_med_admin_needed()` |
| BR-D12-MoneyMgt | MoneyMgt=Yes if MONY_MGT_HELP_LVL_CD ∈ {001, 002} | `_determine_money_mgt_needed()` |
| BR-D12-Transport | Transportation=Yes if TRNSP_DRV_CD ∈ {003, 004, 005, 006} | `_determine_transport_needed()` |
| BR-D12-DME | DME=Yes if any of 4 adaptive equipment fields is non-blank | `_determine_dme_needed()` |
| BR-D12-Overnight | OvernightCare=Yes if ONGHT_CARE_SPVS_CD ∈ {001, 002} | `_determine_overnight_care_needed()` |
| BR-D12-009 | PersonEmployment.Note built from concatenation of employment flags | Concatenation logic in stage 4 generation |

### 8.6 Comparator: Query Strategy

Comparators issue SQL against the live pipeline databases and diff the results against the persisted expected state. Each comparator implements a **checksum-first** optimization:

1. Load all expected columns for a given entity.
2. Query the actual row from the database.
3. Compare all columns at once (fast path — if all match, record N passes).
4. On mismatch, fall back to per-column comparison to identify exactly which fields differ.

For Stage 4 (Carity DB), comparators must navigate the CustomFormModule join hierarchy:

```
CustomFormInstance (filtered by CustomFormDefinitionKey)
    │
    ├── CaseCustomFormInstance (FK: CustomFormInstanceKey)
    │
    └── FieldAnswerBase (FK: CustomFormInstanceKey)
            │
            ├── SimpleSingleSelectFieldAnswer (FK: FieldAnswerBaseKey)
            └── DateFieldAnswer (FK: FieldAnswerBaseKey)
```

### 8.7 Cleanup: Declarative FK-Ordered Deletion

Plugins declare their cleanup targets as ordered lists. The framework executes DELETEs from children to parents, respecting FK constraints:

```python
# ICD-D12 Plugin cleanup declaration
pipeline_cleanup_config = [
    {"schema": "CustomerInterfaceModule", "table": "LongTermCareFunctionalScreenFormRaw",
     "filter_column": "MedicaidId"},
    {"schema": "CustomerInterfaceModule", "table": "LongTermCareFunctionalScreenForm",
     "filter_column": "MemberId"},
]

carity_cleanup_config = [
    # Children first (deepest FK dependency)
    {"schema": "CustomFormModule", "table": "SimpleSingleSelectFieldAnswer",
     "filter_column": "FieldAnswerBaseKey"},
    {"schema": "CustomFormModule", "table": "DateFieldAnswer",
     "filter_column": "FieldAnswerBaseKey"},
    {"schema": "CustomFormModule", "table": "FieldAnswerBase",
     "filter_column": "CustomFormInstanceKey"},
    {"schema": "CustomFormModule", "table": "CaseCustomFormInstance",
     "filter_column": "CustomFormInstanceKey"},
    # Parent last
    {"schema": "CustomFormModule", "table": "CustomFormInstance",
     "filter_column": "CustomFormInstanceKey"},
]
```

### 8.8 Stage Variability Across Interfaces

Not all interfaces use all 4 stages. The `default_stages` property allows plugins to declare which stages are applicable:

| Interface | Stages | Notes |
|-----------|--------|-------|
| ICD-D06 | [1, 2, 3, 4] | Full 4-stage pipeline with Incoming transformation layer |
| ICD-D12 | [1, 2, 4] | Stage 3 skipped — parsed data flows directly to CustomFormModule |
| Future ICD-Dxx | [1, 2, 3, 4] or [1, 2, 4] | Depends on whether pipeline has an Incoming layer |

The comparison engine respects `default_stages` — it only generates expected state and runs comparisons for declared stages. The comparator's `compare_stage3()` returns an empty `ComparatorResult` for D12.

### 8.9 Database Target Mapping by Interface

| Interface | Stage 1 Table | Stage 2 Table(s) | Stage 3 | Stage 4 DB + Schema |
|-----------|---------------|-------------------|---------|---------------------|
| ICD-D06 | `CustomerInterfaceModule.MedicaidProviderRaw` | 14 tables (one per record type) | 26 `InterfaceModule.Incoming*` tables | `WiDHS.Qc.Carity.ToolTestig` → `OrganizationModule.*` |
| ICD-D12 | `CustomerInterfaceModule.LongTermCareFunctionalScreenFormRaw` | `CustomerInterfaceModule.LongTermCareFunctionalScreenForm` | Skipped | `WiDHS.Qc.Carity.ToolTestig` → `CustomFormModule.*` + `PersonModule.*` |

### 8.10 Adding a New Interface Plugin

To add support for a new interface (e.g., ICD-D07 Authorization Response):

```
pl-test/src/interfaces/icd_d07/
├── __init__.py
├── models.py              # Dataclasses for parsed records
├── parser.py              # File format parser (CSV/XML/fixed-width)
├── expected_state.py      # Business rule oracle + vocab resolution
├── comparator.py          # Stage-by-stage DB queries + diff logic
├── plugin.py              # InterfacePlugin implementation (factory + metadata)
├── vocab_config.py        # Vocabulary key mappings
└── tests/
    └── test_parser.py     # Unit tests for the parser
```

Steps:
1. Define record models in `models.py`.
2. Implement `BaseParser.parse_content()` in `parser.py`.
3. Map business rules in `expected_state.py` (generate_stage1 through stage4).
4. Implement `BaseComparator.compare_stageN()` queries in `comparator.py`.
5. Wire up the plugin in `plugin.py` (declare metadata, factory methods, cleanup config).
6. Register the plugin in the plugin registry (typically auto-discovered).
7. Add vocab mappings in `vocab_config.py`.
8. Create test data SQL scripts in `data/icd_d07/`.

### 8.11 Spec-Driven Generation Pipeline

The system includes a **code generation toolchain** that accelerates plugin development. A YAML interface specification drives automated generation of test data files, SQL insert scripts, and plugin scaffolds. This is orchestrated through Kiro steering files (`.kiro/steering/`) and a CLI tool (`pl-test/tools/`).

#### Generation Flow

```
┌────────────────────────┐       ┌──────────────────────────┐       ┌───────────────────────────────┐
│ Interface Spec Document│       │  YAML Spec File          │       │  Generated Artifacts          │
│ (PDF / Excel / Word)   │       │  (data/icd_Dxx/ or       │       │                               │
│                        │       │   tools/specs/)          │       │  • Test data files (.txt/.psv)│
│ e.g. CMM-ICD-D12 v2.0  │──────>│                          │──────>│  • SQL insert scripts         │
│                        │  AI   │  meta:                   │ CLI   │  • SQL cleanup scripts        │
│ Fields, code tables,   │ +     │  format:                 │ tool  │  • TEST_SCENARIOS_README.md   │
│ business rules,        │ steer │  fields:                 │       │  • Plugin scaffold (optional) │
│ valid values           │ -ing  │  code_tables:            │       │    - models.py                │
│                        │       │  business_rules:         │       │    - parser.py                │
└────────────────────────┘       │  db_targets:             │       │    - expected_state.py        │
                                 │  cross_field_deps:       │       │    - comparator.py            │
                                 └──────────────────────────┘       │    - plugin.py                │
                                                                    └───────────────────────────────┘
```

#### Steering Files (`.kiro/steering/`)

Three steering files provide the AI assistant with the knowledge needed to produce accurate YAML specs:

| File | Inclusion | Purpose |
|------|-----------|---------|
| `generate-spec-from-document.md` | Manual | Instructs the AI how to read a specification PDF and produce a valid YAML file. Defines the exact YAML schema, field naming rules, extraction logic, and a validation checklist. |
| `interface-db.md` | Manual | Complete schema reference for `WiDHS.QcPhi.Interface.Carity` — the Interface/staging database. Provides column names, types, FK relationships, and index patterns so the AI can correctly populate `db_targets.stage1` through `stage3`. |
| `carity-db.md` | Manual | Complete schema reference for `WiDHS.QcPhi.Carity` — the production Carity database. Covers `PersonModule`, `CaseModule`, `CustomFormModule`, `OrganizationModule`, etc. Used to populate `db_targets.stage4`. |

The AI uses these steering files when a user provides a new interface specification document. By cross-referencing the spec document fields against the actual database schemas, it can produce a YAML that correctly maps source fields to their target database columns at each stage.

#### YAML Spec Schema

The YAML spec file acts as the **single source of truth** for an interface. It is consumed by:
1. The **Test Data Generator CLI** (`python -m tools.src.cli generate`)
2. The **SQL Script Generator** (`python -m tools.src.cli generate-sql`)
3. The **Plugin Scaffold Generator** (`python -m tools.src.cli scaffold`)
4. The **Expected State Generator** at runtime (business rules section)

Key sections and their consumers:

| YAML Section | Consumed By | Purpose |
|--------------|-------------|---------|
| `meta` | All generators | Interface identity (type, name, version, source system) |
| `format` | File Generator, Parser scaffold | Physical file format (delimiter, encoding, line endings) |
| `entity` | All generators | Primary entity ID field, length, test prefix for data isolation |
| `record_types` | File Generator, Parser scaffold | Record type codes and cardinality rules |
| `fields` | File Generator, SQL Generator, Parser/Model scaffold | Complete field catalog with lengths, types, and DB column mappings |
| `code_tables` | File Generator, Expected State scaffold | All valid code values and their display names |
| `business_rules` | Expected State scaffold, SQL Generator | Transformation logic, composite field derivations, filter rules |
| `cross_field_dependencies` | File Generator (composite scenarios) | Fields that determine other fields' values |
| `db_targets` | SQL Generator, Comparator scaffold | Database + schema + table + column mappings for all 4 stages |
| `naming` | File Generator | Output file naming convention (prefix, environment suffix, extension) |
| `test_scenarios` | File Generator | Scenario selection and configuration (volume size, mutations, deletions) |

#### CLI Commands

```bash
# Generate test data files (19 scenarios for D12)
python -m tools.src.cli generate \
    --spec data/icd_D12/ICD-D12-FSIA-File-Spec.yaml \
    --output data/icd_D12/

# Generate SQL insert/cleanup scripts (perfect match, partial mismatch, large mismatch)
python -m tools.src.cli generate-sql \
    --spec data/icd_D12/ICD-D12-FSIA-File-Spec.yaml \
    --output data/icd_D12/

# Scaffold a new plugin from a spec (developer workflow)
python -m tools.src.cli scaffold \
    --spec tools/specs/icd_d07.yaml \
    --output src/interfaces/icd_d07/

# List all available test scenario types
python -m tools.src.cli list-scenarios
```

#### Test Scenarios Generated

The File Generator produces test data files covering 16 scenario types:

| Category | Scenarios | Files Generated |
|----------|-----------|-----------------|
| **Standard (8)** | baseline, max_lengths, min_empty, boundary_dates, all_codes, special_chars, large_volume, composite_rules | Always included |
| **Extended (8)** | cross_field, duplicates, ordering, encoding, truncation, referential, historical, code_coverage | Opt-in via `--scenarios all` |

Additionally, the YAML can define **mutation scenarios** (UPD01–UPD06) and **deletion scenarios** (DEL01–DEL04) that simulate day-over-day changes to test update/delete pipeline behavior.

#### SQL Generator Output

The SQL Generator reads `db_targets` from the YAML and produces three scripts:

| Script | Purpose | Mismatch Count |
|--------|---------|---------------|
| `test_insert_01_perfect_match.sql` | All 4 stages consistent — validates zero mismatches | 0 |
| `test_insert_02_partial_mismatch.sql` | Intentional field-level errors in Stage 2 — validates detection | 3 |
| `test_insert_03_large_mismatch.sql` | Errors across multiple stages and members — validates reporting | 10+ |

Each script includes:
- Person prerequisite data (PersonModule hierarchy, Case, ProgramEnrollment)
- Stage 1 raw inserts (with correct database prefix)
- Stage 2 parsed inserts (with correct database prefix)
- Stage 4 final inserts (CustomFormModule hierarchy)
- Commented cleanup section (FK-ordered DELETEs)

#### Scaffold Generator Output

When a developer runs `scaffold`, the tool produces a complete plugin folder with working (but stub) implementations:

```
src/interfaces/icd_d07/
├── __init__.py           # Plugin registration
├── models.py             # Dataclasses with all fields from spec
├── parser.py             # File format parser with field extraction logic
├── expected_state.py     # Stage generators with business rule stubs (TODO markers)
├── comparator.py         # Stage comparators with correct table/column names
├── plugin.py             # Plugin metadata, factory methods, cleanup config
├── vocab_config.py       # Vocabulary key mappings from spec
└── tests/
    └── test_parser.py    # Basic parser unit test with sample data
```

The scaffold is production-ready for Stages 1–2 (parsing and raw comparison) and requires manual completion for Stages 3–4 where business rule logic needs human verification.

#### End-to-End Workflow Example

Creating a new interface from scratch:

```
1. Obtain interface specification PDF from WI DHS
                    │
                    ▼
2. Activate steering: #generate-spec-from-document + #interface-db + #carity-db
   Ask AI: "Read this PDF and generate a YAML spec"
                    │
                    ▼
3. AI produces:  data/icd_d07/ICD-D07-Spec.yaml
   (fields, code tables, business rules, db_targets — all derived from PDF + DB schemas)
                    │
                    ▼
4. CLI: python -m tools.src.cli generate --spec ... --output data/icd_d07/
   → 19+ test data files generated
                    │
                    ▼
5. CLI: python -m tools.src.cli generate-sql --spec ... --output data/icd_d07/
   → 3 SQL test scripts generated (with Person prerequisites + all 4 stages)
                    │
                    ▼
6. CLI: python -m tools.src.cli scaffold --spec ... --output src/interfaces/icd_d07/
   → Complete plugin folder generated (models, parser, comparator, etc.)
                    │
                    ▼
7. Developer reviews scaffold, completes business rule logic in expected_state.py
                    │
                    ▼
8. QA runs test: Upload test file → Compare → Verify 0 mismatches on perfect_match
```

This pipeline reduces the effort to onboard a new interface from days of manual coding to approximately 2–4 hours of review and business rule refinement.

---

## 8A. Sequence Diagrams

### 8A.1 Full Verification Flow (Parse → Compare → Report)

```
┌──────┐          ┌──────────┐          ┌──────────┐       ┌──────────┐      ┌──────────┐      ┌─────────┐
│  QA  │          │Streamlit │          │ FastAPI  │       │  Plugin  │      │  DBMgr   │      │Pipeline │
│ User │          │   UI     │          │ Backend  │       │  System  │      │(Interface│      │   DBs   │
└──┬───┘          └────┬─────┘          └────┬─────┘       └────┬─────┘      │+ Carity) │      └────┬────┘
   │                   │                     │                  │             └────┬─────┘           │
   │  Upload file      │                     │                  │                  │                 │
   │──────────────────>│                     │                  │                  │                 │
   │                   │  POST /api/files/   │                  │                  │                 │
   │                   │  upload             │                  │                  │                 │
   │                   │────────────────────>│                  │                  │                 │
   │                   │                     │  create_parser() │                  │                 │
   │                   │                     │─────────────────>│                  │                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  parse_content() │                  │                 │
   │                   │                     │<─────────────────│                  │                 │
   │                   │                     │   ParsedFile     │                  │                 │
   │                   │  200 OK (summary)   │                  │                  │                 │
   │                   │<────────────────────│                  │                  │                 │
   │  Parse summary    │                     │                  │                  │                 │
   │<──────────────────│                     │                  │                  │                 │
   │                   │                     │                  │                  │                 │
   │  Click "Compare"  │                     │                  │                  │                 │
   │──────────────────>│                     │                  │                  │                 │
   │                   │  POST /api/compare/ │                  │                  │                 │
   │                   │  run                │                  │                  │                 │
   │                   │────────────────────>│                  │                  │                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  create_expected │                  │                 │
   │                   │                     │  _state_generator│                  │                 │
   │                   │                     │─────────────────>│                  │                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │                  │  generate_       │                 │
   │                   │                     │                  │  stage1()        │                 │
   │                   │                     │                  │  ...             │                 │
   │                   │                     │                  │  generate_       │                 │
   │                   │                     │<─────────────────│  stage4()        │                 │
   │                   │                     │  expected rows   │                  │                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  INSERT expected │                  │                 │
   │                   │                     │  state rows      │                  │                 │
   │                   │                     │────────────────────────────────────>│                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  create_         │                  │                 │
   │                   │                     │  comparator()    │                  │                 │
   │                   │                     │─────────────────>│                  │                 │
   │                   │                     │                  │                  │                 │
   │  SSE: stage 1     │                     │                  │  compare_        │                 │
   │  progress         │                     │                  │  stage1()        │                 │
   │<──────────────────│<────────────────────│                  │                  │                 │
   │                   │                     │                  │  SELECT FROM     │                 │
   │                   │                     │                  │  Interface DB    │                 │
   │                   │                     │                  │───────────────────────────────────>│
   │                   │                     │                  │                  │                 │
   │                   │                     │                  │  actual rows     │                 │
   │                   │                     │                  │<───────────────────────────────────│
   │                   │                     │                  │                  │                 │
   │                   │                     │                  │  diff expected   │                 │
   │                   │                     │                  │  vs actual       │                 │
   │                   │                     │                  │  → mismatches    │                 │
   │                   │                     │<─────────────────│                  │                 │
   │                   │                     │  ComparatorResult│                  │                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  ... repeat for stages 2, 4 ...     │                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  INSERT mismatches                  │                 │
   │                   │                     │────────────────────────────────────>│                 │
   │                   │                     │                  │                  │                 │
   │                   │                     │  UPDATE TestRun  │                  │                 │
   │                   │                     │  (finalize)      │                  │                 │
   │                   │                     │────────────────────────────────────>│                 │
   │                   │                     │                  │                  │                 │
   │  SSE: complete    │  200 OK             │                  │                  │                 │
   │<──────────────────│<────────────────────│                  │                  │                 │
   │                   │                     │                  │                  │                 │
```

### 8A.2 Stage 4 Comparison Detail (ICD-D12 CustomFormModule)

This diagram shows how the D12 comparator navigates the CustomFormModule hierarchy to verify composite business rule outputs.

```
┌───────────┐                ┌──────────────────┐              ┌─────────────────────────────────────────┐
│Comparator │                │  Carity DB       │              │   Expected State (from generator)       │
│(ICD-D12)  │                │  WiDHS.Qc.Carity │              │                                         │
│           │                │  .ToolTestig     │              │  PersonalCare|9999999001 → "Yes"        │
└─────┬─────┘                └─────────┬────────┘              │  SupportiveHomeCare|9999999001 → "Yes"  │
      │                                │                       │  DME|9999999001 → "Yes"                 │
      │  compare_stage4(expected)      │                       │  EligDate|9999999001 → "2026-01-15"     │
      │                                │                       └─────────────────────────────────────────┘
      │  SELECT FROM CustomFormInstance│
      │  WHERE CustomFormDefinitionKey │
      │  = 'EA2E961E-...'              │
      │───────────────────────────────>│
      │                                │
      │  form instances (3 members)    │
      │<───────────────────────────────│
      │                                │
      │  SELECT FROM FieldAnswerBase   │
      │  JOIN CustomFormInstance       │
      │  WHERE CustomFormDefKey = ...  │
      │───────────────────────────────>│
      │                                │
      │  field answers (24 rows)       │
      │<───────────────────────────────│
      │                                │
      │  SELECT FROM                   │
      │  SimpleSingleSelectFieldAnswer │
      │  JOIN FieldAnswerBase          │
      │  JOIN CustomFormInstance       │
      │───────────────────────────────>│
      │                                │
      │  Yes/No answers (21 rows)      │
      │<───────────────────────────────│
      │                                │
      │  SELECT FROM DateFieldAnswer   │
      │  JOIN FieldAnswerBase          │
      │  JOIN CustomFormInstance       │
      │───────────────────────────────>│
      │                                │
      │  date answers (3 rows)         │
      │<───────────────────────────────│
      │                                │
      │                                │
      │  ┌─────────────────────────────────────────────────┐
      │  │  For each member × each expected field:         │
      │  │                                                 │
      │  │  1. Find member's actual row (by MedicaidId)    │
      │  │  2. Checksum compare all cols at once           │
      │  │  3. If mismatch → per-field diff                │
      │  │     → MismatchRecord{                           │
      │  │         stage=4,                                │
      │  │         target_db="WiDHS.Qc.Carity.ToolTestig", │
      │  │         target_table="SimpleSingleSelect...",   │
      │  │         expected="Yes", actual="No",            │
      │  │         business_rule="BR-D12-ADL"              │
      │  │       }                                         │
      │  └─────────────────────────────────────────────────┘
      │
      │  return ComparatorResult(pass_count=N, mismatches=[...])
      │
```

### 8A.3 Cleanup Sequence

```
┌──────┐       ┌──────────┐       ┌──────────┐       ┌──────────┐       ┌─────────┐
│  QA  │       │Streamlit │       │ FastAPI  │       │ Cleanup  │       │Pipeline │
│ User │       │   UI     │       │ Backend  │       │Orchestr. │       │   DBs   │
└──┬───┘       └────┬─────┘       └────┬─────┘       └────┬─────┘       └────┬────┘
   │                │                   │                  │                   │
   │ Click Cleanup  │                   │                  │                   │
   │───────────────>│                   │                  │                   │
   │                │ POST /api/cleanup │                  │                   │
   │                │ /pipeline/all     │                  │                   │
   │                │──────────────────>│                  │                   │
   │                │                   │                  │                   │
   │                │                   │  get plugin      │                   │
   │                │                   │  cleanup configs │                   │
   │                │                   │─────────────────>│                   │
   │                │                   │                  │                   │
   │                │                   │                  │  For each table   │
   │                │                   │                  │  in FK order:     │
   │                │                   │                  │                   │
   │                │                   │                  │  DELETE FROM      │
   │                │                   │                  │  [Schema].[Table] │
   │                │                   │                  │  WHERE filter_col │
   │                │                   │                  │  LIKE prefix%     │
   │                │                   │                  │──────────────────>│
   │                │                   │                  │                   │
   │                │                   │                  │  rows affected    │
   │                │                   │                  │<──────────────────│
   │                │                   │                  │                   │
   │                │                   │                  │  ... next table   │
   │                │                   │                  │──────────────────>│
   │                │                   │                  │                   │
   │                │                   │  cleanup summary │                   │
   │                │                   │<─────────────────│                   │
   │                │ 200 OK (counts)   │                  │                   │
   │                │<──────────────────│                  │                   │
   │ Cleanup done   │                   │                  │                   │
   │<───────────────│                   │                  │                   │
```

---

## 9. Vocabulary Lookups

The stored procedures use these tables for all transformations:

| Table | Purpose |
|-------|---------|
| `[InterfaceModule].[VocabularyLookup]` | Defines customer value → target column mappings |
| `[InterfaceModule].[VocabularyLookupDisplayNames]` | Maps `CustomerValue` → `DisplayName` + `Identifier` + `CodeSystemIdentifier` |

**Our system reads directly from these tables** — same source of truth as the pipeline.

```sql
SELECT DisplayName, Identifier, CodeSystemIdentifier
FROM [InterfaceModule].[VocabularyLookupDisplayNames] vld
JOIN [InterfaceModule].[VocabularyLookup] vl
    ON vld.VocabularyLookupKey = vl.VocabularyLookupKey
WHERE vl.CustomerSystemName = 'MedicaidProvider'
  AND vl.CustomerTableName = '<source_table>'
  AND vl.CustomerColumnName = '<source_column>'
  AND vld.CustomerValue = '<inbound_value>';
```

Each plugin declares its own `vocab_lookup_keys` property mapping logical names to the specific `CustomerSystemName`/`CustomerTableName`/`CustomerColumnName` triplets relevant to that interface.

---

## 10. Data Isolation

All pipeline tables are **appended** (not truncated). Test data is isolated using a reserved MCD ID prefix.

| Convention | Pattern | Example |
|-----------|---------|---------|
| Test MCD IDs | `000000000xxxxx` (9 leading zeros) | `000000000012345` |
| Production IDs | Different patterns | `123456789012345` |

**Filtering at each stage:**

| Stage | Filter |
|-------|--------|
| 1 (Raw) | `RawText LIKE '%000000000%'` |
| 2 (Parsed) | `MedicaidProviderNumber LIKE '00000000%'` |
| 3 (Incoming) | `Value LIKE '00000000%' AND TypeDisplayName = 'Medicaid Provider ID'` (via Identifiers) |
| 4 (Final) | Same as Stage 3 (via OrganizationIdentifiers / LocationIdentifiers) |

**Cleanup**: Plugins declare their cleanup targets via `pipeline_cleanup_config` and `carity_cleanup_config`. The framework executes DELETEs in FK-dependency order, supporting both direct-filter and FK-join patterns.

---

## 11. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | 3.13 |
| API Framework | FastAPI | ≥0.115 |
| Web UI | Streamlit | ≥1.38 |
| Database Driver | pyodbc (ODBC Driver 18) | ≥5.2 |
| AWS SDK | boto3 | ≥1.35 |
| Configuration | pydantic-settings | ≥2.5 |
| Container | Docker (ARM64/Graviton) | Python 3.13-slim-bookworm |
| Process Manager | supervisord | — |
| Infrastructure as Code | AWS CDK (TypeScript) | ≥2.x |
| Testing (Backend) | pytest + httpx | ≥8.3 |
| Testing (E2E) | Playwright | ≥1.60 |
| Cloud | AWS (ECS Fargate, ALB, S3, Secrets Manager, CloudWatch) | — |

---

## 12. QA Workflow

```
1. QA triggers file processing in the existing pipeline application (external)
2. QA opens pl-test in browser (via internal ALB URL)
3. QA selects interface type (ICD-D06 or ICD-D12)
4. QA loads the same test file (from S3 bucket or direct upload)
5. App parses the file → shows summary (providers/members, records, types)
6. QA clicks "Compare" → generates expected state + runs 4-stage verification
7. Progress updates stream in real-time via SSE
8. QA reviews Mismatch Report (filter by stage, drill-down, export CSV)
9. QA logs bugs or confirms pass
10. QA clicks "Cleanup" → removes test data from all 4 stages + TestVerification data
```

---

## 13. Web Application Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| **Dashboard** | `/` | Workflow diagram, API status, quick navigation |
| **Load File** | `/Load_File` | Upload .psv/.txt, browse S3, select interface type, view parse summary |
| **Compare** | `/Compare` | Run all-stage or per-stage comparison, progress streaming |
| **Mismatches** | `/Mismatches` | Filterable mismatch table, stage filter, CSV export |
| **Cleanup** | `/Cleanup` | Per-run cleanup, pipeline data cleanup (all/interface/carity), bulk cleanup |
| **Test Runs** | `/Test_Runs` | History of all verification runs with pass/fail status |

---

## 14. REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service info (name, version, status, DB connection details) |
| `GET` | `/health` | Health check |
| `POST` | `/api/test-runs/` | Create a new test run |
| `GET` | `/api/test-runs/` | List recent test runs (with optional filters) |
| `GET` | `/api/test-runs/{id}` | Get specific test run details |
| `POST` | `/api/test-runs/create` | Create test run with pre-generated ID |
| `POST` | `/api/test-runs/finalize` | Finalize a test run (set stage counts + status) |
| `POST` | `/api/files/upload` | Upload and parse a file |
| `POST` | `/api/files/parse-local` | Parse a file from local filesystem |
| `POST` | `/api/files/s3-load` | Download and parse a file from S3 |
| `POST` | `/api/files/s3-upload` | Upload a file to S3 then parse it |
| `GET` | `/api/files/s3-list` | List test files in S3 (cached 5 min) |
| `GET` | `/api/files/cached` | List files currently cached in memory |
| `GET` | `/api/files/interfaces` | List all registered interface plugins |
| `GET` | `/api/files/infer-interface` | Infer interface type from filename |
| `POST` | `/api/compare/run` | Run full 4-stage comparison |
| `POST` | `/api/compare/run-stage` | Run comparison for a single stage |
| `GET` | `/api/compare/progress/{id}` | SSE stream of comparison progress |
| `GET` | `/api/compare/mismatches/{id}` | Get mismatch details for a test run |
| `GET` | `/api/compare/summary/{id}` | Get summary for a test run |
| `POST` | `/api/cleanup/{id}` | Cleanup a specific test run |
| `DELETE` | `/api/cleanup/{id}` | Permanently delete a test run |
| `POST` | `/api/cleanup/pipeline/interface` | Clean pipeline data Stages 1-3 |
| `POST` | `/api/cleanup/pipeline/carity` | Clean pipeline data Stage 4 |
| `POST` | `/api/cleanup/pipeline/all` | Clean pipeline data all stages |
| `POST` | `/api/cleanup/test-data/all` | Bulk-delete all TestVerification data |

---

## 15. Project Structure

```
pipeline-testing/
├── data/                              # Test data files (by interface type)
│   ├── icd_d06/                       # D06 .psv test files
│   └── icd_d12/                       # D12 .txt test files
├── doc/                               # Design documents, specs, requirements
│   ├── design.md                      # This file
│   ├── requirements.md
│   └── specs/                         # Interface specification PDFs
├── pl-test/                           # Application source code
│   ├── src/
│   │   ├── main.py                    # FastAPI entry point
│   │   ├── api/                       # REST endpoints (test_runs, files, compare, cleanup)
│   │   ├── core/                      # Config, database manager, models
│   │   ├── interfaces/                # Plugin system
│   │   │   ├── base.py               # Abstract base classes
│   │   │   ├── icd_d06/              # Medicaid Provider File plugin
│   │   │   └── icd_d12/              # FSIA Functional Screen plugin
│   │   ├── services/                  # VocabClient
│   │   ├── clients/                   # S3Client
│   │   └── web/                       # Streamlit UI (app.py + pages/)
│   ├── tests/                         # Python integration tests (pytest)
│   ├── database/                      # SQL DDL scripts (TestVerification schema)
│   └── requirements.txt
├── tests/                             # Playwright E2E test suite
│   ├── atc/                           # Atomic Test Cases (62 tests)
│   ├── ujt/                           # User Journey Tests (11 tests)
│   ├── api/                           # API endpoint tests (48 tests)
│   ├── fixtures/                      # Shared fixtures, mocks, selectors
│   ├── scripts/                       # Coverage report generators
│   └── playwright.config.ts
├── deploy/                            # Containerization & AWS infrastructure
│   ├── Dockerfile                     # ARM64 multi-service container
│   ├── docker-compose.yml             # Local development
│   ├── supervisord.conf               # Runs FastAPI + Streamlit
│   └── cdk/                           # AWS CDK (TypeScript)
│       └── lib/pl-test-stack.ts       # ECS Fargate + ALB + Secrets
└── readme.md
```

---

## 16. Quality Assurance

### 16.1 Test Coverage

| Test Suite | Framework | Count | Purpose |
|-----------|-----------|-------|---------|
| **Python Integration Tests** | pytest + httpx | 111 | API endpoint validation, parser correctness, business rules |
| **Playwright ATCs** | Playwright | 62 | Single-behavior UI tests (mocked + live) |
| **Playwright UJTs** | Playwright | 11 | End-to-end user journey workflows |
| **Playwright API Tests** | Playwright | 48 | Direct REST endpoint testing |
| **Total** | | **232** | |

### 16.2 Test Strategy

Follows the [Carity Test Automation Strategy](../docs/test-strategy.md):
- **ATCs** validate one behavior each (parallel, fast)
- **UJTs** compose ATCs into sequential business workflows
- **API tests** validate REST contract (status codes, response shapes, error handling)
- Tags: `@smoke`, `@regression`, `@journey`, `@508`, `@negative`, `@boundary`

Full documentation: [`tests/README.md`](../tests/README.md)

---

## 17. Security

| Concern | Implementation |
|---------|---------------|
| **Authentication (UI)** | Username/password via environment variables (Secrets Manager in prod) |
| **Authentication (DB)** | SQL Authentication; credentials in Secrets Manager |
| **Network** | Internal ALB only — no internet exposure; VPN required |
| **Secrets** | All credentials via AWS Secrets Manager (never committed to code) |
| **Data Isolation** | MCD ID prefix ensures test data cannot collide with production |
| **Cleanup validation** | Prefix must be ≥5 characters to prevent broad deletes |
| **Container** | Non-root process; slim base image; ODBC driver only |

---

## 18. Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Single container (supervisor) | No independent scaling of API vs UI | Acceptable for internal QA tool with <10 concurrent users |
| No NAT Gateway | Cannot reach internet from container | S3 + Secrets Manager accessed via VPC endpoints or same-region |
| Carity DB typo ("ToolTestig") | Confusing but functional | Documented; actual server name used in code |
| No HTTPS on ALB | Traffic is unencrypted | Internal-only network; acceptable per security review |
| Record Type 09 ignored | Cannot verify Value Added records | No parsed table exists in the pipeline |
| ICD-D12 untested | May have comparison bugs | Testing pending as next priority |

---

## 19. Future Considerations

| Item | Description | Priority |
|------|-------------|----------|
| Additional interfaces (ICD-D07, etc.) | Each new interface = new plugin folder following existing pattern | As needed |
| HTTPS on ALB | Add ACM certificate for TLS termination | Low (internal only) |
| Auto-scaling | Scale ECS tasks if multiple QA staff run simultaneous comparisons | Low |
| Scheduled cleanup job | Nightly cleanup of orphaned `AutoTest_*` data older than 7 days | Medium |
| PHI masking in test evidence | Mask sensitive data in mismatch reports before sharing | Medium |
| ADO integration | Link test run results to Azure DevOps test plans | Future |
