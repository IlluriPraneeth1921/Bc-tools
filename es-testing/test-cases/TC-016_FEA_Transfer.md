# TC-016: FEA Transfer — Close Old + Open New Span

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-016 |
| Scenario | FEA Transfer — Close Old FEA Span + Open New FEA Span |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 5) → S200 → S250 (Condition 1) → S600 + S255 (Condition 2) → S610 |
| Business Rules | BR-D01-002, BR-D01-004, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User transfers participant to a new FEA (location assignment update) |
| Transaction Count | 2 MMIS transactions (Close old span with old FEA, Open new span with new FEA) |
| Transaction Ordering | S600 (close) must precede S610 (open) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists with FEA "Provider A" (Medicaid Provider ID = "1111111111")
3. Active ICA assignment exists — ICA does NOT change during this transfer
4. User transfers participant to new FEA "Provider B" (Medicaid Provider ID = "2222222222")
5. FEA change effective date is known (determines where the span split occurs)
6. No active suspensions at the time of transfer
7. Key difference from TC-003 (ICA Transfer): WaiverAgencyID stays the SAME; only WaiverFEA changes. Reason codes = "2R" (FEA Transfer) instead of "2P" (ICA Transfer).

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

### 7. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" to MMIS |
| `StatusDisplayName` | "Enrolled" | Must already be enrolled |
| `IsPrimary` | true | |

### 8. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-001 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync required |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction |
| `LastSynchronizedTimestamp` | Valid datetime2 | From TC-001 execution |
| `MmisEffectiveDate` | Enrollment begin date | From TC-001 response |
| `MmisEndDate` | 2299-12-31 | From TC-001 response |

### 9. ICA Assignment (UNCHANGED) — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {ICA Location GUID} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL | **Remains active — ICA does NOT change** |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in BOTH transactions (SAME) |

### 10. Current (Old) FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {OLD FEA Location GUID — Provider A} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | Active at enrollment start |
| `EffectiveDateRangeEndDate` | **FEA change effective date - 1** | End-dated by the transfer action |

#### Old FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {OLD FEA Location GUID — Provider A} | Same as above |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | **"1111111111"** | → WaiverFEA in Transaction 1 (close) |

### 11. New FEA Assignment — `PersonModule.PersonLocationAssignment`

This record is created when the user performs the FEA transfer in Blue Compass (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {new GUID} | PK — system generated |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {NEW FEA Location GUID — Provider B} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | FEA change effective date | Determines span split point |
| `EffectiveDateRangeEndDate` | NULL | New active assignment |

#### New FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {NEW FEA Location GUID — Provider B} | Same as above |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | **"2222222222"** | → WaiverFEA in Transaction 2 (open) |

### 12. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 13. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | Used to derive WorkerID = "J.Smith" (truncated to 8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter for worker lookup |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 14. Pre-Execution Verification Query

```sql
-- Verify enrollment is active and synced
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0

-- Verify current FEA assignment (old — about to be end-dated)
SELECT pla.LocationKey, li.Value AS MedicaidProviderID, pla.EffectiveDateRangeEndDate
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'FEA'
ORDER BY pla.EffectiveDateRangeStartDate DESC
-- Expected: 2 rows (old end-dated, new active) after trigger

-- Verify ICA assignment remains unchanged
SELECT pla.LocationKey, li.Value AS MedicaidProviderID, pla.EffectiveDateRangeEndDate
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND pla.EffectiveDateRangeEndDate IS NULL
-- Expected: 1 row, unchanged ICA

-- Verify no active suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
  AND (DateRangeEndDate IS NULL OR DateRangeEndDate >= GETDATE())
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 5 (FEA assignment updated):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #5: Call S250_Location_Assignment_Update
2. **S200** — Scenario S200 (Enrollment with FEA change, no suspensions):
   - Enrollment span is split at FEA change effective date
   - Pre-change span ends on (effective date - 1) with old FEA
   - New span begins on effective date with new FEA
3. **S250** — Condition 1 (Span-B is Active):
   - Action #1: Identify Span-B (MMIS span containing FEA change effective date)
   - Action #2: Call S600 (Close Span-B with end date = effective date - 1)
   - Action #3: Call S255 for each S200-calculated span from effective date onward
4. **S600** — (Close active span with old FEA):
   - Closes existing span, TransactionType = "C", WaiverFEA = OLD Provider ID
5. **S255** — Condition 2 (Active span, no old-agency span in MMIS for the new period):
   - Action #2: Call S610 (Create active span with new FEA)
6. **S610** — Creates new active enrollment span with new FEA, same ICA

---

## Request Payload Verification

### Transaction 1: Close Old FEA Span (S600 — Close Span-B for FEA Change)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnSource | TxnSource | "CMMRT" | Fixed |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | First transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | "1234567890" | **SAME ICA** — unchanged |
| TransactionType | TransactionType | "C" (Closure) | Shortening end date per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | Span-B existing begin date (CCYYMMDD) | Anchor — existing MMIS begin |
| DateEnrlEnd | DateEnrlEnd | FEA change effective date - 1 (CCYYMMDD) | Span closed day before transfer |
| Status | Status | "A" (Active) | Per BR-D01-020, closure of active span |
| StartReasonCode | StartReasonCode | **"2R" (FEA Transfer)** | Per BR-D01-022 — NOT "2P" |
| StopReasonCode | StopReasonCode | **"2R" (FEA Transfer)** | Per BR-D01-022 — NOT "2P" |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| WaiverFEA | WaiverFEA | **"1111111111"** | OLD FEA Provider ID (pre-transfer) |
| FEAEffectiveDate | FEAEffectiveDate | Span-B existing begin date | Anchor |
| FEAEndDate | FEAEndDate | FEA change effective date - 1 | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active on closure |

### Transaction 2: Open New FEA Span (S610 — Create Active Span with New FEA)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | Second transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | "1234567890" | **SAME ICA** — unchanged |
| TransactionType | TransactionType | "O" (Open) | New span per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | FEA change effective date (CCYYMMDD) | New span starts on transfer date |
| DateEnrlEnd | DateEnrlEnd | "22991231" | Inherited from original enrollment (open-ended) |
| Status | Status | "A" (Active) | Per BR-D01-020 |
| StartReasonCode | StartReasonCode | **"2R" (FEA Transfer)** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End date is 12/31/2299 |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| WaiverFEA | WaiverFEA | **"2222222222"** | NEW FEA Provider ID (post-transfer) |
| FEAEffectiveDate | FEAEffectiveDate | FEA change effective date | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active span |

---

## Expected MMIS Response

| Transaction | ResponseStatus | Key Verification |
|-------------|---------------|------------------|
| Transaction 1 (Close old FEA span) | "SU" | EffectiveDate/EndDate confirmed; WaiverFEA = "1111111111" |
| Transaction 2 (Open new FEA span) | "SU" | New span confirmed with WaiverFEA = "2222222222" |

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
| `LastChangeTypeCode` | "FEATransfer" (or equivalent) | FEA assignment changed |
| `TransactionTypeCode` | "O" | Last transaction was Open (new span) |
| `MmisEffectiveDate` | FEA change effective date | From Txn 2 (new span) |
| `MmisEndDate` | 2299-12-31 | From Txn 2 |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp
```

Expected: **2 rows**

**Row 1 — S600 (Close old FEA span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | Span-B existing begin date |
| `MmisEndDate` | FEA change effective date - 1 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverFEA = "1111111111" |

**Row 2 — S610 (Create new FEA span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | FEA change effective date |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverFEA = "2222222222" |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | Both transactions successful — no error messages |

### 4. `PersonModule.PersonLocationAssignment` (FEA records)

```sql
SELECT pla.*, li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'FEA'
ORDER BY pla.EffectiveDateRangeStartDate
```

Expected: **2 rows**

| Row | EffectiveDateRangeEndDate | LocationKey → Provider ID |
|-----|---------------------------|---------------------------|
| Old FEA (Provider A) | FEA change effective date - 1 | "1111111111" |
| New FEA (Provider B) | NULL (active) | "2222222222" |

### 5. `PersonModule.PersonLocationAssignment` (ICA — NO CHANGE)

```sql
SELECT pla.*, li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND pla.EffectiveDateRangeEndDate IS NULL
```

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1234567890" (unchanged — ICA did NOT change) |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000012" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Last Sync timestamp | Updated |
| Re-submit button | Hidden |
| Response Status | "SU" |
| Old FEA span | Closed in MMIS |
| New FEA span | Active with new FEA Provider B |
| ICA display | Unchanged — same ICA throughout |

---

## Failure Criteria

### Response Validation Failures
- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true, transfer incomplete
- Old FEA assignment not found or already end-dated → S600 sends incorrect WaiverFEA

### Payload Construction Failures
- StartReasonCode/StopReasonCode = "2P" instead of "2R" → wrong reason code (ICA vs FEA transfer)
- WaiverAgencyID changes between transactions → ICA should NOT change in FEA transfer
- WaiverFEA in Txn 1 = new FEA instead of old → must use pre-transfer FEA for closure
- WaiverFEA in Txn 2 = old FEA instead of new → must use post-transfer FEA for open
- Transaction ordering incorrect (S600 must precede S610) → MMIS may reject overlapping spans
- FEA change effective date earlier than enrollment begin → invalid DateEnrlEnd (negative span)

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- ICA PersonLocationAssignment modified when it should not be
- Old FEA assignment not end-dated properly
- New FEA assignment missing or with incorrect effective date

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction rows not created (should be 2 rows)
- WaiverAgencyID in stored request differs between transactions (should be same)

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = **"1430000012"** |
| **WaiverAgencyID** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` = **"1234567890"** (SAME for both) |
| **WaiverFEA** (Txn 1 — close) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND LocationKey = OLD FEA → `OrganizationModule.LocationIdentifiers` → `Value` = **"1111111111"** |
| **WaiverFEA** (Txn 2 — open) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND LocationKey = NEW FEA → `OrganizationModule.LocationIdentifiers` → `Value` = **"2222222222"** |
| **DateEnrlEnd** (Txn 1) | FEA change effective date - 1 (system calculated from new FEA assignment start) |
| **DateEnrlEff** (Txn 2) | FEA change effective date from new `PersonLocationAssignment.EffectiveDateRangeStartDate` |
| **StartReasonCode / StopReasonCode** | Fixed value **"2R"** (FEA Transfer) per BR-D01-022 |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → derive ID (8 chars) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment (prerequisite — enrollment must exist before transfer)
- TC-003: ICA Transfer (same mechanism but ICA changes; reason code "2P" vs "2R")
- TC-014: Address-Only Update (demonstrates field-level change without agency transfer)
