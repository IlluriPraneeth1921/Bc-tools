"""
API endpoints for managing test runs.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from src.core.database import db, DatabaseManager

router = APIRouter()


class TestRunCreate(BaseModel):
    interface_type: str = "icd_d06"
    source_filename: str
    mcd_id_prefix: str = "000000000"


class TestRunResponse(BaseModel):
    test_run_id: str
    interface_type: str
    start_timestamp: datetime
    end_timestamp: Optional[datetime] = None
    source_filename: str
    mcd_id_prefix: str
    total_source_lines: Optional[int] = None
    total_providers: Optional[int] = None
    stage1_pass_count: Optional[int] = 0
    stage1_fail_count: Optional[int] = 0
    stage2_pass_count: Optional[int] = 0
    stage2_fail_count: Optional[int] = 0
    stage3_pass_count: Optional[int] = 0
    stage3_fail_count: Optional[int] = 0
    stage4_pass_count: Optional[int] = 0
    stage4_fail_count: Optional[int] = 0
    overall_status: str = "PENDING"
    cleaned_up: bool = False


@router.post("/", response_model=TestRunResponse)
async def create_test_run(request: TestRunCreate):
    """Create a new test run."""
    test_run_id = str(uuid.uuid4())
    now = datetime.utcnow()

    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """
        INSERT INTO [TestVerification].[TestRun] 
            (TestRunId, InterfaceType, StartTimestamp, SourceFileName, McdIdPrefix, OverallStatus)
        VALUES (?, ?, ?, ?, ?, 'PENDING')
        """,
        (test_run_id, request.interface_type, now, request.source_filename, request.mcd_id_prefix),
    )

    return TestRunResponse(
        test_run_id=test_run_id,
        interface_type=request.interface_type,
        start_timestamp=now,
        source_filename=request.source_filename,
        mcd_id_prefix=request.mcd_id_prefix,
    )


@router.get("/", response_model=List[TestRunResponse])
async def list_test_runs(interface_type: Optional[str] = None, limit: int = 20):
    """List recent test runs."""
    query = """
        SELECT TOP (?) TestRunId, InterfaceType, StartTimestamp, EndTimestamp,
               SourceFileName, McdIdPrefix, TotalSourceLines, TotalProviders,
               Stage1PassCount, Stage1FailCount, Stage2PassCount, Stage2FailCount,
               Stage3PassCount, Stage3FailCount, Stage4PassCount, Stage4FailCount,
               OverallStatus, CleanedUp
        FROM [TestVerification].[TestRun]
    """
    params = [limit]
    if interface_type:
        query += " WHERE InterfaceType = ?"
        params.append(interface_type)
    query += " ORDER BY StartTimestamp DESC"

    rows = db.execute_query(DatabaseManager.INTERFACE, query, tuple(params))
    return [TestRunResponse(
        test_run_id=str(r["TestRunId"]),
        interface_type=r["InterfaceType"],
        start_timestamp=r["StartTimestamp"],
        end_timestamp=r["EndTimestamp"],
        source_filename=r["SourceFileName"],
        mcd_id_prefix=r["McdIdPrefix"],
        total_source_lines=r["TotalSourceLines"],
        total_providers=r["TotalProviders"],
        stage1_pass_count=r["Stage1PassCount"] or 0,
        stage1_fail_count=r["Stage1FailCount"] or 0,
        stage2_pass_count=r["Stage2PassCount"] or 0,
        stage2_fail_count=r["Stage2FailCount"] or 0,
        stage3_pass_count=r["Stage3PassCount"] or 0,
        stage3_fail_count=r["Stage3FailCount"] or 0,
        stage4_pass_count=r["Stage4PassCount"] or 0,
        stage4_fail_count=r["Stage4FailCount"] or 0,
        overall_status=r["OverallStatus"],
        cleaned_up=bool(r["CleanedUp"]),
    ) for r in rows]


@router.get("/{test_run_id}", response_model=TestRunResponse)
async def get_test_run(test_run_id: str):
    """Get details of a specific test run."""
    rows = db.execute_query(
        DatabaseManager.INTERFACE,
        """
        SELECT TestRunId, InterfaceType, StartTimestamp, EndTimestamp,
               SourceFileName, McdIdPrefix, TotalSourceLines, TotalProviders,
               Stage1PassCount, Stage1FailCount, Stage2PassCount, Stage2FailCount,
               Stage3PassCount, Stage3FailCount, Stage4PassCount, Stage4FailCount,
               OverallStatus, CleanedUp
        FROM [TestVerification].[TestRun]
        WHERE TestRunId = ?
        """,
        (test_run_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Test run not found")
    r = rows[0]
    return TestRunResponse(
        test_run_id=str(r["TestRunId"]),
        interface_type=r["InterfaceType"],
        start_timestamp=r["StartTimestamp"],
        end_timestamp=r["EndTimestamp"],
        source_filename=r["SourceFileName"],
        mcd_id_prefix=r["McdIdPrefix"],
        total_source_lines=r["TotalSourceLines"],
        total_providers=r["TotalProviders"],
        stage1_pass_count=r["Stage1PassCount"] or 0,
        stage1_fail_count=r["Stage1FailCount"] or 0,
        stage2_pass_count=r["Stage2PassCount"] or 0,
        stage2_fail_count=r["Stage2FailCount"] or 0,
        stage3_pass_count=r["Stage3PassCount"] or 0,
        stage3_fail_count=r["Stage3FailCount"] or 0,
        stage4_pass_count=r["Stage4PassCount"] or 0,
        stage4_fail_count=r["Stage4FailCount"] or 0,
        overall_status=r["OverallStatus"],
        cleaned_up=bool(r["CleanedUp"]),
    )


# =============================================================================
# Create / Finalize endpoints (used by per-stage comparison flow)
# =============================================================================

class TestRunCreateWithId(BaseModel):
    test_run_id: str
    interface_type: str = "icd_d06"
    filepath: str
    mcd_id_prefix: str = "000000000"


class TestRunFinalizeRequest(BaseModel):
    test_run_id: str
    overall_status: str
    stage_results: List[dict]


@router.post("/create")
async def create_test_run_with_id(request: TestRunCreateWithId):
    """
    Create a new test run with a pre-generated ID.
    Used by the per-stage comparison flow where the frontend controls the test_run_id.
    """
    import os
    now = datetime.utcnow()
    filename = os.path.basename(request.filepath) if os.path.sep in request.filepath or "/" in request.filepath else request.filepath

    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """INSERT INTO [TestVerification].[TestRun] 
            (TestRunId, InterfaceType, StartTimestamp, SourceFileName, McdIdPrefix, OverallStatus)
        VALUES (?, ?, ?, ?, ?, 'RUNNING')""",
        (request.test_run_id, request.interface_type, now, filename, request.mcd_id_prefix),
    )

    return {"test_run_id": request.test_run_id, "status": "created"}


@router.post("/finalize")
async def finalize_test_run(request: TestRunFinalizeRequest):
    """
    Finalize a test run by setting end timestamp and stage counts.
    Called after all per-stage comparisons are complete.
    """
    now = datetime.utcnow()

    stage_pass = {}
    stage_fail = {}
    for s in request.stage_results:
        stage_num = s["stage"]
        stage_pass[stage_num] = s.get("pass_count", 0)
        stage_fail[stage_num] = s.get("fail_count", 0) + s.get("missing_count", 0)

    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """UPDATE [TestVerification].[TestRun] SET EndTimestamp=?,
            Stage1PassCount=?, Stage1FailCount=?, Stage2PassCount=?, Stage2FailCount=?,
            Stage3PassCount=?, Stage3FailCount=?, Stage4PassCount=?, Stage4FailCount=?,
            OverallStatus=? WHERE TestRunId=?""",
        (now, stage_pass.get(1, 0), stage_fail.get(1, 0),
         stage_pass.get(2, 0), stage_fail.get(2, 0),
         stage_pass.get(3, 0), stage_fail.get(3, 0),
         stage_pass.get(4, 0), stage_fail.get(4, 0),
         request.overall_status, request.test_run_id),
    )

    return {"test_run_id": request.test_run_id, "status": "finalized"}
