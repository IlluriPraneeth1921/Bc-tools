-- ============================================================================
-- pl-test: Expected State - Stage 4 (Final Carity)
-- Stores expected values for the final Carity DB tables.
-- Since Stage 3→4 is a straight copy, this table mirrors Stage 3 structure
-- but references the final target table names.
-- Target: [WiDHS.Qc.Interface.Carity.ToolTesting].[TestVerification].[ExpectedState_Stage4_Final]
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'TestVerification' AND TABLE_NAME = 'ExpectedState_Stage4_Final'
)
BEGIN
    CREATE TABLE [TestVerification].[ExpectedState_Stage4_Final] (
        TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
        EntityId                    NVARCHAR(50)        NOT NULL,
        RecordType                  NVARCHAR(5)         NULL,
        TargetDatabase              NVARCHAR(100)       NOT NULL,        -- "WiDHS.Qc.Carity.ToolTestig"
        TargetSchema                NVARCHAR(100)       NOT NULL,        -- "OrganizationModule" or "CustomerOrganizationModule"
        TargetTable                 NVARCHAR(200)       NOT NULL,        -- e.g., "LocationAddresses"
        TargetColumn                NVARCHAR(200)       NOT NULL,
        RowKey                      NVARCHAR(500)       NOT NULL,
        ExpectedValue               NVARCHAR(MAX)       NULL,

        CONSTRAINT PK_ExpectedState_Stage4 PRIMARY KEY (TestRunId, EntityId, TargetTable, TargetColumn, RowKey),
        CONSTRAINT FK_ExpectedState_Stage4_TestRun 
            FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
    );

    CREATE INDEX IX_ExpectedState_Stage4_EntityId ON [TestVerification].[ExpectedState_Stage4_Final](EntityId);
    CREATE INDEX IX_ExpectedState_Stage4_Table ON [TestVerification].[ExpectedState_Stage4_Final](TargetTable);
END
GO

PRINT 'Table [TestVerification].[ExpectedState_Stage4_Final] created or already exists.';
GO
