# Prompt Template: Generate Interface Spec YAML

Copy this prompt and use it with any AI assistant (Kiro, ChatGPT, Claude) along with the spec document.

---

## Prompt

```
Read the attached interface specification document and generate a YAML file in the pl-test standard format.

The YAML must have these sections:
- meta (interface_type, display_name, description, version, source_system, file_extension)
- format (type, delimiter, has_header_record, encoding)
- entity (id_field, id_length, test_prefix)
- record_types (list of record types with code, name, occurrence rules)
- fields (grouped by record type: header + detail, each field has: name, length, type, required, description, db_column, code_table)
- code_tables (every valid value set from the spec, with code→description mappings)
- business_rules (transformation rules, composite field logic)
- db_targets (stage1 through stage4: database, schema, tables with column mappings)
- naming (file_prefix, environment_suffix, extension)
- test_scenarios (volume_size: 50)

Rules:
- Field names use snake_case (e.g., medicaid_provider_number, bath_help_cd)
- Field types: string, numeric, date, code, flag, identifier
- All code values quoted as strings (e.g., "001", "024")
- DB column names in PascalCase (e.g., MedicaidProviderNumber, BathHelpCd)
- Include ALL fields from the spec (don't skip any)
- Include ALL valid code values from appendices/lookup tables
- Mark required fields with required: true
- Date fields get format: YYYYMMDD

For db_targets:
- Stage 1 (Raw): schema CustomerInterfaceModule
- Stage 2 (Parsed): schema CustomerInterfaceModule
- Stage 3 (Incoming): schema InterfaceModule or CustomFormModule
- Stage 4 (Final): database WiDHS.Qc.Carity.ToolTestig

Save as: pl-test/tools/specs/{interface_type}.yaml

Reference examples: pl-test/tools/specs/icd_d12_example.yaml, pl-test/tools/specs/nk_d12.yaml
```

---

## Example Usage

"Here is the WI DHS MES CMM_ICD-D12 FSIA File specification (attached PDF). 
Please read it and generate a YAML spec file following the pl-test standard format.
Save it as pl-test/tools/specs/icd_d12.yaml"
