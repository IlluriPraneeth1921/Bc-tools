"""
API endpoints for cleanup operations.
Supports both TestVerification data cleanup and full pipeline data cleanup.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from src.core.database import db, DatabaseManager

router = APIRouter()


class CleanupResponse(BaseModel):
    test_run_id: str
    message: str


class PipelineCleanupRequest(BaseModel):
    entity_id_prefix: str = "000000000"
    interface_type: Optional[str] = None  # If None, cleans all registered interfaces


class PipelineCleanupResponse(BaseModel):
    entity_id_prefix: str
    stages_cleaned: str
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline cleanup routes MUST be defined BEFORE {test_run_id} routes
# otherwise FastAPI matches "pipeline" as a test_run_id path parameter.
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/pipeline/interface", response_model=PipelineCleanupResponse)
async def cleanup_interface_pipeline_data(request: PipelineCleanupRequest):
    """
    Remove pipeline-inserted test data from Stages 1-3 (Interface DB only).
    Uses the plugin's cleanup_config metadata to determine which tables to clean.
    """
    prefix = request.entity_id_prefix
    if not prefix or len(prefix) < 5:
        raise HTTPException(
            status_code=400,
            detail="entity_id_prefix must be at least 5 characters to prevent accidental broad deletes.",
        )

    from src.interfaces import get_interface
    try:
        plugin = get_interface(request.interface_type) if request.interface_type else None
    except KeyError:
        plugin = None

    if plugin:
        total = plugin.cleanup_pipeline_data(prefix)
    else:
        # Clean all registered interfaces
        from src.interfaces import list_interfaces
        total = 0
        for p in list_interfaces():
            total += p.cleanup_pipeline_data(prefix)

    return PipelineCleanupResponse(
        entity_id_prefix=prefix,
        stages_cleaned="1, 2, 3",
        message=f"Pipeline data for '{prefix}*' removed from Stages 1-3 ({total} rows deleted).",
    )


@router.post("/pipeline/carity", response_model=PipelineCleanupResponse)
async def cleanup_carity_pipeline_data(request: PipelineCleanupRequest):
    """
    Remove pipeline-inserted test data from Stage 4 (Carity DB only).
    Uses the plugin's cleanup_config metadata to determine which tables to clean.
    """
    prefix = request.entity_id_prefix
    if not prefix or len(prefix) < 5:
        raise HTTPException(
            status_code=400,
            detail="entity_id_prefix must be at least 5 characters to prevent accidental broad deletes.",
        )

    from src.interfaces import get_interface
    try:
        plugin = get_interface(request.interface_type) if hasattr(request, "interface_type") and request.interface_type else None
    except KeyError:
        plugin = None

    if plugin:
        total = plugin.cleanup_carity_data(prefix)
    else:
        from src.interfaces import list_interfaces
        total = 0
        for p in list_interfaces():
            total += p.cleanup_carity_data(prefix)

    return PipelineCleanupResponse(
        entity_id_prefix=prefix,
        stages_cleaned="4",
        message=f"Pipeline data for '{prefix}*' removed from Stage 4 ({total} rows deleted).",
    )


@router.post("/pipeline/all", response_model=PipelineCleanupResponse)
async def cleanup_all_pipeline_data(request: PipelineCleanupRequest):
    """
    Remove all pipeline-inserted test data from ALL 4 stages.
    Restores both databases to pristine state for the given prefix.
    """
    prefix = request.entity_id_prefix
    if not prefix or len(prefix) < 5:
        raise HTTPException(
            status_code=400,
            detail="entity_id_prefix must be at least 5 characters to prevent accidental broad deletes.",
        )

    from src.interfaces import get_interface
    try:
        plugin = get_interface(request.interface_type) if hasattr(request, "interface_type") and request.interface_type else None
    except KeyError:
        plugin = None

    if plugin:
        total = plugin.cleanup_pipeline_data(prefix) + plugin.cleanup_carity_data(prefix)
    else:
        from src.interfaces import list_interfaces
        total = 0
        for p in list_interfaces():
            total += p.cleanup_pipeline_data(prefix)
            total += p.cleanup_carity_data(prefix)

    return PipelineCleanupResponse(
        entity_id_prefix=prefix,
        stages_cleaned="1, 2, 3, 4",
        message=f"All pipeline data for '{prefix}*' removed from all 4 stages ({total} rows deleted).",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Bulk TestVerification data cleanup (must be BEFORE {test_run_id} route)
# ─────────────────────────────────────────────────────────────────────────────

class BulkTestDataCleanupResponse(BaseModel):
    total_deleted: int
    message: str


@router.post("/test-data/all", response_model=BulkTestDataCleanupResponse)
async def cleanup_all_test_verification_data():
    """
    Bulk-delete ALL TestVerification data (test runs, expected states, mismatch reports).
    This removes the test framework's tracking data without touching pipeline-generated data.
    """
    total = 0
    # Delete children first, then parents
    total += db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[MismatchReport]", ())
    total += db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage1_Raw]", ())
    total += db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage2_Parsed]", ())
    total += db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage3_Incoming]", ())
    total += db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage4_Final]", ())
    total += db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[TestRun]", ())

    return BulkTestDataCleanupResponse(
        total_deleted=total,
        message=f"All TestVerification data removed ({total} rows deleted across all test runs).",
    )


# ─────────────────────────────────────────────────────────────────────────────
# Test run routes (path parameter {test_run_id} catches all unmatched paths)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/{test_run_id}", response_model=CleanupResponse)
async def cleanup_test_run(test_run_id: str):
    """Cleanup all expected state and mismatch data for a test run."""
    exists = db.execute_scalar(
        DatabaseManager.INTERFACE,
        "SELECT COUNT(*) FROM [TestVerification].[TestRun] WHERE TestRunId = ?",
        (test_run_id,),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Test run not found")

    # Delete children
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[MismatchReport] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage1_Raw] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage2_Parsed] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage3_Incoming] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage4_Final] WHERE TestRunId = ?", (test_run_id,))
    # Mark as cleaned
    db.execute_non_query(DatabaseManager.INTERFACE, "UPDATE [TestVerification].[TestRun] SET CleanedUp = 1 WHERE TestRunId = ?", (test_run_id,))

    return CleanupResponse(test_run_id=test_run_id, message="Test run cleaned up successfully.")


@router.delete("/{test_run_id}", response_model=CleanupResponse)
async def delete_test_run(test_run_id: str):
    """Permanently delete a test run and all associated data."""
    exists = db.execute_scalar(
        DatabaseManager.INTERFACE,
        "SELECT COUNT(*) FROM [TestVerification].[TestRun] WHERE TestRunId = ?",
        (test_run_id,),
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Test run not found")

    # Delete children then parent
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[MismatchReport] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage1_Raw] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage2_Parsed] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage3_Incoming] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[ExpectedState_Stage4_Final] WHERE TestRunId = ?", (test_run_id,))
    db.execute_non_query(DatabaseManager.INTERFACE, "DELETE FROM [TestVerification].[TestRun] WHERE TestRunId = ?", (test_run_id,))

    return CleanupResponse(test_run_id=test_run_id, message="Test run permanently deleted.")
