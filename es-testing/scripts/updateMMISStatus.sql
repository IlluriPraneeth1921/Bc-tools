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

-- Example usage:
-- EXEC [dbo].[test_SetMMISStatusSuccess] @ProgramEnrollmentKey = 'c964fa12-c0e9-4ecb-83ff-b4790176f758';
