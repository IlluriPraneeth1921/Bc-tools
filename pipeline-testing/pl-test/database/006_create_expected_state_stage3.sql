-- ============================================================================
-- pl-test: Expected State - Stage 3 (Incoming/Mapped)
-- Stores expected transformed values that should appear in the Incoming tables.
-- Uses EAV pattern (same as Stage 2) for flexibility.
-- Target: [WiDHS.Qc.Interface.Carity.ToolTesting].[TestVerification].[ExpectedState_Stage3_Incoming]
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'TestVerification' AND TABLE_NAME = 'ExpectedState_Stage3_Incoming'
)
BEGIN
    CREATE TABLE [TestVerification].[ExpectedState_Stage3_Incoming] (
        TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
        EntityId                    NVARCHAR(50)        NOT NULL,
        RecordType                  NVARCHAR(5)         NULL,            -- Source record type that produced this row
        TargetTable                 NVARCHAR(200)       NOT NULL,        -- e.g., "IncomingLocationAddresses"
        TargetColumn                NVARCHAR(200)       NOT NULL,
        RowKey                      NVARCHAR(500)       NOT NULL,        -- Composite key to distinguish multiple rows in same table for same provider
        ExpectedValue               NVARCHAR(MAX)       NULL,
        VocabLookupUsed             NVARCHAR(200)       NULL,            -- Which vocab mapping was applied
        BusinessRule                NVARCHAR(20)        NULL,            -- Which BR applies

        CONSTRAINT PK_ExpectedState_Stage3 PRIMARY KEY (TestRunId, EntityId, TargetTable, TargetColumn, RowKey),
        CONSTRAINT FK_ExpectedState_Stage3_TestRun 
            FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
    );

    CREATE INDEX IX_ExpectedState_Stage3_EntityId ON [TestVerification].[ExpectedState_Stage3_Incoming](EntityId);
    CREATE INDEX IX_ExpectedState_Stage3_Table ON [TestVerification].[ExpectedState_Stage3_Incoming](TargetTable);
END
GO

PRINT 'Table [TestVerification].[ExpectedState_Stage3_Incoming] created or already exists.';
GO
