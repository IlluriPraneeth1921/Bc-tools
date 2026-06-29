-- ============================================================================
-- pl-test: TestVerification Schema Creation
-- Target Database: [WiDHS.Qc.Interface.Carity.ToolTesting]
-- 
-- Run this script ONCE to create the TestVerification schema.
-- ============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting];
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'TestVerification')
BEGIN
    EXEC('CREATE SCHEMA [TestVerification]');
END
GO

PRINT 'Schema [TestVerification] created or already exists.';
GO
