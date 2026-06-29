-- =============================================================================
-- TEST SCENARIO: LARGE MISMATCH (ICD_D12 Interface)
-- =============================================================================
-- Multiple mismatches across multiple members and stages.
-- Comparison should report many mismatches:
--   Member 1: Stage 1 raw has WRONG data (corrupted line)
--   Member 2: Stage 2 has 5 field mismatches vs raw
--   Member 3: Stage 4 has WRONG composite answers vs what Stage 2 implies
--
-- Interface: FSIA Adult Functional Screen File
-- Generated: 2026-06-25
-- Entity ID Prefix: 9999999
--
-- PREREQUISITE: Person records must exist in WiDHS.Qc.Carity.ToolTesting.
-- This script creates them in Part 1.
-- =============================================================================

-- ============================================================
-- Configuration
-- ============================================================
DECLARE @BatchKey UNIQUEIDENTIFIER = NEWID();
DECLARE @Now DATETIME2 = GETUTCDATE();
DECLARE @TestAccountId NVARCHAR(508) = N'ICD-D12-TEST-LARGE';

-- Person Keys
DECLARE @PersonKey1 UNIQUEIDENTIFIER = 'A3000001-D12T-4000-A000-999999900001';
DECLARE @PersonKey2 UNIQUEIDENTIFIER = 'A3000002-D12T-4000-A000-999999900002';
DECLARE @PersonKey3 UNIQUEIDENTIFIER = 'A3000003-D12T-4000-A000-999999900003';

-- Case Keys
DECLARE @CaseKey1 UNIQUEIDENTIFIER = 'C3000001-D12T-4000-B000-999999900001';
DECLARE @CaseKey2 UNIQUEIDENTIFIER = 'C3000002-D12T-4000-B000-999999900002';
DECLARE @CaseKey3 UNIQUEIDENTIFIER = 'C3000003-D12T-4000-B000-999999900003';

-- Program Enrollment Keys
DECLARE @ProgramEnrollmentKey1 UNIQUEIDENTIFIER = 'E3000001-D12T-4000-C000-999999900001';
DECLARE @ProgramEnrollmentKey2 UNIQUEIDENTIFIER = 'E3000002-D12T-4000-C000-999999900002';
DECLARE @ProgramEnrollmentKey3 UNIQUEIDENTIFIER = 'E3000003-D12T-4000-C000-999999900003';

-- Custom Form Instance Keys (Stage 4)
DECLARE @FormInstanceKey1 UNIQUEIDENTIFIER = 'F3000001-D12T-4000-D000-999999900001';
DECLARE @FormInstanceKey2 UNIQUEIDENTIFIER = 'F3000002-D12T-4000-D000-999999900002';
DECLARE @FormInstanceKey3 UNIQUEIDENTIFIER = 'F3000003-D12T-4000-D000-999999900003';

-- CaseCustomFormInstance Keys
DECLARE @CaseFormKey1 UNIQUEIDENTIFIER = 'CF300001-D12T-4000-E000-999999900001';
DECLARE @CaseFormKey2 UNIQUEIDENTIFIER = 'CF300002-D12T-4000-E000-999999900002';
DECLARE @CaseFormKey3 UNIQUEIDENTIFIER = 'CF300003-D12T-4000-E000-999999900003';

-- Medicaid IDs
DECLARE @MedicaidId1 NVARCHAR(10) = N'9999999021';
DECLARE @MedicaidId2 NVARCHAR(10) = N'9999999022';
DECLARE @MedicaidId3 NVARCHAR(10) = N'9999999023';

-- IRIS Program Key
DECLARE @IrisProgramKey UNIQUEIDENTIFIER = 'DEADBEEF-IRIS-4000-9000-000000000001';

-- LTC Needs Assessment Custom Form Definition Key (from spec)
DECLARE @LtcFormDefinitionKey UNIQUEIDENTIFIER = '964B0DFB-ED99-4F5A-8449-B43C013B9062';
DECLARE @LtcFormVersion INT = 55;

-- Provenance constants
DECLARE @ProvenanceTypeId BIGINT = 1;
DECLARE @ProvenanceTypeDisplay NVARCHAR(8000) = N'Interface';
DECLARE @ProvenanceTypeCodeSysId BIGINT = 1;

-- Status constants
DECLARE @ActiveStatusId BIGINT = 1;
DECLARE @ActiveStatusDisplay NVARCHAR(8000) = N'Active';
DECLARE @ActiveStatusCodeSysId BIGINT = 1;

-- =============================================================================
-- PART 1: PERSON MODULE HIERARCHY (DB: WiDHS.Qc.Carity.ToolTesting)
-- =============================================================================

-- 1A. PersonModule.Person
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[Person]
    (PersonKey, Version, PersonIdentifier, NameFirstName, NameLastName, NameMiddleName,
     BirthDate, IsEnableEmailNotifications, IsEnableTextNotifications,
     ProvenanceTypeIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@PersonKey1, 1, N'TEST-D12-LM-001', N'John',   N'Smith',    N'M',
     '1960-03-15', 0, 0,
     @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@PersonKey2, 1, N'TEST-D12-LM-002', N'Mary',   N'Johnson',  N'A',
     '1955-08-22', 0, 0,
     @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@PersonKey3, 1, N'TEST-D12-LM-003', N'Robert', N'Williams', N'J',
     '1972-11-01', 0, 0,
     @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId,
     @TestAccountId, @Now, @TestAccountId, @Now);

-- 1B. PersonModule.PersonMedicaidNumbers
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonMedicaidNumbers]
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

-- 1C. PersonModule.PersonLookup
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonLookup]
    (PersonKey, ActiveMedicaidNumber)
VALUES
    (@PersonKey1, @MedicaidId1),
    (@PersonKey2, @MedicaidId2),
    (@PersonKey3, @MedicaidId3);

-- =============================================================================
-- PART 2: CASE MODULE (DB: WiDHS.Qc.Carity.ToolTesting)
-- =============================================================================
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CaseModule].[Case]
    (CaseKey, Version, PersonKey,
     StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@CaseKey1, 1, @PersonKey1,
     N'Active', 1, 1,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@CaseKey2, 1, @PersonKey2,
     N'Active', 1, 1,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@CaseKey3, 1, @PersonKey3,
     N'Active', 1, 1,
     @TestAccountId, @Now, @TestAccountId, @Now);

-- =============================================================================
-- PART 3: PROGRAM ENROLLMENT (DB: WiDHS.Qc.Carity.ToolTesting)
-- =============================================================================
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[ProgramEnrollmentModule].[ProgramEnrollment]
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

-- =============================================================================
-- STAGE 1: Raw (DB: WiDHS.Qc.Interface.Carity.ToolTesting)
-- =============================================================================
-- MISMATCH: Member 1 raw line is CORRUPTED (truncated/garbled)
-- Members 2 and 3 raw lines are correct.

INSERT INTO [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw]
    (LineNumber, RecordType, RawText, MedicaidId, HasErrors, InterfaceBatchKey, LastSynchronizationTimestamp)
VALUES
    (1, N'HDR', N'HDR 20260618 103000 000003', NULL, 0, @BatchKey, @Now),
    -- *** Member 1: CORRUPTED raw line (truncated at field 10)
    (2, N'DTL', N'9999999021 John                 Smith                M               024 001 001 005 001 001 002 CORRUPTED_DATA_TRUNCATED', @MedicaidId1, 1, @BatchKey, @Now),
    -- Member 2: correct raw
    (3, N'DTL', N'9999999022 Mary                 Johnson              A               025 002 002     002 000 001 003       000                 001 002          003 005 002 002 001 002 006 002 002 0 1 0 0 0 002 002 001 000 002 001 000 001 001 000 000 000 000 000 001 000 000 001 000 001 000                                                                             002 002 1 0 1 1                                                                             002 001 002 001 001 002 1 1 0 20260210', @MedicaidId2, 0, @BatchKey, @Now),
    -- Member 3: correct raw (all independent)
    (4, N'DTL', N'9999999023 Robert               Williams             J               026 003 000     000 000 000           000                 000              000 002 000 000 001 001 001 000 003 0 0 1 0 0 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 000 001 Needs specialized wound care per doctor orders                              001 001 0 0 0 0                                                                             000 000 000 000 000 000 0 0 0 20260305', @MedicaidId3, 0, @BatchKey, @Now);

-- =============================================================================
-- STAGE 2: Parsed (DB: WiDHS.Qc.Interface.Carity.ToolTesting)
-- =============================================================================
-- Member 1: parsed correctly (but raw was corrupted → Stage 1 vs 2 mismatch)
-- Member 2: 5 MISMATCHES introduced in parsed vs raw data
-- Member 3: parsed correctly (mismatches will be in Stage 4)

INSERT INTO [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm]
    (MemberId, FirstName, LastName, MiddleName,
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
    -- Member 1: Parsed correctly (Stage 1 is corrupted, so Stage 1 vs 2 will mismatch)
    (@MedicaidId1, N'John', N'Smith', N'M',
     N'024', N'001',
     N'001', N'005',
     N'001', N'001',
     N'002', N'002003007',
     N'001', N'002003',
     N'002', N'001002003004',
     N'002', N'003',
     N'001', N'002',
     N'002', N'001',
     N'005', N'001',
     N'001', N'0',
     N'0',
     N'0', N'0',
     N'0', N'001',
     N'001', N'001',
     N'000', N'001',
     N'001', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'001', N'000',
     NULL, N'001',
     N'001', N'1',
     N'1', N'0',
     N'0', NULL,
     N'001', N'000',
     N'001', N'000',
     N'000', N'001',
     N'0', N'0',
     N'0', '2026-01-15',
     @PersonKey1, 0, 1,
     @BatchKey, @Now),
    -- Member 2: 5 MISMATCHES vs raw (marked with ***)
    (@MedicaidId2, N'Marie', N'Johnson', N'A',         -- *** FirstName: "Marie" != raw "Mary"
     N'025', N'002',
     N'000', NULL,                                     -- *** BathingHelpCode: "000" != raw "002"
     N'002', N'000',
     N'001', N'003',
     N'000', NULL,
     N'001', N'002',
     N'003', N'006',                                   -- *** MedMgtHelpLvlCode: "006" != raw "005"
     N'002', N'002',
     N'001', N'002',
     N'006', N'002',
     N'002', N'0',
     N'1',
     N'0', N'0',
     N'0', N'002',
     N'002', N'001',
     N'000', N'002',
     N'001', N'000',
     N'001', N'001',
     N'000', N'000',
     N'000', N'000',
     N'000', N'001',
     N'000', N'000',
     N'001', N'000',
     N'001', N'000',
     NULL, N'002',
     N'003', N'1',                                     -- *** CommunicationCode: "003" != raw "002"
     N'0', N'1',
     N'1', NULL,
     N'002', N'001',
     N'002', N'001',
     N'001', N'000',                                   -- *** MentalHealthNeedCode: "000" != raw "002"
     N'1', N'1',
     N'0', '2026-02-10',
     @PersonKey2, 0, 1,
     @BatchKey, @Now),
    -- Member 3: Parsed correctly (mismatches will be in Stage 4 composite answers)
    (@MedicaidId3, N'Robert', N'Williams', N'J',
     N'026', N'003',
     N'000', NULL,
     N'000', N'000',
     N'000', NULL,
     N'000', NULL,
     N'000', NULL,
     N'000', N'002',
     N'000', N'000',
     N'001', N'001',
     N'001', N'000',
     N'003', N'0',
     N'0',
     N'1', N'0',
     N'0', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'000', N'001',
     N'Needs specialized wound care per doctor orders', N'001',
     N'001', N'0',
     N'0', N'0',
     N'0', NULL,
     N'000', N'000',
     N'000', N'000',
     N'000', N'000',
     N'0', N'0',
     N'0', '2026-03-05',
     @PersonKey3, 0, 1,
     @BatchKey, @Now);

-- =============================================================================
-- STAGE 3: SKIPPED (N/A for ICD-D12)
-- =============================================================================

-- =============================================================================
-- STAGE 4: Final — CustomFormModule (DB: WiDHS.Qc.Carity.ToolTesting)
-- =============================================================================
-- Member 3: Stage 4 has WRONG composite answers (PersonalCare=Yes when should be No,
-- DME=Yes when should be No) — simulating pipeline transformation bugs.
-- Members 1 and 2: Stage 4 is correct relative to their Stage 2 parsed data.

-- 4A. CustomFormInstance
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CustomFormInstance]
    (CustomFormInstanceKey, Version, CustomFormDefinitionKey,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@FormInstanceKey1, @LtcFormVersion, @LtcFormDefinitionKey,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@FormInstanceKey2, @LtcFormVersion, @LtcFormDefinitionKey,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@FormInstanceKey3, @LtcFormVersion, @LtcFormDefinitionKey,
     @TestAccountId, @Now, @TestAccountId, @Now);

-- 4B. CaseCustomFormInstance
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CaseCustomFormInstance]
    (CaseCustomFormInstanceKey, Version, CustomFormInstanceKey, CaseKey,
     FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@CaseFormKey1, 1, @FormInstanceKey1, @CaseKey1,
     N'LTC Needs Assessment', 1, 1,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@CaseFormKey2, 1, @FormInstanceKey2, @CaseKey2,
     N'LTC Needs Assessment', 1, 1,
     @TestAccountId, @Now, @TestAccountId, @Now),
    (@CaseFormKey3, 1, @FormInstanceKey3, @CaseKey3,
     N'LTC Needs Assessment', 1, 1,
     @TestAccountId, @Now, @TestAccountId, @Now);

-- 4C. FieldAnswerBase + Answers

-- Element Definition Keys (placeholders)
DECLARE @ElemDef_PersonalCare UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000001';
DECLARE @ElemDef_SupportiveHomeCare UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000002';
DECLARE @ElemDef_MedAdmin UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000003';
DECLARE @ElemDef_MoneyMgt UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000004';
DECLARE @ElemDef_Transportation UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000005';
DECLARE @ElemDef_DME UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000006';
DECLARE @ElemDef_OvernightCare UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000007';
DECLARE @ElemDef_EligDate UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000008';

-- FieldAnswerBase Keys
DECLARE @FAB1_PersonalCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_SupportiveHomeCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_MedAdmin UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_MoneyMgt UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_Transportation UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_DME UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_OvernightCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_EligDate UNIQUEIDENTIFIER = NEWID();

DECLARE @FAB2_PersonalCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_SupportiveHomeCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_MedAdmin UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_MoneyMgt UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_Transportation UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_DME UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_OvernightCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_EligDate UNIQUEIDENTIFIER = NEWID();

DECLARE @FAB3_PersonalCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_SupportiveHomeCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_MedAdmin UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_MoneyMgt UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_Transportation UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_DME UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_OvernightCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_EligDate UNIQUEIDENTIFIER = NEWID();

INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase]
    (FieldAnswerBaseKey, Version, CustomFormElementDefinitionBaseKey, IndexNumber,
     CustomFormInstanceKey, IsRequired,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    -- Member 1
    (@FAB1_PersonalCare, 1, @ElemDef_PersonalCare, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_SupportiveHomeCare, 1, @ElemDef_SupportiveHomeCare, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_MedAdmin, 1, @ElemDef_MedAdmin, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_MoneyMgt, 1, @ElemDef_MoneyMgt, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_Transportation, 1, @ElemDef_Transportation, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_DME, 1, @ElemDef_DME, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_OvernightCare, 1, @ElemDef_OvernightCare, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_EligDate, 1, @ElemDef_EligDate, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    -- Member 2
    (@FAB2_PersonalCare, 1, @ElemDef_PersonalCare, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_SupportiveHomeCare, 1, @ElemDef_SupportiveHomeCare, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_MedAdmin, 1, @ElemDef_MedAdmin, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_MoneyMgt, 1, @ElemDef_MoneyMgt, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_Transportation, 1, @ElemDef_Transportation, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_DME, 1, @ElemDef_DME, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_OvernightCare, 1, @ElemDef_OvernightCare, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB2_EligDate, 1, @ElemDef_EligDate, 0, @FormInstanceKey2, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    -- Member 3
    (@FAB3_PersonalCare, 1, @ElemDef_PersonalCare, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_SupportiveHomeCare, 1, @ElemDef_SupportiveHomeCare, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_MedAdmin, 1, @ElemDef_MedAdmin, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_MoneyMgt, 1, @ElemDef_MoneyMgt, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_Transportation, 1, @ElemDef_Transportation, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_DME, 1, @ElemDef_DME, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_OvernightCare, 1, @ElemDef_OvernightCare, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB3_EligDate, 1, @ElemDef_EligDate, 0, @FormInstanceKey3, 0, @TestAccountId, @Now, @TestAccountId, @Now);

-- SimpleSingleSelectFieldAnswer
-- Member 1: correct answers for their parsed data (PersonalCare=Yes, etc.)
-- Member 2: correct answers for their parsed data (PersonalCare=No since BathingHelpCode=000 in mismatched Stage 2)
-- Member 3: *** WRONG answers — pipeline bug simulation ***
--   PersonalCare should be No (all ADLs=000) but set to Yes
--   DME should be No (no adaptive equipment) but set to Yes

INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[SimpleSingleSelectFieldAnswer]
    (FieldAnswerBaseKey, OptionCode, OptionDisplayName)
VALUES
    -- Member 1 (correct for their Stage 2 data)
    (@FAB1_PersonalCare,        N'Yes', N'Yes'),
    (@FAB1_SupportiveHomeCare,  N'Yes', N'Yes'),
    (@FAB1_MedAdmin,            N'Yes', N'Yes'),
    (@FAB1_MoneyMgt,            N'Yes', N'Yes'),
    (@FAB1_Transportation,      N'Yes', N'Yes'),
    (@FAB1_DME,                 N'Yes', N'Yes'),
    (@FAB1_OvernightCare,       N'Yes', N'Yes'),
    -- Member 2 (correct for their mismatched Stage 2: BathingHelpCode=000 → PersonalCare=No)
    (@FAB2_PersonalCare,        N'No',  N'No'),
    (@FAB2_SupportiveHomeCare,  N'Yes', N'Yes'),
    (@FAB2_MedAdmin,            N'Yes', N'Yes'),
    (@FAB2_MoneyMgt,            N'Yes', N'Yes'),
    (@FAB2_Transportation,      N'Yes', N'Yes'),
    (@FAB2_DME,                 N'No',  N'No'),
    (@FAB2_OvernightCare,       N'Yes', N'Yes'),
    -- Member 3 *** WRONG composite answers (pipeline transformation bug) ***
    (@FAB3_PersonalCare,        N'Yes', N'Yes'),   -- *** Should be No (all ADLs=000)
    (@FAB3_SupportiveHomeCare,  N'No',  N'No'),
    (@FAB3_MedAdmin,            N'No',  N'No'),
    (@FAB3_MoneyMgt,            N'No',  N'No'),
    (@FAB3_Transportation,      N'No',  N'No'),
    (@FAB3_DME,                 N'Yes', N'Yes'),   -- *** Should be No (no adaptive equip)
    (@FAB3_OvernightCare,       N'No',  N'No');

-- DateFieldAnswer
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[DateFieldAnswer]
    (FieldAnswerBaseKey, DateTime)
VALUES
    (@FAB1_EligDate, '2026-01-15T00:00:00'),
    (@FAB2_EligDate, '2026-02-10T00:00:00'),
    (@FAB3_EligDate, '2026-03-05T00:00:00');

-- =============================================================================
-- CLEANUP (uncomment and run to remove all test data)
-- =============================================================================

-- Stage 4 (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[DateFieldAnswer] WHERE [FieldAnswerBaseKey] IN (SELECT FieldAnswerBaseKey FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase] WHERE CustomFormInstanceKey IN ('F3000001-D12T-4000-D000-999999900001','F3000002-D12T-4000-D000-999999900002','F3000003-D12T-4000-D000-999999900003'));
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[SimpleSingleSelectFieldAnswer] WHERE [FieldAnswerBaseKey] IN (SELECT FieldAnswerBaseKey FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase] WHERE CustomFormInstanceKey IN ('F3000001-D12T-4000-D000-999999900001','F3000002-D12T-4000-D000-999999900002','F3000003-D12T-4000-D000-999999900003'));
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase] WHERE CustomFormInstanceKey IN ('F3000001-D12T-4000-D000-999999900001','F3000002-D12T-4000-D000-999999900002','F3000003-D12T-4000-D000-999999900003');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CaseCustomFormInstance] WHERE CaseCustomFormInstanceKey IN ('CF300001-D12T-4000-E000-999999900001','CF300002-D12T-4000-E000-999999900002','CF300003-D12T-4000-E000-999999900003');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CustomFormInstance] WHERE CustomFormInstanceKey IN ('F3000001-D12T-4000-D000-999999900001','F3000002-D12T-4000-D000-999999900002','F3000003-D12T-4000-D000-999999900003');

-- Stage 2 (WiDHS.Qc.Interface.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm] WHERE [MemberId] LIKE '999999902%';

-- Stage 1 (WiDHS.Qc.Interface.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw] WHERE [MedicaidId] LIKE '999999902%';

-- Program Enrollment (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[ProgramEnrollmentModule].[ProgramEnrollment] WHERE ProgramEnrollmentKey IN ('E3000001-D12T-4000-C000-999999900001','E3000002-D12T-4000-C000-999999900002','E3000003-D12T-4000-C000-999999900003');

-- Cases (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CaseModule].[Case] WHERE CaseKey IN ('C3000001-D12T-4000-B000-999999900001','C3000002-D12T-4000-B000-999999900002','C3000003-D12T-4000-B000-999999900003');

-- Person hierarchy (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonLookup] WHERE PersonKey IN ('A3000001-D12T-4000-A000-999999900001','A3000002-D12T-4000-A000-999999900002','A3000003-D12T-4000-A000-999999900003');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonMedicaidNumbers] WHERE PersonKey IN ('A3000001-D12T-4000-A000-999999900001','A3000002-D12T-4000-A000-999999900002','A3000003-D12T-4000-A000-999999900003');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[Person] WHERE PersonKey IN ('A3000001-D12T-4000-A000-999999900001','A3000002-D12T-4000-A000-999999900002','A3000003-D12T-4000-A000-999999900003');

PRINT N'ICD_D12 LARGE MISMATCH test data inserted successfully (Stage 1 corruption + Stage 2 mismatches + Stage 4 wrong composites).';
GO
