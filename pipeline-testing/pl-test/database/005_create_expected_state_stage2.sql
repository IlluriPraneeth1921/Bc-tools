-- ============================================================================
-- pl-test: Expected State - Stage 2 (Parsed)
-- Stores expected parsed field values for each source line, per record type.
-- Uses a generic EAV (Entity-Attribute-Value) pattern so we don't need
-- one table per record type. This keeps the schema stable as record types evolve.
-- Target: [WiDHS.Qc.Interface.Carity.ToolTesting].[TestVerification].[ExpectedState_Stage2_Parsed]
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'TestVerification' AND TABLE_NAME = 'ExpectedState_Stage2_Parsed'
)
BEGIN
    CREATE TABLE [TestVerification].[ExpectedState_Stage2_Parsed] (
        TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
        LineNumber                  INT                 NOT NULL,
        EntityId                    NVARCHAR(50)        NOT NULL,
        RecordType                  NVARCHAR(5)         NOT NULL,        -- "01", "02", etc.
        TargetTable                 NVARCHAR(200)       NOT NULL,        -- e.g., "MedicaidProviderMain"
        ColumnName                  NVARCHAR(200)       NOT NULL,
        ExpectedValue               NVARCHAR(MAX)       NULL,

        CONSTRAINT PK_ExpectedState_Stage2 PRIMARY KEY (TestRunId, LineNumber, TargetTable, ColumnName),
        CONSTRAINT FK_ExpectedState_Stage2_TestRun 
            FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
    );

    CREATE INDEX IX_ExpectedState_Stage2_EntityId ON [TestVerification].[ExpectedState_Stage2_Parsed](EntityId);
    CREATE INDEX IX_ExpectedState_Stage2_Table ON [TestVerification].[ExpectedState_Stage2_Parsed](TargetTable);
END
GO

PRINT 'Table [TestVerification].[ExpectedState_Stage2_Parsed] created or already exists.';
GO
