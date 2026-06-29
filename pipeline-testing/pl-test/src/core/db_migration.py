"""
Database migration: auto-creates the TestVerification schema and all 6 tables
in the Interface database if they are missing.

This runs on application startup so QA testers don't need to manually execute
SQL scripts against a fresh database.
"""
import logging
from src.core.database import db, DatabaseManager

logger = logging.getLogger(__name__)

# The 6 tables that must exist in the TestVerification schema
REQUIRED_TABLES = [
    "TestRun",
    "MismatchReport",
    "ExpectedState_Stage1_Raw",
    "ExpectedState_Stage2_Parsed",
    "ExpectedState_Stage3_Incoming",
    "ExpectedState_Stage4_Final",
]


def _schema_exists() -> bool:
    """Check if the TestVerification schema exists."""
    result = db.execute_scalar(
        DatabaseManager.INTERFACE,
        "SELECT COUNT(*) FROM sys.schemas WHERE name = 'TestVerification'",
    )
    return result > 0


def _get_existing_tables() -> set:
    """Return set of table names that already exist in TestVerification schema."""
    rows = db.execute_query(
        DatabaseManager.INTERFACE,
        """
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'TestVerification'
        """,
    )
    return {row["TABLE_NAME"] for row in rows}


def _create_schema():
    """Create the TestVerification schema."""
    logger.info("Creating [TestVerification] schema...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "EXEC('CREATE SCHEMA [TestVerification]')",
    )


def _create_test_run():
    """Create TestVerification.TestRun table."""
    logger.info("Creating [TestVerification].[TestRun]...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        CREATE TABLE [TestVerification].[TestRun] (
            TestRunId                   UNIQUEIDENTIFIER    NOT NULL PRIMARY KEY,
            InterfaceType               NVARCHAR(50)        NOT NULL,
            StartTimestamp              DATETIME2(7)        NOT NULL,
            EndTimestamp                DATETIME2(7)        NULL,
            SourceFileName              NVARCHAR(255)       NOT NULL,
            McdIdPrefix                 NVARCHAR(15)        NOT NULL,
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
            OverallStatus               NVARCHAR(10)        NOT NULL DEFAULT 'PENDING',
            CleanedUp                   BIT                 NOT NULL DEFAULT 0,
            CreatedTimestamp            DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME()
        )
        """,
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_TestRun_InterfaceType ON [TestVerification].[TestRun](InterfaceType)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_TestRun_Status ON [TestVerification].[TestRun](OverallStatus)",
    )


def _create_mismatch_report():
    """Create TestVerification.MismatchReport table."""
    logger.info("Creating [TestVerification].[MismatchReport]...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        CREATE TABLE [TestVerification].[MismatchReport] (
            MismatchId                  UNIQUEIDENTIFIER    NOT NULL DEFAULT NEWID() PRIMARY KEY,
            TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
            InterfaceType               NVARCHAR(50)        NOT NULL,
            SourceFileName              NVARCHAR(255)       NOT NULL,
            SourceLineNumber            INT                 NOT NULL,
            EntityId                    NVARCHAR(50)        NOT NULL,
            RecordType                  NVARCHAR(5)         NULL,
            Stage                       TINYINT             NOT NULL,
            TargetDatabase              NVARCHAR(100)       NOT NULL,
            TargetSchema                NVARCHAR(100)       NOT NULL,
            TargetTable                 NVARCHAR(200)       NOT NULL,
            TargetColumn                NVARCHAR(200)       NOT NULL,
            ExpectedValue               NVARCHAR(MAX)       NULL,
            ActualValue                 NVARCHAR(MAX)       NULL,
            Status                      NVARCHAR(10)        NOT NULL,
            BusinessRule                NVARCHAR(20)        NULL,
            VocabLookupUsed             NVARCHAR(200)       NULL,
            ErrorCategory               NVARCHAR(50)        NULL,
            Notes                       NVARCHAR(MAX)       NULL,
            CreatedTimestamp            DATETIME2(7)        NOT NULL DEFAULT SYSUTCDATETIME(),
            CONSTRAINT FK_MismatchReport_TestRun
                FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
        )
        """,
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_MismatchReport_TestRunId ON [TestVerification].[MismatchReport](TestRunId)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_MismatchReport_Status ON [TestVerification].[MismatchReport](Status)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_MismatchReport_Stage ON [TestVerification].[MismatchReport](Stage)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_MismatchReport_EntityId ON [TestVerification].[MismatchReport](EntityId)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_MismatchReport_Category ON [TestVerification].[MismatchReport](ErrorCategory)",
    )


def _create_expected_state_stage1():
    """Create TestVerification.ExpectedState_Stage1_Raw table."""
    logger.info("Creating [TestVerification].[ExpectedState_Stage1_Raw]...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        CREATE TABLE [TestVerification].[ExpectedState_Stage1_Raw] (
            TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
            LineNumber                  INT                 NOT NULL,
            ExpectedRawText             NVARCHAR(MAX)       NOT NULL,
            RecordType                  NVARCHAR(5)         NULL,
            CONSTRAINT PK_ExpectedState_Stage1 PRIMARY KEY (TestRunId, LineNumber),
            CONSTRAINT FK_ExpectedState_Stage1_TestRun
                FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
        )
        """,
    )


def _create_expected_state_stage2():
    """Create TestVerification.ExpectedState_Stage2_Parsed table."""
    logger.info("Creating [TestVerification].[ExpectedState_Stage2_Parsed]...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        CREATE TABLE [TestVerification].[ExpectedState_Stage2_Parsed] (
            TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
            LineNumber                  INT                 NOT NULL,
            EntityId                    NVARCHAR(50)        NOT NULL,
            RecordType                  NVARCHAR(5)         NOT NULL,
            TargetTable                 NVARCHAR(200)       NOT NULL,
            ColumnName                  NVARCHAR(200)       NOT NULL,
            ExpectedValue               NVARCHAR(MAX)       NULL,
            CONSTRAINT PK_ExpectedState_Stage2 PRIMARY KEY (TestRunId, LineNumber, TargetTable, ColumnName),
            CONSTRAINT FK_ExpectedState_Stage2_TestRun
                FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
        )
        """,
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_ExpectedState_Stage2_EntityId ON [TestVerification].[ExpectedState_Stage2_Parsed](EntityId)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_ExpectedState_Stage2_Table ON [TestVerification].[ExpectedState_Stage2_Parsed](TargetTable)",
    )


def _create_expected_state_stage3():
    """Create TestVerification.ExpectedState_Stage3_Incoming table."""
    logger.info("Creating [TestVerification].[ExpectedState_Stage3_Incoming]...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        CREATE TABLE [TestVerification].[ExpectedState_Stage3_Incoming] (
            TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
            EntityId                    NVARCHAR(50)        NOT NULL,
            RecordType                  NVARCHAR(5)         NULL,
            TargetTable                 NVARCHAR(200)       NOT NULL,
            TargetColumn                NVARCHAR(200)       NOT NULL,
            RowKey                      NVARCHAR(500)       NOT NULL,
            ExpectedValue               NVARCHAR(MAX)       NULL,
            VocabLookupUsed             NVARCHAR(200)       NULL,
            BusinessRule                NVARCHAR(20)        NULL,
            CONSTRAINT PK_ExpectedState_Stage3 PRIMARY KEY (TestRunId, EntityId, TargetTable, TargetColumn, RowKey),
            CONSTRAINT FK_ExpectedState_Stage3_TestRun
                FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
        )
        """,
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_ExpectedState_Stage3_EntityId ON [TestVerification].[ExpectedState_Stage3_Incoming](EntityId)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_ExpectedState_Stage3_Table ON [TestVerification].[ExpectedState_Stage3_Incoming](TargetTable)",
    )


def _create_expected_state_stage4():
    """Create TestVerification.ExpectedState_Stage4_Final table."""
    logger.info("Creating [TestVerification].[ExpectedState_Stage4_Final]...")
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        CREATE TABLE [TestVerification].[ExpectedState_Stage4_Final] (
            TestRunId                   UNIQUEIDENTIFIER    NOT NULL,
            EntityId                    NVARCHAR(50)        NOT NULL,
            RecordType                  NVARCHAR(5)         NULL,
            TargetDatabase              NVARCHAR(100)       NOT NULL,
            TargetSchema                NVARCHAR(100)       NOT NULL,
            TargetTable                 NVARCHAR(200)       NOT NULL,
            TargetColumn                NVARCHAR(200)       NOT NULL,
            RowKey                      NVARCHAR(500)       NOT NULL,
            ExpectedValue               NVARCHAR(MAX)       NULL,
            CONSTRAINT PK_ExpectedState_Stage4 PRIMARY KEY (TestRunId, EntityId, TargetTable, TargetColumn, RowKey),
            CONSTRAINT FK_ExpectedState_Stage4_TestRun
                FOREIGN KEY (TestRunId) REFERENCES [TestVerification].[TestRun](TestRunId)
        )
        """,
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_ExpectedState_Stage4_EntityId ON [TestVerification].[ExpectedState_Stage4_Final](EntityId)",
    )
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        "CREATE INDEX IX_ExpectedState_Stage4_Table ON [TestVerification].[ExpectedState_Stage4_Final](TargetTable)",
    )


# Map table name -> creation function (order matters due to FK dependencies)
_TABLE_CREATORS = [
    ("TestRun", _create_test_run),
    ("MismatchReport", _create_mismatch_report),
    ("ExpectedState_Stage1_Raw", _create_expected_state_stage1),
    ("ExpectedState_Stage2_Parsed", _create_expected_state_stage2),
    ("ExpectedState_Stage3_Incoming", _create_expected_state_stage3),
    ("ExpectedState_Stage4_Final", _create_expected_state_stage4),
]


def ensure_test_verification_tables():
    """
    Check the Interface database for the TestVerification schema and tables.
    Create any that are missing. Safe to call multiple times (idempotent).
    """
    # 1. Ensure schema exists
    if not _schema_exists():
        _create_schema()

    # 2. Check which tables exist
    existing = _get_existing_tables()
    missing = [name for name in REQUIRED_TABLES if name not in existing]

    if not missing:
        logger.info("All TestVerification tables already exist.")
        return

    logger.info(f"Missing TestVerification tables: {missing}")

    # 3. Create missing tables in dependency order
    for table_name, creator_fn in _TABLE_CREATORS:
        if table_name in missing:
            creator_fn()

    logger.info("All missing TestVerification tables created successfully.")
