# ICD-D06 Negative Testing — Record Type 01

## Purpose

Verify that the pipeline correctly **rejects** invalid Record Type 01 data and does **not** create Organization/Location records in Carity for rejected providers. Also verify that intentional business rule exclusions (PHW, Referring) behave as expected.

## Test Data Prefix

All negative test providers use prefix: `990000000`

- Control (valid) providers: `990000000C0xxx`
- Negative test providers: `990000000Nxxxx`

## Expected Pipeline Behavior

| Rejection Type | Scope | Expected Result |
|---|---|---|
| Field validation failure | Per-provider | Provider rejected, error report generated, no Carity record created. Other valid providers in same file process normally. |
| Structural/format failure | Entire file | Entire file rejected, error report generated, no records created for any provider. |
| Business rule exclusion | Per-provider | Provider intentionally skipped (BR-D06-005, BR-D06-012), no Carity record created. Not an "error" — expected behavior. |

## Verification Strategy

### 1. Confirm Rejection (Provider does NOT exist in Carity)

```sql
-- After pipeline processes the negative test file, ALL of these should return 0 rows:

-- Stage 2: No parsed record
SELECT * FROM [CustomerInterfaceModule].[MedicaidProviderParsed]
WHERE MedicaidProviderNumber LIKE '990000000N%'

-- Stage 3: No incoming organization
SELECT * FROM [InterfaceModule].[IncomingOrganization]
WHERE OrganizationKey IN (
  SELECT OrganizationKey FROM [InterfaceModule].[IncomingLocationIdentifiers]
  WHERE IdentifierValue LIKE '990000000N%'
)

-- Stage 4: No final Carity record
SELECT * FROM [OrganizationModule].[Organization]
WHERE OrganizationKey IN (
  SELECT OrganizationKey FROM [OrganizationModule].[LocationIdentifiers]
  WHERE IdentifierValue LIKE '990000000N%'
)
```

### 2. Confirm Control Provider DID Load (for per-provider rejection files)

```sql
-- Should return 1 row per file that has a control provider
SELECT * FROM [OrganizationModule].[LocationIdentifiers]
WHERE IdentifierValue LIKE '990000000C%'
```

### 3. Confirm Error Report Generated (BR-D06-016)

After pipeline processing, check the error report output for:
- Provider ID that was rejected
- Reason/field that caused rejection
- Record type where error occurred

---

## Test Files (9 total)

### Per-Provider Rejection (Files 1–6)

Each file contains one valid **control provider** (`990000000C0xxx`) plus multiple invalid providers. The control provider verifies the file itself was accepted and only the bad providers were rejected.

| # | Filename | Topic | Invalid Providers | Control |
|---|---|---|---|---|
| 1 | `WI_PROV_FILE_EXTRACT_T_NEG01_MISSING_REQUIRED_FIELDS.psv` | Required fields empty/missing | 6 | 1 |
| 2 | `WI_PROV_FILE_EXTRACT_T_NEG02_INVALID_CODES.psv` | Invalid code table values | 5 | 1 |
| 3 | `WI_PROV_FILE_EXTRACT_T_NEG03_INVALID_DATES.psv` | Malformed date values | 6 | 1 |
| 4 | `WI_PROV_FILE_EXTRACT_T_NEG04_FIELD_LENGTH_OVERFLOW.psv` | Fields exceeding max length | 5 | 1 |
| 5 | `WI_PROV_FILE_EXTRACT_T_NEG05_DATA_TYPE_VIOLATIONS.psv` | Wrong data types in typed fields | 3 | 1 |
| 6 | `WI_PROV_FILE_EXTRACT_T_NEG06_BUSINESS_RULE_EXCLUSIONS.psv` | BR-D06-005 (PHW) + BR-D06-012 (Referring) | 2 | 1 |

### Entire File Rejection (Files 7–9)

These files have structural problems that should cause the pipeline to reject the entire file. No control provider needed (nothing should load).

| # | Filename | Topic | Providers |
|---|---|---|---|
| 7 | `WI_PROV_FILE_EXTRACT_T_NEG07_STRUCT_TOO_FEW_FIELDS.psv` | RT01 line has fewer pipes than expected | 1 |
| 8 | `WI_PROV_FILE_EXTRACT_T_NEG08_STRUCT_TOO_MANY_FIELDS.psv` | RT01 line has extra pipes/fields | 1 |
| 9 | `WI_PROV_FILE_EXTRACT_T_NEG09_STRUCT_DUPLICATE_RT01.psv` | Same provider has two RT01 records | 1 |

---

## Detailed Scenarios

### NEG01: Missing Required Fields

| Provider ID | Missing Field | Spec Requirement |
|---|---|---|
| 990000000N0001 | `medicaid_provider_number` | required=true, type=identifier |
| 990000000N0002 | `provider_full_name` | required=true, length=50 |
| 990000000N0003 | `provider_name_type` | required=true, code_table=provider_name_type_codes |
| 990000000N0004 | `organization_type_description` | required=true, length=25 |
| 990000000N0005 | `billing_indicator` | required=true, code_table=billing_indicator_codes |
| 990000000N0006 | `revalidation_date` | required=true, format=YYYYMMDD |
| 990000000C0001 | *(control — all fields valid)* | Should load successfully |

### NEG02: Invalid Code Values

| Provider ID | Field | Invalid Value | Valid Values |
|---|---|---|---|
| 990000000N0011 | `provider_name_type` | `X` | B, P |
| 990000000N0012 | `organization_type_code` | `Z` | 1–9, A–C |
| 990000000N0013 | `location_status_indicator` | `Q` | I, O, Y, E |
| 990000000N0014 | `billing_indicator` | `Z` | Y, N, B, R |
| 990000000N0015 | `billing_indicator` | `1` | Y, N, B, R |
| 990000000C0002 | *(control — all codes valid)* | Should load successfully |

### NEG03: Invalid Date Formats

| Provider ID | `revalidation_date` Value | Why Invalid |
|---|---|---|
| 990000000N0021 | `2027-01-15` | Contains dashes (format must be YYYYMMDD) |
| 990000000N0022 | `01152027` | Wrong order (MMDDYYYY instead of YYYYMMDD) |
| 990000000N0023 | `20271301` | Invalid month (13) |
| 990000000N0024 | `20270230` | Invalid day (Feb 30) |
| 990000000N0025 | `ABCDEFGH` | Non-numeric characters |
| 990000000N0026 | `2027011` | Too short (7 chars instead of 8) |
| 990000000C0003 | *(control — valid date)* | Should load successfully |

### NEG04: Field Length Overflow

| Provider ID | Field | Max Length | Test Length | Test Value |
|---|---|---|---|---|
| 990000000N0031 | `medicaid_provider_number` | 15 | 20 | `99000000000000000031` |
| 990000000N0032 | `provider_full_name` | 50 | 60 | 60 A's |
| 990000000N0033 | `organization_type_description` | 25 | 35 | 35 X's |
| 990000000N0034 | `provider_name_type` | 1 | 2 | `BP` |
| 990000000N0035 | `billing_indicator` | 1 | 2 | `YN` |
| 990000000C0004 | *(control — all within limits)* | Should load successfully |

### NEG05: Data Type Violations

| Provider ID | Field | Type | Invalid Value | Why Invalid |
|---|---|---|---|---|
| 990000000N0061 | `medicaid_service_provider_count` | numeric (5) | `ABCDE` | Alpha in numeric field |
| 990000000N0062 | `medicaid_member_count` | numeric (5) | `-0001` | Negative number |
| 990000000N0063 | `revalidation_date` | date (8) | `0` | Single char in 8-char field |
| 990000000C0005 | *(control — valid types)* | Should load successfully |

### NEG06: Business Rule Exclusions

| Provider ID | Rule | Scenario | Expected |
|---|---|---|---|
| 990000000N0041 | BR-D06-005 | Provider Type="90", Specialty="850" (PHW) | No Org/Location created |
| 990000000N0051 | BR-D06-012 | Billing Indicator="R" (Referring only) | No Org/Location created |
| 990000000C0006 | *(control — normal provider)* | Should load successfully |

### NEG07: Structural — Too Few Fields

| Provider ID | Scenario |
|---|---|
| 990000000N0071 | RT01 line has only 10 pipe-delimited fields instead of 17 |

### NEG08: Structural — Too Many Fields

| Provider ID | Scenario |
|---|---|
| 990000000N0072 | RT01 line has 20 pipe-delimited fields (3 extra) |

### NEG09: Structural — Duplicate RT01

| Provider ID | Scenario |
|---|---|
| 990000000N0074 | Same provider ID appears in two separate RT01 lines (violates max_occurrence=1) |

---

---
---

# ICD-D06 Negative Testing — Record Type 02 (Provider Address)

## Purpose

Verify that the pipeline correctly **rejects** providers with invalid Record Type 02 (Address) data. Also verify conditional field rules are enforced (fields only valid for specific address types) and BR-D06-019 ZIP code formatting is validated.

## Test Data Prefix

All RT02 negative test providers use prefix: `990000000`

- Control providers: `990000000C1xxx`
- Negative test providers: `990000000N1xxx`

## RT02 Field Reference

| Field | Length | Type | Required | Code Table | Conditional |
|---|---|---|---|---|---|
| record_type | 2 | string | yes | — | Fixed "02" |
| medicaid_provider_number | 15 | identifier | yes | — | |
| address_type_code | 1 | code | yes | S, M, P, I | |
| name_type_code | 1 | code | — | B, P | |
| name_address_specific | 50 | string | — | — | |
| street_address_1 | 30 | string | yes | — | |
| street_address_2 | 30 | string | — | — | |
| city | 30 | string | yes | — | |
| state | 2 | string | yes | — | |
| zip_code | 5 | string | yes | — | Must be numeric 5-digit (BR-D06-019) |
| zip_code_extension | 4 | string | — | — | |
| practice_location_county_code | 10 | string | yes | — | Only for Address Type S |
| email_address | 256 | string | — | — | Only for Address Type M |
| contact_person | 50 | string | — | — | Only for Address Type S and P |
| phone_number_contact_person | 10 | string | — | — | Only for Address Type S and P |
| phone_number_extension_contact_person | 4 | string | — | — | Only for Address Type S and P |
| phone_number_member_use | 10 | string | — | — | Only for Address Type S |

## Occurrence Rules

- Minimum: 1 address per provider
- Maximum: 10 addresses per provider
- Address Type S is optional when other address types are present

---

## Test Files (8 total)

### Per-Provider Rejection (Files 10–15)

| # | Filename | Topic | Invalid Providers | Control |
|---|---|---|---|---|
| 10 | `WI_PROV_FILE_EXTRACT_T_NEG10_RT02_MISSING_REQUIRED_FIELDS.psv` | Required RT02 fields empty | 7 | 1 |
| 11 | `WI_PROV_FILE_EXTRACT_T_NEG11_RT02_INVALID_CODES.psv` | Invalid code table values | 3 | 1 |
| 12 | `WI_PROV_FILE_EXTRACT_T_NEG12_RT02_FIELD_LENGTH_OVERFLOW.psv` | Fields exceeding max length | 8 | 1 |
| 13 | `WI_PROV_FILE_EXTRACT_T_NEG13_RT02_CONDITIONAL_FIELD_VIOLATIONS.psv` | Fields populated for wrong address type | 7 | 1 |
| 14 | `WI_PROV_FILE_EXTRACT_T_NEG14_RT02_ZIP_CODE_VIOLATIONS.psv` | BR-D06-019 malformed ZIP codes | 5 | 1 |
| 15 | `WI_PROV_FILE_EXTRACT_T_NEG15_RT02_OCCURRENCE_VIOLATIONS.psv` | Too few / too many RT02 records + boundary | 3 | 1 |

### Entire File Rejection (Files 16–17)

| # | Filename | Topic | Providers |
|---|---|---|---|
| 16 | `WI_PROV_FILE_EXTRACT_T_NEG16_RT02_STRUCT_TOO_FEW_FIELDS.psv` | RT02 line truncated (too few pipes) | 1 |
| 17 | `WI_PROV_FILE_EXTRACT_T_NEG17_RT02_STRUCT_TOO_MANY_FIELDS.psv` | RT02 line has extra fields | 1 |

---

## Detailed Scenarios

### NEG10: Missing Required Fields

| Provider ID | Missing Field | Spec Requirement |
|---|---|---|
| 990000000N1001 | `medicaid_provider_number` (on RT02) | required=true, type=identifier |
| 990000000N1002 | `address_type_code` | required=true, code_table=address_type_codes |
| 990000000N1003 | `street_address_1` | required=true, length=30 |
| 990000000N1004 | `city` | required=true, length=30 |
| 990000000N1005 | `state` | required=true, length=2 |
| 990000000N1006 | `zip_code` | required=true, length=5 |
| 990000000N1007 | `practice_location_county_code` | required=true for Address Type S |
| 990000000C1001 | *(control — all fields valid)* | Should load successfully |

### NEG11: Invalid Code Values

| Provider ID | Field | Invalid Value | Valid Values |
|---|---|---|---|
| 990000000N1011 | `address_type_code` | `X` | S, M, P, I |
| 990000000N1012 | `address_type_code` | `1` (numeric) | S, M, P, I |
| 990000000N1013 | `name_type_code` | `Z` | B, P |
| 990000000C1002 | *(control)* | | |

### NEG12: Field Length Overflow

| Provider ID | Field | Max Length | Test Length |
|---|---|---|---|
| 990000000N1021 | `address_type_code` | 1 | 2 ("SM") |
| 990000000N1022 | `street_address_1` | 30 | 40 chars |
| 990000000N1023 | `city` | 30 | 40 chars |
| 990000000N1024 | `state` | 2 | 5 ("WISCO") |
| 990000000N1025 | `zip_code` | 5 | 10 ("5370312345") |
| 990000000N1026 | `name_address_specific` | 50 | 60 chars |
| 990000000N1027 | `email_address` | 256 | ~270 chars |
| 990000000N1028 | `phone_number_contact_person` | 10 | 15 chars |
| 990000000C1003 | *(control)* | | |

### NEG13: Conditional Field Violations

Fields populated for the WRONG address type — pipeline should reject.

| Provider ID | Scenario | Why Invalid |
|---|---|---|
| 990000000N1031 | `practice_location_county_code` on Type M | County code only valid for Type S |
| 990000000N1032 | `practice_location_county_code` on Type P | County code only valid for Type S |
| 990000000N1033 | `email_address` on Type S | Email only valid for Type M |
| 990000000N1034 | `email_address` on Type P | Email only valid for Type M |
| 990000000N1035 | `contact_person` on Type M | Contact only valid for Type S and P |
| 990000000N1036 | `contact_person` on Type I | Contact only valid for Type S and P |
| 990000000N1037 | `phone_number_member_use` on Type M | Member phone only valid for Type S |
| 990000000C1004 | *(control)* | |

### NEG14: ZIP Code Violations (BR-D06-019)

| Provider ID | `zip_code` Value | Why Invalid |
|---|---|---|
| 990000000N1041 | `ABCDE` | Non-numeric (must be numeric 5-digit) |
| 990000000N1042 | `5370` | Too short (4 digits instead of 5) |
| 990000000N1043 | `53703-` | Contains hyphen (raw zip must be digits only) |
| 990000000N1044 | `0000` | Too short (4 chars) + all zeros |
| 990000000N1045 | ` 5370` | Leading space in numeric field |
| 990000000C1005 | *(control)* | |

### NEG15: Occurrence Violations

| Provider ID | Scenario | Expected |
|---|---|---|
| 990000000N1051 | 0 RT02 records (no address at all) | Rejected — min 1 required |
| 990000000N1052 | 11 RT02 records | Rejected — max 10 exceeded |
| 990000000N1053 | 1 RT02 record (Type M only, no Type S) | Boundary test — should load (Type S optional) |
| 990000000C1006 | *(control — valid with 1 Type S address)* | Should load successfully |

### NEG16: Structural — Too Few Fields

| Provider ID | Scenario |
|---|---|
| 990000000N1061 | RT02 line has only 8 pipe-delimited fields instead of 17 |

### NEG17: Structural — Too Many Fields

| Provider ID | Scenario |
|---|---|
| 990000000N1062 | RT02 line has 20 pipe-delimited fields (3 extra) |

---

## Verification SQL (RT02-specific)

```sql
-- Confirm rejected providers have no address records in Stage 2
SELECT * FROM [CustomerInterfaceModule].[MedicaidProviderAddress]
WHERE MedicaidProviderNumber LIKE '990000000N1%'

-- Confirm rejected providers have no location addresses in Stage 4
SELECT * FROM [OrganizationModule].[LocationAddresses]
WHERE LocationKey IN (
  SELECT LocationKey FROM [OrganizationModule].[LocationIdentifiers]
  WHERE IdentifierValue LIKE '990000000N1%'
)

-- Confirm control providers DID load addresses
SELECT * FROM [OrganizationModule].[LocationAddresses]
WHERE LocationKey IN (
  SELECT LocationKey FROM [OrganizationModule].[LocationIdentifiers]
  WHERE IdentifierValue LIKE '990000000C1%'
)
```

---

## Future Expansion

This document will be extended to cover negative testing for:
- Record Type 03 (TIN)
- Record Type 04 (Contract)
- Record Type 05 (Type & Specialty)
- Record Types 06–14

Each will follow the same pattern: grouped by validation category, one control provider per file, structural issues in separate files.
