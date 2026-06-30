# TC-027: SDPC Suspension Deleted

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-027 |
| Scenario | SDPC Suspension Deleted |
| Test Participant MA ID | **1430000013** |
| Program Type | SDPC |
| Decision Table | S100 (Condition 10) → S210 → S230 (Condition 5) → S410 + S470 (Column 2 SDPC) |
| Business Rules | BR-D01-011, BR-D01-015, BR-D01-020, BR-D01-021 |
| Trigger | User deletes an existing SDPC suspension record |
| Transaction Count | 2 MMIS transactions |
| Transaction Ordering | S410 (delete Span-B) → S470 (extend Span-A) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant has active SDPC enrollment with an existing suspension that was previously synced successfully
2. TC-018 executed: MMIS currently has 3 SDPC spans: Span-A (active), Span-B (suspended), Span-C (active)
3. User deletes the suspension record from Blue Compass
4. Active SDPC Oversight Agency assignment exists with valid SDPC Provider ID
5. Active SDPC Nurse assignment exists (IsPrimary = true)
6. Prior sync was successful (ResponseStatusCode = "SU") with all 3 spans in MMIS
7. **Key SDPC differences from TC-012 (IRIS suspension deleted):**
   - API endpoint: SDPCEnrollmentRequest (not EnrollmentRequest)
   - TransactionType = "A" for Open/extend (not "O") — per BR-D01-021
   - Uses SDPCAgencyID (not WaiverAgencyID)
   - Uses DateSDPCEffective/DateSDPCEnd (not DateEnrlEff/DateEnrlEnd)
   - WorkerID is CHAR(15) from SDPC Nurse (not CHAR(8) from ICA Consultant)
   - NO Address Node, NO Additional Address Node, NO FEA Node
   - NO StartReasonCode/StopReasonCode

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-018 must have been executed successfully first.** This test requires the participant has an active SDPC enrollment with a previously synced suspension (3 MMIS spans: Span-A active, Span-B suspended, Span-C active).

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

### 4. SDPC Oversight Agency Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {SDPC Agency Location GUID} | FK → used to look up SDPC Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | **"SDPC"** | Must be "SDPC" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### SDPC Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {SDPC Agency Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "5551234567" | → **SDPCAgencyID** in both transactions |

### 5. SDPC Nurse Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "Mary Johnson-Smith" | Used to derive WorkerID (15 chars for SDPC) |
| `AssignmentTypeSystemRoleDisplayName` | **"SDPC Nurse"** | Role filter for SDPC worker lookup |
| `IsPrimary` | **true** | Must be primary SDPC Nurse |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 6. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 7. Existing SDPC Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-015/TC-018 execution |
| `ProgramKey` | {SDPC Program GUID} | FK to Program (DisplayName = "SDPC") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | SDPC enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended enrollment |
| `StatusDisplayName` | "Enrolled" | Must be enrolled |
| `IsPrimary` | true | |

### 8. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-018 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync (TC-018 completed) |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "A" | Prior SDPC Add/Update (last was Span-C) |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-08-10 (Span-C begin — BC suspension end) | From TC-018 last transaction |
| `MmisEndDate` | 2299-12-31 | From TC-018 last transaction |

### 9. Existing Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record EXISTS (from TC-018) and is being DELETED by the user (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {existing GUID} | PK — from TC-018 |
| `Version` | 1 | From TC-018 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | Existing BC Suspension Start Date |
| `DateRangeEndDate` | **2026-08-10** | Existing BC Suspension End Date |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |

### 10. Existing MMIS Spans (from TC-018 prior sync)

| Span | Status | MMIS Begin (DateSDPCEffective) | MMIS End (DateSDPCEnd) | Notes |
|------|--------|-------------------------------|------------------------|-------|
| Span-A | Active (A) | 2026-07-01 | 2026-07-10 | Pre-suspension active span |
| Span-B | Suspended (S) | 2026-07-11 | 2026-08-09 | Suspension span (+1/-1 offsets) |
| Span-C | Active (A) | 2026-08-10 | 2299-12-31 | Post-suspension active span |

### 11. Pre-Execution Verification Query

```sql
-- Verify SDPC enrollment is active and synced with suspension
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate, p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0, ProgramName='SDPC'

-- Verify existing suspension record
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: DateRangeStartDate='2026-07-10', DateRangeEndDate='2026-08-10'

-- Verify prior sync transactions (3 from TC-018 + 1 from TC-015)
SELECT COUNT(*) FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
-- Expected: 4 (TC-015 initial + TC-018 three transactions)
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 10 (Existing SDPC suspension table entry deleted):
   - Action #1: Call S210_Calculate_MMIS_SDPC_Spans
   - Action #5: Call S230_Suspense_Modify_Delete
2. **S210** — Scenario S210 (Calculate MMIS SDPC spans):
   - With suspension deleted, recalculate: single continuous active span from enrollment begin to enrollment end (22991231)
3. **S230** — Condition 5 (Suspension record deleted):
   - Action #1: Call S410 Column 2 (SDPC — Delete Span-B)
   - Action #2: Call S470 Column 2 (SDPC — Extend Span-A end date to Span-C begin - 1)
4. **S410** — Column 2 (SDPC — Delete Suspense Span-B):
   - TransactionType = "A", Status = "I" (delete the suspended span)
   - DateSDPCEffective/DateSDPCEnd must EXACTLY match existing Span-B in MMIS
5. **S470** — Column 2 (SDPC — Extend Span-A to fill gap):
   - TransactionType = "A", Status = "A" (extend active span)
   - DateSDPCEffective = Span-A begin (anchor), DateSDPCEnd = Span-C begin - 1

---

## Request Payload Verification

> **⚠️ NOTE:** Both transactions use the **SDPCEnrollmentRequest** API endpoint. NO Address Nodes, NO FEA Node.

### Transaction 1: Delete Suspension Span (S410 Column 2 SDPC — Delete Span-B)

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8), system-generated |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6), system-generated |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | CHAR(10), first transaction |

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

#### SDPC Enrollment Node (Transaction 1 — S410)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | **"IRIS"** | Fixed — always "IRIS" even for SDPC |
| SDPCAgencyID | SDPCAgencyID | "5551234567" | From SDPC Oversight Agency |
| TransactionType | TransactionType | **"A" (Add/Update)** | Per BR-D01-021 — SDPC uses "A" (not "O") with Status "I" for delete |
| DateSDPCEffective | DateSDPCEffective | **"20260711"** | Existing Span-B begin (EXACT MATCH required for delete) |
| DateSDPCEnd | DateSDPCEnd | **"20260809"** | Existing Span-B end (EXACT MATCH required for delete) |
| Status | Status | **"I" (Inactive)** | Per BR-D01-020 — delete uses Status "I" |
| WorkerID | WorkerID | SDPC Nurse worker ID | **CHAR(15)** — from SDPC Nurse role |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective ("20260711") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |

### Transaction 2: Extend Span-A End Date (S470 Column 2 SDPC — Fill Gap)

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8) |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6) |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | CHAR(10), second transaction |

#### Demographic Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| IdUniqueClient | IdUniqueClient | "1430000013" | CHAR(10) |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| NameMi | NameMi | Middle name (if exists) | CHAR(25) |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### SDPC Enrollment Node (Transaction 2 — S470)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | **"IRIS"** | Fixed — always "IRIS" even for SDPC |
| SDPCAgencyID | SDPCAgencyID | "5551234567" | From SDPC Oversight Agency |
| TransactionType | TransactionType | **"A" (Add/Update)** | Per BR-D01-021 — SDPC uses "A" (not "O") for extending |
| DateSDPCEffective | DateSDPCEffective | **"20260701"** | Span-A begin (ANCHOR — existing MMIS begin) |
| DateSDPCEnd | DateSDPCEnd | **"20260809"** | Span-C begin - 1 day (2026-08-10 - 1 = 2026-08-09) |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — extending active span |
| WorkerID | WorkerID | SDPC Nurse worker ID | **CHAR(15)** — from SDPC Nurse role |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective ("20260701") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |

> **⚠️ CRITICAL SDPC Differences from TC-012 (IRIS):**
> - TransactionType "A" for BOTH transactions (IRIS uses "O" for both)
> - Field names: DateSDPCEffective/DateSDPCEnd (not DateEnrlEff/DateEnrlEnd)
> - SDPCAgencyID (not WaiverAgencyID)
> - WorkerID CHAR(15) from SDPC Nurse (not CHAR(8) from ICA Consultant)
> - NO Address, Additional Address, or FEA nodes in payload
> - NO StartReasonCode/StopReasonCode

---

## Expected MMIS Response

| Transaction | ResponseStatus | Key Verification |
|-------------|---------------|------------------|
| Transaction 1 (S410 — Delete Span-B) | "SU" | Span-B deleted — dates match exactly |
| Transaction 2 (S470 — Extend Span-A) | "SU" | Span-A extended to fill gap |

> **Note:** After both transactions succeed, MMIS has 2 spans: Span-A (extended: 2026-07-01 to 2026-08-09) and Span-C (unchanged: 2026-08-10 to 2299-12-31). The suspended Span-B is removed.

> **⚠️ BR-D01-015:** For SDPC, ONLY "SU" is success. "SE" would NOT be considered successful.

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
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — same record updated |
| `HasConflict` | 0 (false) | No conflict — both transactions succeeded |
| `ResponseStatusCode` | "SU" | Both transactions successful |
| `TransactionTypeCode` | "A" | Last transaction type (S470 extend) |
| `TxnRefId` | {Txn 2 ref ID} | From last transaction |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (Span-A begin — anchor) | From last transaction (S470) |
| `MmisEndDate` | 2026-08-09 (Span-C begin - 1) | From last transaction (extended Span-A end) |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "SuspensionDeleted" (or equivalent) | Type of change |
| `LastSuspensionChangeTypeCode` | "Deleted" (or equivalent) | Suspension-specific change type |
| `PreUpdateBeginDate` | Prior MmisEffectiveDate | From before this update |
| `PreUpdateEndDate` | Prior MmisEndDate | From before this update |
| `PreUpdateSuspensionStartDate` | 2026-07-10 | Suspension start BEFORE deletion |
| `PreUpdateSuspensionEndDate` | 2026-08-10 | Suspension end BEFORE deletion |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp
```

Expected: **2 new rows** (in addition to prior TC-015 + TC-018 sync rows)

**Row 1 — S410 Column 2 (Delete Span-B):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "A" |
| `MmisEffectiveDate` | 2026-07-11 (Span-B begin — exact match) |
| `MmisEndDate` | 2026-08-09 (Span-B end — exact match) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — verify Status="I", SDPCAgencyID, NO address/FEA |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "SuspensionDeleted" (or equivalent) |
| `SuspensionChangeTypeCode` | "Deleted" (or equivalent) |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {first transaction ref ID} |

**Row 2 — S470 Column 2 (Extend Span-A):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "A" |
| `MmisEffectiveDate` | 2026-07-01 (Span-A begin — anchor) |
| `MmisEndDate` | 2026-08-09 (Span-C begin - 1 — extended end) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — verify Status="A", SDPCAgencyID, NO address/FEA |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "SuspensionDeleted" (or equivalent) |
| `SuspensionChangeTypeCode` | "Deleted" (or equivalent) |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {second transaction ref ID} |

### 2a. `CustomerProgramEnrollmentModule.SyncTransactionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey IN (
  SELECT SyncTransactionKey FROM CustomerProgramEnrollmentModule.SyncTransaction
  WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
)
```

Expected: **No new rows** — both transactions successful, no error messages

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — all transactions successful

### 4. `ProgramEnrollmentModule.ProgramEnrollmentSuspension` — DELETED

```sql
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

Expected: **0 rows** — suspension record deleted by user action

### 5. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeEndDate, p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Enrollment status unchanged — suspension removed |
| `EnrollmentDateRangeEndDate` | NULL | Still open-ended |
| `ProgramName` | "SDPC" | Correct program type |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| Active `Value` | "1430000013" (unchanged) |

### 7. Verify NO Address/FEA Payload Content

```sql
SELECT RequestJsonTextFile
FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
-- Manual verification: BOTH request payloads should NOT contain:
-- AddressType, Address1, City, State, ZipCode
-- WaiverFEA, FEAEffectiveDate, FEAEndDate, FEAStatus
-- WaiverAgencyID (should be SDPCAgencyID)
-- DateEnrlEff/DateEnrlEnd (should be DateSDPCEffective/DateSDPCEnd)
-- StartReasonCode/StopReasonCode
```

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Suspension record | Removed from UI (no suspension displayed) |
| Enrollment Status | "Enrolled" |
| Program Type | "SDPC" |
| Transaction Count | 2 new transactions recorded |

---

## Failure Criteria

### Response Validation Failures
- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true
- ResponseStatus = "SE" and system treats as success → BR-D01-015 violated (SDPC requires "SU" only)
- Partial failure: S410 succeeds but S470 fails → inconsistent MMIS state

### Data Integrity Failures
- HasConflict set to 1 when both responses were SU
- SyncTransaction row count ≠ 2 new rows
- ProgramEnrollmentSuspension row still exists after deletion
- PreUpdateSuspensionStartDate/EndDate not captured
- TransactionTypeCode stored as "O" instead of "A" for SDPC

### Payload Construction Failures
- Transaction 1: TransactionType = "O" instead of "A" → SDPC uses "A" not "O"
- Transaction 1: Status ≠ "I" → BR-D01-020 violated (delete must use Inactive)
- Transaction 1: DateSDPCEffective/DateSDPCEnd ≠ existing Span-B dates → exact match required
- Transaction 2: TransactionType = "O" instead of "A" → SDPC uses "A" not "O"
- Transaction 2: DateSDPCEffective ≠ Span-A begin (anchor)
- Transaction 2: DateSDPCEnd ≠ Span-C begin - 1 → gap not properly filled
- Transaction 2: Status ≠ "A" → active span must use Active
- Field named "WaiverAgencyID" used instead of "SDPCAgencyID"
- Field named "DateEnrlEff"/"DateEnrlEnd" used instead of "DateSDPCEffective"/"DateSDPCEnd"
- WorkerID truncated to 8 chars instead of 15 → SDPC uses CHAR(15)
- WorkerID derived from ICA Consultant instead of SDPC Nurse
- Address/FEA Node present in payload → SDPC does NOT send these

### Transaction Ordering Failures
- Transactions sent in wrong order (must be S410 first, then S470)
- TxnRefId not properly incremented across transactions

### Audit Trail Failures
- RequestJsonTextFile is NULL in any SyncTransaction row
- Stored request contains address/FEA fields that should not be present

### UI State Failures
- Conflict chip displayed when not expected
- Program type showing as "IRIS" instead of "SDPC"
- Suspension still displayed after deletion

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = **"1430000013"** |
| **SDPCAgencyID** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = '**SDPC**' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateSDPCEffective** (Txn 1 / S410) | Existing Span-B begin from prior MMIS sync = "20260711" (exact match) |
| **DateSDPCEnd** (Txn 1 / S410) | Existing Span-B end from prior MMIS sync = "20260809" (exact match) |
| **DateSDPCEffective** (Txn 2 / S470) | Span-A begin (anchor) = "20260701" |
| **DateSDPCEnd** (Txn 2 / S470) | Span-C begin - 1 = "20260809" (2026-08-10 - 1 day) |
| **WorkerID** (both txns) | `PersonModule.PersonStaffMemberAssignment` → WHERE role = '**SDPC Nurse**' AND `IsPrimary` = 1 AND active → derive ID (**15 chars**) |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **Address fields** | **NOT APPLICABLE** — SDPC does not send address |
| **WaiverFEA / FEA fields** | **NOT APPLICABLE** — SDPC does not use FEA |
| **StartReasonCode / StopReasonCode** | **NOT APPLICABLE** — SDPC does not use reason codes |

---

## Related Test Cases

- TC-018: New SDPC Suspension (prerequisite — SDPC suspension must exist before deletion)
- TC-015: New SDPC Enrollment (prerequisite — initial SDPC enrollment)
- TC-012: Suspension Deleted — IRIS (IRIS counterpart — compare field differences)
- TC-026: SDPC Enrollment End Date Earlier (another SDPC modification scenario)
