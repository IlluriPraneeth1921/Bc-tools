# TC-001: New IRIS Enrollment — Happy Path

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-001 |
| Scenario | New IRIS Enrollment — Happy Path |
| Test Participant MA ID | **1430000012** |
| Decision Table | S100 (Condition 1) → S200 → S220 (Condition 1) → S300 (Column 1) |
| Business Rules | BR-D01-001, BR-D01-005, BR-D01-010, BR-D01-020, BR-D01-021, BR-D01-022, BR-D01-023, BR-D01-024 |
| Trigger | User adds a new IRIS enrollment table entry; status changes to "Enrolled" |
| Transaction Count | 1 MMIS transaction |
| Priority | High |

---

## Preconditions

1. Participant has a valid Medicaid ID (10-char, numeric)
2. Participant has valid demographics: DOB, SSN (9-digit zero-padded), Name (Last, First)
3. Active residential address exists (type = primary, active) with city, state, zip, county
4. Active **primary** mailing address exists (type = Mailing, active, IsPrimary = true)
   > **Note:** This test exercises the "primary mailing exists" path per BR-D01-024. A separate test case should cover the fallback logic (no primary → most recent active mailing address by update date).
5. **Two** phone numbers available: a primary phone (used for Address Node) and a secondary phone of a different type (used for Additional Address Node's `AdditionalNumPhone`). Fallback priority if no primary: Home → Cell → Work.
6. Active ICA assignment exists with a valid Medicaid Provider ID (PersonLocationAssignment type="ICA", active)
7. Active FEA assignment exists with valid dates spanning the full enrollment period (PersonLocationAssignment type="FEA", active)
8. Active ISP (PersonCenteredPlan) exists with start/end dates
9. No prior MMIS enrollment exists for this participant in IRIS program
10. No pending conflicts or unresolved sync transactions

---

## Database Setup (Pre-Execution State)

The following Carity database tables and columns must be populated before test execution.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | e.g., "TESTLAST" | Maps to NameLast (first 20 chars for MMIS matching) |
| `NameFirstName` | e.g., "TESTFIRST" | Maps to NameFirst (first 15 chars for MMIS matching) |
| `NameMiddleName` | e.g., "M" | Optional, maps to NameMi |
| `NameSuffixName` | e.g., "JR" | Optional, must be in T_RE_CDE_NAME_SUFFIX (I, II, III, IV, JR, SR, V, VI, VII) |
| `BirthDate` | e.g., 1985-03-15 | Maps to DateBirth (CCYYMMDD) |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | Translated to M/F/U for MMIS `Sex` field. (ICD references `GenderDisplayName`; actual BC column is `BirthAssignedGenderDisplayName`.) |

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
| `EffectiveDateRangeStartDate` | Valid date | |

### 4. Residential Address — `PersonModule.PersonAddress`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | PK |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Residential" | Used for Address Node (type "IR") |
| `IsActive` | true | Per BR-D01-023: active address required |
| `IsPrimary` | true | Per BR-D01-023: primary residential |
| `PhysicalAddressCareOfName` | e.g., "C/O JOHN DOE" or NULL | Maps to Address1 (spaces if empty) |
| `PhysicalAddressFirstStreetAddress` | e.g., "123 MAIN ST" | Maps to Address2 (required) |
| `PhysicalAddressSecondStreetAddress` | e.g., "APT 4B" or NULL | Maps to Address3 (spaces if empty) |
| `PhysicalAddressCityName` | e.g., "MADISON" | Maps to City (required) |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Translated to 2-char MMIS code → State |
| `PhysicalAddressPostalCode` | e.g., "537011234" | First 5 → ZipCode, chars 6-9 → ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Translated to 2-digit MMIS county code → County |

### 5. Mailing Address — `PersonModule.PersonAddress` (second row)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | Different from residential |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Mailing" | Used for Additional Address Node (type "IM") |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing preferred |
| `PhysicalAddressCareOfName` | e.g., "C/O JANE DOE" or NULL | Maps to AdditionalAddress1 |
| `PhysicalAddressFirstStreetAddress` | e.g., "PO BOX 456" | Maps to AdditionalAddress2 (required) |
| `PhysicalAddressSecondStreetAddress` | NULL | Maps to AdditionalAddress3 |
| `PhysicalAddressCityName` | e.g., "MADISON" | Maps to AdditionalCity |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Maps to AdditionalState |
| `PhysicalAddressPostalCode` | e.g., "537011234" | Maps to AdditionalZipCode/AdditionalZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Maps to AdditionalCounty |

### 6. Phone Numbers — `PersonModule.PersonPhones`

#### Primary Phone (used for Address Node — `NumPhone` / `IndPhone`)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | e.g., "6085551234" | 10-digit → NumPhone |
| `TypeDisplayName` | "Home" | Translated to H → IndPhone |
| `IsPrimary` | true | Primary phone used for Address Node |

#### Secondary Phone (used for Additional Address Node — `AdditionalNumPhone` / `AdditionalIndPhone`)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | e.g., "6085559876" | 10-digit → AdditionalNumPhone (must differ from primary) |
| `TypeDisplayName` | "Cell" | Translated to C → AdditionalIndPhone |
| `IsPrimary` | false | Secondary phone; different type from primary |

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
| `EffectiveDateRangeStartDate` | Valid date | |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | Same as enrollment begin date | **MUST span enrollment period** (Error 9156 if not). Note: BC sends this date as `FEAEffectiveDate`. |
| `EffectiveDateRangeEndDate` | NULL or >= enrollment end date | **MUST span enrollment period**. BC sends this date as `FEAEndDate` (22991231 if NULL). |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in request |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonCenteredPlanKey` | {GUID} | PK |
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate (same as DateEnrlEff) |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Active | Must be active ISP |

### 10. Program Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {GUID} | PK — created when user adds enrollment |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | → DateEnrlEff |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" to MMIS |
| `StatusDisplayName` | "Enrolled" | Triggers the enrollment webservice (BR-D01-001) |
| `StatusReasonDisplayName` | NULL or appropriate reason | Used for Start/Stop Reason mapping |
| `IsPrimary` | true | |

### 11. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | Used to derive WorkerID = "J.Smith" (truncated to 8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter for worker lookup |
| `EffectiveDateRangeStartDate` | On or before enrollment date | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 12. County of Responsibility — `PersonModule.PersonAttributes`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `TypeDisplayName` | "County of Responsibility" | Attribute type |
| `ValueDisplayName` | e.g., "Dane" | Translated to 2-digit MMIS county code |

### 13. Pre-Execution: No Prior Sync Records

Verify these tables are **empty** for this participant's enrollment:

| Table | Expected State |
|-------|----------------|
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` | No row for this ProgramEnrollmentKey |
| `CustomerProgramEnrollmentModule.SyncTransaction` | No rows for this ProgramEnrollmentExtensionKey |
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` | No rows |

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 1 (New IRIS enrollment added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200_001 (Enrollment only, no suspensions, no agency changes):
   - Single MMIS span calculated: Active, BC enrollment begin → BC enrollment end (12/31/2299 if null)
   - ICA and FEA assigned at enrollment begin date are used
3. **S220** — Condition 1 (New Enrollment Added):
   - Action #2: Call S300 to send a new enrollment span
4. **S300** — Column 1 (IRIS):
   - Constructs the IRIS enrollment request payload

---

## Request Payload Verification

### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| Txn Source | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| Txn Date | TxnDate | Current date in CCYYMMDD | NUM(8), system-generated |
| Txn Time | TxnTime | Current time in HHMMSS | NUM(6), system-generated |
| Txn Ref Id | TxnRefId | "S" + 9-digit sequential number (e.g., "S000000001") | CHAR(10), format: S + 9-digit number. **Note:** Capture the actual value at runtime — the counter is global and may not reset between test runs. |

### Demographic Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| IdUniqueClient | IdUniqueClient | Participant's Medicaid ID | CHAR(10), from PersonModule.PersonMedicaidNumbers.Value = **"1430000012"** |
| NameLast | NameLast | Participant's last name | CHAR(60), first 20 chars used for MMIS matching |
| NameFirst | NameFirst | Participant's first name | CHAR(35), first 15 chars used for MMIS matching |
| NameMi | NameMi | Middle name (if exists) | CHAR(25), optional |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3), must be in T_RE_CDE_NAME_SUFFIX |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1), translated from `BirthAssignedGenderDisplayName` |

### Address Node (Residential — "IR")

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2), IRIS Residential |
| Address1 | Address1 | Care Of name (or spaces if empty) | CHAR(30) |
| Address2 | Address2 | Street address | CHAR(30), required when AddressType included |
| Address3 | Address3 | Apt/Lot (or spaces if empty) | CHAR(30) |
| City | City | City name | CHAR(18), required |
| State | State | 2-char MMIS state code | CHAR(2), translated from StateProvinceDisplayName |
| ZipCode | ZipCode | First 5 digits of postal code | NUM(5) |
| ZipCode4 | ZipCode4 | Digits 6-9 of postal code | NUM(4) |
| County | County | 2-digit MMIS county code | CHAR(2), default '00' if not found |
| NumPhone | NumPhone | Primary phone number | NUM(10) |
| IndPhone | IndPhone | Phone type (H/C/W) | CHAR(1) |

### Additional Address Node (Mailing — "IM")

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
| AdditionalNumPhone | AdditionalNumPhone | Secondary phone | NUM(10), different from primary |
| AdditionalIndPhone | AdditionalIndPhone | Phone type (H/C/W) | CHAR(1) |

### Waiver Enrollment Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverProgramName | WaiverProgramName | "IRIS" | CHAR(10), always "IRIS" |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | CHAR(25), from active ICA assignment at enrollment begin date |
| TransactionType | TransactionType | "O" (Open) | CHAR(1), per BR-D01-021 for new enrollment |
| DateEnrlEff | DateEnrlEff | BC enrollment begin date | NUM(8), CCYYMMDD |
| DateEnrlEnd | DateEnrlEnd | "22991231" | NUM(8), high end date when BC end date is null |
| Status | Status | "A" (Active) | CHAR(1), per BR-D01-020 |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8), format: {Initial}.{LastName} truncated |
| StartReasonCode | StartReasonCode | "2L" (New Enrollment) | CHAR(2), per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required (empty/spaces) | End date is 12/31/2299, no stop reason needed per S300 decision table. Field is marked Required in ICD layout but per error 9189 and decision table S300_001, it is not required when end date = 22991231. |
| | | | **⚠️ OPEN QUESTION:** What exact value does Blue Compass serialize for StopReasonCode in this scenario? (empty string `""`, spaces `"  "`, or field omitted from JSON?) Verify against actual `RequestJsonTextFile` content. |
| RecertificationDueDate | RecertificationDueDate | ISP end date in CCYYMMDD | NUM(8), from PersonCenteredPlan.EffectiveDateRangeEndDate |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff | NUM(8), set to enrollment effective date |
| CountyofResponsibility | CountyofResponsibility | 2-digit county code (optional) | CHAR(2), default '00' if not found |

### FEA Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15), from active FEA assignment at enrollment begin date |
| FEAEffectiveDate | FEAEffectiveDate | FEA assignment start date (CCYYMMDD) | NUM(8), from `PersonLocationAssignment.EffectiveDateRangeStartDate` (FEA type). Per precondition, FEA start date = enrollment begin date. |
| FEAEndDate | FEAEndDate | FEA assignment end date (22991231 if null) | NUM(8), from `PersonLocationAssignment.EffectiveDateRangeEndDate`. Must span enrollment period (Error 9156 if not). |
| FEAStatus | FEAStatus | "A" (Active) | CHAR(1) |

> **Clarification:** Blue Compass sends the FEA *assignment* dates (from `PersonLocationAssignment`), not the enrollment dates. In this happy path, the FEA assignment start date equals the enrollment begin date per precondition #7.

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | Required for enrollment activation per BR-D01-010. Note: "SE" (Success with Errors) would also activate the enrollment span — see <!-- TODO: TC-006 --> TC-006 (planned). |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed |
| EffectiveDate | Same as DateEnrlEff sent | Echoed in CCYYMMDD |
| EndDate | Same as DateEnrlEnd sent | Echoed in CCYYMMDD |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | Same as request IdUniqueClient | No Medicaid ID swap in happy path |
| SubmittedClientID | Same as request IdUniqueClient | Echoed |
| Error Segment | Not present | No errors in happy path |

> **Note (BR-D01-010):** Both "SU" and "SE" responses activate an IRIS enrollment span. This test validates the "SU" path only. See <!-- TODO: Create TC-006 --> **TC-006: Success with Errors (SE) Response** for the "SE" scenario.

---

## Database Verification (Post-Execution State)

After test execution, verify the following Carity database records.

### 1. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

**Query:** `SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension WHERE ProgramEnrollmentKey = '{test ProgramEnrollmentKey}'`

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentExtensionKey` | {new GUID — auto-generated} | PK created on first sync |
| `HasConflict` | 0 (false) | No conflict for successful enrollment |
| `IdUniqueClientIdentifier` | "1430000012" (participant's Medicaid ID) | From MMIS response IdUniqueClient |
| `SubmittedClientId` | "1430000012" | What was sent in request |
| `ResponseStatusCode` | "SU" | Success |
| `TransactionTypeCode` | "O" | Open |
| `TxnRefId` | {captured at runtime} | From request |
| `MmisEffectiveDate` | Enrollment begin date | From response EffectiveDate |
| `MmisEndDate` | 2299-12-31 | From response EndDate |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on successful sync |
| `LastChangeTypeCode` | "NewEnrollment" (or equivalent code) | Type of change |
| `PreUpdateBeginDate` | NULL | No prior enrollment |
| `PreUpdateEndDate` | NULL | No prior enrollment |
| `PreUpdateSuspensionStartDate` | NULL | No suspension |
| `ProgramEnrollmentKey` | {test ProgramEnrollmentKey} | FK match |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

**Query:** `SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey from above}'`

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `SyncTransactionKey` | {new GUID} | PK |
| `ProgramEnrollmentExtensionKey` | {FK to above record} | Links to extension |
| `ResponseStatusCode` | "SU" | Success |
| `TransactionTypeCode` | "O" | Open |
| `TxnRefId` | {captured at runtime} | Must match request TxnRefId |
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | From request |
| `MmisEffectiveDate` | Enrollment begin date | |
| `MmisEndDate` | 2299-12-31 | |
| `RequestJsonTextFile` | **NOT NULL** — Full JSON payload | Verify JSON is stored and contains expected structure (see verification checklist below) |
| `Timestamp` | Current datetime2 | Transaction time |
| `ChangeTypeCode` | "NewEnrollment" (or equivalent) | |

### 2a. `RequestJsonTextFile` Content Verification (spot-check)

Deserialize the JSON stored in `SyncTransaction.RequestJsonTextFile` and verify the following key values:

| JSON Path / Field | Expected Value |
|-------------------|----------------|
| `TxnSource` | "CMMRT" |
| `TxnRefId` | Matches `SyncTransaction.TxnRefId` |
| `IdUniqueClient` | "1430000012" |
| `WaiverProgramName` | "IRIS" |
| `TransactionType` | "O" |
| `Status` | "A" |
| `DateEnrlEff` | Enrollment begin date in CCYYMMDD |
| `DateEnrlEnd` | "22991231" |
| `StartReasonCode` | "2L" |
| `AddressType` | "IR" |
| `AdditionalAddressType` | "IM" |
| `WaiverFEA` | FEA Medicaid Provider ID |
| `FEAStatus` | "A" |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

**Query:** `SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'`

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | Happy path — no error messages |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

**Query:** `SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment WHERE ProgramEnrollmentKey = '{test ProgramEnrollmentKey}'`

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Span made active per BR-D01-010 (response = SU) |

### 5. `PersonModule.PersonMedicaidNumbers` (no change expected)

**Query:** `SELECT * FROM PersonModule.PersonMedicaidNumbers WHERE PersonKey = '{test PersonKey}'`

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000012" (unchanged) | No ID mismatch in happy path |
| `EffectiveDateRangeEndDate` | NULL (still active) | |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated to current time |
| Response Status display | "SU" |
| MMIS Errors table | Empty (no errors) |
| Enrollment span | Made active (per BR-D01-010) |

---

## Pass Criteria

This test case passes when **all** of the following are true:

1. The enrollment request payload is constructed correctly with all fields matching the values derived from the database setup (per Request Payload Verification section)
2. MMIS responds with `ResponseStatus = "SU"` (Success)
3. All post-execution database records match their expected values (ProgramEnrollmentExtension, SyncTransaction, no error messages)
4. The `RequestJsonTextFile` stored in SyncTransaction contains valid, well-formed JSON with correct field values
5. The enrollment span is made active (StatusDisplayName = "Enrolled") per BR-D01-010
6. The participant's Medicaid ID remains unchanged (no ID swap)
7. UI reflects successful sync: no conflict chip, Last Sync timestamp updated, Response Status = "SU", no MMIS errors displayed

---

## Failure Criteria

- ResponseStatus ≠ "SU" or "SE" → enrollment span NOT made active (BR-D01-010)
- Missing required fields → MMIS returns FL with specific error codes
- FEA dates not spanning enrollment → Error 9156
- Address fields missing when AddressType included → Errors 9108-9124

---

## Related Test Cases

- TC-004: Hard Error — FEA Dates Don't Span (negative case for FEA validation)
- TC-005: Medicaid ID Mismatch (variation where response returns different ID)
- <!-- TODO: Create TC-006 --> **TC-006: Success with Errors (SE) Response** — Validates that an IRIS enrollment span is also activated when MMIS returns "SE" (per BR-D01-010). Should verify error messages are stored in `ProgramEnrollmentExtensionMessages` while enrollment still proceeds.

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

These chains show how Blue Compass resolves each request field from the Carity database. Use these to verify test data is correctly linked.

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** | `PersonModule.PersonMedicaidNumbers` → WHERE `PersonKey` = participant AND `StatusDisplayName` = 'Active' → `Value` = **"1430000012"** |
| **NameLast** | `PersonModule.Person.NameLastName` |
| **NameFirst** | `PersonModule.Person.NameFirstName` |
| **NameMi** | `PersonModule.Person.NameMiddleName` |
| **DateBirth** | `PersonModule.Person.BirthDate` |
| **NumSsn** | `PersonModule.PersonIdentifiers` → WHERE `TypeDisplayName` = 'Social Security Number' → `Value` |
| **Sex** | `PersonModule.Person.BirthAssignedGenderDisplayName` → translate to M/F/U |
| **Address (IR)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Residential' AND `IsActive` = 1 AND `IsPrimary` = 1 |
| **Address (IM)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Mailing' AND `IsActive` = 1 AND `IsPrimary` = 1 |
| **NumPhone** | `PersonModule.PersonPhones` → WHERE `IsPrimary` = 1 → `PhoneNumber`; fallback: Home → Cell → Work |
| **AdditionalNumPhone** | `PersonModule.PersonPhones` → Secondary phone (different type from primary); priority: Home → Cell → Work |
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE `PersonLocationAssignmentTypeDisplayName` = 'ICA' AND active at enrollment begin → `LocationKey` → `OrganizationModule.LocationIdentifiers` → WHERE `TypeDisplayName` = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE `PersonLocationAssignmentTypeDisplayName` = 'FEA' AND active at enrollment begin → `LocationKey` → `OrganizationModule.LocationIdentifiers` → WHERE `TypeDisplayName` = 'Medicaid Provider ID' → `Value` |
| **FEAEffectiveDate** | `PersonModule.PersonLocationAssignment` → WHERE type = 'FEA' AND active at enrollment begin → `EffectiveDateRangeStartDate` (FEA assignment start date) |
| **FEAEndDate** | `PersonModule.PersonLocationAssignment` → WHERE type = 'FEA' AND active at enrollment begin → `EffectiveDateRangeEndDate` (NULL → "22991231") |
| **DateEnrlEff** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate` |
| **DateEnrlEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` (NULL → "22991231") |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE `AssignmentTypeSystemRoleDisplayName` LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `OrganizationModule.StaffMember` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (active ISP) |
| **RecertificationCompletionDate** | Same as DateEnrlEff (`ProgramEnrollment.EnrollmentDateRangeStartDate`) |
| **CountyofResponsibility** | `PersonModule.PersonAttributes` → WHERE `TypeDisplayName` = 'County of Responsibility' → `ValueDisplayName` → translate to 2-digit MMIS code |
