---
inclusion: manual
---

# Generate Interface Specification YAML from Document

When the user asks you to read a specification document (PDF or Excel) and generate a YAML spec file, follow this process precisely.

## Your Task

Read the attached or referenced interface specification document and produce a YAML file in the **exact format** expected by the pl-test Test Data Generator tool (located at `pl-test/tools/`).

## Output Location

Save the generated YAML file to: `pl-test/tools/specs/{interface_type}.yaml`

## Required YAML Structure

The output YAML **must** contain all of these top-level sections:

```yaml
meta:          # Interface identity
format:        # File format details
entity:        # Primary entity identifier
record_types:  # Record type definitions
fields:        # Field definitions (header + detail per record type)
code_tables:   # All enumerated value sets
business_rules: # Transformation/validation rules
db_targets:    # Database targets for all 4 pipeline stages
naming:        # Output file naming convention
test_scenarios: # Configuration for test generation
```

## Extraction Rules

### meta
- `interface_type`: lowercase code derived from the interface name (e.g., `icd_d06`, `icd_d12`)
- `display_name`: full human-readable name from the document title
- `description`: one-sentence description of what this interface carries
- `version`: document version number
- `source_system`: the sending system name (e.g., "MMIS", "FSIA")
- `file_extension`: the file type (`.psv`, `.txt`, `.csv`, `.xml`)

### format
- `type`: one of `pipe-delimited`, `fixed-width`, `csv`, `tab-delimited`, `xml`
- `delimiter`: the actual delimiter character (`|`, ` `, `,`, `\t`)
- `has_header_record`: true if file starts with a header/HDR record
- `has_trailer_record`: true if file ends with a trailer record
- `line_ending`: `CRLF` or `LF`
- `encoding`: `UTF-8` or `ASCII`

### entity
- `id_field`: the snake_case name of the field that uniquely identifies each entity
- `id_length`: the length of that field
- `test_prefix`: a prefix of zeros used for test data isolation (typically `"000000000"` for 15-char IDs or `"0000000"` for 10-char IDs)
- `id_description`: human-readable description

### record_types
List every record type in the file. For simple files (HDR + DTL), use:
```yaml
record_types:
  - code: HDR
    name: Header
    min_occurrence: 1
    max_occurrence: "1"
    per_entity: false
  - code: DTL
    name: Detail
    min_occurrence: 1
    max_occurrence: unlimited
    per_entity: true
```

For multi-record-type files (like pipe-delimited with record types 01-14), list each:
```yaml
record_types:
  - code: "00"
    name: Header
    per_entity: false
  - code: "01"
    name: Provider Main
    per_entity: true
  - code: "02"
    name: Address
    min_occurrence: 3
    max_occurrence: "10"
    per_entity: true
```

### fields
Group fields by record type. Use these keys:
```yaml
fields:
  header:   # (or "00" for pipe-delimited)
    - name: field_name_snake_case
      length: 10
      type: string          # string | numeric | date | code | flag | identifier
      required: true        # true if mandatory
      description: "..."    # from the spec
      format: YYYYMMDD      # for date fields only
      code_table: table_name # reference to code_tables section
      fixed_value: HDR      # if this field always has the same value
      zero_padded: true     # if numeric field is zero-padded
      db_column: PascalCase # the actual database column name
  detail:   # (or "01", "02", etc.)
    - ...
```

**Field naming rules:**
- Use snake_case (e.g., `medicaid_provider_number`, `bath_help_cd`)
- Derive from the spec's "Data Element" or "Field Name" column
- Keep abbreviations from the spec (e.g., `cd` for code, `dt` for date, `flg` for flag)

**Field type rules:**
- `string`: free text
- `numeric`: numbers (counts, amounts)
- `date`: date values (always specify `format: YYYYMMDD` or similar)
- `code`: enumerated value from a code table (set `code_table:`)
- `flag`: Y/N or 0/1 indicator
- `identifier`: entity ID, NPI, TIN, etc.

### code_tables
Extract ALL valid value sets from the spec (appendices, "valid values" columns, lookup tables):
```yaml
code_tables:
  table_name:
    name: table_name
    description: "Optional description"
    values:
      "code1": "Description 1"
      "code2": "Description 2"
```

**Important:** Quote all code values as strings (even numeric ones like `"001"`, `"24"`).

### business_rules
Extract transformation rules, composite field logic, and validation rules:
```yaml
business_rules:
  - id: BR-XXX-001
    description: "Human-readable rule"
    affects_fields: [field1, field2]
    logic: "condition → result"
    type: composite    # composite | vocab_lookup | filter | transformation | validation
```

### db_targets
Define database targets for all 4 pipeline stages:
- **Stage 1** (Raw): Usually `CustomerInterfaceModule` schema, raw table
- **Stage 2** (Parsed): Usually `CustomerInterfaceModule` schema, parsed tables
- **Stage 3** (Incoming/Transformed): Usually `InterfaceModule` or `CustomFormModule` schema
- **Stage 4** (Final/Carity): Usually in the Carity database (`WiDHS.Qc.Carity.ToolTestig`)

```yaml
db_targets:
  stage1:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: CustomerInterfaceModule
    tables:
      - name: TableName
        filter_column: EntityIdColumn
  stage2:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: CustomerInterfaceModule
    tables:
      - name: TableName
        columns:
          source_field: DBColumnName
        filter_column: EntityIdColumn
  stage3:
    database: "WiDHS.Qc.Interface.Carity.ToolTesting"
    schema: InterfaceModule
    tables:
      - name: IncomingTableName
        filter_column: CustomerIdentifierColumn
  stage4:
    database: "WiDHS.Qc.Carity.ToolTestig"
    schema: TargetSchema
    tables:
      - name: FinalTableName
        filter_column: IdentifierColumn
```

### naming
```yaml
naming:
  file_prefix: WI_PROV_FILE_EXTRACT    # base filename from the spec
  environment_suffix: "_T"              # always "_T" for test
  extension: ".psv"                     # matches format
```

### test_scenarios
```yaml
test_scenarios:
  volume_size: 50                       # default entity count for volume test
```

## Reference Examples

Look at these existing specs for format reference:
- `pl-test/tools/specs/icd_d12_example.yaml` — fixed-width format (D12 FSIA)
- `pl-test/tools/specs/nk_d12.yaml` — simplified fixed-width example

## Validation Checklist

Before saving the YAML, verify:
- [ ] All fields from the spec document are included
- [ ] Field lengths match the spec exactly
- [ ] All code tables are complete (every valid value listed)
- [ ] Required fields are marked `required: true`
- [ ] Date fields have `format: YYYYMMDD`
- [ ] Entity ID field matches `entity.id_field`
- [ ] Code fields reference their `code_table` by name
- [ ] DB column names are PascalCase
- [ ] Business rules capture the key transformation logic
- [ ] File naming matches the spec's file naming convention
