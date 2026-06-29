# TC-028: Enrollment End Date Changed to Later When Last Span is Suspension (S350 → S360)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-028 |
| Scenario | Enrollment End Date Changed to Later When Last Span is Suspension |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 2) → S200 → S220 (Condition 5) → S350 (Condition 1) → S360 |
| Business Rules | BR-D01-001, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User extends enrollment end date when the most current MMIS span is a suspended span |
| Transaction Count | 1 MMIS transaction (S360 — create enrollment span AFTER suspension) |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with an existing bounded suspension
2. MMIS has 2 spans: Span-A (active, closed) and Span-B (suspended, end = enrollment end)
3. The most current MMIS span within enrollment dates is a SUSPENSION (Span-B)
4. No Span-C exists (suspension end = enrollment end, so no post-suspension active span was created)
5. User extends enrollment end date to a later value (e.g., 2026-12-31)
6. S350 Condition 1 detects: "Most current MMIS span within BC Enrollment dates is a suspension"
7. S360 creates a NEW active span AFTER the suspension
8. Active ICA assignment exists with valid Medicaid Provider ID spanning extended period
9. Active FEA assignment exists spanning extended enrollment period

---

## Database Setup (Pre-Execution State)

> **Prerequisite Setup:** This test requires a specific state where enrollment end date equals suspension end date, so no Span-C was created. The participant has Span-A (active 07/01 - 07/10) and Span-B (suspended 07/11 - 09/29), with enrollment end = 09/30. The last MMIS span is the suspension. User then extends enrollment end date from 09/30 to 12/31.

The following Carity database tables and columns must be in the specified state before test execution.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | e.g., "TESTLAST" | Maps to NameLast (first 20 chars) |
| `NameFirstName` | e.g., "TESTFIRST" | Maps to NameFirst (first 15 chars) |
| `NameMiddleName` | e.g., "M" | Optional, maps to NameMi |
| `NameSuffixName` | e.g., "JR" | Optional |
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
| `PhysicalAddressFirstStreetAddress` | e.g., "123 MAIN ST" | Maps to Address2 (required) |
| `PhysicalAddressCityName` | e.g., "MADISON" | Maps to City |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Translated to 2-char MMIS code |
| `PhysicalAddressPostalCode` | e.g., "537011234" | First 5 → ZipCode, chars 6-9 → ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Translated to 2-digit MMIS county code |

### 5. Mailing Address — `PersonModule.PersonAddress` (second row)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `AddressTypeDisplayName` | "Mailing" | Additional Address Node type "IM" |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing preferred |
| `PhysicalAddressFirstStreetAddress` | e.g., "PO BOX 456" | Maps to AdditionalAddress2 |
| `PhysicalAddressCityName` | e.g., "MADISON" | Maps to AdditionalCity |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Maps to AdditionalState |
| `PhysicalAddressPostalCode` | e.g., "537011234" | Maps to AdditionalZipCode/ZipCode4 |

### 6. Phone Numbers — `PersonModule.PersonPhones`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | e.g., "6085551234" | 10-digit → NumPhone |
| `TypeDisplayName` | "Home" | Translated to H → IndPhone |
| `IsPrimary` | true | Primary phone |

### 7. ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {ICA Location GUID} | FK → Medicaid Provider ID lookup |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Must be active |
| `EffectiveDateRangeEndDate` | NULL or after new extended end date (2026-12-31) | Must span extended enrollment |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "1234567890" | → WaiverAgencyID in request |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → Medicaid Provider ID lookup |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | Must span enrollment |
| `EffectiveDateRangeEndDate` | NULL or >= new extended end date (2026-12-31) | Must span extended enrollment |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID} | FK to Location |
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
| `EnrollmentDateRangeStartDate` | **2026-07-01** | Enrollment begin (ANCHOR) |
| `EnrollmentDateRangeEndDate` | **Being changed from 2026-09-30 → 2026-12-31** | User extends end date |
| `StatusDisplayName` | "Enrolled" | Status returns to Enrolled |
| `IsPrimary` | true | |

### 11. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — from prior sync |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior successful sync |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "O" | Prior transaction type |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-07-11 (Span-B begin — last synced span) | From prior suspension sync |
| `MmisEndDate` | 2026-09-29 (Span-B end) | Suspension is the LAST span in MMIS |

### 12. Existing Suspension Record — `ProgramEnrollmentModule.ProgramEnrollmentSuspension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentSuspensionKey` | {existing GUID} | PK |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `DateRangeStartDate` | **2026-07-10** | BC Suspension Start Date |
| `DateRangeEndDate` | **2026-09-30** | BC Suspension End Date = enrollment end date |

### 13. Existing MMIS Spans (prior sync state)

| Span | Status | MMIS Begin (DateEnrlEff) | MMIS End (DateEnrlEnd) | Notes |
|------|--------|--------------------------|------------------------|-------|
| Span-A | Active (A) | 2026-07-01 | 2026-07-10 | Pre-suspension active span (closed) |
| Span-B | Suspended (S) | 2026-07-11 | 2026-09-29 | Suspension span — THIS IS THE LAST SPAN |

> **⚠️ KEY STATE:** No Span-C exists because suspension end (09/30) = enrollment end (09/30). When enrollment end equals suspension end, no post-suspension active span is created. The LAST MMIS span is the suspension (Span-B).

### 14. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | → WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter |
| `IsPrimary` | true or first active | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 15. Pre-Execution Verification Query

```sql
-- Verify enrollment has specific end date and last span is suspension
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeEndDate,
       pee.ResponseStatusCode, pee.HasConflict, pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: EnrollmentDateRangeEndDate='2026-09-30', MmisEffectiveDate='2026-07-11' (Span-B begin)
--           Last synced span is the SUSPENSION

-- Verify suspension exists with end = enrollment end
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: DateRangeStartDate='2026-07-10', DateRangeEndDate='2026-09-30'
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 2 (Existing IRIS enrollment updated — end date changed):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Recalculates spans with new extended end date (2026-12-31). Produces: Span-A (active 07/01-07/10), Span-B (suspended 07/11-09/29), Span-C (active 09/30-12/31)
3. **S220** — Condition 5 (End date moved to later date):
   - Action: Call S350 to extend/create spans
4. **S350** — Condition 1 (Most current MMIS span within BC enrollment dates is a SUSPENSION):
   - Detects that the last synced MMIS span is Span-B (suspended)
   - Action: Call **S360** to create new enrollment span AFTER the suspension
5. **S360** — (Create post-suspension active span):
   - Creates a NEW active span from suspension end date to new enrollment end date
   - TransactionType = "O", Status = "A"
   - DateEnrlEff = BC suspension end date (participant active on this date)
   - DateEnrlEnd = new enrollment end date (2026-12-31)

---

## Request Payload Verification

### Transaction 1: Create Post-Suspension Active Span (S360 — New Span-C)

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

#### Waiver Enrollment Node (S360 — Create Post-Suspension Span)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | CHAR(10), always "IRIS" |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | CHAR(25), from active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — creating new span uses "O" |
| DateEnrlEff | DateEnrlEff | **"20260930"** | BC suspension end date (participant active on this date) |
| DateEnrlEnd | DateEnrlEnd | **"20261231"** | New enrollment end date |
| Status | Status | **"A" (Active)** | Per BR-D01-020 — active post-suspension span |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8), format: {Initial}.{LastName} truncated |
| StartReasonCode | StartReasonCode | **"2Q" (Enrollment from Suspension)** | Per BR-D01-022 — specifically for post-suspension enrollment |
| StopReasonCode | StopReasonCode | Per disenrollment code or Not Required | CHAR(2) |
| RecertificationDueDate | RecertificationDueDate | ISP end date in CCYYMMDD | NUM(8) |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff ("20260930") | NUM(8) |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2), default '00' if not found |

#### FEA Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | **"20260930"** | Matches DateEnrlEff (suspension end) |
| FEAEndDate | FEAEndDate | **"20261231"** | Matches DateEnrlEnd (new enrollment end) |
| FEAStatus | FEAStatus | "A" (Active) | CHAR(1) |

> **⚠️ KEY S360 Logic:**
> - This creates a BRAND NEW span (not extending an existing one)
> - TransactionType = "O" (Open) — same as creating a new enrollment span
> - DateEnrlEff = BC suspension end date (the day the participant becomes active again)
> - StartReasonCode = "2Q" (Enrollment from Suspension) — distinguishes from regular new enrollment "2L"
> - S360 is ONLY called when S350 Condition 1 detects the last MMIS span is a suspension

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | New post-suspension span created per BR-D01-010 |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed — Open (new span) |
| EffectiveDate | "20260930" (suspension end — new span begin) | Echoed |
| EndDate | "20261231" (new enrollment end) | Echoed |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000012" | No ID swap expected |
| SubmittedClientID | "1430000012" | Echoed |
| Error Segment | Not present | No errors expected |

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
| `TransactionTypeCode` | "O" | Open transaction (new span created) |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | What was sent |
| `MmisEffectiveDate` | 2026-09-30 (suspension end — new Span-C begin) | From response EffectiveDate |
| `MmisEndDate` | 2026-12-31 (new enrollment end) | From response EndDate |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "EndDateExtension" (or equivalent) | Type of change |
| `LastSuspensionChangeTypeCode` | NULL | No suspension change (suspension still exists) |
| `PreUpdateBeginDate` | 2026-07-11 (prior MmisEffectiveDate — was Span-B) | MMIS effective date BEFORE this update |
| `PreUpdateEndDate` | 2026-09-29 (prior MmisEndDate — was Span-B end) | MMIS end date BEFORE this update |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
```

Expected: **1 new row** (in addition to prior sync rows)

**New Row — S360 (Create Post-Suspension Active Span):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-09-30 (suspension end — new span begin) |
| `MmisEndDate` | 2026-12-31 (new enrollment end) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000012" |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — verify StartReasonCode="2Q" |
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

Expected: **No rows** — successful transaction, no error messages

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Re-enrolled with extended end date |
| `EnrollmentDateRangeStartDate` | 2026-07-01 | Unchanged |
| `EnrollmentDateRangeEndDate` | 2026-12-31 | New extended end date |

### 5. `ProgramEnrollmentModule.ProgramEnrollmentSuspension` (unchanged)

```sql
SELECT DateRangeStartDate, DateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `DateRangeStartDate` | 2026-07-10 | Suspension still exists (unchanged) |
| `DateRangeEndDate` | 2026-09-30 | Suspension end date (unchanged) |

### 6. `PersonModule.PersonMedicaidNumbers` (no change expected)

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
| Enrollment End Date | Displays 12/31/2026 (new extended date) |
| Enrollment Status | "Enrolled" |
| Suspension Start Date | 07/10/2026 (still displayed) |
| Suspension End Date | 09/30/2026 (still displayed) |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → post-suspension span not created in MMIS
- Enrollment not activated despite SU or SE response → BR-D01-010 violated

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- MmisEffectiveDate not set to suspension end date (2026-09-30)
- MmisEndDate not set to new enrollment end date (2026-12-31)
- TransactionTypeCode not "O" (should be Open for new span creation)

### Payload Construction Failures
- TransactionType ≠ "O" → must be Open for creating new span (S360)
- DateEnrlEff ≠ BC suspension end date (2026-09-30) → wrong span start
- DateEnrlEnd ≠ new enrollment end date (2026-12-31) → wrong span end
- StartReasonCode ≠ "2Q" → must be "Enrollment from Suspension" (not "2L" for new enrollment)
- Status ≠ "A" → post-suspension span must be Active
- S350 incorrectly routes to Condition 2 (extends existing span) instead of Condition 1 (creates new span)
- System attempts to EXTEND Span-B (suspended) instead of creating new Span-C
- FEA dates not matching the new span dates (09/30 to 12/31)

### Logic Failures
- System extends the suspended span instead of creating a new active span after it
- S350 Condition 1 not triggered when last MMIS span is a suspension
- S360 not called — system uses S350 Condition 2 logic (extend existing) instead

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction row not created for this transaction
- StartReasonCode not "2Q" in stored payload

### UI State Failures
- Conflict chip displayed when not expected
- Enrollment end date not reflecting extended value
- Suspension dates modified (should remain unchanged)

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
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` → `Value` |
| **DateEnrlEff** | `ProgramEnrollmentSuspension.DateRangeEndDate` (BC suspension end — participant active on this date) |
| **DateEnrlEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` (new extended end date) |
| **StartReasonCode** | Fixed: **"2Q"** (Enrollment from Suspension) — per BR-D01-022 for S360 |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **FEAEffectiveDate** | Same as DateEnrlEff (BC suspension end = 2026-09-30) |
| **FEAEndDate** | Same as DateEnrlEnd (new enrollment end = 2026-12-31) |

---

## Related Test Cases

- TC-007: Enrollment End Date Later — S350 Condition 2 (no suspension — simple extend)
- TC-010: Open-Ended Suspension (creates the initial suspended state without Span-C)
- TC-013: Suspension End Date Null to Valid (sets suspension end — may create Span-C via different path)
- TC-006: Enrollment End Date Earlier (opposite direction — disenrollment)
