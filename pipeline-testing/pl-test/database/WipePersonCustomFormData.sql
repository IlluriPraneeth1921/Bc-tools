-- ============================================================
-- Script: WipePersonCustomFormData.sql
--
-- Purpose: Deletes ALL custom form data for a person, including:
--   - FieldAnswer subtypes (SimpleSingleSelect, Date, Text, Numeric, 
--     MultiSelect, Aggregate, LikertScale, Time)
--   - FieldAnswerBase records
--   - CustomFormInstanceSignatureField + Signatures
--   - WorkflowInstanceHistoryEvent + WorkflowInstance
--   - CompletionModule.Requirement + CompletionContext
--   - CaseActivityInstance (form type)
--   - CaseCustomFormInstance
--   - CustomFormInstance
--
-- Parameters:
--   @MedicaidNumber NVARCHAR(20) - The person's active Medicaid number
--   @DryRun BIT                  - 1 = report only, 0 = execute (default: 1)
--
-- Usage:
--   -- Dry run:
--   EXEC dbo.test_WipePersonCustomFormData
--     @MedicaidNumber = '4774443560', @DryRun = 1;
--
--   -- Execute:
--   EXEC dbo.test_WipePersonCustomFormData
--     @MedicaidNumber = '4774443560', @DryRun = 0;
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO
SET ANSI_NULLS ON;
GO

CREATE OR ALTER PROCEDURE dbo.test_WipePersonCustomFormData
    @MedicaidNumber NVARCHAR(20),
    @DryRun BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- ==============================
    -- RESOLVE: Person and Case
    -- ==============================
    DECLARE @PersonKey UNIQUEIDENTIFIER;
    SELECT @PersonKey = PersonKey
    FROM [PersonModule].[PersonLookup]
    WHERE ActiveMedicaidNumber = @MedicaidNumber;

    IF @PersonKey IS NULL
    BEGIN
        RAISERROR('ERROR: Person not found for Medicaid number: %s', 16, 1, @MedicaidNumber);
        RETURN -1;
    END

    DECLARE @CaseKey UNIQUEIDENTIFIER;
    SELECT @CaseKey = CaseKey
    FROM [CaseModule].[Case]
    WHERE PersonKey = @PersonKey;

    IF @CaseKey IS NULL
    BEGIN
        RAISERROR('ERROR: Case not found for PersonKey.', 16, 1);
        RETURN -1;
    END

    -- ==============================
    -- COLLECT: All CustomFormInstance keys for this person
    -- ==============================
    DECLARE @FormInstances TABLE (CustomFormInstanceKey UNIQUEIDENTIFIER);
    
    INSERT INTO @FormInstances
    SELECT ccfi.CustomFormInstanceKey
    FROM [CustomFormModule].[CaseCustomFormInstance] ccfi
    WHERE ccfi.CaseKey = @CaseKey;

    DECLARE @FormCount INT = (SELECT COUNT(*) FROM @FormInstances);

    -- ==============================
    -- COLLECT: All FieldAnswerBase keys
    -- ==============================
    DECLARE @FieldAnswers TABLE (FieldAnswerBaseKey UNIQUEIDENTIFIER);
    
    INSERT INTO @FieldAnswers
    SELECT fab.FieldAnswerBaseKey
    FROM [CustomFormModule].[FieldAnswerBase] fab
    WHERE fab.CustomFormInstanceKey IN (SELECT CustomFormInstanceKey FROM @FormInstances);

    DECLARE @AnswerCount INT = (SELECT COUNT(*) FROM @FieldAnswers);

    -- ==============================
    -- COLLECT: CaseCustomFormInstance keys
    -- ==============================
    DECLARE @CaseFormInstances TABLE (CaseCustomFormInstanceKey UNIQUEIDENTIFIER);
    
    INSERT INTO @CaseFormInstances
    SELECT ccfi.CaseCustomFormInstanceKey
    FROM [CustomFormModule].[CaseCustomFormInstance] ccfi
    WHERE ccfi.CaseKey = @CaseKey;

    -- ==============================
    -- DRY RUN REPORT
    -- ==============================
    PRINT '=== WIPE PERSON CUSTOM FORM DATA ===';
    PRINT 'Medicaid Number:  ' + @MedicaidNumber;
    PRINT 'PersonKey:        ' + CAST(@PersonKey AS NVARCHAR(36));
    PRINT 'CaseKey:          ' + CAST(@CaseKey AS NVARCHAR(36));
    PRINT 'Forms to delete:  ' + CAST(@FormCount AS NVARCHAR(10));
    PRINT 'Answers to delete:' + CAST(@AnswerCount AS NVARCHAR(10));
    PRINT '';

    IF @FormCount = 0
    BEGIN
        PRINT 'No custom forms found for this person. Nothing to do.';
        RETURN 0;
    END

    -- List forms being deleted
    SELECT 
        ccfi.CaseCustomFormInstanceKey,
        ccfi.FormTypeDisplayName,
        cfi.CustomFormInstanceKey,
        cfi.EntityCreatedTimestamp,
        wi.CurrentStateDisplayName AS WorkflowState
    FROM [CustomFormModule].[CaseCustomFormInstance] ccfi
    JOIN [CustomFormModule].[CustomFormInstance] cfi
        ON cfi.CustomFormInstanceKey = ccfi.CustomFormInstanceKey
    LEFT JOIN [WorkflowModule].[WorkflowInstance] wi
        ON wi.AggregateKeyReference = cfi.CustomFormInstanceKey
        AND wi.WorkflowDefinitionIdentifier = 'CustomFormInstanceSimpleWorkflowDefinition'
    WHERE ccfi.CaseKey = @CaseKey;

    IF @DryRun = 1
    BEGIN
        PRINT '';
        PRINT '*** DRY RUN - NO CHANGES WILL BE MADE ***';
        PRINT '*** Re-run with @DryRun = 0 to execute ***';
        RETURN 0;
    END

    -- ==============================
    -- EXECUTE DELETION
    -- ==============================
    BEGIN TRY
        BEGIN TRANSACTION;

        -- ----------------------------------------------------------
        -- STEP 1: Delete FieldAnswer subtype records
        -- ----------------------------------------------------------
        DELETE FROM [CustomFormModule].[SimpleMultiSelectFieldAnswerAnswers]
        WHERE SimpleMultiSelectFieldAnswerKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  SimpleMultiSelectFieldAnswerAnswers: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[SimpleMultiSelectFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  SimpleMultiSelectFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[SimpleSingleSelectFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  SimpleSingleSelectFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[DateFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  DateFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[TextFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  TextFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[NumericFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  NumericFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[AggregateSingleSelectFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  AggregateSingleSelectFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[LikertScaleFieldAnswerAnswers]
        WHERE LikertScaleFieldAnswerKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  LikertScaleFieldAnswerAnswers: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[LikertScaleFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  LikertScaleFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[TimeFieldAnswer]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  TimeFieldAnswer: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 2: Break self-referencing FK on FieldAnswerBase, then delete
        -- ----------------------------------------------------------
        UPDATE [CustomFormModule].[FieldAnswerBase]
        SET PreviousFieldAnswerBaseKey = NULL
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers)
            AND PreviousFieldAnswerBaseKey IS NOT NULL;

        DELETE FROM [CustomFormModule].[FieldAnswerBase]
        WHERE FieldAnswerBaseKey IN (SELECT FieldAnswerBaseKey FROM @FieldAnswers);
        PRINT '  FieldAnswerBase: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 3: Delete Signature fields
        -- ----------------------------------------------------------
        DELETE FROM [CustomFormModule].[CustomFormInstanceSignatureFieldSignatures]
        WHERE CustomFormInstanceSignatureFieldKey IN (
            SELECT CustomFormInstanceSignatureFieldKey
            FROM [CustomFormModule].[CustomFormInstanceSignatureField]
            WHERE CustomFormInstanceKey IN (SELECT CustomFormInstanceKey FROM @FormInstances)
        );
        PRINT '  CustomFormInstanceSignatureFieldSignatures: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CustomFormModule].[CustomFormInstanceSignatureField]
        WHERE CustomFormInstanceKey IN (SELECT CustomFormInstanceKey FROM @FormInstances);
        PRINT '  CustomFormInstanceSignatureField: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 4: Delete WorkflowInstanceHistoryEvent + WorkflowInstance
        -- ----------------------------------------------------------
        DELETE FROM [WorkflowModule].[WorkflowInstanceHistoryEvent]
        WHERE WorkflowInstanceKey IN (
            SELECT WorkflowInstanceKey
            FROM [WorkflowModule].[WorkflowInstance]
            WHERE AggregateKeyReference IN (SELECT CustomFormInstanceKey FROM @FormInstances)
                AND WorkflowDefinitionIdentifier = 'CustomFormInstanceSimpleWorkflowDefinition'
        );
        PRINT '  WorkflowInstanceHistoryEvent: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [WorkflowModule].[WorkflowInstance]
        WHERE AggregateKeyReference IN (SELECT CustomFormInstanceKey FROM @FormInstances)
            AND WorkflowDefinitionIdentifier = 'CustomFormInstanceSimpleWorkflowDefinition';
        PRINT '  WorkflowInstance: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 5: Delete CompletionModule records
        -- ----------------------------------------------------------
        DELETE FROM [CompletionModule].[Requirement]
        WHERE CompletionContextKey IN (
            SELECT CompletionContextKey
            FROM [CompletionModule].[CompletionContext]
            WHERE AggregateKeyReference IN (SELECT CustomFormInstanceKey FROM @FormInstances)
        );
        PRINT '  Completion Requirements: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM [CompletionModule].[CompletionContext]
        WHERE AggregateKeyReference IN (SELECT CustomFormInstanceKey FROM @FormInstances);
        PRINT '  CompletionContext: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 6: Delete CaseActivityInstance (Custom Form entries)
        -- NOTE: CaseActivityInstance has indexed views requiring QUOTED_IDENTIFIER ON
        -- which is already set at the top of this procedure.
        -- ----------------------------------------------------------
        DELETE FROM [CaseActivityModule].[CaseActivityInstance]
        WHERE CaseKey = @CaseKey
            AND ClrTypeDisplayName = 'Case Custom Form Instance'
            AND CaseActivityKeyReference IN (SELECT CaseCustomFormInstanceKey FROM @CaseFormInstances);
        PRINT '  CaseActivityInstance: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 7: Break self-referencing FK on CaseCustomFormInstance, then delete
        -- ----------------------------------------------------------
        UPDATE [CustomFormModule].[CaseCustomFormInstance]
        SET PreviousCaseCustomFormInstanceKey = NULL
        WHERE CaseKey = @CaseKey
            AND PreviousCaseCustomFormInstanceKey IS NOT NULL;

        DELETE FROM [CustomFormModule].[CaseCustomFormInstance]
        WHERE CaseKey = @CaseKey;
        PRINT '  CaseCustomFormInstance: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- ----------------------------------------------------------
        -- STEP 8: Break self-referencing FK on CustomFormInstance, then delete
        -- ----------------------------------------------------------
        UPDATE [CustomFormModule].[CustomFormInstance]
        SET PreviousCustomFormInstanceKey = NULL
        WHERE CustomFormInstanceKey IN (SELECT CustomFormInstanceKey FROM @FormInstances)
            AND PreviousCustomFormInstanceKey IS NOT NULL;

        DELETE FROM [CustomFormModule].[CustomFormInstance]
        WHERE CustomFormInstanceKey IN (SELECT CustomFormInstanceKey FROM @FormInstances);
        PRINT '  CustomFormInstance: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        COMMIT TRANSACTION;

        PRINT '';
        PRINT '=== COMPLETE: All custom form data wiped for person ===';
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
