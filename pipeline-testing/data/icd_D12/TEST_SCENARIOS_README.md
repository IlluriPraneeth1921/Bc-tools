# ICD-D12 FSIA Test Data Files

## File Format
- **Type**: Fixed-width, space-delimited `.txt`
- **Header**: `HDR` + creation_date(8) + creation_time(6) + record_count(6)
- **Detail records**: One per member, 480 chars total (69 fields separated by spaces)
- **Entity ID**: Medicaid ID (10 chars) — MCI ID of the member

## Test Files (19 total)

### Baseline & Boundary

| File | Members | Description |
|------|---------|-------------|
| `WI_FSIA_FILE_EXTRACT_T.txt` | 3 | Baseline: varied ADL/IADL/health needs |
| `WI_FSIA_FILE_EXTRACT_T_01_MAX_LENGTHS.txt` | 1 | All fields at maximum length |
| `WI_FSIA_FILE_EXTRACT_T_02_MIN_EMPTY.txt` | 1 | Minimal data, all optional fields empty/spaces |

### Business Scenarios

| File | Members | Description |
|------|---------|-------------|
| `WI_FSIA_FILE_EXTRACT_T_03_ALL_ADL_COMBINATIONS.txt` | 3 | Personal care Yes/No boundary: all independent, single ADL trigger, all max help |
| `WI_FSIA_FILE_EXTRACT_T_04_BOUNDARY_DATES.txt` | 4 | Eligibility date edge cases: Jan 1, Dec 31, invalid leap day, valid leap day |
| `WI_FSIA_FILE_EXTRACT_T_05_ALL_CODES.txt` | 8 | All possible living preference codes (024-031) and transport codes (001-006) |
| `WI_FSIA_FILE_EXTRACT_T_06_COMPOSITE_RULES.txt` | 7 | Composite business rules: memory-only trigger, phone-only trigger, med admin 005/006/001, transport safety concern, DME mobility-only |
| `WI_FSIA_FILE_EXTRACT_T_07_SPECIAL_CHARS.txt` | 2 | Special characters in names and text fields: apostrophes, hyphens, semicolons, parentheses, slashes |
| `WI_FSIA_FILE_EXTRACT_T_08_LARGE_VOLUME.txt` | 50 | Volume test with varied field values |

### Update Scenarios

| File | Members | Description |
|------|---------|-------------|
| `WI_FSIA_FILE_EXTRACT_T_UPD01_ADL_CHANGES.txt` | 3 | Member 1 ADL levels increased (condition worsened): bath/dres 001→002 |
| `WI_FSIA_FILE_EXTRACT_T_UPD02_EMPLOYMENT_CHANGES.txt` | 3 | Member 3 employment status changed: gained workshop employment, needs assistance |
| `WI_FSIA_FILE_EXTRACT_T_UPD03_HEALTH_SERVICES.txt` | 3 | Member 2 gains new health needs: dialysis, tube feeding, tracheostomy care |
| `WI_FSIA_FILE_EXTRACT_T_UPD04_COGNITION_CHANGES.txt` | 3 | Member 1 cognition deteriorated: all memory flags set, decision-making/wandering worse |
| `WI_FSIA_FILE_EXTRACT_T_UPD05_ELIGIBILITY_DATE.txt` | 3 | All members get new eligibility date (re-assessment on 2026-07-01) |
| `WI_FSIA_FILE_EXTRACT_T_UPD06_NEW_MEMBERS.txt` | 5 | Two new members (Susan Davis, Thomas Anderson) added to existing 3 |

### Delete Scenarios

| File | Members | Description |
|------|---------|-------------|
| `WI_FSIA_FILE_EXTRACT_T_DEL01_MEMBER_REMOVED.txt` | 2 | Member 2 (Mary Johnson) removed entirely from file |
| `WI_FSIA_FILE_EXTRACT_T_DEL02_SERVICES_CLEARED.txt` | 3 | Member 1 health services all cleared to 000 (no longer needed) |
| `WI_FSIA_FILE_EXTRACT_T_DEL03_MULTIPLE_REMOVED.txt` | 1 | Members 2 and 3 removed, only member 1 remains |
| `WI_FSIA_FILE_EXTRACT_T_DEL04_ADL_INDEPENDENCE.txt` | 3 | Member 1 regains independence: all ADLs→000, all adaptive equipment cleared |

## Baseline Members

| Medicaid ID | Name | Key Characteristics |
|-------------|------|---------------------|
| 0000000001 | John Smith | Moderate ADL needs (help=001/002), memory impairment, wandering, needs personal care + supportive home care + med admin + transport |
| 0000000002 | Mary Johnson | High needs (help=002), substance abuse, overnight supervision, long-term memory loss, physically resistive |
| 0000000003 | Robert Williams | Independent (all ADLs=000), employed in community, specialized wound care only |

## Business Rules Tested

| Rule | What's Checked | Trigger Condition |
|------|---------------|-------------------|
| Personal Care Needed | Composite of 6 ADL fields | Any of BATH/DRES/EAT/MBL/TLT/XFER = 001 or 002 |
| Supportive Home Care | Composite of 11 IADL/cognition fields | MEAL_PREP (001-003), LDRY_CHOR (001-002), PHN_USE_ABTY (002), PHN_ACS (002), COMM (002-003), memory flags (1), DLY_DCSN (001-003), PHY_RSIST (001-002) |
| Medication Administration | MED_MGT_HELP_LVL_CD | Code 003, 005, or 006 |
| Money Management | MONY_MGT_HELP_LVL_CD | Code 001 or 002 |
| Transportation | TRNSP_DRV_CD | Code 003, 004, 005, or 006 |
| DME Needed | Composite of 4 adaptive equipment fields | Any of BATH/MBL/TLT/XFER adaptive equipment non-blank |

## Field Categories (69 fields per DTL record)
1. **Demographics** (4): Medicaid ID, First/Last/Middle Name
2. **Living Situation** (2): Preferred living, guardian preference
3. **ADLs** (12): Bathing, dressing, eating, mobility, toileting, transferring (help codes + adaptive equipment)
4. **IADLs** (7): Meal prep, medication, money mgmt, laundry, phone use/access, transportation
5. **Additional Supports** (8): Overnight care, employment status, 5 work-type flags, employment assistance
6. **Health Services** (22): 20 medical service need codes + other service text + skilled therapy
7. **Communication/Cognition** (9): Communication, 4 memory flags, unable-to-determine text, decision making, physically resistive
8. **Behaviors/Mental Health** (7): Wandering, self-injury, violence, mental health, 3 substance use flags
9. **Eligibility** (1): Eligibility determination date

## Generator
Run `python generate_test_data.py` to regenerate all 19 test files from the specification.
