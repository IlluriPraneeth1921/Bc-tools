-- =============================================================================
-- TEST SCENARIO: PARTIAL MISMATCH (ICD_D12 Interface)
-- =============================================================================
-- Stage 2 has 3 intentional field mismatches vs Stage 1 raw data.
-- Comparison should report exactly 3 mismatches for Member 1 (John Smith):
--   1. FirstName: "John" in raw → "Jon" in parsed (typo)
--   2. BathingHelpCode: "001" in raw → "002" in parsed (wrong code)
--   3. EligibilityCalculatedDate: "20260115" in raw → "2026-02-15" in parsed (wrong date)
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
DECLARE @TestAccountId NVARCHAR(508) = N'ICD-D12-TEST-PARTIAL';

-- Person Key (single member for this scenario)
DECLARE @PersonKey1 UNIQUEIDENTIFIER = 'A2000001-D12T-4000-A000-999999900001';

-- Case Key
DECLARE @CaseKey1 UNIQUEIDENTIFIER = 'C2000001-D12T-4000-B000-999999900001';

-- Program Enrollment Key
DECLARE @ProgramEnrollmentKey1 UNIQUEIDENTIFIER = 'E2000001-D12T-4000-C000-999999900001';

-- Custom Form Instance Keys (Stage 4)
DECLARE @FormInstanceKey1 UNIQUEIDENTIFIER = 'F2000001-D12T-4000-D000-999999900001';

-- CaseCustomFormInstance Key
DECLARE @CaseFormKey1 UNIQUEIDENTIFIER = 'CF200001-D12T-4000-E000-999999900001';

-- Medicaid ID (test prefix 9999999)
DECLARE @MedicaidId1 NVARCHAR(10) = N'9999999011';

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
    (@PersonKey1, 1, N'TEST-D12-PM-001', N'John', N'Smith', N'M',
     '1960-03-15', 0, 0,
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
     @ProvenanceTypeId, @ProvenanceTypeDisplay, @ProvenanceTypeCodeSysId);

-- 1C. PersonModule.PersonLookup
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonLookup]
    (PersonKey, ActiveMedicaidNumber)
VALUES
    (@PersonKey1, @MedicaidId1);

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
     1, N'Active', 1,
     '2025-01-01',
     @TestAccountId, @Now, @TestAccountId, @Now);

-- =============================================================================
-- STAGE 1: Raw (DB: WiDHS.Qc.Interface.Carity.ToolTesting)
-- =============================================================================
-- The raw line contains the CORRECT source data.

INSERT INTO [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw]
    (LineNumber, RecordType, RawText, MedicaidId, HasErrors, InterfaceBatchKey, LastSynchronizationTimestamp)
VALUES
    (1, N'HDR', N'HDR 20260618 103000 000001', NULL, 0, @BatchKey, @Now),
    (2, N'DTL', N'9999999011 John                 Smith                M               024 001 001 005 001 001 002 002003007 001 002003          002 001002003004 002 003 001 002 002 001 005 001 001 0 0 0 0 0 001 001 001 000 001 001 000 000 000 000 000 000 000 000 000 000 000 000 000 001 000                                                                             001 001 1 1 0 0                                                                             001 000 001 000 000 001 0 0 0 20260115', @MedicaidId1, 0, @BatchKey, @Now);

-- =============================================================================
-- STAGE 2: Parsed (DB: WiDHS.Qc.Interface.Carity.ToolTesting)
-- =============================================================================
-- MISMATCHES INTRODUCED (3 fields intentionally wrong):
--   1. FirstName: "Jon" instead of "John"
--   2. BathingHelpCode: "002" instead of "001"
--   3. EligibilityCalculatedDate: 2026-02-15 instead of 2026-01-15

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
    -- Member 1: 3 MISMATCHES marked with ***
    (@MedicaidId1, N'Jon', N'Smith', N'M',            -- *** FirstName: "Jon" != raw "John"
     N'024', N'001',
     N'002', N'005',                                   -- *** BathingHelpCode: "002" != raw "001"
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
     N'0', '2026-02-15',                              -- *** EligDate: "2026-02-15" != raw "20260115"
     @PersonKey1, 0, 1,
     @BatchKey, @Now);

-- =============================================================================
-- STAGE 3: SKIPPED (N/A for ICD-D12)
-- =============================================================================

-- =============================================================================
-- STAGE 4: Final — CustomFormModule (DB: WiDHS.Qc.Carity.ToolTesting)
-- =============================================================================
-- Stage 4 reflects what the pipeline WOULD produce from the CORRECT raw data.
-- Mismatches exist between Stage 2 (parsed) and Stage 4 (final).

-- 4A. CustomFormInstance
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CustomFormInstance]
    (CustomFormInstanceKey, Version, CustomFormDefinitionKey,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@FormInstanceKey1, @LtcFormVersion, @LtcFormDefinitionKey,
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
     @TestAccountId, @Now, @TestAccountId, @Now);

-- 4C. FieldAnswerBase + Answers
DECLARE @FAB1_PersonalCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_SupportiveHomeCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_MedAdmin UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_MoneyMgt UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_Transportation UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_DME UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_OvernightCare UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB1_EligDate UNIQUEIDENTIFIER = NEWID();

-- Element Definition Keys (placeholders)
DECLARE @ElemDef_PersonalCare UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000001';
DECLARE @ElemDef_SupportiveHomeCare UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000002';
DECLARE @ElemDef_MedAdmin UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000003';
DECLARE @ElemDef_MoneyMgt UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000004';
DECLARE @ElemDef_Transportation UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000005';
DECLARE @ElemDef_DME UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000006';
DECLARE @ElemDef_OvernightCare UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000007';
DECLARE @ElemDef_EligDate UNIQUEIDENTIFIER = '00000000-0000-0000-0000-000000000008';

INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase]
    (FieldAnswerBaseKey, Version, CustomFormElementDefinitionBaseKey, IndexNumber,
     CustomFormInstanceKey, IsRequired,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@FAB1_PersonalCare, 1, @ElemDef_PersonalCare, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_SupportiveHomeCare, 1, @ElemDef_SupportiveHomeCare, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_MedAdmin, 1, @ElemDef_MedAdmin, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_MoneyMgt, 1, @ElemDef_MoneyMgt, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_Transportation, 1, @ElemDef_Transportation, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_DME, 1, @ElemDef_DME, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_OvernightCare, 1, @ElemDef_OvernightCare, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now),
    (@FAB1_EligDate, 1, @ElemDef_EligDate, 0, @FormInstanceKey1, 0, @TestAccountId, @Now, @TestAccountId, @Now);

-- Stage 4 answers reflect CORRECT source data (from raw)
-- PersonalCare=Yes (ADLs have 001), consistent with raw BathingHelpCode=001
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[SimpleSingleSelectFieldAnswer]
    (FieldAnswerBaseKey, OptionCode, OptionDisplayName)
VALUES
    (@FAB1_PersonalCare,        N'Yes', N'Yes'),
    (@FAB1_SupportiveHomeCare,  N'Yes', N'Yes'),
    (@FAB1_MedAdmin,            N'Yes', N'Yes'),
    (@FAB1_MoneyMgt,            N'Yes', N'Yes'),
    (@FAB1_Transportation,      N'Yes', N'Yes'),
    (@FAB1_DME,                 N'Yes', N'Yes'),
    (@FAB1_OvernightCare,       N'Yes', N'Yes');

-- DateFieldAnswer — CORRECT date from raw (2026-01-15)
INSERT INTO [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[DateFieldAnswer]
    (FieldAnswerBaseKey, DateTime)
VALUES
    (@FAB1_EligDate, '2026-01-15T00:00:00');

-- =============================================================================
-- CLEANUP (uncomment and run to remove all test data)
-- =============================================================================

-- Stage 4 (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[DateFieldAnswer] WHERE [FieldAnswerBaseKey] IN (SELECT FieldAnswerBaseKey FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase] WHERE CustomFormInstanceKey = 'F2000001-D12T-4000-D000-999999900001');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[SimpleSingleSelectFieldAnswer] WHERE [FieldAnswerBaseKey] IN (SELECT FieldAnswerBaseKey FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase] WHERE CustomFormInstanceKey = 'F2000001-D12T-4000-D000-999999900001');
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[FieldAnswerBase] WHERE CustomFormInstanceKey = 'F2000001-D12T-4000-D000-999999900001';
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CaseCustomFormInstance] WHERE CaseCustomFormInstanceKey = 'CF200001-D12T-4000-E000-999999900001';
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CustomFormModule].[CustomFormInstance] WHERE CustomFormInstanceKey = 'F2000001-D12T-4000-D000-999999900001';

-- Stage 2 (WiDHS.Qc.Interface.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm] WHERE [MemberId] = '9999999011';

-- Stage 1 (WiDHS.Qc.Interface.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Interface.Carity.ToolTesting].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw] WHERE [MedicaidId] = '9999999011';

-- Program Enrollment (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[ProgramEnrollmentModule].[ProgramEnrollment] WHERE ProgramEnrollmentKey = 'E2000001-D12T-4000-C000-999999900001';

-- Case (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[CaseModule].[Case] WHERE CaseKey = 'C2000001-D12T-4000-B000-999999900001';

-- Person hierarchy (WiDHS.Qc.Carity.ToolTesting)
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonLookup] WHERE PersonKey = 'A2000001-D12T-4000-A000-999999900001';
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[PersonMedicaidNumbers] WHERE PersonKey = 'A2000001-D12T-4000-A000-999999900001';
-- DELETE FROM [WiDHS.Qc.Carity.ToolTesting].[PersonModule].[Person] WHERE PersonKey = 'A2000001-D12T-4000-A000-999999900001';

PRINT N'ICD_D12 PARTIAL MISMATCH test data inserted successfully (3 mismatches in Stage 2).';
GO
