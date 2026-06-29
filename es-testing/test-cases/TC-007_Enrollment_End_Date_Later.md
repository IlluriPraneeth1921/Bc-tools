# TC-007: Enrollment End Date Changed to Later Date

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-007 |
| Scenario | Enrollment End Date Changed to Later Date |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 2) → S200 → S220 (Condition 5) → S350 (Condition 2, no suspension) |
| Business Rules | BR-D01-001, BR-D01-020, BR-D01-021 |
| Trigger | User extends existing IRIS enrollment end date to a later date |
| Transaction Count | 1 MMIS transaction (update existing span end date) |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists with a SPECIFIC end date (e.g., 2026-09-30) — NOT open-ended
3. User extends enrollment end date to a later value (e.g., 2026-12-31 or NULL/22991231)
4. Active ICA assignment exists with valid Medicaid Provider ID spanning the extended enrollment period
5. Active FEA assignment exists with valid dates spanning the extended enrollment period
6. No active suspensions for this enrollment

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-006 must have been executed successfully first (or equivalent state).** This test requires that the participant has an IRIS enrollment with a specific end date (not open-ended) and a successful prior sync. The enrollment end date is being extended from a specific date to a later date.

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
| `EffectiveDateRangeEndDate` | NULL or after new extended end date | Must span new (longer) enrollment period |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in request |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL or >= new extended end date | Must span extended enrollment period |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in request |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin (ANCHOR date) |
| `EnrollmentDateRangeEndDate` | **Being changed from 2026-09-30 → NULL (or 2026-12-31)** | User extends end date to later value |
| `StatusDisplayName` | "Enrolled" | Re-enrolled / status returns to Enrolled |
| `StatusReasonDisplayName` | NULL | No specific reason for extension |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from prior sync |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync required |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "C" | Prior Closure transaction (from TC-006 or similar) |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) | From prior response |
| `MmisEndDate` | 2026-09-30 | From prior response (specific end date, not open-ended) |

### 12. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | Used to derive WorkerID = "J.Smith" (truncated to 8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter for worker lookup |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 13. Pre-Execution Verification Query

```sql
-- Verify enrollment has a specific end date and synced span
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeEndDate,
       pee.ResponseStatusCode, pee.HasConflict, pee.MmisEndDate, pee.TransactionTypeCode
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: EnrollmentDateRangeEndDate='2026-09-30', ResponseStatusCode='SU',
--           HasConflict=0, MmisEndDate='2026-09-30'

-- Verify no active suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 2 (Existing IRIS enrollment updated — end date changed):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Enrollment begin → new enrollment end date (NULL → 22991231) with Status A
3. **S220** — Condition 5 (End date moved to later date):
   - Action: Call S350 to extend existing MMIS span with new later end date
4. **S350** — Condition 2 (No active suspension):
   - Constructs extension request: TransactionType = "O", DateEnrlEff = existing begin (ANCHOR), DateEnrlEnd = new later end date

---

## Request Payload Verification

### Transaction 1: Extend Existing Span (S350 — End Date Extension)

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

#### Address Node (Residential — "IR")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2), IRIS Residential |
| Address1 | Address1 | Care Of name (or spaces) | CHAR(30) |
| Address2 | Address2 | Street address | CHAR(30), required |
| Address3 | Address3 | Apt/Lot (or spaces) | CHAR(30) |
| City | City | City name | CHAR(18) |
| State | State | 2-char MMIS state code | CHAR(2) |
| ZipCode | ZipCode | First 5 digits of postal code | NUM(5) |
| ZipCode4 | ZipCode4 | Digits 6-9 of postal code | NUM(4) |
| County | County | 2-digit MMIS county code | CHAR(2) |
| NumPhone | NumPhone | Primary phone number | NUM(10) |
| IndPhone | IndPhone | Phone type (H/C/W) | CHAR(1) |

#### Additional Address Node (Mailing — "IM")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AdditionalAddressType | AdditionalAddressType | "IM" | CHAR(2), IRIS Mailing |
| AdditionalAddress1 | AdditionalAddress1 | Care Of (or spaces) | CHAR(30) |
| AdditionalAddress2 | AdditionalAddress2 | Street address | CHAR(30), required |
| AdditionalAddress3 | AdditionalAddress3 | Apt/Lot (or spaces) | CHAR(30) |
| AdditionalCity | AdditionalCity | City | CHAR(18) |
| AdditionalState | AdditionalState | 2-char MMIS state code | CHAR(2) |
| AdditionalZipCode | AdditionalZipCode | First 5 digits | NUM(5) |
| AdditionalZipCode4 | AdditionalZipCode4 | Digits 6-9 | NUM(4) |
| AdditionalCounty | AdditionalCounty | 2-digit MMIS county code | CHAR(2) |
| AdditionalNumPhone | AdditionalNumPhone | Secondary phone | NUM(10) |
| AdditionalIndPhone | AdditionalIndPhone | Phone type (H/C/W) | CHAR(1) |

#### Waiver Enrollment Node

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | CHAR(10), always "IRIS" |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | CHAR(25), from active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Extending end date per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | **Existing MMIS begin date (ANCHOR)** e.g., "20260701" | NUM(8), existing span begin — not changed |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** (or new later end date in CCYYMMDD) | NUM(8), extended end date (NULL → 22991231) |
| Status | Status | **"A" (Active)** | Per BR-D01-020 |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8), format: {Initial}.{LastName} truncated |
| StartReasonCode | StartReasonCode | **"2L" (New Enrollment)** | CHAR(2), per BR-D01-022 |
| StopReasonCode | StopReasonCode | **Not Required** | End date extended to 22991231 — no stop reason needed |
| RecertificationDueDate | RecertificationDueDate | ISP end date in CCYYMMDD | NUM(8) |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff | NUM(8) |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2), default '00' if not found |

#### FEA Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | Existing MMIS begin date (ANCHOR) | NUM(8), matches DateEnrlEff |
| FEAEndDate | FEAEndDate | New later end date (22991231 if NULL) | NUM(8), matches DateEnrlEnd |
| FEAStatus | FEAStatus | "A" (Active) | CHAR(1) |

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | Enrollment span extended per BR-D01-010 |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed — Open (extension) |
| EffectiveDate | Same as DateEnrlEff sent (e.g., "20260701") | Echoed |
| EndDate | Same as DateEnrlEnd sent (e.g., "22991231") | Echoed — new later end |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000012" | No ID swap expected |
| SubmittedClientID | "1430000012" | Echoed |
| Error Segment | Not present | No errors in happy path |

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
| `HasConflict` | 0 (false) | No conflict |
| `ResponseStatusCode` | "SU" | Success |
| `TransactionTypeCode` | "O" | Open transaction (extension) |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin — ANCHOR) | From response EffectiveDate |
| `MmisEndDate` | 2299-12-31 (new extended end date) | From response EndDate |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "EndDateExtension" (or equivalent code) | Type of change |
| `LastSuspensionChangeTypeCode` | NULL | No suspension involvement |
| `PreUpdateBeginDate` | 2026-07-01 | Enrollment begin date BEFORE this update |
| `PreUpdateEndDate` | 2026-09-30 | Enrollment end date BEFORE this update (was specific date) |
| `PreUpdateSuspensionStartDate` | NULL | No suspension |
| `PreUpdateSuspensionEndDate` | NULL | No suspension |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
```

Expected: **1 new row** (in addition to prior sync rows)

**New Row — S350 (Extend Span — End Date Later):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 (ANCHOR begin date) |
| `MmisEndDate` | 2299-12-31 (new later end) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000012" |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "EndDateExtension" (or equivalent) |
| `SuspensionChangeTypeCode` | NULL |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {captured at runtime} |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — successful extension, no error messages

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Re-enrolled with extended end date |
| `EnrollmentDateRangeEndDate` | NULL (or 2026-12-31) | New extended end date |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

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
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Enrollment End Date | Displays new later date or "Open-Ended" |
| Enrollment Status | "Enrolled" |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → enrollment not properly extended in MMIS
- Enrollment activated despite FL response → BR-D01-010 violated

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- PreUpdateEndDate not captured as 2026-09-30 (prior specific end date)
- MmisEndDate not updated to new later date (22991231)
- TransactionTypeCode not "O" (should be Open for extension)

### Payload Construction Failures
- TransactionType ≠ "O" → BR-D01-021 violated (extending end date must use Open)
- Status ≠ "A" → BR-D01-020 violated
- DateEnrlEff ≠ existing MMIS begin date → ANCHOR date not preserved
- DateEnrlEnd ≠ new later end date (22991231)
- StartReasonCode ≠ "2L" per BR-D01-022
- FEA dates not matching the extended span dates
- StopReasonCode populated when end date = 22991231 (should be Not Required)

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction row not created for this transaction
- TxnRefId not properly incremented

### UI State Failures
- Conflict chip displayed when not expected
- Re-submit button visible when not expected
- Enrollment end date not reflecting the extended value

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
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **DateEnrlEff** | `ProgramEnrollmentExtension.MmisEffectiveDate` (existing MMIS begin — ANCHOR) |
| **DateEnrlEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` (new later end, NULL → "22991231") |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **RecertificationCompletionDate** | Same as DateEnrlEff |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (initial enrollment)
- TC-006: Enrollment End Date Changed to Earlier Date (opposite scenario — shortening end date)
- TC-008: Referral Withdrawn (status change with span deletion)
- TC-009: Disenrolled to Enrolled — Reinstatement (status change re-opening enrollment)
