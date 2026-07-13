"""
ICD-D12 Interface Plugin implementation.

Provides metadata and factory methods for the FSIA File interface.
"""
from typing import List, Dict, Optional, Any

from src.interfaces.base import (
    InterfacePlugin,
    BaseParser,
    BaseExpectedStateGenerator,
    BaseComparator,
    BaseParsedFile,
)
from src.interfaces.icd_d12.vocab_config import VOCAB_LOOKUP_KEYS


class IcdD12Plugin(InterfacePlugin):
    """ICD-D12: FSIA (Functional Screen / Initial Assessment) File interface plugin."""

    # Default — overridden at runtime from settings (D12_CUSTOM_FORM_DEFINITION_KEY env var)
    CUSTOM_FORM_DEFINITION_KEY_DEFAULT = "964B0DFB-ED99-4F5A-8449-B43C013B9062"
    CUSTOM_FORM_DEFINITION_VERSION = 55

    @property
    def custom_form_definition_key(self) -> str:
        """Read from settings (env/config) so it can be changed without redeployment."""
        from src.core.config import settings
        return settings.D12_CUSTOM_FORM_DEFINITION_KEY

    # Keep class-level constant for backward compatibility (tests, etc.)
    @property
    def CUSTOM_FORM_DEFINITION_KEY(self) -> str:
        return self.custom_form_definition_key

    @property
    def interface_type(self) -> str:
        return "icd_d12"

    @property
    def display_name(self) -> str:
        return "ICD-D12: FSIA Adult Functional Screen File"

    @property
    def file_extensions(self) -> List[str]:
        return [".txt"]

    @property
    def entity_id_field_name(self) -> str:
        return "MedicaidId"

    @property
    def default_stages(self) -> List[int]:
        """D12 skips Stage 3 — data flows from Stage 2 directly to Stage 4 (CustomFormModule in Carity DB)."""
        return [1, 2, 4]

    @property
    def description(self) -> str:
        return (
            "Wisconsin DHS FSIA Adult Functional Screen Assessment file. "
            "Fixed-width space-delimited format with HDR header record and DTL detail records. "
            "Contains ADL/IADL assessments, health service needs, behaviors, cognition, "
            "and eligibility data for LTC members."
        )

    @property
    def vocab_lookup_keys(self) -> Dict[str, str]:
        return VOCAB_LOOKUP_KEYS

    def create_parser(self) -> BaseParser:
        from src.interfaces.icd_d12.parser import IcdD12Parser
        return IcdD12Parser()

    def create_expected_state_generator(
        self, parsed_file: BaseParsedFile, vocab_client: Optional[Any] = None
    ) -> BaseExpectedStateGenerator:
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        return IcdD12ExpectedStateGenerator(parsed_file, vocab_client, custom_form_definition_key=self.CUSTOM_FORM_DEFINITION_KEY)

    def create_comparator(self, entity_id_prefix: str) -> BaseComparator:
        from src.interfaces.icd_d12.comparator import IcdD12Comparator
        return IcdD12Comparator(entity_id_prefix, custom_form_definition_key=self.CUSTOM_FORM_DEFINITION_KEY)

    @property
    def pipeline_cleanup_config(self):
        """ICD-D12 Stages 1-2 cleanup targets in Interface DB."""
        return [
            # Stage 1: Raw lines
            {"schema": "CustomerInterfaceModule", "table": "LongTermCareFunctionalScreenFormRaw", "filter_column": "MedicaidId"},
            # Stage 2: Parsed detail records
            {"schema": "CustomerInterfaceModule", "table": "LongTermCareFunctionalScreenForm", "filter_column": "MemberId"},
        ]

    @property
    def carity_cleanup_config(self):
        """ICD-D12 Stage 4 (Carity DB) cleanup targets — CustomFormModule tables."""
        return [
            # Children first
            {"schema": "CustomFormModule", "table": "SimpleSingleSelectFieldAnswer", "filter_column": "FieldAnswerBaseKey"},
            {"schema": "CustomFormModule", "table": "SimpleMultiSelectFieldAnswerAnswers", "filter_column": "SimpleMultiSelectFieldAnswerKey"},
            {"schema": "CustomFormModule", "table": "DateFieldAnswer", "filter_column": "FieldAnswerBaseKey"},
            {"schema": "CustomFormModule", "table": "FieldAnswerBase", "filter_column": "CustomFormInstanceKey"},
            {"schema": "CustomFormModule", "table": "CaseCustomFormInstance", "filter_column": "CustomFormInstanceKey"},
            # Parent last
            {"schema": "CustomFormModule", "table": "CustomFormInstance", "filter_column": "CustomFormInstanceKey"},
        ]
