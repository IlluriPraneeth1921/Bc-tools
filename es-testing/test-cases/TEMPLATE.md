# TC-{NNN}: {Scenario Title}

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-{NNN} |
| Scenario | {Brief scenario description} |
| Test Participant MA ID | **1430000012** |
| Program Type | {IRIS / SDPC} |
| Decision Table | {S100 (Condition X) → S200 → ... path through decision tables} |
| Business Rules | {Comma-separated list: BR-D01-001, BR-D01-002, ...} |
| Trigger | {What user action or system event initiates this test} |
| Transaction Count | {N} MMIS transaction(s) |
| Transaction Ordering | {S500 → S510 → S520 — list steps in required order, or "N/A" for single transaction} |
| Priority | {High / Medium / Low} |
| Expected Outcome | {Success (SU) / Success with Errors (SE, IRIS only) / Failure (FL) / No Transaction Sent} |
| Error Type | {If negative test: error code and type, e.g., "Hard Error (Reject Record — ErrorType 01), MMIS Error Code 9156". Omit row for happy path.} |

---

## Preconditions

1. {State the participant's current enrollment/sync status}
2. {State required data conditions — active assignments, valid dates, etc.}
3. {State the triggering action — what the user is about to do}
4. {State any negative conditions if applicable — what is intentionally wrong}
5. {State absence conditions — no prior suspensions, no conflicts, etc.}

---

## Database Setup (Pre-Execution State)

{If prerequisite: add note like below. Otherwise state "No prerequisite test cases."}

> **Prerequisite: TC-{NNN} must have been executed successfully first.** {Explain why.}

The following Carity database tables and columns must be in the specified state before test execution.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | {value} | Maps to NameLast (first 20 chars for MMIS matching) |
| `NameFirstName` | {value} | Maps to NameFirst (first 15 chars for MMIS matching) |
| `NameMiddleName` | {value or NULL} | Optional, maps to NameMi |
| `NameSuffixName` | {value or NULL} | Optional, must be in T_RE_CDE_NAME_SUFFIX |
| `BirthDate` | {date} | Maps to DateBirth (CCYYMMDD) |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | Translated to M/F/U for MMIS Sex field |

### 2. Medicaid ID — `PersonModule.PersonMedicaidNumbers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `Value` | **"1430000012"** | 10-char Medicaid ID → IdUniqueClient |
| `StatusDisplayName` | "Active" | Must be active |
| `StatusIdentifier` | (active status code) | |
| `IsOriginal` | true | |
| `EffectiveDateRangeStartDate` | {date} | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 3. SSN — `PersonModule.PersonIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `TypeDisplayName` | "Social Security Number" | Identifier type |
| `Value` | {9-digit zero-padded} | → NumSsn |

### 4. Residential Address — `PersonModule.PersonAddress`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | PK |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Residential" | Address Node type "IR" |
| `IsActive` | true | Per BR-D01-023 |
| `IsPrimary` | true | Primary residential |
| `PhysicalAddressCareOfName` | {value or NULL} | Maps to Address1 (spaces if empty) |
| `PhysicalAddressFirstStreetAddress` | {value} | Maps to Address2 (required) |
| `PhysicalAddressSecondStreetAddress` | {value or NULL} | Maps to Address3 (spaces if empty) |
| `PhysicalAddressCityName` | {value} | Maps to City (required) |
| `PhysicalAddressStateProvinceDisplayName` | {value} | Translated to 2-char MMIS code → State |
| `PhysicalAddressPostalCode` | {9-char} | First 5 → ZipCode, chars 6-9 → ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | {value} | Translated to 2-digit MMIS county code |

### 5. Mailing Address — `PersonModule.PersonAddress` (second row)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonAddressKey` | {GUID} | Different from residential |
| `PersonKey` | {test participant GUID} | FK to Person |
| `AddressTypeDisplayName` | "Mailing" | Additional Address Node type "IM" |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing preferred |
| `PhysicalAddressFirstStreetAddress` | {value} | Maps to AdditionalAddress2 (required) |
| `PhysicalAddressCityName` | {value} | Maps to AdditionalCity |
| `PhysicalAddressStateProvinceDisplayName` | {value} | Maps to AdditionalState |
| `PhysicalAddressPostalCode` | {9-char} | Maps to AdditionalZipCode/ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | {value} | Maps to AdditionalCounty |

### 6. Phone Numbers — `PersonModule.PersonPhones`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `PhoneNumber` | {10-digit} | → NumPhone |
| `TypeDisplayName` | "Home" / "Cellular" / "Work" | Translated to H/C/W → IndPhone |
| `IsPrimary` | true | Primary phone for Address Node |

### 7. ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {ICA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | Must be "ICA" type |
| `EffectiveDateRangeStartDate` | {date on or before enrollment begin} | Must be active at enrollment start |
| `EffectiveDateRangeEndDate` | {NULL or after enrollment end} | Must span enrollment period |

#### ICA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {ICA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | {provider ID} | → WaiverAgencyID in request |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → used to look up Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | Must be "FEA" type |
| `EffectiveDateRangeStartDate` | {date — must span enrollment} | Must span enrollment period |
| `EffectiveDateRangeEndDate` | {NULL or >= enrollment end} | Must span enrollment period |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID — same as above} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | {provider ID} | → WaiverFEA in request |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | {date} | → RecertificationCompletionDate (same as DateEnrlEff) |
| `EffectiveDateRangeEndDate` | {date} | → RecertificationDueDate |
| Status | Active | Must be active ISP |

### 10. Program Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {GUID} | PK |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | {date} | → DateEnrlEff |
| `EnrollmentDateRangeEndDate` | {date or NULL} | NULL sent as "22991231" |
| `StatusDisplayName` | {status} | Must match test preconditions |
| `StatusReasonDisplayName` | {reason or NULL} | Used for Start/Stop Reason mapping |
| `IsPrimary` | true | |

### 11. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | {name} | Used to derive WorkerID = "{Initial}.{LastName}" (truncated to 8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter for worker lookup |
| `EffectiveDateRangeStartDate` | {date on or before enrollment} | Must be active |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 12. {Scenario-Specific Table(s)}

{Add any additional tables unique to this test case. Examples:}
{- ProgramEnrollmentSuspension for suspension tests}
{- Additional PersonLocationAssignment rows for transfer tests}
{- CustomerProgramEnrollmentModule.ProgramEnrollmentExtension for tests requiring prior sync state}

### 13. Pre-Execution Verification Query

```sql
-- {Describe what you're verifying}
SELECT {columns}
FROM {table}
WHERE {conditions}
-- Expected: {expected result description}
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition {N} ({trigger description}):
   - Action #{N}: {action description}
   - Action #{N}: {action description}
2. **S{NNN}** — Scenario {ID} ({scenario description}):
   - {What happens at this step}
3. **S{NNN}** — {Continue for each decision table step}:
   - Action #{N}: {action and target step}

---

## Request Payload Verification

> **Program Type Note:**
> - **IRIS:** Uses `ProcessEnrollment\enrollmentRequest\` root path. TransactionType = O (Open) or C (Closure). WorkerID is CHAR(8).
> - **SDPC:** Uses `SDPCEnrollmentRequest\` root path. TransactionType = A (Add/Update) or C (Closure). WorkerID is CHAR(15). No Address Node, no Additional Address Node, no FEA Node. Uses SDPCAgencyID/DateSDPCEffective/DateSDPCEnd instead of WaiverAgencyID/DateEnrlEff/DateEnrlEnd.
>
> **Address Node Conditional Inclusion (BR-D01-023/024):**
> - Address Node ("IR") — Include ONLY if active, primary residential address exists. Omit entire node if no qualifying address.
> - Additional Address Node ("IM") — Include ONLY if active mailing address exists. Omit entire node if no qualifying address.

### {Transaction 1 Title} ({Decision Table Step — Description})

#### Transaction Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| TxnSource | TxnSource | "CMMRT" | Fixed value, CHAR(5) |
| TxnDate | TxnDate | Current date in CCYYMMDD | NUM(8), system-generated |
| TxnTime | TxnTime | Current time in HHMMSS | NUM(6), system-generated |
| TxnRefId | TxnRefId | {incremental, e.g., "S000000001"} | CHAR(10), format: S + 9-digit number |

#### Demographic Node

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| IdUniqueClient | IdUniqueClient | "1430000012" | CHAR(10), from PersonMedicaidNumbers.Value |
| NameLast | NameLast | {participant's last name} | CHAR(60), first 20 chars used for MMIS matching |
| NameFirst | NameFirst | {participant's first name} | CHAR(35), first 15 chars used for MMIS matching |
| NameMi | NameMi | {middle name or empty} | CHAR(25), optional |
| NameSuffix | NameSuffix | {suffix or empty} | CHAR(3), must be in T_RE_CDE_NAME_SUFFIX if present |
| DateBirth | DateBirth | {DOB in CCYYMMDD} | NUM(8) |
| NumSsn | NumSsn | {SSN 9-digit zero-padded} | NUM(9) |
| Sex | Sex | {M/F/U} | CHAR(1), translated from BirthAssignedGenderDisplayName |

#### Address Node (Residential — "IR") {Omit if no active primary residential address per BR-D01-023}

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AddressType | AddressType | "IR" | CHAR(2), IRIS Residential |
| Address1 | Address1 | {Care Of name or spaces} | CHAR(30) |
| Address2 | Address2 | {Street address} | CHAR(30), required when node included |
| Address3 | Address3 | {Apt/Lot or spaces} | CHAR(30) |
| City | City | {City} | CHAR(18), required |
| State | State | {2-char MMIS code} | CHAR(2), translated from StateProvinceDisplayName |
| ZipCode | ZipCode | {First 5 of postal code} | NUM(5) |
| ZipCode4 | ZipCode4 | {Chars 6-9 of postal code} | NUM(4) |
| County | County | {2-digit MMIS code} | CHAR(2), default '00' if not found |
| NumPhone | NumPhone | {Primary phone 10-digit} | NUM(10) |
| IndPhone | IndPhone | {H/C/W} | CHAR(1), translated from phone type |

#### Additional Address Node (Mailing — "IM") {Omit if no active mailing address per BR-D01-024}

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| AdditionalAddressType | AdditionalAddressType | "IM" | CHAR(2), IRIS Mailing |
| AdditionalAddress1 | AdditionalAddress1 | {Care Of or spaces} | CHAR(30) |
| AdditionalAddress2 | AdditionalAddress2 | {Street address} | CHAR(30), required |
| AdditionalAddress3 | AdditionalAddress3 | {Apt/Lot or spaces} | CHAR(30) |
| AdditionalCity | AdditionalCity | {City} | CHAR(18) |
| AdditionalState | AdditionalState | {2-char MMIS code} | CHAR(2) |
| AdditionalZipCode | AdditionalZipCode | {First 5 digits} | NUM(5) |
| AdditionalZipCode4 | AdditionalZipCode4 | {Chars 6-9} | NUM(4) |
| AdditionalCounty | AdditionalCounty | {2-digit MMIS code} | CHAR(2) |
| AdditionalNumPhone | AdditionalNumPhone | {Secondary phone, different from primary} | NUM(10) |
| AdditionalIndPhone | AdditionalIndPhone | {H/C/W} | CHAR(1) |

#### Waiver Enrollment Node (IRIS) / SDPC Enrollment Node (SDPC)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | CHAR(10), always "IRIS" even for SDPC |
| WaiverAgencyID (IRIS) | WaiverAgencyID | {ICA Provider ID} | CHAR(25), from ICA assignment |
| SDPCAgencyID (SDPC) | SDPCAgencyID | {SDPC Provider ID} | CHAR(25), from SDPC assignment |
| TransactionType | TransactionType | "{O/C}" (IRIS) or "{A/C}" (SDPC) | CHAR(1), per BR-D01-021 |
| DateEnrlEff / DateSDPCEffective | DateEnrlEff | {CCYYMMDD} | NUM(8), {explain source/offset} |
| DateEnrlEnd / DateSDPCEnd | DateEnrlEnd | {CCYYMMDD} | NUM(8), {explain source/offset} |
| Status | Status | "{A/S/I}" | CHAR(1), per BR-D01-020 |
| WorkerID | WorkerID | {derived} | CHAR(8) IRIS / CHAR(15) SDPC |
| StartReasonCode | StartReasonCode | "{code}" | CHAR(2), per BR-D01-022 — see Reason Code Reference below |
| StopReasonCode | StopReasonCode | "{code or Not Required}" | CHAR(2), per BR-D01-022 |
| RecertificationDueDate | RecertificationDueDate | {ISP end date CCYYMMDD} | NUM(8), from PersonCenteredPlan.EndDate |
| RecertificationCompletionDate | RecertificationCompletionDate | {same as DateEnrlEff} | NUM(8) |
| CountyofResponsibility | CountyofResponsibility | {2-digit code} | CHAR(2), optional, default '00' |

#### FEA Node (IRIS only — omit for SDPC)

| Field | JSON Element | Expected Value | Validation Rule |
|-------|-------------|----------------|-----------------|
| WaiverFEA | WaiverFEA | {FEA Provider ID} | CHAR(15), from FEA assignment |
| FEAEffectiveDate | FEAEffectiveDate | {CCYYMMDD} | NUM(8), must span enrollment |
| FEAEndDate | FEAEndDate | {CCYYMMDD} | NUM(8), must span enrollment |
| FEAStatus | FEAStatus | "{A/S/I}" | CHAR(1), matches span status |

#### Reason Code Reference (per BR-D01-022)

| Scenario | StartReasonCode | StopReasonCode |
|----------|----------------|----------------|
| Initial Enrollment | 2L | Not Required (end=22991231) |
| Enrolled → Suspended (close) | 2I | 2I |
| Enrolled → Suspended (open) | 2I | 2I |
| Suspended → Enrolled | 2Q | Not Required |
| ICA Transfer | 2P | 2P (close) / Not Required (open) |
| FEA Transfer | 2R | 2R (close) / Not Required (open) |
| Disenrollment | Per StatusReasonDisplayName | Per StatusReasonDisplayName |

{Repeat Transaction Node through FEA Node for each additional transaction in multi-transaction scenarios}

---

## Date Offset Rules (if suspension-related — per BR-D01-017, BR-D01-018, BR-D01-019)

{Include this section for suspension scenarios. Delete for non-suspension test cases.}

| BC Date | MMIS Date | Offset | Rationale |
|---------|-----------|--------|-----------|
| BC Suspension Start | Span-A End Date (S500) | No offset | Participant active on this date |
| BC Suspension Start | Span-B Begin Date (S510) | +1 day | BR-D01-017 |
| BC Suspension End | Span-B End Date (S510) | -1 day | BR-D01-018 |
| BC Suspension End | Span-C Begin Date (S520) | No offset | Participant active on this date |

**Minimum Duration Check (BR-D01-019):** BC end date - BC begin date must be >= 2 days (3 calendar days). If violated, no MMIS transaction is sent and an error is surfaced to the user.

---

## Expected MMIS Response

> **Response Acceptance Rules:**
> - **IRIS (BR-D01-010):** Enrollment activated if ResponseStatus = "SU" or "SE". Not activated if "FL".
> - **SDPC (BR-D01-015):** Enrollment activated ONLY if ResponseStatus = "SU". "SE" is NOT valid for SDPC.

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | "{SU/SE/FL}" | {Explain implications per acceptance rules above} |
| WaiverProgramName | "IRIS" | Echoed (not captured in DB) |
| TransactionType | "{O/C}" (IRIS) or "{A/C}" (SDPC) | Echoed → ProgramEnrollmentExtension.TransactionTypeCode |
| EffectiveDate / DateSDPCEffective | {CCYYMMDD} | Echoed → ProgramEnrollmentExtension.MmisEffectiveDate |
| EndDate / DateSDPCEnd | {CCYYMMDD} | Echoed → ProgramEnrollmentExtension.MmisEndDate |
| TxnRefId | {echoed from request} | → ProgramEnrollmentExtension.TxnRefId |
| IdUniqueClient | {value} | {Same as request, OR different per BR-D01-016 → triggers ID swap} |
| SubmittedClientID | "1430000012" | Echoed from request → ProgramEnrollmentExtension.SubmittedClientId |

### Error Segment (if applicable — 0..unbounded)

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ErrorCode | "{4-char code}" | → ProgramEnrollmentExtensionMessages.Code |
| ErrorDescription | "{exact MMIS error text, max 75 chars}" | → ProgramEnrollmentExtensionMessages.Description |
| ErrorType | "{01/03/04}" (IRIS only — SDPC does not return ErrorType) | 01=Reject Record, 03=Reject Segment, 04=Reject Field |

### Multi-Transaction Response Handling

{For scenarios with multiple MMIS transactions, document expected response for each:}

| Transaction | Decision Table Step | Expected ResponseStatus | Key Verification |
|-------------|--------------------|-----------------------|------------------|
| Txn 1 | S{NNN} | "{SU/FL}" | {what to check} |
| Txn 2 | S{NNN} | "{SU/FL}" | {what to check} |
| Txn N | S{NNN} | "{SU/FL}" | {what to check} |

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
| `ProgramEnrollmentExtensionKey` | {GUID} | PK |
| `HasConflict` | {0 or 1} | {Explain why — 0 for SU/SE, 1 for FL} |
| `ResponseStatusCode` | "{SU/SE/FL}" | |
| `TransactionTypeCode` | "{O/C/A}" | Last transaction type |
| `TxnRefId` | {value} | Last transaction ref |
| `IdUniqueClientIdentifier` | {value} | From response (may differ from submitted per BR-D01-016) |
| `SubmittedClientId` | "1430000012" | What was sent |
| `MmisEffectiveDate` | {date} | From last response EffectiveDate |
| `MmisEndDate` | {date} | From last response EndDate |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync attempt |
| `LastChangeTypeCode` | {value} | e.g., "NewEnrollment", "ICATransfer", etc. |
| `LastSuspensionChangeTypeCode` | {value or NULL} | Only populated for suspension scenarios |
| `PreUpdateBeginDate` | {date or NULL} | Enrollment begin date BEFORE this update |
| `PreUpdateEndDate` | {date or NULL} | Enrollment end date BEFORE this update |
| `PreUpdateSuspensionStartDate` | {date or NULL} | Suspension start BEFORE this update |
| `PreUpdateSuspensionEndDate` | {date or NULL} | Suspension end BEFORE this update |

### 2. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{key}'
ORDER BY Timestamp
```

Expected: **{N} row(s)**

{For each row:}

**Row {N} — S{NNN} ({description}):**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `TransactionTypeCode` | "{O/C/A}" |
| `MmisEffectiveDate` | {date} |
| `MmisEndDate` | {date} |
| `ResponseStatusCode` | "{SU/SE/FL}" |
| `IdUniqueClientIdentifier` | {value from response} |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — full request payload stored |
| `ResponseJsonTextFile` | {NOT NULL if captured / NULL} |
| `ChangeTypeCode` | {value} |
| `SuspensionChangeTypeCode` | {value or NULL} |
| `Timestamp` | Current datetime2 |
| `TxnRefId` | {value} |

### 2a. `CustomerProgramEnrollmentModule.SyncTransactionMessages` (if errors)

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey = '{SyncTransactionKey}'
```

Expected: **{No rows / N row(s)}** — mirrors ProgramEnrollmentExtensionMessages per transaction

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{key}'
```

Expected: **{No rows / N row(s)}**

{If error messages expected:}

| Column | Expected Value |
|--------|----------------|
| `Code` | "{error code}" |
| `Description` | "{error description}" |
| `ClassificationCode` | "{Hard/Soft}" |
| `ErrorTypeCode` | "{01/03/04}" |

### 4. `ProgramEnrollmentModule.ProgramEnrollment`

```sql
SELECT StatusDisplayName FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{key}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | {value} | {Per BR-D01-010: activated only if SU/SE} |

### 5. `PersonModule.PersonMedicaidNumbers`

```sql
SELECT * FROM PersonModule.PersonMedicaidNumbers
WHERE PersonKey = '{PersonKey}'
ORDER BY EffectiveDateRangeStartDate DESC
```

| Verification | Expected |
|--------------|----------|
| Row count | {1 unchanged / 2 if ID swap} |
| Active `Value` | {value} |

### 6. {Scenario-Specific Verification}

{Add any additional verification unique to this test case. Examples:}
{- ProgramEnrollmentSuspension records for suspension tests}
{- PersonLocationAssignment changes for transfer tests}
{- Notification records for BR-D01-016 tests}

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | {Not displayed / Displayed (red)} |
| Re-submit button | {Hidden / Visible} |
| Last Sync timestamp | {Updated / Unchanged} |
| Response Status display | "{SU/FL}" |
| MMIS Errors table | {Empty / Shows error code and description} |
| {Scenario-specific UI element} | {expected state} |

---

## Failure Criteria

### Response Validation Failures
- {ResponseStatus ≠ expected value (e.g., expected SU but got FL)}
- {For IRIS: enrollment activated despite FL response → BR-D01-010 violated}
- {For SDPC: enrollment activated on "SE" response → BR-D01-015 violated (SDPC only accepts SU)}

### Data Integrity Failures
- {DB records not updated correctly — e.g., HasConflict wrong, dates wrong}
- {PreUpdate dates not captured — e.g., PreUpdateBeginDate is NULL when it should have been set}
- {PersonMedicaidNumbers not updated after ID swap → BR-D01-016 violated}
- {Enrollment span made active when it should not be, or vice versa}

### Payload Construction Failures
- {TransactionType incorrect per BR-D01-021 — e.g., "C" when should be "O"}
- {Status incorrect per BR-D01-020 — e.g., "I" when should be "A"}
- {StartReasonCode/StopReasonCode incorrect per BR-D01-022}
- {Date offsets not applied correctly per BR-D01-017/018}
- {FEA dates not matching enrollment span per field requirements}
- {Address Node included when no qualifying address exists per BR-D01-023/024}

### Audit Trail Failures
- {RequestJsonTextFile is NULL in SyncTransaction}
- {SyncTransaction row count ≠ expected transaction count}
- {TxnRefId not incrementing correctly}

### Transaction Ordering Failures (multi-transaction scenarios)
- {Transactions sent in wrong order → MMIS may reject overlapping spans}
- {Partial failure: first transaction succeeds, subsequent fails — verify rollback/conflict state}

### UI State Failures
- {Conflict chip not shown when expected / shown when not expected}
- {Re-submit button visibility incorrect}
- {MMIS Errors table not populated with error details}

---

## Appendix: Data Lookup Chains (Request Field → DB Path)

These chains show how Blue Compass resolves each request field from the Carity database. Use these to verify test data is correctly linked.

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
| **NumPhone** | `PersonModule.PersonPhones` → WHERE `IsPrimary` = 1 → `PhoneNumber`; fallback: Home → Cell → Work |
| **WaiverAgencyID** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'ICA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **WaiverFEA** | `PersonModule.PersonLocationAssignment` → WHERE Type = 'FEA' AND active → `LocationKey` → `OrganizationModule.LocationIdentifiers` WHERE Type = 'Medicaid Provider ID' → `Value` |
| **DateEnrlEff** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate` |
| **DateEnrlEnd** | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` (NULL → "22991231") |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE `AssignmentTypeSystemRoleDisplayName` LIKE 'ICA - IRIS Consultant%' AND active → `AssignedStaffMemberKey` → `OrganizationModule.StaffMember` → `{Initial}.{LastName}` truncated to 8 chars |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` (active ISP) |
| **RecertificationCompletionDate** | Same as DateEnrlEff |
| **CountyofResponsibility** | `PersonModule.PersonAttributes` → WHERE `TypeDisplayName` = 'County of Responsibility' → `ValueDisplayName` → translate to 2-digit MMIS code |
| {Scenario-specific fields} | {lookup path for fields unique to this test case} |

---

## Related Test Cases

- {TC-NNN: Description (prerequisite / related positive / related negative case)}
- {TC-NNN: Description}

---

## Automation Specification (Playwright)

This section provides the structured inputs needed to generate a Playwright test script.

### Test Configuration

| Setting | Value |
|---------|-------|
| Base URL | {e.g., https://bluecompass-test.widhs.gov} |
| API Endpoint (IRIS) | `{baseUrl}/api/enrollment/ProcessEnrollment` |
| API Endpoint (SDPC) | `{baseUrl}/api/enrollment/ProcessSDPCEnrollment` |
| Database | `WiDHS.QcPhi.Carity` (SQL Server) |
| Auth Method | {OAuth / Cookie / Bearer Token — describe how the test authenticates} |
| Test Timeout | {e.g., 60000ms — accounts for MMIS round-trip} |

### Navigation Path (UI Steps)

Describe the exact user workflow to trigger this test case:

```
1. Navigate to: {page URL or route, e.g., /person/{PersonKey}/enrollment}
2. Click: {element — e.g., "Add Enrollment" button}
3. Fill: {form fields — e.g., Program = "IRIS", Start Date = "07/01/2026"}
4. Select: {dropdowns — e.g., Status = "Enrolled"}
5. Click: {submit button — e.g., "Save"}
6. Wait for: {condition — e.g., sync indicator completes, toast message, page refresh}
7. Navigate to: {verification page — e.g., /person/{PersonKey}/enrollment/sync-status}
```

### UI Selectors (Locators)

| Element | Selector Strategy | Locator | Notes |
|---------|-------------------|---------|-------|
| {Enrollment form} | {data-testid / role / label} | {e.g., `[data-testid="enrollment-form"]`} | |
| {Program dropdown} | {data-testid / label} | {e.g., `getByLabel('Program')`} | |
| {Start Date input} | {data-testid / label} | {e.g., `getByLabel('Start Date')`} | |
| {Status dropdown} | {data-testid / label} | {e.g., `getByLabel('Status')`} | |
| {Save button} | {role / text} | {e.g., `getByRole('button', { name: 'Save' })`} | |
| {Sync indicator} | {data-testid} | {e.g., `[data-testid="sync-status"]`} | |
| {Conflict chip} | {data-testid / class} | {e.g., `[data-testid="conflict-chip"]`} | Hidden when no conflict |
| {Re-submit button} | {role / text} | {e.g., `getByRole('button', { name: 'Re-submit' })`} | Visible only on FL |
| {Last Sync timestamp} | {data-testid} | {e.g., `[data-testid="last-sync-timestamp"]`} | |
| {Response Status} | {data-testid} | {e.g., `[data-testid="response-status"]`} | |
| {MMIS Errors table} | {data-testid / role} | {e.g., `getByRole('table', { name: 'MMIS Errors' })`} | |
| {scenario-specific element} | {strategy} | {locator} | |

### API Intercept / Mock Configuration

{Choose one approach: **Intercept Real API** or **Mock MMIS Response**}

#### Option A: Intercept Real API (end-to-end)

```typescript
// Intercept the outbound MMIS request to capture and verify payload
await page.route('**/api/enrollment/ProcessEnrollment', async (route) => {
  const request = route.request();
  const payload = request.postDataJSON();
  // Store payload for assertion
  testContext.capturedPayload = payload;
  await route.continue(); // Let it go to real MMIS
});
```

#### Option B: Mock MMIS Response (isolated UI testing)

```typescript
// Mock the MMIS response for deterministic testing
await page.route('**/api/enrollment/ProcessEnrollment', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ProcessEnrollmentResult: {
        TxnRefId: '{expected TxnRefId}',
        IdUniqueClient: '{expected — same or different per test}',
        SubmittedClientID: '1430000012',
        WaiverProgramName: 'IRIS',
        ResponseStatus: '{SU/SE/FL}',
        TransactionType: '{O/C}',
        EffectiveDate: '{CCYYMMDD}',
        EndDate: '{CCYYMMDD}',
        // Error segment (if FL):
        // Errors: [{ ErrorCode: '{code}', ErrorDescription: '{text}', ErrorType: '{01/03/04}' }]
      }
    })
  });
});
```

### Database Setup Script (beforeEach / beforeAll)

```typescript
// SQL to establish preconditions before test execution
const setupQueries = [
  // Verify participant exists
  `SELECT PersonKey FROM PersonModule.PersonMedicaidNumbers WHERE Value = '1430000012' AND StatusDisplayName = 'Active'`,

  // {Scenario-specific setup — e.g., insert suspension, update FEA dates, create new ICA assignment}
  // `INSERT INTO ProgramEnrollmentModule.ProgramEnrollmentSuspension ...`
  // `UPDATE PersonModule.PersonLocationAssignment SET EffectiveDateRangeEndDate = '2026-06-30' WHERE ...`

  // Verify preconditions
  `{Pre-execution verification query from section 13 above}`
];
```

### Database Assertion Script (afterEach / expect block)

```typescript
// SQL queries to verify post-execution state
const assertions = {
  programEnrollmentExtension: {
    query: `SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey`,
    expected: {
      HasConflict: {0 or 1},
      ResponseStatusCode: '{SU/SE/FL}',
      TransactionTypeCode: '{O/C/A}',
      IdUniqueClientIdentifier: '{value}',
      SubmittedClientId: '1430000012',
      // MmisEffectiveDate, MmisEndDate, LastSynchronizedTimestamp...
    }
  },
  syncTransactions: {
    query: `SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction WHERE ProgramEnrollmentExtensionKey = @ExtKey ORDER BY Timestamp`,
    expectedRowCount: {N},
    rows: [
      { TransactionTypeCode: '{O/C}', MmisEffectiveDate: '{date}', MmisEndDate: '{date}', ResponseStatusCode: '{SU/FL}' },
      // {additional rows for multi-transaction scenarios}
    ]
  },
  extensionMessages: {
    query: `SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages WHERE ProgramEnrollmentExtensionKey = @ExtKey`,
    expectedRowCount: {0 for success / N for errors},
    // rows: [{ Code: '{code}', Description: '{text}', ClassificationCode: '{Hard/Soft}', ErrorTypeCode: '{01/03/04}' }]
  },
  medicaidNumbers: {
    query: `SELECT * FROM PersonModule.PersonMedicaidNumbers WHERE PersonKey = @PersonKey ORDER BY EffectiveDateRangeStartDate DESC`,
    expectedRowCount: {1 or 2},
    // expected active Value: '{value}'
  }
};
```

### UI Assertions (expect statements)

```typescript
// Post-execution UI state verification
await expect(page.locator('[data-testid="response-status"]')).toHaveText('{SU/FL}');
await expect(page.locator('[data-testid="conflict-chip"]')).{toBeVisible() / toBeHidden()};
await expect(page.locator('[data-testid="resubmit-button"]')).{toBeVisible() / toBeHidden()};
await expect(page.locator('[data-testid="last-sync-timestamp"]')).not.toHaveText(''); // Updated
await expect(page.locator('[data-testid="mmis-errors-table"]')).{toBeVisible() / toBeHidden()};
// {Scenario-specific UI assertions}
```

### Test Data Constants

```typescript
const TEST_DATA = {
  participant: {
    medicaidId: '1430000012',
    personKey: '{GUID}',
    caseKey: '{GUID}',
  },
  enrollment: {
    programEnrollmentKey: '{GUID}',
    programKey: '{IRIS Program GUID}',
    startDate: '{YYYY-MM-DD}',
    endDate: null, // sent as '22991231'
  },
  ica: {
    locationKey: '{GUID}',
    medicaidProviderId: '{value}',
  },
  fea: {
    locationKey: '{GUID}',
    medicaidProviderId: '{value}',
    effectiveStart: '{YYYY-MM-DD}',
    effectiveEnd: '{YYYY-MM-DD or null}',
  },
  // {Scenario-specific data — e.g., suspension dates, new ICA for transfer}
};
```

### Expected Request Payload Shape (for assertion)

```json
{
  "ProcessEnrollment": {
    "enrollmentRequest": {
      "TxnSource": "CMMRT",
      "TxnDate": "{CCYYMMDD}",
      "TxnTime": "{HHMMSS}",
      "TxnRefId": "{S000000001}",
      "IdUniqueClient": "1430000012",
      "NameLast": "{value}",
      "NameFirst": "{value}",
      "DateBirth": "{CCYYMMDD}",
      "NumSsn": "{9-digit}",
      "Sex": "{M/F/U}",
      "AddressType": "IR",
      "WaiverProgramName": "IRIS",
      "WaiverAgencyID": "{ICA Provider ID}",
      "TransactionType": "{O/C}",
      "DateEnrlEff": "{CCYYMMDD}",
      "DateEnrlEnd": "{CCYYMMDD}",
      "Status": "{A/S/I}",
      "StartReasonCode": "{code}",
      "StopReasonCode": "{code}",
      "WaiverFEA": "{FEA Provider ID}",
      "FEAEffectiveDate": "{CCYYMMDD}",
      "FEAEndDate": "{CCYYMMDD}",
      "FEAStatus": "{A/S/I}"
    }
  }
}
```

### Expected Response Payload Shape (for mock or assertion)

```json
{
  "ProcessEnrollmentResult": {
    "TxnRefId": "{S000000001}",
    "IdUniqueClient": "{value — same or different}",
    "SubmittedClientID": "1430000012",
    "ResponseStatus": "{SU/SE/FL}",
    "WaiverProgramName": "IRIS",
    "TransactionType": "{O/C}",
    "EffectiveDate": "{CCYYMMDD}",
    "EndDate": "{CCYYMMDD}",
    "Errors": []
  }
}
```

### Timing / Wait Strategy

| Wait Point | Condition | Timeout |
|------------|-----------|---------|
| After Save/Submit | {e.g., network idle, spinner disappears, toast appears} | {ms} |
| After MMIS round-trip | {e.g., sync status indicator changes, response status appears} | {ms} |
| Before DB assertions | {e.g., wait for async processing to complete} | {ms} |
| Before UI assertions | {e.g., page refresh, DOM update after response processing} | {ms} |
