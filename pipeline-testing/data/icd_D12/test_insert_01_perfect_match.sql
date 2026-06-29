-- =============================================================================
-- TEST SCENARIO: PERFECT MATCH (ICD_D12 Interface)
-- =============================================================================
-- All stages are consistent — comparison should report 0 mismatches
--
-- Interface: FSIA Adult Functional Screen File
-- Generated: 2026-06-26
-- Entity ID Prefix: 9999999
--
-- PREREQUISITE: This script creates Person records in
-- WiDHS.Qc.Carity.ToolTesting (PersonModule hierarchy) that the
-- D12 pipeline requires for matching (BR-D12-005 through BR-D12-008).
-- Then it inserts Stage 1 and Stage 2 interface test data.
--
-- NOTE: Stage 4 (CustomFormModule) is NOT pre-inserted here because it
-- depends on existing CustomFormElementDefinitionBase GUIDs and the
-- CustomFormDefinitionKey that must already exist in the target DB.
-- Stage 4 data is created by the pipeline and verified via comparison.
-- =============================================================================

-- ============================================================
-- Configuration
-- ============================================================
DECLARE @BatchKey UNIQUEIDENTIFIER = NEWID();
DECLARE @Now DATETIME2 = GETUTCDATE();
DECLARE @TestAccountId NVARCHAR(508) = N'ICD-D12-TEST-SETUP';

-- Person Keys (stable GUIDs for test repeatability)
DECLARE @PersonKey1 UNIQUEIDENTIFIER = 'A1000001-D12F-4000-A000-999999900001';
DECLARE @PersonKey2 UNIQUEIDENTIFIER = 'A1000002-D12F-4000-A000-999999900002';
DECLARE @PersonKey3 UNIQUEIDENTIFIER = 'A1000003-D12F-4000-A000-999999900003';

-- Case Keys
DECLARE @CaseKey1 UNIQUEIDENTIFIER = 'C1000001-D12F-4000-B000-999999900001';
DECLARE @CaseKey2 UNIQUEIDENTIFIER = 'C1000002-D12F-4000-B000-999999900002';
DECLARE @CaseKey3 UNIQUEIDENTIFIER = 'C1000003-D12F-4000-B000-999999900003';

-- Program Enrollment Keys
DECLARE @ProgramEnrollmentKey1 UNIQUEIDENTIFIER = 'E1000001-D12F-4000-C000-999999900001';
DECLARE @ProgramEnrollmentKey2 UNIQUEIDENTIFIER = 'E1000002-D12F-4000-C000-999999900002';
DECLARE @ProgramEnrollmentKey3 UNIQUEIDENTIFIER = 'E1000003-D12F-4000-C000-999999900003';

-- Medicaid IDs (test prefix 9999999)
DECLARE @MedicaidId1 NVARCHAR(10) = N'9999999001';
DECLARE @MedicaidId2 NVARCHAR(10) = N'9999999002';
DECLARE @MedicaidId3 NVARCHAR(10) = N'9999999003';

-- IRIS Program Key — query from actual DB:
-- SELECT ProgramKey FROM [WiDHS.Qc.Carity.ToolTestig].[ProgramModule].[Program]
-- Replace this placeholder with the real GUID before running.
DECLARE @IrisProgramKey UNIQUEIDENTIFIER = 'F230DD5D-15AD-417B-98D4-6FDE1DB47100';

-- Provenance constants
DECLARE @ProvenanceTypeId BIGINT = 1;
DECLARE @ProvenanceTypeDisplay NVARCHAR(4000) = N'Interface';
DECLARE @ProvenanceTypeCodeSysId BIGINT = 1;

-- Status constants for Medicaid Numbers (Active)
DECLARE @ActiveStatusId BIGINT = 1;
DECLARE @ActiveStatusDisplay NVARCHAR(4000) = N'Active';
DECLARE @ActiveStatusCodeSysId BIGINT = 1;

-- =============================================================================
-- PART 1: PERSON MODULE HIERARCHY (DB: WiDHS.Qc.Carity.ToolTestig)
-- =============================================================================

-- 1A. PersonModule.Person — Base person records
-- Guard: skip if already exists (idempotent re-run)
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[Person] WHERE PersonKey = @PersonKey1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[Person]
        (PersonKey, Version, PersonIdentifier, NameFirstName, NameLastName, NameMiddleName,
         BirthDate, IsEnableEmailNotifications, IsEnableTextNotifications,
         ProvenanceTypeIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeCodeSystemIdentifier,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
    VALUES
        (@PersonKey1, 1, N'TEST-D12-001', N'John',   N'Smith',    N'M',
         '1960-03-15', 0, 0,
         @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId,
         @TestAccountId, @Now, @TestAccountId, @Now),
        (@PersonKey2, 1, N'TEST-D12-002', N'Mary',   N'Johnson',  N'A',
         '1955-08-22', 0, 0,
         @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId,
         @TestAccountId, @Now, @TestAccountId, @Now),
        (@PersonKey3, 1, N'TEST-D12-003', N'Robert', N'Williams', N'J',
         '1972-11-01', 0, 0,
         @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId,
         @TestAccountId, @Now, @TestAccountId, @Now);
END;

-- 1B. PersonModule.PersonMedicaidNumbers
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonMedicaidNumbers] WHERE PersonKey = @PersonKey1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonMedicaidNumbers]
        (PersonKey, Value, IsOriginal,
         StatusIdentifier, StatusDisplayName, StatusCodeSystemIdentifier,
         ProvenanceTypeIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeCodeSystemIdentifier)
    VALUES
        (@PersonKey1, @MedicaidId1, 1,
         @ActiveStatusId, @ActiveStatusDisplay, @ActiveStatusCodeSysId,
         @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId),
        (@PersonKey2, @MedicaidId2, 1,
         @ActiveStatusId, @ActiveStatusDisplay, @ActiveStatusCodeSysId,
         @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId),
        (@PersonKey3, @MedicaidId3, 1,
         @ActiveStatusId, @ActiveStatusDisplay, @ActiveStatusCodeSysId,
         @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId);
END;

-- 1C. PersonModule.PersonLookup
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonLookup] WHERE PersonKey = @PersonKey1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonLookup]
        (PersonKey, ActiveMedicaidNumber)
    VALUES
        (@PersonKey1, @MedicaidId1),
        (@PersonKey2, @MedicaidId2),
        (@PersonKey3, @MedicaidId3);
END;

-- =============================================================================
-- PART 2: CASE MODULE (DB: WiDHS.Qc.Carity.ToolTestig)
-- =============================================================================
-- CaseModule.Case requires: CaseKey, Version, CaseNumber (UNIQUE, NOT NULL),
-- OpenedDate (NOT NULL), PersonKey (NOT NULL), EntityCreated/Updated fields.
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CaseModule].[Case] WHERE CaseKey = @CaseKey1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CaseModule].[Case]
        (CaseKey, Version, CaseNumber, OpenedDate, PersonKey,
         StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
    VALUES
        (@CaseKey1, 1, N'TEST-D12-CASE-001', '2025-01-01', @PersonKey1,
         N'Active', 1, 1,
         @TestAccountId, @Now, @TestAccountId, @Now),
        (@CaseKey2, 1, N'TEST-D12-CASE-002', '2025-01-01', @PersonKey2,
         N'Active', 1, 1,
         @TestAccountId, @Now, @TestAccountId, @Now),
        (@CaseKey3, 1, N'TEST-D12-CASE-003', '2025-01-01', @PersonKey3,
         N'Active', 1, 1,
         @TestAccountId, @Now, @TestAccountId, @Now);
END;

-- =============================================================================
-- PART 3: PROGRAM ENROLLMENT (DB: WiDHS.Qc.Carity.ToolTestig)
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[ProgramEnrollmentModule].[ProgramEnrollment] WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[ProgramEnrollmentModule].[ProgramEnrollment]
        (ProgramEnrollmentKey, Version, ProgramKey, CaseKey, IsPrimary,
         StatusIdentifier, StatusDisplayName, StatusCodeSystemIdentifier,
         EnrollmentDateRangeStartDate,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
    VALUES
        (@ProgramEnrollmentKey1, 1, @IrisProgramKey, @CaseKey1, 1,
         1, N'Active', 1, '2025-01-01',
         @TestAccountId, @Now, @TestAccountId, @Now),
        (@ProgramEnrollmentKey2, 1, @IrisProgramKey, @CaseKey2, 1,
         1, N'Active', 1, '2025-01-01',
         @TestAccountId, @Now, @TestAccountId, @Now),
        (@ProgramEnrollmentKey3, 1, @IrisProgramKey, @CaseKey3, 1,
         1, N'Active', 1, '2025-01-01',
         @TestAccountId, @Now, @TestAccountId, @Now);
END;

-- =============================================================================
-- STAGE 1: Raw (DB: WiDHS.Qc.Interface.Carity.ToolTesting)
-- =============================================================================
-- LongTermCareFunctionalScreenFormRaw has only 2 columns:
--   InterfaceBatchKey (uniqueidentifier, nullable)
--   RawText (nvarchar(MAX), nullable)
-- One row per source file line (HDR + DTL records stored as raw text).

INSERT INTO [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw]
    (InterfaceBatchKey, RawText)
VALUES
    (@BatchKey, N'HDR 20260618 103000 000003'),
    (@BatchKey, N'9999999001 John                 Smith                M               024 001 001 005 001 001 002 002003007 001 002003          002 001002003004 002 003 001 002 002 001 005 001 001 0 0 0 0 0 001 001 001 000 001 001 000 000 000 000 000 000 000 000 000 000 000 000 000 001 000                                                                             001 001 1 1 0 0                                                                             001 000 001 000 000 001 0 0 0 20260115'),
    (@BatchKey, N'9999999002 Mary                 Johnson              A               025 002 002     002 000 001 003       000                 001 002          003 005 002 002 001 002 006 002 002 0 1 0 0 0 002 002 001 000 002 001 000 001 001 000 000 000 000 000 001 000 000 001 000 001 000                                                                             002 002 1 0 1 1                                                                             002 001 002 001 001 002 1 1 0 20260210'),
    (@BatchKey, N'9999999003 Robert               Williams             J               026 003 000     000 000 000           000                 000              000 002 000 000 001 001 001 000 003 0 0 1 0 0 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 001 Needs specialized wound care per doctor orders                              001 001 0 0 0 0                                                                             000 000 000 000 000 000 0 0 0 20260305');

-- =============================================================================
-- STAGE 2: Parsed (DB: WiDHS.Qc.Interface.Carity.ToolTesting)
-- =============================================================================
-- LongTermCareFunctionalScreenForm requires:
--   LongTermCareFunctionalScreenFormKey (uniqueidentifier PK, NOT NULL)
--   MemberId (varchar(10), NOT NULL)
--   HasErrors (bit, NOT NULL)
--   IsReadyToProcess (bit, NOT NULL)
--   LastSynchronizationTimestamp (datetimeoffset, NOT NULL)

INSERT INTO [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm]
    (LongTermCareFunctionalScreenFormKey,
     MemberId, FirstName, LastName, MiddleName,
     ApplicantPrefersToLiveCode, GuardianPreferenceForLivingCode,
     BathingHelpCode, BathingAdaptiveEquipmentCode,
     DressingHelpCode, EatingHelpCode,
     MobilityHelpCode, MobilityAdaptiveEquipmentCode,
     ToiletingHelpCode, ToiletingAdaptiveEquipmentCode,
     TransferringHelpCode, TransferringAdaptiveEquipmentCode,
     MealPreparationHelpLevelCode, MedicationManagementHelpLevelCode,
     MoneyManagementHelpLevelCode, LaundryChoresHelpLevelCode,
     TelephoneUseAbilityCode, TelephoneAccessCode,
     TransportationDrivingCode, OvernightCareSupervisionCode,
     EmploymentStatusCode, WorkshopEmploymentFlag,
     IndividualInterestInWorkingInCommunityCode,
     CommunityEmploymentFlag, VocationalEmploymentFlag,
     HomeEmploymentFlag, EmploymentAssistanceCode,
     BehaviorsRequiringInterventionsCode, ExercisesRangeOfMotionCode,
     MedicationsFluidFlushCode, MedicationAdministrationCode,
     PainMedicationManagementCode, OstomyCode,
     ChairBedPositioningCode, OxygenRespiratoryTreatmentCode,
     InHomeDialysisCode, TotalParenteralNutritionCode,
     TransfusionCode, TracheostomyCode,
     TubeFeedingCode, UlcerStageTwoCode,
     UlcerStageThreeFourCode, UrinaryCatheterCode,
     OtherWoundCareCode, VentilatorInterventionCode,
     NursingAssessmentCode, OtherServiceCode,
     OtherServiceText, SkilledTherapyCode,
     CommunicationCode, MemoryImpairmentFlag,
     ShortTermMemoryLossFlag, UnableToRememberFlag,
     LongTermMemoryLossFlag, UnableToDetermineText,
     DailyDecisionMakingCode, PhysicallyResistiveToCareCode,
     WanderingCode, SelfInjuriousBehaviorCode,
     OffensiveBehaviorToOthersCode, MentalHealthNeedCode,
     SubstanceAbuseFlag, SubstanceAbuseCurrentFlag,
     SubstanceAbusePastFlag, EligibilityCalculatedDate,
     PersonKey, HasErrors, IsReadyToProcess,
     InterfaceBatchKey, LastSynchronizationTimestamp)
VALUES
    -- Member 1: John Smith
    (NEWID(),
     @MedicaidId1, 'John', 'Smith', 'M',
     '024', '001', '001', '005', '001', '001',
     '002', '002003007', '001', '002003', '002', '001002003004',
     '002', '003', '001', '002', '002', '001',
     '005', '001', '001', '0', '0', '0', '0', '0', '001',
     '001', '001', '000', '001', '001', '000',
     '000', '000', '000', '000', '000', '000',
     '000', '000', '000', '000', '000', '000',
     '001', '000', NULL, '001',
     '001', '1', '1', '0', '0', NULL,
     '001', '000', '001', '000', '000', '001',
     '0', '0', '0', '2026-01-15',
     @PersonKey1, 0, 1, @BatchKey, @Now),
    -- Member 2: Mary Johnson
    (NEWID(),
     @MedicaidId2, 'Mary', 'Johnson', 'A',
     '025', '002', '002', NULL, '002', '000',
     '001', '003', '000', NULL, '001', '002',
     '003', '005', '002', '002', '001', '002',
     '006', '002', '002', '0', '1', '0', '0', '0', '002',
     '002', '001', '000', '002', '001', '000',
     '001', '001', '000', '000', '000', '000',
     '000', '001', '000', '000', '001', '000',
     '001', '000', NULL, '002',
     '002', '1', '0', '1', '1', NULL,
     '002', '001', '002', '001', '001', '002',
     '1', '1', '0', '2026-02-10',
     @PersonKey2, 0, 1, @BatchKey, @Now),
    -- Member 3: Robert Williams
    (NEWID(),
     @MedicaidId3, 'Robert', 'Williams', 'J',
     '026', '003', '000', NULL, '000', '000',
     '000', NULL, '000', NULL, '000', NULL,
     '000', '002', '000', '000', '001', '001',
     '001', '000', '003', '0', '0', '1', '0', '0', '000',
     '000', '000', '000', '000', '000', '000',
     '000', '000', '000', '000', '000', '000',
     '000', '000', '000', '000', '000', '000',
     '000', '001', 'Needs specialized wound care per doctor orders', '001',
     '001', '0', '0', '0', '0', NULL,
     '000', '000', '000', '000', '000', '000',
     '0', '0', '0', '2026-03-05',
     @PersonKey3, 0, 1, @BatchKey, @Now);

-- =============================================================================
-- STAGE 3: SKIPPED (N/A for ICD-D12)
-- =============================================================================

-- =============================================================================
-- STAGE 4: CustomFormModule — NOT PRE-INSERTED
-- =============================================================================
-- Stage 4 data is created by the pipeline when it processes Stage 2 records.
-- It writes to CustomFormModule tables using existing form definitions and
-- element definitions that are already in the Carity DB.
--
-- The comparison tool (pl-test) verifies Stage 4 by:
-- 1. Generating expected state from parsed file + business rules
-- 2. Querying CustomFormInstance (filtered by CustomFormDefinitionKey)
-- 3. Diffing expected vs actual field answers
--
-- If you need to pre-insert Stage 4 data for a "perfect match" test without
-- running the pipeline, you must first query for the actual GUIDs:
--
--   -- Get form element definition keys for LTC Needs Assessment:
--   SELECT CustomFormElementDefinitionBaseKey, Code, DisplayName
--   FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormElementDefinitionBase]
--   WHERE CustomFormDefinitionKey = '964B0DFB-ED99-4F5A-8449-B43C013B9062';
--
--   -- Get IRIS ProgramKey:
--   SELECT ProgramKey, BusinessProfileFullName
--   FROM [WiDHS.Qc.Carity.ToolTestig].[ProgramModule].[Program];
--

-- =============================================================================
-- CLEANUP (uncomment and run to remove all test data)
-- =============================================================================
-- Run in reverse dependency order.

-- Stage 2 (WiDHS.Qc.Interface.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm] WHERE [MemberId] LIKE '9999999%';

-- Stage 1 (WiDHS.Qc.Interface.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw] WHERE [RawText] LIKE '9999999%' OR [RawText] LIKE 'HDR%';

-- Program Enrollment (WiDHS.Qc.Carity.ToolTestig)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTestig].[ProgramEnrollmentModule].[ProgramEnrollment] WHERE ProgramEnrollmentKey IN ('E1000001-D12F-4000-C000-999999900001','E1000002-D12F-4000-C000-999999900002','E1000003-D12F-4000-C000-999999900003');

-- Cases (WiDHS.Qc.Carity.ToolTestig)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTestig].[CaseModule].[Case] WHERE CaseKey IN ('C1000001-D12F-4000-B000-999999900001','C1000002-D12F-4000-B000-999999900002','C1000003-D12F-4000-B000-999999900003');

-- Person hierarchy (WiDHS.Qc.Carity.ToolTestig)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonLookup] WHERE PersonKey IN ('A1000001-D12F-4000-A000-999999900001','A1000002-D12F-4000-A000-999999900002','A1000003-D12F-4000-A000-999999900003');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonMedicaidNumbers] WHERE PersonKey IN ('A1000001-D12F-4000-A000-999999900001','A1000002-D12F-4000-A000-999999900002','A1000003-D12F-4000-A000-999999900003');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[Person] WHERE PersonKey IN ('A1000001-D12F-4000-A000-999999900001','A1000002-D12F-4000-A000-999999900002','A1000003-D12F-4000-A000-999999900003');

PRINT N'ICD_D12 test data inserted successfully (Person + Case + Enrollment + Stages 1-2).';
GO
