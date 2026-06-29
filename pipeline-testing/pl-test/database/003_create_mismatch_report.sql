-- ============================================================================
-- pl-test: MismatchReport table
-- Stores field-level comparison results for each test run.
-- Target: [WiDHS.Qc.Interface.Carity.ToolTesting].[TestVerification].[MismatchReport]
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'TestVerification' AND TABLE_NAME = 'MismatchReport'
)
BEGIN
    CREATE TABLE [TestVerification].[MismatchReport] (
        MismatchId                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
        TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
        InterfaceType               NVARCHAR(50)        NOT NULL,
        SourceFileName              NVARCHAR(255)       NOT NULL,
        SourceLineNumber            INT                 NOT NULL,
        EntityId                    NVARCHAR(50)        NOT NULL,
        RecordType                  NVARCHAR(5)         NULL,            -- "01", "02", etc.
        Stage                       TINYINT             NOT NULL,        -- 1=Raw, 2=Parsed, 3=Incoming, 4=Carity
        TargetDatabase              NVARCHAR(100)       NOT NULL,
        TargetSchema                NVARCHAR(100)       NOT NULL,
        TargetTable                 NVARCHAR(200)       NOT NULL,
        TargetColumn                NVARCHAR(200)       NOT NULL,
        ExpectedValue               NVARCHAR(MAX)       NULL,
        ActualValue                 NVARCHAR(MAX)       NULL,
        Status                      NVARCHAR(10)        NOT NULL,        -- PASS, FAIL, MISSING, EXTRA, SKIPPED
        BusinessRule                NVARCHAR(20)        NULL,            -- BR-D06-xxx
        VocabLookupUsed             NVARCHAR(200)       NULL,            -- VocabularyLookup reference
        ErrorCategory               NVARCHAR(50)        NULL,            -- Transformation, Lookup, MissingRow, ExtraRow, FieldMismatch
        Notes                       NVARCHAR(MAX)       NULL,
        CreatedTimestamp            DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_MismatchReport_TestRun 
            FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
    );

    CREATE INDEX IX_MismatchReport_TestRunId ON [TestVerification].[MismatchReport](TestRunId);
    CREATE INDEX IX_MismatchReport_Status ON [TestVerification].[MismatchReport](Status);
    CREATE INDEX IX_MismatchReport_Stage ON [TestVerification].[MismatchReport](Stage);
    CREATE INDEX IX_MismatchReport_EntityId ON [TestVerification].[MismatchReport](EntityId);
    CREATE INDEX IX_MismatchReport_Category ON [TestVerification].[MismatchReport](ErrorCategory);
END
GO

PRINT 'Table [TestVerification].[MismatchReport] created or already exists.';
GO
