"""
Core data models shared across all interface plugins.

MismatchRecord and ComparatorResult are generic structures used by
the comparison engine regardless of file type.
"""
from typing import List, Dict, Any, Optional


class MismatchRecord:
    """A single field-level comparison result."""

    def __init__(
        self,
        source_line_number: int,
        entity_id: str,
        record_type: str,
        stage: int,
        target_database: str,
        target_schema: str,
        target_table: str,
        target_column: str,
        expected_value: Optional[str],
        actual_value: Optional[str],
        status: str,  # PASS, FAIL, MISSING, EXTRA
        business_rule: Optional[str] = None,
        vocab_used: Optional[str] = None,
        error_category: Optional[str] = None,
        notes: Optional[str] = None,
    ):
        self.source_line_number = source_line_number
        self.entity_id = entity_id
        self.record_type = record_type
        self.stage = stage
        self.target_database = target_database
        self.target_schema = target_schema
        self.target_table = target_table
        self.target_column = target_column
        self.expected_value = expected_value
        self.actual_value = actual_value
        self.status = status
        self.business_rule = business_rule
        self.vocab_used = vocab_used
        self.error_category = error_category
        self.notes = notes


class ComparatorResult:
    """Aggregated results from a comparison run."""

    def __init__(self):
        self.mismatches: List[MismatchRecord] = []
        self.matches: List[MismatchRecord] = []
        self.pass_count: int = 0
        self.fail_count: int = 0
        self.missing_count: int = 0

    @property
    def total_checks(self) -> int:
        return self.pass_count + self.fail_count + self.missing_count

    def add_pass(self, record: Optional[MismatchRecord] = None):
        self.pass_count += 1
        if record is not None:
            self.matches.append(record)

    def add_mismatch(self, record: MismatchRecord):
        self.mismatches.append(record)
        if record.status == "FAIL":
            self.fail_count += 1
        elif record.status == "MISSING":
            self.missing_count += 1

    @property
    def summary(self) -> Dict[str, Any]:
        return {
            "total_checks": self.total_checks,
            "pass": self.pass_count,
            "fail": self.fail_count,
            "missing": self.missing_count,
            "mismatch_count": len(self.mismatches),
        }
