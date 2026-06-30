# TC-004: Hard Error — FEA Dates Don't Span Enrollment Period

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-004 |
| Scenario | Hard Error — FEA Dates Don't Span Enrollment Period |
| Test Participant MA ID | **1430000013** |
| Decision Table | S100 (Condition 1) → S200 → S220 (Condition 1) → S300 (Column 1) |
| Business Rules | BR-D01-001, BR-D01-010, BR-D01-020, BR-D01-021 |
| Trigger | User adds a new IRIS enrollment table entry; status changes to "Enrolled" |
| Transaction Count | 1 MMIS transaction (rejected by MMIS) |
| Priority | High |
| Error Type | Hard Error (Reject Record — ErrorType "01") |
| MMIS Error Code | 9156 |

---

## Preconditions

1. Participant has valid demographics (Medicaid ID, DOB, SSN, Name)
2. Active residential and mailing addresses exist
3. Active ICA assignment exists with valid Medicaid Provider ID
4. **FEA assignment dates are INVALID:**
   - FEA Start Date = 1/1/2026
   - FEA End Date = 6/30/2026
5. Enrollment effective dates:
   - Enrollment Start Date = 1/1/2026
   - Enrollment End Date = null (sent as 12/31/2299)
6. **Mismatch:** FEA end date (6/30/2026) does NOT span the full enrollment period (end date 12/31/2299)
7. Completed ISP exists with start/end dates

---

## Database Setup (Pre-Execution State)

The following Carity database tables and columns must be populated before test execution.

> **⚠️ NEGATIVE TEST CASE:** The FEA dates are intentionally configured to NOT span the enrollment period. This triggers MMIS error 9156.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | e.g., "TESTLAST" | Maps to NameLast |
| `NameFirstName` | e.g., "TESTFIRST" | Maps to NameFirst |
| `NameMiddleName` | e.g., "M" | Optional |
| `NameSuffixName` | e.g., "JR" | Optional, must be in T_RE_CDE_NAME_SUFFIX |
| `BirthDate` | e.g., 1985-03-15 | Maps to DateBirth (CCYYMMDD) |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | Translated to M/F/U |

### 2. Medicaid ID — `PersonModule.PersonMedicaidNumbers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `Value` | **"1430000013"** | 10-char Medicaid ID → IdUniqueClient |
| `StatusDisplayName` | "Active" | Must be active |
| `StatusIdentifier` | (active status code) | |
| `IsOriginal` | true | |
| `EffectiveDateRangeStartDate` | Valid start date | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 3. SSN — `PersonModule.PersonIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `TypeDisplayName` | "Social Security Number" | Identifier type |
| `Value` | e.g., "012345678" | 9-digit zero-padded → NumSsn |

### 4. Residential Address — `PersonModule.PersonAddress`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | PK |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Residential" | Address Node type "IR" |
| `IsActive` | true | Per BR-D01-023 |
| `IsPrimary` | true | Primary residential |
| `PhysicalAddressCareOfName` | e.g., "C/O JOHN DOE" or NULL | Maps to Address1 |
| `PhysicalAddressFirstStreetAddress` | e.g., "123 MAIN ST" | Maps to Address2 (required) |
| `PhysicalAddressSecondStreetAddress` | e.g., "APT 4B" or NULL | Maps to Address3 |
| `PhysicalAddressCityName` | e.g., "MADISON" | Maps to City |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Translated to 2-char MMIS code |
| `PhysicalAddressPostalCode` | e.g., "537011234" | First 5 → ZipCode, chars 6-9 → ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Translated to 2-digit MMIS county code |

### 5. Mailing Address — `PersonModule.PersonAddress` (second row)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | Different from residential |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Mailing" | Additional Address Node type "IM" |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing preferred |
| `PhysicalAddressFirstStreetAddress` | e.g., "PO BOX 456" | Maps to AdditionalAddress2 (required) |
| `PhysicalAddressCityName` | e.g., "MADISON" | Maps to AdditionalCity |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Maps to AdditionalState |
| `PhysicalAddressPostalCode` | e.g., "537011234" | Maps to AdditionalZipCode/ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Maps to AdditionalCounty |

### 6. Phone Numbers — `PersonModule.PersonPhones`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | e.g., "6085551234" | 10-digit → NumPhone |
| `TypeDisplayName` | "Home" | Translated to H/C/W → IndPhone |
| `IsPrimary` | true | Primary phone for Address Node |

### 7. ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {ICA Location GUID} | FK → Medicaid Provider ID lookup |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Must be active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in request |

### 8. FEA Assignment (⚠️ INTENTIONALLY INVALID) — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → Medicaid Provider ID lookup |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | **2026-01-01** | FEA start date |
| `EffectiveDateRangeEndDate` | **2026-06-30** | **⚠️ DOES NOT span enrollment period (ends before enrollment end date of 12/31/2299)** |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in request |

### 9. Program Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {GUID} | PK — created when user adds enrollment |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | **2026-01-01** | → DateEnrlEff |
| `EnrollmentDateRangeEndDate` | **NULL** | Sent as "22991231" — **exceeds FEA end of 2026-06-30** |
| `StatusDisplayName` | "Enrolled" | Triggers the enrollment webservice (BR-D01-001) |
| `IsPrimary` | true | |

### 10. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate (same as DateEnrlEff) |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 11. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | Used to derive WorkerID = "J.Smith" (truncated to 8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter for worker lookup |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 12. Pre-Execution: No Prior Sync Records

Verify these tables are **empty** for this participant's enrollment:

| Table | Expected State |
|-------|----------------|
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` | No row for this ProgramEnrollmentKey |
| `CustomerProgramEnrollmentModule.SyncTransaction` | No rows |
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` | No rows |

### 13. Pre-Execution Verification Query

```sql
-- Verify the FEA date mismatch exists (this is the intended error condition)
SELECT pla.EffectiveDateRangeStartDate AS FEA_Start,
       pla.EffectiveDateRangeEndDate AS FEA_End,
       pe.EnrollmentDateRangeStartDate AS Enrollment_Start,
       pe.EnrollmentDateRangeEndDate AS Enrollment_End
FROM PersonModule.PersonLocationAssignment pla
CROSS JOIN ProgramEnrollmentModule.ProgramEnrollment pe
WHERE pla.PersonLocationAssignmentTypeDisplayName = 'FEA'
  AND pla.CaseKey = '{CaseKey}'
  AND pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: FEA_End (2026-06-30) < Enrollment_End (NULL/22991231)
-- This confirms the error condition is correctly set up
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 1 (New IRIS enrollment added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200_001 (Single span calculated)
3. **S220** — Condition 1 (New Enrollment Added):
   - Action #2: Call S300
4. **S300** — Column 1 (IRIS): Constructs and sends enrollment request
5. **MMIS validates** and returns error because FEA dates do not span enrollment period

---

## Request Payload Verification

### Key Fields Sent (causing the error)

| Field | JSON Element | Value Sent | Notes |
|-------|-------------|------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| TransactionType | TransactionType | "O" (Open) | New enrollment |
| DateEnrlEff | DateEnrlEff | "20260101" | Enrollment begin |
| DateEnrlEnd | DateEnrlEnd | "22991231" | Null end date → high end date |
| Status | Status | "A" (Active) | New enrollment |
| StartReasonCode | StartReasonCode | "2L" (New Enrollment) | Per BR-D01-022 |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Valid FEA ID |
| FEAEffectiveDate | FEAEffectiveDate | "20260101" | FEA start date |
| FEAEndDate | FEAEndDate | "20260630" | FEA end date — **DOES NOT SPAN enrollment** |
| FEAStatus | FEAStatus | "A" (Active) | FEA is active |

### The Validation Failure

```
Enrollment Period:  01/01/2026 ──────────────────────────────────────► 12/31/2299
FEA Period:         01/01/2026 ────────► 06/30/2026
                                                    ↑
                                         FEA ends here, but enrollment continues
                                         MMIS Error 9156 triggered
```

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "FL" (Fail) | Record rejected |
| TransactionType | "O" | Echoed |
| EffectiveDate | "20260101" | Echoed |
| EndDate | "22991231" | Echoed |
| TxnRefId | Echoed from request | |

### Error Segment

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ErrorCode | "9156" | FEA dates validation |
| ErrorDescription | "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD" | Exact MMIS error text |
| ErrorType | "01" (Reject Record) | Entire record rejected |

---

## Database Verification (Post-Execution State)

After test execution, verify the following Carity database records.

### 1. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {new GUID} | Created on sync attempt |
| `HasConflict` | **1 (true)** | Error response — conflict exists |
| `ResponseStatusCode` | "FL" | Fail |
| `TransactionTypeCode` | "O" | Open (attempted) |
| `TxnRefId` | Request TxnRefId | Echoed from request |
| `MmisEffectiveDate` | 2026-01-01 | From response |
| `MmisEndDate` | 2299-12-31 | From response |
| `LastSynchronizedTimestamp` | Current datetime2 | Sync was attempted |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent in request |

### 2. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{key}'
```

Expected: **1 row**

| Column | Expected Value |
|--------|----------------|
| `Code` | "9156" |
| `Description` | "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD" |
| `ClassificationCode` | "Hard" |
| `ErrorTypeCode` | "01" |
| `Timestamp` | Current datetime2 |

### 3. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
```

Expected: **1 row**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `ResponseStatusCode` | "FL" |
| `MmisEffectiveDate` | 2026-01-01 |
| `MmisEndDate` | 2299-12-31 |
| `RequestJsonTextFile` | NOT NULL — contains sent payload with FEAEndDate = "20260630" |
| `ResponseJsonTextFile` | NOT NULL (if captured) — contains error 9156 |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (enrollment NOT activated)

```sql
SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{key}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | NOT "Active" in MMIS sense | Enrollment span NOT made active per BR-D01-010 |

### 5. `PersonModule.PersonMedicaidNumbers` (no change)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000013" |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | **Displayed (red)** — hard error |
| MMIS Errors table | Shows: Code "9156", Description, ErrorType "01" |
| Re-submit button | **Visible** — user can fix and retry |
| Response Status display | "FL" |
| Last Sync timestamp | Updated (attempt was made) |
| Enrollment span | **NOT made active** (BR-D01-010) |

---

## Failure Criteria

- ResponseStatus = "SU" or "SE" when FEA dates don't span enrollment → MMIS validation bypass (should not happen)
- HasConflict not set to true after FL response → conflict detection failure
- ProgramEnrollmentExtensionMessages not populated with error 9156 → error capture failure
- Enrollment span made active despite FL response → BR-D01-010 violated
- Re-submit button not visible after FL response → UI state incorrect
- RequestJsonTextFile not stored in SyncTransaction → audit trail missing

---

## Critical Business Rule: BR-D01-010

> A participant enrollment span will not be made active unless "Response Status" = "SU" (success) or "SE" (success with errors) is received via the Enrollment Response webservice.

Since ResponseStatus = "FL", the enrollment span remains in a non-active state. The user must:
1. Correct the FEA assignment dates to span the full enrollment period
2. Use the Re-submit button to resend the enrollment request to MMIS

---

## Error Classification

| Error Type Code | Meaning | Impact |
|-----------------|---------|--------|
| 01 | Reject Record | Entire enrollment record is rejected; no partial processing |
| 03 | Reject Segment | Only a specific segment is rejected (not applicable here) |
| 04 | Reject Field | Only a specific field is rejected (not applicable here) |

---

## Resolution Steps

1. Update FEA assignment end date to match or exceed enrollment end date (12/31/2299 or beyond enrollment period)
2. Click Re-submit button on the UI
3. System resends enrollment request with corrected FEA dates
4. Expect ResponseStatus = "SU" upon successful re-submission

---

## Related MMIS Error Codes (FEA Validation)

| Code | Description | Trigger |
|------|-------------|---------|
| 9152 | THE ID OF THE FISCAL EMPLOYER AGENCY IS MISSING OR INVALID | FEA ID missing or invalid format |
| 9153 | THE EFFECTIVE DATE OF THE FISCAL EMPLOYER AGENCY IS MISSING OR INVALID | FEA start date missing/invalid |
| 9154 | THE END DATE OF THE FISCAL EMPLOYER AGENCY IS MISSING OR INVALID | FEA end date missing/invalid |
| 9155 | THE FISCAL EMPLOYER AGENCY STATUS IS MISSING OR INVALID | FEA status not A/I/S |
| 9156 | INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD | **This test case** |
| 9157 | INCOMING FEA STATUS DOES NOT MATCH THE WAIVER ENROLLMENT STATUS | FEA status ≠ enrollment status |

---

## Related Test Cases

- TC-001: New IRIS Enrollment Happy Path (same flow, FEA dates valid → success)
- TC-005: Medicaid ID Mismatch (different error handling pattern — SU with ID update)

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

These chains show how Blue Compass resolves each request field from the Carity database. Use these to verify test data is correctly linked.

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = "1430000013" |
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **FEAEffectiveDate** | `PersonModule.PersonLocationAssignment` (FEA) → `EffectiveDateRangeStartDate` = 2026-01-01 |
| **FEAEndDate** | `PersonModule.PersonLocationAssignment` (FEA) → `EffectiveDateRangeEndDate` = **2026-06-30** (THIS IS THE PROBLEM) |
| **DateEnrlEff** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate` = 2026-01-01 |
| **DateEnrlEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` = NULL → "22991231" |
