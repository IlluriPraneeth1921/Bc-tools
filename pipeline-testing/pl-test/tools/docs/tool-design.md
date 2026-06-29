# Test Data Generator — Design Document

## Status: PROPOSED

---

## 1. Purpose

A tool that automates the creation of test data files, SQL insert scripts, and optionally Python plugin scaffolds for new pipeline interface specifications. It eliminates the manual, error-prone process of hand-crafting test files by:

1. **Parsing** an interface specification document (Excel or PDF)
2. **Extracting** field definitions, record types, delimiters, code tables, and business rules
3. **Generating** a structured intermediate representation (YAML)
4. **Producing** a complete test data package per interface

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         Test Data Generator Tool                                     │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                        INPUT LAYER                                            │  │
│  │                                                                               │  │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐     │  │
│  │  │ Excel Parser │    │  PDF Parser  │    │  YAML/JSON (manual input)   │     │  │
│  │  │ (openpyxl /  │    │ (pdfplumber /│    │  (pre-structured, for       │     │  │
│  │  │  pandas)     │    │  tabula-py)  │    │   advanced users)           │     │  │
│  │  └──────┬───────┘    └──────┬───────┘    └──────────────┬─────────────┘     │  │
│  │         │                   │                           │                    │  │
│  │         ▼                   ▼                           │                    │  │
│  │  ┌─────────────────────────────────┐                    │                    │  │
│  │  │  Spec Normalizer                │◄───────────────────┘                    │  │
│  │  │  (extracts fields, types,       │                                         │  │
│  │  │   codes, rules → unified model) │                                         │  │
│  │  └──────────────┬──────────────────┘                                         │  │
│  └─────────────────┼────────────────────────────────────────────────────────────┘  │
│                    ▼                                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                    INTERMEDIATE REPRESENTATION                                │  │
│  │                                                                               │  │
│  │  interface-spec.yaml                                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ name: "ICD-D07: Member Eligibility File"                                │  │  │
│  │  │ format: pipe-delimited | fixed-width | csv | xml                        │  │  │
│  │  │ delimiter: "|" | " " | ","                                              │  │  │
│  │  │ entity_id_field: "MemberNumber"                                         │  │  │
│  │  │ entity_id_prefix: "000000000"                                           │  │  │
│  │  │ record_types: [...]                                                     │  │  │
│  │  │ fields: [...]                                                           │  │  │
│  │  │ code_tables: {...}                                                      │  │  │
│  │  │ business_rules: [...]                                                   │  │  │
│  │  │ db_targets: { stage1: ..., stage2: ..., stage3: ..., stage4: ... }      │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                    │                                                                │
│                    ▼                                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                      GENERATION ENGINE                                        │  │
│  │                                                                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │  │
│  │  │ Test File   │ │ SQL Script  │ │ README      │ │ Plugin Scaffold         │ │  │
│  │  │ Generator   │ │ Generator   │ │ Generator   │ │ Generator (optional)    │ │  │
│  │  │             │ │             │ │             │ │                         │ │  │
│  │  │ • baseline  │ │ • stage1    │ │ • scenarios │ │ • models.py             │ │  │
│  │  │ • max-len   │ │ • stage2    │ │ • inventory │ │ • parser.py             │ │  │
│  │  │ • min-empty │ │ • stage3    │ │ • validation│ │ • expected_state.py     │ │  │
│  │  │ • boundary  │ │ • stage4    │ │ • execution │ │ • comparator.py         │ │  │
│  │  │ • all-codes │ │ • cleanup   │ │   order     │ │ • plugin.py             │ │  │
│  │  │ • special   │ │             │ │             │ │ • vocab_config.py       │ │  │
│  │  │ • volume    │ │             │ │             │ │ • __init__.py           │ │  │
│  │  │ • mutations │ │             │ │             │ │ • tests/test_parser.py  │ │  │
│  │  │ • deletions │ │             │ │             │ │                         │ │  │
│  │  │ • + custom  │ │             │ │             │ │                         │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                    │                                                                │
│                    ▼                                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                      SQL EXECUTION ASSISTANT                                  │  │
│  │                                                                               │  │
│  │  • Connect using pl-test .env configuration (pyodbc)                          │  │
│  │  • Dry-run mode (show SQL, don't execute)                                     │  │
│  │  • Environment selection (QC, F1, F3, Staging)                                │  │
│  │  • Execute stage-by-stage with confirmation                                   │  │
│  │  • Cleanup execution (reverse of insert order)                                │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                      DELIVERY INTERFACES                                      │  │
│  │                                                                               │  │
│  │  ┌────────────────────────┐        ┌────────────────────────────────────┐     │  │
│  │  │  CLI (Command Line)    │        │  Streamlit Web Page                │     │  │
│  │  │                        │        │  (integrated into pl-test UI)      │     │  │
│  │  │  python -m tools.cli   │        │                                    │     │  │
│  │  │    parse-spec           │        │  • Upload Excel/PDF               │     │  │
│  │  │    generate             │        │  • Preview extracted fields        │     │  │
│  │  │    run-sql              │        │  • Select scenarios to generate    │     │  │
│  │  │    scaffold             │        │  • Download generated package      │     │  │
│  │  └────────────────────────┘        │  • Execute SQL (with env selector) │     │  │
│  │                                    └────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Interface Specification YAML Schema

The intermediate representation is the heart of the system. Whether parsed from Excel/PDF or hand-authored, every interface resolves to this schema:

```yaml
# interface-spec.yaml — Complete example
meta:
  interface_type: "icd_d07"                    # Unique code (used in filenames, DB columns)
  display_name: "ICD-D07: Member Eligibility File"
  description: "Wisconsin DHS member eligibility and enrollment data"
  version: "1.0"
  source_system: "MMIS"
  file_extension: ".csv"

format:
  type: "pipe-delimited"                       # pipe-delimited | fixed-width | csv | xml | custom
  delimiter: "|"                               # Only for delimited formats
  has_header_record: true                      # Does the file start with a header row?
  has_trailer_record: false
  line_ending: "CRLF"                          # CRLF | LF
  encoding: "UTF-8"                            # UTF-8 | ASCII | Latin-1
  quote_char: null                             # For CSV: " or null

entity:
  id_field: "member_number"                    # Which field is the entity identifier
  id_length: 15                                # Expected length
  test_prefix: "000000000"                     # Prefix for test data isolation
  id_description: "Medicaid Member Number"

record_types:
  - code: "HDR"
    name: "Header"
    min_occurrence: 1
    max_occurrence: 1
    position: "first_line"
  - code: "DTL"
    name: "Detail"
    min_occurrence: 1
    max_occurrence: "unlimited"
    position: "body"
  # For multi-record-type files (like D06):
  # - code: "01"
  #   name: "Provider Main"
  #   min_occurrence: 1
  #   max_occurrence: 1
  #   per_entity: true
  # - code: "02"
  #   name: "Address"
  #   min_occurrence: 3
  #   max_occurrence: 10
  #   per_entity: true

fields:
  # Header fields (if has_header_record: true)
  header:
    - name: "record_type"
      length: 3
      type: "string"
      fixed_value: "HDR"
    - name: "creation_date"
      length: 8
      type: "date"
      format: "YYYYMMDD"
    - name: "record_count"
      length: 6
      type: "numeric"
      zero_padded: true

  # Detail fields (main record)
  detail:
    - name: "member_number"
      length: 15
      type: "string"
      required: true
      description: "Medicaid member ID"
    - name: "last_name"
      length: 30
      type: "string"
      required: true
      max_length: 30
      special_chars_allowed: true
    - name: "first_name"
      length: 20
      type: "string"
      required: true
    - name: "date_of_birth"
      length: 8
      type: "date"
      format: "YYYYMMDD"
      required: true
    - name: "gender_code"
      length: 1
      type: "code"
      code_table: "gender"
      required: true
    - name: "eligibility_start_date"
      length: 8
      type: "date"
      format: "YYYYMMDD"
    - name: "eligibility_end_date"
      length: 8
      type: "date"
      format: "YYYYMMDD"
    - name: "plan_code"
      length: 5
      type: "code"
      code_table: "plan_codes"
    # ... additional fields

code_tables:
  gender:
    values:
      "M": "Male"
      "F": "Female"
      "U": "Unknown"
  plan_codes:
    values:
      "MEDSV": "Medical Services"
      "DENTL": "Dental"
      "WVR": "Waiver"
      "MHSV": "Mental Health Services"

business_rules:
  - id: "BR-D07-001"
    description: "If eligibility_end_date < today, member is terminated"
    affects_fields: ["eligibility_end_date"]
    logic: "end_date < current_date → status = 'Terminated'"
  - id: "BR-D07-002"
    description: "Gender code determines vocab lookup for display name"
    affects_fields: ["gender_code"]
    type: "vocab_lookup"

cross_field_dependencies:
  - condition: "eligibility_end_date must be >= eligibility_start_date"
    fields: ["eligibility_start_date", "eligibility_end_date"]
  - condition: "If plan_code = 'WVR', waiver_program_code is required"
    fields: ["plan_code", "waiver_program_code"]

db_targets:
  stage1:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: "CustomerInterfaceModule"
    table: "MemberEligibilityRaw"
    mapping: "one_row_per_line"
  stage2:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: "CustomerInterfaceModule"
    tables:
      - name: "MemberEligibilityMain"
        record_type: "DTL"
        # Column mapping: field_name → DB column name
        columns:
          member_number: "MemberNumber"
          last_name: "LastName"
          first_name: "FirstName"
  stage3:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: "InterfaceModule"
    tables:
      - name: "IncomingPerson"
        columns:
          member_number: "CustomerPersonIdentifier"
  stage4:
    database: "WiDHS.Qc.Carity.ToolTestig"
    schema: "PersonModule"
    tables:
      - name: "Person"
        columns:
          member_number: "ExternalIdentifier"

naming_convention:
  file_prefix: "WI_ELIG_FILE_EXTRACT"       # Base filename
  environment_suffix: "_T"                    # _T for test, _P for prod
  extension: ".csv"

test_scenarios:
  # Override defaults or add custom scenarios
  additional:
    - type: "enrollment_transitions"
      description: "Test status changes: active → suspended → terminated → reactivated"
    - type: "plan_changes"
      description: "Member switches plans mid-period"
```

---

## 4. Test Scenario Types

### Standard Scenarios (always generated)

| # | Scenario | Code | Purpose |
|---|----------|------|---------|
| 0 | Baseline | `baseline` | Happy-path with all record types, 3 entities |
| 1 | Max Lengths | `max_lengths` | All fields at maximum documented length |
| 2 | Min/Empty | `min_empty` | Blank optional fields, minimum required only |
| 3 | Boundary Dates | `boundary_dates` | Edge dates: Jan 1, Dec 31, leap day, 99991231 |
| 4 | All Codes | `all_codes` | Every valid enumerated value exercised |
| 5 | Special Characters | `special_chars` | Apostrophes, hyphens, ampersands, unicode |
| 6 | Large Volume | `large_volume` | N entities (default 50) for performance testing |
| 7 | Composite Rules | `composite_rules` | Business rule boundary conditions |

### Extended Scenarios (user-selectable)

| # | Scenario | Code | Purpose |
|---|----------|------|---------|
| 8 | Cross-Field Dependencies | `cross_field` | Fields that affect each other's validity |
| 9 | Duplicate Detection | `duplicates` | Same entity appearing twice in one file |
| 10 | Ordering/Sequencing | `ordering` | Records in unexpected order within file |
| 11 | Encoding Edge Cases | `encoding` | UTF-8 BOM, extended ASCII, multi-byte chars |
| 12 | Truncation | `truncation` | Data slightly over max length |
| 13 | Referential Integrity | `referential` | Child without parent, parent without children |
| 14 | Historical Snapshots | `historical` | Multi-day feed simulation (day 0 → day 1 → day 2) |
| 15 | Code Coverage | `code_coverage` | Every code value appears at least once per entity |

### Mutation Scenarios (interface-specific, user-defined in YAML)

| Category | Examples |
|----------|----------|
| Field Updates | Name change, address change, status change |
| Record Addition | New sub-records added to existing entity |
| Record Removal | Sub-records disappear from extract |
| Entity Addition | New entities appear in next-day extract |
| Entity Removal | Entities disappear from extract (termination) |
| Status Transitions | Active → Suspended → Terminated → Reactivated |

---

## 5. Generated Output Structure

For interface type `icd_d07`, the tool produces:

```
data/
└── icd_d07/
    ├── generate_test_data.py                            # Standalone Python generator
    ├── TEST_SCENARIOS_README.md                         # Full documentation
    ├── WI_ELIG_FILE_EXTRACT_T.csv                      # 0: Baseline
    ├── WI_ELIG_FILE_EXTRACT_T_01_MAX_LENGTHS.csv       # 1: Max lengths
    ├── WI_ELIG_FILE_EXTRACT_T_02_MIN_EMPTY.csv         # 2: Min/empty
    ├── WI_ELIG_FILE_EXTRACT_T_03_BOUNDARY_DATES.csv    # 3: Boundary dates
    ├── WI_ELIG_FILE_EXTRACT_T_04_ALL_CODES.csv         # 4: All codes
    ├── WI_ELIG_FILE_EXTRACT_T_05_SPECIAL_CHARS.csv     # 5: Special chars
    ├── WI_ELIG_FILE_EXTRACT_T_06_LARGE_VOLUME.csv      # 6: Large volume
    ├── WI_ELIG_FILE_EXTRACT_T_07_COMPOSITE_RULES.csv   # 7: Business rules
    ├── WI_ELIG_FILE_EXTRACT_T_08_CROSS_FIELD.csv       # 8: Cross-field (if selected)
    ├── ...                                             # Additional selected scenarios
    ├── WI_ELIG_FILE_EXTRACT_T_UPD01_STATUS_CHANGES.csv # Mutation: status updates
    ├── WI_ELIG_FILE_EXTRACT_T_UPD02_PLAN_CHANGES.csv   # Mutation: plan changes
    ├── WI_ELIG_FILE_EXTRACT_T_DEL01_MEMBER_REMOVED.csv # Deletion: member gone
    ├── test_insert_01_perfect_match.sql                 # SQL: all 4 stages
    ├── test_insert_02_partial_mismatch.sql              # SQL: intentional mismatches
    └── test_insert_03_large_mismatch.sql                # SQL: many mismatches

# Optional scaffold output:
pl-test/src/interfaces/
└── icd_d07/
    ├── __init__.py
    ├── plugin.py              # InterfacePlugin implementation
    ├── models.py              # Dataclasses for parsed records
    ├── parser.py              # File parser (format-specific)
    ├── expected_state.py      # Expected state generator (4 stages)
    ├── comparator.py          # Database comparator
    ├── vocab_config.py        # Vocabulary lookup keys
    └── tests/
        ├── __init__.py
        └── test_parser.py     # Unit tests for parser
```

---

## 6. SQL Generation

### Insert Scripts

Each SQL file contains INSERT statements for all 4 stages:

```sql
-- test_insert_01_perfect_match.sql
-- Generated by: pl-test Test Data Generator
-- Interface: ICD-D07 Member Eligibility File
-- Scenario: Perfect Match (all stages consistent)

-- ═══ STAGE 1: Raw ═══
INSERT INTO [CustomerInterfaceModule].[MemberEligibilityRaw] (...)
VALUES (...);

-- ═══ STAGE 2: Parsed ═══
INSERT INTO [CustomerInterfaceModule].[MemberEligibilityMain] (...)
VALUES (...);

-- ═══ STAGE 3: Incoming ═══
INSERT INTO [InterfaceModule].[IncomingPerson] (...)
VALUES (...);

-- ═══ STAGE 4: Final ═══
INSERT INTO [PersonModule].[Person] (...)
VALUES (...);

-- ═══ CLEANUP (reverse order) ═══
-- DELETE FROM [PersonModule].[Person] WHERE ExternalIdentifier LIKE '000000000%';
-- DELETE FROM [InterfaceModule].[IncomingPerson] WHERE CustomerPersonIdentifier LIKE '000000000%';
-- DELETE FROM [CustomerInterfaceModule].[MemberEligibilityMain] WHERE MemberNumber LIKE '000000000%';
-- DELETE FROM [CustomerInterfaceModule].[MemberEligibilityRaw] WHERE MemberNumber LIKE '000000000%';
```

### SQL Execution Assistant

```
┌─────────────────────────────────────────────────────────────────┐
│  SQL Execution Assistant                                        │
│                                                                 │
│  Environment: [QC ▼]   Mode: [Dry Run ▼]                       │
│                                                                 │
│  Script: test_insert_01_perfect_match.sql                       │
│                                                                 │
│  Stages to execute:                                             │
│    [✓] Stage 1 — Raw (CustomerInterfaceModule.MemberEligRaw)    │
│    [✓] Stage 2 — Parsed (CustomerInterfaceModule.MemberEligMain)│
│    [✓] Stage 3 — Incoming (InterfaceModule.IncomingPerson)      │
│    [✓] Stage 4 — Final (PersonModule.Person)                    │
│                                                                 │
│  [Execute]  [Dry Run (Show SQL)]  [Cleanup]                     │
│                                                                 │
│  Output:                                                        │
│  ─────────                                                      │
│  Stage 1: 3 rows inserted ✓                                    │
│  Stage 2: 3 rows inserted ✓                                    │
│  Stage 3: 3 rows inserted ✓                                    │
│  Stage 4: 3 rows inserted ✓                                    │
│  Total: 12 rows across 4 stages                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. CLI Interface

```bash
# ═══════════════════════════════════════════════════════════════════
# Step 1: Parse a specification document → YAML
# ═══════════════════════════════════════════════════════════════════

# From Excel
python -m tools.cli parse-spec \
  --input "doc/specs/ICD-D07_Member_Eligibility_Layout.xlsx" \
  --output "tools/specs/icd_d07.yaml" \
  --format pipe-delimited

# From PDF
python -m tools.cli parse-spec \
  --input "doc/specs/ICD-D07_Spec.pdf" \
  --output "tools/specs/icd_d07.yaml"

# After parsing: user reviews and edits the YAML to fill gaps

# ═══════════════════════════════════════════════════════════════════
# Step 2: Generate test data files from YAML
# ═══════════════════════════════════════════════════════════════════

# Generate all standard scenarios
python -m tools.cli generate \
  --spec "tools/specs/icd_d07.yaml" \
  --output "data/icd_d07/" \
  --scenarios all

# Generate specific scenarios only
python -m tools.cli generate \
  --spec "tools/specs/icd_d07.yaml" \
  --output "data/icd_d07/" \
  --scenarios baseline,max_lengths,all_codes,large_volume

# Generate with custom volume size
python -m tools.cli generate \
  --spec "tools/specs/icd_d07.yaml" \
  --output "data/icd_d07/" \
  --scenarios large_volume \
  --volume-size 100

# List available scenarios
python -m tools.cli generate --list-scenarios

# ═══════════════════════════════════════════════════════════════════
# Step 3: Generate SQL insert scripts
# ═══════════════════════════════════════════════════════════════════

python -m tools.cli generate-sql \
  --spec "tools/specs/icd_d07.yaml" \
  --output "data/icd_d07/" \
  --scenarios perfect_match,partial_mismatch,large_mismatch

# ═══════════════════════════════════════════════════════════════════
# Step 4: Execute SQL against a target environment
# ═══════════════════════════════════════════════════════════════════

# Dry run (show SQL without executing)
python -m tools.cli run-sql \
  --script "data/icd_d07/test_insert_01_perfect_match.sql" \
  --env qc \
  --dry-run

# Execute against QC environment
python -m tools.cli run-sql \
  --script "data/icd_d07/test_insert_01_perfect_match.sql" \
  --env qc \
  --stages 1,2,3,4

# Execute only specific stages
python -m tools.cli run-sql \
  --script "data/icd_d07/test_insert_01_perfect_match.sql" \
  --env f1 \
  --stages 1,2

# Cleanup (delete test data)
python -m tools.cli run-sql \
  --script "data/icd_d07/test_insert_01_perfect_match.sql" \
  --env qc \
  --cleanup

# ═══════════════════════════════════════════════════════════════════
# Step 5: Generate plugin scaffold (optional)
# ═══════════════════════════════════════════════════════════════════

python -m tools.cli scaffold \
  --spec "tools/specs/icd_d07.yaml" \
  --output "pl-test/src/interfaces/icd_d07/"

# Generate scaffold + register plugin in __init__.py
python -m tools.cli scaffold \
  --spec "tools/specs/icd_d07.yaml" \
  --output "pl-test/src/interfaces/icd_d07/" \
  --register
```

---

## 8. Streamlit Web UI Integration

A new page added to the pl-test Streamlit app:

### Page: "Generate Test Data"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Generate Test Data                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── Step 1: Upload Specification ────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  [Upload Excel/PDF]  or  [Select existing YAML spec ▼]              │    │
│  │                                                                     │    │
│  │  Parsed Fields Preview:                                             │    │
│  │  ┌─────────────┬────────┬──────────┬──────────┬───────────┐        │    │
│  │  │ Field Name  │ Length │ Type     │ Required │ Codes     │        │    │
│  │  ├─────────────┼────────┼──────────┼──────────┼───────────┤        │    │
│  │  │ member_num  │ 15     │ string   │ yes      │ —         │        │    │
│  │  │ last_name   │ 30     │ string   │ yes      │ —         │        │    │
│  │  │ gender_code │ 1      │ code     │ yes      │ M, F, U   │        │    │
│  │  └─────────────┴────────┴──────────┴──────────┴───────────┘        │    │
│  │                                                                     │    │
│  │  [Edit YAML]  [Save YAML]                                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─── Step 2: Select Scenarios ────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Standard:                                                          │    │
│  │  [✓] Baseline  [✓] Max Lengths  [✓] Min/Empty  [✓] Boundary Dates  │    │
│  │  [✓] All Codes  [✓] Special Chars  [✓] Large Volume  [✓] Composite │    │
│  │                                                                     │    │
│  │  Extended:                                                          │    │
│  │  [ ] Cross-Field  [ ] Duplicates  [ ] Ordering  [ ] Encoding        │    │
│  │  [ ] Truncation  [ ] Referential  [ ] Historical  [ ] Code Coverage │    │
│  │                                                                     │    │
│  │  Volume size: [50]  Mutation count: [auto]                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─── Step 3: Generate ───────────────────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Output directory: data/icd_d07/                                    │    │
│  │                                                                     │    │
│  │  [Generate Test Files]  [Generate SQL]  [Generate Scaffold]         │    │
│  │                                                                     │    │
│  │  Status: ✅ 8 test files generated                                  │    │
│  │          ✅ 3 SQL scripts generated                                 │    │
│  │          ✅ Plugin scaffold created                                  │    │
│  │                                                                     │    │
│  │  [Download as ZIP]                                                  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
│  ┌─── Step 4: Execute SQL (optional) ─────────────────────────────────┐    │
│  │                                                                     │    │
│  │  Environment: [QC ▼]   Script: [test_insert_01_perfect_match ▼]     │    │
│  │  Stages: [✓] 1  [✓] 2  [✓] 3  [✓] 4                               │    │
│  │                                                                     │    │
│  │  [Dry Run]  [Execute]  [Cleanup]                                    │    │
│  │                                                                     │    │
│  │  Output:                                                            │    │
│  │  Stage 1: 3 rows inserted ✓                                        │    │
│  │  Stage 2: 3 rows inserted ✓                                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Spec Parsing Strategy

### Excel Parsing

The tool looks for tables with columns matching these patterns:

| Pattern | Interpretation |
|---------|---------------|
| "Field Name", "Name", "Column" | Field identifier |
| "Length", "Size", "Max Length", "Width" | Field length |
| "Type", "Data Type", "Format" | Field type (string, numeric, date, code) |
| "Required", "Mandatory", "Req" | Required flag |
| "Description", "Desc", "Notes" | Field description |
| "Valid Values", "Codes", "Allowed" | Code table values |
| "Position", "Start", "Pos" | Fixed-width position (if applicable) |

**Parsing flow:**
1. Read all sheets in the workbook
2. For each sheet, detect table boundaries (header row + data rows)
3. Map column headers to the standard field definition schema
4. Extract code tables from sheets named "Appendix", "Codes", "Lookups"
5. Present extracted fields to user for review/correction

### PDF Parsing

1. Extract all tables using `pdfplumber` (preferred) or `tabula-py`
2. Apply same column header pattern matching as Excel
3. Handle multi-page tables (detect continuation rows)
4. Extract code tables from appendix sections
5. Fall back to text extraction for unstructured sections (business rules)

### Confidence Scoring

After parsing, each field gets a confidence score:

| Score | Meaning |
|-------|---------|
| HIGH | All attributes detected automatically (name, length, type) |
| MEDIUM | Some attributes detected, others inferred |
| LOW | Field detected but attributes uncertain — user review needed |

Fields with LOW confidence are flagged in the review step.

---

## 10. Technology Stack

| Component | Library | Purpose |
|-----------|---------|---------|
| Excel Parsing | `openpyxl` + `pandas` | Read .xlsx files, detect tables |
| PDF Parsing | `pdfplumber` | Extract tables from PDF pages |
| PDF Fallback | `tabula-py` | Alternative table extraction |
| YAML | `pyyaml` + `ruamel.yaml` | Read/write spec files (preserves comments) |
| CLI | `click` or `typer` | Command-line interface with subcommands |
| SQL Execution | `pyodbc` (existing) | Reuse pl-test's DB connectivity |
| Streamlit UI | `streamlit` (existing) | Web interface page |
| File Generation | Standard library | Write formatted output files |
| Template Engine | `jinja2` | Generate SQL scripts and scaffold code |

---

## 11. Project Structure

```
tools/
├── docs/
│   └── tool-design.md              # This document
├── specs/                           # Saved interface spec YAMLs
│   ├── icd_d06.yaml                # (Generated from existing D06 spec)
│   └── icd_d12.yaml                # (Generated from existing D12 spec)
├── templates/                       # Jinja2 templates
│   ├── sql/
│   │   ├── insert_perfect_match.sql.j2
│   │   ├── insert_partial_mismatch.sql.j2
│   │   └── cleanup.sql.j2
│   ├── scaffold/
│   │   ├── plugin.py.j2
│   │   ├── models.py.j2
│   │   ├── parser.py.j2
│   │   ├── expected_state.py.j2
│   │   ├── comparator.py.j2
│   │   ├── vocab_config.py.j2
│   │   ├── __init__.py.j2
│   │   └── test_parser.py.j2
│   └── readme/
│       └── TEST_SCENARIOS_README.md.j2
├── src/
│   ├── __init__.py
│   ├── cli.py                       # Click/Typer CLI entry point
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── excel_parser.py          # Excel spec extraction
│   │   ├── pdf_parser.py            # PDF spec extraction
│   │   └── normalizer.py            # Unified spec model
│   ├── generators/
│   │   ├── __init__.py
│   │   ├── file_generator.py        # Test file output (all formats)
│   │   ├── sql_generator.py         # SQL insert/cleanup scripts
│   │   ├── readme_generator.py      # TEST_SCENARIOS_README.md
│   │   └── scaffold_generator.py    # Python plugin scaffold
│   ├── scenarios/
│   │   ├── __init__.py
│   │   ├── base.py                  # Scenario base class
│   │   ├── baseline.py              # Scenario 0: baseline
│   │   ├── max_lengths.py           # Scenario 1: max lengths
│   │   ├── min_empty.py             # Scenario 2: min/empty
│   │   ├── boundary_dates.py        # Scenario 3: boundary dates
│   │   ├── all_codes.py             # Scenario 4: all codes
│   │   ├── special_chars.py         # Scenario 5: special characters
│   │   ├── large_volume.py          # Scenario 6: large volume
│   │   ├── composite_rules.py       # Scenario 7: composite rules
│   │   ├── cross_field.py           # Scenario 8: cross-field deps
│   │   ├── duplicates.py            # Scenario 9: duplicates
│   │   ├── ordering.py              # Scenario 10: ordering
│   │   ├── encoding.py              # Scenario 11: encoding
│   │   ├── truncation.py            # Scenario 12: truncation
│   │   ├── referential.py           # Scenario 13: referential integrity
│   │   ├── historical.py            # Scenario 14: historical snapshots
│   │   └── code_coverage.py         # Scenario 15: code coverage
│   ├── sql_executor.py              # DB execution assistant
│   └── models.py                    # Pydantic models for spec schema
├── web/
│   └── generate_page.py             # Streamlit page integration
├── requirements.txt                 # Tool-specific dependencies
└── README.md                        # Usage guide
```

---

## 12. Workflow: End-to-End Example

### New Interface: ICD-D07 Member Eligibility File

```
Step 1: QA receives spec document
         ↓
         "doc/specs/ICD-D07_Member_Eligibility_Layout.xlsx"

Step 2: Parse the spec (CLI or UI)
         ↓
         python -m tools.cli parse-spec --input "doc/specs/ICD-D07_...xlsx" --output "tools/specs/icd_d07.yaml"
         ↓
         Tool extracts 45 fields, 3 code tables, 2 business rules
         Flags 4 fields as LOW confidence → user reviews YAML

Step 3: User reviews and edits icd_d07.yaml
         ↓
         Fixes field types, adds missing business rules, confirms DB targets

Step 4: Generate test data (CLI or UI)
         ↓
         python -m tools.cli generate --spec "tools/specs/icd_d07.yaml" --output "data/icd_d07/" --scenarios all
         ↓
         Creates: 8 standard files + mutations + deletions + SQL scripts + README

Step 5: (Optional) Generate plugin scaffold
         ↓
         python -m tools.cli scaffold --spec "tools/specs/icd_d07.yaml" --output "pl-test/src/interfaces/icd_d07/"
         ↓
         Creates: plugin.py, models.py, parser.py, etc. (with TODOs for business logic)

Step 6: Execute SQL to seed test DB
         ↓
         python -m tools.cli run-sql --script "data/icd_d07/test_insert_01_perfect_match.sql" --env qc
         ↓
         Inserts test data into all 4 stages in QC environment

Step 7: Run pl-test comparison against the seeded data
         ↓
         QA uses the web UI: Load File → Compare → Verify all pass

Step 8: Cleanup
         ↓
         python -m tools.cli run-sql --script "..." --env qc --cleanup
```

---

## 13. Environment Configuration

The SQL executor reuses pl-test's existing `.env` pattern:

```ini
# tools/.env (or inherits from pl-test/.env)
# Environment-specific overrides

[default]
DB_SERVER=mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com
DB_USE_TRUSTED_CONNECTION=true

[qc]
INTERFACE_DB_NAME=WiDHS.Qc.Interface.Carity.ToolTesting
CARITY_DB_NAME=WiDHS.Qc.Carity.ToolTestig

[f1]
INTERFACE_DB_NAME=WiDHS.F1.Interface.Carity.ToolTesting
CARITY_DB_NAME=WiDHS.F1.Carity.ToolTesting

[staging]
INTERFACE_DB_NAME=WiDHS.Staging.Interface.Carity.ToolTesting
CARITY_DB_NAME=WiDHS.Staging.Carity.ToolTesting
```

---

## 14. Plugin Scaffold Generation

The scaffold generator creates a complete, compilable plugin with `TODO` markers:

```python
# Generated: pl-test/src/interfaces/icd_d07/expected_state.py

class IcdD07ExpectedStateGenerator(BaseExpectedStateGenerator):
    """
    Expected state generator for ICD-D07 Member Eligibility File.
    Auto-generated by Test Data Generator tool.
    """

    def generate_stage1(self) -> List[Dict[str, Any]]:
        """Stage 1: One raw row per source line."""
        expected_rows = []
        for source_line in self.parsed_file.source_lines:
            expected_rows.append({
                "line_number": source_line.line_number,
                "RecordType": source_line.record_type,
                "RawText": source_line.raw_text,
            })
        return expected_rows

    def generate_stage2(self) -> List[Dict[str, Any]]:
        """Stage 2: Parsed fields.
        
        TODO: Implement field-level expected state based on DB column mappings.
        """
        # Auto-generated column mappings from spec:
        # member_number → MemberNumber
        # last_name → LastName
        # ... (from YAML db_targets.stage2.tables[].columns)
        raise NotImplementedError("Implement Stage 2 expected state")

    def generate_stage3(self) -> List[Dict[str, Any]]:
        """Stage 3: Transformed/Incoming.
        
        TODO: Implement business rule transformations.
        Business rules from spec:
        - BR-D07-001: If eligibility_end_date < today → status = 'Terminated'
        - BR-D07-002: Gender code → vocab lookup
        """
        raise NotImplementedError("Implement Stage 3 expected state")

    def generate_stage4(self) -> List[Dict[str, Any]]:
        """Stage 4: Final (straight copy from Stage 3)."""
        return self.generate_stage3()
```

---

## 15. Dependencies (tools/requirements.txt)

```
# Spec parsing
openpyxl>=3.1.0
pandas>=2.2.0
pdfplumber>=0.11.0
tabula-py>=2.9.0

# YAML handling (preserves comments)
ruamel.yaml>=0.18.0

# CLI
typer>=0.12.0
rich>=13.0.0

# Templates
jinja2>=3.1.0

# DB execution (reuses pl-test's pyodbc)
pyodbc>=5.2.0

# Existing (from pl-test)
pydantic>=2.9.0
pydantic-settings>=2.5.0
```

---

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Excel/PDF parsing unreliable for unusual layouts | Fields extracted incorrectly | Confidence scoring + mandatory user review step |
| Business rules too complex for auto-extraction | Incomplete scenario generation | Scaffold includes TODO markers; rules defined in YAML manually |
| DB schema changes between environments | SQL scripts fail in some environments | Schema overrides in YAML; dry-run mode to catch errors |
| Generated scaffold may not compile | Developer needs to fix | Generated code includes type stubs and clear TODOs |
| PDF table detection failure | No fields extracted | Fallback to tabula-py; option to skip PDF and use YAML directly |

---

## 17. Success Criteria

The tool is considered successful when:

1. A new interface spec (Excel) can be converted to a working test data package in under **30 minutes** (vs. 2-3 days manually)
2. All 8 standard scenario files are generated correctly for any text-based format
3. SQL scripts execute without error in dry-run mode
4. Generated scaffold compiles and passes basic import tests
5. Tool handles both D06-style (multi-record-type, pipe-delimited) and D12-style (single-record-type, fixed-width) without code changes
6. Non-technical QA staff can use the Streamlit UI without developer assistance

---

## 18. Open Questions for Future Consideration

| # | Question | Impact |
|---|----------|--------|
| 1 | Should the tool validate generated files against the spec (self-test)? | Quality assurance of generator output |
| 2 | Should generated SQL include FK relationships between stages? | More realistic test data |
| 3 | Should the tool generate negative test files (intentionally invalid data)? | Testing system's error handling |
| 4 | Should there be a "regenerate" command that updates files when the spec YAML changes? | Maintenance workflow |
| 5 | Should the Streamlit page allow editing the YAML visually (form-based)? | UX for non-YAML users |
