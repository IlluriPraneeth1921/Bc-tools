# TC-012: Suspension Deleted (S230_005)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-012 |
| Scenario | Suspension Deleted (S230_005) |
| Test Participant MA ID | **1430000013** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 4) → S200 → S230 (Condition 5) → S410 + S470 |
| Business Rules | BR-D01-001, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User deletes an existing IRIS suspension record |
| Transaction Count | 2 MMIS transactions |
| Transaction Ordering | S410 first (delete Span-B), then S470 (extend Span-A to fill gap) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant has active enrollment with an existing suspension that was previously synced successfully
2. MMIS currently has 3 spans: Span-A (active), Span-B (suspended), Span-C (active post-suspension)
3. User deletes the suspension record from Blue Compass
4. Active ICA assignment exists with valid Medicaid Provider ID
5. Active FEA assignment exists with valid dates
6. Prior sync was successful (ResponseStatusCode = "SU") with all 3 spans in MMIS
7. **Key constraint:** After deletion, Span-A must be extended to cover the gap left by deleted Span-B. Span-C remains unchanged.

---

## Database Setup (Pre-Execution State)

> **Prerequisite: TC-002 must have been executed successfully first.** This test requires that the participant already has an active IRIS enrollment with a previously synced suspension (3 MMIS spans: Span-A active, Span-B suspended, Span-C active).

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
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001/TC-002 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended enrollment |
| `StatusDisplayName` | "Enrolled" | Must be enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from TC-002 execution |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync (TC-002 completed) |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior Open transaction (last was Span-C open) |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | Span-C begin date (e.g., 2026-08-11) | From TC-002 last transaction |
| `MmisEndDate` | 2299-12-31 | From TC-002 last transaction |

### 12. Existing Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

This record EXISTS (from TC-002) and is being DELETED by the user (the triggering event).

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {existing GUID} | PK — from TC-002 |
| `Version` | 1 | From TC-002 |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | Existing BC Suspension Start Date |
| `DateRangeEndDate` | **2026-08-10** | Existing BC Suspension End Date |
| `ReasonDisplayName` | e.g., "Participant Requested" | Suspension reason |

### 13. Existing MMIS Spans (from TC-002 prior sync)

| Span | Status | MMIS Begin | MMIS End | Notes |
|------|--------|-----------|---------|-------|
| Span-A | Active (A) | 2026-07-01 | 2026-07-10 | Pre-suspension active span |
| Span-B | Suspended (S) | 2026-07-11 | 2026-08-09 | Suspension span (start+1, end-1 offsets) |
| Span-C | Active (A) | 2026-08-10 | 2299-12-31 | Post-suspension active span |

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
-- Verify enrollment is active and synced with suspension
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0

-- Verify existing suspension record
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: DateRangeStartDate='2026-07-10', DateRangeEndDate='2026-08-10'

-- Verify prior sync transactions (3 from TC-002)
SELECT COUNT(*) FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
-- Expected: 3+ (TC-001 initial + TC-002 three transactions)
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 4 (Existing IRIS suspension table entry deleted):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #5: Call S230_Suspense_Modify_Delete
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - With suspension deleted, recalculate: single continuous active span from enrollment begin to enrollment end (or 22991231)
3. **S230** — Condition 5 (Suspension record deleted):
   - Action #1: Call S410 (Delete Span-B — the suspended span)
   - Action #2: Call S470 (Extend Span-A end date to Span-C begin - 1)
4. **S410** — (Delete Suspense Span-B):
   - TransactionType = "O", Status = "I" (delete the suspended span)
   - DateEnrlEff/DateEnrlEnd must EXACTLY match existing Span-B in MMIS
5. **S470** — (Update Span-A end date to later — fill gap):
   - TransactionType = "O", Status = "A" (extend active span)
   - DateEnrlEff = Span-A begin (anchor), DateEnrlEnd = Span-C begin - 1

---

## Request Payload Verification

### Transaction 1: Delete Suspension Span (S410 — Delete Span-B)

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

#### Waiver Enrollment Node (Transaction 1 — S410)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — Status "I" uses TransactionType "O" |
| DateEnrlEff | DateEnrlEff | **"20260711"** | Existing Span-B begin (EXACT MATCH required for delete) |
| DateEnrlEnd | DateEnrlEnd | **"20260809"** | Existing Span-B end (EXACT MATCH required for delete) |
| Status | Status | **"I" (Inactive)** | Per BR-D01-020 — delete uses Status "I" |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2L"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | **"2W" (Reason Not Provided in Source System)** | Per BR-D01-022 |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260711") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 1 — S410)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260711" | Matches DateEnrlEff (Span-B begin) |
| FEAEndDate | FEAEndDate | "20260809" | Matches DateEnrlEnd (Span-B end) |
| FEAStatus | FEAStatus | **"I" (Inactive)** | Matches span status for delete |

---

### Transaction 2: Extend Span-A End Date (S470 — Fill Gap)

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

#### Waiver Enrollment Node (Transaction 2 — S470)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — extending end date to later uses "O" |
| DateEnrlEff | DateEnrlEff | **"20260701"** | Span-A begin (ANCHOR — existing MMIS begin) |
| DateEnrlEnd | DateEnrlEnd | **"20260809"** | Span-C begin - 1 day (2026-08-10 - 1 = 2026-08-09) |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — extending active span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **"2Q"** | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | May be null or "2W" |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260701") | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2) |

#### FEA Node (Transaction 2 — S470)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | "20260701" | Matches DateEnrlEff (Span-A begin) |
| FEAEndDate | FEAEndDate | "20260809" | Matches DateEnrlEnd (Span-C begin - 1) |
| FEAStatus | FEAStatus | **"A" (Active)** | Matches span status |

---

## Expected MMIS Response

| Transaction | ResponseStatus | EffectiveDate | EndDate |
|-------------|---------------|---------------|---------|
| Transaction 1 (S410 — Delete Span-B) | "SU" | 20260711 (Span-B begin) | 20260809 (Span-B end) |
| Transaction 2 (S470 — Extend Span-A) | "SU" | 20260701 (Span-A begin) | 20260809 (Span-C begin - 1) |

### Multi-Transaction Response Handling

| Transaction | Decision Table Step | Expected ResponseStatus | Key Verification |
|-------------|--------------------|-----------------------|------------------|
| Txn 1 | S410 | "SU" | Span-B deleted — dates match exactly |
| Txn 2 | S470 | "SU" | Span-A extended to fill gap left by deleted Span-B |

> **Note:** After both transactions succeed, MMIS has 2 spans: Span-A (extended: 2026-07-01 to 2026-08-09) and Span-C (unchanged: 2026-08-10 to 2299-12-31). The suspended Span-B is removed.

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
| `TransactionTypeCode` | "O" | Last transaction type (S470 extend) |
| `TxnRefId` | {Txn 2 ref ID} | From last transaction |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (Span-A begin — anchor) | From last transaction (S470) |
| `MmisEndDate` | 2026-08-09 (Span-C begin - 1) | From last transaction (extended Span-A end) |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "SuspensionDeleted" (or equivalent) | Type of change |
| `LastSuspensionChangeTypeCode` | "Deleted" (or equivalent) | Suspension-specific change type |
| `PreUpdateBeginDate` | Prior MmisEffectiveDate | From before this update |
| `PreUpdateEndDate` | Prior MmisEndDate | From before this update |
| `PreUpdateSuspensionStartDate` | 2026-07-10 | Suspension start BEFORE deletion |
| `PreUpdateSuspensionEndDate` | 2026-08-10 | Suspension end BEFORE deletion |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp
```

Expected: **2 new rows** (in addition to prior TC-002 sync rows)

**Row 1 — S410 (Delete Span-B):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-11 (Span-B begin — exact match) |
| `MmisEndDate` | 2026-08-09 (Span-B end — exact match) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "SuspensionDeleted" (or equivalent) |
| `SuspensionChangeTypeCode` | "Deleted" (or equivalent) |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {first transaction ref ID} |

**Row 2 — S470 (Extend Span-A):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 (Span-A begin — anchor) |
| `MmisEndDate` | 2026-08-09 (Span-C begin - 1 — extended end) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "SuspensionDeleted" (or equivalent) |
| `SuspensionChangeTypeCode` | "Deleted" (or equivalent) |
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

### 4. `ProgramEnrollmentModule.ProgramEnrollmentSuspension` — DELETED

```sql
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

Expected: **0 rows** — suspension record deleted by user action

### 5. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Enrollment status unchanged — suspension removed |

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
| Suspension record | Removed from UI (no suspension displayed) |
| Enrollment Status | "Enrolled" |
| Transaction Count | 2 new transactions recorded |

---

## Failure Criteria

### Response Validation Failures
- Either transaction returns ResponseStatus ≠ "SU" → HasConflict = true
- Partial failure: S410 succeeds but S470 fails → inconsistent MMIS state (Span-B deleted but Span-A not extended)

### Data Integrity Failures
- HasConflict set to 1 when both responses were SU
- SyncTransaction row count ≠ 2 new rows
- ProgramEnrollmentSuspension row still exists after deletion
- PreUpdateSuspensionStartDate/EndDate not captured

### Payload Construction Failures
- Transaction 1: Status ≠ "I" → BR-D01-020 violated (delete must use Inactive)
- Transaction 1: TransactionType ≠ "O" → BR-D01-021 violated (Status I requires TransactionType O)
- Transaction 1: DateEnrlEff/DateEnrlEnd ≠ existing Span-B dates → exact match required for delete
- Transaction 2: TransactionType ≠ "O" → extending end date uses Open
- Transaction 2: DateEnrlEff ≠ Span-A begin (anchor)
- Transaction 2: DateEnrlEnd ≠ Span-C begin - 1 → gap not properly filled
- Transaction 2: Status ≠ "A" → active span must use Active

### Transaction Ordering Failures
- Transactions sent in wrong order (must be S410 → S470)
- MMIS may reject S470 if Span-B still exists (overlapping spans)

### Audit Trail Failures
- RequestJsonTextFile is NULL in either SyncTransaction row
- TxnRefId not incrementing correctly between transactions

### UI State Failures
- Conflict chip displayed when not expected
- Suspension record still visible after deletion
- Sync timestamp not updated

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
| **DateEnrlEff** (Txn 1 / S410) | Existing Span-B begin date from prior sync (EXACT MATCH) |
| **DateEnrlEnd** (Txn 1 / S410) | Existing Span-B end date from prior sync (EXACT MATCH) |
| **DateEnrlEff** (Txn 2 / S470) | Span-A begin date (ANCHOR — existing MMIS begin from initial enrollment) |
| **DateEnrlEnd** (Txn 2 / S470) | Span-C begin date - 1 day (fill gap left by deleted Span-B) |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — enrollment must exist)
- TC-002: Enrolled → Suspended with end date (prerequisite — suspension must exist with 3 spans)
- TC-010: Open-Ended Suspension (alternative suspension scenario)
- TC-013: Suspension End Date Changed from Null to Valid (another suspension modification)
- S230_005: This test case (suspension deletion)
