-- ============================================================================
-- pl-test: Expected State - Stage 1 (Raw)
-- Stores the expected raw text for each source file line.
-- Target: [WiDHS.Qc.Interface.Carity.ToolTesting].[TestVerification].[ExpectedState_Stage1_Raw]
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'TestVerification' AND TABLE_NAME = 'ExpectedState_Stage1_Raw'
)
BEGIN
    CREATE TABLE [TestVerification].[ExpectedState_Stage1_Raw] (
        TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
        LineNumber                  INT                 NOT NULL,
        ExpectedRawText             NVARCHAR(MAX)       NOT NULL,
        RecordType                  NVARCHAR(5)         NULL,

        CONSTRAINT PK_ExpectedState_Stage1 PRIMARY KEY (TestRunId, LineNumber),
        CONSTRAINT FK_ExpectedState_Stage1_TestRun 
            FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
    );
END
GO

PRINT 'Table [TestVerification].[ExpectedState_Stage1_Raw] created or already exists.';
GO
