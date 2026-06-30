# TC-009: Enrollment Status Changed — Disenrolled to Enrolled (Reinstatement)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-009 |
| Scenario | Enrollment Status Changed — Disenrolled to Enrolled (Reinstatement) |
| Test Participant MA ID | **1430000013** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 2) → S200 → S220 (Condition 7) → S300 |
| Business Rules | BR-D01-001, BR-D01-010, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User changes enrollment status from "Disenrolled" to "Enrolled" |
| Transaction Count | 1 MMIS transaction (new enrollment span — same as TC-001 flow via S300) |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant was previously disenrolled — the Disenrolled span exists only in BC
2. MMIS has NO active span for this participant in this enrollment period (prior enrollment was closed)
3. No ProgramEnrollmentExtension with active SU for the current period
4. User reinstates by changing status back to "Enrolled"
5. Active ICA assignment exists with valid Medicaid Provider ID
6. Active FEA assignment exists with valid dates spanning the new enrollment period
7. No active suspensions
8. **Key point:** No Span-B identification needed — S300 creates a brand new enrollment span

---

## Database Setup (Pre-Execution State)

> **Prerequisite: Participant must have been previously disenrolled (e.g., TC-006 executed or equivalent state).** The enrollment record exists with StatusDisplayName previously = "Disenrolled", now being changed to "Enrolled". MMIS has no active span — the prior enrollment was closed/deleted.

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
| `Value` | e.g., "1234567890" | → WaiverAgencyID in request |

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
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — the disenrolled enrollment being reinstated |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Original enrollment begin date — becomes new span begin |
| `EnrollmentDateRangeEndDate` | **Being changed: was specific date → NULL (open-ended)** | Reinstatement opens the enrollment back up |
| `StatusDisplayName` | **Being changed from "Disenrolled" → "Enrolled"** | Triggering event — reinstatement |
| `StatusReasonDisplayName` | NULL | No reason needed for reinstatement |
| `IsPrimary` | true | |

### 11. Prior Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {existing GUID or NULL} | May exist from prior disenrollment sync |
| `ProgramEnrollmentKey` | {existing enrollment GUID} | FK to enrollment |
| `ResponseStatusCode` | "SU" | Prior closure was successful |
| `HasConflict` | 0 (false) | No outstanding conflicts |
| `TransactionTypeCode` | "C" | Prior transaction was Closure (disenrollment) |
| `LastSynchronizedTimestamp` | Valid datetime2 | Prior sync timestamp |
| `MmisEffectiveDate` | 2026-07-01 | From prior response |
| `MmisEndDate` | Prior end date (e.g., 2026-09-30) | From prior closure — span was shortened |

> **Note:** The prior sync state shows the enrollment was closed. The reinstatement creates a NEW span opening at the original begin date with end = 12/31/2299. This is functionally similar to TC-001 but triggered by a status change rather than a new enrollment record.

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
-- Verify enrollment is currently Disenrolled with prior successful sync
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeStartDate, pe.EnrollmentDateRangeEndDate,
       pee.ResponseStatusCode, pee.HasConflict, pee.TransactionTypeCode, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
LEFT JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Disenrolled', TransactionTypeCode='C' (prior closure)

-- Verify no active suspensions
SELECT COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 2 (Existing IRIS enrollment updated — status changed):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Enrollment begin → end (NULL → 22991231) with Status A — brand new span needed
3. **S220** — Condition 7 (Status changed from Disenrolled to Enrolled — reinstatement):
   - Action: Call S300 to create a brand new enrollment span
4. **S300** — Column 1 (IRIS):
   - Constructs new enrollment request: TransactionType = "O", Status = "A"
   - DateEnrlEff = Disenrolled span's begin date, DateEnrlEnd = 12/31/2299 (open-ended)
   - This is functionally identical to TC-001 flow but triggered by status change

---

## Request Payload Verification

### Transaction 1: New Enrollment Span (S300 — Reinstatement)

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
| IdUniqueClient | IdUniqueClient | "1430000013" | CHAR(10), from PersonMedicaidNumbers.Value |
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
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | CHAR(25), from active ICA assignment at enrollment begin |
| TransactionType | TransactionType | **"O" (Open)** | New span per BR-D01-021 |
| DateEnrlEff | DateEnrlEff | **Enrollment begin date** e.g., "20260701" | NUM(8), original enrollment begin = new span begin |
| DateEnrlEnd | DateEnrlEnd | **"22991231"** | NUM(8), open-ended (NULL enrollment end) |
| Status | Status | **"A" (Active)** | Per BR-D01-020 |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8), format: {Initial}.{LastName} truncated |
| StartReasonCode | StartReasonCode | **"2L" (New Enrollment)** | CHAR(2), per BR-D01-022 |
| StopReasonCode | StopReasonCode | **Not Required** | End date is 22991231 — no stop reason needed |
| RecertificationDueDate | RecertificationDueDate | ISP end date in CCYYMMDD | NUM(8) |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff | NUM(8) |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code | CHAR(2), default '00' if not found |

#### FEA Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | Enrollment begin date | NUM(8), matches DateEnrlEff |
| FEAEndDate | FEAEndDate | 22991231 (FEA end, NULL → high date) | NUM(8), must span enrollment period |
| FEAStatus | FEAStatus | "A" (Active) | CHAR(1) |

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | New enrollment span created per BR-D01-010 |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed — Open (new span) |
| EffectiveDate | Same as DateEnrlEff sent (e.g., "20260701") | Echoed |
| EndDate | "22991231" | Echoed — open-ended |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000013" | No ID swap expected |
| SubmittedClientID | "1430000013" | Echoed |
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
| `ProgramEnrollmentExtensionKey` | {GUID — may be updated or new} | PK |
| `HasConflict` | 0 (false) | No conflict for successful enrollment |
| `ResponseStatusCode` | "SU" | Success |
| `TransactionTypeCode` | "O" | Open transaction (new span) |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) | From response EffectiveDate |
| `MmisEndDate` | 2299-12-31 | From response EndDate (open-ended) |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "Reinstatement" (or equivalent code) | Type of change |
| `LastSuspensionChangeTypeCode` | NULL | No suspension involvement |
| `PreUpdateBeginDate` | 2026-07-01 | Enrollment begin date BEFORE this update |
| `PreUpdateEndDate` | Prior end date (e.g., 2026-09-30) | End date BEFORE reinstatement (was closed) |
| `PreUpdateSuspensionStartDate` | NULL | No suspension |
| `PreUpdateSuspensionEndDate` | NULL | No suspension |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
```

Expected: **1 new row** (in addition to prior disenrollment sync row)

**New Row — S300 (New Span — Reinstatement):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) |
| `MmisEndDate` | 2299-12-31 (open-ended) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "Reinstatement" (or equivalent) |
| `SuspensionChangeTypeCode` | NULL |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {captured at runtime} |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — successful enrollment, no error messages

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Span made active per BR-D01-010 (response = SU) |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended after reinstatement |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

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
| Enrollment Status | "Enrolled" |
| Enrollment End Date | Open-Ended / Not displayed |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → enrollment not properly reinstated in MMIS
- MMIS rejects because overlapping span exists (prior closure not properly processed)
- Enrollment activated despite FL response → BR-D01-010 violated

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- PreUpdateEndDate not captured (prior closed end date)
- MmisEndDate not set to 22991231 (should be open-ended)
- TransactionTypeCode not "O"
- Enrollment status not updated to "Enrolled"

### Payload Construction Failures
- TransactionType ≠ "O" → BR-D01-021 violated (new span must use Open)
- Status ≠ "A" → BR-D01-020 violated
- DateEnrlEff ≠ enrollment begin date
- DateEnrlEnd ≠ "22991231" → should be open-ended after reinstatement
- StartReasonCode ≠ "2L" per BR-D01-022
- StopReasonCode populated when end date = 22991231 (should be Not Required)
- FEA dates not spanning the new enrollment period

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction row not created for this transaction
- TxnRefId not properly incremented

### UI State Failures
- Conflict chip displayed when not expected
- Re-submit button visible when not expected
- Enrollment status not reflecting "Enrolled"

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
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active at enrollment begin → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active at enrollment begin → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **DateEnrlEff** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate` (original enrollment begin) |
| **DateEnrlEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` (NULL → "22991231") |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **RecertificationCompletionDate** | Same as DateEnrlEff |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (functionally similar — both use S300 to create new span)
- TC-006: Enrollment End Date Changed to Earlier Date (disenrollment that precedes this reinstatement)
- TC-007: Enrollment End Date Changed to Later Date (alternative extension approach)
- TC-008: Referral Withdrawn (another status change scenario — uses Status "I" unlike this one)
