# ICD-D12 FSIA Negative Test Data Files

## Purpose
These files contain **intentionally invalid data** to test error handling, validation, and rejection logic in the ICD-D12 FSIA pipeline. Each file targets a specific category of failure.

## Source Members
Members are drawn from `FSA-CMM-Adult_FS_Details-D-20260624_120000_000.txt` which has corresponding records in the target database.

---

## Category 1: Header Record Violations (7 files)

| File | Scenario | What's Wrong | Expected Behavior |
|------|----------|--------------|-------------------|
| `NEG01A_HDR_MISSING` | 1.1 Missing header record | File starts with detail records, no HDR line | File rejected entirely |
| `NEG01B_HDR_INVALID_ID` | 1.2 Invalid header identifier | Uses "HRD" instead of "HDR" | File rejected entirely |
| `NEG01C_HDR_INVALID_DATE` | 1.3 Invalid creation date | Date is "99991332" (month 13, day 32) | File rejected or error logged |
| `NEG01D_HDR_INVALID_TIME` | 1.4 Invalid creation time | Time is "256199" (hour 25, min 61, sec 99) | File rejected or error logged |
| `NEG01E_HDR_COUNT_MISMATCH` | 1.5 Count > actual records | Header says 000005, file has 3 records | Error: count mismatch |
| `NEG01F_HDR_COUNT_ZERO_WITH_DATA` | 1.6 Count=0 but records exist | Header says 000000, file has 2 detail records | Error: count mismatch |
| `NEG01G_HDR_COUNT_NON_NUMERIC` | 1.7 Non-numeric record count | Count is "00AB15" | File rejected (parse error) |

---

## Category 2: Required Field Violations (1 file, 9 records)

**File**: `FSA-CMM-Adult_FS_Details-D-20260624_130008_NEG02_REQUIRED_FIELDS.txt`

| Record # | Member Used | Scenario | What's Wrong |
|----------|-------------|----------|--------------|
| 1 | (blank ID) | 2.1 Missing Medicaid ID | Medicaid ID is all spaces |
| 2 | 65484565__ | 2.2 Medicaid ID too short | Only 8 digits, padded with spaces |
| 3 | 654ABCD526 | 2.3 Non-numeric Medicaid ID | Contains alpha characters |
| 4 | 4774443470 (Harper) | 2.4 Missing First Name | First name is all spaces |
| 5 | 4774443670 (Jasmine) | 2.5 Missing Eligibility Date | ELG_CALC_DT is all spaces |
| 6 | 2255663300 (Kate) | 2.6 Invalid date format | ELG_CALC_DT = "06-01-26" instead of YYYYMMDD |
| 7 | 6510461561 (Travis) | 2.7 Invalid month in date | ELG_CALC_DT = "20261301" (month 13) |
| 8 | 6548455950 (Paul) | 2.8 Feb 29 non-leap year | ELG_CALC_DT = "20250229" (2025 not a leap year) |
| 9 | 6548456574 (Jill) | Valid record | Control — should process successfully |

---

## Category 3: Invalid Code Values (1 file, 13 records)

**File**: `FSA-CMM-Adult_FS_Details-D-20260624_130009_NEG03_INVALID_CODES.txt`

| Record # | Member | Scenario | Field | Invalid Value | Valid Values |
|----------|--------|----------|-------|---------------|--------------|
| 1 | 7777444455 (Test) | 3.1 Invalid pref_live | APPL_PREF_LIVE_CD | 032 | 024-031 |
| 2 | 6548456526 (Abigail) | 3.2 Invalid gard_pref_live | GARD_PREF_LIVE_CD | 006 | 000-005, 007-009 |
| 3 | 6548456550 (Louisa) | 3.3 Invalid ADL help | BATH_HELP_CD | 003 | 000, 001, 002 |
| 4 | 4774443470 (Harper) | 3.4 Invalid empl_stat | EMPL_STAT_CD | 005 | 001-004 |
| 5 | 4774443670 (Jasmine) | 3.5 Invalid med_mgt | MED_MGT_HELP_LVL_CD | 004 | 001, 002, 003, 005, 006 |
| 6 | 2255663300 (Kate) | 3.6 Invalid transport | TRNSP_DRV_CD | 007 | 001-006 |
| 7 | 6510461561 (Travis) | 3.7 Invalid chr_bed_posn | CHR_BED_POSN_CD | 003 | 005, 006 only |
| 8 | 6548455950 (Paul) | 3.8 Invalid skl_thrp | SKL_THRP_CD | 003 | 001, 002 only |
| 9 | 6548456574 (Jill) | 3.9 Invalid flag | WKSHP_EMPL_FLG | X | Y, N, Space |
| 10 | 6548455038 (Julius) | 3.10 Invalid comm | COMM_CD | 004 | 000-003 |
| 11 | 4774443360 (Noah) | 3.11 Invalid bhv_itrvn | BHV_ITRVN_CD | (blank - uses 000 which is not valid for no-indep table) | 001-006 |
| 12 | 4774443560 (Daisy) | 3.12 Valid record | — | — | Control record |
| 13 | 6548456598 (Barbara) | 3.13 Valid record | — | — | Control record |

---

## Category 4: Field Length / Format Violations (1 file, 5 records)

**File**: `FSA-CMM-Adult_FS_Details-D-20260624_130010_NEG04_FIELD_LENGTH.txt`

| Record # | Member | Scenario | What's Wrong |
|----------|--------|----------|--------------|
| 1 | 7777444455 (Test) | 4.1 First Name overflow | First name exceeds 20 chars, no space delimiter between ID and name |
| 2 | 6548456526 (Abigail) | 4.2 Last Name overflow | Last name exceeds 20 chars, shifts all downstream fields |
| 3 | 6548456550 (Louisa) | 4.3 OTHR_SRVC_TXT overflow | Free text exceeds 75 char limit |
| 4 | 4774443470 (Harper) | 4.4 Truncated record | Line ends prematurely before ELG_CALC_DT |
| 5 | 4774443670 (Jasmine) | 4.5 Extra data at end | Extra characters appended after ELG_CALC_DT |

---

## Category 5: Business Rule Violations (1 file, 5 records)

**File**: `FSA-CMM-Adult_FS_Details-D-20260624_130011_NEG05_BUSINESS_RULES.txt`

| Record # | Medicaid ID | Scenario | Business Rule | Expected Behavior |
|----------|-------------|----------|---------------|-------------------|
| 1 | 9999999999 | 5.1 No matching person (BR-D12-007) | BR-D12-007 | Skip record, log "No matching person" |
| 2 | 0000000000 | 5.1 No matching person (BR-D12-007) | BR-D12-007 | Skip record, log "No matching person" |
| 3 | 1111111111 | 5.2 No active case (BR-D12-006) | BR-D12-006 | Skip record, log "No active case" |
| 4 | 2222222222 | 5.3 Multiple active cases (BR-D12-008) | BR-D12-008 | Skip record, log "Multiple active cases" |
| 5 | 6548456526 (Abigail) | Valid record | — | Should process successfully |

**Note**: Records 1-4 test person-matching failures. The IDs used (9999999999, 0000000000, 1111111111, 2222222222) should not exist in the target database. If they do, substitute other non-existent IDs.

---

## Category 6: Duplicate / Ordering Issues (4 files)

| File | Scenario | What's Wrong | Expected Behavior |
|------|----------|--------------|-------------------|
| `NEG06A_DUPLICATE_IDS` | 6.1 Duplicate Medicaid IDs | Same ID (6548456526, 4774443470) appears twice with different data | Error or last-record-wins |
| `NEG06B_HDR_MID_FILE` | 6.2 Header mid-file | Second HDR line appears after first detail record | Reject second HDR or whole file |
| `NEG06C_EMPTY_FILE` | 6.3 Completely empty file | 0 bytes | Graceful handling, no crash |
| `NEG06D_WHITESPACE_ONLY` | 6.4 Whitespace-only file | Only blank lines and spaces | Graceful handling, no crash |

---

## Category 7: Multi-Code Field Violations (1 file, 5 records)

**File**: `FSA-CMM-Adult_FS_Details-D-20260624_130016_NEG07_MULTICODE_FIELDS.txt`

| Record # | Member | Scenario | Field | What's Wrong |
|----------|--------|----------|-------|--------------|
| 1 | 6548456526 (Abigail) | 7.1 Invalid mobility code | MBL_ADPV_EQP_CD | Contains "001" which is not valid for mobility (valid: 002, 003, 007) |
| 2 | 6548456550 (Louisa) | 7.2 Invalid toileting code | TLT_ADPV_EQP_CD | Contains "001" which is not valid for toileting (valid: 002-006, 008) |
| 3 | 4774443470 (Harper) | 7.3 Duplicate in multi-code | MBL_ADPV_EQP_CD | Contains "002002007" — code 002 duplicated |
| 4 | 4774443670 (Jasmine) | 7.4 Invalid xfer code | XFER_ADPV_EQP_CD | Contains "005" which is not valid for transferring (valid: 001-004) |
| 5 | 2255663300 (Kate) | Valid record | — | Control — valid multi-code in XFER_ADPV_EQP_CD |

---

## Summary

| Category | Files | Records | Focus |
|----------|-------|---------|-------|
| 1. Header Violations | 7 | 2-3 each | File-level structure errors |
| 2. Required Fields | 1 | 9 | Missing/malformed required data |
| 3. Invalid Codes | 1 | 13 | Out-of-range code table values |
| 4. Field Length | 1 | 5 | Overflow, truncation, extra data |
| 5. Business Rules | 1 | 5 | Person matching failures |
| 6. Duplicates/Ordering | 4 | 2-4 each | Structural anomalies |
| 7. Multi-Code Fields | 1 | 5 | Invalid composite code values |
| **Total** | **16 files** | **~55 records** | |

## Test Execution Notes

1. **Category 1 files** should cause file-level rejection (no records processed)
2. **Categories 2-5, 7** test record-level rejection — valid records in same file should still process
3. **Category 6** tests graceful error handling for malformed file structure
4. All files use the naming pattern: `FSA-CMM-Adult_FS_Details-D-YYYYMMDD_HHMMSS_NEGxx_DESCRIPTION.txt`
