"""
API endpoints for running comparisons (expected vs actual).
Dispatches to the correct interface plugin based on interface_type.

Includes:
- Expected state persistence to all 4 ExpectedState tables
- Streaming progress endpoint for real-time UI updates
"""
import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from src.core.database import db, DatabaseManager
from src.core.config import settings
from src.core.models import MismatchRecord
from src.interfaces import get_interface
from src.clients.vocab_client import VocabClient

router = APIRouter()

# =============================================================================
# In-memory progress tracking for active comparison runs
# =============================================================================
_progress: Dict[str, Dict[str, Any]] = {}


class CompareRequest(BaseModel):
    test_run_id: Optional[str] = None
    filepath: str
    interface_type: str = "icd_d06"
    mcd_id_prefix: str = "000000000"
    stages: Optional[List[int]] = None


class StageSummary(BaseModel):
    stage: int
    total_checks: int
    pass_count: int
    fail_count: int
    missing_count: int


class CompareResponse(BaseModel):
    test_run_id: str
    filename: str
    status: str
    total_providers: int
    total_source_lines: int
    stages: List[StageSummary]
    total_checks: int
    total_pass: int
    total_fail: int
    total_missing: int


# =============================================================================
# Expected State Persistence
# =============================================================================

def _store_expected_state_stage1(test_run_id: str, expected_rows: List[Dict[str, Any]], parsed_file, entity_id_prefix: str = ""):
    """
    Persist Stage 1 expected state to ExpectedState_Stage1_Raw.
    Stores the full raw text for each source line that matches the entity prefix.
    """
    if not expected_rows:
        return

    # Build params from the parsed file source lines, filtered by prefix
    params_list = []
    for source_line in parsed_file.source_lines:
        # Extract the entity ID (field index 1 in pipe-delimited line)
        fields = source_line.raw_text.split("|")
        entity_id = fields[1].strip() if len(fields) > 1 else ""

        # Skip header/trailer records and records not matching prefix
        if source_line.record_type in ("00", "09"):
            continue
        if entity_id_prefix and not entity_id.startswith(entity_id_prefix):
            continue

        params_list.append((
            test_run_id,
            source_line.line_number,
            source_line.raw_text,
            source_line.record_type,
        ))

    if params_list:
        db.execute_many(
            DatabaseManager.INTERFACE,
            """INSERT INTO [TestVerification].[ExpectedState_Stage1_Raw]
               (TestRunId, LineNumber, ExpectedRawText, RecordType)
               VALUES (?, ?, ?, ?)""",
            params_list,
        )


def _store_expected_state_stage2(test_run_id: str, expected_rows: List[Dict[str, Any]], entity_id_prefix: str = ""):
    """
    Persist Stage 2 expected state to ExpectedState_Stage2_Parsed.
    EAV format: one row per (line, target_table, column_name).
    Only stores rows matching the entity prefix.
    """
    if not expected_rows:
        return

    params_list = [
        (
            test_run_id,
            row["line_number"],
            row["entity_id"],
            row["record_type"],
            row["target_table"],
            row["column_name"],
            row.get("expected_value"),
        )
        for row in expected_rows
        if not entity_id_prefix or row.get("entity_id", "").startswith(entity_id_prefix)
    ]

    if not params_list:
        return

    db.execute_many(
        DatabaseManager.INTERFACE,
        """INSERT INTO [TestVerification].[ExpectedState_Stage2_Parsed]
           (TestRunId, LineNumber, EntityId, RecordType, TargetTable, ColumnName, ExpectedValue)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        params_list,
    )


def _store_expected_state_stage3(test_run_id: str, expected_rows: List[Dict[str, Any]], entity_id_prefix: str = ""):
    """
    Persist Stage 3 expected state to ExpectedState_Stage3_Incoming.
    EAV format with RowKey, VocabLookupUsed, and BusinessRule.
    Only stores rows matching the entity prefix.
    """
    if not expected_rows:
        return

    params_list = [
        (
            test_run_id,
            row["entity_id"],
            row.get("record_type"),
            row["target_table"],
            row["target_column"],
            row["row_key"],
            row.get("expected_value"),
            row.get("vocab_used"),
            row.get("business_rule"),
        )
        for row in expected_rows
        if not entity_id_prefix or row.get("entity_id", "").startswith(entity_id_prefix)
    ]

    if not params_list:
        return

    db.execute_many(
        DatabaseManager.INTERFACE,
        """INSERT INTO [TestVerification].[ExpectedState_Stage3_Incoming]
           (TestRunId, EntityId, RecordType, TargetTable, TargetColumn, RowKey,
            ExpectedValue, VocabLookupUsed, BusinessRule)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        params_list,
    )


def _store_expected_state_stage4(test_run_id: str, expected_rows: List[Dict[str, Any]], entity_id_prefix: str = ""):
    """
    Persist Stage 4 expected state to ExpectedState_Stage4_Final.
    Same data as Stage 3 but with TargetDatabase and TargetSchema pointing to Carity.
    Only stores rows matching the entity prefix.
    """
    if not expected_rows:
        return

    params_list = [
        (
            test_run_id,
            row["entity_id"],
            row.get("record_type"),
            settings.CARITY_DB_NAME,
            _get_carity_schema(row["target_table"]),
            _map_to_final_table(row["target_table"]),
            row["target_column"],
            row["row_key"],
            row.get("expected_value"),
        )
        for row in expected_rows
        if not entity_id_prefix or row.get("entity_id", "").startswith(entity_id_prefix)
    ]

    if not params_list:
        return

    db.execute_many(
        DatabaseManager.INTERFACE,
        """INSERT INTO [TestVerification].[ExpectedState_Stage4_Final]
           (TestRunId, EntityId, RecordType, TargetDatabase, TargetSchema,
            TargetTable, TargetColumn, RowKey, ExpectedValue)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        params_list,
    )


def _get_carity_schema(incoming_table: str) -> str:
    """Map an Incoming table name to its Carity schema."""
    if "Organization" in incoming_table:
        return "OrganizationModule"
    return "CustomerOrganizationModule"


def _map_to_final_table(incoming_table: str) -> str:
    """
    Map Incoming table name to final Carity table name.
    Stage 3→4 is a straight copy, so the table name just drops the 'Incoming' prefix.
    """
    if incoming_table.startswith("Incoming"):
        return incoming_table[len("Incoming"):]
    return incoming_table


# =============================================================================
# Progress Tracking
# =============================================================================

def _update_progress(test_run_id: str, step: str, stage: Optional[int] = None,
                     detail: str = "", completed_stages: int = 0, total_stages: int = 4):
    """Update in-memory progress for a running comparison."""
    _progress[test_run_id] = {
        "step": step,
        "stage": stage,
        "detail": detail,
        "completed_stages": completed_stages,
        "total_stages": total_stages,
        "timestamp": datetime.utcnow().isoformat(),
    }


# =============================================================================
# Comparison Endpoint
# =============================================================================

@router.post("/run", response_model=CompareResponse)
async def run_comparison(request: CompareRequest):
    """Run the full comparison pipeline for a file using the appropriate interface plugin."""
    from src.api.files import _parsed_files

    # Get the plugin for this interface type
    try:
        plugin = get_interface(request.interface_type)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    stages_to_run = request.stages or plugin.default_stages
    filename = request.filepath

    # Try cached file first (loaded from S3 or upload), then fall back to filesystem
    if filename in _parsed_files:
        parsed = _parsed_files[filename]
    elif os.path.exists(request.filepath):
        parser = plugin.create_parser()
        try:
            parsed = parser.parse_file(request.filepath)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")
        filename = os.path.basename(request.filepath)
    else:
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {request.filepath}. Load the file first on the Load File page.",
        )

    test_run_id = request.test_run_id or str(uuid.uuid4())
    now = datetime.utcnow()
    total_stages = len(stages_to_run)

    if not request.test_run_id:
        db.execute_non_query(
            DatabaseManager.INTERFACE,
            """INSERT INTO [TestVerification].[TestRun] 
                (TestRunId, InterfaceType, StartTimestamp, SourceFileName, McdIdPrefix,
                 TotalSourceLines, TotalProviders, OverallStatus)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING')""",
            (test_run_id, request.interface_type, now, filename, request.mcd_id_prefix,
             len(parsed.source_lines), parsed.entity_count),
        )

    _update_progress(test_run_id, "initializing", detail="Creating expected state generator...")

    # Create vocab client with plugin-specific lookup keys
    vocab = VocabClient(lookup_keys=plugin.vocab_lookup_keys)

    # Create expected state generator and comparator via plugin
    expected_gen = plugin.create_expected_state_generator(parsed, vocab)
    comparator = plugin.create_comparator(entity_id_prefix=request.mcd_id_prefix)

    stage_results: List[StageSummary] = []
    all_mismatches: List[MismatchRecord] = []
    completed = 0

    # --- Stage 1 ---
    if 1 in stages_to_run:
        _update_progress(test_run_id, "generating", stage=1,
                         detail="Generating Stage 1 expected state...",
                         completed_stages=completed, total_stages=total_stages)
        stage1_expected = expected_gen.generate_stage1()

        _update_progress(test_run_id, "persisting", stage=1,
                         detail="Saving Stage 1 expected state to database...",
                         completed_stages=completed, total_stages=total_stages)
        _store_expected_state_stage1(test_run_id, stage1_expected, parsed, request.mcd_id_prefix)

        _update_progress(test_run_id, "comparing", stage=1,
                         detail="Comparing Stage 1 expected vs actual...",
                         completed_stages=completed, total_stages=total_stages)
        r = comparator.compare_stage1(stage1_expected)
        stage_results.append(StageSummary(
            stage=1, total_checks=r.total_checks,
            pass_count=r.pass_count, fail_count=r.fail_count, missing_count=r.missing_count,
        ))
        all_mismatches.extend(r.mismatches)
        completed += 1

    # --- Stage 2 ---
    if 2 in stages_to_run:
        _update_progress(test_run_id, "generating", stage=2,
                         detail="Generating Stage 2 expected state...",
                         completed_stages=completed, total_stages=total_stages)
        stage2_expected = expected_gen.generate_stage2()

        _update_progress(test_run_id, "persisting", stage=2,
                         detail="Saving Stage 2 expected state to database...",
                         completed_stages=completed, total_stages=total_stages)
        _store_expected_state_stage2(test_run_id, stage2_expected, request.mcd_id_prefix)

        _update_progress(test_run_id, "comparing", stage=2,
                         detail="Comparing Stage 2 expected vs actual...",
                         completed_stages=completed, total_stages=total_stages)
        r = comparator.compare_stage2(stage2_expected)
        stage_results.append(StageSummary(
            stage=2, total_checks=r.total_checks,
            pass_count=r.pass_count, fail_count=r.fail_count, missing_count=r.missing_count,
        ))
        all_mismatches.extend(r.mismatches)
        completed += 1

    # --- Stage 3 (also used by Stage 4 for interfaces where stage3→4 is a copy) ---
    stage3_expected = None
    if 3 in stages_to_run or 4 in stages_to_run:
        _update_progress(test_run_id, "generating", stage=3,
                         detail="Generating Stage 3 expected state (vocab lookups)...",
                         completed_stages=completed, total_stages=total_stages)
        stage3_expected = expected_gen.generate_stage3()

    if 3 in stages_to_run:
        _update_progress(test_run_id, "persisting", stage=3,
                         detail="Saving Stage 3 expected state to database...",
                         completed_stages=completed, total_stages=total_stages)
        _store_expected_state_stage3(test_run_id, stage3_expected, request.mcd_id_prefix)

        _update_progress(test_run_id, "comparing", stage=3,
                         detail="Comparing Stage 3 expected vs actual...",
                         completed_stages=completed, total_stages=total_stages)
        r = comparator.compare_stage3(stage3_expected)
        stage_results.append(StageSummary(
            stage=3, total_checks=r.total_checks,
            pass_count=r.pass_count, fail_count=r.fail_count, missing_count=r.missing_count,
        ))
        all_mismatches.extend(r.mismatches)
        completed += 1

    # --- Stage 4 ---
    if 4 in stages_to_run:
        # Use generate_stage4() which may differ from stage3 (e.g., D12 skips stage 3)
        stage4_expected = expected_gen.generate_stage4()
        # Fall back to stage3_expected if stage4 returns the same (backward compat)
        if not stage4_expected and stage3_expected:
            stage4_expected = stage3_expected

        _update_progress(test_run_id, "persisting", stage=4,
                         detail="Saving Stage 4 expected state to database...",
                         completed_stages=completed, total_stages=total_stages)
        _store_expected_state_stage4(test_run_id, stage4_expected, request.mcd_id_prefix)

        _update_progress(test_run_id, "comparing", stage=4,
                         detail="Comparing Stage 4 expected vs actual...",
                         completed_stages=completed, total_stages=total_stages)
        r = comparator.compare_stage4(stage4_expected)
        stage_results.append(StageSummary(
            stage=4, total_checks=r.total_checks,
            pass_count=r.pass_count, fail_count=r.fail_count, missing_count=r.missing_count,
        ))
        all_mismatches.extend(r.mismatches)
        completed += 1

    # --- Store mismatches ---
    _update_progress(test_run_id, "finalizing", detail="Storing mismatch report...",
                     completed_stages=completed, total_stages=total_stages)
    if all_mismatches:
        _store_mismatches(test_run_id, request.interface_type, filename, all_mismatches)

    # --- Update TestRun record ---
    total_pass = sum(s.pass_count for s in stage_results)
    total_fail = sum(s.fail_count for s in stage_results)
    total_missing = sum(s.missing_count for s in stage_results)
    overall_status = "PASS" if total_fail == 0 and total_missing == 0 else "FAIL" if total_pass == 0 else "PARTIAL"

    stage_pass = {s.stage: s.pass_count for s in stage_results}
    stage_fail = {s.stage: s.fail_count + s.missing_count for s in stage_results}
    db.execute_non_query(
        DatabaseManager.INTERFACE,
        """UPDATE [TestVerification].[TestRun] SET EndTimestamp=?,
            Stage1PassCount=?, Stage1FailCount=?, Stage2PassCount=?, Stage2FailCount=?,
            Stage3PassCount=?, Stage3FailCount=?, Stage4PassCount=?, Stage4FailCount=?,
            OverallStatus=? WHERE TestRunId=?""",
        (datetime.utcnow(), stage_pass.get(1, 0), stage_fail.get(1, 0),
         stage_pass.get(2, 0), stage_fail.get(2, 0),
         stage_pass.get(3, 0), stage_fail.get(3, 0),
         stage_pass.get(4, 0), stage_fail.get(4, 0),
         overall_status, test_run_id),
    )

    _update_progress(test_run_id, "done", detail="Comparison complete.",
                     completed_stages=total_stages, total_stages=total_stages)

    return CompareResponse(
        test_run_id=test_run_id, filename=filename, status=overall_status,
        total_providers=parsed.entity_count, total_source_lines=len(parsed.source_lines),
        stages=stage_results, total_checks=sum(s.total_checks for s in stage_results),
        total_pass=total_pass, total_fail=total_fail, total_missing=total_missing,
    )


# =============================================================================
# Per-Stage Comparison Endpoint (for progress-aware frontend)
# =============================================================================

class StageRunRequest(BaseModel):
    test_run_id: str
    filepath: str
    interface_type: str = "icd_d06"
    mcd_id_prefix: str = "000000000"
    stage: int


class StageRunResponse(BaseModel):
    test_run_id: str
    stage: int
    step: str  # "compared"
    total_checks: int
    pass_count: int
    fail_count: int
    missing_count: int
    expected_rows_stored: int


@router.post("/run-stage", response_model=StageRunResponse)
async def run_single_stage(request: StageRunRequest):
    """
    Run a single stage of the comparison pipeline.
    Call this sequentially for each stage to get per-stage progress in the UI.
    """
    from src.api.files import _parsed_files

    try:
        plugin = get_interface(request.interface_type)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = request.filepath
    if filename in _parsed_files:
        parsed = _parsed_files[filename]
    elif os.path.exists(request.filepath):
        parser = plugin.create_parser()
        try:
            parsed = parser.parse_file(request.filepath)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Parse error: {str(e)}")
    else:
        raise HTTPException(status_code=404, detail=f"File not found: {request.filepath}")

    vocab = VocabClient(lookup_keys=plugin.vocab_lookup_keys)
    expected_gen = plugin.create_expected_state_generator(parsed, vocab)
    comparator = plugin.create_comparator(entity_id_prefix=request.mcd_id_prefix)

    test_run_id = request.test_run_id
    stage = request.stage
    expected_rows_stored = 0

    try:
        if stage == 1:
            stage_expected = expected_gen.generate_stage1()
            _store_expected_state_stage1(test_run_id, stage_expected, parsed, request.mcd_id_prefix)
            expected_rows_stored = len(parsed.source_lines)
            r = comparator.compare_stage1(stage_expected)

        elif stage == 2:
            stage_expected = expected_gen.generate_stage2()
            _store_expected_state_stage2(test_run_id, stage_expected, request.mcd_id_prefix)
            expected_rows_stored = len(stage_expected)
            r = comparator.compare_stage2(stage_expected)

        elif stage == 3:
            stage_expected = expected_gen.generate_stage3()
            _store_expected_state_stage3(test_run_id, stage_expected, request.mcd_id_prefix)
            expected_rows_stored = len(stage_expected)
            r = comparator.compare_stage3(stage_expected)

        elif stage == 4:
            stage_expected = expected_gen.generate_stage4()
            _store_expected_state_stage4(test_run_id, stage_expected, request.mcd_id_prefix)
            expected_rows_stored = len(stage_expected)
            r = comparator.compare_stage4(stage_expected)

        else:
            raise HTTPException(status_code=400, detail=f"Invalid stage: {stage}. Must be 1-4.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stage {stage} failed: {type(e).__name__}: {str(e)}")

    # Store mismatches for this stage
    if r.mismatches:
        _store_mismatches(test_run_id, request.interface_type,
                          os.path.basename(filename), r.mismatches)

    return StageRunResponse(
        test_run_id=test_run_id,
        stage=stage,
        step="compared",
        total_checks=r.total_checks,
        pass_count=r.pass_count,
        fail_count=r.fail_count,
        missing_count=r.missing_count,
        expected_rows_stored=expected_rows_stored,
    )


# =============================================================================
# Progress SSE Endpoint
# =============================================================================

@router.get("/progress/{test_run_id}")
async def get_progress(test_run_id: str):
    """Get current progress for a running comparison (polling endpoint)."""
    progress = _progress.get(test_run_id)
    if progress is None:
        return {"test_run_id": test_run_id, "step": "unknown", "detail": "No active run found."}
    return {"test_run_id": test_run_id, **progress}


@router.get("/progress-stream/{test_run_id}")
async def stream_progress(test_run_id: str):
    """Stream progress updates via Server-Sent Events (SSE)."""
    async def event_generator():
        last_step = None
        while True:
            progress = _progress.get(test_run_id)
            if progress and progress["step"] != last_step:
                last_step = progress["step"]
                yield f"data: {json.dumps({'test_run_id': test_run_id, **progress})}\n\n"
                if progress["step"] == "done":
                    break
            await asyncio.sleep(0.3)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# =============================================================================
# Mismatch & Summary Endpoints
# =============================================================================

@router.get("/mismatches/{test_run_id}")
async def get_mismatches(
    test_run_id: str, stage: Optional[int] = None,
    status: Optional[str] = None, provider: Optional[str] = None, limit: int = 100,
):
    """Get mismatch report for a test run."""
    query = "SELECT TOP (?) * FROM [TestVerification].[MismatchReport] WHERE TestRunId = ?"
    params: list = [limit, test_run_id]
    if stage is not None:
        query += " AND Stage = ?"
        params.append(stage)
    if status:
        query += " AND Status = ?"
        params.append(status)
    if provider:
        query += " AND EntityId = ?"
        params.append(provider)
    query += " ORDER BY Stage, SourceLineNumber, TargetTable, TargetColumn"
    rows = db.execute_query(DatabaseManager.INTERFACE, query, tuple(params))
    for row in rows:
        for k, v in row.items():
            if isinstance(v, datetime):
                row[k] = v.isoformat()
            elif hasattr(v, "hex"):
                row[k] = str(v)
    return {"test_run_id": test_run_id, "count": len(rows), "mismatches": rows}


@router.get("/matches/{test_run_id}")
async def get_matches(
    test_run_id: str, stage: Optional[int] = None,
    provider: Optional[str] = None, limit: int = 100,
):
    """Get match report for a test run (records with Status = 'PASS')."""
    query = "SELECT TOP (?) * FROM [TestVerification].[MismatchReport] WHERE TestRunId = ? AND Status = 'PASS'"
    params: list = [limit, test_run_id]
    if stage is not None:
        query += " AND Stage = ?"
        params.append(stage)
    if provider:
        query += " AND EntityId = ?"
        params.append(provider)
    query += " ORDER BY Stage, SourceLineNumber, TargetTable, TargetColumn"
    rows = db.execute_query(DatabaseManager.INTERFACE, query, tuple(params))
    for row in rows:
        for k, v in row.items():
            if isinstance(v, datetime):
                row[k] = v.isoformat()
            elif hasattr(v, "hex"):
                row[k] = str(v)
    return {"test_run_id": test_run_id, "count": len(rows), "matches": rows}


@router.get("/summary/{test_run_id}")
async def get_comparison_summary(test_run_id: str):
    """Get aggregated summary."""
    summary = db.execute_query(
        DatabaseManager.INTERFACE,
        "SELECT Stage, Status, ErrorCategory, COUNT(*) AS Count FROM [TestVerification].[MismatchReport] WHERE TestRunId=? GROUP BY Stage, Status, ErrorCategory ORDER BY Stage, Status",
        (test_run_id,),
    )
    run = db.execute_query(
        DatabaseManager.INTERFACE,
        "SELECT OverallStatus, TotalSourceLines, TotalProviders, Stage1PassCount, Stage1FailCount, Stage2PassCount, Stage2FailCount, Stage3PassCount, Stage3FailCount, Stage4PassCount, Stage4FailCount FROM [TestVerification].[TestRun] WHERE TestRunId=?",
        (test_run_id,),
    )
    return {"test_run_id": test_run_id, "test_run": run[0] if run else None, "mismatch_summary": summary}


# =============================================================================
# Internal Helpers
# =============================================================================

def _store_mismatches(test_run_id: str, interface_type: str, filename: str, mismatches: List[MismatchRecord]):
    """Batch insert mismatches."""
    params_list = [
        (str(uuid.uuid4()), test_run_id, interface_type, filename,
         m.source_line_number, m.entity_id, m.record_type, m.stage,
         m.target_database, m.target_schema, m.target_table, m.target_column,
         m.expected_value, m.actual_value, m.status, m.business_rule,
         m.vocab_used, m.error_category, m.notes)
        for m in mismatches
    ]
    db.execute_many(
        DatabaseManager.INTERFACE,
        """INSERT INTO [TestVerification].[MismatchReport]
           (MismatchId, TestRunId, InterfaceType, SourceFileName, SourceLineNumber,
            EntityId, RecordType, Stage, TargetDatabase, TargetSchema, TargetTable,
            TargetColumn, ExpectedValue, ActualValue, Status, BusinessRule,
            VocabLookupUsed, ErrorCategory, Notes)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        params_list,
    )
