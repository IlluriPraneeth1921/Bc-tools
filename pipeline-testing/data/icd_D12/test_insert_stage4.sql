-- =============================================================================
-- STAGE 4: CustomFormModule inserts for ICD-D12 Perfect Match test
-- =============================================================================
-- Prerequisite: Run migrate_form_definitions.sql first.
-- Prerequisite: Run test_insert_01_perfect_match.sql first (Person/Case/Stage1-2).
--
-- This script simulates what the FSIA pipeline would produce in Stage 4.
-- It dynamically resolves CustomFormElementDefinitionBaseKey GUIDs from the
-- migrated form definition data.
-- =============================================================================

DECLARE @Now DATETIME2 = GETUTCDATE();
DECLARE @Account NVARCHAR(508) = N'ICD-D12-TEST-STAGE4';
DECLARE @FormDefKey UNIQUEIDENTIFIER = '964B0DFB-ED99-4F5A-8449-B43C013B9062';
DECLARE @FormVersion INT = 55;

-- Person/Case keys (must match test_insert_01_perfect_match.sql)
DECLARE @PersonKey1 UNIQUEIDENTIFIER = 'A1000001-D12F-4000-A000-999999900001';
DECLARE @PersonKey2 UNIQUEIDENTIFIER = 'A1000002-D12F-4000-A000-999999900002';
DECLARE @PersonKey3 UNIQUEIDENTIFIER = 'A1000003-D12F-4000-A000-999999900003';
DECLARE @CaseKey1 UNIQUEIDENTIFIER = 'C1000001-D12F-4000-B000-999999900001';
DECLARE @CaseKey2 UNIQUEIDENTIFIER = 'C1000002-D12F-4000-B000-999999900002';
DECLARE @CaseKey3 UNIQUEIDENTIFIER = 'C1000003-D12F-4000-B000-999999900003';

-- Medicaid IDs
DECLARE @MedicaidId1 NVARCHAR(10) = N'9999999001';
DECLARE @MedicaidId2 NVARCHAR(10) = N'9999999002';
DECLARE @MedicaidId3 NVARCHAR(10) = N'9999999003';

-- CustomFormInstance keys (stable for test)
DECLARE @CFI1 UNIQUEIDENTIFIER = 'F4000001-D12F-4000-D000-999999900001';
DECLARE @CFI2 UNIQUEIDENTIFIER = 'F4000002-D12F-4000-D000-999999900002';
DECLARE @CFI3 UNIQUEIDENTIFIER = 'F4000003-D12F-4000-D000-999999900003';

-- CaseCustomFormInstance keys
DECLARE @CCFI1 UNIQUEIDENTIFIER = 'F4000001-D12F-4000-E000-999999900001';
DECLARE @CCFI2 UNIQUEIDENTIFIER = 'F4000002-D12F-4000-E000-999999900002';
DECLARE @CCFI3 UNIQUEIDENTIFIER = 'F4000003-D12F-4000-E000-999999900003';

-- Resolve an element definition key (pick the first one available for field answers)
-- The comparator doesn't check WHICH element definition — just that a FieldAnswerBase exists
-- for the CustomFormInstance. We use the first available element key.
DECLARE @ElemKey1 UNIQUEIDENTIFIER;
SELECT TOP 1 @ElemKey1 = CustomFormElementDefinitionBaseKey
FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormElementDefinitionBase]
WHERE CustomFormDefinitionKey = @FormDefKey;

IF @ElemKey1 IS NULL
BEGIN
    PRINT 'ERROR: No CustomFormElementDefinitionBase found. Run migrate_form_definitions.sql first.';
    RETURN;
END;

-- =============================================================================
-- 4A. CustomFormInstance — one per member
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormInstance] WHERE CustomFormInstanceKey = @CFI1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormInstance]
        (CustomFormInstanceKey, Version, CustomFormDefinitionKey,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
    VALUES
        (@CFI1, @FormVersion, @FormDefKey, @Account, @Now, NULL, @Account, @Now, NULL),
        (@CFI2, @FormVersion, @FormDefKey, @Account, @Now, NULL, @Account, @Now, NULL),
        (@CFI3, @FormVersion, @FormDefKey, @Account, @Now, NULL, @Account, @Now, NULL);

    PRINT '4A: Inserted CustomFormInstance (3 rows)';
END
ELSE
    PRINT '4A: CustomFormInstance already exists — skipped';

-- =============================================================================
-- 4B. CaseCustomFormInstance — links form to case
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CaseCustomFormInstance] WHERE CaseCustomFormInstanceKey = @CCFI1)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CaseCustomFormInstance]
        (CaseCustomFormInstanceKey, Version, CustomFormInstanceKey, CaseKey,
         FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
    VALUES
        (@CCFI1, 1, @CFI1, @CaseKey1, N'LTC Needs Assessment', 1, 1, @Account, @Now, NULL, @Account, @Now, NULL),
        (@CCFI2, 1, @CFI2, @CaseKey2, N'LTC Needs Assessment', 1, 1, @Account, @Now, NULL, @Account, @Now, NULL),
        (@CCFI3, 1, @CFI3, @CaseKey3, N'LTC Needs Assessment', 1, 1, @Account, @Now, NULL, @Account, @Now, NULL);

    PRINT '4B: Inserted CaseCustomFormInstance (3 rows)';
END
ELSE
    PRINT '4B: CaseCustomFormInstance already exists — skipped';

-- =============================================================================
-- 4C. FieldAnswerBase + SimpleSingleSelectFieldAnswer
-- =============================================================================
-- Each member gets: PersonalCare, SupportiveHomeCare, MedAdmin, MoneyMgt,
--                   Transportation, DME, OvernightCare, PrefLive = 8 answers
-- Plus 1 DateFieldAnswer (EligibilityDate)
-- Total: 9 FieldAnswerBase per member = 27 rows

-- Member 1 (John Smith): PersonalCare=Yes, SupportiveHomeCare=Yes, MedAdmin=Yes,
--   MoneyMgt=Yes, Transportation=Yes, DME=Yes, OvernightCare=Yes, PrefLive=024
DECLARE @FAB1_1 UNIQUEIDENTIFIER = NEWID(); -- PersonalCare
DECLARE @FAB1_2 UNIQUEIDENTIFIER = NEWID(); -- SupportiveHomeCare
DECLARE @FAB1_3 UNIQUEIDENTIFIER = NEWID(); -- MedAdmin
DECLARE @FAB1_4 UNIQUEIDENTIFIER = NEWID(); -- MoneyMgt
DECLARE @FAB1_5 UNIQUEIDENTIFIER = NEWID(); -- Transportation
DECLARE @FAB1_6 UNIQUEIDENTIFIER = NEWID(); -- DME
DECLARE @FAB1_7 UNIQUEIDENTIFIER = NEWID(); -- OvernightCare
DECLARE @FAB1_8 UNIQUEIDENTIFIER = NEWID(); -- PrefLive
DECLARE @FAB1_9 UNIQUEIDENTIFIER = NEWID(); -- EligDate

-- Member 2 (Mary Johnson): PersonalCare=Yes, SupportiveHomeCare=Yes, MedAdmin=Yes,
--   MoneyMgt=Yes, Transportation=Yes, DME=Yes, OvernightCare=Yes, PrefLive=025
DECLARE @FAB2_1 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_2 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_3 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_4 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_5 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_6 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_7 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_8 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB2_9 UNIQUEIDENTIFIER = NEWID();

-- Member 3 (Robert Williams): PersonalCare=No, SupportiveHomeCare=No, MedAdmin=No,
--   MoneyMgt=No, Transportation=No, DME=No, OvernightCare=No, PrefLive=026
DECLARE @FAB3_1 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_2 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_3 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_4 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_5 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_6 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_7 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_8 UNIQUEIDENTIFIER = NEWID();
DECLARE @FAB3_9 UNIQUEIDENTIFIER = NEWID();

-- Insert FieldAnswerBase (27 rows)
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[FieldAnswerBase]
    (FieldAnswerBaseKey, Version, CustomFormElementDefinitionBaseKey, IndexNumber,
     CustomFormInstanceKey, IsRequired,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
VALUES
    -- Member 1
    (@FAB1_1, 1, @ElemKey1, 0, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_2, 1, @ElemKey1, 1, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_3, 1, @ElemKey1, 2, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_4, 1, @ElemKey1, 3, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_5, 1, @ElemKey1, 4, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_6, 1, @ElemKey1, 5, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_7, 1, @ElemKey1, 6, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_8, 1, @ElemKey1, 7, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB1_9, 1, @ElemKey1, 8, @CFI1, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    -- Member 2
    (@FAB2_1, 1, @ElemKey1, 0, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_2, 1, @ElemKey1, 1, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_3, 1, @ElemKey1, 2, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_4, 1, @ElemKey1, 3, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_5, 1, @ElemKey1, 4, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_6, 1, @ElemKey1, 5, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_7, 1, @ElemKey1, 6, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_8, 1, @ElemKey1, 7, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB2_9, 1, @ElemKey1, 8, @CFI2, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    -- Member 3
    (@FAB3_1, 1, @ElemKey1, 0, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_2, 1, @ElemKey1, 1, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_3, 1, @ElemKey1, 2, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_4, 1, @ElemKey1, 3, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_5, 1, @ElemKey1, 4, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_6, 1, @ElemKey1, 5, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_7, 1, @ElemKey1, 6, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_8, 1, @ElemKey1, 7, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL),
    (@FAB3_9, 1, @ElemKey1, 8, @CFI3, 0, @Account, @Now, NULL, @Account, @Now, NULL);

PRINT '4C: Inserted FieldAnswerBase (27 rows)';

-- SimpleSingleSelectFieldAnswer (24 rows — 8 per member)
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[SimpleSingleSelectFieldAnswer]
    (FieldAnswerBaseKey, OptionCode, OptionDisplayName)
VALUES
    -- Member 1: all Yes except PrefLive=024
    (@FAB1_1, N'Yes', N'Yes'),           -- PersonalCare
    (@FAB1_2, N'Yes', N'Yes'),           -- SupportiveHomeCare
    (@FAB1_3, N'Yes', N'Yes'),           -- MedAdmin
    (@FAB1_4, N'Yes', N'Yes'),           -- MoneyMgt
    (@FAB1_5, N'Yes', N'Yes'),           -- Transportation
    (@FAB1_6, N'Yes', N'Yes'),           -- DME
    (@FAB1_7, N'Yes', N'Yes'),           -- OvernightCare
    (@FAB1_8, N'024', N'024'),           -- PrefLive
    -- Member 2: all Yes except PrefLive=025
    (@FAB2_1, N'Yes', N'Yes'),           -- PersonalCare
    (@FAB2_2, N'Yes', N'Yes'),           -- SupportiveHomeCare
    (@FAB2_3, N'Yes', N'Yes'),           -- MedAdmin
    (@FAB2_4, N'Yes', N'Yes'),           -- MoneyMgt
    (@FAB2_5, N'Yes', N'Yes'),           -- Transportation
    (@FAB2_6, N'Yes', N'Yes'),           -- DME
    (@FAB2_7, N'Yes', N'Yes'),           -- OvernightCare
    (@FAB2_8, N'025', N'025'),           -- PrefLive
    -- Member 3: all No except PrefLive=026
    (@FAB3_1, N'No',  N'No'),            -- PersonalCare
    (@FAB3_2, N'No',  N'No'),            -- SupportiveHomeCare
    (@FAB3_3, N'No',  N'No'),            -- MedAdmin
    (@FAB3_4, N'No',  N'No'),            -- MoneyMgt
    (@FAB3_5, N'No',  N'No'),            -- Transportation
    (@FAB3_6, N'No',  N'No'),            -- DME
    (@FAB3_7, N'No',  N'No'),            -- OvernightCare
    (@FAB3_8, N'026', N'026');           -- PrefLive

PRINT '4D: Inserted SimpleSingleSelectFieldAnswer (24 rows)';

-- DateFieldAnswer (3 rows — eligibility date per member)
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[DateFieldAnswer]
    (FieldAnswerBaseKey, DateTime)
VALUES
    (@FAB1_9, '2026-01-15T00:00:00'),
    (@FAB2_9, '2026-02-10T00:00:00'),
    (@FAB3_9, '2026-03-05T00:00:00');

PRINT '4E: Inserted DateFieldAnswer (3 rows)';

-- =============================================================================
-- 4D. PersonEmployment (3 rows — one per member with employment status)
-- =============================================================================
-- Member 1: empl_stat_cd = 001 (Retired)
-- Member 2: empl_stat_cd = 002 (Not working)
-- Member 3: empl_stat_cd = 003 (Working full-time)

INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[PersonModule].[PersonEmployment]
    (PersonEmploymentKey, Version, PersonKey,
     StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
     EffectiveDateRangeStartDate)
VALUES
    (NEWID(), 1, @PersonKey1, N'001', 1, 1, '2025-01-01'),
    (NEWID(), 1, @PersonKey2, N'002', 2, 1, '2025-01-01'),
    (NEWID(), 1, @PersonKey3, N'003', 3, 1, '2025-01-01');

PRINT '4F: Inserted PersonEmployment (3 rows)';

-- =============================================================================
PRINT 'Stage 4 test data inserted successfully.';
GO
