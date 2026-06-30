# TC-014: Address-Only Update (S700)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-014 |
| Scenario | Address-Only Update (S700) |
| Test Participant MA ID | **1430000013** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 11) → S200 → S700 |
| Business Rules | BR-D01-003, BR-D01-005, BR-D01-020, BR-D01-021, BR-D01-023, BR-D01-024 |
| Trigger | User updates participant's residential address (IRIS only) |
| Transaction Count | 1 MMIS transaction (address update on current span) |
| Transaction Ordering | N/A — single transaction |
| Priority | Medium |
| Expected Outcome | Success (SU) |

---

## Preconditions

1. Participant is currently Enrolled in IRIS with a successful prior sync (ResponseStatusCode = "SU")
2. Active MMIS enrollment span exists whose date range includes today (current span)
3. User updates the participant's residential address in Blue Compass
4. Active ICA assignment exists with valid Medicaid Provider ID
5. Active FEA assignment exists with valid dates
6. No enrollment or suspension changes — address ONLY
7. **Key constraint:** S700 sends the same begin/end dates as the current span — it is NOT creating or modifying span dates, just updating address fields
8. **SDPC note:** SDPCEnrollmentRequest does NOT include address fields, so address updates only trigger IRIS sync
9. If no S200-calculated span includes the current date (participant disenrolled), no transaction is sent

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

### 4. Residential Address — `PersonModule.PersonAddress` (UPDATED — NEW address)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | PK |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Residential" | Address Node type "IR" |
| `IsActive` | true | Per BR-D01-023 |
| `IsPrimary` | true | Primary residential |
| `PhysicalAddressCareOfName` | **"C/O JANE DOE"** | **NEW** — Maps to Address1 |
| `PhysicalAddressFirstStreetAddress` | **"456 OAK AVE"** | **NEW** — Maps to Address2 (required) |
| `PhysicalAddressSecondStreetAddress` | **"UNIT 7"** | **NEW** — Maps to Address3 |
| `PhysicalAddressCityName` | **"MILWAUKEE"** | **NEW** — Maps to City |
| `PhysicalAddressStateProvinceDisplayName` | "Wisconsin" | Maps to 2-char MMIS code (unchanged state) |
| `PhysicalAddressPostalCode` | **"532011234"** | **NEW** — First 5 → ZipCode, chars 6-9 → ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | **"Milwaukee"** | **NEW** — Translated to 2-digit MMIS county code |

### 5. Mailing Address — `PersonModule.PersonAddress` (second row — may also be updated)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | Different from residential |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Mailing" | Additional Address Node type "IM" |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing preferred |
| `PhysicalAddressFirstStreetAddress` | e.g., "PO BOX 789" | Maps to AdditionalAddress2 (required) |
| `PhysicalAddressCityName` | e.g., "MILWAUKEE" | Maps to AdditionalCity |
| `PhysicalAddressStateProvinceDisplayName` | e.g., "Wisconsin" | Maps to AdditionalState |
| `PhysicalAddressPostalCode` | e.g., "532011234" | Maps to AdditionalZipCode/ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Milwaukee" | Maps to AdditionalCounty |

### 6. Phone Numbers — `PersonModule.PersonPhones`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | e.g., "4145559876" | 10-digit → NumPhone (may be new phone) |
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
| `ProgramEnrollmentKey` | {existing enrollment GUID} | PK — from TC-001 execution |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Active enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended enrollment — sent as "22991231" |
| `StatusDisplayName` | "Enrolled" | Must be enrolled (active span includes today) |
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
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) | From TC-001 response |
| `MmisEndDate` | 2299-12-31 | From TC-001 response |

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
-- Verify enrollment is active and synced
SELECT pe.StatusDisplayName, pee.ResponseStatusCode, pee.HasConflict,
       pee.MmisEffectiveDate, pee.MmisEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentKey = pe.ProgramEnrollmentKey
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName='Enrolled', ResponseStatusCode='SU', HasConflict=0

-- Verify current span includes today
SELECT MmisEffectiveDate, MmisEndDate
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: MmisEffectiveDate <= GETDATE() AND (MmisEndDate >= GETDATE() OR MmisEndDate = '2299-12-31')

-- Verify new residential address is saved
SELECT PhysicalAddressFirstStreetAddress, PhysicalAddressCityName,
       PhysicalAddressCountyAreaDisplayName
FROM PersonModule.PersonAddress
WHERE PersonKey = '{PersonKey}' AND AddressTypeDisplayName = 'Residential'
  AND IsActive = 1 AND IsPrimary = 1
-- Expected: '456 OAK AVE', 'MILWAUKEE', 'Milwaukee'
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 11 (Address change detected for IRIS participant):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action: Call S700_Address_Update
2. **S200** — Scenario S200 (Calculate MMIS spans):
   - Identify current span (the span whose date range includes today)
   - If no span includes today → NO transaction sent (participant not currently active)
3. **S700** — (Address-Only Update):
   - Constructs address update using the CURRENT span's dates (not modifying them)
   - TransactionType = "O" (Open — resending the span with updated address)
   - Status = current span's status (A if active, S if suspended)
   - StartReasonCode = how the current span originally began (context-dependent)
   - All address fields reflect the NEW residential/mailing address

---

## Request Payload Verification

### Transaction 1: Address Update (S700 — Update Address on Current Span)

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
| IdUniqueClient | IdUniqueClient | "1430000013" | CHAR(10) |
| NameLast | NameLast | Participant's last name | CHAR(60) |
| NameFirst | NameFirst | Participant's first name | CHAR(35) |
| NameMi | NameMi | Middle name (if exists) | CHAR(25) |
| NameSuffix | NameSuffix | Suffix (if exists) | CHAR(3) |
| DateBirth | DateBirth | DOB in CCYYMMDD | NUM(8) |
| NumSsn | NumSsn | SSN zero-padded | NUM(9) |
| Sex | Sex | M, F, or U | CHAR(1) |

#### Address Node (Residential — "IR") — **NEW ADDRESS VALUES**

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2) |
| Address1 | Address1 | **"C/O JANE DOE"** | CHAR(30), NEW care-of |
| Address2 | Address2 | **"456 OAK AVE"** | CHAR(30), NEW street address |
| Address3 | Address3 | **"UNIT 7"** | CHAR(30), NEW unit |
| City | City | **"MILWAUKEE"** | CHAR(18), NEW city |
| State | State | "WI" (or MMIS state code) | CHAR(2), unchanged state |
| ZipCode | ZipCode | **"53201"** | NUM(5), NEW zip |
| ZipCode4 | ZipCode4 | **"1234"** | NUM(4), NEW zip+4 |
| County | County | **Milwaukee county code** | CHAR(2), NEW county |
| NumPhone | NumPhone | **"4145559876"** | NUM(10), NEW phone |
| IndPhone | IndPhone | "H" | CHAR(1) |

#### Additional Address Node (Mailing — "IM") — **NEW MAILING VALUES**

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AdditionalAddressType | AdditionalAddressType | "IM" | CHAR(2) |
| AdditionalAddress1 | AdditionalAddress1 | Care Of (or spaces) | CHAR(30) |
| AdditionalAddress2 | AdditionalAddress2 | **"PO BOX 789"** | CHAR(30), NEW mailing street |
| AdditionalAddress3 | AdditionalAddress3 | Spaces (or unit) | CHAR(30) |
| AdditionalCity | AdditionalCity | **"MILWAUKEE"** | CHAR(18), NEW city |
| AdditionalState | AdditionalState | "WI" (or MMIS state code) | CHAR(2) |
| AdditionalZipCode | AdditionalZipCode | **"53201"** | NUM(5), NEW zip |
| AdditionalZipCode4 | AdditionalZipCode4 | **"1234"** | NUM(4), NEW zip+4 |
| AdditionalCounty | AdditionalCounty | **Milwaukee county code** | CHAR(2), NEW county |
| AdditionalNumPhone | AdditionalNumPhone | Secondary phone | NUM(10) |
| AdditionalIndPhone | AdditionalIndPhone | Phone type (H/C/W) | CHAR(1) |

#### Waiver Enrollment Node (S700 — Address Update)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | From active ICA assignment |
| TransactionType | TransactionType | **"O" (Open)** | Per BR-D01-021 — address update re-sends the span |
| DateEnrlEff | DateEnrlEff | **Current span begin date** (e.g., "20260701") | Same as existing MMIS span begin — NOT modified |
| DateEnrlEnd | DateEnrlEnd | **Current span end date** (e.g., "22991231") | Same as existing MMIS span end — NOT modified |
| Status | Status | **Current span's status** (e.g., "A") | Per BR-D01-020 — reflects span's actual status |
| WorkerID | WorkerID | ICA consultant worker ID | CHAR(8) |
| StartReasonCode | StartReasonCode | **How current span originally began** | "2L" if new enrollment, "2Q" if post-suspension, "2P" if ICA transfer, "2R" if FEA transfer |
| StopReasonCode | StopReasonCode | NULL or appropriate code | NULL if end=22991231 (open-ended), "2I" if suspended with valid end |
| RecertificationCompletionDate | RecertificationCompletionDate | Same as DateEnrlEff | Per ICD mapping |
| RecertificationDueDate | RecertificationDueDate | ISP end date | From PersonCenteredPlan |
| CountyofResponsibility | CountyofResponsibility | **NEW county code** | CHAR(2), reflects new address county |

> **⚠️ CRITICAL:** The StartReasonCode must reflect the span's ORIGINAL reason for beginning — NOT hardcoded to "2L". If this test follows TC-001 directly (initial enrollment), it will be "2L". But if the current span began from a post-suspension resumption, it would be "2Q".

#### FEA Node (S700 — Address Update)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | CHAR(15) |
| FEAEffectiveDate | FEAEffectiveDate | Current span begin date (e.g., "20260701") | Matches DateEnrlEff |
| FEAEndDate | FEAEndDate | Current span end date (e.g., "22991231") | Matches DateEnrlEnd |
| FEAStatus | FEAStatus | Current span status (e.g., "A") | Matches Status |

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) | Address updated on existing span |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed |
| EffectiveDate | Same as DateEnrlEff sent (e.g., "20260701") | Echoed — span dates unchanged |
| EndDate | Same as DateEnrlEnd sent (e.g., "22991231") | Echoed — span dates unchanged |
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
| `ProgramEnrollmentExtensionKey` | {existing GUID} | PK — same record updated |
| `HasConflict` | 0 (false) | No conflict for successful address update |
| `ResponseStatusCode` | "SU" | Success |
| `TransactionTypeCode` | "O" | Open transaction (address update) |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000013" | From response |
| `SubmittedClientId` | "1430000013" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (current span begin — unchanged) | Span dates NOT modified |
| `MmisEndDate` | 2299-12-31 (current span end — unchanged) | Span dates NOT modified |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |
| `LastChangeTypeCode` | "AddressUpdate" (or equivalent code) | Type of change |
| `LastSuspensionChangeTypeCode` | NULL | No suspension involvement |
| `PreUpdateBeginDate` | 2026-07-01 | Same as current (unchanged) |
| `PreUpdateEndDate` | 2299-12-31 | Same as current (unchanged) |
| `PreUpdateSuspensionStartDate` | NULL | No suspension |
| `PreUpdateSuspensionEndDate` | NULL | No suspension |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
ORDER BY Timestamp DESC
```

Expected: **1 new row** (in addition to prior TC-001 sync row)

**New Row — S700 (Address Update):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `ProgramEnrollmentExtensionKey` | {FK to extension record} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 (current span begin — unchanged) |
| `MmisEndDate` | 2299-12-31 (current span end — unchanged) |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "1430000013" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | NOT NULL |
| `ChangeTypeCode` | "AddressUpdate" (or equivalent) |
| `SuspensionChangeTypeCode` | NULL |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {captured at runtime} |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **No rows** — successful address update, no error messages

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (status confirmation)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Unchanged — address update doesn't affect status |
| `EnrollmentDateRangeStartDate` | 2026-07-01 | Unchanged |
| `EnrollmentDateRangeEndDate` | NULL | Unchanged |

### 5. `PersonModule.PersonAddress` (verify new address persisted)

```sql
SELECT PhysicalAddressFirstStreetAddress, PhysicalAddressCityName,
       PhysicalAddressCountyAreaDisplayName, PhysicalAddressPostalCode
FROM PersonModule.PersonAddress
WHERE PersonKey = '{PersonKey}' AND AddressTypeDisplayName = 'Residential'
  AND IsActive = 1 AND IsPrimary = 1
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `PhysicalAddressFirstStreetAddress` | "456 OAK AVE" | New address |
| `PhysicalAddressCityName` | "MILWAUKEE" | New city |
| `PhysicalAddressCountyAreaDisplayName` | "Milwaukee" | New county |
| `PhysicalAddressPostalCode` | "532011234" | New postal code |

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
| Enrollment Status | "Enrolled" (unchanged) |
| Residential Address | Displays new address (456 OAK AVE, MILWAUKEE) |
| Enrollment Dates | Unchanged |

---

## Failure Criteria

### Response Validation Failures
- ResponseStatus ≠ "SU" → address update rejected by MMIS
- MMIS returns different EffectiveDate/EndDate than what was sent

### Data Integrity Failures
- HasConflict set to 1 when response was SU
- MmisEffectiveDate or MmisEndDate changed (should remain unchanged for address-only update)
- Enrollment status or dates modified by address update

### Payload Construction Failures
- TransactionType ≠ "O" → address update must use Open
- DateEnrlEff or DateEnrlEnd ≠ current span's existing dates → S700 must NOT modify span dates
- Status ≠ current span's actual status (e.g., sent "A" when span is actually "S")
- StartReasonCode hardcoded to "2L" when span actually began from post-suspension ("2Q") or transfer ("2P"/"2R")
- Address fields contain OLD address values instead of NEW
- CountyofResponsibility not updated to new county

### SDPC Cross-Check Failures
- SDPC enrollment transaction sent for address update (SDPC does not include address fields)
- Any SDPCEnrollmentRequest generated by this action

### Audit Trail Failures
- RequestJsonTextFile is NULL in SyncTransaction
- SyncTransaction row not created for this transaction
- TxnRefId not properly incremented

### UI State Failures
- Conflict chip displayed when not expected
- Address not reflecting new values
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
| **Address (IR)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Residential' AND `IsActive` = 1 AND `IsPrimary` = 1 — **NEW values** |
| **Address (IM)** | `PersonModule.PersonAddress` → WHERE `AddressTypeDisplayName` = 'Mailing' AND `IsActive` = 1 AND `IsPrimary` = 1 — **NEW values** |
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **DateEnrlEff** | `ProgramEnrollmentExtension.MmisEffectiveDate` (current span begin — UNCHANGED) |
| **DateEnrlEnd** | `ProgramEnrollmentExtension.MmisEndDate` (current span end — UNCHANGED) |
| **StartReasonCode** | Context-dependent: "2L" if initial enrollment span, "2Q" if post-suspension, "2P" if ICA transfer, "2R" if FEA transfer |
| **StopReasonCode** | NULL if end=22991231, "2I" if suspended with valid end date |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE role LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (completed ISP) |
| **CountyofResponsibility** | NEW residential address county → translated to 2-digit MMIS county code |

---

## Related Test Cases

- TC-001: New IRIS Enrollment — Happy Path (prerequisite — enrollment must exist with active span)
- TC-002: Enrolled → Suspended (if current span is suspended, Status = "S" for address update)
- TC-015: New SDPC Enrollment (SDPC does NOT send address — contrast with this IRIS-only update)
- TC-003: ICA Transfer (StartReasonCode = "2P" if current span began from ICA transfer)
