-- ============================================================
-- Stored Procedure: test_DeleteProgramEnrollmentByPersonKey
--
-- Purpose: Deletes all Program Enrollment records and related
--          data across multiple tables for a given PersonKey.
--
-- Parameters:
--   @PersonKey UNIQUEIDENTIFIER - The PersonKey (UUID) to delete records for
--
-- Tables affected (in deletion order to respect FK constraints):
--   1. CustomerProgramEnrollmentModule.SyncTransactionMessages
--   2. CustomerProgramEnrollmentModule.SyncTransaction
--   3. CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
--   4. CustomerProgramEnrollmentModule.SuccessTransaction
--   5. CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
--   6. ProgramEnrollmentModule.SynchronizationRecord
--   7. ProgramEnrollmentModule.ProgramEnrollmentSuspension
--   8. ProgramEnrollmentModule.ProgramEnrollment
--
-- Usage:
--   EXEC dbo.test_DeleteProgramEnrollmentByPersonKey 
--     @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd';
--
-- Notes:
--   - Wrapped in a transaction for atomicity
--   - Prints row counts for each table affected
--   - Rolls back on any error
--   - Does NOT delete the Case record itself
-- ============================================================

CREATE OR ALTER PROCEDURE dbo.test_DeleteProgramEnrollmentByPersonKey
    @PersonKey UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Validate input
    IF @PersonKey IS NULL
    BEGIN
        RAISERROR('PersonKey parameter cannot be NULL.', 16, 1);
        RETURN -1;
    END

    -- Verify the person exists
    IF NOT EXISTS (SELECT 1 FROM CaseModule.[Case] WHERE PersonKey = @PersonKey)
    BEGIN
        PRINT 'No Case record found for PersonKey: ' + CAST(@PersonKey AS NVARCHAR(36));
        PRINT 'No records to delete.';
        RETURN 0;
    END

    DECLARE @RowCount INT;
    DECLARE @TotalDeleted INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- ============================================================
        -- Step 1: Delete SyncTransactionMessages
        -- (deepest child - FK references SyncTransaction)
        -- ============================================================
        DELETE stm
        FROM CustomerProgramEnrollmentModule.SyncTransactionMessages stm
        INNER JOIN CustomerProgramEnrollmentModule.SyncTransaction st
            ON st.SyncTransactionKey = stm.SyncTransactionKey
        INNER JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
            ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from CustomerProgramEnrollmentModule.SyncTransactionMessages';

        -- ============================================================
        -- Step 2: Delete SyncTransaction
        -- (FK references ProgramEnrollmentExtension)
        -- ============================================================
        DELETE st
        FROM CustomerProgramEnrollmentModule.SyncTransaction st
        INNER JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
            ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from CustomerProgramEnrollmentModule.SyncTransaction';

        -- ============================================================
        -- Step 3: Delete ProgramEnrollmentExtensionMessages
        -- (FK references ProgramEnrollmentExtension)
        -- ============================================================
        DELETE peem
        FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages peem
        INNER JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
            ON pee.ProgramEnrollmentExtensionKey = peem.ProgramEnrollmentExtensionKey
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages';

        -- ============================================================
        -- Step 4: Delete SuccessTransaction
        -- (FK references ProgramEnrollmentExtension via ProgramEnrollmentExtensionKey)
        -- ============================================================
        DELETE suc
        FROM CustomerProgramEnrollmentModule.SuccessTransaction suc
        INNER JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
            ON pee.ProgramEnrollmentExtensionKey = suc.ProgramEnrollmentExtensionKey
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from CustomerProgramEnrollmentModule.SuccessTransaction';

        -- ============================================================
        -- Step 5: Delete ProgramEnrollmentExtension
        -- (FK references ProgramEnrollment)
        -- ============================================================
        DELETE pee
        FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from CustomerProgramEnrollmentModule.ProgramEnrollmentExtension';

        -- ============================================================
        -- Step 6: Delete SynchronizationRecord
        -- (FK references ProgramEnrollment)
        -- ============================================================
        DELETE sr
        FROM ProgramEnrollmentModule.SynchronizationRecord sr
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = sr.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from ProgramEnrollmentModule.SynchronizationRecord';

        -- ============================================================
        -- Step 7: Delete ProgramEnrollmentSuspension
        -- (FK references ProgramEnrollment)
        -- ============================================================
        DELETE pes
        FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension pes
        INNER JOIN ProgramEnrollmentModule.ProgramEnrollment pe
            ON pe.ProgramEnrollmentKey = pes.ProgramEnrollmentKey
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from ProgramEnrollmentModule.ProgramEnrollmentSuspension';

        -- ============================================================
        -- Step 8: Delete ProgramEnrollment
        -- (parent table - delete last)
        -- ============================================================
        DELETE pe
        FROM ProgramEnrollmentModule.ProgramEnrollment pe
        INNER JOIN CaseModule.[Case] c
            ON c.CaseKey = pe.CaseKey
        WHERE c.PersonKey = @PersonKey;

        SET @RowCount = @@ROWCOUNT;
        SET @TotalDeleted = @TotalDeleted + @RowCount;
        PRINT 'Deleted ' + CAST(@RowCount AS NVARCHAR(10)) + ' rows from ProgramEnrollmentModule.ProgramEnrollment';

        -- ============================================================
        -- Commit
        -- ============================================================
        COMMIT TRANSACTION;

        PRINT '';
        PRINT '=== DELETION COMPLETE ===';
        PRINT 'PersonKey: ' + CAST(@PersonKey AS NVARCHAR(36));
        PRINT 'Total rows deleted across all tables: ' + CAST(@TotalDeleted AS NVARCHAR(10));

        RETURN 0;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        DECLARE @ErrorLine INT = ERROR_LINE();

        PRINT '';
        PRINT '=== ERROR - TRANSACTION ROLLED BACK ===';
        PRINT 'Error Message: ' + @ErrorMessage;
        PRINT 'Error Line: ' + CAST(@ErrorLine AS NVARCHAR(10));
        PRINT 'PersonKey: ' + CAST(@PersonKey AS NVARCHAR(36));

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN -1;
    END CATCH
END
GO

-- ============================================================
-- Example Usage:
-- ============================================================
-- EXEC dbo.test_DeleteProgramEnrollmentByPersonKey 
--     @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd';
-- ============================================================
