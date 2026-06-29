"""
Base classes for the interface plugin system.

Every file type (ICD-D06, ICD-D07, etc.) implements these abstract classes
to plug into the framework's parsing, expected state generation, comparison,
and reporting pipeline.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

from src.core.models import ComparatorResult


# =============================================================================
# Base Parsed File
# =============================================================================

@dataclass
class BaseParsedFile(ABC):
    """
    Minimal parsed file representation.

    Plugins extend this with their own typed fields (e.g., providers dict,
    header record, etc.). The framework only needs the generic properties
    defined here.
    """
    filename: str
    source_lines: List[Any] = field(default_factory=list)

    @property
    @abstractmethod
    def record_count(self) -> int:
        """Total number of data records (excluding headers/trailers)."""
        ...

    @property
    @abstractmethod
    def entity_count(self) -> int:
        """Number of distinct entities (providers, members, etc.)."""
        ...

    @property
    @abstractmethod
    def entity_ids(self) -> List[str]:
        """List of distinct entity identifiers found in the file."""
        ...


# =============================================================================
# Base Parser
# =============================================================================

class BaseParser(ABC):
    """
    Abstract file parser.

    Each interface plugin implements this to parse its specific file format
    (PSV, CSV, fixed-width, XML) into a typed ParsedFile.
    """

    @abstractmethod
    def parse_file(self, filepath: str) -> BaseParsedFile:
        """Parse a file from the local filesystem."""
        ...

    @abstractmethod
    def parse_content(self, content: str, filename: str = "unknown") -> BaseParsedFile:
        """Parse file content from a string (e.g., downloaded from S3)."""
        ...


# =============================================================================
# Base Expected State Generator
# =============================================================================

class BaseExpectedStateGenerator(ABC):
    """
    Abstract expected state generator.

    Given a parsed file, generates what the database SHOULD contain at each
    pipeline stage. Each interface plugin implements the transformation logic
    specific to its file type.
    """

    @abstractmethod
    def generate_stage1(self) -> List[Dict[str, Any]]:
        """Generate expected state for Stage 1 (Raw)."""
        ...

    @abstractmethod
    def generate_stage2(self) -> List[Dict[str, Any]]:
        """Generate expected state for Stage 2 (Parsed)."""
        ...

    @abstractmethod
    def generate_stage3(self) -> List[Dict[str, Any]]:
        """Generate expected state for Stage 3 (Incoming/Transformed)."""
        ...

    @abstractmethod
    def generate_stage4(self) -> List[Dict[str, Any]]:
        """Generate expected state for Stage 4 (Final)."""
        ...


# =============================================================================
# Base Comparator
# =============================================================================

class BaseComparator(ABC):
    """
    Abstract database comparator.

    Queries actual state from each pipeline stage and compares against
    expected state. Produces ComparatorResult with mismatch records.
    """

    @abstractmethod
    def compare_stage1(self, expected_rows: List[Dict[str, Any]]) -> ComparatorResult:
        """Compare expected vs actual for Stage 1 (Raw)."""
        ...

    @abstractmethod
    def compare_stage2(self, expected_rows: List[Dict[str, Any]]) -> ComparatorResult:
        """Compare expected vs actual for Stage 2 (Parsed)."""
        ...

    @abstractmethod
    def compare_stage3(self, expected_rows: List[Dict[str, Any]]) -> ComparatorResult:
        """Compare expected vs actual for Stage 3 (Incoming)."""
        ...

    @abstractmethod
    def compare_stage4(self, expected_rows: List[Dict[str, Any]]) -> ComparatorResult:
        """Compare expected vs actual for Stage 4 (Final)."""
        ...


# =============================================================================
# Interface Plugin
# =============================================================================

class InterfacePlugin(ABC):
    """
    Main plugin class that each interface type implements.

    Provides metadata about the file type and factory methods to create
    the parser, expected state generator, and comparator instances.
    """

    @property
    @abstractmethod
    def interface_type(self) -> str:
        """Unique identifier code, e.g., 'icd_d06'."""
        ...

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable name, e.g., 'ICD-D06: Medicaid Provider File'."""
        ...

    @property
    @abstractmethod
    def file_extensions(self) -> List[str]:
        """Supported file extensions, e.g., ['.psv']."""
        ...

    @property
    @abstractmethod
    def entity_id_field_name(self) -> str:
        """
        The field name that uniquely identifies an entity in this interface.
        E.g., 'MedicaidProviderNumber' for ICD-D06, 'McoId' for waiver members.
        """
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """Short description of the interface."""
        ...

    @property
    @abstractmethod
    def vocab_lookup_keys(self) -> Dict[str, str]:
        """
        Vocabulary lookup key mappings specific to this interface.
        Keys are logical names (e.g., 'address_type'), values are
        the dotted lookup definitions used by VocabClient.
        """
        ...

    @abstractmethod
    def create_parser(self) -> BaseParser:
        """Create a parser instance for this interface's file format."""
        ...

    @abstractmethod
    def create_expected_state_generator(
        self, parsed_file: BaseParsedFile, vocab_client: Optional[Any] = None
    ) -> BaseExpectedStateGenerator:
        """
        Create an expected state generator for this interface.

        Args:
            parsed_file: The parsed file to generate expected state from.
            vocab_client: Optional VocabClient instance for vocabulary lookups.
        """
        ...

    @abstractmethod
    def create_comparator(self, entity_id_prefix: str) -> BaseComparator:
        """
        Create a comparator instance for this interface.

        Args:
            entity_id_prefix: The prefix used to isolate test data in the database.
        """
        ...

    @property
    @abstractmethod
    def pipeline_cleanup_config(self) -> List[Dict[str, str]]:
        """
        Ordered list of cleanup targets for Stages 1-3 (Interface DB).

        Each entry is a dict with:
        - Direct filter: {"schema", "table", "filter_column"}
        - FK-child: {"schema", "table", "parent_schema", "parent_table", "fk_column", "parent_filter_column"}

        Order matters: children must come before their parents.
        """
        ...

    @property
    def default_stages(self) -> List[int]:
        """
        Default pipeline stages to run for this interface when none are explicitly specified.

        Override in plugins that skip certain stages. For example, ICD-D12 skips stage 3
        because data flows directly from stage 2 to stage 4 (CustomFormModule in Carity DB).

        Default: [1, 2, 3, 4]
        """
        return [1, 2, 3, 4]

    @property
    @abstractmethod
    def carity_cleanup_config(self) -> List[Dict[str, str]]:
        """
        Ordered list of cleanup targets for Stage 4 (Carity DB).

        Same format as pipeline_cleanup_config.
        Order matters: children must come before their parents.
        """
        ...

    def cleanup_pipeline_data(self, entity_id_prefix: str) -> int:
        """
        Execute pipeline cleanup using the metadata from pipeline_cleanup_config.
        Generic implementation — plugins only need to provide the config property.
        """
        from src.core.database import db, DatabaseManager
        return self._execute_cleanup(db, DatabaseManager.INTERFACE, entity_id_prefix, self.pipeline_cleanup_config)

    def cleanup_carity_data(self, entity_id_prefix: str) -> int:
        """
        Execute Carity cleanup using the metadata from carity_cleanup_config.
        Generic implementation — plugins only need to provide the config property.
        """
        from src.core.database import db, DatabaseManager
        return self._execute_cleanup(db, DatabaseManager.CARITY, entity_id_prefix, self.carity_cleanup_config)

    @staticmethod
    def _execute_cleanup(db, target: str, entity_id_prefix: str, config: List[Dict[str, str]]) -> int:
        """
        Execute an ordered list of DELETE operations based on cleanup config.

        Handles three patterns:
        1. Direct filter: DELETE FROM [schema].[table] WHERE [filter_column] LIKE @prefix%
        2. FK-child: DELETE child FROM [schema].[table] child
                     INNER JOIN [parent_schema].[parent_table] parent
                         ON child.[fk_column] = parent.[fk_column]
                     WHERE parent.[parent_filter_column] LIKE @prefix%
           Optionally with parent_lookup_table/parent_lookup_filter_column for when
           parent_filter_column is a GUID that needs to be resolved through a lookup table.
        3. Lookup filter: DELETE target FROM [schema].[table] target
                          INNER JOIN [lookup_schema].[lookup_table] lookup
                              ON target.[filter_column] = lookup.[filter_column]
                          WHERE lookup.[lookup_filter_column] LIKE @prefix%
           (Used when the target table's key is a GUID and the identifier is in a separate table)
        """
        total = 0
        prefix_pattern = f"{entity_id_prefix}%"

        for entry in config:
            schema = entry["schema"]
            table = entry["table"]

            try:
                if "parent_table" in entry:
                    # FK-child: delete via JOIN to parent
                    parent_schema = entry["parent_schema"]
                    parent_table = entry["parent_table"]
                    fk_column = entry["fk_column"]
                    parent_filter = entry["parent_filter_column"]

                    if "parent_lookup_table" in entry:
                        # Parent's filter column is a GUID — need to join through a lookup table
                        plookup_schema = entry.get("parent_lookup_schema", parent_schema)
                        plookup_table = entry["parent_lookup_table"]
                        plookup_filter = entry["parent_lookup_filter_column"]

                        sql = (
                            f"DELETE child FROM [{schema}].[{table}] child "
                            f"INNER JOIN [{parent_schema}].[{parent_table}] parent "
                            f"ON child.[{fk_column}] = parent.[{fk_column}] "
                            f"INNER JOIN [{plookup_schema}].[{plookup_table}] lookup "
                            f"ON parent.[{parent_filter}] = lookup.[{parent_filter}] "
                            f"WHERE lookup.[{plookup_filter}] LIKE ?"
                        )
                    else:
                        sql = (
                            f"DELETE child FROM [{schema}].[{table}] child "
                            f"INNER JOIN [{parent_schema}].[{parent_table}] parent "
                            f"ON child.[{fk_column}] = parent.[{fk_column}] "
                            f"WHERE parent.[{parent_filter}] LIKE ?"
                        )
                    total += db.execute_non_query(target, sql, (prefix_pattern,))
                elif "lookup_table" in entry:
                    # Lookup filter: delete via JOIN to a lookup/identifiers table
                    lookup_schema = entry.get("lookup_schema", schema)
                    lookup_table = entry["lookup_table"]
                    join_column = entry["filter_column"]
                    lookup_filter = entry["lookup_filter_column"]

                    sql = (
                        f"DELETE target FROM [{schema}].[{table}] target "
                        f"INNER JOIN [{lookup_schema}].[{lookup_table}] lookup "
                        f"ON target.[{join_column}] = lookup.[{join_column}] "
                        f"WHERE lookup.[{lookup_filter}] LIKE ?"
                    )
                    total += db.execute_non_query(target, sql, (prefix_pattern,))
                else:
                    # Direct filter
                    filter_column = entry["filter_column"]
                    sql = f"DELETE FROM [{schema}].[{table}] WHERE [{filter_column}] LIKE ?"
                    total += db.execute_non_query(target, sql, (prefix_pattern,))
            except Exception:
                # Table may not exist in this environment — skip gracefully
                pass

        return total
