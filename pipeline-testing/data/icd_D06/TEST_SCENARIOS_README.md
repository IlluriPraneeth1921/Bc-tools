# ICD-D06 Medicaid Provider File Test Data

## File Format
- **Type**: Pipe-delimited `.psv`
- **Header**: Record Type 00 (extract date, period, counts)
- **Detail records**: Record Types 01-14 (multiple per provider, one line per record)
- **Entity ID**: MedicaidProviderNumber (15 chars)

## Test Files (21 total)

### Baseline & Boundary

| File | Providers | Description |
|------|-----------|-------------|
| `WI_PROV_FILE_EXTRACT_T.psv` | 3 | Baseline: physician, clinic (with waivers), dentist |
| `WI_PROV_FILE_EXTRACT_T_01_MAX_LENGTHS.psv` | 1 | All fields at maximum character lengths |
| `WI_PROV_FILE_EXTRACT_T_02_MIN_EMPTY.psv` | 1 | Minimal required fields only |

### Business Scenarios

| File | Providers | Description |
|------|-----------|-------------|
| `WI_PROV_FILE_EXTRACT_T_03_MULTIPLE_OCCURRENCES.psv` | 1 | 3 service addresses, 4 contracts, 4 NPIs, 8 counties, 4 licenses |
| `WI_PROV_FILE_EXTRACT_T_04_BOUNDARY_DATES.psv` | 1 | Date edge cases: epoch, far future, leap day |
| `WI_PROV_FILE_EXTRACT_T_05_ALL_CODES.psv` | 4 | All billing indicators (Y/N/B/R), org types, location statuses |
| `WI_PROV_FILE_EXTRACT_T_06_WAIVER_SCENARIOS.psv` | 3 | BR-D06-020 status logic: WVR+IRIS=Active, WVR only=Inactive, no WVR=Inactive |
| `WI_PROV_FILE_EXTRACT_T_07_SPECIAL_CHARS.psv` | 1 | Apostrophes, hyphens, ampersands, quotes in names/descriptions |
| `WI_PROV_FILE_EXTRACT_T_08_LARGE_VOLUME.psv` | 50 | Volume test |

### Update Scenarios

| File | Providers | Description |
|------|-----------|-------------|
| `WI_PROV_FILE_EXTRACT_T_UPD01_ADDRESS_CHANGES.psv` | 3 | Provider 1 service address changed |
| `WI_PROV_FILE_EXTRACT_T_UPD02_CONTRACT_STATUS.psv` | 3 | Provider 2 WVR contract terminated |
| `WI_PROV_FILE_EXTRACT_T_UPD03_DEMOGRAPHICS.psv` | 3 | Provider 1 name/type changed, revalidation updated |
| `WI_PROV_FILE_EXTRACT_T_UPD04_NPI_TAXONOMY.psv` | 3 | Provider 1 new NPI added, provider 3 taxonomy changed |
| `WI_PROV_FILE_EXTRACT_T_UPD05_WAIVER_CHANGES.psv` | 3 | Provider 2 gains new waiver services |
| `WI_PROV_FILE_EXTRACT_T_UPD06_NEW_PROVIDERS.psv` | 5 | Two new providers added to existing 3 |
| `WI_PROV_FILE_EXTRACT_T_UPD07_TERM_REACTIVATION.psv` | 3 | Provider 3 contract terminated then reactivated |

### Delete Scenarios

| File | Providers | Description |
|------|-----------|-------------|
| `WI_PROV_FILE_EXTRACT_T_DEL01_PROVIDER_REMOVED.psv` | 2 | Provider 3 removed entirely |
| `WI_PROV_FILE_EXTRACT_T_DEL02_SUBRECORD_REMOVED.psv` | 3 | Provider 1 loses specialty + certification |
| `WI_PROV_FILE_EXTRACT_T_DEL03_WAIVER_RECORDS_REMOVED.psv` | 3 | Provider 2 loses all waiver services |
| `WI_PROV_FILE_EXTRACT_T_DEL04_MULTIPLE_PROVIDERS_REMOVED.psv` | 1 | Only provider 1 remains |
| `WI_PROV_FILE_EXTRACT_T_DEL05_CERTS_LICENSE_REMOVED.psv` | 3 | Provider 1 loses license + certifications |

## Baseline Providers

| MCD ID | Name | Type | Key Characteristics |
|--------|------|------|---------------------|
| 000000000012345 | John Smith | Physician (P) | Personal name, 2 specialties, license, 2 certifications |
| 000000000067890 | Lakeside Medical Group | Clinic (B) | Business name, WVR+IRIS (Active status), waiver services, ACA hold, counties |
| 000000000024680 | Mary Johnson | Dentist (P) | Personal name, dental contract, value-added record (type 09) |

## Record Types Covered

| Type | Description | Providers with data |
|------|-------------|---------------------|
| 00 | Header | All files |
| 01 | Main provider info | All providers |
| 02 | Addresses (S, M, P, I) | All providers |
| 03 | TIN | All providers |
| 04 | Contracts | All providers |
| 05 | Type & Specialty | Providers 1, 2, 3 |
| 06 | NPI | All providers |
| 07 | Taxonomy | All providers |
| 08 | ACA Payment Hold | Provider 2 |
| 09 | Value Added | Provider 3 |
| 10 | Waiver Program | Provider 2 |
| 11 | Waiver Service | Provider 2 |
| 12 | County/Tribe Served | Providers 2, 3 |
| 13 | License | Providers 1, 3 |
| 14 | Certification | All providers |

## Business Rules Tested

| Rule | Description | Test File |
|------|-------------|-----------|
| BR-D06-005 | PHW providers (Type=90, Specialty=85x) skipped | `_05_ALL_CODES` |
| BR-D06-012 | Billing Indicator "R" → provider skipped | `_05_ALL_CODES` |
| BR-D06-018 | Address Type "S" = Current | Baseline |
| BR-D06-019 | ZIP formatting (5 or 5-dash-4) | Baseline |
| BR-D06-020 | Status = Active only when WVR + IRIS both active | `_06_WAIVER_SCENARIOS` |
| BR-D06-022 | NPI dedup (most recent) | `_03_MULTIPLE_OCCURRENCES` |
| BR-D06-023 | TIN dedup per type (most recent) | Baseline |

## Generator
Run `python generate_test_data.py` to regenerate all 21 test files from the specification.
