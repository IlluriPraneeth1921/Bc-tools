# Shared Test Participant — Enrollment Service Testing

---

## Index

1. [Participant Identifier](#participant-identifier)
2. [Purpose](#purpose)
3. [Baseline Data Profile](#baseline-data-profile)
4. [Additional Test Data (Used by Specific Tests)](#additional-test-data-used-by-specific-tests)
5. [Key GUIDs to Capture at Setup](#key-guids-to-capture-at-setup)
6. [Baseline Verification Queries](#baseline-verification-queries)
7. [Post-Execution State Queries](#post-execution-state-queries)
8. [Data Dependencies by Test Phase](#data-dependencies-by-test-phase)
9. [Sample SQL Setup Scripts](#sample-sql-setup-scripts)
10. [Important Notes](#important-notes)
11. [Glossary](#glossary)

---

## Participant Identifier

| Attribute | Value |
|-----------|-------|
| **Medicaid ID (MA ID)** | **1430000012** |
| Used In | All 32 test cases (TC-001 through TC-032) |

---

## Purpose

This participant is used across all Enrollment Service test cases. The test team must ensure this participant exists in the Carity database with the baseline data described below before executing any test case.

Individual test cases layer additional state on top of this baseline (suspensions, agency transfers, disenrollments). The test execution order in TEST_INVENTORY.md defines prerequisite chains.

---

## Baseline Data Profile

The following data must exist **before TC-001 (first test case) execution**.

### 1. Person Demographics — `PersonModule.Person`

| Column | Value | MMIS Mapping |
|--------|-------|--------------|
| `PersonKey` | {test participant GUID} | PK — FK throughout |
| `NameLastName` | "TESTLAST" | → NameLast (first 20 chars) |
| `NameFirstName` | "TESTFIRST" | → NameFirst (first 15 chars) |
| `NameMiddleName` | "M" | → NameMi (optional) |
| `NameSuffixName` | "JR" | → NameSuffix (must be in: I, II, III, IV, JR, SR, V, VI, VII) |
| `BirthDate` | 1985-03-15 | → DateBirth ("19850315") |
| `BirthAssignedGenderDisplayName` | "Male" | → Sex ("M") |

### 2. Medicaid ID — `PersonModule.PersonMedicaidNumbers`

| Column | Value | Notes |
|--------|-------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `Value` | **"1430000012"** | → IdUniqueClient |
| `StatusDisplayName` | "Active" | |
| `StatusIdentifier` | (active status code) | |
| `IsOriginal` | true | |
| `EffectiveDateRangeStartDate` | 2020-01-01 (or valid past date) | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 3. SSN — `PersonModule.PersonIdentifiers`

| Column | Value | Notes |
|--------|-------|-------|
| `PersonKey` | {test participant GUID} | FK to Person |
| `TypeDisplayName` | "Social Security Number" | |
| `Value` | "012345678" | → NumSsn (9-digit zero-padded) |
| `EffectiveDateRangeStartDate` | 2020-01-01 (or valid past date) | |

### 4. Residential Address — `PersonModule.PersonAddress`

| Column | Value | MMIS Mapping |
|--------|-------|--------------|
| `PersonAddressKey` | {GUID} | PK |
| `PersonKey` | {test participant GUID} | FK |
| `AddressTypeDisplayName` | "Residential" | → AddressType "IR" |
| `IsActive` | true | Per BR-D01-023 |
| `IsPrimary` | true | Per BR-D01-023 |
| `PhysicalAddressCareOfName` | "C/O JOHN DOE" | → Address1 |
| `PhysicalAddressFirstStreetAddress` | "123 MAIN ST" | → Address2 (required) |
| `PhysicalAddressSecondStreetAddress` | "APT 4B" | → Address3 |
| `PhysicalAddressCityName` | "MADISON" | → City |
| `PhysicalAddressStateProvinceDisplayName` | "Wisconsin" | → State ("WI") |
| `PhysicalAddressPostalCode` | "537011234" | → ZipCode "53701" + ZipCode4 "1234" |
| `PhysicalAddressCountyAreaDisplayName` | "Dane" | → County (2-digit MMIS code) |

### 5. Mailing Address — `PersonModule.PersonAddress`

| Column | Value | MMIS Mapping |
|--------|-------|--------------|
| `PersonAddressKey` | {GUID — different from residential} | PK |
| `PersonKey` | {test participant GUID} | FK |
| `AddressTypeDisplayName` | "Mailing" | → AdditionalAddressType "IM" |
| `IsActive` | true | Per BR-D01-024 |
| `IsPrimary` | true | Primary mailing (happy path) |
| `PhysicalAddressCareOfName` | "C/O JANE DOE" | → AdditionalAddress1 |
| `PhysicalAddressFirstStreetAddress` | "PO BOX 456" | → AdditionalAddress2 (required) |
| `PhysicalAddressSecondStreetAddress` | NULL | → AdditionalAddress3 (spaces) |
| `PhysicalAddressCityName` | "MADISON" | → AdditionalCity |
| `PhysicalAddressStateProvinceDisplayName` | "Wisconsin" | → AdditionalState ("WI") |
| `PhysicalAddressPostalCode` | "537011234" | → AdditionalZipCode/ZipCode4 |
| `PhysicalAddressCountyAreaDisplayName` | "Dane" | → AdditionalCounty |

### 6. Phone Numbers — `PersonModule.PersonPhones`

**Two records required** (one for Address Node, one for Additional Address Node):

| Record | PhoneNumber | TypeDisplayName | IsPrimary | MMIS Field |
|--------|-------------|----------------|-----------|------------|
| Primary | "6085551234" | "Home" | true | NumPhone / IndPhone = "H" |
| Secondary | "6085559876" | "Cell" | false | AdditionalNumPhone / AdditionalIndPhone = "C" |

### 7. ICA Assignment (Agency A) — `PersonModule.PersonLocationAssignment`

| Column | Value | Notes |
|--------|-------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {ICA Location GUID — Agency A} | FK → Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | |
| `EffectiveDateRangeStartDate` | 2026-01-01 (before enrollment begin) | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

**ICA Agency A — Medicaid Provider ID** (`OrganizationModule.LocationIdentifiers`):

| Column | Value |
|--------|-------|
| `LocationKey` | {ICA Location GUID — Agency A} |
| `TypeDisplayName` | "Medicaid Provider ID" |
| `Value` | **"1234567890"** |

### 8. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Value | Notes |
|--------|-------|-------|
| `PersonLocationAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK to Case |
| `LocationKey` | {FEA Location GUID} | FK → Medicaid Provider ID |
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | |
| `EffectiveDateRangeStartDate` | 2026-07-01 (same as enrollment begin) | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL | Active |

**FEA — Medicaid Provider ID** (`OrganizationModule.LocationIdentifiers`):

| Column | Value |
|--------|-------|
| `LocationKey` | {FEA Location GUID} |
| `TypeDisplayName` | "Medicaid Provider ID" |
| `Value` | **"9876543210"** |

### 9. ISP (Person Centered Plan) — `PersonCenteredPlanModule.PersonCenteredPlan`

| Column | Value | MMIS Mapping |
|--------|-------|--------------|
| `PersonCenteredPlanKey` | {GUID} | PK |
| `EffectiveDateRangeStartDate` | 2026-01-01 | → RecertificationCompletionDate |
| `EffectiveDateRangeEndDate` | 2026-12-31 | → RecertificationDueDate |
| Status | Active | |

### 10. Worker Assignment — `PersonModule.PersonStaffMemberAssignment`

| Column | Value | Notes |
|--------|-------|-------|
| `PersonStaffMemberAssignmentKey` | {GUID} | PK |
| `CaseKey` | {participant's case GUID} | FK |
| `AssignedStaffMemberKey` | {Staff GUID} | FK to StaffMember |
| `AssignedStaffMemberDisplayName` | "John Smith" | → WorkerID = "J.Smith" (8 chars) |
| `AssignmentTypeSystemRoleDisplayName` | "ICA - IRIS Consultant Level 1" | Role filter |
| `EffectiveDateRangeStartDate` | 2026-01-01 | |
| `EffectiveDateRangeEndDate` | NULL | Currently active |

### 11. County of Responsibility — `PersonModule.PersonAttributes`

| Column | Value | Notes |
|--------|-------|-------|
| `PersonKey` | {test participant GUID} | FK |
| `TypeDisplayName` | "County of Responsibility" | |
| `ValueDisplayName` | "Dane" | → CountyofResponsibility (2-digit MMIS code) |

### 12. IRIS Program Enrollment (created by TC-001)

| Column | Value | Notes |
|--------|-------|-------|
| `ProgramEnrollmentKey` | {GUID — created at test time} | PK |
| `ProgramKey` | {IRIS Program GUID} | WHERE DisplayName = "IRIS" |
| `CaseKey` | {participant's case GUID} | FK |
| `EnrollmentDateRangeStartDate` | **2026-07-01** | Enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | → "22991231" to MMIS |
| `StatusDisplayName` | "Enrolled" | Triggers webservice |
| `IsPrimary` | true | |

---

## Additional Test Data (Used by Specific Tests)

### ICA Agency B (Transfer Target) — Used by TC-003, TC-017, TC-031

| Item | Value |
|------|-------|
| Location GUID | {NEW ICA Location GUID — Agency B} |
| Medicaid Provider ID | **"9876543210"** |
| Created when | User performs ICA transfer (triggering event) |
| Used in | TC-003, TC-017, TC-031 |

### SDPC Program Data — Used by TC-015, TC-018, TC-026, TC-027

| Item | Value | Notes |
|------|-------|-------|
| Program GUID | {SDPC Program GUID} | WHERE DisplayName = "SDPC" |
| SDPC Agency Location GUID | {SDPC Oversight Agency GUID} | |
| SDPC Agency Medicaid Provider ID | (SDPC-specific value) | → SDPCAgencyID |
| SDPC Worker Role | "SDPC Nurse" (IsPrimary = true) | Truncated to 15 chars for SDPC WorkerID |

### Suspension Data (Created by TC-002, TC-010)

| Scenario | Begin Date | End Date | Notes |
|----------|-----------|----------|-------|
| Bounded suspension (TC-002) | 2026-08-14 | 2026-09-14 | Creates Span-A/B/C in MMIS |
| Open-ended suspension (TC-010) | 2026-08-14 | NULL | Creates Span-A/B only (no Span-C) |

---

## Key GUIDs to Capture at Setup

Before test execution, record these values from the database for use across all test cases:

| Item | How to Find | Used For |
|------|-------------|----------|
| `PersonKey` | Query PersonMedicaidNumbers WHERE Value = '1430000012' | FK in all tables |
| `CaseKey` | Derived from PersonKey → Case relationship | FK for assignments, enrollment |
| `ICA Agency A LocationKey` | LocationIdentifiers WHERE Value = '1234567890' AND Type = 'Medicaid Provider ID' | ICA assignment |
| `ICA Agency B LocationKey` | LocationIdentifiers WHERE Value = '9876543210' AND Type = 'Medicaid Provider ID' | ICA transfer target |
| `FEA LocationKey` | LocationIdentifiers WHERE Value = FEA provider ID AND Type = 'Medicaid Provider ID' | FEA assignment |
| `IRIS ProgramKey` | Program WHERE DisplayName = 'IRIS' | Enrollment FK |
| `SDPC ProgramKey` | Program WHERE DisplayName = 'SDPC' | SDPC enrollment FK |
| `ProgramEnrollmentKey` | Created by TC-001, captured post-execution | Used by all subsequent TCs |

---

## Baseline Verification Queries

Run these before TC-001 to confirm the participant is ready for testing.

### Find PersonKey from MA ID

```sql
SELECT pmn.PersonKey, p.NameFirstName, p.NameLastName, p.BirthDate,
       p.BirthAssignedGenderDisplayName
FROM PersonModule.PersonMedicaidNumbers pmn
JOIN PersonModule.Person p ON p.PersonKey = pmn.PersonKey
WHERE pmn.Value = '1430000012'
  AND pmn.StatusDisplayName = 'Active'
```

### Verify Demographics Complete

```sql
SELECT PersonKey, NameLastName, NameFirstName, NameMiddleName,
       NameSuffixName, BirthDate, BirthAssignedGenderDisplayName
FROM PersonModule.Person
WHERE PersonKey = '{PersonKey}'
-- Expected: All fields populated per baseline data profile
```

### Verify SSN Exists

```sql
SELECT Value, TypeDisplayName
FROM PersonModule.PersonIdentifiers
WHERE PersonKey = '{PersonKey}'
  AND TypeDisplayName = 'Social Security Number'
-- Expected: Value = '012345678'
```

### Verify Addresses (Residential + Mailing)

```sql
SELECT AddressTypeDisplayName, IsActive, IsPrimary,
       PhysicalAddressFirstStreetAddress, PhysicalAddressCityName,
       PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
       PhysicalAddressCountyAreaDisplayName
FROM PersonModule.PersonAddress
WHERE PersonKey = '{PersonKey}' AND IsActive = 1
ORDER BY AddressTypeDisplayName
-- Expected: 2 rows (Mailing + Residential), both active, both IsPrimary = true
```

### Verify Phone Numbers (Primary + Secondary)

```sql
SELECT PhoneNumber, TypeDisplayName, IsPrimary
FROM PersonModule.PersonPhones
WHERE PersonKey = '{PersonKey}'
ORDER BY IsPrimary DESC
-- Expected: 2 rows — ('6085551234', 'Home', true) and ('6085559876', 'Cell', false)
```

### Verify ICA Assignment (Agency A)

```sql
SELECT pla.PersonLocationAssignmentTypeDisplayName,
       pla.EffectiveDateRangeStartDate, pla.EffectiveDateRangeEndDate,
       li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}'
  AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND pla.EffectiveDateRangeEndDate IS NULL
-- Expected: 1 row, MedicaidProviderID = '1234567890'
```

### Verify FEA Assignment

```sql
SELECT pla.PersonLocationAssignmentTypeDisplayName,
       pla.EffectiveDateRangeStartDate, pla.EffectiveDateRangeEndDate,
       li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}'
  AND pla.PersonLocationAssignmentTypeDisplayName = 'FEA'
  AND pla.EffectiveDateRangeEndDate IS NULL
-- Expected: 1 row, StartDate = enrollment begin, MedicaidProviderID populated
```

### Verify ISP Exists

```sql
SELECT EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM PersonCenteredPlanModule.PersonCenteredPlan
WHERE PersonKey = '{PersonKey}' -- or join via CaseKey
  AND Status = 'Active'
-- Expected: 1 row, StartDate <= enrollment begin, EndDate after enrollment begin
```

### Verify Worker Assignment

```sql
SELECT psma.AssignedStaffMemberDisplayName,
       psma.AssignmentTypeSystemRoleDisplayName,
       psma.EffectiveDateRangeStartDate, psma.EffectiveDateRangeEndDate
FROM PersonModule.PersonStaffMemberAssignment psma
WHERE psma.CaseKey = '{CaseKey}'
  AND psma.AssignmentTypeSystemRoleDisplayName LIKE 'ICA - IRIS Consultant%'
  AND psma.EffectiveDateRangeEndDate IS NULL
-- Expected: 1 row, DisplayName present (for WorkerID derivation)
```

### Verify County of Responsibility

```sql
SELECT TypeDisplayName, ValueDisplayName
FROM PersonModule.PersonAttributes
WHERE PersonKey = '{PersonKey}'
  AND TypeDisplayName = 'County of Responsibility'
-- Expected: 1 row, ValueDisplayName = 'Dane'
```

### Verify No Prior MMIS Sync (Pre-TC-001 Only)

```sql
SELECT COUNT(*) AS SyncCount
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName = 'IRIS'
  AND pe.CaseKey = '{CaseKey}'
-- Expected: 0 (no prior sync records — clean state for TC-001)
```

---

## Post-Execution State Queries

After test execution, use these to check the current MMIS sync state.

### Current Enrollment Status

```sql
SELECT pe.ProgramEnrollmentKey, pe.StatusDisplayName, pe.StatusReasonDisplayName,
       pe.EnrollmentDateRangeStartDate, pe.EnrollmentDateRangeEndDate,
       p.DisplayName AS ProgramName
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE pe.CaseKey = '{CaseKey}'
  AND p.DisplayName IN ('IRIS', 'SDPC')
ORDER BY p.DisplayName, pe.EnrollmentDateRangeStartDate
```

### Current Sync State (Extension + Most Recent Transaction)

```sql
SELECT pee.ResponseStatusCode, pee.HasConflict, pee.TransactionTypeCode,
       pee.TxnRefId, pee.MmisEffectiveDate, pee.MmisEndDate,
       pee.LastSynchronizedTimestamp, pee.LastChangeTypeCode,
       pee.IdUniqueClientIdentifier, pee.SubmittedClientId
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

### Full Transaction History

```sql
SELECT st.SyncTransactionKey, st.TransactionTypeCode, st.ResponseStatusCode,
       st.TxnRefId, st.MmisEffectiveDate, st.MmisEndDate,
       st.ChangeTypeCode, st.Timestamp,
       st.IdUniqueClientIdentifier, st.SubmittedClientId
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
ORDER BY st.Timestamp ASC
```

### Error Messages (if any)

```sql
SELECT peem.Code, peem.Description, peem.ErrorTypeCode
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages peem
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = peem.ProgramEnrollmentExtensionKey
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

### ICA Assignment History (after transfers)

```sql
SELECT pla.PersonLocationAssignmentTypeDisplayName,
       pla.EffectiveDateRangeStartDate, pla.EffectiveDateRangeEndDate,
       li.Value AS MedicaidProviderID
FROM PersonModule.PersonLocationAssignment pla
JOIN OrganizationModule.LocationIdentifiers li ON li.LocationKey = pla.LocationKey
  AND li.TypeDisplayName = 'Medicaid Provider ID'
WHERE pla.CaseKey = '{CaseKey}'
  AND pla.PersonLocationAssignmentTypeDisplayName = 'ICA'
ORDER BY pla.EffectiveDateRangeStartDate
-- After TC-003/TC-017/TC-031: expect 2 rows (old ended, new active)
```

---

## Data Dependencies by Test Phase

| Phase | Prerequisite State | Tests |
|-------|-------------------|-------|
| Phase 1 | Baseline only (clean participant, no enrollment synced) | TC-001, TC-004, TC-015, TC-029, TC-030 |
| Phase 2 | Active IRIS enrollment synced (TC-001 SU) | TC-002–TC-003, TC-005–TC-006, TC-010–TC-011, TC-014, TC-016, TC-019–TC-020 |
| Phase 3 | Disenrolled (TC-006 end-dated enrollment) | TC-007, TC-009, TC-032 |
| Phase 4 | Separate active enrollment (fresh TC-001) | TC-008 |
| Phase 5 | Bounded suspension synced (TC-001 + TC-002 SU) | TC-012, TC-017, TC-021–TC-025, TC-028, TC-031 |
| Phase 6 | Open-ended suspension synced (TC-001 + TC-010 SU) | TC-013 |
| Phase 7 | SDPC enrollment synced (TC-015 SU) | TC-018, TC-026 |
| Phase 8 | SDPC suspension synced (TC-015 + TC-018 SU) | TC-027 |

---

## Sample SQL Setup Scripts

The following scripts create the test participant data in Carity. They cover the major scenarios:

- **Script 1:** Baseline participant (covers TC-001, TC-004, TC-005, TC-014, TC-015, TC-029, TC-030)
- **Script 2:** Simulate successful TC-001 sync state (prerequisite for Phase 2 tests)
- **Script 3:** Add bounded suspension (prerequisite for Phase 5 tests)
- **Script 4:** Disenroll participant (prerequisite for Phase 3 tests)
- **Script 5:** ICA transfer setup (Agency B for TC-003, TC-017, TC-031)
- **Script 6:** SDPC enrollment setup (prerequisite for Phase 7 tests)
- **Script 7:** Teardown / reset to baseline

> **⚠️ Important:** Replace all `{GUID}` placeholders with actual NEWID() values or pre-generated GUIDs appropriate to your environment. Adjust dates as needed for your test timeline.

---

### Script 1: Create Baseline Participant (Phase 1)

Covers: TC-001, TC-004, TC-005, TC-014, TC-015, TC-029, TC-030

```sql
-- ============================================================
-- SCRIPT 1: BASELINE PARTICIPANT SETUP
-- Run this ONCE to create the test participant from scratch.
-- After this, TC-001 (New IRIS Enrollment) can be executed.
-- ============================================================

-- Variables (generate once and reuse across all scripts)
DECLARE @PersonKey              UNIQUEIDENTIFIER = NEWID();
DECLARE @CaseKey                UNIQUEIDENTIFIER = NEWID();
DECLARE @ResidentialAddressKey  UNIQUEIDENTIFIER = NEWID();
DECLARE @MailingAddressKey      UNIQUEIDENTIFIER = NEWID();
DECLARE @ICALocationKey_AgencyA UNIQUEIDENTIFIER = NEWID();
DECLARE @FEALocationKey         UNIQUEIDENTIFIER = NEWID();
DECLARE @ICAAssignmentKey       UNIQUEIDENTIFIER = NEWID();
DECLARE @FEAAssignmentKey       UNIQUEIDENTIFIER = NEWID();
DECLARE @ISPKey                 UNIQUEIDENTIFIER = NEWID();
DECLARE @WorkerAssignmentKey    UNIQUEIDENTIFIER = NEWID();
DECLARE @StaffMemberKey         UNIQUEIDENTIFIER = NEWID();

-- Store these for later scripts
PRINT 'PersonKey: '             + CAST(@PersonKey AS NVARCHAR(36));
PRINT 'CaseKey: '               + CAST(@CaseKey AS NVARCHAR(36));
PRINT 'ICALocationKey_AgencyA: '+ CAST(@ICALocationKey_AgencyA AS NVARCHAR(36));
PRINT 'FEALocationKey: '        + CAST(@FEALocationKey AS NVARCHAR(36));

-- 1. Person Demographics
INSERT INTO PersonModule.Person (
    PersonKey, NameLastName, NameFirstName, NameMiddleName,
    NameSuffixName, BirthDate, BirthAssignedGenderDisplayName
) VALUES (
    @PersonKey, 'TESTLAST', 'TESTFIRST', 'M',
    'JR', '1985-03-15', 'Male'
);

-- 2. Medicaid ID
INSERT INTO PersonModule.PersonMedicaidNumbers (
    PersonKey, Value, StatusDisplayName, IsOriginal,
    EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
) VALUES (
    @PersonKey, '1430000012', 'Active', 1,
    '2020-01-01', NULL
);

-- 3. SSN
INSERT INTO PersonModule.PersonIdentifiers (
    PersonKey, TypeDisplayName, Value, EffectiveDateRangeStartDate
) VALUES (
    @PersonKey, 'Social Security Number', '012345678', '2020-01-01'
);

-- 4. Residential Address
INSERT INTO PersonModule.PersonAddress (
    PersonAddressKey, PersonKey, AddressTypeDisplayName,
    IsActive, IsPrimary,
    PhysicalAddressCareOfName, PhysicalAddressFirstStreetAddress,
    PhysicalAddressSecondStreetAddress, PhysicalAddressCityName,
    PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
    PhysicalAddressCountyAreaDisplayName
) VALUES (
    @ResidentialAddressKey, @PersonKey, 'Residential',
    1, 1,
    'C/O JOHN DOE', '123 MAIN ST',
    'APT 4B', 'MADISON',
    'Wisconsin', '537011234',
    'Dane'
);

-- 5. Mailing Address
INSERT INTO PersonModule.PersonAddress (
    PersonAddressKey, PersonKey, AddressTypeDisplayName,
    IsActive, IsPrimary,
    PhysicalAddressCareOfName, PhysicalAddressFirstStreetAddress,
    PhysicalAddressSecondStreetAddress, PhysicalAddressCityName,
    PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
    PhysicalAddressCountyAreaDisplayName
) VALUES (
    @MailingAddressKey, @PersonKey, 'Mailing',
    1, 1,
    'C/O JANE DOE', 'PO BOX 456',
    NULL, 'MADISON',
    'Wisconsin', '537011234',
    'Dane'
);

-- 6. Phone Numbers (Primary + Secondary)
INSERT INTO PersonModule.PersonPhones (PersonKey, PhoneNumber, TypeDisplayName, IsPrimary)
VALUES (@PersonKey, '6085551234', 'Home', 1);

INSERT INTO PersonModule.PersonPhones (PersonKey, PhoneNumber, TypeDisplayName, IsPrimary)
VALUES (@PersonKey, '6085559876', 'Cell', 0);

-- 7. ICA Agency A — Location + Identifier
-- (Only needed if Agency A location doesn't already exist in the system)
INSERT INTO OrganizationModule.LocationIdentifiers (
    LocationKey, TypeDisplayName, Value, EffectiveDateRangeStartDate
) VALUES (
    @ICALocationKey_AgencyA, 'Medicaid Provider ID', '1234567890', '2020-01-01'
);

-- ICA Assignment (Agency A)
INSERT INTO PersonModule.PersonLocationAssignment (
    PersonLocationAssignmentKey, CaseKey, LocationKey,
    PersonLocationAssignmentTypeDisplayName,
    EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
) VALUES (
    @ICAAssignmentKey, @CaseKey, @ICALocationKey_AgencyA,
    'ICA',
    '2026-01-01', NULL
);

-- 8. FEA — Location + Identifier
INSERT INTO OrganizationModule.LocationIdentifiers (
    LocationKey, TypeDisplayName, Value, EffectiveDateRangeStartDate
) VALUES (
    @FEALocationKey, 'Medicaid Provider ID', '9876543210', '2020-01-01'
);

-- FEA Assignment
INSERT INTO PersonModule.PersonLocationAssignment (
    PersonLocationAssignmentKey, CaseKey, LocationKey,
    PersonLocationAssignmentTypeDisplayName,
    EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
) VALUES (
    @FEAAssignmentKey, @CaseKey, @FEALocationKey,
    'FEA',
    '2026-07-01', NULL
);

-- 9. ISP (Person Centered Plan)
INSERT INTO PersonCenteredPlanModule.PersonCenteredPlan (
    PersonCenteredPlanKey,
    EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
    -- Add Status column if applicable
) VALUES (
    @ISPKey,
    '2026-01-01', '2026-12-31'
);

-- 10. Worker Assignment
INSERT INTO PersonModule.PersonStaffMemberAssignment (
    PersonStaffMemberAssignmentKey, CaseKey,
    AssignedStaffMemberKey, AssignedStaffMemberDisplayName,
    AssignmentTypeSystemRoleDisplayName,
    EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
) VALUES (
    @WorkerAssignmentKey, @CaseKey,
    @StaffMemberKey, 'John Smith',
    'ICA - IRIS Consultant Level 1',
    '2026-01-01', NULL
);

-- 11. County of Responsibility
INSERT INTO PersonModule.PersonAttributes (
    PersonKey, TypeDisplayName, ValueDisplayName
) VALUES (
    @PersonKey, 'County of Responsibility', 'Dane'
);

-- DONE: Participant is ready for TC-001 execution.
```

---

### Script 2: Simulate Successful TC-001 Sync (Phase 2 Prerequisite)

Use this if you want to skip executing TC-001 and directly set up the post-TC-001 state for Phase 2 tests.

```sql
-- ============================================================
-- SCRIPT 2: SIMULATE TC-001 SUCCESSFUL SYNC
-- Creates the enrollment + sync records as if TC-001 ran with SU response.
-- After this, Phase 2 tests can execute directly.
-- ============================================================

DECLARE @PersonKey              UNIQUEIDENTIFIER = '{PersonKey from Script 1}';
DECLARE @CaseKey                UNIQUEIDENTIFIER = '{CaseKey from Script 1}';
DECLARE @ProgramEnrollmentKey   UNIQUEIDENTIFIER = NEWID();
DECLARE @ProgramExtensionKey    UNIQUEIDENTIFIER = NEWID();
DECLARE @SyncTransactionKey     UNIQUEIDENTIFIER = NEWID();
DECLARE @IRISProgramKey         UNIQUEIDENTIFIER = '{lookup IRIS ProgramKey}';
DECLARE @EnrollmentBegin        DATE = '2026-07-01';

-- 1. Create IRIS Program Enrollment
INSERT INTO ProgramEnrollmentModule.ProgramEnrollment (
    ProgramEnrollmentKey, ProgramKey, CaseKey,
    EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate,
    StatusDisplayName, IsPrimary
) VALUES (
    @ProgramEnrollmentKey, @IRISProgramKey, @CaseKey,
    @EnrollmentBegin, NULL,
    'Enrolled', 1
);

-- 2. Create ProgramEnrollmentExtension (simulates successful sync)
INSERT INTO CustomerProgramEnrollmentModule.ProgramEnrollmentExtension (
    ProgramEnrollmentExtensionKey, ProgramEnrollmentKey,
    HasConflict, ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    LastSynchronizedTimestamp, LastChangeTypeCode
) VALUES (
    @ProgramExtensionKey, @ProgramEnrollmentKey,
    0, 'SU', 'O',
    'S000000001', '1430000012', '1430000012',
    @EnrollmentBegin, '2299-12-31',
    GETDATE(), 'NewEnrollment'
);

-- 3. Create SyncTransaction record
INSERT INTO CustomerProgramEnrollmentModule.SyncTransaction (
    SyncTransactionKey, ProgramEnrollmentExtensionKey,
    ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    ChangeTypeCode, Timestamp,
    RequestJsonTextFile
) VALUES (
    @SyncTransactionKey, @ProgramExtensionKey,
    'SU', 'O',
    'S000000001', '1430000012', '1430000012',
    @EnrollmentBegin, '2299-12-31',
    'NewEnrollment', GETDATE(),
    '{"TxnSource":"CMMRT","WaiverProgramName":"IRIS","TransactionType":"O","Status":"A"}'
);

PRINT 'ProgramEnrollmentKey: ' + CAST(@ProgramEnrollmentKey AS NVARCHAR(36));
PRINT 'ProgramExtensionKey: '  + CAST(@ProgramExtensionKey AS NVARCHAR(36));
-- DONE: Phase 2 tests can now execute.
```

---

### Script 3: Add Bounded Suspension (Phase 5 Prerequisite)

Simulates TC-002 having run successfully — creates the 3-span MMIS state needed by TC-012, TC-017, TC-021–TC-025, TC-028, TC-031.

```sql
-- ============================================================
-- SCRIPT 3: SIMULATE TC-002 (BOUNDED SUSPENSION SYNCED)
-- Creates suspension + 3 sync transactions as if MMIS returned SU for all.
-- Prerequisite: Script 2 must have run first.
-- ============================================================

DECLARE @ProgramEnrollmentKey   UNIQUEIDENTIFIER = '{from Script 2}';
DECLARE @ProgramExtensionKey    UNIQUEIDENTIFIER = '{from Script 2}';
DECLARE @SyncTxn1Key            UNIQUEIDENTIFIER = NEWID();
DECLARE @SyncTxn2Key            UNIQUEIDENTIFIER = NEWID();
DECLARE @SyncTxn3Key            UNIQUEIDENTIFIER = NEWID();

DECLARE @SuspensionBegin        DATE = '2026-08-14';  -- BC suspension begin
DECLARE @SuspensionEnd          DATE = '2026-09-14';  -- BC suspension end
DECLARE @MMISSpanBBegin         DATE = '2026-08-15';  -- +1 day offset
DECLARE @MMISSpanBEnd           DATE = '2026-09-13';  -- -1 day offset

-- 1. Add suspension record to enrollment
-- (Adjust table/column names to match actual Carity schema for suspensions)
INSERT INTO ProgramEnrollmentModule.ProgramEnrollmentSuspension (
    ProgramEnrollmentSuspensionKey, ProgramEnrollmentKey,
    DateRangeStartDate, DateRangeEndDate
) VALUES (
    NEWID(), @ProgramEnrollmentKey,
    @SuspensionBegin, @SuspensionEnd
);

-- 2. Sync Transaction: S500 — Close Span-A (enrollment begin → suspension begin)
INSERT INTO CustomerProgramEnrollmentModule.SyncTransaction (
    SyncTransactionKey, ProgramEnrollmentExtensionKey,
    ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    ChangeTypeCode, Timestamp, RequestJsonTextFile
) VALUES (
    @SyncTxn1Key, @ProgramExtensionKey,
    'SU', 'C',
    'S000000002', '1430000012', '1430000012',
    '2026-07-01', @SuspensionBegin,
    'EnrolledToSuspended', GETDATE(),
    '{"TransactionType":"C","Status":"A","StartReasonCode":"2I","StopReasonCode":"2I"}'
);

-- 3. Sync Transaction: S510 — Add Suspense Span-B
INSERT INTO CustomerProgramEnrollmentModule.SyncTransaction (
    SyncTransactionKey, ProgramEnrollmentExtensionKey,
    ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    ChangeTypeCode, Timestamp, RequestJsonTextFile
) VALUES (
    @SyncTxn2Key, @ProgramExtensionKey,
    'SU', 'O',
    'S000000003', '1430000012', '1430000012',
    @MMISSpanBBegin, @MMISSpanBEnd,
    'EnrolledToSuspended', GETDATE(),
    '{"TransactionType":"O","Status":"S","StartReasonCode":"2I","StopReasonCode":"2I"}'
);

-- 4. Sync Transaction: S520 — Create Span-C (suspension end → enrollment end)
INSERT INTO CustomerProgramEnrollmentModule.SyncTransaction (
    SyncTransactionKey, ProgramEnrollmentExtensionKey,
    ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    ChangeTypeCode, Timestamp, RequestJsonTextFile
) VALUES (
    @SyncTxn3Key, @ProgramExtensionKey,
    'SU', 'O',
    'S000000004', '1430000012', '1430000012',
    @SuspensionEnd, '2299-12-31',
    'EnrolledToSuspended', GETDATE(),
    '{"TransactionType":"O","Status":"A","StartReasonCode":"2Q"}'
);

-- 5. Update ProgramEnrollmentExtension to reflect latest state
UPDATE CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
SET LastSynchronizedTimestamp = GETDATE(),
    LastChangeTypeCode = 'EnrolledToSuspended',
    MmisEffectiveDate = @SuspensionEnd,
    MmisEndDate = '2299-12-31',
    TransactionTypeCode = 'O',
    TxnRefId = 'S000000004'
WHERE ProgramEnrollmentExtensionKey = @ProgramExtensionKey;

-- DONE: MMIS has 3 spans (Span-A closed, Span-B suspended, Span-C active).
-- Phase 5 tests can now execute.
```

---

### Script 4: Disenroll Participant (Phase 3 Prerequisite)

Simulates TC-006 — enrollment end date set to earlier date. Creates the state needed by TC-007, TC-009, TC-032.

```sql
-- ============================================================
-- SCRIPT 4: SIMULATE TC-006 (DISENROLLMENT)
-- End-dates the enrollment and adds the closure sync transaction.
-- Prerequisite: Script 2 must have run first.
-- ============================================================

DECLARE @ProgramEnrollmentKey   UNIQUEIDENTIFIER = '{from Script 2}';
DECLARE @ProgramExtensionKey    UNIQUEIDENTIFIER = '{from Script 2}';
DECLARE @DisenrollEndDate       DATE = '2026-08-31';  -- Must be in the past for TC-032

-- 1. Update enrollment end date
UPDATE ProgramEnrollmentModule.ProgramEnrollment
SET EnrollmentDateRangeEndDate = @DisenrollEndDate,
    StatusDisplayName = 'Disenrolled',
    StatusReasonDisplayName = 'No Medicaid Eligibility'  -- Maps to StopReasonCode '65'
WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey;

-- 2. Add closure sync transaction (S340)
INSERT INTO CustomerProgramEnrollmentModule.SyncTransaction (
    SyncTransactionKey, ProgramEnrollmentExtensionKey,
    ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    ChangeTypeCode, Timestamp, RequestJsonTextFile
) VALUES (
    NEWID(), @ProgramExtensionKey,
    'SU', 'C',
    'S000000002', '1430000012', '1430000012',
    '2026-07-01', @DisenrollEndDate,
    'Disenrollment', GETDATE(),
    '{"TransactionType":"C","Status":"A","StartReasonCode":"65","StopReasonCode":"65"}'
);

-- 3. Update extension to reflect closure
UPDATE CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
SET LastSynchronizedTimestamp = GETDATE(),
    LastChangeTypeCode = 'Disenrollment',
    MmisEndDate = @DisenrollEndDate,
    TransactionTypeCode = 'C',
    TxnRefId = 'S000000002'
WHERE ProgramEnrollmentExtensionKey = @ProgramExtensionKey;

-- DONE: Participant is disenrolled. TC-007, TC-009, TC-032 can execute.
```

---

### Script 5: ICA Agency B Setup (Transfer Tests)

Creates Agency B location data needed by TC-003, TC-017, TC-031.

```sql
-- ============================================================
-- SCRIPT 5: CREATE ICA AGENCY B (TRANSFER TARGET)
-- Run once — Agency B must exist before any transfer test.
-- ============================================================

DECLARE @ICALocationKey_AgencyB UNIQUEIDENTIFIER = NEWID();

-- Create Agency B Location Identifier
INSERT INTO OrganizationModule.LocationIdentifiers (
    LocationKey, TypeDisplayName, Value, EffectiveDateRangeStartDate
) VALUES (
    @ICALocationKey_AgencyB, 'Medicaid Provider ID', '9876543210', '2020-01-01'
);

PRINT 'ICALocationKey_AgencyB: ' + CAST(@ICALocationKey_AgencyB AS NVARCHAR(36));

-- NOTE: The PersonLocationAssignment linking the participant to Agency B
-- is created by the TEST EXECUTION itself (the user action that triggers
-- the ICA transfer). You do NOT insert it here.
```

---

### Script 6: SDPC Enrollment Setup (Phase 7 Prerequisite)

Creates the SDPC enrollment state needed by TC-018, TC-026, TC-027.

```sql
-- ============================================================
-- SCRIPT 6: SIMULATE TC-015 (SDPC ENROLLMENT SYNCED)
-- Creates SDPC enrollment + sync as if TC-015 ran with SU response.
-- Prerequisite: Script 1 (participant must exist).
-- ============================================================

DECLARE @CaseKey                UNIQUEIDENTIFIER = '{from Script 1}';
DECLARE @SDPCProgramKey         UNIQUEIDENTIFIER = '{lookup SDPC ProgramKey}';
DECLARE @SDPCEnrollmentKey      UNIQUEIDENTIFIER = NEWID();
DECLARE @SDPCExtensionKey       UNIQUEIDENTIFIER = NEWID();
DECLARE @SDPCSyncTxnKey         UNIQUEIDENTIFIER = NEWID();
DECLARE @SDPCLocationKey        UNIQUEIDENTIFIER = NEWID();
DECLARE @SDPCEnrollmentBegin    DATE = '2026-07-01';

-- 1. Create SDPC Agency Location Identifier (if not already present)
INSERT INTO OrganizationModule.LocationIdentifiers (
    LocationKey, TypeDisplayName, Value, EffectiveDateRangeStartDate
) VALUES (
    @SDPCLocationKey, 'Medicaid Provider ID', '5555555555', '2020-01-01'
);

-- 2. Create SDPC Agency Assignment
INSERT INTO PersonModule.PersonLocationAssignment (
    PersonLocationAssignmentKey, CaseKey, LocationKey,
    PersonLocationAssignmentTypeDisplayName,
    EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
) VALUES (
    NEWID(), @CaseKey, @SDPCLocationKey,
    'SDPC',
    @SDPCEnrollmentBegin, NULL
);

-- 3. Create SDPC Program Enrollment
INSERT INTO ProgramEnrollmentModule.ProgramEnrollment (
    ProgramEnrollmentKey, ProgramKey, CaseKey,
    EnrollmentDateRangeStartDate, EnrollmentDateRangeEndDate,
    StatusDisplayName, IsPrimary
) VALUES (
    @SDPCEnrollmentKey, @SDPCProgramKey, @CaseKey,
    @SDPCEnrollmentBegin, NULL,
    'Enrolled', 1
);

-- 4. Create ProgramEnrollmentExtension for SDPC
INSERT INTO CustomerProgramEnrollmentModule.ProgramEnrollmentExtension (
    ProgramEnrollmentExtensionKey, ProgramEnrollmentKey,
    HasConflict, ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    LastSynchronizedTimestamp, LastChangeTypeCode
) VALUES (
    @SDPCExtensionKey, @SDPCEnrollmentKey,
    0, 'SU', 'A',
    'S000000001', '1430000012', '1430000012',
    @SDPCEnrollmentBegin, '2299-12-31',
    GETDATE(), 'NewEnrollment'
);

-- 5. Create SyncTransaction for SDPC
INSERT INTO CustomerProgramEnrollmentModule.SyncTransaction (
    SyncTransactionKey, ProgramEnrollmentExtensionKey,
    ResponseStatusCode, TransactionTypeCode,
    TxnRefId, IdUniqueClientIdentifier, SubmittedClientId,
    MmisEffectiveDate, MmisEndDate,
    ChangeTypeCode, Timestamp, RequestJsonTextFile
) VALUES (
    @SDPCSyncTxnKey, @SDPCExtensionKey,
    'SU', 'A',
    'S000000001', '1430000012', '1430000012',
    @SDPCEnrollmentBegin, '2299-12-31',
    'NewEnrollment', GETDATE(),
    '{"WaiverProgramName":"IRIS","TransactionType":"A","Status":"A","SDPCAgencyID":"5555555555"}'
);

PRINT 'SDPCEnrollmentKey: ' + CAST(@SDPCEnrollmentKey AS NVARCHAR(36));
-- DONE: SDPC enrollment synced. TC-018, TC-026, TC-027 can execute.
```

---

### Script 7: Teardown / Reset to Baseline

Removes all enrollment, sync, and suspension data to return the participant to baseline state.

```sql
-- ============================================================
-- SCRIPT 7: TEARDOWN — RESET PARTICIPANT TO BASELINE
-- Removes enrollment-related data so tests can be re-run.
-- Does NOT remove person demographics, addresses, or assignments.
-- ============================================================

DECLARE @CaseKey UNIQUEIDENTIFIER = '{from Script 1}';

-- 1. Delete sync messages
DELETE peem
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages peem
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = peem.ProgramEnrollmentExtensionKey
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
WHERE pe.CaseKey = @CaseKey;

-- 2. Delete sync transactions
DELETE st
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
WHERE pe.CaseKey = @CaseKey;

-- 3. Delete program enrollment extensions
DELETE pee
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
WHERE pe.CaseKey = @CaseKey;

-- 4. Delete suspensions (if suspension table exists separately)
DELETE ps
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension ps
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = ps.ProgramEnrollmentKey
WHERE pe.CaseKey = @CaseKey;

-- 5. Delete program enrollments (IRIS and SDPC)
DELETE FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE CaseKey = @CaseKey;

-- 6. Reset ICA assignment (remove Agency B, keep Agency A active)
DELETE FROM PersonModule.PersonLocationAssignment
WHERE CaseKey = @CaseKey
  AND PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND LocationKey != '{ICALocationKey_AgencyA from Script 1}';

-- Re-activate Agency A (if it was end-dated by a transfer)
UPDATE PersonModule.PersonLocationAssignment
SET EffectiveDateRangeEndDate = NULL
WHERE CaseKey = @CaseKey
  AND PersonLocationAssignmentTypeDisplayName = 'ICA'
  AND LocationKey = '{ICALocationKey_AgencyA from Script 1}';

-- DONE: Participant reset to baseline. Re-run from Script 2 or execute TC-001 fresh.
```

---

## Important Notes

1. **Single participant, multiple test runs:** All 32 tests use the same MA ID. Tests must be run in the recommended execution order (see TEST_INVENTORY.md) to ensure correct precondition states.

2. **State accumulates:** Each test modifies the participant's state. After TC-002 adds a suspension, that suspension exists for TC-012/TC-021–TC-025/TC-028/TC-031. Plan for either sequential execution or database resets between phases.

3. **SDPC uses same participant:** TC-015, TC-018, TC-026, TC-027 add SDPC enrollments/suspensions to the same participant. SDPC and IRIS are independent programs — both can exist simultaneously.

4. **TC-005 modifies Medicaid ID:** If TC-005 (Medicaid ID Mismatch) is executed, the participant's Medicaid ID may be updated from "1430000012" to a new value returned by MMIS. Plan accordingly — TC-005 may need to run in isolation or with a database reset afterward.

5. **Agency B data must pre-exist:** The ICA "Agency B" (Medicaid Provider ID "9876543210") location and its LocationIdentifiers record must exist in the database before running TC-003, TC-017, or TC-031. The test only creates the PersonLocationAssignment linking the participant to Agency B.

6. **TC-032 requires disenrolled state:** TC-032 (Address Update — No Current Span) specifically requires the enrollment end date to be in the past. It can only run after TC-006 or equivalent disenrollment.
---

## Glossary

| Term | Definition |
|------|------------|
| **Baseline** | The minimum database state required before TC-001 can execute — all demographic, address, phone, assignment, and ISP data in place |
| **BC** | Blue Compass — the Wisconsin DHS Case Management system that sends enrollment requests to MMIS |
| **Carity** | The database platform underlying Blue Compass; tables are organized into modules (PersonModule, ProgramEnrollmentModule, etc.) |
| **CaseKey** | The GUID identifying a participant's case record; used as FK for assignments, enrollments, and worker links |
| **FEA** | Fiscal Employer Agency — manages employment services for IRIS participants; has its own Medicaid Provider ID |
| **FK** | Foreign Key — a database column referencing a primary key in another table |
| **GUID** | Globally Unique Identifier — system-generated unique keys used as PKs throughout Carity |
| **ICA** | IRIS Consultant Agency — provides consulting services to IRIS participants; has its own Medicaid Provider ID |
| **IRIS** | Include, Respect, I Self-Direct — Wisconsin's self-directed long-term care Medicaid program |
| **ISP** | Individual Service Plan (Person Centered Plan) — the participant's active care plan; dates map to RecertificationCompletionDate/RecertificationDueDate |
| **LocationIdentifiers** | Table in OrganizationModule linking a Location (ICA/FEA) to its Medicaid Provider ID |
| **LocationKey** | GUID identifying an agency/location; used to look up the Medicaid Provider ID via LocationIdentifiers |
| **MA ID** | Medical Assistance ID (Medicaid ID) — 10-character numeric identifier; this participant's is "1430000012" |
| **MMIS** | Medicaid Management Information System — Wisconsin's central Medicaid claims and enrollment system |
| **PersonKey** | The GUID identifying the participant in PersonModule.Person; FK throughout all person-related tables |
| **PersonLocationAssignment** | Table linking a participant (via CaseKey) to an agency (via LocationKey) with type (ICA/FEA) and effective dates |
| **PK** | Primary Key — the unique identifier column for a database table row |
| **ProgramEnrollmentKey** | GUID for the enrollment record; created when TC-001 adds the IRIS enrollment and used by all subsequent tests |
| **SDPC** | Self-Directed Personal Care — a separate Medicaid program type with its own webservice endpoint |
| **Span** | A contiguous enrollment or suspension period sent to MMIS as a single transaction |
| **Span-A** | The active enrollment span preceding a suspension |
| **Span-B** | The suspension span (or the span directly modified by a user action) |
| **Span-C** | The active enrollment span following a suspension |
| **SU** | Success — MMIS response confirming the transaction was accepted |
| **Sync** | The process of sending enrollment data to MMIS and recording the response in SyncTransaction/ProgramEnrollmentExtension |
| **WorkerID** | Derived from StaffMember name: format "{Initial}.{LastName}" truncated to 8 characters (e.g., "J.Smith") |

---

*End of document.*
