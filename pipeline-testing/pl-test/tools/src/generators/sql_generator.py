"""
SQL Script Generator — produces INSERT and CLEANUP scripts for all 4 pipeline stages.

Generates:
- test_insert_01_perfect_match.sql (all stages consistent)
- test_insert_02_partial_mismatch.sql (intentional field mismatches)
- test_insert_03_large_mismatch.sql (many mismatches)
- Cleanup scripts (DELETE in FK-reverse order)
"""
import os
from datetime import date, datetime
from typing import Dict, List, Optional

from tools.src.models import InterfaceSpec, FieldDefinition, FieldType
from tools.src.generators.file_generator import FileGenerator


class SqlGenerator:
    """Generates SQL insert and cleanup scripts from an InterfaceSpec."""

    def __init__(self, spec: InterfaceSpec):
        self.spec = spec
        self.file_gen = FileGenerator(spec)

    def generate_all(self, output_dir: str) -> List[str]:
        """Generate all SQL scripts. Returns list of generated file paths."""
        os.makedirs(output_dir, exist_ok=True)
        generated: List[str] = []

        # Perfect match
        path = os.path.join(output_dir, "test_insert_01_perfect_match.sql")
        self._write_sql(path, self._gen_perfect_match())
        generated.append(path)

        # Partial mismatch
        path = os.path.join(output_dir, "test_insert_02_partial_mismatch.sql")
        self._write_sql(path, self._gen_partial_mismatch())
        generated.append(path)

        # Large mismatch
        path = os.path.join(output_dir, "test_insert_03_large_mismatch.sql")
        self._write_sql(path, self._gen_large_mismatch())
        generated.append(path)

        return generated

    def _write_sql(self, filepath: str, content: str) -> None:
        """Write SQL content to file."""
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

    def _gen_perfect_match(self) -> str:
        """Generate SQL where all 4 stages are perfectly consistent."""
        lines = [self._sql_header("PERFECT MATCH", "All 4 stages are consistent — comparison should report 0 mismatches")]
        lines.append(self._declare_variables(3))
        lines.append("")

        # Stage 1
        lines.append(self._stage_header(1))
        lines.append(self._gen_stage1_inserts(3, mismatch=False))
        lines.append("")

        # Stage 2
        lines.append(self._stage_header(2))
        lines.append(self._gen_stage2_inserts(3, mismatch=False))
        lines.append("")

        # Stage 3
        lines.append(self._stage_header(3))
        lines.append(self._gen_stage3_inserts(3, mismatch=False))
        lines.append("")

        # Stage 4
        lines.append(self._stage_header(4))
        lines.append(self._gen_stage4_inserts(3, mismatch=False))
        lines.append("")

        # Cleanup
        lines.append(self._cleanup_section())

        lines.append(self._sql_footer())
        return "\n".join(lines)

    def _gen_partial_mismatch(self) -> str:
        """Generate SQL with 3 intentional field mismatches in Stage 2."""
        lines = [self._sql_header("PARTIAL MISMATCH", "3 intentional field mismatches introduced in Stage 2")]
        lines.append(self._declare_variables(1))
        lines.append("")
        lines.append(self._stage_header(1))
        lines.append(self._gen_stage1_inserts(1, mismatch=False))
        lines.append("")
        lines.append(self._stage_header(2))
        lines.append(self._gen_stage2_inserts(1, mismatch=True))
        lines.append("")
        lines.append(self._cleanup_section())
        lines.append(self._sql_footer())
        return "\n".join(lines)

    def _gen_large_mismatch(self) -> str:
        """Generate SQL with many mismatches across all stages."""
        lines = [self._sql_header("LARGE MISMATCH", "Multiple mismatches across multiple stages")]
        lines.append(self._declare_variables(3))
        lines.append("")
        lines.append(self._stage_header(1))
        lines.append(self._gen_stage1_inserts(3, mismatch=True))
        lines.append("")
        lines.append(self._stage_header(2))
        lines.append(self._gen_stage2_inserts(3, mismatch=True))
        lines.append("")
        lines.append(self._cleanup_section())
        lines.append(self._sql_footer())
        return "\n".join(lines)

    # =========================================================================
    # SQL Building Blocks
    # =========================================================================

    def _sql_header(self, scenario_name: str, description: str) -> str:
        """Generate SQL file header comment."""
        itype = self.spec.meta.interface_type.upper()
        return f"""-- =============================================================================
-- TEST SCENARIO: {scenario_name} ({itype} Interface)
-- =============================================================================
-- {description}
--
-- Interface: {self.spec.meta.display_name}
-- Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
-- Entity ID Prefix: {self.spec.entity.test_prefix}
-- =============================================================================
"""

    def _sql_footer(self) -> str:
        """Generate SQL file footer."""
        return f"""
PRINT N'{self.spec.meta.interface_type.upper()} test data inserted successfully.';
GO
"""

    def _declare_variables(self, entity_count: int) -> str:
        """Generate DECLARE statements for batch key and entity IDs."""
        lines = ["DECLARE @BatchKey UNIQUEIDENTIFIER = NEWID();"]
        lines.append("DECLARE @Now DATETIME2 = GETUTCDATE();")
        lines.append("")
        prefix = self.spec.entity.test_prefix
        id_len = self.spec.entity.id_length
        for i in range(1, entity_count + 1):
            suffix = str(i).zfill(id_len - len(prefix))
            entity_id = (prefix + suffix)[:id_len]
            lines.append(f"DECLARE @EntityId{i} NVARCHAR({id_len}) = N'{entity_id}';")
        return "\n".join(lines)

    def _stage_header(self, stage: int) -> str:
        """Generate a stage section header comment."""
        stage_names = {1: "Raw", 2: "Parsed", 3: "Incoming/Transformed", 4: "Final"}
        return f"""-- =============================================================================
-- STAGE {stage}: {stage_names.get(stage, '')}
-- =============================================================================
"""

    def _gen_stage1_inserts(self, count: int, mismatch: bool) -> str:
        """Generate Stage 1 INSERT statements."""
        targets = self.spec.db_targets.stage1
        schema = targets.db_schema
        table = targets.tables[0].name if targets.tables else f"{self.spec.meta.interface_type}Raw"

        lines = [f"INSERT INTO [{schema}].[{table}]"]
        lines.append(f"    (LineNumber, RecordType, RawText, {self._entity_id_column()}, HasErrors, InterfaceBatchKey, LastSynchronizationTimestamp)")
        lines.append("VALUES")

        values = []
        for i in range(1, count + 1):
            raw_text = f"Sample raw line {i} for entity @EntityId{i}"
            if mismatch and i == 1:
                raw_text = f"WRONG raw line {i} for entity @EntityId{i}"
            values.append(f"    ({i + 1}, N'DTL', N'{raw_text}', @EntityId{i}, 0, @BatchKey, @Now)")

        lines.append(",\n".join(values) + ";")
        return "\n".join(lines)

    def _gen_stage2_inserts(self, count: int, mismatch: bool) -> str:
        """Generate Stage 2 INSERT statements."""
        targets = self.spec.db_targets.stage2
        schema = targets.db_schema

        if not targets.tables:
            return f"-- Stage 2: No table targets defined. Add db_targets.stage2.tables to spec."

        table = targets.tables[0]
        columns = list(table.columns.values()) if table.columns else [f.pascal_name for f in self.spec.detail_fields[:5]]

        lines = [f"INSERT INTO [{schema}].[{table.name}]"]
        col_list = ", ".join(columns + ["LastSynchronizationTimestamp"])
        lines.append(f"    ({col_list})")
        lines.append("VALUES")

        values = []
        for i in range(1, count + 1):
            row_vals = []
            for j, col in enumerate(columns):
                if j == 0:
                    row_vals.append(f"@EntityId{i}")
                elif mismatch and i == 1 and j <= 2:
                    row_vals.append(f"N'WRONG_VALUE_{j}'")
                else:
                    row_vals.append(f"N'Value_{i}_{j}'")
            row_vals.append("@Now")
            values.append(f"    ({', '.join(row_vals)})")

        lines.append(",\n".join(values) + ";")
        return "\n".join(lines)

    def _gen_stage3_inserts(self, count: int, mismatch: bool) -> str:
        """Generate Stage 3 INSERT statements."""
        targets = self.spec.db_targets.stage3
        schema = targets.db_schema

        if not targets.tables:
            return f"""-- Stage 3: Table schemas not yet confirmed.
-- Add db_targets.stage3.tables to the spec YAML to enable Stage 3 SQL generation.
-- Expected tables: [{schema}].[Incoming*] tables per interface specification."""

        lines = []
        for table in targets.tables:
            columns = list(table.columns.values()) if table.columns else ["CustomerPersonIdentifier"]
            lines.append(f"INSERT INTO [{schema}].[{table.name}]")
            col_list = ", ".join(columns + ["LastSynchronizationTimestamp", "IsReadyToProcess"])
            lines.append(f"    ({col_list})")
            lines.append("VALUES")
            values = []
            for i in range(1, count + 1):
                row_vals = [f"@EntityId{i}"] + [f"N'Stage3Value_{i}'"] * (len(columns) - 1)
                row_vals += ["@Now", "1"]
                values.append(f"    ({', '.join(row_vals)})")
            lines.append(",\n".join(values) + ";")
            lines.append("")

        return "\n".join(lines)

    def _gen_stage4_inserts(self, count: int, mismatch: bool) -> str:
        """Generate Stage 4 INSERT statements."""
        targets = self.spec.db_targets.stage4
        schema = targets.db_schema
        db_name = targets.database

        if not targets.tables:
            return f"""-- Stage 4: Table schemas not yet confirmed.
-- Add db_targets.stage4.tables to the spec YAML to enable Stage 4 SQL generation.
-- Target database: {db_name}
-- Expected schema: [{schema}]"""

        lines = [f"-- Target Database: {db_name}"]
        for table in targets.tables:
            columns = list(table.columns.values()) if table.columns else ["ExternalIdentifier"]
            lines.append(f"INSERT INTO [{schema}].[{table.name}]")
            col_list = ", ".join(columns)
            lines.append(f"    ({col_list})")
            lines.append("VALUES")
            values = []
            for i in range(1, count + 1):
                row_vals = [f"@EntityId{i}"] + [f"N'Stage4Value_{i}'"] * (len(columns) - 1)
                values.append(f"    ({', '.join(row_vals)})")
            lines.append(",\n".join(values) + ";")
            lines.append("")

        return "\n".join(lines)

    def _cleanup_section(self) -> str:
        """Generate cleanup DELETE statements (commented out by default)."""
        prefix = self.spec.entity.test_prefix
        id_col = self._entity_id_column()
        lines = ["""-- =============================================================================
-- CLEANUP (uncomment and run to remove test data)
-- =============================================================================
"""]
        # Reverse order: Stage 4 → 3 → 2 → 1
        for stage_num in [4, 3, 2, 1]:
            targets = getattr(self.spec.db_targets, f"stage{stage_num}")
            for table in targets.tables:
                filter_col = table.filter_column or id_col
                lines.append(f"-- DELETE FROM [{targets.db_schema}].[{table.name}] WHERE [{filter_col}] LIKE '{prefix}%';")

        return "\n".join(lines)

    def _entity_id_column(self) -> str:
        """Get the PascalCase entity ID column name."""
        entity_field = self.spec.entity_id_field
        if entity_field and entity_field.db_column:
            return entity_field.db_column
        return "".join(w.capitalize() for w in self.spec.entity.id_field.split("_"))
