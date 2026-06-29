# YAML Spec Schema Reference

Complete reference for the interface specification YAML format.

## Full Schema (all possible fields)

```yaml
# ═══════════════════════════════════════════════════════════════════════════════
# INTERFACE SPECIFICATION — Standard Format
# ═══════════════════════════════════════════════════════════════════════════════

# ─── Identity ─────────────────────────────────────────────────────────────────
meta:
  interface_type: "icd_d06"              # REQUIRED. Unique code (lowercase, underscores)
  display_name: "ICD-D06: Medicaid Provider File"  # REQUIRED. Human-readable
  description: "..."                     # Optional. One-sentence summary
  version: "1.0"                         # Optional. Spec version
  source_system: "MMIS"                  # Optional. Sending system
  file_extension: ".psv"                 # REQUIRED. File type

# ─── File Format ──────────────────────────────────────────────────────────────
format:
  type: "pipe-delimited"                 # REQUIRED. One of:
                                         #   pipe-delimited | fixed-width | csv |
                                         #   tab-delimited | xml | custom
  delimiter: "|"                         # Delimiter char. Use " " for fixed-width
  has_header_record: true                # Does file start with a header line?
  has_trailer_record: false              # Does file end with a trailer line?
  line_ending: "CRLF"                    # CRLF or LF
  encoding: "UTF-8"                      # UTF-8 or ASCII
  quote_char: null                       # For CSV: " or null

# ─── Primary Entity ──────────────────────────────────────────────────────────
entity:
  id_field: "medicaid_provider_number"   # REQUIRED. Field name (from fields.detail)
  id_length: 15                          # REQUIRED. Length of the ID field
  test_prefix: "000000000"              # REQUIRED. Prefix for test data isolation
  id_description: "Medicaid Provider Number"  # Human-readable name

# ─── Record Types ─────────────────────────────────────────────────────────────
record_types:
  - code: "HDR"                          # Record type identifier
    name: "Header"                       # Human-readable name
    min_occurrence: 1                    # Minimum per file
    max_occurrence: "1"                  # Maximum per file (number or "unlimited")
    per_entity: false                    # Per-file (false) or per-entity (true)
    position: "first_line"              # Optional: first_line, last_line, body
  - code: "DTL"
    name: "Detail"
    min_occurrence: 1
    max_occurrence: "unlimited"
    per_entity: true

# ─── Field Definitions ────────────────────────────────────────────────────────
fields:
  # Group by record type code (or "header"/"detail" for simple formats)
  header:
    - name: "record_type"                # REQUIRED. snake_case
      length: 3                          # REQUIRED. Max characters
      type: "string"                     # REQUIRED. string|numeric|date|code|flag|identifier
      required: false                    # Is this field mandatory?
      description: ""                    # Human-readable description
      format: null                       # Date format: "YYYYMMDD", "MM/DD/YYYY", etc.
      code_table: null                   # Reference to code_tables key
      fixed_value: "HDR"                 # If field always has this value
      zero_padded: false                 # Numeric fields: left-pad with zeros?
      special_chars_allowed: true        # Can this field contain special chars?
      position: null                     # Start position (fixed-width only)
      db_column: null                    # PascalCase DB column name (e.g., "RecordType")

  detail:
    - name: "medicaid_provider_number"
      length: 15
      type: "identifier"
      required: true
      description: "Medicaid provider ID number"
      db_column: "MedicaidProviderNumber"
    - name: "provider_full_name"
      length: 50
      type: "string"
      required: true
      db_column: "ProviderFullName"
    - name: "organization_type_code"
      length: 1
      type: "code"
      code_table: "org_type_codes"       # Must match a key in code_tables
      db_column: "OrganizationTypeCode"
    - name: "revalidation_date"
      length: 8
      type: "date"
      format: "YYYYMMDD"
      db_column: "RevalidationDate"
    - name: "xml_indicator"
      length: 1
      type: "flag"
      description: "Y or N"
      db_column: "XmlIndicator"

# ─── Code Tables (Enumerations) ──────────────────────────────────────────────
code_tables:
  org_type_codes:                        # Key must match field's code_table value
    name: "org_type_codes"               # Same as key
    description: "Organization Type"     # Optional
    values:                              # REQUIRED. All valid code→description pairs
      "1": "For Profit"                  # Always quote codes as strings
      "2": "Not for Profit"
      "3": "Government"
      "4": "Sole Proprietor"

  billing_indicator_codes:
    name: "billing_indicator_codes"
    values:
      "Y": "Biller"
      "N": "Performer"
      "B": "Biller and Performer"
      "R": "Referring/Prescribing/Ordering"

# ─── Business Rules ───────────────────────────────────────────────────────────
business_rules:
  - id: "BR-D06-001"                     # Unique rule ID
    description: "Active status requires WVR contract + IRIS waiver program"
    affects_fields:                      # Fields involved in this rule
      - "contract_code"
      - "waiver_program_code"
    logic: "WVR contract (status A, current) AND IRIS program (current) → Active"
    type: "composite"                    # composite|vocab_lookup|filter|transformation|validation

# ─── Cross-Field Dependencies ────────────────────────────────────────────────
cross_field_dependencies:
  - condition: "If contract_end_date < today, status must be Terminated"
    fields: ["contract_end_date", "status"]
  - condition: "If plan_code = 'WVR', waiver_program_code is required"
    fields: ["plan_code", "waiver_program_code"]

# ─── Database Targets (4 Pipeline Stages) ────────────────────────────────────
db_targets:
  stage1:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: "CustomerInterfaceModule"
    tables:
      - name: "MedicaidProviderRaw"
        filter_column: "MedicaidProviderNumber"
    mapping: "one_row_per_line"          # How source maps to DB rows

  stage2:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: "CustomerInterfaceModule"
    tables:
      - name: "MedicaidProviderMain"
        record_type: "01"                # Which source record type maps here
        columns:                         # source_field → DB column
          medicaid_provider_number: "MedicaidProviderNumber"
          provider_full_name: "ProviderFullName"
          organization_type_code: "OrganizationTypeCode"
        filter_column: "MedicaidProviderNumber"
      - name: "MedicaidProviderAddress"
        record_type: "02"
        columns:
          medicaid_provider_number: "MedicaidProviderNumber"
          address_type_code: "AddressTypeCode"
        filter_column: "MedicaidProviderNumber"

  stage3:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: "InterfaceModule"
    tables:
      - name: "IncomingOrganization"
        columns:
          medicaid_provider_number: "CustomerProviderIdentifier"
        filter_column: "CustomerProviderIdentifier"

  stage4:
    database: "WiDHS.Qc.Carity.ToolTestig"
    schema: "OrganizationModule"
    tables:
      - name: "Organization"
        columns:
          medicaid_provider_number: "ExternalIdentifier"
        filter_column: "ExternalIdentifier"

# ─── File Naming Convention ───────────────────────────────────────────────────
naming:
  file_prefix: "WI_PROV_FILE_EXTRACT"   # Base filename
  environment_suffix: "_T"              # Always "_T" for test files
  extension: ".psv"                     # Matches format.file_extension

# ─── Test Scenario Configuration ─────────────────────────────────────────────
test_scenarios:
  volume_size: 50                        # Entities for large_volume scenario
  # mutations and deletions are interface-specific (optional):
  mutations:
    - code: "UPD01"
      name: "ADDRESS_CHANGES"
      description: "Provider address updated"
      fields_affected: ["street_address", "city", "zip_code"]
  deletions:
    - code: "DEL01"
      name: "PROVIDER_REMOVED"
      description: "Provider no longer in extract"
```

## Field Type Reference

| Type | Use For | Examples |
|------|---------|---------|
| `string` | Free text | Names, addresses, descriptions |
| `numeric` | Numbers | Counts, amounts, sequences |
| `date` | Date values | Always add `format: YYYYMMDD` |
| `code` | Enumerated values | Always add `code_table: table_name` |
| `flag` | Y/N or 0/1 | Indicators, boolean fields |
| `identifier` | Entity IDs | MCD numbers, NPIs, TINs |

## Naming Conventions

- **Field names**: `snake_case` (e.g., `medicaid_provider_number`)
- **DB columns**: `PascalCase` (e.g., `MedicaidProviderNumber`)
- **Code table keys**: `snake_case_codes` (e.g., `org_type_codes`)
- **Business rule IDs**: `BR-{interface}-{number}` (e.g., `BR-D06-001`)
- **Interface types**: `lowercase_with_underscores` (e.g., `icd_d06`)
