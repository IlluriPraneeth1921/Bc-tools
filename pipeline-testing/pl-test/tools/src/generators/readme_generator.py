"""
README Generator — produces TEST_SCENARIOS_README.md for generated test data.

Documents all generated test files, their purposes, and validation rules.
"""
import os
from datetime import datetime
from typing import List

from tools.src.models import InterfaceSpec, ScenarioType, STANDARD_SCENARIOS


class ReadmeGenerator:
    """Generates TEST_SCENARIOS_README.md documentation."""

    def __init__(self, spec: InterfaceSpec):
        self.spec = spec

    def generate(self, output_dir: str, generated_files: List[str]) -> str:
        """Generate the README file. Returns the file path."""
        os.makedirs(output_dir, exist_ok=True)
        filepath = os.path.join(output_dir, "TEST_SCENARIOS_README.md")

        content = self._build_readme(generated_files)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        return filepath

    def _build_readme(self, generated_files: List[str]) -> str:
        """Build the full README content."""
        s = self.spec
        lines = []

        # Title
        lines.append(f"# {s.meta.display_name} — Test Scenarios")
        lines.append("")
        lines.append("## Overview")
        lines.append("")
        lines.append(f"These test files validate that the destination system correctly processes the")
        lines.append(f"**{s.meta.display_name}** ({s.format.type.value} `{s.meta.file_extension}` format).")
        lines.append(f"")
        lines.append(f"- **Interface Type:** `{s.meta.interface_type}`")
        lines.append(f"- **Format:** {s.format.type.value}")
        lines.append(f"- **Entity ID Field:** `{s.entity.id_field}` (prefix: `{s.entity.test_prefix}`)")
        lines.append(f"- **Generated:** {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        lines.append("")

        # File inventory
        lines.append("---")
        lines.append("")
        lines.append("## Test File Inventory")
        lines.append("")
        lines.append("| # | File Name | Purpose |")
        lines.append("|---|-----------|---------|")
        for i, filepath in enumerate(generated_files):
            filename = os.path.basename(filepath)
            purpose = self._describe_file(filename)
            lines.append(f"| {i} | `{filename}` | {purpose} |")
        lines.append("")

        # Field summary
        lines.append("---")
        lines.append("")
        lines.append("## Field Summary")
        lines.append("")
        lines.append(f"| # | Field Name | Type | Length | Required |")
        lines.append("|---|-----------|------|--------|----------|")
        for i, field in enumerate(s.detail_fields, 1):
            req = "Yes" if field.required else "No"
            lines.append(f"| {i} | `{field.name}` | {field.type.value} | {field.length} | {req} |")
        lines.append("")

        # Code tables
        if s.code_tables:
            lines.append("---")
            lines.append("")
            lines.append("## Code Tables")
            lines.append("")
            for table_name, table in s.code_tables.items():
                lines.append(f"### {table_name}")
                lines.append("")
                lines.append("| Code | Description |")
                lines.append("|------|-------------|")
                for code, desc in table.values.items():
                    lines.append(f"| `{code}` | {desc} |")
                lines.append("")

        # Business rules
        if s.business_rules:
            lines.append("---")
            lines.append("")
            lines.append("## Business Rules")
            lines.append("")
            lines.append("| ID | Description | Affects |")
            lines.append("|----|-------------|---------|")
            for rule in s.business_rules:
                fields = ", ".join(rule.affects_fields)
                lines.append(f"| {rule.id} | {rule.description} | {fields} |")
            lines.append("")

        # SQL scripts
        lines.append("---")
        lines.append("")
        lines.append("## SQL Scripts")
        lines.append("")
        lines.append("| Script | Purpose |")
        lines.append("|--------|---------|")
        lines.append("| `test_insert_01_perfect_match.sql` | All 4 stages consistent (0 expected mismatches) |")
        lines.append("| `test_insert_02_partial_mismatch.sql` | 3 intentional field mismatches in Stage 2 |")
        lines.append("| `test_insert_03_large_mismatch.sql` | Many mismatches across multiple stages |")
        lines.append("")

        # Execution
        lines.append("---")
        lines.append("")
        lines.append("## Running Tests")
        lines.append("")
        lines.append("```bash")
        lines.append("# Parse and load a test file via the pl-test API:")
        lines.append(f"# POST /api/files/parse-local?filepath=data/{s.meta.interface_type}/{{filename}}&interface_type={s.meta.interface_type}")
        lines.append("")
        lines.append("# Or use the CLI tool to execute SQL:")
        lines.append(f"python -m tools.cli run-sql --script data/{s.meta.interface_type}/test_insert_01_perfect_match.sql --env qc")
        lines.append("```")
        lines.append("")

        return "\n".join(lines)

    def _describe_file(self, filename: str) -> str:
        """Generate a description for a test file based on its name."""
        name_upper = filename.upper()
        if "MAX_LENGTH" in name_upper:
            return "Maximum field length validation"
        elif "MIN_EMPTY" in name_upper:
            return "Minimal/empty optional fields"
        elif "BOUNDARY" in name_upper:
            return "Date boundary conditions"
        elif "ALL_CODES" in name_upper:
            return "All valid enumerated code values"
        elif "SPECIAL" in name_upper:
            return "Special characters in text fields"
        elif "LARGE_VOLUME" in name_upper:
            return f"Volume testing ({self.spec.test_scenarios.volume_size} entities)"
        elif "COMPOSITE" in name_upper:
            return "Business rule boundary conditions"
        elif "CROSS_FIELD" in name_upper:
            return "Cross-field dependency validation"
        elif "DUPLICATE" in name_upper:
            return "Duplicate entity detection"
        elif "ORDERING" in name_upper:
            return "Record ordering edge cases"
        elif "ENCODING" in name_upper:
            return "Character encoding edge cases"
        elif "TRUNCAT" in name_upper:
            return "Data exceeding max length"
        elif "REFERENT" in name_upper:
            return "Referential integrity edge cases"
        elif "HISTOR" in name_upper:
            return "Multi-day feed simulation"
        elif "CODE_COVERAGE" in name_upper:
            return "Every code value exercised per entity"
        elif "UPD" in name_upper:
            return "Update/mutation scenario"
        elif "DEL" in name_upper:
            return "Deletion/removal scenario"
        elif "_T." in filename or filename.endswith(self.spec.naming.extension):
            return "Baseline happy-path with all record types"
        return "Test scenario"
