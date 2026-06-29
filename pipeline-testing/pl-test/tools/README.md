# Test Data Generator Tool

Takes a YAML/JSON interface specification and generates test data files + SQL scripts.

## How It Works

```
YAML/JSON Spec  ──→  Test Data Files (to S3 or local)
(standard format)    SQL Insert/Cleanup Scripts
                     TEST_SCENARIOS_README.md
```

The YAML spec defines: fields, record types, code tables, business rules, and DB targets.
It's authored by humans or AI from reading an interface specification document.

## Usage (CLI)

```bash
cd pl-test

# List available test scenarios
python -m tools.src.cli list-scenarios

# Generate test data files
python -m tools.src.cli generate --spec tools/specs/icd_d12_example.yaml --output data/icd_d12_gen/

# Generate SQL scripts
python -m tools.src.cli generate-sql --spec tools/specs/icd_d12_example.yaml --output data/icd_d12_gen/

# Generate with specific scenarios only
python -m tools.src.cli generate --spec tools/specs/icd_d12_example.yaml --output data/icd_d12_gen/ --scenarios baseline,all_codes,large_volume

# Generate with custom volume size
python -m tools.src.cli generate --spec tools/specs/icd_d12_example.yaml --output data/icd_d12_gen/ --volume-size 100
```

## Usage (Web UI)

1. Open pl-test in browser → navigate to **"Generate Data"** page
2. Upload a YAML/JSON spec (or select from saved specs)
3. Select test scenarios
4. Click **"Generate Test Files → S3"** or **"Generate SQL Scripts → S3"**
5. Files appear in the **Load File** page immediately

## Spec Format

See `tools/specs/icd_d12_example.yaml` for a complete example. Key sections:

```yaml
meta:
  interface_type: "icd_d07"
  display_name: "ICD-D07: Member Eligibility File"

format:
  type: "pipe-delimited"    # pipe-delimited | fixed-width | csv
  delimiter: "|"

entity:
  id_field: "member_number"
  id_length: 15
  test_prefix: "000000000"

fields:
  detail:
    - name: "member_number"
      length: 15
      type: "identifier"
      required: true
    - name: "last_name"
      length: 30
      type: "string"

code_tables:
  gender_codes:
    name: "gender_codes"
    values:
      "M": "Male"
      "F": "Female"

db_targets:
  stage1:
    schema: "CustomerInterfaceModule"
    tables:
      - name: "MemberRaw"
```

## Plugin Scaffold (CLI only)

```bash
python -m tools.src.cli scaffold --spec tools/specs/icd_d07.yaml --output src/interfaces/icd_d07/
```

This generates a complete plugin skeleton with TODO markers (for developers, not QA).
