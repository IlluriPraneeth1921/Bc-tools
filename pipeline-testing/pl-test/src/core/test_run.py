"""
TestRun management — creates and tracks test run identifiers for data isolation.
"""
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field
from typing import Optional
from src.core.config import settings

MCD_ID_RANGE_START = settings.MCD_ID_PREFIX + "00001"
MCD_ID_RANGE_END = settings.MCD_ID_PREFIX + "99999"


@dataclass
class TestRun:
    """
    Represents a single test execution run.

    Every test run gets a unique ID used to:
    - Tag expected state rows in the verification DB
    - Scope cleanup procedures to only delete this run's data
    - Link mismatch report entries back to the originating run
    """
    test_run_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    interface_type: str = "icd_d06"  # Which interface is being tested (future: plugin code)
    start_timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    end_timestamp: Optional[datetime] = None
    source_filename: str = ""
    mcd_id_range_start: str = MCD_ID_RANGE_START
    mcd_id_range_end: str = MCD_ID_RANGE_END
    total_source_lines: int = 0
    total_providers: int = 0
    stage1_pass_count: int = 0
    stage1_fail_count: int = 0
    stage2_pass_count: int = 0
    stage2_fail_count: int = 0
    stage3_pass_count: int = 0
    stage3_fail_count: int = 0
    overall_status: str = "PENDING"  # PENDING, RUNNING, PASS, FAIL, PARTIAL
    cleaned_up: bool = False

    def mark_running(self) -> None:
        """Mark the test run as currently executing."""
        self.overall_status = "RUNNING"

    def mark_completed(self) -> None:
        """Mark the test run as completed and calculate overall status."""
        self.end_timestamp = datetime.now(timezone.utc)
        total_fails = self.stage1_fail_count + self.stage2_fail_count + self.stage3_fail_count
        total_passes = self.stage1_pass_count + self.stage2_pass_count + self.stage3_pass_count

        if total_fails == 0 and total_passes > 0:
            self.overall_status = "PASS"
        elif total_passes == 0 and total_fails > 0:
            self.overall_status = "FAIL"
        elif total_fails > 0 and total_passes > 0:
            self.overall_status = "PARTIAL"
        else:
            self.overall_status = "PENDING"

    def mark_cleaned_up(self) -> None:
        """Mark the test run data as cleaned from all databases."""
        self.cleaned_up = True

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate run duration in seconds, or None if not yet completed."""
        if self.end_timestamp is None:
            return None
        delta = self.end_timestamp - self.start_timestamp
        return delta.total_seconds()

    @property
    def summary(self) -> dict:
        """Return a summary dictionary of the test run."""
        return {
            "test_run_id": self.test_run_id,
            "interface_type": self.interface_type,
            "source_filename": self.source_filename,
            "status": self.overall_status,
            "duration_seconds": self.duration_seconds,
            "total_providers": self.total_providers,
            "total_source_lines": self.total_source_lines,
            "stage1": {"pass": self.stage1_pass_count, "fail": self.stage1_fail_count},
            "stage2": {"pass": self.stage2_pass_count, "fail": self.stage2_fail_count},
            "stage3": {"pass": self.stage3_pass_count, "fail": self.stage3_fail_count},
            "cleaned_up": self.cleaned_up,
        }

    def __repr__(self) -> str:
        return (
            f"TestRun(id={self.test_run_id[:8]}..., file={self.source_filename}, "
            f"status={self.overall_status}, providers={self.total_providers})"
        )
