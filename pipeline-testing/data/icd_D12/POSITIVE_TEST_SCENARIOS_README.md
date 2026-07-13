# ICD-D12 FSIA Positive Test Data Files

## Purpose
These files contain **valid data** to test correct processing, transformation, and business rule application in the ICD-D12 FSIA pipeline. Each file targets a specific positive test category to verify the system handles valid input correctly.

## Source Members
Members are drawn from `FSA-CMM-Adult_FS_Details-D-20260624_120000_000.txt` which has corresponding records in the target database.

---

## Category 1: Baseline / Happy Path (3 files)

| File | Scenario | Records | Description |
|------|----------|---------|-------------|
| `POS01_BASELINE_ALL_MEMBERS` | 1.1 Standard full file | 15 | All members from sample file processed end-to-end |
| `POS01B_SINGLE_MEMBER` | 1.2 Single member | 1 | Minimal valid file — one header + one detail record |
| `POS01C_EMPTY_FILE` | 1.3 Empty valid file (BR-D12-012) | 0 | Valid header with count=000000, no detail records |

---

## Category 2: Code Table Coverage (6 files)

### POS02A_ALL_LIVING_CODES
| Record # | Member | APPL_PREF_LIVE_CD | GARD_PREF_LIVE_CD |
|----------|--------|-------------------|-------------------|
| 1 | Test (7777444455) | 024 - Stay at current | 000 - Not Applicable |
| 2 | Abigail (6548456526) | 025 - Own home | 001 - Stay at current |
| 3 | Louisa (6548456550) | 026 - Someone else's home | 002 - Own home |
| 4 | Harper (4774443470) | 027 - Apt with services | 003 - Apt with services |
| 5 | Jasmine (4774443670) | 028 - Group residential | 004 - Group residential |
| 6 | Kate (2255663300) | 029 - Healthcare facility | 005 - Healthcare facility |
| 7 | Travis (6510461561) | 030 - No permanent residence | 007 - No consensus |
| 8 | Paul (6548455950) | 031 - Unsure | 008 - Someone else's home |
| 9 | Jill (6548456574) | 024 - Stay at current | 009 - No response |

### POS02B_ALL_ADL_CODES
Tests all ADL help codes (000, 001, 002) and all adaptive equipment combinations:
- **Bathing**: help 000/001/002 + ADPV 005
- **Mobility**: help 000/001/002 + ADPV 002, 003, 007 (all combos)
- **Toileting**: help 000/001/002 + ADPV 002, 003, 004, 005, 006, 008 (all combos)
- **Transferring**: help 000/001/002 + ADPV 001, 002, 003, 004 (all combos)
- **Dressing**: help 000/001/002
- **Eating**: help 000/001/002

### POS02C_ALL_IADL_CODES
Tests all IADL codes:
- **MEAL_PREP**: 000, 001, 002, 003
- **MED_MGT**: 001, 002, 003, 005, 006
- **MONY_MGT**: 000, 001, 002
- **LDRY_CHOR**: 000, 001, 002
- **PHN_USE**: 001, 002
- **PHN_ACS**: 001, 002
- **TRNSP**: 001, 002, 003, 004, 005, 006

### POS02D_ALL_EMPLOYMENT_CODES
Tests all employment-related codes:
- **EMPL_STAT**: 001 (Retired), 002 (Not working), 003 (Full-time), 004 (Part-time)
- **Employment flags**: All Y/N combinations
- **EMPL_ASST**: 000, 001, 002, 003, 004

### POS02E_ALL_HEALTH_SRVC_CODES
Tests all health service frequency codes (one record per level):
- Record 1: All fields = 001 (1-3/Month)
- Record 2: All fields = 002 (Weekly)
- Record 3: All fields = 003 (2-6/Week)
- Record 4: All fields = 004 (1-2/Day) + CHR_BED_POSN = 005
- Record 5: All fields = 005 (3-4/Day) + CHR_BED_POSN = 006
- Record 6: All fields = 006 (5+/Day) + SKL_THRP = 002
- Record 7: All fields = 000 (Independent/blank)

### POS02F_ALL_COGNITION_BEHAVIOR_CODES
Tests all communication, cognition, and behavior codes:
- **COMM**: 000, 001, 002, 003
- **Memory flags**: All Y/N combinations
- **DLY_DCSN**: 000, 001, 002, 003
- **PHY_RSIST**: 000, 001
- **WNDR**: 000, 001, 002
- **SELF_INJR**: 000, 001, 002, 003
- **OFNS_BHV**: 000, 001, 002, 003
- **MNTL_HLTH**: 000, 001, 002
- **Substance flags**: All Y/N combinations

---

## Category 3: Composite Business Rule Triggers (4 files)

### POS03A_PERSONAL_CARE_RULES
| Record # | Member | ADL Values | Expected: Personal Care? |
|----------|--------|------------|--------------------------|
| 1 | Test | BATH=001 only, all others 000 | Yes (single trigger) |
| 2 | Abigail | DRES=001 only | Yes (dressing trigger) |
| 3 | Louisa | EAT=001 only | Yes (eating trigger) |
| 4 | Harper | TLT=002 only | Yes (toileting trigger) |
| 5 | Jasmine | XFER=002 only | Yes (transferring trigger) |
| 6 | Kate | All ADLs = 002, all equipment | Yes (max combination) |

### POS03B_SUPPORTIVE_HOME_CARE_RULES
| Record # | Member | Trigger Field | Expected: Supportive Home Care? |
|----------|--------|---------------|----------------------------------|
| 1 | Test | MEAL_PREP=001 | Yes (meal prep trigger) |
| 2 | Abigail | MEM_IPAR_FLG=Y | Yes (memory flag only) |
| 3 | Louisa | PHN_USE_ABTY=002 | Yes (phone ability trigger) |
| 4 | Harper | PHN_ACS=002 | Yes (phone access trigger) |
| 5 | Jasmine | COMM=001 | Yes (communication trigger) |
| 6 | Kate | PHY_RSIST_CARE=001 | Yes (physically resistive) |
| 7 | Travis | All fields at non-triggering values | No |

### POS03C_MED_MONEY_TRANSPORT_RULES
| Record # | Member | Field | Value | Expected Result |
|----------|--------|-------|-------|-----------------|
| 1 | Test | MED_MGT | 003 | Medication Admin = Yes |
| 2 | Abigail | MED_MGT | 005 | Medication Admin = Yes |
| 3 | Louisa | MED_MGT | 006, MONY_MGT=001 | Med Admin = Yes, Money Mgmt = Yes, TRNSP=005 → Transport = Yes |
| 4 | Harper | MONY_MGT | 002 | Money Management = Yes, TRNSP=003 → Transport = Yes |
| 5 | Jasmine | MED_MGT | 002, MONY_MGT=002 | Med Admin = No (Independent), Money Mgmt = Yes, TRNSP=004 → Transport = Yes |
| 6 | Kate | TRNSP | 006, PHN_ACS=002 | Transport = Yes, Supportive Home Care = Yes |

### POS03D_DME_OVERNIGHT_BEHAVIOR_RULES
| Record # | Member | What's Triggered | Expected Result |
|----------|--------|------------------|-----------------|
| 1 | Test | BATH_ADPV=005 | DME = Yes (bathing equipment only) |
| 2 | Abigail | MBL_ADPV=002003007 | DME = Yes (mobility equipment) |
| 3 | Louisa | TLT_ADPV=002003004005006 | DME = Yes (toileting equipment) |
| 4 | Harper | XFER_ADPV=001002003004 | DME = Yes (transferring equipment) |
| 5 | Jasmine | ONGHT_CARE=002 | Overnight Care = Yes |
| 6 | Kate | WNDR=001, all others 000 | Behavior Support = Yes (wandering only) |
| 7 | Travis | SELF_INJR=001, OFNS_BHV=002, MNTL_HLTH=001 | Behavior = Yes, Mental Health = Yes |

---

## Category 4: Employment Note Building — BR-D12-009 (1 file)

### POS04_EMPLOYMENT_NOTE_BUILDING
| Record # | Member | EMPL_STAT | Flags (WKSHP/INDV/CMNY/VOC/HOME) | EMPL_ASST | Expected Note |
|----------|--------|-----------|-----------------------------------|-----------|---------------|
| 1 | Test | 003 (Full-time) | Y/Y/Y/Y/Y | 001 | "Workshop Employment; Interest in Working in Community; Home Employment; Need for Assistance to Work: Needs help weekly or less" |
| 2 | Abigail | 003 (Full-time) | Y/N/N/N/N | 004 | "Workshop Employment; Need for Assistance to Work: Not applicable" |
| 3 | Louisa | 004 (Part-time) | N/N/N/N/N | 002 | "Need for Assistance to Work: Needs help every day but does not need continuous presence" |
| 4 | Harper | 003 (Full-time) | N/N/N/N/N | 000 | "Need for Assistance to Work: Independent" |
| 5 | Jasmine | 004 (Part-time) | N/Y/N/N/Y | 003 | "Interest in Working in Community; Home Employment; Need for Assistance to Work: Needs the continuous presence of another person" |

---

## Category 5: Form Instance Business Rules (4 files)

### POS05A_FIRST_TIME_LOAD (BR-D12-001)
- **Precondition**: Members have NO existing LTC Needs Assessment form instance
- **Expected**: Creates new form instance in "In Progress" status
- Members: Julius Boros, Noah Brown, Angel Cabrera

### POS05B_UPDATE_IN_PROGRESS (BR-D12-002)
- **Precondition**: Members already have an "In Progress" LTC Needs Assessment
- **Expected**: Overwrites all FSIA-populated fields on existing "In Progress" instance
- Members: Abigail Adams, Louisa Adams, Harper Anderson (with updated values)

### POS05C_ALL_COMPLETED_NEW_FORM (BR-D12-003)
- **Precondition**: Members only have "Completed" and/or "Reopened" instances (no "In Progress")
- **Expected**: Creates new "In Progress" instance; existing Completed/Reopened instances NOT modified
- Members: Barbara Bush, Laura Bush, Paul Azinger

### POS05D_BOTH_INPROGRESS_AND_COMPLETED (BR-D12-004)
- **Precondition**: Members have BOTH an "In Progress" AND a "Completed" instance
- **Expected**: Updates the "In Progress" instance (BR-D12-002 applies); does NOT create new instance
- Members: Daisy Brown, Jill Biden, Test

---

## Category 6: Boundary Values (4 files)

### POS06A_MAX_FIELD_LENGTHS
| Field | Max Length | Value Used |
|-------|-----------|------------|
| First Name | 20 | "AbigailMaxLengthNam" (20 chars) |
| Last Name | 20 | "AdamsMaxLengthLastNa" (20 chars) |
| Middle Name | 15 | "MiddleNameMax  " (15 chars) |
| OTHR_SRVC_TXT | 75 | 75-char text string |
| UABL_DTER_TXT | 75 | 75-char text string |

### POS06B_MIN_OPTIONAL_BLANK
- Only required fields populated: Medicaid ID, First Name, Middle Name (spaces), ELG_CALC_DT
- All optional code fields are spaces/blank

### POS06C_BOUNDARY_DATES
| Record # | ELG_CALC_DT | Note |
|----------|-------------|------|
| 1 | 20260101 | January 1 (year start) |
| 2 | 20261231 | December 31 (year end) |
| 3 | 20240229 | Feb 29 valid leap year (2024) |
| 4 | 20260630 | Mid-year date |

### POS06D_MAX_MULTICODE_COMBOS
- MBL_ADPV_EQP_CD: all 3 slots filled (002003007)
- TLT_ADPV_EQP_CD: all 5 slots filled (002003004005006)
- XFER_ADPV_EQP_CD: all 4 slots filled (001002003004)
- BATH_ADPV_EQP_CD: single valid value (005)

---

## Category 7: Special Characters and Text Fields (1 file)

### POS07_SPECIAL_CHARACTERS
| Record # | Member | What's Tested |
|----------|--------|---------------|
| 1 | Test | Last name: "O'Brien-Smith" (apostrophe + hyphen) |
| 2 | 6548456526 | First name: "Mary-Ann" (hyphen); OTHR_SRVC_TXT: parentheses, semicolons, slashes |
| 3 | Louisa | Last name: "Adams Jr." (period); OTHR_SRVC_TXT: slashes, parentheses; UABL_DTER_TXT: dash, semicolons |
| 4 | Harper | OTHR_SRVC_TXT: colons, ampersand, parentheses |

---

## Category 8: Re-assessment / Delta File Scenarios (9 files)

### POS08A_ADL_WORSEN
Members' ADL conditions worsen from baseline:
- Abigail: BATH 001→002, DRES 000→001, new adaptive equipment
- Jasmine: All ADLs go from 000 to 001
- Angel: New bathing/mobility help needed
- Jill: All ADLs to 002 with full adaptive equipment

### POS08B_ADL_IMPROVE
Members' ADL conditions improve:
- Louisa: BATH 002→001, DRES remains
- Harper: BATH 002→000, reduced adaptive equipment
- Barbara: Multiple ADLs 002→001
- Laura: All ADLs → 000 (fully independent)

### POS08C_NEW_HEALTH_SERVICES
Members gain new health service needs:
- Test: Multiple HRS fields go from 000 to active values + new OTHR_SRVC_TXT
- Jasmine: All HRS fields go from blank to 001 (baseline new services)
- Angel: Dialysis + tube feeding initiated (000→004)
- Julius: Increased frequency across multiple services

### POS08D_HEALTH_SERVICES_REMOVED
Members no longer need health services:
- Louisa: All HRS fields → 000 (services discontinued)
- Travis: All HRS fields → 000 (was previously active)
- Paul: All HRS fields → 000

### POS08E_EMPLOYMENT_CHANGES
Employment status changes:
- Test: Gains full-time employment with workshop + community flags
- Abigail: Becomes part-time with home employment + assistance
- Noah: Status changes (was 003, now 001 - retired)
- Daisy: Gains community work interest

### POS08F_COGNITION_WORSEN
Cognitive/behavioral decline:
- Abigail: Memory flags all → Y, DLY_DCSN → 002, new behaviors
- Jasmine: First signs of cognitive issues (COMM=001, MEM_IPAR=Y)
- Angel: Severe decline (DLY_DCSN=003, max behaviors, UABL_DTER_TXT filled)
- Paul: Ongoing decline with worsening behaviors

### POS08G_COGNITION_IMPROVE
Cognitive/behavioral improvement:
- Louisa: Behaviors reduce (from 002 to 001)
- Noah: Memory flags clear (Y→N), behavior support needs decrease
- Barbara: Communication improves, behaviors decrease

### POS08H_NEW_ELIGIBILITY_DATE
All members from baseline get new eligibility date (20260601 → 20260701) — tests re-assessment date update only.

### POS08I_NEW_MEMBERS_ADDED
Existing members + 2 new members (Susan Davis 3344556677, Thomas Anderson 4455667788) — tests delta file with mixed existing and new member processing.

---

## Summary

| Category | Files | Total Records | Focus |
|----------|-------|---------------|-------|
| 1. Baseline | 3 | 16 | Happy path end-to-end |
| 2. Code Coverage | 6 | ~40 | All valid code values exercised |
| 3. Composite Rules | 4 | ~24 | Business rule trigger/non-trigger |
| 4. Employment Note | 1 | 5 | BR-D12-009 note concatenation |
| 5. Form Instance | 4 | 12 | BR-D12-001 through BR-D12-004 |
| 6. Boundary Values | 4 | 11 | Min/max/edge values |
| 7. Special Characters | 1 | 4 | Text field validation |
| 8. Delta/Re-assessment | 9 | ~35 | Change detection and updates |
| **Total** | **32 files** | **~147 records** | |

## File Naming Convention
All files follow: `FSA-CMM-Adult_FS_Details-D-YYYYMMDD_HHMMSS_POSxx_DESCRIPTION.txt`

## Test Execution Notes

1. **Category 1-4, 6-7** can be run independently (no database preconditions beyond member existence)
2. **Category 5** requires specific form instance states in the database before processing
3. **Category 8** should be run AFTER the baseline file (POS01) has been processed to test delta behavior
4. All files use members from `FSA-CMM-Adult_FS_Details-D-20260624_120000_000.txt` which exist in the target database
5. New members in POS08I (Susan Davis, Thomas Anderson) need to be pre-created in the target database
