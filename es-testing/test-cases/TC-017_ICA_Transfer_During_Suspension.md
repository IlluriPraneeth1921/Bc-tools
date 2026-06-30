# TC-017: ICA Transfer During Active Suspension

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-017 |
| Scenario | ICA Transfer During Active Suspension — 3 Transactions |
| Test Participant MA ID | **1430000013** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 6) → S200 → S250 (Condition 2) → S600 (Condition 2) + S255 (Conditions 3+4) → S620 + S610 |
| Business Rules | BR-D01-002, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User transfers participant to new ICA while participant is suspended |
| Transaction Count | 3 MMIS transactions (Close old suspended span + Create new suspended span + Create new active span) |
| Transaction Ordering | S600 → S620 → S610 (strict order) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync including suspension (TC-002 executed)
2. Current MMIS state has 3 spans: Span-A (closed active), Span-B (open suspended), Span-C (open active post-suspension)
3. Span-B is currently Suspended (Status = "S") — this is the span containing the ICA transfer effective date
4. User transfers participant to new ICA "Agency B" (Medicaid Provider ID = "9876543210")
5. ICA transfer effective date falls WITHIN the suspension period
6. Key difference from TC-003: Span-B is Suspended (not Active). S600 uses Status="S". S255 creates BOTH a suspended span (S620) AND an active span (S610) with new agency.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-001 AND TC-002 must have been executed successfully first.** This test requires the participant has an active IRIS enrollment with a suspension already synced to MMIS. MMIS currently has 3 spans.

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
| `StatusDisplayName` | "Enrolled" | Enrolled (with suspension — not disenrolled) |
| `IsPrimary` | true | |

### 8. Existing Suspension — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {GUID} | PK — from TC-002 execution |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | BC Suspension Start Date (from TC-002) |
| `DateRangeEndDate` | **2026-08-10** | BC Suspension End Date (from TC-002) |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |

### 9. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-002 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync (TC-002 completed) |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Last transaction was Open (Span-C from TC-002) |
| `MmisEffectiveDate` | 2026-08-10 (Span-C begin — BC suspension end) | From TC-002 Span-C |
| `MmisEndDate` | 2299-12-31 | From TC-002 Span-C |

### 10. Current (Old) ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {OLD ICA Location GUID — Agency A} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin | Active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL (currently active) | Will be end-dated by the transfer |

#### Old ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {OLD ICA Location GUID — Agency A} | Same as above |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | **"1234567890"** | → WaiverAgencyID in Transaction 1 (close) |

### 11. New ICA Assignment — `PersonModule.PersonLocationAssignment`

This record is created when the user performs the ICA transfer in Blue Compass.

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {new GUID} | PK — system generated |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {NEW ICA Location GUID — Agency B} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | **2026-07-20** (within suspension period) | Transfer effective date — within suspension |
| `EffectiveDateRangeEndDate` | NULL | New active assignment |

#### New ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {NEW ICA Location GUID — Agency B} | Same as above |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | **"9876543210"** | → WaiverAgencyID in Transactions 2 and 3 |

### 12. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → lookup Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL | Must span enrollment period |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "5555555555" | → WaiverFEA in all transactions |

### 13. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 14. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 15. Pre-Execution Verification Query

```sql
-- Verify enrollment is enrolled with active suspension and synced
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0

-- Verify suspension exists (from TC-002)
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StartDate=2026-07-10, EndDate=2026-08-10

-- Verify ICA transfer effective date is WITHIN suspension period
-- Transfer effective date (2026-07-20) must be between 2026-07-10 and 2026-08-10

-- Verify current ICA assignment
SELECT li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND pla.EffectiveDateRangeEndDate IS NULL
-- Expected: MedicaidProviderID = '1234567890' (old) BEFORE trigger
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 6 (ICA assignment updated):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #6: Call S250_Location_Assignment_Update
2. **S200** — Scenario S200 (Enrollment with suspension + agency change):
   - Recalculates spans with new agency split within suspended period
3. **S250** — Condition 2 (Span-B is **Suspended**):
   - Action #1: Identify Span-B (the MMIS suspended span containing agency change effective date)
   - Action #2: Call S600 Condition 2 (Close suspended Span-B with old agency)
   - Action #3: Call S255 for calculated spans from effective date onward
4. **S600** — Condition 2 (Suspended span closure):
   - Closes existing suspended span with old agency. TransactionType="C", Status="S"
   - **FEAStatus = "A"** (always Active on closure, even when Status="S" per WISITS data)
5. **S255** — Condition 3 (Suspended span with new agency — old-agency span exists):
   - Action: Call S620 (Create suspended span with new agency)
6. **S255** — Condition 4 (Active span with new agency — for post-suspension period):
   - Action: Call S610 (Create active span with new agency)
7. **S620** — Creates new suspended enrollment span with new ICA
8. **S610** — Creates new active enrollment span with new ICA

---

## Request Payload Verification

### Transaction 1: Close Old Suspended Span (S600 Condition 2)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | First transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | **"1234567890"** | Old ICA (Agency A) |
| TransactionType | TransactionType | **"C" (Closure)** | Close suspended span |
| DateEnrlEff | DateEnrlEff | Span-B existing begin date (e.g., "20260711") | MMIS suspension begin (BC start + 1) |
| DateEnrlEnd | DateEnrlEnd | Agency change effective date - 1 (e.g., "20260719") | Span closed day before transfer |
| Status | Status | **"S" (Suspended)** | Suspended span closure |
| StartReasonCode | StartReasonCode | **"2P" (ICA Transfer)** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2P" (ICA Transfer)** | Per BR-D01-022 |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | Span-B existing begin date | Anchor |
| FEAEndDate | FEAEndDate | Agency change effective date - 1 | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | **"A" (Active)** | Always "A" on closure per WISITS data |

### Transaction 2: Create New Suspended Span (S620)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | Second transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | **"9876543210"** | New ICA (Agency B) |
| TransactionType | TransactionType | **"O" (Open)** | New suspended span |
| DateEnrlEff | DateEnrlEff | Agency change effective date (e.g., "20260720") | New span starts on transfer date |
| DateEnrlEnd | DateEnrlEnd | Original Span-B end date (e.g., "20260809") | MMIS suspension end (BC end - 1) |
| Status | Status | **"S" (Suspended)** | Continues suspension with new agency |
| StartReasonCode | StartReasonCode | **"2P" (ICA Transfer)** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2P" (ICA Transfer)** | Per BR-D01-022 |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | Agency change effective date | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | Original Span-B end date | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "S" (Suspended) | Matches span status |

### Transaction 3: Create New Active Span (S610)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000003") | Third transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | **"9876543210"** | New ICA (Agency B) |
| TransactionType | TransactionType | **"O" (Open)** | New active span |
| DateEnrlEff | DateEnrlEff | Post-suspension begin (e.g., "20260810") | BC suspension end date |
| DateEnrlEnd | DateEnrlEnd | "22991231" | Open-ended enrollment |
| Status | Status | **"A" (Active)** | Active post-suspension |
| StartReasonCode | StartReasonCode | **"2P" (ICA Transfer)** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End date is 12/31/2299 |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | Post-suspension begin date | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active span |

---

## Expected MMIS Response

| Transaction | ResponseStatus | Key Verification |
|-------------|---------------|------------------|
| Transaction 1 (Close old suspended span) | "SU" | EffectiveDate/EndDate confirmed; WaiverAgencyID = "1234567890" |
| Transaction 2 (New suspended span) | "SU" | Status = "S"; WaiverAgencyID = "9876543210" |
| Transaction 3 (New active span) | "SU" | Status = "A"; WaiverAgencyID = "9876543210" |

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
| `LastChangeTypeCode` | "ICATransfer" (or equivalent) | ICA assignment changed |
| `TransactionTypeCode` | "O" | Last transaction was Open (S610) |
| `MmisEffectiveDate` | Post-suspension begin (2026-08-10) | From Txn 3 (active span) |
| `MmisEndDate` | 2299-12-31 | From Txn 3 |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp DESC
```

Expected: **3 new rows** (in addition to TC-001/TC-002 sync rows)

**Row 1 — S600 Condition 2 (Close old suspended span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | 2026-07-11 (Span-B begin) |
| `MmisEndDate` | 2026-07-19 (transfer effective - 1) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverAgencyID = "1234567890", Status = "S" |

**Row 2 — S620 (Create new suspended span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-20 (transfer effective date) |
| `MmisEndDate` | 2026-08-09 (original suspension end in MMIS) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverAgencyID = "9876543210", Status = "S" |

**Row 3 — S610 (Create new active span):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-08-10 (post-suspension) |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL — verify WaiverAgencyID = "9876543210", Status = "A" |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | All 3 transactions successful — no error messages |

### 4. `PersonModule.PersonLocationAssignment` (ICA records)

```sql
SELECT pla.*, li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}' AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
ORDER BY pla.EffectiveDateRangeStartDate
```

Expected: **2 rows**

| Row | EffectiveDateRangeEndDate | LocationKey → Provider ID |
|-----|---------------------------|---------------------------|
| Old ICA (Agency A) | 2026-07-19 (transfer effective - 1) | "1234567890" |
| New ICA (Agency B) | NULL (active) | "9876543210" |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000013" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Last Sync timestamp | Updated |
| Re-submit button | Hidden |
| Response Status | "SU" |
| Old suspended span | Closed at transfer effective date - 1 |
| New suspended span | Active with new ICA Agency B |
| New active span | Active post-suspension with new ICA Agency B |
| Suspension dates | Unchanged (still 07/10/2026 – 08/10/2026) |

---

## Failure Criteria

### Response Validation Failures
- Any of the 3 transactions returns ResponseStatus ≠ "SU" → HasConflict = true, transfer incomplete
- Partial success (e.g., Txn 1 succeeds, Txn 2 fails) → MMIS in inconsistent state

### Payload Construction Failures
- Transaction 1 Status = "A" instead of "S" → must be "S" for suspended span closure
- Transaction 1 FEAStatus ≠ "A" → must always be "A" on closure per WISITS data, even when Status="S"
- Transaction 2 Status = "A" instead of "S" → S620 must create SUSPENDED span
- Transaction 3 Status = "S" instead of "A" → S610 must create ACTIVE span
- WaiverAgencyID in Txn 1 uses new agency instead of old → closure must reference old agency
- WaiverAgencyID in Txns 2/3 uses old agency instead of new → new spans must reference new agency
- Transaction ordering incorrect (S600 → S620 → S610 required) → MMIS may reject
- Only 2 transactions produced (missing S620 or S610) → both suspended and active spans needed

### Data Integrity Failures
- HasConflict set to 1 when all responses were SU
- SyncTransaction has fewer than 3 rows for this event
- Old ICA assignment not end-dated properly
- Suspension dates modified by the transfer (should remain unchanged)

### Audit Trail Failures
- RequestJsonTextFile is NULL in any SyncTransaction row
- TxnRefId not properly incremented across 3 transactions

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = **"1430000013"** |
| **WaiverAgencyID** (Txn 1 — close) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND LocationKey = OLD ICA → `OrganizationModule.LocationIdentifiers` → `Value` = **"1234567890"** |
| **WaiverAgencyID** (Txns 2+3 — open) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND LocationKey = NEW ICA → `OrganizationModule.LocationIdentifiers` → `Value` = **"9876543210"** |
| **WaiverFEA** (all txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateEnrlEff** (Txn 1) | Existing MMIS Span-B begin date (from ProgramEnrollmentExtension or recalculated) |
| **DateEnrlEnd** (Txn 1) | Agency change effective date - 1 |
| **DateEnrlEff** (Txn 2) | Agency change effective date from new `PersonLocationAssignment.EffectiveDateRangeStartDate` |
| **DateEnrlEnd** (Txn 2) | Original Span-B MMIS end date (BC suspension end - 1 per BR-D01-018) |
| **DateEnrlEff** (Txn 3) | BC suspension end date (no offset) |
| **DateEnrlEnd** (Txn 3) | Original enrollment end date ("22991231") |
| **StartReasonCode / StopReasonCode** | Fixed value **"2P"** (ICA Transfer) per BR-D01-022 |

---

## Related Test Cases

- TC-001: New IRIS Enrollment (prerequisite — enrollment must exist)
- TC-002: Enrolled → Suspended (prerequisite — suspension must exist before transfer)
- TC-003: ICA Transfer — Active (same mechanism but span is Active, not Suspended — 2 transactions only)
- TC-016: FEA Transfer (FEA change uses "2R" reason codes instead of "2P")
