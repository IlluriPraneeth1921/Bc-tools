# TC-033: Disenrolled Span Created — Real Reason Code Sent (S345)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-033 |
| Scenario | Disenrolled Span Created — Re-send Closure with Real Disenrollment Reason Code |
| Test Participant MA ID | **1430000013** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 2) → S200 → S220 (Condition 8) → S345 |
| Business Rules | BR-D01-001, BR-D01-020, BR-D01-021, BR-D01-022, R411 |
| Trigger | User creates a Disenrolled span with a specific disenrollment reason (e.g., Deceased) |
| Transaction Count | 1 MMIS transaction (re-send Closure with real reason codes) |
| Transaction Ordering | N/A — single transaction |
| Priority | Medium |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant was previously end-dated via S340 (TC-006 must have been executed first)
2. MMIS has an existing Active span with end date set to the disenrollment date (e.g., 09/30/2026)
3. Prior S340 sync used placeholder reason codes (StartReasonCode = "2W", StopReasonCode = "2W")
4. User now creates a Disenrolled span starting on the enrollment end date
5. User selects an actual disenrollment reason (e.g., "Deceased" → translated to reason code "64")
6. Active ICA assignment exists with valid Medicaid Provider ID
7. Active FEA assignment exists with valid dates
8. **Key mechanism:** S345 re-sends the Closure transaction (Type: C) with the SAME dates as the prior S340, but with the REAL translated reason codes instead of the "2W" placeholders
9. **IRIS only:** SDPC has no stop reason codes — SDPC disenrollment is complete at S340

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-006 must have been executed successfully first.** This test requires that the participant already has a closed IRIS enrollment in MMIS (end-dated via S340 with placeholder reason codes 2W/2W).

The following Carity database tables and columns must be in the specified state before test execution.

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
| `IsOriginal` | true | |
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
| `PhysicalAddressFirstStreetAddress` | e.g., "123 MAIN ST" | Maps to Address2 (required) |
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
| `LocationKey` | {ICA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Must be active |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in request |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL or >= enrollment end date | Must span enrollment period |

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
| Status | Completed | ISP must be in Completed state |

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001/TC-006 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., **2026-07-01** | Enrollment begin date |
| `EnrollmentDateRangeEndDate` | **2026-09-30** | End-dated from TC-006 execution |
| `StatusDisplayName` | "Enrolled" | Still "Enrolled" — Disenrolled span being created separately |
| `IsPrimary` | true | |

### 11. Prior Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-006 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior S340 closure was successful |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "C" | Prior transaction was Closure (S340) |
| `LastSynchronizedTimestamp` | Valid datetime2 | From TC-006 execution |
| `MmisEffectiveDate` | **2026-07-01** | Existing MMIS begin date |
| `MmisEndDate` | **2026-09-30** | End date set by S340 closure |

### 12. Disenrolled Span Being Created — `ProgramEnrollmentModule.ProgramEnrollment` (new row)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {new disenrolled span GUID} | PK — new record being created |
| `ProgramKey` | {IRIS Program GUID} | FK to Program |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | **2026-09-30** | Same as prior enrollment end date |
| `EnrollmentDateRangeEndDate` | NULL or 22991231 | Open-ended disenrolled span |
| `StatusDisplayName` | **"Disenrolled"** | Triggering status |
| `StatusReasonDisplayName` | **"Deceased"** | User-selected reason → translated to code "64" |
| `IsPrimary` | false | |

### 13. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 14. Pre-Execution Verification Query

```sql
-- Verify enrollment is end-dated and prior S340 closure was successful with 2W placeholders
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeStartDate, pe.EnrollmentDateRangeEndDate,
       pee.ResponseStatusCode, pee.HasConflict, pee.TransactionTypeCode,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', EnrollmentDateRangeEndDate=2026-09-30,
--           ResponseStatusCode='SU', TransactionTypeCode='C',
--           MmisEffectiveDate=2026-07-01, MmisEndDate=2026-09-30

-- Verify prior S340 used placeholder reason codes (2W/2W)
SELECT RequestJsonTextFile
FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
  AND TransactionTypeCode = 'C'
ORDER BY Timestamp DESC
-- Manual check: StartReasonCode = "2W", StopReasonCode = "2W" in payload
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 2 (Existing IRIS enrollment updated — Disenrolled span created):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Identifies existing Active span with latest begin date (Span-B)
3. **S220** — Condition 8 (New Disenrolled span created in BC — IRIS only):
   - Action #1: Identifies Span-B (Active span that was end-dated before Disenrolled span created)
   - Action #8: Call S345 to re-send Closure with real translated disenrollment reason codes
4. **S345** — (Re-send Closure with real reason codes):
   - Constructs Closure request: TransactionType = "C", Status = "A"
   - Uses SAME DateEnrlEff/DateEnrlEnd as the prior S340 (dates unchanged)
   - Replaces StartReasonCode/StopReasonCode with REAL translated codes (e.g., "64" for Deceased)

---

## Request Payload Verification

### Transaction 1: Re-send Closure with Real Reason Codes (S345)

> **⚠️ CRITICAL:** This transaction re-sends the EXACT same Closure (Type: C) with the SAME dates as the prior S340 transaction. The ONLY difference is that StartReasonCode and StopReasonCode now contain the REAL translated disenrollment reason instead of the "2W" placeholder.

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8), system-generated |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6), system-generated |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | CHAR(10), format: S + 9-digit number |

#### Demographic Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| IdUniqueClient | IdUniqueClient | "1430000013" | CHAR(10), from PersonMedicaidNumbers.Value |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| NameMi | NameMi | Middle name (if exists) | CHAR(25), optional |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### Address Node (Residential — "IR")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2), IRIS Residential |
| Address1 | Address1 | Care Of name (or spaces) | CHAR(30) |
| Address2 | Address2 | Street address | CHAR(30), required |
| Address3 | Address3 | Apt/Lot (or spaces) | CHAR(30) |
| City | City | City name | CHAR(18) |
| State | State | 2-char MMIS state code | CHAR(2) |
| ZipCode | ZipCode | First 5 digits of postal code | NUM(5) |
| ZipCode4 | ZipCode4 | Digits 6-9 of postal code | NUM(4) |
| County | County | 2-digit MMIS county code | CHAR(2) |
| NumPhone | NumPhone | Primary phone number | NUM(10) |
| IndPhone | IndPhone | Phone type (H/C/W) | CHAR(1) |

#### Additional Address Node (Mailing — "IM")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AdditionalAddressType | AdditionalAddressType | "IM" | CHAR(2), IRIS Mailing |
| AdditionalAddress2 | AdditionalAddress2 | Street address | CHAR(30), required |
| AdditionalCity | AdditionalCity | City | CHAR(18) |
| AdditionalState | AdditionalState | 2-char MMIS state code | CHAR(2) |
| AdditionalZipCode | AdditionalZipCode | First 5 digits | NUM(5) |
| AdditionalZipCode4 | AdditionalZipCode4 | Digits 6-9 | NUM(4) |
| AdditionalCounty | AdditionalCounty | 2-digit MMIS county code | CHAR(2) |

#### Waiver Enrollment Node

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | CHAR(10), always "IRIS" |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | CHAR(25), from active ICA assignment |
| TransactionType | TransactionType | **"C" (Closure)** | Re-sending closure per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | **"20260701"** (SAME as prior S340) | NUM(8), MUST match prior closure dates |
| DateEnrlEnd | DateEnrlEnd | **"20260930"** (SAME as prior S340) | NUM(8), MUST match prior closure dates |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — closure of active span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"64" (Deceased)** | CHAR(2), REAL translated reason code |
| StopReasonCode | StopReasonCode | **"64" (Deceased)** | CHAR(2), REAL translated reason code |
| RecertificationDueDate | RecertificationDueDate | ISP end date in CCYYMMDD | NUM(8) |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff | NUM(8) |

> **⚠️ KEY DIFFERENCES from prior S340 (TC-006):**
> - StartReasonCode: was "2W" (placeholder) → now **"64"** (Deceased — real reason)
> - StopReasonCode: was "2W" (placeholder) → now **"64"** (Deceased — real reason)
> - All other fields (dates, TransactionType, Status) remain IDENTICAL to the prior S340

#### FEA Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260701" | NUM(8), matches DateEnrlEff |
| FEAEndDate | FEAEndDate | "20260930" | NUM(8), matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | CHAR(1) |

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | **"SU" (Success)** | Closure re-sent with real reason — accepted |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "C" | Echoed — Closure |
| EffectiveDate | "20260701" | Same dates as prior S340 |
| EndDate | "20260930" | Same dates as prior S340 |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000013" | No ID swap expected |
| SubmittedClientID | "1430000013" | Echoed |
| Error Segment | Not present | No errors expected |

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
| `HasConflict` | 0 (false) | No conflict |
| `ResponseStatusCode` | "SU" | Closure re-sent successfully |
| `TransactionTypeCode` | "C" | Closure transaction |
| `LastSynchronizedTimestamp` | Updated datetime2 | Newer than pre-execution |
| `LastChangeTypeCode` | "DisenrolledSpanCreated" (or equivalent) | Disenrolled span triggered this |
| `MmisEffectiveDate` | **2026-07-01** | Unchanged from prior S340 |
| `MmisEndDate` | **2026-09-30** | Unchanged from prior S340 |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
```

Expected: **1 new row** (in addition to prior TC-006 S340 row)

**New Row — S345 (Re-send Closure with real reason):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | 2026-07-01 (same as prior S340) |
| `MmisEndDate` | 2026-09-30 (same as prior S340) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify StartReasonCode = "64", StopReasonCode = "64" |
| `ChangeTypeCode` | "DisenrolledSpanCreated" (or equivalent) |
| `TxnRefId` | {captured at runtime} |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | Transaction successful — no error messages |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (original enrollment — no change)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Unchanged |
| `EnrollmentDateRangeStartDate` | 2026-07-01 | Unchanged |
| `EnrollmentDateRangeEndDate` | 2026-09-30 | Unchanged — still end-dated |

### 5. Disenrolled Span Created — `ProgramEnrollmentModule.ProgramEnrollment`

```sql
SELECT StatusDisplayName, StatusReasonDisplayName,
       EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE CaseKey = '{CaseKey}' AND StatusDisplayName = 'Disenrolled'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Disenrolled" | New disenrolled span |
| `StatusReasonDisplayName` | "Deceased" | User-selected reason |
| `EnrollmentDateRangeStartDate` | 2026-09-30 | Starts at enrollment end |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000013" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Enrollment Status | Shows end-dated enrollment + Disenrolled span |
| Disenrollment Reason | "Deceased" displayed |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → MMIS rejected the re-sent closure
- MMIS rejects because dates don't match existing span

### Payload Construction Failures
- TransactionType ≠ "C" → must be Closure (same as prior S340)
- Status ≠ "A" → closure of active span requires Status "A"
- DateEnrlEff ≠ prior S340 DateEnrlEff → dates must be IDENTICAL to prior closure
- DateEnrlEnd ≠ prior S340 DateEnrlEnd → dates must be IDENTICAL to prior closure
- StartReasonCode = "2W" → should be REAL translated code (e.g., "64"), NOT placeholder
- StopReasonCode = "2W" → should be REAL translated code (e.g., "64"), NOT placeholder
- Reason code not properly translated from BC disenrollment reason display name

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- MmisEffectiveDate or MmisEndDate changed (should remain same as prior S340)
- TransactionTypeCode not "C"

### Reason Code Translation Failures
- "Deceased" not translated to "64"
- Translation table lookup fails or returns wrong code
- Placeholder "2W" sent instead of real code

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction row not created for this transaction
- TxnRefId not properly incremented

### UI State Failures
- Conflict chip displayed when not expected
- Disenrollment reason not visible

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = "1430000013" |
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateEnrlEff** | `ProgramEnrollmentExtension.MmisEffectiveDate` = **"20260701"** (from prior S340 — unchanged) |
| **DateEnrlEnd** | `ProgramEnrollmentExtension.MmisEndDate` = **"20260930"** (from prior S340 — unchanged) |
| **StartReasonCode** | `ProgramEnrollment.StatusReasonDisplayName` → "Deceased" → translated via reason code lookup → **"64"** |
| **StopReasonCode** | Same translation as StartReasonCode → **"64"** |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → derive ID (8 chars) |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |

---

## Appendix: Disenrollment Reason Code Translation (Known Mappings)

| BC StatusReasonDisplayName | MMIS Reason Code | Notes |
|---------------------------|------------------|-------|
| Deceased | 64 | Used in this test case |
| Voluntary Withdrawal | (TBD) | Alternative reason |
| Moved Out of State | (TBD) | Alternative reason |
| Loss of Eligibility | (TBD) | Alternative reason |

> **Note:** The complete reason code translation table is maintained in the ICD-D01 V6.0 document. The "Deceased" (64) mapping is used as the example for this test case. Other reason codes should be validated in a follow-up test if needed.

---

## Related Test Cases

- TC-006: Enrollment End Date Changed to Earlier Date (S340 — prerequisite, sends placeholder 2W/2W)
- TC-001: New IRIS Enrollment — Happy Path (creates the initial enrollment)
- TC-009: Disenrolled → Enrolled — Reinstatement (reverse flow — goes from disenrolled back to enrolled)
- TC-008: Referral Withdrawn (another status-change scenario with different mechanism)
