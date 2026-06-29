# TC-019: Enrollment Begin Date Changed to Earlier Date

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-019 |
| Scenario | Enrollment Begin Date Changed to Earlier Date — Delete + Recreate Span |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 2) → S200 → S220 (Condition 2) → S310 + S300 |
| Business Rules | BR-D01-001, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User changes enrollment begin date to an earlier date |
| Transaction Count | 2 MMIS transactions (Delete existing span + Create new span with earlier begin) |
| Transaction Ordering | S310 (delete) must precede S300 (create) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists: begin date = 2026-07-01, end date = 22991231
3. User changes enrollment begin date from 2026-07-01 to **2026-06-15** (earlier)
4. Active ICA assignment exists with valid Medicaid Provider ID spanning new enrollment period
5. Active FEA assignment exists with valid dates spanning new (longer) enrollment period
6. No existing suspensions for this enrollment
7. **Key mechanism:** S310 requires EXACT date match on existing span (DateEnrlEff/DateEnrlEnd must match what MMIS currently has). S300 then creates brand new span with new begin date.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-001 must have been executed successfully first.** This test requires that the participant already has an active IRIS enrollment in MMIS with a successful sync.

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
| `Value` | **"1430000012"** | 10-char Medicaid ID → IdUniqueClient |
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
| `LocationKey` | {ICA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | **On or before 2026-06-15** (new earlier begin) | Must be active at new enrollment start |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in both transactions |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | **On or before 2026-06-15** (new earlier begin) | Must span new enrollment period |
| `EffectiveDateRangeEndDate` | NULL or >= enrollment end date | Must span enrollment period |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in both transactions |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | **Being changed from 2026-07-01 → 2026-06-15** | User changes begin date to earlier |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" to MMIS (unchanged) |
| `StatusDisplayName` | "Enrolled" | Must be enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-001 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync required |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction |
| `LastSynchronizedTimestamp` | Valid datetime2 | From TC-001 execution |
| `MmisEffectiveDate` | **2026-07-01** | Existing MMIS begin date (will be deleted) |
| `MmisEndDate` | **2299-12-31** | Existing MMIS end date (will be deleted) |

### 12. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 13. Pre-Execution Verification Query

```sql
-- Verify enrollment is active and synced with known MMIS dates
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeStartDate,
       pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', EnrollmentDateRangeStartDate=2026-07-01 (pre-change),
--           ResponseStatusCode='SU', MmisEffectiveDate=2026-07-01, MmisEndDate=2299-12-31

-- Verify ICA/FEA assignments span the NEW earlier begin date
SELECT pla.PersonLocationAssignmentTypeDisplayName, pla.EffectiveDateRangeStartDate
FROM PersonModule.PersonLocationAssignment pla
WHERE pla.CaseKey = '{CaseKey}'
  AND pla.PersonLocationAssignmentTypeDisplayName IN ('ICA', 'FEA')
  AND pla.EffectiveDateRangeEndDate IS NULL
-- Expected: Both ICA and FEA start dates <= 2026-06-15

-- Verify no existing suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 2 (Existing IRIS enrollment updated — begin date changed):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - New begin date (2026-06-15) → existing end date (22991231) with Status A
3. **S220** — Condition 2 (Begin date changed to earlier date):
   - Action #1: Call S310 (Delete existing MMIS span — requires EXACT date match)
   - Action #2: Call S300 (Create new span with new earlier begin date)
4. **S310** — (Delete existing span):
   - Constructs deletion request: TransactionType = "O", Status = "I" (Inactive/Delete)
   - **CRITICAL:** DateEnrlEff and DateEnrlEnd must EXACTLY match the existing MMIS span dates
   - Uses StartReasonCode = "2L" and StopReasonCode = "2B" (Begin Date Changed)
5. **S300** — (Create new enrollment span):
   - Constructs new enrollment: TransactionType = "O", Status = "A"
   - DateEnrlEff = new earlier begin date (2026-06-15)
   - DateEnrlEnd = existing end date (22991231)

---

## Request Payload Verification

### Transaction 1: Delete Existing Span (S310 — Delete with EXACT Date Match)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnSource | TxnSource | "CMMRT" | Fixed |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | First transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID (e.g., "1234567890") | Active ICA |
| TransactionType | TransactionType | **"O" (Open)** | Delete uses TransactionType "O" with Status "I" |
| DateEnrlEff | DateEnrlEff | **"20260701"** (EXACT existing MMIS begin) | **MUST match existing MMIS span exactly** |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** (EXACT existing MMIS end) | **MUST match existing MMIS span exactly** |
| Status | Status | **"I" (Inactive/Delete)** | Status "I" = delete the span |
| StartReasonCode | StartReasonCode | **"2L"** | Per BR-D01-022 — enrollment change |
| StopReasonCode | StopReasonCode | **"2B" (Begin Date Changed)** | Per BR-D01-022 — begin date changed |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | **"20260701"** (EXACT existing MMIS begin) | Must match DateEnrlEff |
| FEAEndDate | FEAEndDate | **"22991231"** (EXACT existing MMIS end) | Must match DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active on deletion |

> **⚠️ CRITICAL:** S310 requires EXACT date match. DateEnrlEff and DateEnrlEnd must be the SAME values currently stored in MMIS (from `ProgramEnrollmentExtension.MmisEffectiveDate` and `MmisEndDate`). If dates don't match, MMIS will reject the deletion.

### Transaction 2: Create New Span with Earlier Begin (S300 — New Enrollment)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | Second transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID (e.g., "1234567890") | Active ICA |
| TransactionType | TransactionType | **"O" (Open)** | New span creation |
| DateEnrlEff | DateEnrlEff | **"20260615"** (new earlier begin date) | Changed enrollment begin |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | Same end date (open-ended) |
| Status | Status | **"A" (Active)** | Active enrollment |
| StartReasonCode | StartReasonCode | **"2L"** | Per BR-D01-022 — enrollment change |
| StopReasonCode | StopReasonCode | Not Required | End date is 12/31/2299 |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | **"20260615"** (new earlier begin date) | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | **"22991231"** | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active span |

---

## Expected MMIS Response

### Transaction 1 (S310 — Delete)

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | Existing span deleted |
| TransactionType | "O" | Echoed |
| EffectiveDate | "20260701" | EXACT match of existing begin |
| EndDate | "22991231" | EXACT match of existing end |
| IdUniqueClient | "1430000012" | No ID swap |

### Transaction 2 (S300 — Create)

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | New span created |
| TransactionType | "O" | Echoed |
| EffectiveDate | "20260615" | New earlier begin date |
| EndDate | "22991231" | Same end date |
| IdUniqueClient | "1430000012" | No ID swap |

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
| `ResponseStatusCode` | "SU" | Both transactions succeeded |
| `LastSynchronizedTimestamp` | Updated datetime2 | Newer than pre-execution |
| `LastChangeTypeCode` | "BeginDateChanged" (or equivalent) | Begin date was modified |
| `TransactionTypeCode` | "O" | Last transaction was Open (new span) |
| `MmisEffectiveDate` | **2026-06-15** (new earlier begin date) | Updated from Txn 2 |
| `MmisEndDate` | 2299-12-31 | Unchanged |
| `PreUpdateBeginDate` | **2026-07-01** | Enrollment begin BEFORE this update |
| `PreUpdateEndDate` | NULL | Enrollment end BEFORE this update (open-ended) |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp DESC
```

Expected: **2 new rows** (in addition to TC-001 sync row)

**Row 1 — S310 (Delete existing span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 (existing begin — EXACT match) |
| `MmisEndDate` | 2299-12-31 (existing end — EXACT match) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify Status = "I", StopReasonCode = "2B" |
| `ChangeTypeCode` | "BeginDateChanged" (or equivalent) |

**Row 2 — S300 (Create new span with earlier begin):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-06-15 (new earlier begin) |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify Status = "A", DateEnrlEff = "20260615" |
| `ChangeTypeCode` | "BeginDateChanged" (or equivalent) |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | Both transactions successful — no error messages |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (updated begin date)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Still enrolled |
| `EnrollmentDateRangeStartDate` | **2026-06-15** | New earlier begin date |
| `EnrollmentDateRangeEndDate` | NULL | Still open-ended |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000012" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Enrollment Begin Date | Displays **06/15/2026** (new earlier date) |
| Enrollment End Date | Not displayed / Open-ended |
| Enrollment Status | "Enrolled" |

---

## Failure Criteria

### Response Validation Failures
- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true
- S310 (delete) fails because date mismatch → MMIS cannot find span to delete

### Payload Construction Failures
- S310 DateEnrlEff ≠ existing MMIS effective date → EXACT match required, MMIS rejects
- S310 DateEnrlEnd ≠ existing MMIS end date → EXACT match required, MMIS rejects
- S310 Status ≠ "I" → must be Inactive to signal deletion
- S310 StopReasonCode ≠ "2B" → should indicate Begin Date Changed per BR-D01-022
- S300 DateEnrlEff ≠ new earlier begin date (2026-06-15) → wrong begin date on recreation
- S300 Status ≠ "A" → new span must be Active
- Transaction ordering incorrect (S310 must precede S300) → MMIS would have duplicate spans

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- MmisEffectiveDate not updated to new earlier date (2026-06-15)
- PreUpdateBeginDate not captured as 2026-07-01 (prior begin state)
- TransactionTypeCode not "O" (should be Open for both delete and create)
- FEA/ICA assignment EffectiveDateRangeStartDate > new begin date → assignment gap

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction rows not created (should be 2 new rows)
- TxnRefId not properly incremented

### UI State Failures
- Enrollment begin date not reflecting the new earlier value (06/15/2026)
- Conflict chip displayed when not expected

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = **"1430000012"** |
| **WaiverAgencyID** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **WaiverFEA** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateEnrlEff** (Txn 1 / S310) | `ProgramEnrollmentExtension.MmisEffectiveDate` = **"20260701"** (EXACT existing begin) |
| **DateEnrlEnd** (Txn 1 / S310) | `ProgramEnrollmentExtension.MmisEndDate` = **"22991231"** (EXACT existing end) |
| **DateEnrlEff** (Txn 2 / S300) | `ProgramEnrollment.EnrollmentDateRangeStartDate` = **"20260615"** (new earlier begin) |
| **DateEnrlEnd** (Txn 2 / S300) | `ProgramEnrollment.EnrollmentDateRangeEndDate` → NULL = "22991231" |
| **StartReasonCode** (both txns) | Fixed value **"2L"** per BR-D01-022 |
| **StopReasonCode** (Txn 1) | Fixed value **"2B"** (Begin Date Changed) per BR-D01-022 |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → derive ID (8 chars) |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **RecertificationCompletionDate** | Same as DateEnrlEff (per transaction) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — must succeed first)
- TC-006: Enrollment End Date Changed to Earlier (disenrollment — different scenario, end date changes)
- TC-007: Enrollment End Date Changed to Later (extending end date — uses different S220 condition)
