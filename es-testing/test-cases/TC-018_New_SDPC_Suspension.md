# TC-018: New SDPC Suspension — Happy Path

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-018 |
| Scenario | New SDPC Suspension — Close Active Span + Add Suspended Span + Create Post-Suspension Span |
| Test Participant MA ID | **1430000012** |
| Program Type | SDPC |
| Decision Table | S100 (Condition 9) → S210 → S240 (Condition 1) → S500 + S510 + S520 (all Column 2 SDPC) |
| Business Rules | BR-D01-011, BR-D01-017, BR-D01-018, BR-D01-019, BR-D01-020, BR-D01-021 |
| Trigger | User adds a new SDPC suspension table entry (with end date) |
| Transaction Count | 3 MMIS transactions (Close Span-A + Add Span-B + Create Span-C) |
| Transaction Ordering | S500 → S510 → S520 (strict order) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in SDPC with a successful prior sync (TC-015 executed, ResponseStatusCode = "SU")
2. Active MMIS SDPC enrollment span exists: DateSDPCEffective = enrollment start, DateSDPCEnd = 22991231
3. User enters Suspension Start Date = 2026-07-10
4. User enters Suspension End Date = 2026-08-10 (produces span >= 3 calendar days per BR-D01-019)
5. Active SDPC Oversight Agency assignment exists with valid SDPC Provider ID
6. Active SDPC Nurse assignment exists (IsPrimary = true)
7. No existing suspensions for this SDPC enrollment
8. **Key SDPC differences from TC-002 (IRIS Suspension):**
   - API endpoint: SDPCEnrollmentRequest (not EnrollmentRequest)
   - TransactionType = "A" for new spans (not "O") — but "C" for closure is same
   - Uses DateSDPCEffective/DateSDPCEnd (not DateEnrlEff/DateEnrlEnd)
   - Uses SDPCAgencyID (not WaiverAgencyID)
   - WorkerID is CHAR(15) from SDPC Nurse (not CHAR(8) from ICA Consultant)
   - NO Address Node, NO Additional Address Node, NO FEA Node
   - Same date offset logic applies (BR-D01-017/018)

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-015 must have been executed successfully first.** This test requires the participant has an active SDPC enrollment in MMIS with a successful sync (SU response).

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
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### SDPC Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {SDPC Agency Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "5551234567" | → **SDPCAgencyID** in all 3 transactions |

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
| Status | Active | Must be active ISP |

### 7. Existing SDPC Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-015 execution |
| `ProgramKey` | {SDPC Program GUID} | FK to Program (DisplayName = "SDPC") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | SDPC enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" to MMIS |
| `StatusDisplayName` | "Enrolled" | Must already be enrolled |
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
| `MmisEndDate` | 2299-12-31 | From TC-015 response |

### 9. NEW Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record is created when the user adds the suspension in Blue Compass (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {new GUID} | PK — system generated |
| `Version` | 1 | Initial version |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | BC Suspension Start Date |
| `DateRangeEndDate` | **2026-08-10** | BC Suspension End Date (>= start + 3 days per BR-D01-019) |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |

### 10. Pre-Execution Verification Query

```sql
-- Verify SDPC enrollment is active and synced
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate, p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', ProgramName='SDPC'

-- Verify no existing suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0 (before trigger creates the suspension)

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

1. **S100** — Condition 9 (New SDPC suspension table entry added):
   - Action #1: Call S210_Calculate_MMIS_SDPC_Spans
   - Action #4: Call S240_Suspense_Add
2. **S210** — Scenario S210 (Calculate MMIS SDPC spans with suspension):
   - Spans calculated: Active (enrollment begin → suspension begin), Suspended (suspension begin + 1 → suspension end - 1), Active (suspension end → enrollment end)
3. **S240** — Condition 1 (New suspense record has an end date, meets 3-day minimum):
   - Action #1: Identify Span-A (MMIS Enrollment Span including BC suspense begin date)
   - Action #2: Call S500 Column 2 (SDPC — Close Span-A)
   - Action #3: Call S520 Column 2 (SDPC — Create Span-C)
   - Action #4: Call S510 Column 2 (SDPC — Add Span-B)

---

## Date Offset Logic (Same as IRIS — BR-D01-017, BR-D01-018)

| BC Date | MMIS Date | Offset Rule | Rationale |
|---------|-----------|-------------|-----------|
| BC Suspension Start = 7/10/2026 | Span-A DateSDPCEnd = 7/10/2026 | No offset | Participant active on this date |
| BC Suspension Start = 7/10/2026 | Span-B DateSDPCEffective = 7/11/2026 | +1 day | BR-D01-017: MMIS suspension start = BC start + 1 |
| BC Suspension End = 8/10/2026 | Span-B DateSDPCEnd = 8/9/2026 | -1 day | BR-D01-018: MMIS suspension end = BC end - 1 |
| BC Suspension End = 8/10/2026 | Span-C DateSDPCEffective = 8/10/2026 | No offset | Participant active on this date |

---

## Request Payload Verification

> **⚠️ NOTE:** All 3 transactions use the **SDPCEnrollmentRequest** API endpoint. NO Address Nodes, NO FEA Node.

### Transaction 1: Close Active Span (S500 Column 2 SDPC — Close Span-A)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnSource | TxnSource | "CMMRT" | Fixed |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | First transaction |
| IdUniqueClient | IdUniqueClient | "1430000012" | From PersonMedicaidNumbers |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed — always "IRIS" even for SDPC |
| SDPCAgencyID | SDPCAgencyID | "5551234567" | From SDPC Oversight Agency |
| TransactionType | TransactionType | **"C" (Closure)** | Same for both IRIS/SDPC on closure |
| DateSDPCEffective | DateSDPCEffective | Span-A existing begin date (e.g., "20260701") | Anchor — existing MMIS begin |
| DateSDPCEnd | DateSDPCEnd | **"20260710"** | BC suspension start date (NO offset) |
| Status | Status | **"A" (Active)** | Closure uses Status=A |
| WorkerID | WorkerID | SDPC Nurse worker ID | **CHAR(15)** — from SDPC Nurse role |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |

### Transaction 2: Add Suspension Span (S510 Column 2 SDPC — Add Span-B)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | Second transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed — always "IRIS" even for SDPC |
| SDPCAgencyID | SDPCAgencyID | "5551234567" | From SDPC Oversight Agency |
| TransactionType | TransactionType | **"A" (Add/Update)** | SDPC uses "A" NOT "O" for new spans |
| DateSDPCEffective | DateSDPCEffective | **"20260711"** | BC suspension start + 1 day (BR-D01-017) |
| DateSDPCEnd | DateSDPCEnd | **"20260809"** | BC suspension end - 1 day (BR-D01-018) |
| Status | Status | **"S" (Suspended)** | Suspension span |
| WorkerID | WorkerID | SDPC Nurse worker ID | CHAR(15) |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |

### Transaction 3: Create Post-Suspension Active Span (S520 Column 2 SDPC — Create Span-C)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000003") | Third transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed — always "IRIS" even for SDPC |
| SDPCAgencyID | SDPCAgencyID | "5551234567" | From SDPC Oversight Agency |
| TransactionType | TransactionType | **"A" (Add/Update)** | SDPC uses "A" NOT "O" for new spans |
| DateSDPCEffective | DateSDPCEffective | **"20260810"** | BC suspension end date (NO offset) |
| DateSDPCEnd | DateSDPCEnd | **"22991231"** | Original enrollment end (open-ended) |
| Status | Status | **"A" (Active)** | Active post-suspension span |
| WorkerID | WorkerID | SDPC Nurse worker ID | CHAR(15) |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |

> **⚠️ CRITICAL SDPC Differences from TC-002 (IRIS):**
> - TransactionType "A" for Span-B and Span-C (IRIS uses "O")
> - TransactionType "C" for Span-A closure (same as IRIS)
> - Field names: DateSDPCEffective/DateSDPCEnd (not DateEnrlEff/DateEnrlEnd)
> - SDPCAgencyID (not WaiverAgencyID)
> - WorkerID CHAR(15) from SDPC Nurse (not CHAR(8) from ICA Consultant)
> - NO Address, Additional Address, or FEA nodes in payload
> - NO StartReasonCode/StopReasonCode (SDPC suspension does not use reason codes)

---

## Expected MMIS Response

| Transaction | ResponseStatus | Key Verification |
|-------------|---------------|------------------|
| Transaction 1 (Close Span-A) | "SU" | DateSDPCEffective/DateSDPCEnd confirmed |
| Transaction 2 (Span-B Suspension) | "SU" | Status = "S", DateSDPCEffective = 20260711 |
| Transaction 3 (Span-C Active) | "SU" | Status = "A", DateSDPCEffective = 20260810 |

> **⚠️ BR-D01-015:** For SDPC, ONLY "SU" is considered success. "SE" would NOT activate — but for suspension sync this applies to the overall processing (if any transaction returns non-SU, it's a failure).

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
| `ResponseStatusCode` | "SU" | All 3 transactions succeeded |
| `LastSynchronizedTimestamp` | Updated datetime2 | Newer than pre-execution |
| `LastSuspensionChangeTypeCode` | "NewSuspension" (or equivalent) | Suspension was added |
| `TransactionTypeCode` | "A" | Last SDPC transaction was Add/Update (Span-C) |
| `MmisEffectiveDate` | 2026-08-10 (Span-C begin — BC suspension end) | From last transaction |
| `MmisEndDate` | 2299-12-31 | From last transaction |
| `PreUpdateSuspensionStartDate` | NULL | No prior suspension existed |
| `PreUpdateSuspensionEndDate` | NULL | No prior suspension existed |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp
```

Expected: **3 new rows** (plus 1 from TC-015 initial enrollment)

**Row 1 — S500 Column 2 (Close Span-A):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | 2026-07-01 (Span-A begin) |
| `MmisEndDate` | 2026-07-10 (BC suspension start, no offset) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify SDPCAgencyID, NO address/FEA fields |

**Row 2 — S510 Column 2 (Add Span-B Suspension):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "A" |
| `MmisEffectiveDate` | 2026-07-11 (BC start + 1 day) |
| `MmisEndDate` | 2026-08-09 (BC end - 1 day) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify Status = "S" |

**Row 3 — S520 Column 2 (Create Span-C):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "A" |
| `MmisEffectiveDate` | 2026-08-10 (BC suspension end, no offset) |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify Status = "A" |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | All 3 transactions successful — no error messages |

### 4. `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

```sql
SELECT * FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value |
|--------|----------------|
| `DateRangeStartDate` | 2026-07-10 |
| `DateRangeEndDate` | 2026-08-10 |

### 5. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeStartDate, pe.EnrollmentDateRangeEndDate,
       p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Still enrolled (suspension ≠ disenrollment) |
| `ProgramName` | "SDPC" | Correct program type |
| `EnrollmentDateRangeEndDate` | NULL | Still open-ended |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000012" (unchanged) |

### 7. Verify NO Address/FEA Payload Content

```sql
SELECT RequestJsonTextFile
FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
-- Manual verification: ALL 3 request payloads should NOT contain:
-- AddressType, Address1, Address2, City, State, ZipCode, County
-- AdditionalAddressType, WaiverFEA, FEAEffectiveDate, FEAEndDate, FEAStatus
-- WaiverAgencyID (should be SDPCAgencyID instead)
-- DateEnrlEff/DateEnrlEnd (should be DateSDPCEffective/DateSDPCEnd)
```

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Last Sync timestamp | Updated |
| Re-submit button | Hidden |
| Response Status | "SU" |
| Program Type | "SDPC" |
| Enrollment Status | "Enrolled" (with suspension) |
| Suspension Start Date | 07/10/2026 |
| Suspension End Date | 08/10/2026 |
| MMIS Errors table | Empty (no errors) |

---

## Failure Criteria

### Response Validation Failures
- Any of the 3 transactions returns ResponseStatus ≠ "SU" → failure (BR-D01-015 for SDPC)
- ResponseStatus = "SE" and system treats as success → BR-D01-015 violated (SDPC requires "SU" only)

### Payload Construction Failures
- TransactionType = "O" used instead of "A" for Span-B/Span-C → SDPC uses "A" not "O"
- Field name "DateEnrlEff" used instead of "DateSDPCEffective" → wrong field name
- Field name "DateEnrlEnd" used instead of "DateSDPCEnd" → wrong field name
- Field name "WaiverAgencyID" used instead of "SDPCAgencyID" → wrong field name
- WorkerID truncated to 8 chars instead of 15 → SDPC uses CHAR(15)
- WorkerID derived from ICA Consultant role instead of SDPC Nurse → wrong role
- Address Node present in payload → SDPC does NOT send addresses
- FEA Node present in payload → SDPC does NOT use FEA
- Date offsets not applied correctly (BR-D01-017: +1 begin, BR-D01-018: -1 end)

### Data Integrity Failures
- HasConflict set to 1 when all responses were SU
- SyncTransaction has fewer than 3 new rows
- Suspension duration < 3 calendar days → BR-D01-019 violated
- TransactionTypeCode stored as "O" instead of "A" for SDPC

### Audit Trail Failures
- RequestJsonTextFile is NULL in any SyncTransaction row
- Stored request contains address/FEA fields that should not be present
- TxnRefId not properly incremented across 3 transactions

### UI State Failures
- Conflict chip displayed when not expected
- Program type showing as "IRIS" instead of "SDPC"
- Suspension dates not displayed correctly

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = **"1430000012"** |
| **SDPCAgencyID** (all 3 txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = '**SDPC**' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateSDPCEnd** (Txn 1 / S500) | BC suspension start date from `ProgramEnrollmentSuspension.DateRangeStartDate` (no offset) |
| **DateSDPCEffective** (Txn 2 / S510) | `ProgramEnrollmentSuspension.DateRangeStartDate` + 1 day (BR-D01-017) |
| **DateSDPCEnd** (Txn 2 / S510) | `ProgramEnrollmentSuspension.DateRangeEndDate` - 1 day (BR-D01-018) |
| **DateSDPCEffective** (Txn 3 / S520) | `ProgramEnrollmentSuspension.DateRangeEndDate` (no offset) |
| **DateSDPCEnd** (Txn 3 / S520) | Original enrollment end date ("22991231") |
| **WorkerID** (all 3 txns) | `PersonModule.PersonStaffMemberAssignment` → WHERE role = '**SDPC Nurse**' AND `IsPrimary` = 1 AND active → derive ID (**15 chars**) |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (active ISP) |
| **Address fields** | **NOT APPLICABLE** — SDPC does not send address |
| **WaiverFEA / FEA fields** | **NOT APPLICABLE** — SDPC does not use FEA |
| **StartReasonCode / StopReasonCode** | **NOT APPLICABLE** — SDPC suspension does not use reason codes |

---

## Related Test Cases

- TC-015: New SDPC Enrollment (prerequisite — SDPC enrollment must exist before suspension)
- TC-002: Enrolled → Suspended IRIS (IRIS counterpart — compare field differences)
- TC-010: Open-Ended Suspension IRIS (open-ended variant — no Span-C created)
- TC-011: Suspension Too Short Error (validation — BR-D01-019 minimum duration check)
