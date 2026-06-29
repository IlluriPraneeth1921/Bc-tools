# TC-030: Success with Errors (SE Response) — IRIS Enrollment Activated

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-030 |
| Scenario | Success with Errors (SE Response) — IRIS Enrollment Activated |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 1) → S200 → S220 (Condition 1) → S300 |
| Business Rules | BR-D01-001, BR-D01-009, BR-D01-010 |
| Trigger | User adds new IRIS enrollment; MMIS returns "SE" (Success with Errors) |
| Transaction Count | 1 MMIS transaction (accepted with warnings) |
| Transaction Ordering | N/A — single transaction |
| Priority | High |
| Expected Outcome | Success with Errors (SE) — enrollment IS activated |

---

## Preconditions

1. Participant has valid demographics (Medicaid ID, DOB, SSN, Name)
2. Active residential and mailing addresses exist
3. Active ICA assignment exists with valid Medicaid Provider ID
4. Active FEA assignment exists with valid dates spanning enrollment period
5. Enrollment effective dates: Start = 2026-07-01, End = NULL (sent as 22991231)
6. Active ISP exists
7. **Specific condition triggering SE:** A non-critical field has a validation warning
   (e.g., RecertificationDueDate is in the past but not blocking)
8. MMIS returns ResponseStatus = "SE" with warning-level error segment(s)

---

## Database Setup (Pre-Execution State)

> **⚠️ SE TEST CASE:** This test verifies that "SE" (Success with Errors) is sufficient to activate an IRIS enrollment per BR-D01-010. The setup is nearly identical to TC-001 (Happy Path), but MMIS returns SE instead of SU due to a non-critical field warning (e.g., invalid recertification due date).

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
| `PhysicalAddressCountyAreaDisplayName` | e.g., "Dane" | Maps to AdditionalCounty |

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
| `EffectiveDateRangeStartDate` | On or before enrollment begin date | Active |
| `EffectiveDateRangeEndDate` | NULL or after enrollment end date | Spans enrollment |

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
| `EffectiveDateRangeStartDate` | Same as enrollment begin date (2026-07-01) | Spans enrollment |
| `EffectiveDateRangeEndDate` | NULL or >= enrollment end | Spans enrollment |

#### FEA Medicaid Provider ID — `OrganizationModule.LocationIdentifiers`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {FEA Location GUID} | FK to Location |
| `TypeDisplayName` | "Medicaid Provider ID" | Identifier type filter |
| `Value` | e.g., "9876543210" | → WaiverFEA in request |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `EffectiveDateRangeStartDate` | e.g., 2025-01-01 | → RecertificationCompletionDate (may be past) |
| `EffectiveDateRangeEndDate` | e.g., **2025-12-31** | **⚠️ In the past — triggers MMIS warning 9137** |
| Status | Active | Must be active ISP |

> **⚠️ SE Trigger:** The ISP end date is in the past (2025-12-31), making RecertificationDueDate invalid. MMIS returns a field-level warning (ErrorType "04") but still processes the enrollment (SE, not FL).

### 10. New Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {new enrollment GUID} | PK — system generated |
| `ProgramKey` | {IRIS Program GUID} | FK to Program (DisplayName = "IRIS") |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `EnrollmentDateRangeStartDate` | **2026-07-01** | → DateEnrlEff |
| `EnrollmentDateRangeEndDate` | **NULL** | Sent as "22991231" |
| `StatusDisplayName` | "Enrolled" | Triggers enrollment webservice |
| `IsPrimary` | true | |

### 11. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `CaseKey` | {participant's case GUID} | FK to Case |
| `AssignedStaffMemberDisplayName` | e.g., "John Smith" | → WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" or "Level 2" | Role filter |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 12. Pre-Execution: No Prior Sync Records

| Table | Expected State |
|-------|----------------|
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` | No row for this ProgramEnrollmentKey |
| `CustomerProgramEnrollmentModule.SyncTransaction` | No rows |
| `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` | No rows |

### 13. Pre-Execution Verification Query

```sql
-- Verify enrollment is new (no prior sync)
SELECT COUNT(*) FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: 0

-- Verify ISP has past end date (triggers SE warning)
SELECT EffectiveDateRangeEndDate
FROM PersonCenteredPlanModule.PersonCenteredPlan
WHERE CaseKey = '{CaseKey}' AND Status = 'Active'
-- Expected: End date in the past (e.g., 2025-12-31)

-- Verify FEA dates are valid (unlike TC-004/TC-029)
SELECT pla.EffectiveDateRangeStartDate AS FEA_Start, pla.EffectiveDateRangeEndDate AS FEA_End
FROM PersonModule.PersonLocationAssignment pla
WHERE pla.PersonLocationAssignmentTypeDisplayName = 'FEA' AND pla.CaseKey = '{CaseKey}'
-- Expected: FEA dates DO span enrollment (FEA_End is NULL or >= enrollment end)
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 1 (New IRIS enrollment added):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #3: Call S220_Enroll_Add_Update
2. **S200** — Scenario S200 (Single span calculated)
3. **S220** — Condition 1 (New Enrollment Added):
   - Action #2: Call S300 (Column 1 — IRIS)
4. **S300** — Column 1 (IRIS): Constructs and sends enrollment request
5. **MMIS processes** enrollment successfully but returns SE with warning(s)

---

## Request Payload Verification

### Transaction 1: New IRIS Enrollment (S300 Column 1)

> Payload is identical to TC-001 (Happy Path). The difference is in the MMIS RESPONSE, not the request.

#### Key Fields

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | Fixed |
| TransactionType | TransactionType | "O" (Open) | New enrollment |
| DateEnrlEff | DateEnrlEff | "20260701" | Enrollment begin |
| DateEnrlEnd | DateEnrlEnd | "22991231" | Null end → high end |
| Status | Status | "A" (Active) | New enrollment |
| StartReasonCode | StartReasonCode | "2L" (New Enrollment) | Per BR-D01-022 |
| RecertificationDueDate | RecertificationDueDate | **"20251231"** | ISP end date (in the past — triggers warning) |
| WaiverFEA | WaiverFEA | FEA Medicaid Provider ID | Valid |
| FEAEffectiveDate | FEAEffectiveDate | "20260701" | Valid — spans enrollment |
| FEAEndDate | FEAEndDate | "22991231" | Valid — spans enrollment |

---

## Expected MMIS Response

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ResponseStatus | **"SE" (Success with Errors)** | Enrollment accepted WITH warnings |
| WaiverProgramName | "IRIS" | Echoed |
| TransactionType | "O" | Echoed |
| EffectiveDate | "20260701" | Echoed |
| EndDate | "22991231" | Echoed |
| TxnRefId | Same as request TxnRefId | Echoed |
| IdUniqueClient | "1430000012" | No ID swap expected |
| SubmittedClientID | "1430000012" | Echoed |

### Error/Warning Segment (Non-Blocking)

| Field | Expected Value | Notes |
|-------|----------------|-------|
| ErrorCode | "9137" | Recertification due date validation |
| ErrorDescription | "THE RECERTIFICATION DUE DATE IS INVALID" | Field-level warning |
| ErrorType | "04" (Reject Field) | Field rejected but enrollment still processed |

> **⚠️ KEY DISTINCTION:** ErrorType "04" (Reject Field) in an "SE" response means the field has an issue but the overall enrollment is ACCEPTED. This is fundamentally different from ErrorType "01" (Reject Record) in an "FL" response which rejects the entire enrollment.

---

## Critical Business Rule: BR-D01-010

> "A participant enrollment span will not be made active unless Response Status = **SU** (success) or **SE** (success with errors) is received via the Enrollment Response webservice."

**This test verifies:** SE IS sufficient to activate the IRIS enrollment. The enrollment MUST be made active even though warnings exist.

> **⚠️ CONTRAST WITH SDPC (BR-D01-015):** For SDPC, ONLY "SU" activates enrollment. "SE" does NOT activate SDPC enrollment. This test is IRIS-specific. TC-015 verifies the SDPC-specific behavior.

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
| `ProgramEnrollmentExtensionKey` | {new GUID} | Created on sync |
| `HasConflict` | **0 (false)** | **⚠️ KEY: SE is NOT a conflict — enrollment was accepted** |
| `ResponseStatusCode` | **"SE"** | Success with Errors |
| `TransactionTypeCode` | "O" | Open (new enrollment) |
| `TxnRefId` | {captured at runtime} | From request |
| `IdUniqueClientIdentifier` | "1430000012" | From response |
| `SubmittedClientId` | "1430000012" | What was sent |
| `MmisEffectiveDate` | 2026-07-01 (enrollment begin) | From response |
| `MmisEndDate` | 2299-12-31 (open-ended) | From response |
| `LastSynchronizedTimestamp` | Current datetime2 | Updated on sync |

> **⚠️ CRITICAL ASSERTION:** `HasConflict` = 0 (false). SE is a SUCCESS response — it does NOT create a conflict. The enrollment IS activated. This is the key difference from TC-004/TC-029 (FL) where HasConflict = 1.

### 2. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **1 row** (the warning from SE response)

| Column | Expected Value |
|--------|----------------|
| `Code` | "9137" |
| `Description` | "THE RECERTIFICATION DUE DATE IS INVALID" |
| `ClassificationCode` | "Soft" or "Warning" (per classification logic) |
| `ErrorTypeCode` | "04" |
| `Timestamp` | Current datetime2 |

> **⚠️ KEY TEST:** Even though enrollment was accepted (SE), the warning message IS stored in ProgramEnrollmentExtensionMessages. The system must store warnings from SE responses for informational purposes, even though HasConflict = false.

### 3. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransaction
WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
```

Expected: **1 row**

| Column | Expected Value |
|--------|----------------|
| `SyncTransactionKey` | {GUID — auto-generated} |
| `TransactionTypeCode` | "O" |
| `MmisEffectiveDate` | 2026-07-01 |
| `MmisEndDate` | 2299-12-31 |
| `ResponseStatusCode` | "SE" |
| `IdUniqueClientIdentifier` | "1430000012" |
| `SubmittedClientId` | "1430000012" |
| `RequestJsonTextFile` | NOT NULL — full request payload |
| `ResponseJsonTextFile` | NOT NULL — contains SE response with warning |
| `Timestamp` | Current datetime2 |

### 3a. `CustomerProgramEnrollmentModule.SyncTransactionMessages`

```sql
SELECT * FROM CustomerProgramEnrollmentModule.SyncTransactionMessages
WHERE SyncTransactionKey IN (
  SELECT SyncTransactionKey FROM CustomerProgramEnrollmentModule.SyncTransaction
  WHERE ProgramEnrollmentExtensionKey = '{ProgramEnrollmentExtensionKey}'
)
```

Expected: **1 row** (warning preserved at transaction level)

| Column | Expected Value |
|--------|----------------|
| `Code` | "9137" |
| `ErrorTypeCode` | "04" |
| `Description` | "THE RECERTIFICATION DUE DATE IS INVALID" |

### 4. `ProgramEnrollmentModule.ProgramEnrollment` (enrollment IS activated)

```sql
SELECT StatusDisplayName, EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value | Notes |
|--------|----------------|-------|
| `StatusDisplayName` | **"Enrolled"** | **⚠️ KEY: Enrollment IS made active despite SE (per BR-D01-010)** |
| `EnrollmentDateRangeStartDate` | 2026-07-01 | Enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Open-ended |

> **⚠️ CRITICAL ASSERTION:** StatusDisplayName = "Enrolled" (active). SE allows enrollment activation per BR-D01-010. If enrollment is NOT activated after SE response, BR-D01-010 is violated.

### 5. `PersonModule.PersonMedicaidNumbers` (no change)

| Verification | Expected |
|--------------|----------|
| Row count | 1 (unchanged) |
| `Value` | "1430000012" (unchanged) |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | **NOT displayed** — SE is success, not a conflict |
| Response Status display | **"SE"** |
| MMIS Errors table | Shows 1 warning: Code "9137", ErrorType "04" |
| Re-submit button | **HIDDEN** — enrollment was accepted (not a failure) |
| Last Sync timestamp | Updated |
| Enrollment Status | **"Enrolled"** — enrollment IS active |
| Enrollment Begin Date | 07/01/2026 |
| Enrollment End Date | Open-ended |

> **⚠️ KEY UI DISTINCTIONS (SE vs FL):**
> - **SE:** Conflict chip NOT shown, Re-submit button HIDDEN, Enrollment ACTIVE, Warnings shown for info only
> - **FL (TC-004/TC-029):** Conflict chip SHOWN (red), Re-submit button VISIBLE, Enrollment NOT active, Errors shown as blocking

---

## Failure Criteria

### BR-D01-010 Violations (PRIMARY TEST FOCUS)
- Enrollment NOT made active after SE response → BR-D01-010 violated (SE = success)
- HasConflict set to 1 after SE response → incorrect — SE is not a conflict
- System treats SE same as FL (prevents enrollment activation) → wrong behavior
- Re-submit button displayed after SE → incorrect — enrollment was accepted

### SE vs SU Handling Failures
- ResponseStatusCode not stored as "SE" (stored as "SU" or "FL") → status lost
- Warning messages not stored in ProgramEnrollmentExtensionMessages → data loss
- Warning messages not stored in SyncTransactionMessages → data loss
- System ignores SE response entirely (treats as SU without storing warnings)

### SE vs FL Distinction Failures
- HasConflict = 1 for SE (should be 0) — SE is success, not failure
- Enrollment NOT activated for SE but IS activated for SU → partial BR-D01-010 compliance
- Re-submit button shown for SE (should only show for FL)
- Conflict chip shown for SE (should only show for FL)

### IRIS vs SDPC Distinction Failures
- SDPC enrollment activated on SE response → BR-D01-015 violated (SDPC requires SU only)
- This test specifically validates IRIS behavior — if SDPC logic is incorrectly applied to IRIS, enrollment would not activate on SE

### Data Integrity Failures
- ProgramEnrollmentExtensionMessages empty when warning was returned → message not stored
- SyncTransactionMessages empty when warning was returned → message not stored
- ResponseJsonTextFile NULL → audit trail missing

### UI State Failures
- Conflict chip displayed for SE response (should only display for FL)
- Re-submit button visible for SE response (should only show for FL)
- MMIS Errors table empty when warnings exist → UI not reading messages
- Enrollment status not showing as active

---

## Response Status Behavior Matrix

| Response Status | Enrollment Activated? | HasConflict | Re-submit Button | Conflict Chip | Test Case |
|----------------|----------------------|-------------|------------------|---------------|-----------|
| **SU** (Success) | ✅ Yes | 0 (false) | Hidden | Not shown | TC-001 |
| **SE** (Success with Errors) | ✅ **Yes** (IRIS only) | **0 (false)** | **Hidden** | **Not shown** | **TC-030 (this test)** |
| **FL** (Failure) | ❌ No | 1 (true) | Visible | Shown (red) | TC-004, TC-029 |
| **SE** (for SDPC) | ❌ **No** (SDPC only) | 1 (true) | Visible | Shown (red) | (SDPC negative test) |

> This matrix is the core behavioral verification for TC-030. The system MUST distinguish between IRIS (SE = success) and SDPC (SE = failure per BR-D01-015).

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
| **DateEnrlEff** | `ProgramEnrollment.EnrollmentDateRangeStartDate` = 2026-07-01 |
| **DateEnrlEnd** | `ProgramEnrollment.EnrollmentDateRangeEndDate` = NULL → "22991231" |
| **RecertificationDueDate** | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` = **2025-12-31** (past — triggers warning) |
| **WorkerID** | `PersonModule.PersonStaffMemberAssignment` → WHERE ICA Consultant AND active → truncated to 8 chars |
| **FEAEffectiveDate** | Same as DateEnrlEff (2026-07-01) |
| **FEAEndDate** | Same as DateEnrlEnd (22991231) |

---

## Related Test Cases

- TC-001: New IRIS Enrollment Happy Path (SU response — enrollment activated, no warnings)
- TC-004: Hard Error — FEA Dates (FL response — enrollment NOT activated)
- TC-029: Multiple MMIS Errors (FL response — multiple errors prevent activation)
- TC-015: New SDPC Enrollment (SDPC uses SU only — SE would NOT activate SDPC)
- TC-005: Medicaid ID Mismatch (SU response with ID swap — different SE-adjacent behavior)
