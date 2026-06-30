# TC-002: Enrolled → Suspended (Suspense Date Logic)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-002 |
| Scenario | Enrolled → Suspended (Suspense Date Logic) |
| Test Participant MA ID | **1430000013** |
| Decision Table | S100 (Condition 3) → S200 → S240 (Condition 1) → S500 + S510 + S520 |
| Business Rules | BR-D01-001, BR-D01-017, BR-D01-018, BR-D01-019, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User adds a new IRIS suspension table entry |
| Transaction Count | 3 MMIS transactions (Close Span-A, Add Span-B, Create Span-C) |
| Priority | High |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists (Span-A): begin date = enrollment start, end date = 12/31/2299
3. User enters Suspension Start Date = 7/10/2026
4. User enters Suspension End Date = (a valid date, producing span >= 3 calendar days per BR-D01-019)
5. Active ICA assignment exists with valid Medicaid Provider ID
6. Active FEA assignment exists with valid dates
7. No existing suspensions for this enrollment

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-001 must have been executed successfully first.** This test requires that the participant already has an active IRIS enrollment in MMIS with a successful sync (SU response).

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
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Must be active at enrollment start |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Must span enrollment period |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in all 3 transactions |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL or >= enrollment end date | Must span enrollment period |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in all 3 transactions |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate (same as DateEnrlEff) |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" to MMIS |
| `StatusDisplayName` | "Enrolled" | Must already be enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-001 execution |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync required |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | Enrollment begin date | From TC-001 response |
| `MmisEndDate` | 2299-12-31 | From TC-001 response |

### 12. NEW Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record is created when the user adds the suspension in Blue Compass (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {new GUID} | PK — system generated |
| `Version` | 1 | Initial version |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | BC Suspension Start Date |
| `DateRangeEndDate` | **2026-08-10** | BC Suspension End Date (must be >= start + 3 days per BR-D01-019) |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |
| `ReasonIdentifier` | (reason code identifier) | FK to vocabulary |
| `ReasonCodeSystemIdentifier` | (code system ID) | |

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
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict, pee.LastSynchronizedTimestamp
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0

-- Verify no existing suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0 (no prior suspensions)
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 3 (New IRIS suspension table entry added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #4: Call S240_Suspense_Add
2. **S200** — Scenario S200_002 (Enrollment with suspensions, no agency changes):
   - Spans calculated: Active (enrollment begin → suspension begin), Suspended (suspension begin + 1 → suspension end - 1), Active (suspension end → enrollment end)
3. **S240** — Condition 1 (New suspense record has an end date, meets 3-day minimum):
   - Action #1: Identify Span-A (MMIS Enrollment Span including BC suspense begin date)
   - Action #2: Call S500 (Close Span-A with end date = BC suspense begin date)
   - Action #3: Call S520 (Create Span-C with begin date = BC suspense end date)
   - Action #4: Call S510 (Add Span-B with begin date = BC suspense begin + 1, end date = BC suspense end - 1)

---

## Date Offset Logic (Critical — BR-D01-017, BR-D01-018)

| BC Date | MMIS Date | Offset Rule | Rationale |
|---------|-----------|-------------|-----------|
| BC Suspension Start = 7/10/2026 | Span-A End Date = 7/10/2026 | No offset (participant active on this date) | Participant may have received services on suspension begin date |
| BC Suspension Start = 7/10/2026 | Span-B Begin Date = 7/11/2026 | +1 day | BR-D01-017: MMIS suspension start = BC start + 1 |
| BC Suspension End (e.g., 8/10/2026) | Span-B End Date = 8/9/2026 | -1 day | BR-D01-018: MMIS suspension end = BC end - 1 |
| BC Suspension End (e.g., 8/10/2026) | Span-C Begin Date = 8/10/2026 | No offset (participant active on this date) | Participant may receive services on suspension end date |

---

## Request Payload Verification

### Transaction 1: Close Active Span (S500 — Close Span-A Before Suspense)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnSource | TxnSource | "CMMRT" | Fixed |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000001") | First transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | Existing Span-A ICA Medicaid Provider ID | Pre-update ICA |
| TransactionType | TransactionType | "C" (Closure) | Shortening end date per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | Span-A existing begin date (CCYYMMDD) | Anchor — existing MMIS begin |
| DateEnrlEnd | DateEnrlEnd | "20260710" | BC suspension start date (NO offset — participant active on this date) |
| Status | Status | "A" (Active) | Per BR-D01-020, closure uses Status=A |
| StartReasonCode | StartReasonCode | "2I" (Suspended) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | "2I" (Suspended) | Per BR-D01-022 |
| WaiverFEA | WaiverFEA | Existing Span-A FEA Medicaid Provider ID | Pre-update FEA |
| FEAEffectiveDate | FEAEffectiveDate | Span-A existing begin date | Anchor |
| FEAEndDate | FEAEndDate | "20260710" | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active on closure |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |

### Transaction 2: Open Suspension Span (S510 — Add Suspense Span)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | Second transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID at BC suspense begin date | Active ICA |
| TransactionType | TransactionType | "O" (Open) | New span per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | "20260711" | BC suspension start + 1 day (BR-D01-017) |
| DateEnrlEnd | DateEnrlEnd | BC suspension end - 1 day (CCYYMMDD) | BR-D01-018 offset applied |
| Status | Status | "S" (Suspended) | Per BR-D01-020 |
| StartReasonCode | StartReasonCode | "2I" (Suspended) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | "2I" (Suspended) | Per BR-D01-022 |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID at BC suspense begin date | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | "20260711" | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | BC suspension end - 1 day | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "S" (Suspended) | Matches span status |

### Transaction 3: Create Post-Suspension Active Span (S520 — Create Span-C After Suspense)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| TxnRefId | TxnRefId | Incremental (e.g., "S000000003") | Third transaction |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID at BC suspense end date | Active ICA |
| TransactionType | TransactionType | "O" (Open) | New span per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | BC suspension end date (CCYYMMDD) | No offset — participant active on this date |
| DateEnrlEnd | DateEnrlEnd | Span-A pre-update end date (22991231) | Original enrollment end |
| Status | Status | "A" (Active) | Per BR-D01-020 |
| StartReasonCode | StartReasonCode | "2Q" (Enrollment from Suspension) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End date is 12/31/2299 |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID at BC suspense end date | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | BC suspension end date | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | Span-A pre-update end date | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | Active on post-suspension span |

---

## Expected MMIS Response

| Transaction | ResponseStatus | EffectiveDate | EndDate |
|-------------|---------------|---------------|---------|
| Transaction 1 (Close Span-A) | "SU" | Span-A begin date | 20260710 |
| Transaction 2 (Span-B Suspension) | "SU" | 20260711 | BC end - 1 |
| Transaction 3 (Span-C Active) | "SU" | BC suspension end | 22991231 |

---

## Database Verification (Post-Execution State)

### 1. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `HasConflict` | 0 (false) | No conflict |
| `ResponseStatusCode` | "SU" | All 3 transactions succeeded |
| `LastSynchronizedTimestamp` | Updated datetime2 | Newer than pre-execution value |
| `LastSuspensionChangeTypeCode` | "NewSuspension" (or equivalent) | Suspension was added |
| `PreUpdateSuspensionStartDate` | NULL | No prior suspension |
| `TransactionTypeCode` | "O" | Last transaction was Open (Span-C) |
| `MmisEffectiveDate` | BC suspension end date (2026-08-10) | From last transaction (Span-C) |
| `MmisEndDate` | 2299-12-31 | From last transaction (Span-C) |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp
```

Expected: **3 rows** (one per MMIS transaction)

**Row 1 — S500 (Close Span-A):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | Span-A begin date |
| `MmisEndDate` | 2026-07-10 (BC suspension start, no offset) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "NewSuspension" or equivalent |

**Row 2 — S510 (Add Span-B Suspension):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-11 (BC start + 1 day) |
| `MmisEndDate` | 2026-08-09 (BC end - 1 day) |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL |

**Row 3 — S520 (Create Span-C):**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-08-10 (BC suspension end, no offset) |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SU" |
| `RequestJsonTextFile` | NOT NULL |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{key}'
```

Expected: **No rows** (all transactions successful)

### 4. `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

```sql
SELECT * FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{key}'
```

| Column | Expected Value |
|--------|----------------|
| `DateRangeStartDate` | 2026-07-10 |
| `DateRangeEndDate` | 2026-08-10 |

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
| Transaction Type display | Shows correctly per each transaction |
| MMIS Effective Date | 7/11/2026 (suspension begin in MMIS) |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated |
| Response Status | "SU" |

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = "1430000013" |
| **WaiverAgencyID** (all 3 txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** (all 3 txns) | Same path as above but Type = 'FEA' |
| **DateEnrlEnd** (Txn 1 / S500) | BC suspension begin date from `ProgramEnrollmentModule.ProgramEnrollmentSuspension.DateRangeStartDate` (no offset) |
| **DateEnrlEff** (Txn 2 / S510) | `ProgramEnrollmentSuspension.DateRangeStartDate` + 1 day (BR-D01-017) |
| **DateEnrlEnd** (Txn 2 / S510) | `ProgramEnrollmentSuspension.DateRangeEndDate` - 1 day (BR-D01-018) |
| **DateEnrlEff** (Txn 3 / S520) | `ProgramEnrollmentSuspension.DateRangeEndDate` (no offset — participant active on this date) |
| **DateEnrlEnd** (Txn 3 / S520) | Span-A pre-update end date from `ProgramEnrollmentExtension.PreUpdateEndDate` or original enrollment end (22991231) |

---

## Validation Rules (BR-D01-019)

| Check | Rule | Result if Failed |
|-------|------|------------------|
| Suspension duration | BC end date - BC begin date >= 2 days (3 calendar days minimum) | No MMIS transaction sent; error surfaced to user |
| Example: BC Start=7/10, End=7/11 | 7/11 - 7/10 = 1 day (< 2) | FAIL — after offsets (+1 begin, -1 end) would produce 0-day window |
| Example: BC Start=7/10, End=7/12 | 7/12 - 7/10 = 2 days (= 2) | PASS — produces valid 1-day MMIS window (7/11 to 7/11) |

---

## Failure Criteria

- Any of the 3 transactions returns ResponseStatus ≠ "SU" → HasConflict = true, partial processing may have occurred
- Suspension span < 3 calendar days → BR-D01-019 violated, no MMIS transactions sent, error displayed to user
- FEA dates no longer spanning enrollment period after suspension dates applied → Error 9156
- ICA/FEA assignment not active at suspension begin/end dates → incorrect WaiverAgencyID/WaiverFEA sent
- Transaction ordering incorrect (must be S500 → S510 → S520) → MMIS may reject overlapping spans

---

## Related Test Cases

- TC-001: New IRIS Enrollment (prerequisite — must succeed before suspension can be tested)
- S240_002: Open-ended suspension (no end date — sends 12/31/2299, no Span-C created)
- S240_003: Suspension < 3 days (error case — no MMIS transaction)
