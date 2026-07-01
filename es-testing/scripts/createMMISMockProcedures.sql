/**
 * MMIS Mock Stored Procedures
 * 
 * These procedures set the ProgramEnrollmentExtension status to simulate
 * different MMIS responses for testing when the real MMIS service is unavailable.
 *
 * Vocabulary codes sourced from [VocabularyModule] (CodeSystemIdentifier = 7):
 *   TransactionStatus:
 *     6600001 = Error (FL)
 *     6600003 = Success (SU)
 *     6600004 = Warning (SE)
 *   ConflictStatusReason:
 *     6410001 = MMIS Synchronization Failed
 *     6410002 = MMIS Synchronization Succeeded
 *     6410003 = MMIS Synchronization Succeeded With Errors
 */

-- ============================================================
-- 1. Success (SU) — Already exists, recreating for completeness
-- ============================================================
CREATE OR ALTER PROCEDURE [dbo].[test_SetMMISStatusSuccess]
    @ProgramEnrollmentKey UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    SET
        [HasConflict]                              = 0,
        [TransactionStatusCodeSystemIdentifier]    = 7,
        [TransactionStatusDisplayName]             = 'Success',
        [TransactionStatusIdentifier]              = 6600003,
        [ConflictStatusReasonCodeSystemIdentifier] = 7,
        [ConflictStatusReasonDisplayName]          = 'MMIS Synchronization Succeeded',
        [ConflictStatusReasonIdentifier]           = 6410002
    WHERE
        ProgramEnrollmentKey = @ProgramEnrollmentKey;

    IF @@ROWCOUNT = 0
        THROW 50001, 'No ProgramEnrollmentExtension row found for the provided ProgramEnrollmentKey.', 1;
END;
GO

-- ============================================================
-- 2. Failed (FL) — For TC-004, TC-029
-- ============================================================
CREATE OR ALTER PROCEDURE [dbo].[test_SetMMISStatusFailed]
    @ProgramEnrollmentKey UNIQUEIDENTIFIER,
    @ErrorCode NVARCHAR(20) = '9156',
    @ErrorDescription NVARCHAR(MAX) = 'FEA DATES DO NOT SPAN ENROLLMENT PERIOD'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExtensionKey UNIQUEIDENTIFIER;

    SELECT @ExtensionKey = ProgramEnrollmentExtensionKey
    FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey;

    IF @ExtensionKey IS NULL
        THROW 50001, 'No ProgramEnrollmentExtension row found for the provided ProgramEnrollmentKey.', 1;

    -- Set the status to Error/Failed with conflict
    UPDATE [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    SET
        [HasConflict]                              = 1,
        [TransactionStatusCodeSystemIdentifier]    = 7,
        [TransactionStatusDisplayName]             = 'Error',
        [TransactionStatusIdentifier]              = 6600001,
        [ConflictStatusReasonCodeSystemIdentifier] = 7,
        [ConflictStatusReasonDisplayName]          = 'MMIS Synchronization Failed',
        [ConflictStatusReasonIdentifier]           = 6410001
    WHERE
        ProgramEnrollmentExtensionKey = @ExtensionKey;

    -- Insert error message into ProgramEnrollmentExtensionMessages
    INSERT INTO [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtensionMessages] (
        [ProgramEnrollmentExtensionKey],
        [ClassificationCode],
        [Code],
        [Description],
        [ErrorTypeCode],
        [Timestamp]
    )
    VALUES (
        @ExtensionKey,
        'Hard',
        @ErrorCode,
        @ErrorDescription,
        '01',
        GETUTCDATE()
    );
END;
GO

-- ============================================================
-- 3. Warning / SE — For TC-030
-- ============================================================
CREATE OR ALTER PROCEDURE [dbo].[test_SetMMISStatusWarning]
    @ProgramEnrollmentKey UNIQUEIDENTIFIER,
    @ErrorCode NVARCHAR(20) = '9199',
    @ErrorDescription NVARCHAR(MAX) = 'ENROLLMENT PROCESSED WITH WARNINGS'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExtensionKey UNIQUEIDENTIFIER;

    SELECT @ExtensionKey = ProgramEnrollmentExtensionKey
    FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey;

    IF @ExtensionKey IS NULL
        THROW 50001, 'No ProgramEnrollmentExtension row found for the provided ProgramEnrollmentKey.', 1;

    -- Set the status to Warning (SE) — no conflict, enrollment still activated
    UPDATE [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    SET
        [HasConflict]                              = 0,
        [TransactionStatusCodeSystemIdentifier]    = 7,
        [TransactionStatusDisplayName]             = 'Warning',
        [TransactionStatusIdentifier]              = 6600004,
        [ConflictStatusReasonCodeSystemIdentifier] = 7,
        [ConflictStatusReasonDisplayName]          = 'MMIS Synchronization Succeeded With Errors',
        [ConflictStatusReasonIdentifier]           = 6410003
    WHERE
        ProgramEnrollmentExtensionKey = @ExtensionKey;

    -- Insert warning message into ProgramEnrollmentExtensionMessages
    INSERT INTO [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtensionMessages] (
        [ProgramEnrollmentExtensionKey],
        [ClassificationCode],
        [Code],
        [Description],
        [ErrorTypeCode],
        [Timestamp]
    )
    VALUES (
        @ExtensionKey,
        'Hard',
        @ErrorCode,
        @ErrorDescription,
        '01',
        GETUTCDATE()
    );
END;
GO

-- ============================================================
-- Example usage:
-- ============================================================
-- Success: EXEC [dbo].[test_SetMMISStatusSuccess] @ProgramEnrollmentKey = '{key}';
-- Failed:  EXEC [dbo].[test_SetMMISStatusFailed]  @ProgramEnrollmentKey = '{key}', @ErrorCode = '9156', @ErrorDescription = 'FEA DATES DO NOT SPAN';
-- Warning: EXEC [dbo].[test_SetMMISStatusWarning] @ProgramEnrollmentKey = '{key}', @ErrorCode = '9199', @ErrorDescription = 'PROCESSED WITH WARNINGS';
