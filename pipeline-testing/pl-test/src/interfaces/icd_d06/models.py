"""
Data models for all 15 record types in the Medicaid Provider File Extract (ICD-D06).
Each record type maps 1:1 to the fields defined in the file layout specification.
"""
from dataclasses import dataclass, field
from typing import Optional, List

from src.interfaces.base import BaseParsedFile


@dataclass
class SourceLine:
    """Represents a single line from the source .psv file with traceability metadata."""
    line_number: int
    raw_text: str
    record_type: str  # "00" through "14"


@dataclass
class RecordType00:
    """Extract File Information Record — 1 per file."""
    line_number: int
    record_type: str  # "00"
    extract_date: str  # YYYYMMDD
    extract_period_start_date: str  # YYYYMMDD
    extract_period_end_date: str  # YYYYMMDD
    number_of_records: str  # 12 chars
    number_of_providers: str  # 12 chars


@dataclass
class RecordType01:
    """Main Provider Information Record — 1 per provider."""
    line_number: int
    record_type: str  # "01"
    medicaid_provider_number: str  # 15 chars
    provider_full_name: str  # 50 chars
    provider_name_type: str  # 1 char (B or P)
    organization_type_code: str  # 1 char
    organization_type_description: str  # 25 chars
    medicare_part_a: str  # 1 char
    medicare_part_b: str  # 1 char
    location_status_indicator: str  # 1 char (I/O/Y/E)
    billing_indicator: str  # 1 char (Y/N/B/R)
    xml_indicator: str  # 1 char
    provider_directory_indicator: str  # 1 char
    medicaid_service_provider_count: str  # 5 chars
    medicaid_member_count: str  # 5 chars
    revalidation_date: str  # 8 chars YYYYMMDD
    ltc_delegate_action_indicator: str  # 1 char
    ltc_delegate_last_action_date: str  # 8 chars YYYYMMDD


@dataclass
class RecordType02:
    """Provider Address Record — at least 3 per provider (S, M, P; optionally I)."""
    line_number: int
    record_type: str  # "02"
    medicaid_provider_number: str
    address_type_code: str  # 1 char (S/M/P/I)
    name_type_code: str  # 1 char (B/P) — used with Name - Address Specific
    name_address_specific: str  # 50 chars
    street_address_1: str  # 30 chars
    street_address_2: str  # 30 chars
    city: str  # 30 chars
    state: str  # 2 chars
    zip_code: str  # 5 chars
    zip_code_extension: str  # 4 chars
    practice_location_county_code: str  # 10 chars
    email_address: str  # 256 chars
    contact_person: str  # 50 chars
    phone_number_contact: str  # 10 chars
    phone_extension_contact: str  # 4 chars
    phone_number_member_use: str  # 10 chars


@dataclass
class RecordType03:
    """Provider TIN Record — zero or more per provider."""
    line_number: int
    record_type: str  # "03"
    medicaid_provider_number: str
    tax_id_number: str  # 9 chars
    tax_id_type: str  # 1 char (S or F)
    tin_effective_date: str  # YYYYMMDD
    tin_end_date: str  # YYYYMMDD


@dataclass
class RecordType04:
    """Provider Contract Record — one or more per provider."""
    line_number: int
    record_type: str  # "04"
    medicaid_provider_number: str
    provider_contract_code: str  # 5 chars
    contract_effective_date: str  # YYYYMMDD
    contract_end_date: str  # YYYYMMDD
    contract_enrollment_status_code: str  # 1 char
    contract_enrollment_status_description: str  # 21 chars


@dataclass
class RecordType05:
    """Provider Type and Specialty Record — one or more per provider."""
    line_number: int
    record_type: str  # "05"
    medicaid_provider_number: str
    provider_type_code: str  # 2 chars
    provider_type_description: str  # 50 chars
    provider_specialty_code: str  # 3 chars
    provider_specialty_description: str  # 50 chars
    provider_type_specialty_effective_date: str  # YYYYMMDD
    provider_type_specialty_end_date: str  # YYYYMMDD


@dataclass
class RecordType06:
    """Provider NPI Record — zero or more per provider."""
    line_number: int
    record_type: str  # "06"
    medicaid_provider_number: str
    npi: str  # 15 chars
    npi_effective_date: str  # YYYYMMDD
    npi_end_date: str  # YYYYMMDD
    npi_type_description: str  # 50 chars (NPI or Subpart NPI)


@dataclass
class RecordType07:
    """Provider Taxonomy Record — zero or more per provider."""
    line_number: int
    record_type: str  # "07"
    medicaid_provider_number: str
    taxonomy_code: str  # 10 chars
    taxonomy_effective_date: str  # YYYYMMDD
    taxonomy_end_date: str  # YYYYMMDD


@dataclass
class RecordType08:
    """Provider ACA Payment Hold Record — zero or more per provider."""
    line_number: int
    record_type: str  # "08"
    medicaid_provider_number: str
    aca_payment_hold_effective_date: str  # YYYYMMDD
    aca_payment_hold_end_date: str  # YYYYMMDD
    aca_payment_hold_indicator: str  # 1 char (A/C/T)


@dataclass
class RecordType09:
    """Provider Value Added Record — zero or more per provider."""
    line_number: int
    record_type: str  # "09"
    medicaid_provider_number: str
    value_added_payment_start_date: str  # YYYYMMDD
    value_added_payment_end_date: str  # YYYYMMDD
    eligible_for_value_added_payment: str  # 4 chars


@dataclass
class RecordType10:
    """Provider Waiver Program Record — zero or more per provider."""
    line_number: int
    record_type: str  # "10"
    medicaid_provider_number: str
    waiver_program_code: str  # 5 chars
    waiver_program_description: str  # 50 chars
    waiver_program_effective_date: str  # YYYYMMDD
    waiver_program_end_date: str  # YYYYMMDD


@dataclass
class RecordType11:
    """Provider Waiver Service Record — zero or more per provider."""
    line_number: int
    record_type: str  # "11"
    medicaid_provider_number: str
    waiver_service_code: str  # 6 chars
    waiver_service_description: str  # 250 chars
    waiver_service_effective_date: str  # YYYYMMDD
    waiver_service_end_date: str  # YYYYMMDD
    waiver_service_status_code: str  # 1 char
    waiver_service_status_description: str  # 30 chars


@dataclass
class RecordType12:
    """Provider County and Tribe Served Record — zero or more per provider."""
    line_number: int
    record_type: str  # "12"
    medicaid_provider_number: str
    county_code: str  # 10 chars


@dataclass
class RecordType13:
    """Provider License Record — zero or more per provider."""
    line_number: int
    record_type: str  # "13"
    medicaid_provider_number: str
    license_number: str  # 10 chars
    license_effective_date: str  # YYYYMMDD
    license_end_date: str  # YYYYMMDD
    licensure_board_code: str  # 3 chars
    licensure_board_description: str  # 50 chars
    license_classification_code: str  # 3 chars
    license_classification_description: str  # 50 chars


@dataclass
class RecordType14:
    """Provider Certification and Credentials Record — zero or more per provider."""
    line_number: int
    record_type: str  # "14"
    medicaid_provider_number: str
    certification_number: str  # 15 chars
    certification_type_code: str  # 2 chars
    certification_type_description: str  # 50 chars
    special_program_certification_code: str  # 2 chars
    special_program_certification_description: str  # 50 chars
    certification_effective_date: str  # YYYYMMDD
    certification_end_date: str  # YYYYMMDD


@dataclass
class ProviderGroup:
    """All records grouped for a single provider, keyed by Medicaid Provider Number."""
    medicaid_provider_number: str
    record_01: Optional[RecordType01] = None
    records_02: List[RecordType02] = field(default_factory=list)
    records_03: List[RecordType03] = field(default_factory=list)
    records_04: List[RecordType04] = field(default_factory=list)
    records_05: List[RecordType05] = field(default_factory=list)
    records_06: List[RecordType06] = field(default_factory=list)
    records_07: List[RecordType07] = field(default_factory=list)
    records_08: List[RecordType08] = field(default_factory=list)
    records_09: List[RecordType09] = field(default_factory=list)
    records_10: List[RecordType10] = field(default_factory=list)
    records_11: List[RecordType11] = field(default_factory=list)
    records_12: List[RecordType12] = field(default_factory=list)
    records_13: List[RecordType13] = field(default_factory=list)
    records_14: List[RecordType14] = field(default_factory=list)


@dataclass
class ParsedFile(BaseParsedFile):
    """Complete parsed representation of a Medicaid Provider File Extract."""
    header: Optional[RecordType00] = None
    providers: dict = field(default_factory=dict)  # MCD ID → ProviderGroup

    @property
    def record_count(self) -> int:
        """Total data records (excluding header line)."""
        return len(self.source_lines) - 1 if self.source_lines else 0

    @property
    def entity_count(self) -> int:
        """Number of distinct providers."""
        return len(self.providers)

    @property
    def entity_ids(self) -> List[str]:
        """List of Medicaid Provider Numbers."""
        return list(self.providers.keys())

    @property
    def provider_count(self) -> int:
        """Alias for entity_count (backward compatibility)."""
        return self.entity_count
