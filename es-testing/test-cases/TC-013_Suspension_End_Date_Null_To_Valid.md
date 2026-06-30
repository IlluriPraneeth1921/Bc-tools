# TC-013: Suspension End Date Changed from Null to Valid Date (S230_006)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-013 |
| Scenario | Suspension End Date Changed from Null to Valid Date (S230_006) |
| Test Participant MA ID | **1430000013** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 4) → S200 → S230 (Condition 6) → S440 + S520 |
| Business Rules | BR-D01-001, BR-D01-018, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User adds an end date to a previously open-ended suspension |
| Transaction Count | 2 MMIS transactions |
| Transaction Ordering | S440 first (shorten Span-B end), then S520 (create Span-C) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant has an open-ended suspension (from TC-010 execution)
2. MMIS currently has 2 spans: Span-A (closed active) and Span-B (suspended, end = 22991231)
3. No Span-C exists — suspension was open-ended
4. User sets suspension end date to **2026-08-10**
5. Active ICA assignment exists with valid Medicaid Provider ID
6. Active FEA assignment exists with valid dates
7. Prior sync was successful (ResponseStatusCode = "SU") with 2 spans in MMIS
8. **Key difference from TC-002:** TC-002 creates all 3 spans at once. This test MODIFIES an existing open-ended suspension to create Span-C after the fact.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-010 must have been executed successfully first.** This test requires that the participant already has an open-ended suspension synced to MMIS (2 spans: Span-A closed active + Span-B open-ended suspended).

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
| `Value` | e.g., "1234567890" | → WaiverAgencyID in both transactions |

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
| `Value` | e.g., "9876543210" | → WaiverFEA in both transactions |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended enrollment |
| `StatusDisplayName` | "Enrolled" | Must be enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-010 execution |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync (TC-010 completed) |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction (last was Span-B open) |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-07-11 (Span-B begin from TC-010) | From TC-010 last transaction |
| `MmisEndDate` | 2299-12-31 | From TC-010 last transaction (open-ended suspension) |

### 12. Existing Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record EXISTS (from TC-010) and is being MODIFIED — user adds an end date.

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {existing GUID} | PK — from TC-010 |
| `Version` | 1 → 2 | Updated version after modification |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | Unchanged — BC Suspension Start Date |
| `DateRangeEndDate` | **2026-08-10** (changed from NULL) | **User adds end date** — triggering event |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |

### 13. Existing MMIS Spans (from TC-010 prior sync)

| Span | Status | MMIS Begin | MMIS End | Notes |
|------|--------|-----------|---------|-------|
| Span-A | Active (A) | 2026-07-01 | 2026-07-10 | Pre-suspension active span (closed) |
| Span-B | Suspended (S) | 2026-07-11 | 2299-12-31 | Open-ended suspension span |
| Span-C | **Does NOT exist** | — | — | No post-suspension span (was open-ended) |

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
-- Verify enrollment is active and synced with open-ended suspension
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0
-- MmisEffectiveDate='2026-07-11', MmisEndDate='2299-12-31'

-- Verify existing open-ended suspension
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected (before user change): DateRangeStartDate='2026-07-10', DateRangeEndDate=NULL
-- Expected (after user change): DateRangeStartDate='2026-07-10', DateRangeEndDate='2026-08-10'
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 4 (Existing IRIS suspension table entry modified):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #5: Call S230_Suspense_Modify_Delete
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Recalculate with new end date: Span-A (active), Span-B (suspended, now bounded), Span-C (new active post-suspension)
3. **S230** — Condition 6 (Suspension end date changed from NULL to valid date):
   - Action #1: Call S440 (Shorten Span-B end date to earlier — bounded suspension)
   - Action #2: Call S520 (Create Span-C — new active span after suspension)
4. **S440** — (Shorten Suspense Span-B end date):
   - TransactionType = "C", Status = "S" (shortening suspended span)
   - DateEnrlEff = Span-B begin (anchor), DateEnrlEnd = new BC suspension end - 1 day (BR-D01-018)
5. **S520** — (Create Span-C after suspense):
   - TransactionType = "O", Status = "A" (new active span)
   - DateEnrlEff = BC suspension end date (no offset), DateEnrlEnd = Span-A's original end (22991231)

---

## Date Offset Logic (BR-D01-018)

| BC Date | MMIS Date | Offset Rule | Rationale |
|---------|-----------|-------------|-----------|
| BC Suspension End = 8/10/2026 | Span-B End Date = 8/09/2026 | -1 day | BR-D01-018: MMIS suspension end = BC end - 1 |
| BC Suspension End = 8/10/2026 | Span-C Begin Date = 8/10/2026 | No offset | BC end = first day participant is active again |

---

## Request Payload Verification

### Transaction 1: Shorten Suspension Span-B (S440 — Suspense End Date to Earlier)

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
| IdUniqueClient | IdUniqueClient | "1430000013" | CHAR(10) |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| NameMi | NameMi | Middle name (if exists) | CHAR(25) |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### Address Node (Residential — "IR")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2) |
| Address1 | Address1 | Care Of name (or spaces) | CHAR(30) |
| Address2 | Address2 | Street address | CHAR(30), required |
| Address3 | Address3 | Apt/Lot (or spaces) | CHAR(30) |
| City | City | City name | CHAR(18) |
| State | State | 2-char MMIS state code | CHAR(2) |
| ZipCode | ZipCode | First 5 digits | NUM(5) |
| ZipCode4 | ZipCode4 | Digits 6-9 | NUM(4) |
| County | County | 2-digit MMIS county code | CHAR(2) |
| NumPhone | NumPhone | Primary phone number | NUM(10) |
| IndPhone | IndPhone | Phone type (H/C/W) | CHAR(1) |

#### Additional Address Node (Mailing — "IM")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AdditionalAddressType | AdditionalAddressType | "IM" | CHAR(2) |
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

#### Waiver Enrollment Node (Transaction 1 — S440)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"C" (Closure)** | Per BR-D01-021 — shortening end date uses Closure |
| DateEnrlEff | DateEnrlEff | **"20260711"** | Existing Span-B begin (ANCHOR — unchanged) |
| DateEnrlEnd | DateEnrlEnd | **"20260809"** | New BC suspension end - 1 day (2026-08-10 - 1 = 2026-08-09, BR-D01-018) |
| Status | Status | **"S" (Suspended)** | Per BR-D01-020 — suspended span remains suspended |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2Q"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2W"** | Per BR-D01-022 |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260711") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 1 — S440)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260711" | Matches DateEnrlEff (Span-B begin) |
| FEAEndDate | FEAEndDate | "20260809" | Matches DateEnrlEnd (new shortened end) |
| FEAStatus | FEAStatus | **"S" (Suspended)** | Matches span status |

---

### Transaction 2: Create Post-Suspension Active Span (S520 — Create Span-C)

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8) |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6) |
| TxnRefId | TxnRefId | Incremental (e.g., "S000000002") | CHAR(10), second transaction |

#### Demographic Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| IdUniqueClient | IdUniqueClient | "1430000013" | CHAR(10) |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| NameMi | NameMi | Middle name (if exists) | CHAR(25) |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### Address Node (Residential — "IR") — Transaction 2

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2) |
| Address1 | Address1 | Care Of name (or spaces) | CHAR(30) |
| Address2 | Address2 | Street address | CHAR(30), required |
| Address3 | Address3 | Apt/Lot (or spaces) | CHAR(30) |
| City | City | City name | CHAR(18) |
| State | State | 2-char MMIS state code | CHAR(2) |
| ZipCode | ZipCode | First 5 digits | NUM(5) |
| ZipCode4 | ZipCode4 | Digits 6-9 | NUM(4) |
| County | County | 2-digit MMIS county code | CHAR(2) |
| NumPhone | NumPhone | Primary phone number | NUM(10) |
| IndPhone | IndPhone | Phone type (H/C/W) | CHAR(1) |

#### Additional Address Node (Mailing — "IM") — Transaction 2

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AdditionalAddressType | AdditionalAddressType | "IM" | CHAR(2) |
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

#### Waiver Enrollment Node (Transaction 2 — S520)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — new span uses Open |
| DateEnrlEff | DateEnrlEff | **"20260810"** | BC suspension end date (NO offset — first active day) |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | Span-A's original end date (open-ended enrollment) |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — post-suspension active span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2Q"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End = 22991231, no stop reason needed |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260810") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 2 — S520)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260810" | Matches DateEnrlEff (Span-C begin) |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd (open-ended) |
| FEAStatus | FEAStatus | **"A" (Active)** | Matches span status |

---

## Expected MMIS Response

| Transaction | ResponseStatus | EffectiveDate | EndDate |
|-------------|---------------|---------------|---------|
| Transaction 1 (S440 — Shorten Span-B) | "SU" | 20260711 (Span-B begin) | 20260809 (new shortened end) |
| Transaction 2 (S520 — Create Span-C) | "SU" | 20260810 (BC suspension end) | 22991231 (open-ended) |

### Multi-Transaction Response Handling

| Transaction | Decision Table Step | Expected ResponseStatus | Key Verification |
|-------------|--------------------|-----------------------|------------------|
| Txn 1 | S440 | "SU" | Span-B end shortened from 22991231 to 20260809 |
| Txn 2 | S520 | "SU" | New Span-C created starting at BC suspension end |

> **Note:** After both transactions succeed, MMIS has 3 spans: Span-A (2026-07-01 to 2026-07-10, Active), Span-B (2026-07-11 to 2026-08-09, Suspended), Span-C (2026-08-10 to 2299-12-31, Active).

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
| `HasConflict` | 0 (false) | No conflict — both transactions succeeded |
| `ResponseStatusCode` | "SU" | Both transactions successful |
| `TransactionTypeCode` | "O" | Last transaction type (Span-C open) |
| `TxnRefId` | {Txn 2 ref ID} | From last transaction |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent |
| `MmisEffectiveDate` | 2026-08-10 (Span-C begin — BC suspension end) | From last transaction (S520) |
| `MmisEndDate` | 2299-12-31 | From last transaction (open-ended) |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "SuspensionEndDateAdded" (or equivalent) | Type of change |
| `LastSuspensionChangeTypeCode` | "EndDateNullToValid" (or equivalent) | Suspension-specific change type |
| `PreUpdateBeginDate` | 2026-07-11 (prior Span-B begin) | From before this update |
| `PreUpdateEndDate` | 2299-12-31 (prior Span-B end — was open-ended) | From before this update |
| `PreUpdateSuspensionStartDate` | 2026-07-10 | Suspension start (unchanged) |
| `PreUpdateSuspensionEndDate` | NULL | Suspension end BEFORE this update (was open-ended) |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp
```

Expected: **2 new rows** (in addition to prior TC-010 sync rows)

**Row 1 — S440 (Shorten Span-B):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "C" |
| `MmisEffectiveDate` | 2026-07-11 (Span-B begin — anchor) |
| `MmisEndDate` | 2026-08-09 (BC suspension end - 1, BR-D01-018) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "SuspensionEndDateAdded" (or equivalent) |
| `SuspensionChangeTypeCode` | "EndDateNullToValid" (or equivalent) |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {first transaction ref ID} |

**Row 2 — S520 (Create Span-C):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-08-10 (BC suspension end — no offset) |
| `MmisEndDate` | 2299-12-31 (open-ended enrollment) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "SuspensionEndDateAdded" (or equivalent) |
| `SuspensionChangeTypeCode` | "EndDateNullToValid" (or equivalent) |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {second transaction ref ID} |

### 2a. `CustomerProgramEnrollmentModule.SyncTransactionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey IN (
  SELECT SyncTransactionKey FROM CustomerProgramEnrollmentModule.SyncTransaction
  WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
)
```

Expected: **No new rows** — both transactions successful, no error messages

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — all transactions successful

### 4. `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

```sql
SELECT * FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `DateRangeStartDate` | 2026-07-10 | BC suspension start (unchanged) |
| `DateRangeEndDate` | 2026-08-10 | BC suspension end (newly set) |

### 5. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Enrollment status unchanged — suspension bounded |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
```

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| Active `Value` | "1430000013" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Suspension Status | Active / Bounded |
| Suspension Start Date | 07/10/2026 |
| Suspension End Date | 08/10/2026 (newly set) |
| Transaction Count | 2 new transactions recorded |

---

## Failure Criteria

### Response Validation Failures
- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true
- Partial failure: S440 succeeds but S520 fails → Span-B shortened but no Span-C created (gap in coverage)

### Data Integrity Failures
- HasConflict set to 1 when both responses were SU
- SyncTransaction row count ≠ 2 new rows
- PreUpdateSuspensionEndDate not NULL (should capture prior open-ended state)
- MmisEndDate not updated to 2299-12-31 (from Span-C)

### Payload Construction Failures
- Transaction 1: TransactionType ≠ "C" → BR-D01-021 violated (shortening end date uses Closure)
- Transaction 1: Status ≠ "S" → BR-D01-020 violated (suspended span stays Suspended)
- Transaction 1: DateEnrlEnd ≠ BC suspension end - 1 → BR-D01-018 violated
- Transaction 1: DateEnrlEff ≠ existing Span-B begin (anchor must be preserved)
- Transaction 2: TransactionType ≠ "O" → BR-D01-021 violated (new span uses Open)
- Transaction 2: Status ≠ "A" → BR-D01-020 violated (post-suspension is Active)
- Transaction 2: DateEnrlEff ≠ BC suspension end date (no offset on Span-C begin)
- Transaction 2: DateEnrlEnd ≠ "22991231" → should inherit original open-ended enrollment end

### Transaction Ordering Failures
- Transactions sent in wrong order (must be S440 → S520)
- MMIS may reject S520 if Span-B still extends to 22991231 (overlapping spans)

### Audit Trail Failures
- RequestJsonTextFile is NULL in either SyncTransaction row
- TxnRefId not incrementing correctly between transactions

### UI State Failures
- Conflict chip displayed when not expected
- Suspension end date not reflecting new value (08/10/2026)
- Suspension still showing as "Open-Ended"

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
| **Address (IR)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Residential' AND `IsActive` = 1 AND `IsPrimary` = 1 |
| **Address (IM)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Mailing' AND `IsActive` = 1 AND `IsPrimary` = 1 |
| **WaiverAgencyID** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** (both txns) | Same path but Type = 'FEA' |
| **DateEnrlEff** (Txn 1 / S440) | Existing Span-B begin date (ANCHOR — 2026-07-11) |
| **DateEnrlEnd** (Txn 1 / S440) | `ProgramEnrollmentSuspension.DateRangeEndDate` - 1 day (BR-D01-018 — 2026-08-09) |
| **DateEnrlEff** (Txn 2 / S520) | `ProgramEnrollmentSuspension.DateRangeEndDate` (no offset — 2026-08-10) |
| **DateEnrlEnd** (Txn 2 / S520) | Original enrollment end = NULL → "22991231" |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — enrollment must exist)
- TC-010: Open-Ended Suspension (prerequisite — must have open-ended suspension in MMIS)
- TC-002: Enrolled → Suspended with end date (similar result — 3 spans — but created all at once)
- TC-012: Suspension Deleted (another suspension modification scenario)
- S230_006: This test case (suspension end date NULL → valid)
