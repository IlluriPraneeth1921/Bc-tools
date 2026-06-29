# TC-024: Suspension End Date Changed to Later Valid Date (S230_004)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-024 |
| Scenario | Suspension End Date Changed to Later Valid Date (S230_004) |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 4) → S200 → S230 (Condition 4) → S310 + S445 + S520 |
| Business Rules | BR-D01-001, BR-D01-018, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User changes existing suspension end date to a later valid date |
| Transaction Count | 3 MMIS transactions |
| Transaction Ordering | S310 first (delete old Span-C), S445 second (extend Span-B end), S520 third (create new Span-C) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant has active enrollment with an existing suspension that was previously synced successfully
2. MMIS currently has 3 spans: Span-A (active 07/01-07/10), Span-B (suspended 07/11-08/09), Span-C (active 08/10-22991231)
3. User changes BC suspension end date from 2026-08-10 to **2026-09-15** (later)
4. Active ICA assignment exists with valid Medicaid Provider ID
5. Active FEA assignment exists with valid dates
6. Prior sync was successful (ResponseStatusCode = "SU") with all 3 spans in MMIS
7. **Key constraint:** Span-C deleted, Span-B extended, new Span-C created at later boundary.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-002 must have been executed successfully first.** This test requires that the participant already has an active IRIS enrollment with a previously synced suspension (3 MMIS spans).

The following Carity database tables and columns must be in the specified state before test execution.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | e.g., "TESTLAST" | Maps to NameLast (first 20 chars for MMIS matching) |
| `NameFirstName` | e.g., "TESTFIRST" | Maps to NameFirst (first 15 chars for MMIS matching) |
| `NameMiddleName` | e.g., "M" | Optional, maps to NameMi |
| `NameSuffixName` | e.g., "JR" | Optional, must be in T_RE_CDE_NAME_SUFFIX |
| `BirthDate` | e.g., 1985-03-15 | Maps to DateBirth (CCYYMMDD) |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | Translated to M/F/U for MMIS Sex field |

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
| `PhysicalAddressCareOfName` | e.g., "C/O JOHN DOE" or NULL | Maps to Address1 (spaces if empty) |
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

### 6–9. (Phone, ICA, FEA, ISP)

Same structure as TC-012/TC-021 — phone, ICA assignment with Medicaid Provider ID, FEA assignment with Medicaid Provider ID, and active ISP with start/end dates.

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001/TC-002 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended enrollment |
| `StatusDisplayName` | "Enrolled" | Must be enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-002 execution |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync (TC-002 completed) |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | Span-C begin date (e.g., 2026-08-10) | From TC-002 last transaction |
| `MmisEndDate` | 2299-12-31 | From TC-002 last transaction |

### 12. Existing Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record EXISTS (from TC-002) and is being MODIFIED — user changes end date to later.

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {existing GUID} | PK — from TC-002 |
| `Version` | 1 → 2 | Updated version after modification |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | Unchanged — BC Suspension Start Date |
| `DateRangeEndDate` | **2026-09-15** (changed from 2026-08-10) | **User changes to later** — triggering event |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |

### 13. Existing MMIS Spans (from TC-002 prior sync)

| Span | Status | MMIS Begin | MMIS End | Notes |
|------|--------|-----------|---------|-------|
| Span-A | Active (A) | 2026-07-01 | 2026-07-10 | Pre-suspension active span |
| Span-B | Suspended (S) | 2026-07-11 | 2026-08-09 | Suspension span (start+1, end-1 offsets) |
| Span-C | Active (A) | 2026-08-10 | 2299-12-31 | Post-suspension active span |

### 14. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | Used to derive WorkerID = "J.Smith" (truncated to 8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter for worker lookup |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 15. Pre-Execution Verification Query

```sql
-- Verify enrollment is active and synced with suspension
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0

-- Verify existing suspension record (after user change)
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: DateRangeStartDate='2026-07-10', DateRangeEndDate='2026-09-15'
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 4 (Existing IRIS suspension table entry modified):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #5: Call S230_Suspense_Modify_Delete
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Recalculate with new later end: Span-B end extended, Span-C begin moved later
3. **S230** — Condition 4 (Suspension end date changed to later valid date):
   - Action #1: Call S310 (Delete existing Span-C)
   - Action #2: Call S445 (Extend Span-B end date to later)
   - Action #3: Call S520 (Create new Span-C with later begin)
4. **S310** — (Delete existing Span-C):
   - TransactionType = "O", Status = "I", DateEnrlEff/DateEnrlEnd = exact match existing Span-C
5. **S445** — (Extend Span-B end date):
   - TransactionType = "O", Status = "S" (extending suspended span)
   - DateEnrlEff = Span-B begin (anchor), DateEnrlEnd = new BC end - 1 (09/14)
6. **S520** — (Create new Span-C):
   - TransactionType = "O", Status = "A" (new active span)
   - DateEnrlEff = new BC suspension end (09/15, no offset), DateEnrlEnd = 22991231

---

## Request Payload Verification

### Transaction 1: Delete Existing Span-C (S310)

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
| IdUniqueClient | IdUniqueClient | "1430000012" | CHAR(10) |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### Address Node (Residential — "IR") + Additional Address Node (Mailing — "IM")

Same structure as other test cases — full residential and mailing address nodes included.

#### Waiver Enrollment Node (Transaction 1 — S310)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — Status "I" uses TransactionType "O" |
| DateEnrlEff | DateEnrlEff | **"20260810"** | Existing Span-C begin (EXACT MATCH) |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | Existing Span-C end (EXACT MATCH) |
| Status | Status | **"I" (Inactive)** | Per BR-D01-020 — delete uses Status "I" |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2L"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2W"** | Per BR-D01-022 |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260810") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 1 — S310)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260810" | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | **"I" (Inactive)** | Matches span status for delete |

---

### Transaction 2: Extend Span-B End Date (S445)

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8) |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6) |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | CHAR(10), second transaction |

#### Waiver Enrollment Node (Transaction 2 — S445)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — extending end date to later uses Open |
| DateEnrlEff | DateEnrlEff | **"20260711"** | Span-B begin (ANCHOR — unchanged) |
| DateEnrlEnd | DateEnrlEnd | **"20260914"** | New BC suspension end - 1 (09/15 - 1 = 09/14, BR-D01-018) |
| Status | Status | **"S" (Suspended)** | Per BR-D01-020 — suspended span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2I"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2I"** | Per BR-D01-022 |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260711") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 2 — S445)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260711" | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | "20260914" | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | **"S" (Suspended)** | Matches span status |

---

### Transaction 3: Create New Span-C (S520)

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8) |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6) |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000003") | CHAR(10), third transaction |

#### Waiver Enrollment Node (Transaction 3 — S520)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — new span uses Open |
| DateEnrlEff | DateEnrlEff | **"20260915"** | New BC suspension end (no offset — first active day) |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | Open-ended enrollment end |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — post-suspension active span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2Q"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End = 22991231, no stop reason needed |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260915") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 3 — S520)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260915" | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | **"A" (Active)** | Matches span status |

---

## Expected MMIS Response

| Transaction | ResponseStatus | EffectiveDate | EndDate |
|-------------|---------------|---------------|---------|
| Transaction 1 (S310 — Delete Span-C) | "SU" | 20260810 | 22991231 |
| Transaction 2 (S445 — Extend Span-B) | "SU" | 20260711 | 20260914 |
| Transaction 3 (S520 — Create new Span-C) | "SU" | 20260915 | 22991231 |

### Multi-Transaction Response Handling

| Transaction | Decision Table Step | Expected ResponseStatus | Key Verification |
|-------------|--------------------|-----------------------|------------------|
| Txn 1 | S310 | "SU" | Old Span-C deleted |
| Txn 2 | S445 | "SU" | Span-B extended to later end |
| Txn 3 | S520 | "SU" | New Span-C created at later boundary |

> **Note:** After all transactions succeed, MMIS has 3 spans: Span-A (2026-07-01 to 2026-07-10, Active — unchanged), Span-B (2026-07-11 to 2026-09-14, Suspended — extended), Span-C (2026-09-15 to 2299-12-31, Active — new).

---

## Database Verification (Post-Execution State)

### 1. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `HasConflict` | 0 (false) | No conflict — all transactions succeeded |
| `ResponseStatusCode` | "SU" | All transactions successful |
| `TransactionTypeCode` | "O" | Last transaction type (S520 create) |
| `TxnRefId` | {Txn 3 ref ID} | From last transaction |
| `MmisEffectiveDate` | 2026-09-15 (new Span-C begin) | From last transaction (S520) |
| `MmisEndDate` | 2299-12-31 | From last transaction |
| `LastChangeTypeCode` | "SuspensionEndDateChanged" (or equivalent) | Type of change |
| `LastSuspensionChangeTypeCode` | "EndDateLater" (or equivalent) | Suspension-specific change type |
| `PreUpdateSuspensionStartDate` | 2026-07-10 | Suspension start (unchanged) |
| `PreUpdateSuspensionEndDate` | 2026-08-10 | Suspension end BEFORE change |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp
```

Expected: **3 new rows**

**Row 1 — S310:** `TransactionTypeCode`="O", `MmisEffectiveDate`=2026-08-10, `MmisEndDate`=2299-12-31, `ResponseStatusCode`="SU"

**Row 2 — S445:** `TransactionTypeCode`="O", `MmisEffectiveDate`=2026-07-11, `MmisEndDate`=2026-09-14, `ResponseStatusCode`="SU"

**Row 3 — S520:** `TransactionTypeCode`="O", `MmisEffectiveDate`=2026-09-15, `MmisEndDate`=2299-12-31, `ResponseStatusCode`="SU"

### 2a. `CustomerProgramEnrollmentModule.SyncTransactionMessages`

Expected: **No new rows** — all transactions successful

### 3. `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

```sql
SELECT * FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `DateRangeStartDate` | 2026-07-10 | BC suspension start (unchanged) |
| `DateRangeEndDate` | 2026-09-15 | BC suspension end (changed to later) |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Enrollment status unchanged |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Suspension Start Date | 07/10/2026 (unchanged) |
| Suspension End Date | 09/15/2026 (new later date) |
| Transaction Count | 3 new transactions recorded |

---

## Failure Criteria

### Response Validation Failures
- Any transaction returns ResponseStatus ≠ "SU" → HasConflict = true
- Partial failure: S310 succeeds but S445/S520 fail → Span-C deleted but Span-B not extended

### Data Integrity Failures
- HasConflict set to 1 when all responses were SU
- SyncTransaction row count ≠ 3 new rows
- PreUpdateSuspensionEndDate not captured as 2026-08-10

### Payload Construction Failures
- Transaction 1 (S310): DateEnrlEff/DateEnrlEnd ≠ existing Span-C dates → exact match required
- Transaction 1 (S310): Status ≠ "I" → delete must use Inactive
- Transaction 2 (S445): TransactionType ≠ "O" → extending suspended span to later uses Open
- Transaction 2 (S445): DateEnrlEnd ≠ new BC end - 1 (09/14) → BR-D01-018 violated
- Transaction 2 (S445): Status ≠ "S" → suspended span must remain Suspended
- Transaction 3 (S520): DateEnrlEff ≠ new BC suspension end (09/15, no offset)
- Transaction 3 (S520): Status ≠ "A" → post-suspension is Active

### Transaction Ordering Failures
- Transactions sent in wrong order (must be S310 → S445 → S520)
- MMIS may reject if Span-C not deleted before Span-B extended (overlapping)

### Audit Trail Failures
- RequestJsonTextFile is NULL in any SyncTransaction row
- TxnRefId not incrementing correctly across 3 transactions

### UI State Failures
- Conflict chip displayed when not expected
- Suspension end date not reflecting new value (09/15/2026)

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE `StatusDisplayName` = 'Active' → `Value` = "1430000012" |
| **NameLast** | `PersonModule.Person.NameLastName` |
| **NameFirst** | `PersonModule.Person.NameFirstName` |
| **DateBirth** | `PersonModule.Person.BirthDate` |
| **NumSsn** | `PersonModule.PersonIdentifiers` → WHERE `TypeDisplayName` = 'Social Security Number' → `Value` |
| **Sex** | `PersonModule.Person.BirthAssignedGenderDisplayName` → translate to M/F/U |
| **Address (IR)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Residential' AND `IsActive` = 1 AND `IsPrimary` = 1 |
| **Address (IM)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Mailing' AND `IsActive` = 1 AND `IsPrimary` = 1 |
| **WaiverAgencyID** (all txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** (all txns) | Same path but Type = 'FEA' |
| **DateEnrlEff** (Txn 1 / S310) | Existing Span-C begin (EXACT MATCH — 2026-08-10) |
| **DateEnrlEnd** (Txn 1 / S310) | Existing Span-C end (EXACT MATCH — 2299-12-31) |
| **DateEnrlEff** (Txn 2 / S445) | Span-B begin (ANCHOR — 2026-07-11) |
| **DateEnrlEnd** (Txn 2 / S445) | New BC suspension end - 1 day (2026-09-14, BR-D01-018) |
| **DateEnrlEff** (Txn 3 / S520) | New BC suspension end (2026-09-15, no offset) |
| **DateEnrlEnd** (Txn 3 / S520) | Enrollment end = NULL → "22991231" |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (active ISP) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — enrollment must exist)
- TC-002: Enrolled → Suspended with end date (prerequisite — suspension must exist with 3 spans)
- TC-023: Suspension End Date Changed to Earlier (mirror scenario — S230 Condition 3)
- TC-025: Suspension End Date Valid to Null (S230 Condition 7 — removes end entirely)
- TC-013: Suspension End Date Null to Valid (S230 Condition 6 — adds end from nothing)
