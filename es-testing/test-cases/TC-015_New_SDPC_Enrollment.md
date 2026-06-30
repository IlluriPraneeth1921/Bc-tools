# TC-015: New SDPC Enrollment — Happy Path

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-015 |
| Scenario | New SDPC Enrollment — Happy Path |
| Test Participant MA ID | **1430000013** |
| Program Type | SDPC |
| Decision Table | S100 (Condition 7) → S210 → S220 (Condition 1) → S300 (Column 2 — SDPC) |
| Business Rules | BR-D01-011, BR-D01-012, BR-D01-015, BR-D01-020, BR-D01-021 |
| Trigger | User adds a new SDPC enrollment table entry; status changes to "Enrolled" |
| Transaction Count | 1 MMIS transaction |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant has a valid active Medicaid ID
2. No prior SDPC enrollment exists for this participant (new enrollment)
3. User creates SDPC enrollment with status "Enrolled"
4. Active SDPC Oversight Agency assignment exists with valid SDPC Provider ID
5. Active SDPC Nurse assignment exists (IsPrimary = true)
6. **Key SDPC differences from IRIS (TC-001):**
   - API endpoint: SDPCEnrollmentRequest (not EnrollmentRequest)
   - TransactionType = "A" (Add/Update) instead of "O" (Open)
   - Uses SDPCAgencyID (from SDPC Oversight Agency) instead of WaiverAgencyID
   - Uses DateSDPCEffective/DateSDPCEnd instead of DateEnrlEff/DateEnrlEnd
   - WorkerID is CHAR(15) (not CHAR(8)) — from SDPC Nurse role
   - NO Address Node, NO Additional Address Node, NO FEA Node
   - Response: Only "SU" activates enrollment (NOT "SE" — per BR-D01-015)
   - Response does NOT include ErrorType field

---

## Database Setup (Pre-Execution State)

> **No prior enrollment prerequisite for SDPC.** This test creates a brand-new SDPC enrollment. The participant must exist in the system with valid demographics and Medicaid ID.

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

### 4. SDPC Oversight Agency Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {SDPC Agency Location GUID} | FK → used to look up SDPC Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | **"SDPC"** | Must be "SDPC" type (NOT "ICA" or "FEA") |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Must be active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### SDPC Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {SDPC Agency Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "5551234567" | → **SDPCAgencyID** in request (NOT WaiverAgencyID) |

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

### 7. New SDPC Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

This record is created when the user adds the SDPC enrollment (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {new enrollment GUID} | PK — system generated |
| `ProgramKey` | {SDPC Program GUID} | FK to Program (DisplayName = "SDPC") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., **2026-07-01** | SDPC enrollment begin date |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended → sent as "22991231" |
| `StatusDisplayName` | **"Enrolled"** | Triggering status |
| `IsPrimary` | true | |

### 8. ProgramEnrollmentExtension — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

This record is created as part of the sync process (may be pre-created or created on first sync).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {new GUID or existing} | PK |
| `ProgramEnrollmentKey` | {new enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | NULL (new) | No prior sync |
| `HasConflict` | 0 (false) | Initial state |
| `TransactionTypeCode` | NULL (new) | No prior transaction |
| `LastSynchronizedTimestamp` | NULL | No prior sync |

### 9. Pre-Execution Verification Query

```sql
-- Verify participant has active Medicaid ID
SELECT Value, StatusDisplayName
FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}' AND StatusDisplayName = 'Active'
-- Expected: Value='1430000013', StatusDisplayName='Active'

-- Verify SDPC assignment exists
SELECT pla.PersonLocationAssignmentTypeDisplayName, li.Value AS SDPCProviderId
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
WHERE pla.CaseKey = '{CaseKey}'
  AND pla.PersonLocationAssignmentTypeDisplayName = 'SDPC'
  AND li.TypeDisplayName = 'Medicaid Provider ID'
-- Expected: Type='SDPC', SDPCProviderId populated

-- Verify SDPC Nurse assignment
SELECT AssignedStaffMemberDisplayName, IsPrimary
FROM PersonModule.PersonStaffMemberAssignment
WHERE CaseKey = '{CaseKey}'
  AND AssignmentTypeSystemRoleDisplayName = 'SDPC Nurse'
  AND IsPrimary = 1
  AND (EffectiveDateRangeEndDate IS NULL OR EffectiveDateRangeEndDate > GETDATE())
-- Expected: Active primary SDPC Nurse assigned

-- Verify no prior SDPC enrollment
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.CaseKey = '{CaseKey}' AND p.DisplayName = 'SDPC'
-- Expected: 0 (before trigger) or 1 (after trigger creates enrollment)
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 7 (New SDPC enrollment table entry added with status "Enrolled"):
   - Action #1: Call S210_Calculate_MMIS_SDPC_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S210** — Scenario S210 (Calculate MMIS SDPC spans):
   - Single active span: enrollment begin → enrollment end (or 22991231)
3. **S220** — Condition 1 (New enrollment — no prior MMIS span exists):
   - Action: Call S300 (Column 2 — SDPC) to create new enrollment in MMIS
4. **S300** — Column 2 (SDPC new enrollment):
   - Constructs SDPCEnrollmentRequest
   - TransactionType = "A" (Add/Update)
   - Uses SDPC-specific field names and formatting
   - NO address nodes, NO FEA node

---

## Request Payload Verification

### Transaction 1: New SDPC Enrollment (S300 Column 2 — SDPCEnrollmentRequest)

> **⚠️ NOTE:** This uses the **SDPCEnrollmentRequest** API endpoint, NOT the EnrollmentRequest used by IRIS.

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

#### SDPC Enrollment Node (NOT Waiver Enrollment Node)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | **"IRIS"** | Fixed — always "IRIS" even for SDPC per ICD |
| SDPCAgencyID | SDPCAgencyID | **SDPC Provider ID** (e.g., "5551234567") | CHAR(25), from SDPC Oversight Agency — NOT WaiverAgencyID |
| TransactionType | TransactionType | **"A" (Add/Update)** | Per BR-D01-021 — SDPC uses "A" NOT "O" |
| DateSDPCEffective | DateSDPCEffective | **"20260701"** (enrollment begin) | NUM(8), SDPC-specific field name |
| DateSDPCEnd | DateSDPCEnd | **"22991231"** (NULL → 12/31/2299) | NUM(8), SDPC-specific field name |
| Status | Status | **"A" (Active)** | Per BR-D01-020 |
| WorkerID | WorkerID | **SDPC Nurse worker ID** (15 chars) | **CHAR(15)** — NOT 8 chars like IRIS |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateSDPCEffective | NUM(8) |
| RecertificationDueDate | RecertificationDueDate | ISP end date | NUM(8) |

> **⚠️ CRITICAL SDPC Differences:**
> - **NO Address Node** — SDPCEnrollmentRequest does not include residential address
> - **NO Additional Address Node** — no mailing address
> - **NO FEA Node** — SDPC does not use FEA
> - **WorkerID is 15 characters** (IRIS is 8) — derived from SDPC Nurse role
> - **TransactionType "A"** (IRIS uses "O" for new enrollment)
> - **SDPCAgencyID** field (IRIS uses WaiverAgencyID)
> - **DateSDPCEffective/DateSDPCEnd** (IRIS uses DateEnrlEff/DateEnrlEnd)

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | **"SU" (Success)** | Per BR-D01-015 — ONLY "SU" activates SDPC enrollment |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "A" | Echoed |
| EffectiveDate | Same as DateSDPCEffective sent (e.g., "20260701") | Echoed |
| EndDate | Same as DateSDPCEnd sent (e.g., "22991231") | Echoed |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000013" | No ID swap expected |
| SubmittedClientID | "1430000013" | Echoed |
| ErrorType | **NOT PRESENT** | SDPC response does NOT include ErrorType field |
| Error Segment | Not present | No errors expected |

> **⚠️ CRITICAL BR-D01-015:** For SDPC, ONLY "SU" response activates the enrollment. "SE" (Success with Errors) does NOT activate SDPC enrollment — unlike IRIS where both "SU" and "SE" are considered successful. This is a key behavioral difference.

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
| `ProgramEnrollmentExtensionKey` | {GUID} | PK — created or updated |
| `HasConflict` | 0 (false) | No conflict for successful enrollment |
| `ResponseStatusCode` | "SU" | Success — enrollment activated |
| `TransactionTypeCode` | "A" | SDPC Add/Update transaction |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) | From response EffectiveDate |
| `MmisEndDate` | 2299-12-31 (open-ended) | From response EndDate |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "NewSDPCEnrollment" (or equivalent) | Type of change |
| `LastSuspensionChangeTypeCode` | NULL | No suspension |
| `PreUpdateBeginDate` | NULL | New enrollment — no prior state |
| `PreUpdateEndDate` | NULL | New enrollment — no prior state |
| `PreUpdateSuspensionStartDate` | NULL | No suspension |
| `PreUpdateSuspensionEndDate` | NULL | No suspension |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp
```

Expected: **1 row** (first sync for this SDPC enrollment)

**Row 1 — S300 Column 2 (New SDPC Enrollment):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "A" |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) |
| `MmisEndDate` | 2299-12-31 (open-ended) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full SDPCEnrollmentRequest payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "NewSDPCEnrollment" (or equivalent) |
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

Expected: **No rows** — successful enrollment, no error messages

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — successful enrollment

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
| `StatusDisplayName` | "Enrolled" | Active SDPC enrollment |
| `EnrollmentDateRangeStartDate` | 2026-07-01 | Enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended |
| `ProgramName` | "SDPC" | Correct program type |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
```

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| Active `Value` | "1430000013" (unchanged) |

### 6. Verify NO Address-Related Payload Content

```sql
-- Verify the stored request JSON does NOT contain address fields
SELECT RequestJsonTextFile
FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
-- Manual verification: Request payload should NOT contain:
-- AddressType, Address1, Address2, City, State, ZipCode, County
-- AdditionalAddressType, AdditionalAddress1, etc.
-- WaiverFEA, FEAEffectiveDate, FEAEndDate, FEAStatus
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
| Enrollment Status | "Enrolled" |
| Program Type | "SDPC" |
| Enrollment Begin Date | 07/01/2026 |
| Enrollment End Date | Not displayed / Open-ended |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → enrollment NOT activated (per BR-D01-015, "SE" does NOT activate SDPC)
- ResponseStatus = "SE" and system activates enrollment → BR-D01-015 violated
- ErrorType field present in response (SDPC response should not have this field)

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- ResponseStatusCode stored as anything other than "SU"
- TransactionTypeCode not "A" (should be Add/Update for SDPC)
- Enrollment status set to "Enrolled" when response was "SE" → BR-D01-015 violated

### Payload Construction Failures
- TransactionType ≠ "A" → BR-D01-021 violated (SDPC new enrollment uses "A", NOT "O")
- Field named "WaiverAgencyID" used instead of "SDPCAgencyID"
- Field named "DateEnrlEff" used instead of "DateSDPCEffective"
- Field named "DateEnrlEnd" used instead of "DateSDPCEnd"
- WorkerID truncated to 8 chars instead of 15 → SDPC uses CHAR(15)
- WorkerID derived from ICA Consultant role instead of SDPC Nurse role
- Address Node present in payload → SDPC does NOT send addresses
- Additional Address Node present in payload → SDPC does NOT send addresses
- FEA Node present in payload → SDPC does NOT use FEA
- SDPCAgencyID populated from ICA assignment instead of SDPC Oversight Agency

### Worker Lookup Failures
- WorkerID from wrong role (ICA Consultant instead of SDPC Nurse)
- WorkerID not from IsPrimary = true assignment
- WorkerID exceeds 15 characters without proper truncation

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
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE `StatusDisplayName` = 'Active' → `Value` = "1430000013" |
| **NameLast** | `PersonModule.Person.NameLastName` |
| **NameFirst** | `PersonModule.Person.NameFirstName` |
| **DateBirth** | `PersonModule.Person.BirthDate` |
| **NumSsn** | `PersonModule.PersonIdentifiers` → WHERE `TypeDisplayName` = 'Social Security Number' → `Value` |
| **Sex** | `PersonModule.Person.BirthAssignedGenderDisplayName` → translate to M/F/U |
| **SDPCAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = '**SDPC**' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **DateSDPCEffective** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate` (formatted CCYYMMDD) |
| **DateSDPCEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` → NULL = "22991231" |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role = '**SDPC Nurse**' AND `IsPrimary` = 1 AND active → `AssignedStaffMemberKey` → derive ID (truncated to **15 chars**) |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **RecertificationCompletionDate** | Same as DateSDPCEffective |
| **Address fields** | **NOT APPLICABLE** — SDPC does not send address |
| **WaiverFEA / FEA fields** | **NOT APPLICABLE** — SDPC does not use FEA |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (IRIS counterpart — compare field differences)
- TC-014: Address-Only Update (demonstrates IRIS-only nature of address sync — SDPC excluded)
- TC-005: Medicaid ID Mismatch (response handling — applies to both IRIS and SDPC)
