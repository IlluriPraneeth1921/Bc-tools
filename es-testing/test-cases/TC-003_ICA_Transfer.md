# TC-003: ICA Transfer — Close Old + Open New Span

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-003 |
| Scenario | ICA Transfer — Close Old Agency Span + Open New Agency Span |
| Test Participant MA ID | **1430000012** |
| Decision Table | S100 (Condition 6) → S200 → S250 (Condition 1) → S600 + S255 (Condition 2) → S610 |
| Business Rules | BR-D01-002, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User transfers participant to a new ICA (location assignment update) |
| Transaction Count | 2 MMIS transactions (Close old span, Open new span) |
| Priority | High |
| Applies To | IRIS only (FEA/ICA assignments do not apply to SDPC) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists with ICA "Agency A" (Medicaid Provider ID = "1234567890")
3. Active FEA assignment exists with valid dates
4. User transfers participant to new ICA "Agency B" (Medicaid Provider ID = "9876543210")
5. Agency change effective date is known (determines where the span split occurs)
6. No active suspensions at the time of transfer

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

### 9. Current (Old) ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {OLD ICA Location GUID — Agency A} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin | Active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL (currently active) | Will be end-dated by the transfer action |

#### Old ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {OLD ICA Location GUID — Agency A} | Same as above |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | **"1234567890"** | → WaiverAgencyID in Transaction 1 (close) |

### 10. New ICA Assignment Being Created — `PersonModule.PersonLocationAssignment`

This record is created when the user performs the ICA transfer in Blue Compass (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {new GUID} | PK — system generated |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {NEW ICA Location GUID — Agency B} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | Agency change effective date | Determines span split point |
| `EffectiveDateRangeEndDate` | NULL | New active assignment |

#### New ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {NEW ICA Location GUID — Agency B} | Same as above |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | **"9876543210"** | → WaiverAgencyID in Transaction 2 (open) |

### 11. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL or >= enrollment end date | Must span enrollment period |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in both transactions |

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

-- Verify current ICA assignment
SELECT pla.LocationKey, li.Value AS MedicaidProviderID, pla.EffectiveDateRangeEndDate
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND pla.EffectiveDateRangeEndDate IS NULL
-- Expected: 1 row, MedicaidProviderID = '1234567890', EndDate = NULL

-- Verify no active suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
  AND (DateRangeEndDate IS NULL OR DateRangeEndDate >= GETDATE())
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 6 (ICA assignment updated):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #6: Call S250_Location_Assignment_Update
2. **S200** — Scenario S200_003 (Enrollment with agency changes, no suspensions):
   - Enrollment span is split at agency change effective date
   - Pre-change span ends on (effective date - 1) with old ICA/FEA
   - New span begins on effective date with new ICA/FEA
3. **S250** — Condition 1 (Span-B is Active):
   - Action #1: Identify Span-B (MMIS span containing agency change effective date)
   - Action #2: Call S600 (Close Span-B with end date = effective date - 1)
   - Action #3: Call S255 for each S200-calculated span from effective date onward
4. **S600** — Condition 1 (Active span):
   - Closes existing span with old agency, TransactionType = C
5. **S255** — Condition 2 (Active span, no old-agency span in MMIS for the new period):
   - Action #2: Call S610 (Create active span with new agency)
6. **S610** — Creates new active enrollment span with new ICA/FEA

---

## Request Payload Verification

### Transaction 1: Close Old Agency Span (S600 — Close Span-B for Agency Change)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnSource | TxnSource | "CMMRT" | Fixed |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | First transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | "1234567890" | Old ICA (pre-update) Medicaid Provider ID |
| TransactionType | TransactionType | "C" (Closure) | Shortening end date per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | Span-B existing begin date (CCYYMMDD) | Anchor — existing MMIS begin |
| DateEnrlEnd | DateEnrlEnd | Agency change effective date - 1 (CCYYMMDD) | Span closed day before transfer |
| Status | Status | "A" (Active) | Per BR-D01-020, closure of active span |
| StartReasonCode | StartReasonCode | "2P" (ICA Transfer) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | "2P" (ICA Transfer) | Per BR-D01-022 |
| WaiverFEA | WaiverFEA | Old FEA Medicaid Provider ID (pre-update) | FEA at time of old span |
| FEAEffectiveDate | FEAEffectiveDate | Span-B existing begin date | Anchor |
| FEAEndDate | FEAEndDate | Agency change effective date - 1 | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active on closure |

### Transaction 2: Open New Agency Span (S610 — Create Active Span with New Agency)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | Second transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | "9876543210" | New ICA (post-update) Medicaid Provider ID |
| TransactionType | TransactionType | "O" (Open) | New span per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | Agency change effective date (CCYYMMDD) | New span starts on transfer date |
| DateEnrlEnd | DateEnrlEnd | S200-calculated span end date (typically "22991231") | Inherited from original enrollment |
| Status | Status | "A" (Active) | Per BR-D01-020 |
| StartReasonCode | StartReasonCode | "2P" (ICA Transfer) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End date is 12/31/2299 |
| WaiverFEA | WaiverFEA | New FEA Medicaid Provider ID (post-update) | FEA at new agency |
| FEAEffectiveDate | FEAEffectiveDate | Agency change effective date | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | S200-calculated span end date | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active span |

---

## Expected MMIS Response

| Transaction | ResponseStatus | Key Verification |
|-------------|---------------|------------------|
| Transaction 1 (Close old span) | "SU" | EffectiveDate/EndDate confirmed |
| Transaction 2 (Open new span) | "SU" | New span confirmed with WaiverAgencyID = "9876543210" |

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
| `LastChangeTypeCode` | "ICATransfer" (or equivalent) | ICA assignment changed |
| `TransactionTypeCode` | "O" | Last transaction was Open (new span) |
| `MmisEffectiveDate` | Agency change effective date | From Txn 2 (new span) |
| `MmisEndDate` | 2299-12-31 | From Txn 2 |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp
```

Expected: **2 rows**

**Row 1 — S600 (Close old agency span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | Span-B existing begin date |
| `MmisEndDate` | Agency change effective date - 1 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverAgencyID = "1234567890" |

**Row 2 — S610 (Create new agency span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | Agency change effective date |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverAgencyID = "9876543210" |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | Both transactions successful — no error messages |

### 4. `PersonModule.PersonLocationAssignment` (ICA records)

```sql
SELECT * FROM PersonModule.PersonLocationAssignment
WHERE CaseKey = '{CaseKey}' AND PersonLocationAssignmentTypeDisplayName = 'ICA'
ORDER BY EffectiveDateRangeStartDate
```

Expected: **2 rows**

| Row | EffectiveDateRangeEndDate | LocationKey → Provider ID |
|-----|---------------------------|---------------------------|
| Old ICA (Agency A) | Agency change effective date - 1 | "1234567890" |
| New ICA (Agency B) | NULL (active) | "9876543210" |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{test PersonKey}'
```

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
| Old span | Closed in MMIS |
| New span | Active with new ICA Agency B |

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

These chains show how Blue Compass resolves each request field from the Carity database for ICA transfer transactions.

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = **"1430000012"** |
| **WaiverAgencyID** (Txn 1 — close) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND LocationKey = OLD ICA → `OrganizationModule.LocationIdentifiers` → `Value` = **"1234567890"** |
| **WaiverAgencyID** (Txn 2 — open) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND LocationKey = NEW ICA → `OrganizationModule.LocationIdentifiers` → `Value` = **"9876543210"** |
| **WaiverFEA** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateEnrlEnd** (Txn 1) | Agency change effective date - 1 (system calculated) |
| **DateEnrlEff** (Txn 2) | Agency change effective date from new `PersonLocationAssignment.EffectiveDateRangeStartDate` |

---

## Failure Criteria

- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true, transfer incomplete
- Old ICA assignment not found or already end-dated → S600 sends incorrect WaiverAgencyID
- New ICA LocationIdentifiers missing "Medicaid Provider ID" → S610 sends empty/null WaiverAgencyID
- Transaction ordering incorrect (S600 must precede S610) → MMIS may reject overlapping spans
- FEA assignment not active at agency change effective date → incorrect WaiverFEA sent
- Agency change effective date earlier than enrollment begin → invalid DateEnrlEnd (negative span)

---

## Variant Scenarios (from Decision Tables)

| Variant | Decision Table Path | Difference |
|---------|-------------------|------------|
| ICA Transfer during Suspension | S250 (Condition 2) → S600 (Condition 2) + S255 (Conditions 3/4) → S620 | Status = "S" on closure; S620 creates suspended span with new agency |
| FEA Transfer (Enrolled) | Same path but StartReasonCode/StopReasonCode = "2R" | Reason codes differ |
| FEA Transfer (Suspended) | S250 (Condition 2) path | Close with StopReasonCode = "2R", Status = "S" |
| Delete-then-recreate (S255 Condition 1) | S310 + S610 | Old span exists in MMIS and must be deleted first |

---

## Important Notes

- **IRIS Only:** FEA/ICA location assignment changes are only applicable to IRIS participants. SDPC does not use ICA/FEA assignments.
- **FEAStatus on Closure:** Per S600, WISITS production data confirms FEAStatus is always "A" when closing a span, even when Status = "S".
- **S255 Routing:** If the old-agency span still exists in MMIS (typical for Span-C replacement after suspension), S255 routes to Condition 1/3 which calls S310 to delete before S610/S620 creates the new span.

---

## Related Test Cases

- TC-001: New IRIS Enrollment (prerequisite — enrollment must exist before transfer)
- TC-002: Enrolled → Suspended (if suspension active at time of transfer, different path)
