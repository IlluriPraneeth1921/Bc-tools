"""
Core Pydantic models for the Test Data Generator.

These models define the intermediate representation (YAML schema)
that all spec parsers normalize into, and all generators consume.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# =============================================================================
# Enumerations
# =============================================================================

class FormatType(str, Enum):
    """Supported file format types."""
    PIPE_DELIMITED = "pipe-delimited"
    FIXED_WIDTH = "fixed-width"
    CSV = "csv"
    TAB_DELIMITED = "tab-delimited"
    XML = "xml"
    CUSTOM = "custom"


class FieldType(str, Enum):
    """Field data types."""
    STRING = "string"
    NUMERIC = "numeric"
    DATE = "date"
    CODE = "code"
    FLAG = "flag"
    IDENTIFIER = "identifier"


class Confidence(str, Enum):
    """Parsing confidence level for extracted fields."""
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ScenarioType(str, Enum):
    """All available test scenario types."""
    # Standard (always available)
    BASELINE = "baseline"
    MAX_LENGTHS = "max_lengths"
    MIN_EMPTY = "min_empty"
    BOUNDARY_DATES = "boundary_dates"
    ALL_CODES = "all_codes"
    SPECIAL_CHARS = "special_chars"
    LARGE_VOLUME = "large_volume"
    COMPOSITE_RULES = "composite_rules"
    # Extended (user-selectable)
    CROSS_FIELD = "cross_field"
    DUPLICATES = "duplicates"
    ORDERING = "ordering"
    ENCODING = "encoding"
    TRUNCATION = "truncation"
    REFERENTIAL = "referential"
    HISTORICAL = "historical"
    CODE_COVERAGE = "code_coverage"


STANDARD_SCENARIOS = [
    ScenarioType.BASELINE,
    ScenarioType.MAX_LENGTHS,
    ScenarioType.MIN_EMPTY,
    ScenarioType.BOUNDARY_DATES,
    ScenarioType.ALL_CODES,
    ScenarioType.SPECIAL_CHARS,
    ScenarioType.LARGE_VOLUME,
    ScenarioType.COMPOSITE_RULES,
]

EXTENDED_SCENARIOS = [
    ScenarioType.CROSS_FIELD,
    ScenarioType.DUPLICATES,
    ScenarioType.ORDERING,
    ScenarioType.ENCODING,
    ScenarioType.TRUNCATION,
    ScenarioType.REFERENTIAL,
    ScenarioType.HISTORICAL,
    ScenarioType.CODE_COVERAGE,
]

ALL_SCENARIOS = STANDARD_SCENARIOS + EXTENDED_SCENARIOS


# =============================================================================
# Spec Meta
# =============================================================================

class SpecMeta(BaseModel):
    """Top-level metadata about the interface."""
    interface_type: str = Field(..., description="Unique code (e.g., 'icd_d07')")
    display_name: str = Field(..., description="Human-readable name")
    description: str = Field(default="", description="Short description")
    version: str = Field(default="1.0")
    source_system: str = Field(default="MMIS")
    file_extension: str = Field(default=".psv")


# =============================================================================
# Format Definition
# =============================================================================

class FormatDefinition(BaseModel):
    """How the file is structured."""
    type: FormatType = Field(default=FormatType.PIPE_DELIMITED)
    delimiter: Optional[str] = Field(default="|", description="Delimiter character")
    has_header_record: bool = Field(default=True)
    has_trailer_record: bool = Field(default=False)
    line_ending: str = Field(default="CRLF")
    encoding: str = Field(default="UTF-8")
    quote_char: Optional[str] = Field(default=None)


# =============================================================================
# Entity Definition
# =============================================================================

class EntityDefinition(BaseModel):
    """The primary entity tracked in this interface."""
    id_field: str = Field(..., description="Field name that is the entity identifier")
    id_length: int = Field(default=15)
    test_prefix: str = Field(default="000000000")
    id_description: str = Field(default="Entity Identifier")


# =============================================================================
# Record Type
# =============================================================================

class RecordTypeDefinition(BaseModel):
    """A record type within the file."""
    code: str = Field(..., description="Record type code (e.g., '01', 'HDR', 'DTL')")
    name: str = Field(..., description="Human-readable name")
    min_occurrence: int = Field(default=1)
    max_occurrence: str = Field(default="unlimited", description="Number or 'unlimited'")
    per_entity: bool = Field(default=True, description="Is this per-entity or per-file?")
    position: Optional[str] = Field(default=None, description="e.g., 'first_line', 'body'")


# =============================================================================
# Field Definition
# =============================================================================

class FieldDefinition(BaseModel):
    """A single field in a record."""
    name: str = Field(..., description="Field name (snake_case)")
    length: int = Field(default=0, description="Max length (0 = variable)")
    type: FieldType = Field(default=FieldType.STRING)
    required: bool = Field(default=False)
    description: str = Field(default="")
    format: Optional[str] = Field(default=None, description="e.g., 'YYYYMMDD' for dates")
    code_table: Optional[str] = Field(default=None, description="Reference to code_tables key")
    fixed_value: Optional[str] = Field(default=None, description="Constant value for this field")
    zero_padded: bool = Field(default=False)
    special_chars_allowed: bool = Field(default=True)
    position: Optional[int] = Field(default=None, description="Start position (fixed-width)")
    db_column: Optional[str] = Field(default=None, description="PascalCase DB column name")
    confidence: Confidence = Field(default=Confidence.HIGH)

    @property
    def pascal_name(self) -> str:
        """Convert snake_case field name to PascalCase."""
        if self.db_column:
            return self.db_column
        return "".join(word.capitalize() for word in self.name.split("_"))


# =============================================================================
# Code Table
# =============================================================================

class CodeTableEntry(BaseModel):
    """A single entry in a code table."""
    code: str
    description: str = ""


class CodeTable(BaseModel):
    """A lookup/enumeration table."""
    name: str = Field(..., description="Code table identifier")
    description: str = Field(default="")
    values: Dict[str, str] = Field(default_factory=dict, description="code → description")


# =============================================================================
# Business Rule
# =============================================================================

class BusinessRule(BaseModel):
    """A business rule that affects data transformation."""
    id: str = Field(..., description="Rule ID (e.g., 'BR-D07-001')")
    description: str = Field(default="")
    affects_fields: List[str] = Field(default_factory=list)
    logic: str = Field(default="", description="Human-readable rule logic")
    type: str = Field(default="transformation", description="transformation|vocab_lookup|filter|composite")


# =============================================================================
# Cross-Field Dependency
# =============================================================================

class CrossFieldDependency(BaseModel):
    """A dependency between fields."""
    condition: str = Field(..., description="Human-readable condition")
    fields: List[str] = Field(default_factory=list)


# =============================================================================
# DB Target
# =============================================================================

class ColumnMapping(BaseModel):
    """Maps a source field to a DB column."""
    source_field: str
    db_column: str


class TableTarget(BaseModel):
    """A target table in a pipeline stage."""
    name: str = Field(..., description="Table name")
    record_type: Optional[str] = Field(default=None)
    columns: Dict[str, str] = Field(default_factory=dict, description="field_name → DBColumnName")
    filter_column: Optional[str] = Field(default=None, description="Column used for data isolation")


class StageTarget(BaseModel):
    """Database target for a single pipeline stage."""
    database: str = Field(default="WiDHS.Qc.Interface.Carity.ToolTesting")
    db_schema: str = Field(default="CustomerInterfaceModule", alias="schema")
    tables: List[TableTarget] = Field(default_factory=list)
    mapping: str = Field(default="one_row_per_record", description="one_row_per_line|one_row_per_record|eav")

    class Config:
        populate_by_name = True


class DbTargets(BaseModel):
    """Database targets for all 4 pipeline stages."""
    stage1: StageTarget = Field(default_factory=StageTarget)
    stage2: StageTarget = Field(default_factory=StageTarget)
    stage3: StageTarget = Field(default_factory=StageTarget)
    stage4: StageTarget = Field(default_factory=StageTarget)


# =============================================================================
# Naming Convention
# =============================================================================

class NamingConvention(BaseModel):
    """File naming pattern for generated test files."""
    file_prefix: str = Field(default="TEST_FILE_EXTRACT")
    environment_suffix: str = Field(default="_T")
    extension: str = Field(default=".psv")


# =============================================================================
# Mutation Definition (interface-specific)
# =============================================================================

class MutationScenario(BaseModel):
    """A mutation/update scenario specific to this interface."""
    code: str = Field(..., description="Short code (e.g., 'UPD01')")
    name: str = Field(..., description="e.g., 'ADDRESS_CHANGES'")
    description: str = Field(default="")
    fields_affected: List[str] = Field(default_factory=list)


class DeletionScenario(BaseModel):
    """A deletion/removal scenario specific to this interface."""
    code: str = Field(..., description="Short code (e.g., 'DEL01')")
    name: str = Field(..., description="e.g., 'MEMBER_REMOVED'")
    description: str = Field(default="")


# =============================================================================
# Test Scenario Configuration
# =============================================================================

class TestScenarioConfig(BaseModel):
    """Configuration for test scenario generation."""
    standard: List[ScenarioType] = Field(default_factory=lambda: list(STANDARD_SCENARIOS))
    extended: List[ScenarioType] = Field(default_factory=list)
    mutations: List[MutationScenario] = Field(default_factory=list)
    deletions: List[DeletionScenario] = Field(default_factory=list)
    volume_size: int = Field(default=50, description="Number of entities for large volume test")


# =============================================================================
# Complete Interface Specification
# =============================================================================

class InterfaceSpec(BaseModel):
    """
    Complete interface specification — the central model.
    
    This is the YAML schema. All parsers produce this, all generators consume it.
    """
    meta: SpecMeta
    format: FormatDefinition = Field(default_factory=FormatDefinition)
    entity: EntityDefinition
    record_types: List[RecordTypeDefinition] = Field(default_factory=list)
    fields: Dict[str, List[FieldDefinition]] = Field(
        default_factory=dict,
        description="Record type code → list of fields. Use 'header' and 'detail' for simple formats.",
    )
    code_tables: Dict[str, CodeTable] = Field(default_factory=dict)
    business_rules: List[BusinessRule] = Field(default_factory=list)
    cross_field_dependencies: List[CrossFieldDependency] = Field(default_factory=list)
    db_targets: DbTargets = Field(default_factory=DbTargets)
    naming: NamingConvention = Field(default_factory=NamingConvention)
    test_scenarios: TestScenarioConfig = Field(default_factory=TestScenarioConfig)

    @property
    def detail_fields(self) -> List[FieldDefinition]:
        """Get the primary detail/data fields.
        
        For simple formats: returns fields.get("detail") or fields.get("DTL").
        For multi-record-type formats: returns all fields from non-header record types.
        """
        # Try simple format first
        if "detail" in self.fields:
            return self.fields["detail"]
        if "DTL" in self.fields:
            return self.fields["DTL"]

        # Multi-record-type: collect all fields from all record types except header
        header_keys = {"header", "HDR", "00"}
        all_fields: List[FieldDefinition] = []
        for key, field_list in self.fields.items():
            if key not in header_keys:
                all_fields.extend(field_list)
        return all_fields

    @property
    def header_fields(self) -> List[FieldDefinition]:
        """Get header fields if any."""
        return self.fields.get("header", self.fields.get("HDR", self.fields.get("00", [])))

    @property
    def all_code_values(self) -> Dict[str, List[str]]:
        """Get all code values by table name."""
        return {name: list(table.values.keys()) for name, table in self.code_tables.items()}

    @property
    def date_fields(self) -> List[FieldDefinition]:
        """Get all date-type fields."""
        return [f for f in self.detail_fields if f.type == FieldType.DATE]

    @property
    def code_fields(self) -> List[FieldDefinition]:
        """Get all code-type fields."""
        return [f for f in self.detail_fields if f.type == FieldType.CODE]

    @property
    def required_fields(self) -> List[FieldDefinition]:
        """Get all required fields."""
        return [f for f in self.detail_fields if f.required]

    @property
    def entity_id_field(self) -> Optional[FieldDefinition]:
        """Get the entity ID field definition."""
        for f in self.detail_fields:
            if f.name == self.entity.id_field:
                return f
        return None
