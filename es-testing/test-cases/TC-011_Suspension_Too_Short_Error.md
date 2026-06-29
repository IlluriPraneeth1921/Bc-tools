# TC-011: Suspension Too Short — Less Than 3 Calendar Days (Error Case)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-011 |
| Scenario | Suspension Too Short — Less Than 3 Calendar Days (Error Case) |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 3) → S200 → S240 (Condition 3) |
| Business Rules | BR-D01-001, BR-D01-019 |
| Trigger | User adds a new IRIS suspension where end date - begin date < 2 days |
| Transaction Count | 0 — NO MMIS transaction sent |
| Transaction Ordering | N/A — no transactions |
| Priority | High |
| Expected Outcome | No Transaction Sent — error surfaced to user |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists (Span-A): begin date = enrollment start, end date = 12/31/2299
3. User enters Suspension Start Date = **2026-07-10**
4. User enters Suspension End Date = **2026-07-11** (only 1 day difference, < 2 days required minimum)
5. After +1 begin offset and -1 end offset (BR-D01-017/BR-D01-018), MMIS dates would be: begin = 2026-07-11, end = 2026-07-10 — a **negative/zero-day window** which is invalid
6. Active ICA assignment exists with valid Medicaid Provider ID
7. Active FEA assignment exists with valid dates
8. No existing suspensions for this enrollment
9. **Key constraint:** BR-D01-019 requires at least 3 calendar days between suspension start and end dates. A span of < 2 days produces an invalid MMIS date range after offsets are applied.
10. **Confirmed by Richard Ward (DHS) 06/17/2026** — this scenario must surface an error to the user, NOT send any MMIS transaction.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-001 must have been executed successfully first.** This test requires that the participant already has an active IRIS enrollment in MMIS with a successful sync (SU response).

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
| `TypeDisplayName` | "Home" | Translated to H → IndPhone |
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
| `Value` | e.g., "1234567890" | → WaiverAgencyID (not used — no transaction sent) |

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
| `Value` | e.g., "9876543210" | → WaiverFEA (not used — no transaction sent) |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Active | Must be active ISP |

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
| `MmisEffectiveDate` | Enrollment begin date (2026-07-01) | From TC-001 response |
| `MmisEndDate` | 2299-12-31 | From TC-001 response |

### 12. NEW Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record is created when the user adds the suspension in Blue Compass (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {new GUID} | PK — system generated |
| `Version` | 1 | Initial version |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | BC Suspension Start Date |
| `DateRangeEndDate` | **2026-07-11** | BC Suspension End Date — **only 1 day span** |
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
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0, MmisEndDate='2299-12-31'

-- Verify no existing suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0 (suspension record will be created as the triggering event)

-- Verify suspension record has too-short span (after trigger)
SELECT DateRangeStartDate, DateRangeEndDate,
       DATEDIFF(day, DateRangeStartDate, DateRangeEndDate) AS DaySpan
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: DateRangeStartDate='2026-07-10', DateRangeEndDate='2026-07-11', DaySpan=1
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 3 (New IRIS suspension table entry added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #4: Call S240_Suspense_Add
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Attempts to calculate spans with offset logic:
     - Span-B begin = BC suspension start + 1 = 2026-07-11
     - Span-B end = BC suspension end - 1 = 2026-07-10
   - **Invalid: Span-B end date (7/10) is BEFORE Span-B begin date (7/11)** — zero/negative day window
3. **S240** — Condition 3 (Suspension duration < 3 calendar days / invalid after offsets):
   - **Action: STOP — No MMIS transaction sent**
   - Error surfaced to user: suspension period too short
   - No S500, S510, or S520 steps are executed

> **Key:** The +1/-1 offset logic (BR-D01-017 / BR-D01-018) makes a 1-day suspension mathematically impossible. A 2-day suspension (e.g., 7/10 to 7/12) would produce Span-B begin=7/11, end=7/11 — still problematic. BR-D01-019 requires at minimum 3 calendar days (e.g., 7/10 to 7/13 → Span-B = 7/11 to 7/12).

---

## Request Payload Verification

### No Transaction Sent

| Aspect | Expected | Reason |
|--------|----------|--------|
| MMIS Request | **NOT GENERATED** | Suspension too short — fails BR-D01-019 validation |
| SyncTransaction row | **NOT CREATED** | No transaction to record |
| ProgramEnrollmentExtension update | **NOT MODIFIED** | No sync occurred |
| RequestJsonTextFile | **N/A** | No payload constructed |

> **⚠️ CRITICAL:** This is an error/validation case. The system must detect the invalid suspension duration BEFORE constructing any MMIS payload. No web service call is made.

---

## Expected MMIS Response

### No Response — No Transaction Sent

| Aspect | Expected |
|--------|----------|
| MMIS API call | **NOT MADE** |
| Response payload | **N/A** |
| ResponseStatusCode | **NOT UPDATED** (remains "SU" from prior sync) |

---

## Database Verification (Post-Execution State)

After test execution, verify that NO changes occurred to sync-related tables.

### 1. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` — NO CHANGE

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — same record, UNCHANGED |
| `HasConflict` | 0 (false) | **NOT modified** — no sync attempted |
| `ResponseStatusCode` | "SU" | **Unchanged** from prior TC-001 sync |
| `TransactionTypeCode` | "O" | **Unchanged** from prior TC-001 sync |
| `LastSynchronizedTimestamp` | Prior value (from TC-001) | **NOT updated** — no new sync |
| `MmisEffectiveDate` | 2026-07-01 | **Unchanged** |
| `MmisEndDate` | 2299-12-31 | **Unchanged** |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction` — NO NEW ROWS

```sql
SELECT COUNT(*) AS NewRowCount
FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
  AND Timestamp > '{prior_sync_timestamp}'
```

Expected: **NewRowCount = 0** — No new SyncTransaction rows created

### 3. `CustomerProgramEnrollmentModule.SyncTransactionMessages` — NO NEW ROWS

```sql
SELECT COUNT(*) FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey IN (
  SELECT SyncTransactionKey FROM CustomerProgramEnrollmentModule.SyncTransaction
  WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
    AND Timestamp > '{prior_sync_timestamp}'
)
```

Expected: **0 rows** — no new transactions means no new messages

### 4. `ProgramEnrollmentModule.ProgramEnrollmentSuspension` — ROW EXISTS BUT NO SYNC

```sql
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `DateRangeStartDate` | 2026-07-10 | BC suspension start — record exists |
| `DateRangeEndDate` | 2026-07-11 | BC suspension end — record exists but NOT synced |

> **Note:** The suspension record may exist in the database (created by the UI save action), but no MMIS sync was attempted. The error should prevent the save or flag the record as invalid.

### 5. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | **Unchanged** — suspension error does not affect enrollment status |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
```

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| Active `Value` | "1430000012" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Error message | **Displayed** — "Suspension period must be at least 3 calendar days" (or equivalent) |
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | **NOT updated** (shows prior sync time) |
| Response Status display | "SU" (from prior sync — unchanged) |
| MMIS Errors table | Empty (no MMIS errors — error is pre-send validation) |
| Suspension record | Not saved OR saved with validation error flag |
| Enrollment Status | "Enrolled" (unchanged) |

---

## Failure Criteria

### Validation Logic Failures
- System sends an MMIS transaction despite invalid suspension duration → BR-D01-019 violated
- No error message surfaced to user when suspension < 3 calendar days
- System allows saving a 1-day suspension without error

### Data Integrity Failures
- New SyncTransaction row(s) created — should be 0 new rows
- ProgramEnrollmentExtension fields modified (LastSynchronizedTimestamp, MmisEndDate, etc.)
- HasConflict changed from 0 to 1 without any transaction being sent

### Offset Logic Failures
- System attempts to calculate Span-B with begin > end (should detect this as invalid)
- System sends Span-B with DateEnrlEff=20260711 and DateEnrlEnd=20260710 (inverted dates)

### UI State Failures
- No error message displayed to user
- Sync timestamp updated despite no sync occurring
- Suspension appears as "synced" in UI

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path | Notes |
|---------------|-------------|-------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE `StatusDisplayName` = 'Active' → `Value` = "1430000012" | Not sent — no transaction |
| **Suspension Start** | `ProgramEnrollmentModule.ProgramEnrollmentSuspension.DateRangeStartDate` = 2026-07-10 | Used for validation only |
| **Suspension End** | `ProgramEnrollmentModule.ProgramEnrollmentSuspension.DateRangeEndDate` = 2026-07-11 | Used for validation only |
| **Offset Calculation** | Start + 1 = 2026-07-11, End - 1 = 2026-07-10 | **INVALID: begin > end** |
| **Day Span** | DATEDIFF(day, '2026-07-10', '2026-07-11') = 1 day | Fails BR-D01-019 minimum of 3 days |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — must succeed first)
- TC-002: Enrolled → Suspended with end date (valid suspension — 3+ day span)
- TC-010: Open-Ended Suspension (valid — no end date so no minimum-day constraint)
- S240_001: Suspension with valid end date (happy path comparison)
- S240_003: Suspension < 3 days (this test case — error condition)
