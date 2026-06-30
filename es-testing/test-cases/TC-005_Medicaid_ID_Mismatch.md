# TC-005: Medicaid ID Mismatch — MMIS Returns Different ID (BR-D01-016)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-005 |
| Scenario | Medicaid ID Mismatch — MMIS Returns Different (Current) Medicaid ID |
| Test Participant MA ID | **1430000013** |
| Decision Table | S100 (Condition 1) → S200 → S220 (Condition 1) → S300 (Column 1) |
| Business Rules | BR-D01-001, BR-D01-010, BR-D01-016, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User adds a new IRIS enrollment table entry; status changes to "Enrolled" |
| Transaction Count | 1 MMIS transaction (succeeds with ID update) |
| Priority | High |
| Special Handling | Post-response Medicaid ID update + Notification generation |

---

## Preconditions

1. Participant has valid demographics (DOB, SSN, Name)
2. Participant's Blue Compass Medicaid ID = "1430000013"
3. MMIS has a **different (current)** Medicaid ID on file for this participant: "0987654321"
4. Active residential and mailing addresses exist
5. Active ICA assignment with valid Medicaid Provider ID
6. Active FEA assignment with valid dates spanning enrollment
7. Completed ISP with start/end dates
8. The Medicaid ID mismatch is not known to BC until MMIS response is received

---

## Database Setup (Pre-Execution State)

> **Note:** This test case has the same baseline setup as TC-001 (valid enrollment), but the MMIS response will return a different Medicaid ID. The test verifies BC's handling of the ID swap per BR-D01-016.

The following Carity database tables and columns must be populated before test execution.

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
| `Value` | **"1430000013"** | 10-char Medicaid ID → IdUniqueClient sent to MMIS |
| `StatusDisplayName` | "Active" | Must be active |
| `StatusIdentifier` | (active status code) | |
| `IsOriginal` | true | |
| `EffectiveDateRangeStartDate` | Valid start date | |
| `EffectiveDateRangeEndDate` | NULL | Currently active — **will be end-dated post-execution** |

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
| `PhysicalAddressCareOfName` | e.g., "C/O JOHN DOE" or NULL | Maps to Address1 |
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
| `EffectiveDateRangeStartDate` | e.g., 2026-01-01 | → RecertificationCompletionDate (same as DateEnrlEff) |
| `EffectiveDateRangeEndDate` | e.g., 2026-12-31 | → RecertificationDueDate |
| Status | Completed | ISP must be in Completed state; does not need to be Active. ISP dates may be future. |

### 10. Program Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {GUID} | PK — created when user adds enrollment |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | → DateEnrlEff |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" to MMIS |
| `StatusDisplayName` | "Enrolled" | Triggers the enrollment webservice (BR-D01-001) |
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

### 12. Pre-Execution: No Prior Sync Records

Verify these tables are **empty** for this participant's enrollment:

| Table | Expected State |
|-------|----------------|
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` | No row for this ProgramEnrollmentKey |
| `CustomerProgramEnrollmentModule.SyncTransaction` | No rows |
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` | No rows |

### 13. Pre-Execution Verification Query

```sql
-- Verify exactly 1 active Medicaid number (will become 2 after execution)
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
-- Expected: 1 row, Value = '1430000013', StatusDisplayName = 'Active', EffectiveDateRangeEndDate = NULL

-- Verify enrollment is ready
SELECT pe.StatusDisplayName, pe.EnrollmentDateRangeStartDate, pe.EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment pe
WHERE pe.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: StatusDisplayName = 'Enrolled'
```
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` | No rows |

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 1 (New IRIS enrollment added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200_001 (Single span calculated)
3. **S220** — Condition 1 (New Enrollment Added):
   - Action #2: Call S300
4. **S300** — Column 1 (IRIS): Constructs and sends enrollment request with BC Medicaid ID
5. **MMIS processes** and responds with different IdUniqueClient (current MMIS ID)
6. **Post-response handling** per BR-D01-016: Update Medicaid ID + generate notification

---

## Request Payload Verification

### Key Fields Sent

| Field | JSON Element | Value Sent | Notes |
|-------|-------------|------------|-------|
| IdUniqueClient | IdUniqueClient | "1430000013" | BC's stored Medicaid ID |
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| TransactionType | TransactionType | "O" (Open) | New enrollment |
| DateEnrlEff | DateEnrlEff | BC enrollment begin date (CCYYMMDD) | |
| DateEnrlEnd | DateEnrlEnd | "22991231" | High end date |
| Status | Status | "A" (Active) | |
| StartReasonCode | StartReasonCode | "2L" (New Enrollment) | |
| WaiverAgencyID | WaiverAgencyID | ICA Medicaid Provider ID | Active ICA |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Active FEA |
| FEAEffectiveDate | FEAEffectiveDate | BC enrollment begin date | |
| FEAEndDate | FEAEndDate | "22991231" | Spans enrollment period |
| FEAStatus | FEAStatus | "A" (Active) | |

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "SU" (Success) or "SE" (Success with Errors) | Enrollment is accepted despite ID difference |
| TxnRefId | Echoed from request | |
| **IdUniqueClient** | **"0987654321"** | **Current MMIS Medicaid ID (different from what BC sent)** |
| **SubmittedClientID** | **"1430000013"** | **What BC originally sent (echoed back for reference)** |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed |
| EffectiveDate | BC enrollment begin date | Echoed |
| EndDate | "22991231" | Echoed |

### ID Mismatch Detection Logic

```
Request:   IdUniqueClient = "1430000013" (BC's stored ID)
Response:  IdUniqueClient = "0987654321" (MMIS's current ID)
           SubmittedClientID = "1430000013" (what was sent)

Detection: Response.IdUniqueClient ≠ Request.IdUniqueClient
           → BR-D01-016 triggered
```

---

## Database Verification (Post-Execution State)

### 1. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `HasConflict` | 0 (false) | Enrollment accepted — no conflict |
| `ResponseStatusCode` | "SU" | Success |
| `IdUniqueClientIdentifier` | **"0987654321"** | **MMIS-provided current Medicaid ID** |
| `SubmittedClientId` | "1430000013" | What BC originally sent |
| `TransactionTypeCode` | "O" | Open |
| `MmisEffectiveDate` | Enrollment begin date | |
| `MmisEndDate` | 2299-12-31 | |
| `LastSynchronizedTimestamp` | Current datetime2 | |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
```

Expected: **1 row**

| Column | Expected Value |
|--------|----------------|
| `TransactionTypeCode` | "O" |
| `ResponseStatusCode` | "SU" |
| `IdUniqueClientIdentifier` | "0987654321" |
| `SubmittedClientId` | "1430000013" |
| `RequestJsonTextFile` | NOT NULL |
| `MmisEffectiveDate` | Enrollment begin date |
| `MmisEndDate` | 2299-12-31 |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

Expected: **No rows** (enrollment succeeded)

### 4. `PersonModule.PersonMedicaidNumbers` (**CRITICAL — ID SWAP VERIFICATION**)

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
ORDER BY EffectiveDateRangeStartDate DESC
```

Expected: **2 rows** (new ID created, old ID end-dated)

| Row | Value | EffectiveDateRangeStartDate | EffectiveDateRangeEndDate | StatusDisplayName | Notes |
|-----|-------|----------------------------|--------------------------|-------------------|-------|
| NEW | **"0987654321"** | Today (current date) | NULL | "Active" | New MMIS-provided ID, now active |
| OLD | "1430000013" | (original start) | **Today - 1** | "Active" (end-dated) | Previous ID, end-dated to yesterday |

### 5. `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | "Enrolled" | Span activated per BR-D01-010 (SU response) |

### 6. Notification Verification

Per BR-D01-016, a notification must be generated. Check:

```sql
SELECT * FROM NotificationModule.[relevant notification table]
WHERE [PersonKey or related FK] = '{PersonKey}'
ORDER BY EntityCreatedTimestamp DESC
```

Expected: Notification record exists indicating Medicaid ID was updated from "1430000013" to "0987654321".

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Response Status display | "SU" |
| Conflict Status chip | Not displayed (enrollment accepted) |
| Re-submit button | Hidden |
| Last Sync timestamp | Updated |
| Medicaid ID on participant profile | **Updated to "0987654321"** |

---

## Failure Criteria

- ResponseStatus = "FL" → enrollment NOT activated, ID swap may or may not apply (implementation-dependent)
- PersonMedicaidNumbers not updated after SU response with different IdUniqueClient → BR-D01-016 violated
- Old Medicaid ID record not end-dated (EffectiveDateRangeEndDate not set to today - 1) → data integrity issue
- Notification not generated → BR-D01-016 notification requirement violated
- HasConflict set to true when ResponseStatus = "SU" → incorrect conflict detection

---

## BR-D01-016 Implementation Details

Per the ICD v6.0:

> If MMIS has a different Medicaid ID on file, the value sent in EnrollmentRequest IdUniqueClient will be returned in EnrollmentResponse SubmittedClientID, and the participant's current Medicaid ID will be returned in EnrollmentResponse IdUniqueClient. The participant's current Medicaid ID should be updated and a notification generated.

### Processing Steps:

1. Compare `Response.IdUniqueClient` with `Request.IdUniqueClient`
2. If different:
   a. Store new ID in `ProgramEnrollmentExtension.IdUniqueClientIdentifier`
   b. Store submitted ID in `ProgramEnrollmentExtension.SubmittedClientId`
   c. Create new `PersonMedicaidNumbers` record with Value = new ID, EffectiveDate = today
   d. End-date old `PersonMedicaidNumbers` record with EndDate = today - 1
   e. Generate notification per Notification Definitions & Triggers document
3. HasConflict = false (enrollment was accepted — this is informational, not an error)

---

## Edge Cases to Consider

| Scenario | Expected Behavior |
|----------|-------------------|
| ResponseStatus = "SE" with ID mismatch | Same ID update logic applies; enrollment still activated per BR-D01-010 |
| ResponseStatus = "FL" with ID mismatch | If MMIS returns FL, enrollment NOT activated; ID update may still apply depending on implementation |
| ID matches (no mismatch) | No update needed; IdUniqueClient = SubmittedClientID |
| Multiple consecutive submissions with different IDs | Each response triggers a new PersonMedicaidNumbers record |

---

## Differences from TC-001 (Happy Path)

| Aspect | TC-001 (Happy Path) | TC-005 (ID Mismatch) |
|--------|---------------------|----------------------|
| Response IdUniqueClient | Same as request | Different from request |
| PersonMedicaidNumbers | No change | New record created, old end-dated |
| Notification | None | Generated |
| HasConflict | false | false (enrollment accepted) |
| ProgramEnrollmentExtension.IdUniqueClientIdentifier | BC Medicaid ID | MMIS-provided Medicaid ID |
| ProgramEnrollmentExtension.SubmittedClientId | BC Medicaid ID | BC Medicaid ID (preserved) |

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

| Request Field | Lookup Path |
|---------------|-------------|
| **IdUniqueClient** (sent) | `PersonModule.PersonMedicaidNumbers` → WHERE Active → `Value` = "1430000013" |
| **IdUniqueClient** (response) | MMIS returns "0987654321" — triggers BR-D01-016 ID swap |
| **SubmittedClientID** (response) | MMIS echoes back "1430000013" — what was originally sent |
| **PersonMedicaidNumbers update** | New row: Value = "0987654321", EffectiveDateRangeStartDate = today, EndDate = NULL |
| **PersonMedicaidNumbers update** | Old row: Value = "1430000013", EffectiveDateRangeEndDate = today - 1 |
| **WaiverAgencyID** | Same lookup as TC-001: PersonLocationAssignment (ICA) → LocationIdentifiers → Value |
| **WaiverFEA** | Same lookup as TC-001: PersonLocationAssignment (FEA) → LocationIdentifiers → Value |

---

## Related Test Cases

- TC-001: New IRIS Enrollment Happy Path (same request, different response handling)
- TC-004: Hard Error (FL response — different error handling path)
