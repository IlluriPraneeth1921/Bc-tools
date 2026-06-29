# TC-026: SDPC Enrollment End Date Changed to Earlier Date (Disenrollment)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-026 |
| Scenario | SDPC Enrollment End Date Changed to Earlier Date (Disenrollment) |
| Test Participant MA ID | **1430000012** |
| Program Type | SDPC |
| Decision Table | S100 (Condition 8) → S210 → S220 (Condition 4) → S340 (Column 2 SDPC) |
| Business Rules | BR-D01-011, BR-D01-012, BR-D01-015, BR-D01-020, BR-D01-021 |
| Trigger | User updates existing SDPC enrollment end date to an earlier date (disenrollment) |
| Transaction Count | 1 MMIS transaction |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in SDPC with a successful prior sync (TC-015 executed, ResponseStatusCode = "SU")
2. Active MMIS SDPC enrollment span exists: DateSDPCEffective = enrollment start, DateSDPCEnd = 22991231
3. User changes enrollment end date from NULL to a specific earlier date (e.g., 2026-09-30)
4. Active SDPC Oversight Agency assignment exists with valid SDPC Provider ID
5. Active SDPC Nurse assignment exists (IsPrimary = true)
6. No existing suspensions for this SDPC enrollment
7. **Key SDPC differences from TC-006 (IRIS disenrollment):**
   - API endpoint: SDPCEnrollmentRequest (not EnrollmentRequest)
   - TransactionType = "C" (Closure) — same as IRIS for shortening end date
   - Uses SDPCAgencyID (not WaiverAgencyID)
   - Uses DateSDPCEffective/DateSDPCEnd (not DateEnrlEff/DateEnrlEnd)
   - WorkerID is CHAR(15) from SDPC Nurse (not CHAR(8) from ICA Consultant)
   - NO Address Node, NO Additional Address Node, NO FEA Node
   - Response: Only "SU" activates (NOT "SE" — per BR-D01-015)
   - NO StartReasonCode/StopReasonCode for SDPC

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-015 must have been executed successfully first.** This test requires the participant already has an active SDPC enrollment in MMIS with a successful sync (SU response). The enrollment end date is being changed from NULL (open-ended) to a specific date.

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
| `EffectiveDateRangeEndDate` | NULL or after new enrollment end date | Must span updated enrollment period |

#### SDPC Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {SDPC Agency Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "5551234567" | → **SDPCAgencyID** in request |

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
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-015 execution |
| `ProgramKey` | {SDPC Program GUID} | FK to Program (DisplayName = "SDPC") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | SDPC enrollment begin (ANCHOR date) |
| `EnrollmentDateRangeEndDate` | **Being changed from NULL → 2026-09-30** | User changes end date to earlier date |
| `StatusDisplayName` | "Disenrolled" | Status changes to Disenrolled when end date is set |
| `IsPrimary` | true | |

### 8. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-015 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync required |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "A" | Prior SDPC Add/Update transaction |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) | From TC-015 response |
| `MmisEndDate` | 2299-12-31 | From TC-015 response (was open-ended) |

### 9. Pre-Execution Verification Query

```sql
-- Verify SDPC enrollment is active and synced with open-ended span
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeEndDate,
       pee.ResponseStatusCode, pee.HasConflict, pee.MmisEndDate, p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', EnrollmentDateRangeEndDate=NULL,
--           ResponseStatusCode='SU', HasConflict=0, MmisEndDate='2299-12-31', ProgramName='SDPC'

-- Verify no existing suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0

-- Verify SDPC agency assignment
SELECT li.Value AS SDPCProviderId
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'SDPC'
-- Expected: SDPCProviderId populated

-- Verify SDPC Nurse assignment
SELECT AssignedStaffMemberDisplayName, IsPrimary
FROM PersonModule.PersonStaffMemberAssignment
WHERE CaseKey = '{CaseKey}' AND AssignmentTypeSystemRoleDisplayName = 'SDPC Nurse'
  AND IsPrimary = 1 AND (EffectiveDateRangeEndDate IS NULL OR EffectiveDateRangeEndDate > GETDATE())
-- Expected: Active primary SDPC Nurse assigned
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 8 (Existing SDPC enrollment updated — end date changed):
   - Action #1: Call S210_Calculate_MMIS_SDPC_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S210** — Scenario S210 (Calculate MMIS SDPC spans):
   - Enrollment begin → new enrollment end date (2026-09-30) with Status A
3. **S220** — Condition 4 (End date moved to earlier date — disenrollment):
   - Action: Call S340 (Column 2 — SDPC) to close existing MMIS span with new earlier end date
4. **S340** — Column 2 (SDPC — Close/shorten existing span):
   - Constructs SDPCEnrollmentRequest
   - TransactionType = "C" (Closure for shortening)
   - DateSDPCEffective = existing begin (ANCHOR), DateSDPCEnd = new earlier end date

---

## Request Payload Verification

### Transaction 1: Close Existing Span (S340 Column 2 SDPC — Disenrollment)

> **⚠️ NOTE:** This uses the **SDPCEnrollmentRequest** API endpoint. NO Address Nodes, NO FEA Node.

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
| IdUniqueClient | IdUniqueClient | "1430000012" | CHAR(10), from PersonMedicaidNumbers.Value |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| NameMi | NameMi | Middle name (if exists) | CHAR(25), optional |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### SDPC Enrollment Node

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | **"IRIS"** | Fixed — always "IRIS" even for SDPC per ICD |
| SDPCAgencyID | SDPCAgencyID | **SDPC Provider ID** (e.g., "5551234567") | CHAR(25), from SDPC Oversight Agency |
| TransactionType | TransactionType | **"C" (Closure)** | Per BR-D01-021 — shortening end date uses Closure |
| DateSDPCEffective | DateSDPCEffective | **"20260701"** (existing MMIS begin — ANCHOR) | NUM(8), existing span begin — NOT changed |
| DateSDPCEnd | DateSDPCEnd | **"20260930"** (new earlier end date) | NUM(8), user-entered disenrollment date |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — disenrollment closure uses A, NOT I |
| WorkerID | WorkerID | **SDPC Nurse worker ID** (15 chars) | **CHAR(15)** — from SDPC Nurse role |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective ("20260701") | NUM(8) |
| RecertificationDueDate | RecertificationDueDate | ISP end date | NUM(8) |

> **⚠️ CRITICAL SDPC Differences from TC-006 (IRIS):**
> - **NO Address Node** — SDPCEnrollmentRequest does not include residential address
> - **NO Additional Address Node** — no mailing address
> - **NO FEA Node** — SDPC does not use FEA
> - **WorkerID is 15 characters** (IRIS is 8) — derived from SDPC Nurse role
> - **SDPCAgencyID** field (IRIS uses WaiverAgencyID)
> - **DateSDPCEffective/DateSDPCEnd** (IRIS uses DateEnrlEff/DateEnrlEnd)
> - **NO StartReasonCode/StopReasonCode** — SDPC does not use reason codes for disenrollment

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | **"SU" (Success)** | Per BR-D01-015 — ONLY "SU" activates SDPC |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "C" | Echoed — Closure |
| EffectiveDate | Same as DateSDPCEffective sent (e.g., "20260701") | Echoed |
| EndDate | Same as DateSDPCEnd sent (e.g., "20260930") | Echoed — new earlier end |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000012" | No ID swap expected |
| SubmittedClientID | "1430000012" | Echoed |
| ErrorType | **NOT PRESENT** | SDPC response does NOT include ErrorType field |
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
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — same record updated |
| `HasConflict` | 0 (false) | No conflict for successful closure |
| `ResponseStatusCode` | "SU" | Success |
| `TransactionTypeCode` | "C" | Closure transaction |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin — ANCHOR) | From response EffectiveDate |
| `MmisEndDate` | 2026-09-30 (new earlier end date) | From response EndDate |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "Disenrollment" (or equivalent code) | Type of change |
| `LastSuspensionChangeTypeCode` | NULL | No suspension involvement |
| `PreUpdateBeginDate` | 2026-07-01 | Enrollment begin date BEFORE this update |
| `PreUpdateEndDate` | NULL (was open-ended) | Enrollment end date BEFORE this update |
| `PreUpdateSuspensionStartDate` | NULL | No suspension |
| `PreUpdateSuspensionEndDate` | NULL | No suspension |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
```

Expected: **1 new row** (in addition to TC-015 initial enrollment sync row)

**New Row — S340 Column 2 (Close Span — SDPC Disenrollment):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | 2026-07-01 (ANCHOR begin date) |
| `MmisEndDate` | 2026-09-30 (new earlier end) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000012" |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — full SDPCEnrollmentRequest payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "Disenrollment" (or equivalent) |
| `SuspensionChangeTypeCode` | NULL |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {captured at runtime} |

### 2a. `CustomerProgramEnrollmentModule.SyncTransactionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey IN (
  SELECT SyncTransactionKey FROM CustomerProgramEnrollmentModule.SyncTransaction
  WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
)
```

Expected: **No rows** — successful closure, no error messages

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — successful disenrollment

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeStartDate, pe.EnrollmentDateRangeEndDate,
       p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Disenrolled" | Reflects end date being set |
| `EnrollmentDateRangeEndDate` | 2026-09-30 | New earlier end date |
| `ProgramName` | "SDPC" | Correct program type |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
```

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| Active `Value` | "1430000012" (unchanged) |

### 6. Verify NO Address/FEA Payload Content

```sql
SELECT RequestJsonTextFile
FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
-- Manual verification: Request payload should NOT contain:
-- AddressType, Address1, Address2, City, State, ZipCode, County
-- AdditionalAddressType, WaiverFEA, FEAEffectiveDate, FEAEndDate, FEAStatus
-- WaiverAgencyID (should be SDPCAgencyID instead)
-- DateEnrlEff/DateEnrlEnd (should be DateSDPCEffective/DateSDPCEnd)
-- StartReasonCode/StopReasonCode (SDPC does not use reason codes)
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
| Enrollment End Date | Displays 09/30/2026 |
| Enrollment Status | "Disenrolled" |
| Program Type | "SDPC" |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → enrollment not properly closed in MMIS
- ResponseStatus = "SE" and system treats as success → BR-D01-015 violated (SDPC requires "SU" only)
- ErrorType field present in response (SDPC response should not have this field)

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- PreUpdateEndDate not captured as NULL (prior open-ended state)
- MmisEndDate not updated to new earlier date (2026-09-30)
- TransactionTypeCode not "C" (should be Closure)
- ResponseStatusCode stored as anything other than "SU"

### Payload Construction Failures
- TransactionType ≠ "C" → BR-D01-021 violated (shortening end date must use Closure)
- Status = "I" instead of "A" → BR-D01-020 violated (disenrollment uses Active, not Inactive)
- DateSDPCEffective ≠ existing MMIS begin date → ANCHOR date not preserved
- DateSDPCEnd ≠ new earlier end date (2026-09-30)
- Field named "WaiverAgencyID" used instead of "SDPCAgencyID" → wrong field name
- Field named "DateEnrlEff" used instead of "DateSDPCEffective" → wrong field name
- Field named "DateEnrlEnd" used instead of "DateSDPCEnd" → wrong field name
- WorkerID truncated to 8 chars instead of 15 → SDPC uses CHAR(15)
- WorkerID derived from ICA Consultant role instead of SDPC Nurse → wrong role
- Address Node present in payload → SDPC does NOT send addresses
- Additional Address Node present in payload → SDPC does NOT send addresses
- FEA Node present in payload → SDPC does NOT use FEA
- StartReasonCode/StopReasonCode present in payload → SDPC does not use reason codes

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction row not created for this transaction
- Stored request contains address/FEA fields that should not be present

### UI State Failures
- Conflict chip displayed when not expected
- Program type showing as "IRIS" instead of "SDPC"
- Enrollment activated on "SE" response (should only activate on "SU")

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
| **SDPCAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = '**SDPC**' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **DateSDPCEffective** | `ProgramEnrollmentExtension.MmisEffectiveDate` (existing MMIS begin — ANCHOR) |
| **DateSDPCEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` (new earlier end date, formatted CCYYMMDD) |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role = '**SDPC Nurse**' AND `IsPrimary` = 1 AND active → derive ID (truncated to **15 chars**) |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **RecertificationCompletionDate** | Same as DateSDPCEffective |
| **Address fields** | **NOT APPLICABLE** — SDPC does not send address |
| **WaiverFEA / FEA fields** | **NOT APPLICABLE** — SDPC does not use FEA |
| **StartReasonCode / StopReasonCode** | **NOT APPLICABLE** — SDPC does not use reason codes |

---

## Related Test Cases

- TC-015: New SDPC Enrollment — Happy Path (prerequisite — must succeed first)
- TC-006: Enrollment End Date Earlier — IRIS (IRIS counterpart — compare field differences)
- TC-027: SDPC Suspension Deleted (another SDPC modification scenario)
- TC-018: New SDPC Suspension (SDPC suspension — same participant state)
