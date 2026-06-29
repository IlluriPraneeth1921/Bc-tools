# TC-029: Multiple MMIS Error Segments in Response

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-029 |
| Scenario | Multiple MMIS Error Segments in Response |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 1) → S200 → S220 (Condition 1) → S300 |
| Business Rules | BR-D01-001, BR-D01-009, BR-D01-010 |
| Trigger | User adds new IRIS enrollment with multiple invalid fields |
| Transaction Count | 1 MMIS transaction (rejected with multiple errors) |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Failure (FL) — multiple error segments |

---

## Preconditions

1. Participant has valid demographics (Medicaid ID, DOB, SSN, Name)
2. Active ICA assignment exists with valid Medicaid Provider ID
3. **Residential address is INVALID:** City is missing/empty (triggers error 9110)
4. **FEA assignment dates are INVALID:** FEA end date does NOT span enrollment period (triggers error 9156)
5. Enrollment effective dates: Start = 2026-01-01, End = NULL (sent as 22991231)
6. Active ISP exists
7. This is a NEGATIVE test — MMIS will return MULTIPLE error segments (0..unbounded per ICD)

---

## Database Setup (Pre-Execution State)

> **⚠️ NEGATIVE TEST CASE:** Multiple fields are intentionally configured to be invalid. The residential address is missing the city AND the FEA dates do not span the enrollment period. This triggers multiple MMIS validation errors in a single response.

The following Carity database tables and columns must be in the specified state before test execution.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | e.g., "TESTLAST" | Maps to NameLast |
| `NameFirstName` | e.g., "TESTFIRST" | Maps to NameFirst |
| `NameMiddleName` | e.g., "M" | Optional |
| `NameSuffixName` | e.g., "JR" | Optional |
| `BirthDate` | e.g., 1985-03-15 | Maps to DateBirth (CCYYMMDD) |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | Translated to M/F/U |

### 2. Medicaid ID — `PersonModule.PersonMedicaidNumbers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `Value` | **"1430000012"** | 10-char Medicaid ID → IdUniqueClient |
| `StatusDisplayName` | "Active" | Must be active |
| `StatusIdentifier` | (active status code) | |
| `IsOriginal` | true | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 3. SSN — `PersonModule.PersonIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `TypeDisplayName` | "Social Security Number" | Identifier type |
| `Value` | e.g., "012345678" | 9-digit zero-padded → NumSsn |

### 4. Residential Address (⚠️ INTENTIONALLY INVALID) — `PersonModule.PersonAddress`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | PK |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Residential" | Address Node type "IR" |
| `IsActive` | true | Per BR-D01-023 |
| `IsPrimary` | true | Primary residential |
| `PhysicalAddressFirstStreetAddress` | e.g., "123 MAIN ST" | Maps to Address2 (valid) |
| `PhysicalAddressCityName` | **NULL or ""** | **⚠️ MISSING CITY — triggers MMIS error 9110** |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Valid state |
| `PhysicalAddressPostalCode` | e.g., "537011234" | Valid postal code |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Valid county |

### 5. Mailing Address — `PersonModule.PersonAddress` (second row)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `AddressTypeDisplayName` | "Mailing" | Additional Address Node type "IM" |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing |
| `PhysicalAddressFirstStreetAddress` | e.g., "PO BOX 456" | Valid |
| `PhysicalAddressCityName` | e.g., "MADISON" | Valid (only residential has the issue) |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Valid |
| `PhysicalAddressPostalCode` | e.g., "537011234" | Valid |

### 6. Phone Numbers — `PersonModule.PersonPhones`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | e.g., "6085551234" | 10-digit → NumPhone |
| `TypeDisplayName` | "Home" | Translated to H → IndPhone |
| `IsPrimary` | true | Primary phone |

### 7. ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {ICA Location GUID} | FK → Medicaid Provider ID lookup |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Active |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Spans enrollment |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID} | FK to Location |
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
| `EffectiveDateRangeEndDate` | **2026-06-30** | **⚠️ DOES NOT span enrollment period (ends before 22991231)** |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in request |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Active | Must be active ISP |

### 10. New Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {new enrollment GUID} | PK — system generated |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | **2026-01-01** | → DateEnrlEff |
| `EnrollmentDateRangeEndDate` | **NULL** | Sent as "22991231" — exceeds FEA end |
| `StatusDisplayName` | "Enrolled" | Triggers enrollment webservice |
| `IsPrimary` | true | |

### 11. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | → WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 12. Pre-Execution Verification Query

```sql
-- Verify the DUAL error conditions exist
-- Condition 1: Missing city in residential address
SELECT PhysicalAddressCityName
FROM PersonModule.PersonAddress
WHERE PersonKey = '{PersonKey}' AND AddressTypeDisplayName = 'Residential' AND IsActive = 1
-- Expected: NULL or '' (missing city)

-- Condition 2: FEA date mismatch
SELECT pla.EffectiveDateRangeEndDate AS FEA_End, pe.EnrollmentDateRangeEndDate AS Enrollment_End
FROM PersonModule.PersonLocationAssignment pla
CROSS JOIN ProgramEnrollmentModule.ProgramEnrollment pe
WHERE pla.PersonLocationAssignmentTypeDisplayName = 'FEA'
  AND pla.CaseKey = '{CaseKey}' AND pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: FEA_End (2026-06-30) < Enrollment_End (NULL/22991231)

-- Verify no prior sync records
SELECT COUNT(*) FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 1 (New IRIS enrollment added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Single span calculated)
3. **S220** — Condition 1 (New Enrollment Added):
   - Action #2: Call S300 (Column 1 — IRIS)
4. **S300** — Column 1 (IRIS): Constructs and sends enrollment request
5. **MMIS validates** and returns FL response with MULTIPLE error segments

---

## Request Payload Verification

### Key Fields Sent (causing the errors)

| Field | JSON Element | Value Sent | Notes |
|-------|-------------|------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| TransactionType | TransactionType | "O" (Open) | New enrollment |
| DateEnrlEff | DateEnrlEff | "20260101" | Enrollment begin |
| DateEnrlEnd | DateEnrlEnd | "22991231" | Null end date → high end date |
| Status | Status | "A" (Active) | New enrollment |
| City | City | **"" or spaces** | **⚠️ MISSING — triggers error 9110** |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Valid FEA ID |
| FEAEffectiveDate | FEAEffectiveDate | "20260101" | FEA start date |
| FEAEndDate | FEAEndDate | **"20260630"** | **⚠️ DOES NOT span enrollment — triggers error 9156** |
| FEAStatus | FEAStatus | "A" (Active) | FEA is active |

### The Two Validation Failures

```
Error 1 (Field Level — Address):
  City field is empty/missing in Address Node
  MMIS Error 9110: "CITY IS MISSING"
  ErrorType: "04" (Reject Field)

Error 2 (Record Level — FEA):
  Enrollment: 01/01/2026 ────────────────────────────────────► 12/31/2299
  FEA:        01/01/2026 ────────► 06/30/2026
                                              ↑ FEA ends, enrollment continues
  MMIS Error 9156: "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD"
  ErrorType: "01" (Reject Record)
```

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | **"FL" (Fail)** | Record rejected — multiple errors |
| TransactionType | "O" | Echoed |
| EffectiveDate | "20260101" | Echoed |
| EndDate | "22991231" | Echoed |
| TxnRefId | Echoed from request | |

### Error Segments (MULTIPLE — 0..unbounded per ICD)

**Error Segment 1:**

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ErrorCode | "9110" | City validation |
| ErrorDescription | "CITY IS MISSING" | Exact MMIS error text |
| ErrorType | "04" (Reject Field) | Field-level error |

**Error Segment 2:**

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ErrorCode | "9156" | FEA dates validation |
| ErrorDescription | "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD" | Exact MMIS error text |
| ErrorType | "01" (Reject Record) | Record-level error |

> **⚠️ KEY TEST:** The ICD defines Error Segments as **0..unbounded** — this test verifies the system correctly handles and stores MULTIPLE error segments from a single MMIS response. TC-004 only tested a single error; this test validates multi-error handling.

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
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | What was sent in request |

### 2. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Code
```

Expected: **2 rows** (one per error segment)

**Row 1 — City Missing Error:**

| Column | Expected Value |
|--------|----------------|
| `Code` | "9110" |
| `Description` | "CITY IS MISSING" |
| `ClassificationCode` | "Hard" or per classification logic |
| `ErrorTypeCode` | "04" |
| `Timestamp` | Current datetime2 |

**Row 2 — FEA Dates Error:**

| Column | Expected Value |
|--------|----------------|
| `Code` | "9156" |
| `Description` | "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD" |
| `ClassificationCode` | "Hard" |
| `ErrorTypeCode` | "01" |
| `Timestamp` | Current datetime2 |

> **⚠️ KEY VERIFICATION:** This is the primary assertion — the system MUST create MULTIPLE rows in ProgramEnrollmentExtensionMessages (one per error segment). If only 1 row is created, the system is not correctly parsing the unbounded error segments from the MMIS response.

### 3. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **1 row**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `ResponseStatusCode` | "FL" |
| `MmisEffectiveDate` | 2026-01-01 |
| `MmisEndDate` | 2299-12-31 |
| `RequestJsonTextFile` | NOT NULL — contains sent payload with empty City and short FEA dates |
| `ResponseJsonTextFile` | NOT NULL — contains BOTH error segments |

### 3a. `CustomerProgramEnrollmentModule.SyncTransactionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey IN (
  SELECT SyncTransactionKey FROM CustomerProgramEnrollmentModule.SyncTransaction
  WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
)
ORDER BY Code
```

Expected: **2 rows** (mirrors ProgramEnrollmentExtensionMessages)

| Row | Code | ErrorTypeCode | Description |
|-----|------|---------------|-------------|
| 1 | "9110" | "04" | "CITY IS MISSING" |
| 2 | "9156" | "01" | "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD" |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (enrollment NOT activated)

```sql
SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | NOT "Active" in MMIS sense | Enrollment span NOT made active per BR-D01-010 |

### 5. `PersonModule.PersonMedicaidNumbers` (no change)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000012" |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | **Displayed (red)** — hard errors |
| MMIS Errors table | Shows **2 rows**: Code "9110" + Code "9156" with descriptions |
| Re-submit button | **Visible** — user can fix and retry |
| Response Status display | "FL" |
| Last Sync timestamp | Updated (attempt was made) |
| Enrollment span | **NOT made active** (BR-D01-010) |
| Error count | 2 errors displayed |

> **⚠️ UI KEY TEST:** The MMIS Errors table must show ALL error segments (not just the first one). If only 1 error displays while 2 were returned, the UI is not iterating over all ProgramEnrollmentExtensionMessages rows.

---

## Failure Criteria

### Multi-Error Handling Failures (PRIMARY TEST FOCUS)
- Only 1 error row stored in ProgramEnrollmentExtensionMessages when 2 were returned → parser not handling unbounded errors
- Only 1 error row stored in SyncTransactionMessages when 2 were returned → same issue
- UI only displays 1 error when 2 exist in database → UI iteration failure
- Error segments stored without preserving individual ErrorType per error → classification lost
- System stops processing after first error and ignores subsequent error segments

### Response Validation Failures
- ResponseStatus = "SU" or "SE" when multiple validation errors exist → MMIS validation bypass
- HasConflict not set to true after FL response → conflict detection failure
- Enrollment span made active despite FL response → BR-D01-010 violated

### Data Integrity Failures
- ProgramEnrollmentExtensionMessages row count ≠ 2 (should match number of error segments)
- SyncTransactionMessages row count ≠ 2
- Error codes not matching expected values (9110, 9156)
- ErrorTypeCode not preserved per error segment (each may have different ErrorType)
- ClassificationCode not properly derived from ErrorTypeCode

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- ResponseJsonTextFile is NULL (must store full response with all error segments)
- SyncTransaction row not created

### UI State Failures
- Conflict chip not displayed after FL response
- Re-submit button not visible after FL response
- MMIS Errors table showing fewer errors than stored in database
- Error descriptions truncated or missing

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = "1430000012" |
| **City** (Address Node) | `PersonModule.PersonAddress` → WHERE Residential AND Active → `PhysicalAddressCityName` = **NULL/empty** (error source) |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **FEAEffectiveDate** | `PersonModule.PersonLocationAssignment` (FEA) → `EffectiveDateRangeStartDate` = 2026-01-01 |
| **FEAEndDate** | `PersonModule.PersonLocationAssignment` (FEA) → `EffectiveDateRangeEndDate` = **2026-06-30** (error source) |
| **DateEnrlEff** | `ProgramEnrollment.EnrollmentDateRangeStartDate` = 2026-01-01 |
| **DateEnrlEnd** | `ProgramEnrollment.EnrollmentDateRangeEndDate` = NULL → "22991231" |
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE ICA Consultant AND active → truncated to 8 chars |

---

## Error Type Classification Reference

| ErrorType Code | Meaning | Impact | Example in This Test |
|----------------|---------|--------|---------------------|
| 01 | Reject Record | Entire enrollment record rejected | Error 9156 (FEA dates) |
| 03 | Reject Segment | Specific segment rejected | (Not in this test) |
| 04 | Reject Field | Specific field rejected | Error 9110 (City missing) |

> **Note:** A single response can contain errors of DIFFERENT ErrorType codes. The system must preserve the individual ErrorType for each error segment, not assume they are all the same type.

---

## Related Test Cases

- TC-004: Hard Error — FEA Dates (single error scenario — this test extends with multiple errors)
- TC-001: New IRIS Enrollment Happy Path (same flow, all fields valid → success)
- TC-030: Success with Errors — SE Response (errors that DON'T prevent enrollment activation)
