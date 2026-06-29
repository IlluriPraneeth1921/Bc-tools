-- ============================================================================
-- pl-test: TestRun table
-- Tracks each test execution run with summary statistics.
-- Target: [WiDHS.Qc.Interface.Carity.ToolTesting].[TestVerification].[TestRun]
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'TestVerification' AND TABLE_NAME = 'TestRun'
)
BEGIN
    CREATE TABLE [TestVerification].[TestRun] (
        TestRunId                   UNIQUEIDENTIFIER    NOT NULL PRIMARY KEY,
        InterfaceType               NVARCHAR(50)        NOT NULL,        -- e.g., "icd_d06"
        StartTimestamp              DATETIME2(7)        NOT NULL,
        EndTimestamp                DATETIME2(7)        NULL,
        SourceFileName              NVARCHAR(255)       NOT NULL,
        McdIdPrefix                 NVARCHAR(15)        NOT NULL,        -- e.g., "000000000"
        TotalSourceLines            INT                 NULL,
        TotalProviders              INT                 NULL,
        Stage1PassCount             INT                 NULL DEFAULT 0,
        Stage1FailCount             INT                 NULL DEFAULT 0,
        Stage2PassCount             INT                 NULL DEFAULT 0,
        Stage2FailCount             INT                 NULL DEFAULT 0,
        Stage3PassCount             INT                 NULL DEFAULT 0,
        Stage3FailCount             INT                 NULL DEFAULT 0,
        Stage4PassCount             INT                 NULL DEFAULT 0,
        Stage4FailCount             INT                 NULL DEFAULT 0,
        OverallStatus               NVARCHAR(10)        NOT NULL DEFAULT 'PENDING',  -- PENDING, RUNNING, PASS, FAIL, PARTIAL
        CleanedUp                   BIT                 NOT NULL DEFAULT 0,
        CreatedTimestamp            DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
    );

    CREATE INDEX IX_TestRun_InterfaceType ON [TestVerification].[TestRun](InterfaceType);
    CREATE INDEX IX_TestRun_Status ON [TestVerification].[TestRun](OverallStatus);
END
GO

PRINT 'Table [TestVerification].[TestRun] created or already exists.';
GO
