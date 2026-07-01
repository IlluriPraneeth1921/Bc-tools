/**
 * TC-012 Precondition Setup Script
 * 
 * Simulates a completed TC-001 + TC-002 state for the test participant.
 * This seeds the ProgramEnrollmentExtension and SyncTransaction tables
 * to reflect a prior successful suspension sync (3 MMIS spans exist in MMIS).
 *
 * After running this, the system believes:
 *   - Span-A (Active):    2026-07-01 to 2026-07-01 (closed by suspension)
 *   - Span-B (Suspended): 2026-07-02 to 2026-09-13 (suspension span)
 *   - Span-C (Active):    2026-09-14 to 2299-12-31 (post-suspension)
 *
 * Suspension in BC: Start=07/01/2026, End=09/14/2026
 * MMIS offsets: Span-B begin = BC start + 1 day, Span-B end = BC end - 1 day
 */

-- ============================================================
-- Make sure you are in the correct database!
-- Uncomment the USE statement below and set your DB name:
-- ============================================================
-- USE [WiDHS.F2.Carity];
-- GO

-- ============================================================
-- CONFIGURATION: Set your keys here
-- ============================================================
DECLARE @PersonKey              UNIQUEIDENTIFIER = 'c7a3862e-f166-466d-a5fb-b4670130aebd';
DECLARE @ProgramEnrollmentKey   UNIQUEIDENTIFIER = '07973078-9c24-4cff-baa4-b47a00c704f2';

-- ============================================================
-- PRE-CHECK: Verify the ProgramEnrollmentKey actually exists
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM [ProgramEnrollmentModule].[ProgramEnrollment]
    WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey
)
BEGIN
    -- Try to find enrollment for this person to help diagnose
    PRINT 'ERROR: ProgramEnrollmentKey not found in ProgramEnrollmentModule.ProgramEnrollment!';
    PRINT 'Provided key: ' + CAST(@ProgramEnrollmentKey AS NVARCHAR(36));
    PRINT '';
    PRINT 'Looking for enrollments via CaseKey for this person...';
    
    SELECT TOP 5
        pe.ProgramEnrollmentKey,
        pe.StatusDisplayName,
        pe.EnrollmentDateRangeStartDate,
        pe.EnrollmentDateRangeEndDate,
        p.DisplayName AS ProgramName
    FROM [ProgramEnrollmentModule].[ProgramEnrollment] pe
    JOIN [ProgramModule].[Program] p ON p.ProgramKey = pe.ProgramKey
    WHERE pe.CaseKey IN (
        SELECT CaseKey FROM [CaseModule].[Case] 
        WHERE CaseKey IN (
            SELECT CaseKey FROM [PersonModule].[PersonLocationAssignment]
            WHERE PersonKey = @PersonKey
        )
    )
    ORDER BY pe.EnrollmentDateRangeStartDate DESC;

    PRINT '';
    PRINT 'Use one of the ProgramEnrollmentKey values above and re-run the script.';
    RETURN;
END

PRINT 'OK: ProgramEnrollmentKey verified in ProgramEnrollmentModule.ProgramEnrollment';

-- ============================================================
-- VARIABLES
-- ============================================================
DECLARE @ProgramEnrollmentExtensionKey UNIQUEIDENTIFIER;
DECLARE @SyncTxn1Key            UNIQUEIDENTIFIER = NEWID();
DECLARE @SyncTxn2Key            UNIQUEIDENTIFIER = NEWID();
DECLARE @SyncTxn3Key            UNIQUEIDENTIFIER = NEWID();
DECLARE @SyncTxn4Key            UNIQUEIDENTIFIER = NEWID();

-- Dates (based on your current suspension: Start=07/01/2026, End=09/14/2026)
DECLARE @EnrollmentBeginDate    DATE = '2026-07-01';
DECLARE @SuspensionStartDate    DATE = '2026-07-01';
DECLARE @SuspensionEndDate      DATE = '2026-09-14';
DECLARE @EnrollmentEndDate      DATE = '2299-12-31';

-- MMIS span dates (with offsets per BR-D01-017, BR-D01-018)
DECLARE @SpanA_Begin            DATE = '2026-07-01';
DECLARE @SpanA_End              DATE = '2026-07-01';
DECLARE @SpanB_Begin            DATE = '2026-07-02';
DECLARE @SpanB_End              DATE = '2026-09-13';
DECLARE @SpanC_Begin            DATE = '2026-09-14';
DECLARE @SpanC_End              DATE = '2299-12-31';

DECLARE @Now                    DATETIME2 = GETUTCDATE();
DECLARE @SystemAccount          NVARCHAR(508) = 'SYSTEM\EnrollmentSync';

-- ============================================================
-- STEP 1: Upsert ProgramEnrollmentExtension
-- ============================================================
IF EXISTS (
    SELECT 1 FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey
)
BEGIN
    SELECT @ProgramEnrollmentExtensionKey = ProgramEnrollmentExtensionKey
    FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    WHERE ProgramEnrollmentKey = @ProgramEnrollmentKey;

    UPDATE [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    SET
        [HasConflict]                              = 0,
        [IdUniqueClientIdentifier]                 = '1430000013',
        [LastChangeTypeCode]                       = 'NewSuspension',
        [LastSuspensionChangeTypeCode]             = 'NewSuspension',
        [LastSynchronizedTimestamp]                 = @Now,
        [MmisEffectiveDate]                        = @SpanC_Begin,
        [MmisEndDate]                              = @SpanC_End,
        [PreUpdateBeginDate]                       = @EnrollmentBeginDate,
        [PreUpdateEndDate]                         = @EnrollmentEndDate,
        [PreUpdateSuspensionStartDate]             = NULL,
        [PreUpdateSuspensionEndDate]               = NULL,
        [ResponseStatusCode]                       = 'SU',
        [SubmittedClientId]                        = '1430000013',
        [TransactionTypeCode]                      = 'O',
        [TxnRefId]                                 = 'S000000004',
        [TransactionStatusCodeSystemIdentifier]    = 7,
        [TransactionStatusDisplayName]             = 'Success',
        [TransactionStatusIdentifier]              = 6600003,
        [ConflictStatusReasonCodeSystemIdentifier] = 7,
        [ConflictStatusReasonDisplayName]          = 'MMIS Synchronization Succeeded',
        [ConflictStatusReasonIdentifier]           = 6410002,
        [EventTypeDisplayName]                     = 'Suspension triggered',
        [EntityUpdatedAccountIdentifier]           = @SystemAccount,
        [EntityUpdatedTimestamp]                    = @Now
    WHERE
        ProgramEnrollmentExtensionKey = @ProgramEnrollmentExtensionKey;

    PRINT 'Updated existing ProgramEnrollmentExtension: ' + CAST(@ProgramEnrollmentExtensionKey AS NVARCHAR(36));
END
ELSE
BEGIN
    SET @ProgramEnrollmentExtensionKey = NEWID();

    INSERT INTO [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension] (
        [ProgramEnrollmentExtensionKey],
        [Version],
        [HasConflict],
        [IdUniqueClientIdentifier],
        [LastChangeTypeCode],
        [LastSuspensionChangeTypeCode],
        [LastSynchronizedTimestamp],
        [MmisEffectiveDate],
        [MmisEndDate],
        [PreUpdateBeginDate],
        [PreUpdateEndDate],
        [PreUpdateSuspensionStartDate],
        [PreUpdateSuspensionEndDate],
        [ProgramEnrollmentKey],
        [ResponseStatusCode],
        [SubmittedClientId],
        [TransactionTypeCode],
        [TxnRefId],
        [TransactionStatusCodeSystemIdentifier],
        [TransactionStatusDisplayName],
        [TransactionStatusIdentifier],
        [ConflictStatusReasonCodeSystemIdentifier],
        [ConflictStatusReasonDisplayName],
        [ConflictStatusReasonIdentifier],
        [EventTypeDisplayName],
        [EntityCreatedAccountIdentifier],
        [EntityCreatedTimestamp],
        [EntityUpdatedAccountIdentifier],
        [EntityUpdatedTimestamp]
    )
    VALUES (
        @ProgramEnrollmentExtensionKey,
        1,
        0,
        '1430000013',
        'NewSuspension',
        'NewSuspension',
        @Now,
        @SpanC_Begin,
        @SpanC_End,
        @EnrollmentBeginDate,
        @EnrollmentEndDate,
        NULL,
        NULL,
        @ProgramEnrollmentKey,
        'SU',
        '1430000013',
        'O',
        'S000000004',
        7,
        'Success',
        6600003,
        7,
        'MMIS Synchronization Succeeded',
        6410002,
        'Suspension triggered',
        @SystemAccount,
        @Now,
        @SystemAccount,
        @Now
    );

    PRINT 'Inserted new ProgramEnrollmentExtension: ' + CAST(@ProgramEnrollmentExtensionKey AS NVARCHAR(36));
END

-- Verify the extension row actually exists before proceeding
IF NOT EXISTS (
    SELECT 1 FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension]
    WHERE ProgramEnrollmentExtensionKey = @ProgramEnrollmentExtensionKey
)
BEGIN
    PRINT 'ERROR: ProgramEnrollmentExtension row does not exist after upsert!';
    PRINT 'The INSERT likely failed due to a FK constraint.';
    PRINT 'Check that ProgramEnrollmentKey exists in ProgramEnrollmentModule.ProgramEnrollment.';
    RETURN;
END

-- ============================================================
-- STEP 2: Clear any existing SyncTransaction rows (clean slate)
-- ============================================================
DELETE FROM [CustomerProgramEnrollmentModule].[SyncTransactionMessages]
WHERE SyncTransactionKey IN (
    SELECT SyncTransactionKey 
    FROM [CustomerProgramEnrollmentModule].[SyncTransaction]
    WHERE ProgramEnrollmentExtensionKey = @ProgramEnrollmentExtensionKey
);

DELETE FROM [CustomerProgramEnrollmentModule].[SyncTransaction]
WHERE ProgramEnrollmentExtensionKey = @ProgramEnrollmentExtensionKey;

PRINT 'Cleared existing SyncTransaction rows';

-- ============================================================
-- STEP 3: Insert TC-001 initial enrollment transaction
-- ============================================================
INSERT INTO [CustomerProgramEnrollmentModule].[SyncTransaction] (
    [SyncTransactionKey],
    [Version],
    [ChangeTypeCode],
    [IdUniqueClientIdentifier],
    [MmisEffectiveDate],
    [MmisEndDate],
    [ProgramEnrollmentExtensionKey],
    [ResponseStatusCode],
    [SubmittedClientId],
    [Timestamp],
    [TransactionTypeCode],
    [TxnRefId],
    [MmisTransactionTypeName],
    [StatusDisplayName],
    [EntityCreatedAccountIdentifier],
    [EntityCreatedTimestamp],
    [EntityUpdatedAccountIdentifier],
    [EntityUpdatedTimestamp]
)
VALUES (
    @SyncTxn1Key,
    1,
    'NewEnrollment',
    '1430000013',
    @EnrollmentBeginDate,
    @EnrollmentEndDate,
    @ProgramEnrollmentExtensionKey,
    'SU',
    '1430000013',
    DATEADD(MINUTE, -30, @Now),
    'O',
    'S000000001',
    'S520',
    'Success',
    @SystemAccount,
    DATEADD(MINUTE, -30, @Now),
    @SystemAccount,
    DATEADD(MINUTE, -30, @Now)
);

PRINT 'Inserted SyncTransaction 1: TC-001 initial enrollment (S520)';

-- ============================================================
-- STEP 4: Insert TC-002 Transaction 1 — S500 (Close Span-A)
-- ============================================================
INSERT INTO [CustomerProgramEnrollmentModule].[SyncTransaction] (
    [SyncTransactionKey],
    [Version],
    [ChangeTypeCode],
    [IdUniqueClientIdentifier],
    [MmisEffectiveDate],
    [MmisEndDate],
    [PreUpdateSuspensionStartDate],
    [PreUpdateSuspensionEndDate],
    [ProgramEnrollmentExtensionKey],
    [ResponseStatusCode],
    [SubmittedClientId],
    [SuspensionChangeTypeCode],
    [Timestamp],
    [TransactionTypeCode],
    [TxnRefId],
    [MmisTransactionTypeName],
    [StatusDisplayName],
    [EntityCreatedAccountIdentifier],
    [EntityCreatedTimestamp],
    [EntityUpdatedAccountIdentifier],
    [EntityUpdatedTimestamp]
)
VALUES (
    @SyncTxn2Key,
    1,
    'NewSuspension',
    '1430000013',
    @SpanA_Begin,
    @SpanA_End,
    NULL,
    NULL,
    @ProgramEnrollmentExtensionKey,
    'SU',
    '1430000013',
    'NewSuspension',
    DATEADD(MINUTE, -15, @Now),
    'C',
    'S000000002',
    'S500',
    'Success',
    @SystemAccount,
    DATEADD(MINUTE, -15, @Now),
    @SystemAccount,
    DATEADD(MINUTE, -15, @Now)
);

PRINT 'Inserted SyncTransaction 2: TC-002 S500 Close Span-A';

-- ============================================================
-- STEP 5: Insert TC-002 Transaction 2 — S510 (Add Span-B Suspension)
-- ============================================================
INSERT INTO [CustomerProgramEnrollmentModule].[SyncTransaction] (
    [SyncTransactionKey],
    [Version],
    [ChangeTypeCode],
    [IdUniqueClientIdentifier],
    [MmisEffectiveDate],
    [MmisEndDate],
    [ProgramEnrollmentExtensionKey],
    [ResponseStatusCode],
    [SubmittedClientId],
    [SuspensionChangeTypeCode],
    [Timestamp],
    [TransactionTypeCode],
    [TxnRefId],
    [MmisTransactionTypeName],
    [StatusDisplayName],
    [EntityCreatedAccountIdentifier],
    [EntityCreatedTimestamp],
    [EntityUpdatedAccountIdentifier],
    [EntityUpdatedTimestamp]
)
VALUES (
    @SyncTxn3Key,
    1,
    'NewSuspension',
    '1430000013',
    @SpanB_Begin,
    @SpanB_End,
    @ProgramEnrollmentExtensionKey,
    'SU',
    '1430000013',
    'NewSuspension',
    DATEADD(MINUTE, -14, @Now),
    'O',
    'S000000003',
    'S510',
    'Success',
    @SystemAccount,
    DATEADD(MINUTE, -14, @Now),
    @SystemAccount,
    DATEADD(MINUTE, -14, @Now)
);

PRINT 'Inserted SyncTransaction 3: TC-002 S510 Add Span-B';

-- ============================================================
-- STEP 6: Insert TC-002 Transaction 3 — S520 (Create Span-C)
-- ============================================================
INSERT INTO [CustomerProgramEnrollmentModule].[SyncTransaction] (
    [SyncTransactionKey],
    [Version],
    [ChangeTypeCode],
    [IdUniqueClientIdentifier],
    [MmisEffectiveDate],
    [MmisEndDate],
    [ProgramEnrollmentExtensionKey],
    [ResponseStatusCode],
    [SubmittedClientId],
    [SuspensionChangeTypeCode],
    [Timestamp],
    [TransactionTypeCode],
    [TxnRefId],
    [MmisTransactionTypeName],
    [StatusDisplayName],
    [EntityCreatedAccountIdentifier],
    [EntityCreatedTimestamp],
    [EntityUpdatedAccountIdentifier],
    [EntityUpdatedTimestamp]
)
VALUES (
    @SyncTxn4Key,
    1,
    'NewSuspension',
    '1430000013',
    @SpanC_Begin,
    @SpanC_End,
    @ProgramEnrollmentExtensionKey,
    'SU',
    '1430000013',
    'NewSuspension',
    DATEADD(MINUTE, -13, @Now),
    'O',
    'S000000004',
    'S520',
    'Success',
    @SystemAccount,
    DATEADD(MINUTE, -13, @Now),
    @SystemAccount,
    DATEADD(MINUTE, -13, @Now)
);

PRINT 'Inserted SyncTransaction 4: TC-002 S520 Create Span-C';

-- ============================================================
-- STEP 7: Clear any extension messages (clean state)
-- ============================================================
DELETE FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtensionMessages]
WHERE ProgramEnrollmentExtensionKey = @ProgramEnrollmentExtensionKey;

-- ============================================================
-- VERIFICATION
-- ============================================================
PRINT '';
PRINT '=== TC-012 Precondition Setup Complete ===';
PRINT 'PersonKey:                     ' + CAST(@PersonKey AS NVARCHAR(36));
PRINT 'ProgramEnrollmentKey:          ' + CAST(@ProgramEnrollmentKey AS NVARCHAR(36));
PRINT 'ProgramEnrollmentExtensionKey: ' + CAST(@ProgramEnrollmentExtensionKey AS NVARCHAR(36));
PRINT '';
PRINT 'MMIS Spans seeded:';
PRINT '  Span-A (Active):    ' + CONVERT(NVARCHAR(10), @SpanA_Begin, 120) + ' to ' + CONVERT(NVARCHAR(10), @SpanA_End, 120);
PRINT '  Span-B (Suspended): ' + CONVERT(NVARCHAR(10), @SpanB_Begin, 120) + ' to ' + CONVERT(NVARCHAR(10), @SpanB_End, 120);
PRINT '  Span-C (Active):    ' + CONVERT(NVARCHAR(10), @SpanC_Begin, 120) + ' to ' + CONVERT(NVARCHAR(10), @SpanC_End, 120);
PRINT '';
PRINT 'SyncTransaction rows inserted: 4 (1 from TC-001 + 3 from TC-002)';
PRINT '';
PRINT 'Next step: Delete the suspension in the UI, then run TC-012 test.';

-- Quick verification queries
SELECT 
    pee.ProgramEnrollmentExtensionKey,
    pee.HasConflict,
    pee.ResponseStatusCode,
    pee.TransactionTypeCode,
    pee.MmisEffectiveDate,
    pee.MmisEndDate,
    pee.LastChangeTypeCode,
    pee.TransactionStatusDisplayName
FROM [CustomerProgramEnrollmentModule].[ProgramEnrollmentExtension] pee
WHERE pee.ProgramEnrollmentKey = @ProgramEnrollmentKey;

SELECT 
    st.SyncTransactionKey,
    st.MmisTransactionTypeName,
    st.TransactionTypeCode,
    st.MmisEffectiveDate,
    st.MmisEndDate,
    st.ResponseStatusCode,
    st.TxnRefId,
    st.Timestamp
FROM [CustomerProgramEnrollmentModule].[SyncTransaction] st
WHERE st.ProgramEnrollmentExtensionKey = @ProgramEnrollmentExtensionKey
ORDER BY st.Timestamp;
