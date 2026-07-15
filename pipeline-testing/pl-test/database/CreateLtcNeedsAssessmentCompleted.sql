-- ============================================================
-- Script: CreateLtcNeedsAssessmentCompleted.sql
--
-- Purpose: Creates a new LTC Needs Assessment form for a person
--          and sets it to Completed state by copying all field
--          answers from a blueprint person's completed form.
--
-- What it creates:
--   1. CustomFormInstance (the form itself)
--   2. CaseCustomFormInstance (links form to case)
--   3. FieldAnswerBase + answer subtypes (copied from blueprint)
--   4. WorkflowInstance (set to CompletedState)
--   5. WorkflowInstanceHistoryEvent (Create + Complete transitions)
--   6. CompletionContext + Requirements (100% complete)
--   7. CaseActivityInstance (makes form visible in UI)
--
-- Parameters:
--   @MedicaidNumber NVARCHAR(20)          - Target person's Medicaid number
--   @BlueprintMedicaidNumber NVARCHAR(20) - Blueprint person with a completed LTC form
--                                           (default: '6548456550')
--   @AccountIdentifier NVARCHAR(508)      - Account performing the action
--                                           (default: 'pillar/jams')
--   @DryRun BIT                           - 1 = report only, 0 = execute (default: 1)
--
-- Usage:
--   -- Dry run:
--   EXEC dbo.test_CreateLtcNeedsAssessmentCompleted
--     @MedicaidNumber = '4774443560', @DryRun = 1;
--
--   -- Execute:
--   EXEC dbo.test_CreateLtcNeedsAssessmentCompleted
--     @MedicaidNumber = '4774443560', @DryRun = 0;
--
--   -- With custom blueprint:
--   EXEC dbo.test_CreateLtcNeedsAssessmentCompleted
--     @MedicaidNumber = '4774443560',
--     @BlueprintMedicaidNumber = '6548456550',
--     @DryRun = 0;
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO
SET ANSI_NULLS ON;
GO

CREATE OR ALTER PROCEDURE dbo.test_CreateLtcNeedsAssessmentCompleted
    @MedicaidNumber NVARCHAR(20),
    @BlueprintMedicaidNumber NVARCHAR(20) = '6548456550',
    @AccountIdentifier NVARCHAR(508) = 'pillar/jams',
    @DryRun BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- ==============================
    -- RESOLVE: Target Person and Case
    -- ==============================
    DECLARE @PersonKey UNIQUEIDENTIFIER;
    SELECT @PersonKey = PersonKey
    FROM [PersonModule].[PersonLookup]
    WHERE ActiveMedicaidNumber = @MedicaidNumber;

    IF @PersonKey IS NULL
    BEGIN
        RAISERROR('ERROR: Target person not found for Medicaid number: %s', 16, 1, @MedicaidNumber);
        RETURN -1;
    END

    DECLARE @CaseKey UNIQUEIDENTIFIER;
    SELECT @CaseKey = CaseKey
    FROM [CaseModule].[Case]
    WHERE PersonKey = @PersonKey;

    IF @CaseKey IS NULL
    BEGIN
        RAISERROR('ERROR: Case not found for target person.', 16, 1);
        RETURN -1;
    END

    -- Check if person already has an LTC Needs Assessment
    IF EXISTS (
        SELECT 1
        FROM [CustomFormModule].[CaseCustomFormInstance] ccfi
        WHERE ccfi.CaseKey = @CaseKey
            AND ccfi.FormTypeDisplayName = 'LTC Needs Assessment'
            AND ccfi.FormTypeIdentifier = 2703001
    )
    BEGIN
        RAISERROR('ERROR: Person already has an LTC Needs Assessment form. Run WipePersonCustomFormData first.', 16, 1);
        RETURN -1;
    END

    -- ==============================
    -- RESOLVE: Blueprint Person's completed LTC form
    -- ==============================
    DECLARE @BlueprintPersonKey UNIQUEIDENTIFIER;
    SELECT @BlueprintPersonKey = PersonKey
    FROM [PersonModule].[PersonLookup]
    WHERE ActiveMedicaidNumber = @BlueprintMedicaidNumber;

    IF @BlueprintPersonKey IS NULL
    BEGIN
        RAISERROR('ERROR: Blueprint person not found for Medicaid number.', 16, 1);
        RETURN -1;
    END

    DECLARE @BlueprintCaseKey UNIQUEIDENTIFIER;
    SELECT @BlueprintCaseKey = CaseKey
    FROM [CaseModule].[Case]
    WHERE PersonKey = @BlueprintPersonKey;

    DECLARE @BlueprintFormInstanceKey UNIQUEIDENTIFIER;
    SELECT TOP 1 @BlueprintFormInstanceKey = cfi.CustomFormInstanceKey
    FROM [CustomFormModule].[CaseCustomFormInstance] ccfi
    JOIN [CustomFormModule].[CustomFormInstance] cfi
        ON cfi.CustomFormInstanceKey = ccfi.CustomFormInstanceKey
    JOIN [WorkflowModule].[WorkflowInstance] wi
        ON wi.AggregateKeyReference = cfi.CustomFormInstanceKey
        AND wi.WorkflowDefinitionIdentifier = 'CustomFormInstanceSimpleWorkflowDefinition'
    WHERE ccfi.CaseKey = @BlueprintCaseKey
        AND ccfi.FormTypeDisplayName = 'LTC Needs Assessment'
        AND ccfi.FormTypeIdentifier = 2703001
        AND wi.CurrentStateName = 'CompletedState'
    ORDER BY cfi.EntityCreatedTimestamp DESC;

    IF @BlueprintFormInstanceKey IS NULL
    BEGIN
        RAISERROR('ERROR: No completed LTC Needs Assessment found for blueprint person.', 16, 1);
        RETURN -1;
    END

    -- ==============================
    -- RESOLVE: Blueprint Completion Context + Requirements
    -- ==============================
    DECLARE @BlueprintCompletionContextKey UNIQUEIDENTIFIER;
    SELECT @BlueprintCompletionContextKey = CompletionContextKey
    FROM [CompletionModule].[CompletionContext]
    WHERE AggregateKeyReference = @BlueprintFormInstanceKey;

    -- ==============================
    -- RESOLVE: System Account
    -- ==============================
    DECLARE @SystemAccountKey UNIQUEIDENTIFIER;
    DECLARE @SystemAccountDisplayName NVARCHAR(200);

    SELECT TOP 1
        @SystemAccountKey = SystemAccountKey,
        @SystemAccountDisplayName = ContactDisplayName
    FROM [SecurityModule].[SystemAccount]
    WHERE Identifier = @AccountIdentifier;

    IF @SystemAccountKey IS NULL
    BEGIN
        SELECT TOP 1
            @SystemAccountKey = SystemAccountKey,
            @SystemAccountDisplayName = ContactDisplayName
        FROM [SecurityModule].[SystemAccount]
        WHERE Identifier = 'pillar/jams';
    END

    IF @SystemAccountKey IS NULL
    BEGIN
        RAISERROR('ERROR: SystemAccount not found.', 16, 1);
        RETURN -1;
    END

    -- ==============================
    -- RESOLVE: UserContext (from blueprint's workflow)
    -- ==============================
    DECLARE @UserContextKey UNIQUEIDENTIFIER;
    SELECT TOP 1 @UserContextKey = EntityCreatedUserContextKey
    FROM [WorkflowModule].[WorkflowInstance]
    WHERE AggregateKeyReference = @BlueprintFormInstanceKey
        AND WorkflowDefinitionIdentifier = 'CustomFormInstanceSimpleWorkflowDefinition';

    -- ==============================
    -- RESOLVE: CustomFormDefinition key for LTC Needs Assessment
    -- ==============================
    DECLARE @CustomFormDefinitionKey UNIQUEIDENTIFIER;
    SELECT @CustomFormDefinitionKey = cfi.CustomFormDefinitionKey
    FROM [CustomFormModule].[CustomFormInstance] cfi
    WHERE cfi.CustomFormInstanceKey = @BlueprintFormInstanceKey;

    -- ==============================
    -- COUNT: Blueprint answers
    -- ==============================
    DECLARE @BlueprintAnswerCount INT;
    SELECT @BlueprintAnswerCount = COUNT(*)
    FROM [CustomFormModule].[FieldAnswerBase]
    WHERE CustomFormInstanceKey = @BlueprintFormInstanceKey;

    DECLARE @BlueprintReqCount INT = 0;
    IF @BlueprintCompletionContextKey IS NOT NULL
        SELECT @BlueprintReqCount = COUNT(*)
        FROM [CompletionModule].[Requirement]
        WHERE CompletionContextKey = @BlueprintCompletionContextKey;

    -- ==============================
    -- TIMESTAMPS
    -- ==============================
    DECLARE @Now DATETIME2 = GETUTCDATE();

    -- ==============================
    -- DRY RUN REPORT
    -- ==============================
    PRINT '=== CREATE LTC NEEDS ASSESSMENT (COMPLETED) ===';
    PRINT 'Target Medicaid:        ' + @MedicaidNumber;
    PRINT 'Target PersonKey:       ' + CAST(@PersonKey AS NVARCHAR(36));
    PRINT 'Target CaseKey:         ' + CAST(@CaseKey AS NVARCHAR(36));
    PRINT 'Blueprint Medicaid:     ' + @BlueprintMedicaidNumber;
    PRINT 'Blueprint FormKey:      ' + CAST(@BlueprintFormInstanceKey AS NVARCHAR(36));
    PRINT 'FormDefinitionKey:      ' + CAST(@CustomFormDefinitionKey AS NVARCHAR(36));
    PRINT 'Blueprint Answers:      ' + CAST(@BlueprintAnswerCount AS NVARCHAR(10));
    PRINT 'Blueprint Requirements: ' + CAST(@BlueprintReqCount AS NVARCHAR(10));
    PRINT 'Account:                ' + @AccountIdentifier + ' (' + @SystemAccountDisplayName + ')';
    PRINT '';

    IF @DryRun = 1
    BEGIN
        PRINT '*** DRY RUN - NO CHANGES WILL BE MADE ***';
        PRINT '';
        PRINT 'Actions that would be performed:';
        PRINT '  1. Create CustomFormInstance';
        PRINT '  2. Create CaseCustomFormInstance';
        PRINT '  3. Copy ' + CAST(@BlueprintAnswerCount AS NVARCHAR(10)) + ' FieldAnswerBase + subtype records';
        PRINT '  4. Create WorkflowInstance (CompletedState)';
        PRINT '  5. Create WorkflowInstanceHistoryEvents (Create + Complete)';
        PRINT '  6. Create CompletionContext (100%) + ' + CAST(@BlueprintReqCount AS NVARCHAR(10)) + ' Requirements';
        PRINT '  7. Create CaseActivityInstance';
        PRINT '';
        PRINT '*** Re-run with @DryRun = 0 to execute ***';
        RETURN 0;
    END

    -- ==============================
    -- EXECUTE CREATION
    -- ==============================
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Generate new keys
        DECLARE @NewFormInstanceKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @NewCaseCustomFormInstanceKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @NewWorkflowInstanceKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @NewCompletionContextKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @NewCaseActivityInstanceKey UNIQUEIDENTIFIER = NEWID();

        -- ----------------------------------------------------------
        -- STEP 1: Create CustomFormInstance
        -- ----------------------------------------------------------
        INSERT INTO [CustomFormModule].[CustomFormInstance] (
            CustomFormInstanceKey,
            [Version],
            AggregateKeyReference,
            CustomFormDefinitionKey,
            PreviousCustomFormInstanceKey,
            ScoreValue,
            ScoreRangeDisplayName,
            ScoreRangeKeyReference,
            EntityCreatedAccountIdentifier,
            EntityCreatedTimestamp,
            EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier,
            EntityUpdatedTimestamp,
            EntityUpdatedUserContextKey
        )
        VALUES (
            @NewFormInstanceKey,
            1,
            NULL,
            @CustomFormDefinitionKey,
            NULL,
            NULL,
            NULL,
            NULL,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            @AccountIdentifier,
            @Now,
            @UserContextKey
        );
        PRINT '  [1] CustomFormInstance created: ' + CAST(@NewFormInstanceKey AS NVARCHAR(36));

        -- ----------------------------------------------------------
        -- STEP 2: Create CaseCustomFormInstance
        -- ----------------------------------------------------------
        INSERT INTO [CustomFormModule].[CaseCustomFormInstance] (
            CaseCustomFormInstanceKey,
            [Version],
            CustomFormInstanceKey,
            PreviousCaseCustomFormInstanceKey,
            ProgramKey,
            CaseKey,
            FormTypeDisplayName,
            FormTypeIdentifier,
            FormTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier,
            EntityCreatedTimestamp,
            EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier,
            EntityUpdatedTimestamp,
            EntityUpdatedUserContextKey
        )
        VALUES (
            @NewCaseCustomFormInstanceKey,
            1,
            @NewFormInstanceKey,
            NULL,
            NULL,
            @CaseKey,
            N'LTC Needs Assessment',
            2703001,
            1,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            @AccountIdentifier,
            @Now,
            @UserContextKey
        );
        PRINT '  [2] CaseCustomFormInstance created: ' + CAST(@NewCaseCustomFormInstanceKey AS NVARCHAR(36));

        -- ----------------------------------------------------------
        -- STEP 3: Copy FieldAnswerBase + answer subtypes from blueprint
        -- ----------------------------------------------------------
        -- Create mapping table: BlueprintKey -> NewKey
        DECLARE @AnswerKeyMap TABLE (
            BlueprintFieldAnswerBaseKey UNIQUEIDENTIFIER,
            NewFieldAnswerBaseKey UNIQUEIDENTIFIER,
            CustomFormElementDefinitionBaseKey UNIQUEIDENTIFIER,
            IndexNumber INT
        );

        -- Generate new keys for each blueprint answer
        INSERT INTO @AnswerKeyMap (BlueprintFieldAnswerBaseKey, NewFieldAnswerBaseKey, CustomFormElementDefinitionBaseKey, IndexNumber)
        SELECT
            fab.FieldAnswerBaseKey,
            NEWID(),
            fab.CustomFormElementDefinitionBaseKey,
            fab.IndexNumber
        FROM [CustomFormModule].[FieldAnswerBase] fab
        WHERE fab.CustomFormInstanceKey = @BlueprintFormInstanceKey;

        -- Insert FieldAnswerBase records (no PreviousFieldAnswerBaseKey for fresh form)
        INSERT INTO [CustomFormModule].[FieldAnswerBase] (
            FieldAnswerBaseKey,
            [Version],
            CustomFormElementDefinitionBaseKey,
            IndexNumber,
            PreviousFieldAnswerBaseKey,
            CustomFormInstanceKey,
            EntityCreatedAccountIdentifier,
            EntityCreatedTimestamp,
            EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier,
            EntityUpdatedTimestamp,
            EntityUpdatedUserContextKey,
            IsRequired
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            1,
            fab.CustomFormElementDefinitionBaseKey,
            fab.IndexNumber,
            NULL,  -- No previous for fresh copy
            @NewFormInstanceKey,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            fab.IsRequired
        FROM [CustomFormModule].[FieldAnswerBase] fab
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = fab.FieldAnswerBaseKey;

        DECLARE @CopiedAnswers INT = @@ROWCOUNT;
        PRINT '  [3a] FieldAnswerBase copied: ' + CAST(@CopiedAnswers AS NVARCHAR(10));

        -- Copy SimpleSingleSelectFieldAnswer
        INSERT INTO [CustomFormModule].[SimpleSingleSelectFieldAnswer] (
            FieldAnswerBaseKey,
            OptionCode,
            OptionDisplayName,
            OptionDisplayOrderNumber,
            OptionScore
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            ssfa.OptionCode,
            ssfa.OptionDisplayName,
            ssfa.OptionDisplayOrderNumber,
            ssfa.OptionScore
        FROM [CustomFormModule].[SimpleSingleSelectFieldAnswer] ssfa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = ssfa.FieldAnswerBaseKey;
        PRINT '  [3b] SimpleSingleSelectFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Copy DateFieldAnswer
        INSERT INTO [CustomFormModule].[DateFieldAnswer] (
            FieldAnswerBaseKey,
            [DateTime]
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            dfa.[DateTime]
        FROM [CustomFormModule].[DateFieldAnswer] dfa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = dfa.FieldAnswerBaseKey;
        PRINT '  [3c] DateFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Copy TextFieldAnswer
        INSERT INTO [CustomFormModule].[TextFieldAnswer] (
            FieldAnswerBaseKey,
            Note
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            tfa.Note
        FROM [CustomFormModule].[TextFieldAnswer] tfa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = tfa.FieldAnswerBaseKey;
        PRINT '  [3d] TextFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Copy NumericFieldAnswer
        INSERT INTO [CustomFormModule].[NumericFieldAnswer] (
            FieldAnswerBaseKey,
            [Value]
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            nfa.[Value]
        FROM [CustomFormModule].[NumericFieldAnswer] nfa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = nfa.FieldAnswerBaseKey;
        PRINT '  [3e] NumericFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Copy SimpleMultiSelectFieldAnswer
        INSERT INTO [CustomFormModule].[SimpleMultiSelectFieldAnswer] (
            FieldAnswerBaseKey
        )
        SELECT akm.NewFieldAnswerBaseKey
        FROM [CustomFormModule].[SimpleMultiSelectFieldAnswer] msfa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = msfa.FieldAnswerBaseKey;
        PRINT '  [3f] SimpleMultiSelectFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Copy SimpleMultiSelectFieldAnswerAnswers
        INSERT INTO [CustomFormModule].[SimpleMultiSelectFieldAnswerAnswers] (
            SimpleMultiSelectFieldAnswerKey,
            Code,
            DisplayName,
            DisplayOrderNumber,
            Score,
            IsRequired
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            msfaa.Code,
            msfaa.DisplayName,
            msfaa.DisplayOrderNumber,
            msfaa.Score,
            msfaa.IsRequired
        FROM [CustomFormModule].[SimpleMultiSelectFieldAnswerAnswers] msfaa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = msfaa.SimpleMultiSelectFieldAnswerKey;
        PRINT '  [3g] SimpleMultiSelectFieldAnswerAnswers: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Copy AggregateSingleSelectFieldAnswer (if any)
        INSERT INTO [CustomFormModule].[AggregateSingleSelectFieldAnswer] (
            FieldAnswerBaseKey,
            DisplayName,
            KeyReference
        )
        SELECT
            akm.NewFieldAnswerBaseKey,
            asfa.DisplayName,
            asfa.KeyReference
        FROM [CustomFormModule].[AggregateSingleSelectFieldAnswer] asfa
        JOIN @AnswerKeyMap akm ON akm.BlueprintFieldAnswerBaseKey = asfa.FieldAnswerBaseKey;
        PRINT '  [3h] AggregateSingleSelectFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 4: Create WorkflowInstance (CompletedState)
        -- ----------------------------------------------------------
        INSERT INTO [WorkflowModule].[WorkflowInstance] (
            WorkflowInstanceKey,
            [Version],
            Comment,
            WorkflowBindingIdentifier,
            WorkflowDefinitionIdentifier,
            AggregateKeyReference,
            AggregateClrTypeDisplayName,
            AggregateClrTypeFullName,
            CurrentStateDisplayName,
            CurrentStateName,
            WorkflowTransitionReasonDisplayName,
            WorkflowTransitionReasonIdentifier,
            WorkflowTransitionReasonCodeSystemIdentifier,
            EntityCreatedAccountIdentifier,
            EntityCreatedTimestamp,
            EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier,
            EntityUpdatedTimestamp,
            EntityUpdatedUserContextKey
        )
        VALUES (
            @NewWorkflowInstanceKey,
            3,  -- Version 3: Create(1) + InProgress(2) + Complete(3)
            NULL,
            N'CustomFormInstanceWorkflowBindingIdentifier',
            N'CustomFormInstanceSimpleWorkflowDefinition',
            @NewFormInstanceKey,
            N'Custom Form Instance',
            N'Wpc.Core.Domain.CustomFormModule.CustomFormInstanceAggregate',
            N'Completed',
            N'CompletedState',
            NULL,
            NULL,
            NULL,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            @AccountIdentifier,
            @Now,
            @UserContextKey
        );
        PRINT '  [4] WorkflowInstance created (CompletedState)';

        -- ----------------------------------------------------------
        -- STEP 5: Create WorkflowInstanceHistoryEvents
        -- ----------------------------------------------------------
        -- Event 1: Create (Start -> InProgressState)
        DECLARE @CreateEventKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO [WorkflowModule].[WorkflowInstanceHistoryEvent] (
            WorkflowInstanceHistoryEventKey,
            [Version],
            Comment,
            DaysInPreviousStateValue,
            EventName,
            TransitionTimestamp,
            WorkflowInstanceKey,
            FromStateDisplayName,
            FromStateName,
            ReasonDisplayName,
            ReasonIdentifier,
            ReasonCodeSystemIdentifier,
            ToStateDisplayName,
            ToStateName,
            TransitionedBySystemAccountDisplayName,
            TransitionedBySystemAccountKey
        )
        VALUES (
            @CreateEventKey,
            1,
            NULL,
            0,
            N'Create',
            @Now,
            @NewWorkflowInstanceKey,
            N'',
            N'Start',
            NULL,
            NULL,
            NULL,
            N'In Progress',
            N'InProgressState',
            @SystemAccountDisplayName,
            @SystemAccountKey
        );

        -- Event 2: Complete (InProgressState -> CompletedState)
        DECLARE @CompleteEventKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO [WorkflowModule].[WorkflowInstanceHistoryEvent] (
            WorkflowInstanceHistoryEventKey,
            [Version],
            Comment,
            DaysInPreviousStateValue,
            EventName,
            TransitionTimestamp,
            WorkflowInstanceKey,
            FromStateDisplayName,
            FromStateName,
            ReasonDisplayName,
            ReasonIdentifier,
            ReasonCodeSystemIdentifier,
            ToStateDisplayName,
            ToStateName,
            TransitionedBySystemAccountDisplayName,
            TransitionedBySystemAccountKey
        )
        VALUES (
            @CompleteEventKey,
            1,
            NULL,
            0,
            N'Complete',
            DATEADD(MILLISECOND, 100, @Now),  -- Slightly after Create
            @NewWorkflowInstanceKey,
            N'In Progress',
            N'InProgressState',
            NULL,
            NULL,
            NULL,
            N'Completed',
            N'CompletedState',
            @SystemAccountDisplayName,
            @SystemAccountKey
        );
        PRINT '  [5] WorkflowInstanceHistoryEvents created (Create + Complete)';

        -- ----------------------------------------------------------
        -- STEP 6: Create CompletionContext + Requirements
        -- ----------------------------------------------------------
        INSERT INTO [CompletionModule].[CompletionContext] (
            CompletionContextKey,
            [Version],
            AggregateKeyReference,
            AggregateName,
            CompletionPercentage
        )
        VALUES (
            @NewCompletionContextKey,
            1,
            @NewFormInstanceKey,
            N'CustomFormInstanceAggregate.CustomFormInstance',
            100.0
        );

        -- Copy Requirements from blueprint (all marked complete)
        IF @BlueprintCompletionContextKey IS NOT NULL
        BEGIN
            INSERT INTO [CompletionModule].[Requirement] (
                RequirementKey,
                [Version],
                IsComplete,
                CompletionContextKey,
                CategoryDisplayName,
                CategoryIdentifier,
                CategoryCodeSystemIdentifier,
                TypeDisplayName,
                TypeIdentifier,
                TypeCodeSystemIdentifier,
                ReasonDescription,
                RuleName,
                WeightValue
            )
            SELECT
                NEWID(),
                1,
                1,  -- IsComplete = true
                @NewCompletionContextKey,
                r.CategoryDisplayName,
                r.CategoryIdentifier,
                r.CategoryCodeSystemIdentifier,
                r.TypeDisplayName,
                r.TypeIdentifier,
                r.TypeCodeSystemIdentifier,
                r.ReasonDescription,
                r.RuleName,
                r.WeightValue
            FROM [CompletionModule].[Requirement] r
            WHERE r.CompletionContextKey = @BlueprintCompletionContextKey;
        END

        PRINT '  [6] CompletionContext + Requirements created (100%)';

        -- ----------------------------------------------------------
        -- STEP 7: Create CaseActivityInstance
        -- ----------------------------------------------------------
        DECLARE @NewIdentifier BIGINT;
        SELECT @NewIdentifier = NEXT VALUE FOR [CaseActivityModule].[CaseActivityInstanceIdentifierSequence];

        INSERT INTO [CaseActivityModule].[CaseActivityInstance] (
            CaseActivityInstanceKey,
            [Version],
            CaseActivityKeyReference,
            CaseKey,
            RegistrationStatusEnum,
            IsActive,
            Identifier,
            ProgramKeyReference,
            ActivityTypeDisplayName,
            ActivityTypeIdentifier,
            ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName,
            ClrTypeDisplayName,
            ClrTypeFullName,
            FormTypeDisplayName,
            FormTypeIdentifier,
            FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier,
            ProvenanceTypeDisplayName,
            ProvenanceTypeIdentifier,
            ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier,
            EntityCreatedTimestamp,
            EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier,
            EntityUpdatedTimestamp,
            EntityUpdatedUserContextKey,
            IsSharedWithPerson
        )
        VALUES (
            @NewCaseActivityInstanceKey,
            1,
            @NewCaseCustomFormInstanceKey,  -- References CaseCustomFormInstance
            @CaseKey,
            N'Registered',
            1,      -- IsActive
            @NewIdentifier,
            NULL,   -- ProgramKeyReference
            N'Form',
            11500001,
            1,
            N'Wpc.Core.Domain.CustomFormModule.CaseCustomFormInstanceAggregate, Wpc.Core.Domain, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null',
            N'Case Custom Form Instance',
            N'Wpc.Core.Domain.CustomFormModule.CaseCustomFormInstanceAggregate',
            N'LTC Needs Assessment',
            2703001,
            1,
            NULL,   -- ProvenanceSourceIdentifier
            N'Manual Entry',
            12800002,
            1,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            @AccountIdentifier,
            @Now,
            @UserContextKey,
            NULL    -- IsSharedWithPerson
        );
        PRINT '  [7] CaseActivityInstance created (Form ID: ' + CAST(@NewIdentifier AS NVARCHAR(20)) + ')';

        -- ----------------------------------------------------------
        -- STEP 8: Update CustomFormInstance version for completion
        -- ----------------------------------------------------------
        UPDATE [CustomFormModule].[CustomFormInstance]
        SET [Version] = [Version] + 1
        WHERE CustomFormInstanceKey = @NewFormInstanceKey;

        COMMIT TRANSACTION;

        PRINT '';
        PRINT '=== COMPLETE: LTC Needs Assessment created in Completed state ===';
        PRINT 'Form ID: ' + CAST(@NewIdentifier AS NVARCHAR(20));
        PRINT 'CustomFormInstanceKey: ' + CAST(@NewFormInstanceKey AS NVARCHAR(36));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();
        RAISERROR(@ErrMsg, @ErrSev, @ErrState);
        RETURN -1;
    END CATCH
END
GO
