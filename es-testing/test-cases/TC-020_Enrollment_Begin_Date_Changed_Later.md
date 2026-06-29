# TC-020: Enrollment Begin Date Changed to Later Date

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-020 |
| Scenario | Enrollment Begin Date Changed to Later Date — Delete + Recreate Span |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 2) → S200 → S220 (Condition 3) → S310 + S300 |
| Business Rules | BR-D01-001, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User changes enrollment begin date to a later date |
| Transaction Count | 2 MMIS transactions (Delete existing span + Create new span with later begin) |
| Transaction Ordering | S310 (delete) must precede S300 (create) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists: begin date = 2026-07-01, end date = 22991231
3. User changes enrollment begin date from 2026-07-01 to **2026-07-15** (later)
4. Active ICA assignment exists with valid Medicaid Provider ID spanning new enrollment period
5. Active FEA assignment exists with valid dates spanning new enrollment period
6. No existing suspensions for this enrollment
7. **Key mechanism:** S310 requires EXACT date match on existing span (DateEnrlEff/DateEnrlEnd must match what MMIS currently has). S300 then creates brand new span with new later begin date.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-001 must have been executed successfully first.** This test requires that the participant already has an active IRIS enrollment in MMIS with a successful sync.

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
| Status | Active | Must be active ISP |

### 10. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | **2026-07-15** (changed from 2026-07-01) | User changed begin to later date |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended enrollment |
| `StatusDisplayName` | "Enrolled" | Must be enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-001 execution |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync (TC-001 completed) |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-07-01 | From TC-001 (original begin) |
| `MmisEndDate` | 2299-12-31 | From TC-001 (open-ended) |

### 12. Existing MMIS Spans (from TC-001 prior sync)

| Span | Status | MMIS Begin | MMIS End | Notes |
|------|--------|-----------|---------|-------|
| Single Span | Active (A) | 2026-07-01 | 2299-12-31 | Single active enrollment span |

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
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0
-- MmisEffectiveDate='2026-07-01', MmisEndDate='2299-12-31'

-- Verify no suspensions exist
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 2 (Existing IRIS enrollment begin date changed):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Begin_Date_Changed
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Recalculate: single span from new begin (2026-07-15) to end (22991231)
3. **S220** — Condition 3 (Begin date changed to LATER):
   - Action #1: Call S310 (Delete existing span — exact match required)
   - Action #2: Call S300 (Create new span with later begin)
4. **S310** — (Delete existing span):
   - TransactionType = "O", Status = "I" (delete)
   - DateEnrlEff = 20260701, DateEnrlEnd = 22991231 (EXACT match of existing MMIS span)
5. **S300** — (Create new enrollment span):
   - TransactionType = "O", Status = "A" (new active span)
   - DateEnrlEff = 20260715 (new later begin), DateEnrlEnd = 22991231

---

## Request Payload Verification

### Transaction 1: Delete Existing Span (S310 — Delete)

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
| IdUniqueClient | IdUniqueClient | "1430000012" | CHAR(10) |
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

#### Waiver Enrollment Node (Transaction 1 — S310)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — Status "I" uses TransactionType "O" |
| DateEnrlEff | DateEnrlEff | **"20260701"** | Existing span begin (EXACT MATCH required for delete) |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | Existing span end (EXACT MATCH required for delete) |
| Status | Status | **"I" (Inactive)** | Per BR-D01-020 — delete uses Status "I" |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2L"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2B" (Begin Date Changed)** | Per BR-D01-022 |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260701") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 1 — S310)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260701" | Matches DateEnrlEff (existing begin) |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd (existing end) |
| FEAStatus | FEAStatus | **"I" (Inactive)** | Matches span status for delete |

---

### Transaction 2: Create New Span with Later Begin (S300 — Create)

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
| IdUniqueClient | IdUniqueClient | "1430000012" | CHAR(10) |
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

#### Waiver Enrollment Node (Transaction 2 — S300)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — new span uses Open |
| DateEnrlEff | DateEnrlEff | **"20260715"** | New later begin date |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | Open-ended enrollment |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — active enrollment span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2L"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End = 22991231, no stop reason needed |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260715") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 2 — S300)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260715" | Matches DateEnrlEff (new begin) |
| FEAEndDate | FEAEndDate | "22991231" | Matches DateEnrlEnd (open-ended) |
| FEAStatus | FEAStatus | **"A" (Active)** | Matches span status |

---

## Expected MMIS Response

| Transaction | ResponseStatus | EffectiveDate | EndDate |
|-------------|---------------|---------------|---------|
| Transaction 1 (S310 — Delete) | "SU" | 20260701 (existing begin) | 22991231 (existing end) |
| Transaction 2 (S300 — Create) | "SU" | 20260715 (new later begin) | 22991231 (open-ended) |

### Multi-Transaction Response Handling

| Transaction | Decision Table Step | Expected ResponseStatus | Key Verification |
|-------------|--------------------|-----------------------|------------------|
| Txn 1 | S310 | "SU" | Existing span deleted — dates match exactly |
| Txn 2 | S300 | "SU" | New span created with later begin date |

> **Note:** After both transactions succeed, MMIS has 1 span: Active from 2026-07-15 to 2299-12-31. The original span starting 2026-07-01 is gone.

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
| `TransactionTypeCode` | "O" | Last transaction type (S300 create) |
| `TxnRefId` | {Txn 2 ref ID} | From last transaction |
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | What was sent |
| `MmisEffectiveDate` | 2026-07-15 (new later begin) | From last transaction (S300) |
| `MmisEndDate` | 2299-12-31 | From last transaction (open-ended) |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "BeginDateChanged" (or equivalent) | Type of change |
| `PreUpdateBeginDate` | 2026-07-01 (prior begin) | From before this update |
| `PreUpdateEndDate` | 2299-12-31 (prior end) | From before this update |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp
```

Expected: **2 new rows** (in addition to prior TC-001 sync rows)

**Row 1 — S310 (Delete existing span):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 (existing begin — exact match) |
| `MmisEndDate` | 2299-12-31 (existing end — exact match) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000012" |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "BeginDateChanged" (or equivalent) |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {first transaction ref ID} |

**Row 2 — S300 (Create new span):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-15 (new later begin) |
| `MmisEndDate` | 2299-12-31 (open-ended) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000012" |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "BeginDateChanged" (or equivalent) |
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

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeStartDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Enrollment status unchanged |
| `EnrollmentDateRangeStartDate` | 2026-07-15 | New later begin date |

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
| Enrollment Begin Date | 07/15/2026 (new later date) |
| Enrollment Status | "Enrolled" |
| Transaction Count | 2 new transactions recorded |

---

## Failure Criteria

### Response Validation Failures
- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true
- Partial failure: S310 succeeds but S300 fails → span deleted but not recreated (no MMIS coverage)

### Data Integrity Failures
- HasConflict set to 1 when both responses were SU
- SyncTransaction row count ≠ 2 new rows
- MmisEffectiveDate not updated to 2026-07-15

### Payload Construction Failures
- Transaction 1: Status ≠ "I" → BR-D01-020 violated (delete must use Inactive)
- Transaction 1: TransactionType ≠ "O" → BR-D01-021 violated (Status I requires TransactionType O)
- Transaction 1: DateEnrlEff ≠ "20260701" or DateEnrlEnd ≠ "22991231" → exact match required for delete
- Transaction 1: StopReasonCode ≠ "2B" → must indicate Begin Date Changed
- Transaction 2: TransactionType ≠ "O" → new span must use Open
- Transaction 2: DateEnrlEff ≠ "20260715" → must use new later begin date
- Transaction 2: Status ≠ "A" → active span must use Active

### Transaction Ordering Failures
- Transactions sent in wrong order (must be S310 → S300)
- MMIS may reject S300 if existing span still active (duplicate coverage)

### Audit Trail Failures
- RequestJsonTextFile is NULL in either SyncTransaction row
- TxnRefId not incrementing correctly between transactions

### UI State Failures
- Conflict chip displayed when not expected
- Enrollment begin date not reflecting new value (07/15/2026)
- Sync timestamp not updated

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
| **WaiverAgencyID** (both txns) | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** (both txns) | Same path but Type = 'FEA' |
| **DateEnrlEff** (Txn 1 / S310) | Existing MMIS span begin date (EXACT MATCH — 2026-07-01) |
| **DateEnrlEnd** (Txn 1 / S310) | Existing MMIS span end date (EXACT MATCH — 2299-12-31) |
| **DateEnrlEff** (Txn 2 / S300) | `ProgramEnrollment.EnrollmentDateRangeStartDate` (new value — 2026-07-15) |
| **DateEnrlEnd** (Txn 2 / S300) | Enrollment end date = NULL → "22991231" |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (active ISP) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — enrollment must exist)
- TC-019: Enrollment Begin Date Changed to Earlier Date (mirror scenario — same decision table path S220 but Condition 2)
- TC-006: Enrollment End Date Changed Earlier (similar delete + recreate pattern for end date)
- TC-007: Enrollment End Date Changed Later (end date modification scenario)
