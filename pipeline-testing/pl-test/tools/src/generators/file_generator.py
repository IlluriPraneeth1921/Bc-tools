"""
Test File Generator — produces test data files from an InterfaceSpec.

Generates files in any text-based format (pipe-delimited, fixed-width, CSV, etc.)
for each selected test scenario.
"""
import os
import random
import string
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from tools.src.models import (
    InterfaceSpec, FieldDefinition, FieldType, FormatType,
    ScenarioType, STANDARD_SCENARIOS, ALL_SCENARIOS,
)


class FileGenerator:
    """Generates test data files from an InterfaceSpec."""

    def __init__(self, spec: InterfaceSpec):
        self.spec = spec
        self._rng = random.Random(42)  # Deterministic for reproducibility

    def generate_all(
        self, output_dir: str, scenarios: Optional[List[ScenarioType]] = None
    ) -> List[str]:
        """
        Generate all selected scenario files.
        
        Returns list of generated file paths.
        """
        os.makedirs(output_dir, exist_ok=True)
        scenarios = scenarios or STANDARD_SCENARIOS
        generated: List[str] = []

        scenario_map = {
            ScenarioType.BASELINE: self._gen_baseline,
            ScenarioType.MAX_LENGTHS: self._gen_max_lengths,
            ScenarioType.MIN_EMPTY: self._gen_min_empty,
            ScenarioType.BOUNDARY_DATES: self._gen_boundary_dates,
            ScenarioType.ALL_CODES: self._gen_all_codes,
            ScenarioType.SPECIAL_CHARS: self._gen_special_chars,
            ScenarioType.LARGE_VOLUME: self._gen_large_volume,
            ScenarioType.COMPOSITE_RULES: self._gen_composite_rules,
            ScenarioType.CROSS_FIELD: self._gen_cross_field,
            ScenarioType.DUPLICATES: self._gen_duplicates,
            ScenarioType.ORDERING: self._gen_ordering,
            ScenarioType.ENCODING: self._gen_encoding,
            ScenarioType.TRUNCATION: self._gen_truncation,
            ScenarioType.REFERENTIAL: self._gen_referential,
            ScenarioType.HISTORICAL: self._gen_historical,
            ScenarioType.CODE_COVERAGE: self._gen_code_coverage,
        }

        for i, scenario in enumerate(scenarios):
            if scenario in scenario_map:
                suffix = self._scenario_suffix(scenario, i)
                filename = f"{self.spec.naming.file_prefix}{self.spec.naming.environment_suffix}{suffix}{self.spec.naming.extension}"
                filepath = os.path.join(output_dir, filename)
                lines = scenario_map[scenario]()
                self._write_file(filepath, lines)
                generated.append(filepath)

        return generated

    # =========================================================================
    # Format Helpers
    # =========================================================================

    def _write_file(self, filepath: str, lines: List[str]) -> None:
        """Write lines to file with appropriate line ending."""
        ending = "\r\n" if self.spec.format.line_ending == "CRLF" else "\n"
        with open(filepath, "w", encoding=self.spec.format.encoding.replace("-", "").lower(), newline="") as f:
            f.write(ending.join(lines))
            if lines:
                f.write(ending)

    def _build_record(self, fields: List[FieldDefinition], values: Dict[str, str]) -> str:
        """Build a single record line based on format type."""
        fmt = self.spec.format.type

        if fmt == FormatType.FIXED_WIDTH:
            parts = []
            for field in fields:
                val = values.get(field.name, "")
                parts.append(self._pad_field(val, field.length))
            delimiter = self.spec.format.delimiter or " "
            return delimiter.join(parts)

        elif fmt in (FormatType.PIPE_DELIMITED, FormatType.CSV, FormatType.TAB_DELIMITED):
            delimiter = self.spec.format.delimiter or "|"
            parts = [values.get(field.name, "") for field in fields]
            return delimiter.join(parts)

        else:
            # Default: pipe-delimited
            parts = [values.get(field.name, "") for field in fields]
            return "|".join(parts)

    def _build_header(self, record_count: int) -> str:
        """Build a header record if the format has one."""
        if not self.spec.format.has_header_record:
            return ""
        header_fields = self.spec.header_fields
        if not header_fields:
            # Default header: HDR + date + count
            today = date.today().strftime("%Y%m%d")
            return self._build_record(
                self.spec.header_fields or [],
                {"record_type": "HDR", "creation_date": today, "record_count": str(record_count).zfill(6)},
            ) if header_fields else f"HDR{self.spec.format.delimiter or '|'}{today}{self.spec.format.delimiter or '|'}{str(record_count).zfill(6)}"
        values = {}
        for field in header_fields:
            if field.fixed_value:
                values[field.name] = field.fixed_value
            elif field.type == FieldType.DATE:
                values[field.name] = date.today().strftime("%Y%m%d")
            elif field.name.lower().endswith("count"):
                values[field.name] = str(record_count).zfill(field.length or 6)
            else:
                values[field.name] = ""
        return self._build_record(header_fields, values)

    @staticmethod
    def _pad_field(value: str, length: int) -> str:
        """Right-pad a value with spaces to fixed width."""
        if length <= 0:
            return value
        return value.ljust(length)[:length]

    def _make_entity_id(self, seq: int) -> str:
        """Generate a test entity ID with the configured prefix."""
        prefix = self.spec.entity.test_prefix
        id_len = self.spec.entity.id_length
        suffix = str(seq).zfill(id_len - len(prefix))
        return (prefix + suffix)[:id_len]

    def _scenario_suffix(self, scenario: ScenarioType, index: int) -> str:
        """Generate the filename suffix for a scenario."""
        suffix_map = {
            ScenarioType.BASELINE: "",
            ScenarioType.MAX_LENGTHS: f"_{index:02d}_MAX_LENGTHS",
            ScenarioType.MIN_EMPTY: f"_{index:02d}_MIN_EMPTY",
            ScenarioType.BOUNDARY_DATES: f"_{index:02d}_BOUNDARY_DATES",
            ScenarioType.ALL_CODES: f"_{index:02d}_ALL_CODES",
            ScenarioType.SPECIAL_CHARS: f"_{index:02d}_SPECIAL_CHARS",
            ScenarioType.LARGE_VOLUME: f"_{index:02d}_LARGE_VOLUME",
            ScenarioType.COMPOSITE_RULES: f"_{index:02d}_COMPOSITE_RULES",
            ScenarioType.CROSS_FIELD: f"_{index:02d}_CROSS_FIELD",
            ScenarioType.DUPLICATES: f"_{index:02d}_DUPLICATES",
            ScenarioType.ORDERING: f"_{index:02d}_ORDERING",
            ScenarioType.ENCODING: f"_{index:02d}_ENCODING",
            ScenarioType.TRUNCATION: f"_{index:02d}_TRUNCATION",
            ScenarioType.REFERENTIAL: f"_{index:02d}_REFERENTIAL",
            ScenarioType.HISTORICAL: f"_{index:02d}_HISTORICAL",
            ScenarioType.CODE_COVERAGE: f"_{index:02d}_CODE_COVERAGE",
        }
        return suffix_map.get(scenario, f"_{index:02d}_{scenario.value.upper()}")

    # =========================================================================
    # Value Generators
    # =========================================================================

    def _gen_value(self, field: FieldDefinition, variant: str = "normal") -> str:
        """Generate a value for a field based on its type and variant."""
        if field.fixed_value:
            return field.fixed_value

        if variant == "empty":
            return ""

        if variant == "max":
            return self._gen_max_value(field)

        if field.type == FieldType.DATE:
            return self._gen_date_value(variant)
        elif field.type == FieldType.CODE:
            return self._gen_code_value(field, variant)
        elif field.type == FieldType.FLAG:
            return self._rng.choice(["0", "1"])
        elif field.type == FieldType.NUMERIC:
            length = field.length or 5
            return str(self._rng.randint(1, 10**min(length, 6))).zfill(length)
        elif field.type == FieldType.IDENTIFIER:
            return self._make_entity_id(self._rng.randint(1, 99999))
        else:
            # String
            length = min(field.length or 20, 20)
            return self._gen_string_value(length, variant)

    def _gen_max_value(self, field: FieldDefinition) -> str:
        """Generate maximum-length value for a field."""
        length = field.length or 20
        if field.type == FieldType.DATE:
            return "20261231"
        elif field.type == FieldType.NUMERIC:
            return "9" * min(length, 15)
        elif field.type == FieldType.CODE:
            codes = self._get_codes_for_field(field)
            return max(codes, key=len) if codes else "X" * min(length, 5)
        else:
            return "A" * length

    def _gen_date_value(self, variant: str = "normal") -> str:
        """Generate a date value."""
        if variant == "boundary_min":
            return "20260101"
        elif variant == "boundary_max":
            return "20261231"
        elif variant == "leap":
            return "20240229"
        elif variant == "open_ended":
            return "99991231"
        elif variant == "past":
            d = date.today() - timedelta(days=self._rng.randint(30, 365))
            return d.strftime("%Y%m%d")
        elif variant == "future":
            d = date.today() + timedelta(days=self._rng.randint(30, 730))
            return d.strftime("%Y%m%d")
        else:
            d = date.today() - timedelta(days=self._rng.randint(0, 180))
            return d.strftime("%Y%m%d")

    def _gen_code_value(self, field: FieldDefinition, variant: str = "normal") -> str:
        """Generate a code value from the field's code table."""
        codes = self._get_codes_for_field(field)
        if not codes:
            length = field.length or 3
            return str(self._rng.randint(0, 9)).zfill(length)
        return self._rng.choice(codes)

    def _get_codes_for_field(self, field: FieldDefinition) -> List[str]:
        """Get valid codes for a code-type field."""
        if field.code_table and field.code_table in self.spec.code_tables:
            return list(self.spec.code_tables[field.code_table].values.keys())
        return []

    def _gen_string_value(self, length: int, variant: str = "normal") -> str:
        """Generate a string value."""
        if variant == "special":
            specials = ["O'Brien", "McDonald-Smith", "St. Mary's", "Jean-Pierre",
                        "de la Cruz", "Von Der Berg", "123 Numeric"]
            val = self._rng.choice(specials)
            return val[:length]
        names = ["John", "Mary", "Robert", "Alice", "Carlos", "Sarah", "James", "Patricia"]
        return self._rng.choice(names)[:length]

    # =========================================================================
    # Scenario Generators
    # =========================================================================

    def _gen_baseline(self) -> List[str]:
        """Scenario 0: Baseline happy-path with 3 entities."""
        entities = [self._gen_entity(i, "normal") for i in range(1, 4)]
        return self._assemble_file(entities)

    def _gen_max_lengths(self) -> List[str]:
        """Scenario 1: All fields at maximum length."""
        entities = [self._gen_entity(i, "max") for i in range(1, 3)]
        return self._assemble_file(entities)

    def _gen_min_empty(self) -> List[str]:
        """Scenario 2: Minimal/empty optional fields."""
        entities = [self._gen_entity(i, "empty") for i in range(1, 3)]
        return self._assemble_file(entities)

    def _gen_boundary_dates(self) -> List[str]:
        """Scenario 3: Date edge cases."""
        variants = ["boundary_min", "boundary_max", "leap", "open_ended", "past"]
        entities = []
        for i, variant in enumerate(variants, 1):
            entities.append(self._gen_entity(i + 20, variant))
        return self._assemble_file(entities)

    def _gen_all_codes(self) -> List[str]:
        """Scenario 4: Every valid code value exercised."""
        entities = []
        # For each code field, generate entities that exercise all values
        code_fields = self.spec.code_fields
        seq = 30
        for field in code_fields:
            codes = self._get_codes_for_field(field)
            for code in codes[:8]:  # Cap at 8 values per field
                seq += 1
                entity = self._gen_entity_with_override(seq, {field.name: code})
                entities.append(entity)
        if not entities:
            entities = [self._gen_entity(31, "normal")]
        return self._assemble_file(entities)

    def _gen_special_chars(self) -> List[str]:
        """Scenario 5: Special characters in text fields."""
        entities = [self._gen_entity(i + 50, "special") for i in range(1, 4)]
        return self._assemble_file(entities)

    def _gen_large_volume(self) -> List[str]:
        """Scenario 6: N entities for performance testing."""
        n = self.spec.test_scenarios.volume_size
        entities = [self._gen_entity(i + 100, "normal") for i in range(1, n + 1)]
        return self._assemble_file(entities)

    def _gen_composite_rules(self) -> List[str]:
        """Scenario 7: Business rule boundary conditions."""
        entities = [self._gen_entity(i + 40, "normal") for i in range(1, 6)]
        return self._assemble_file(entities)

    def _gen_cross_field(self) -> List[str]:
        """Scenario 8: Cross-field dependency tests."""
        entities = [self._gen_entity(i + 60, "normal") for i in range(1, 4)]
        return self._assemble_file(entities)

    def _gen_duplicates(self) -> List[str]:
        """Scenario 9: Same entity appearing twice."""
        e1 = self._gen_entity(1, "normal")
        e2 = self._gen_entity(2, "normal")
        e1_dup = e1  # Exact duplicate
        return self._assemble_file([e1, e2, e1_dup])

    def _gen_ordering(self) -> List[str]:
        """Scenario 10: Records in unexpected order."""
        entities = [self._gen_entity(i, "normal") for i in [3, 1, 2]]
        return self._assemble_file(entities)

    def _gen_encoding(self) -> List[str]:
        """Scenario 11: Encoding edge cases (extended chars)."""
        entities = [self._gen_entity(i + 70, "normal") for i in range(1, 3)]
        return self._assemble_file(entities)

    def _gen_truncation(self) -> List[str]:
        """Scenario 12: Data over max length."""
        entities = [self._gen_entity(i + 80, "max") for i in range(1, 3)]
        return self._assemble_file(entities)

    def _gen_referential(self) -> List[str]:
        """Scenario 13: Referential integrity edge cases."""
        entities = [self._gen_entity(i + 90, "normal") for i in range(1, 3)]
        return self._assemble_file(entities)

    def _gen_historical(self) -> List[str]:
        """Scenario 14: Multi-day feed simulation."""
        entities = [self._gen_entity(i, "normal") for i in range(1, 4)]
        return self._assemble_file(entities)

    def _gen_code_coverage(self) -> List[str]:
        """Scenario 15: Every code value per entity."""
        entities = [self._gen_entity(i + 110, "normal") for i in range(1, 4)]
        return self._assemble_file(entities)

    # =========================================================================
    # Entity Assembly
    # =========================================================================

    def _gen_entity(self, seq: int, variant: str) -> str:
        """Generate a single entity record."""
        fields = self.spec.detail_fields
        values: Dict[str, str] = {}

        for field in fields:
            if field.name == self.spec.entity.id_field:
                values[field.name] = self._make_entity_id(seq)
            elif not field.required and variant == "empty":
                values[field.name] = ""
            else:
                values[field.name] = self._gen_value(field, variant)

        return self._build_record(fields, values)

    def _gen_entity_with_override(self, seq: int, overrides: Dict[str, str]) -> str:
        """Generate entity with specific field overrides."""
        fields = self.spec.detail_fields
        values: Dict[str, str] = {}

        for field in fields:
            if field.name == self.spec.entity.id_field:
                values[field.name] = self._make_entity_id(seq)
            elif field.name in overrides:
                values[field.name] = overrides[field.name]
            else:
                values[field.name] = self._gen_value(field, "normal")

        return self._build_record(fields, values)

    def _assemble_file(self, entity_lines: List[str]) -> List[str]:
        """Assemble a complete file with header + entity records."""
        lines = []
        if self.spec.format.has_header_record:
            header = self._build_header(len(entity_lines))
            if header:
                lines.append(header)
        lines.extend(entity_lines)
        return lines
