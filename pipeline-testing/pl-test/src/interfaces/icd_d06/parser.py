"""
Pipe-delimited (.psv) file parser for the Medicaid Provider File Extract (ICD-D06).
Parses all 15 record types (00–14) with line number tracking for traceability.
"""
from typing import Union

from src.interfaces.base import BaseParser
from src.interfaces.icd_d06.models import (
    SourceLine,
    RecordType00,
    RecordType01,
    RecordType02,
    RecordType03,
    RecordType04,
    RecordType05,
    RecordType06,
    RecordType07,
    RecordType08,
    RecordType09,
    RecordType10,
    RecordType11,
    RecordType12,
    RecordType13,
    RecordType14,
    ParsedFile,
    ProviderGroup,
)


class PsvParserError(Exception):
    """Raised when the parser encounters an unrecoverable error."""

    def __init__(self, message: str, line_number: int = None, raw_text: str = None):
        self.line_number = line_number
        self.raw_text = raw_text
        super().__init__(message)


class IcdD06Parser(BaseParser):
    """
    Parses a Medicaid Provider File Extract (.psv) into structured data models.

    The parser reads the file line by line, splits each line on the pipe '|' delimiter,
    identifies the record type from the first field, and maps fields to the corresponding
    dataclass. Every parsed record retains its source line number for traceability.
    """

    def parse_file(self, filepath: str) -> ParsedFile:
        """
        Parse a .psv file from a local filesystem path.

        Args:
            filepath: Full path to the .psv file.

        Returns:
            ParsedFile containing all parsed records grouped by provider.
        """
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return self.parse_content(content, filename=filepath)

    def parse_content(self, content: str, filename: str = "unknown") -> ParsedFile:
        """
        Parse .psv content from a string (useful for S3-fetched content).

        Args:
            content: The full file content as a string.
            filename: Name/identifier of the source file.

        Returns:
            ParsedFile containing all parsed records grouped by provider.
        """
        parsed_file = ParsedFile(filename=filename)
        lines = content.splitlines()

        for line_number, raw_text in enumerate(lines, start=1):
            # Skip empty lines
            if not raw_text.strip():
                continue

            source_line = SourceLine(
                line_number=line_number,
                raw_text=raw_text,
                record_type=self._extract_record_type(raw_text),
            )
            parsed_file.source_lines.append(source_line)

            # Parse the line into a typed record
            record = self._parse_line(line_number, raw_text)
            if record is None:
                continue

            # Route to the correct container
            if isinstance(record, RecordType00):
                parsed_file.header = record
            else:
                self._add_to_provider_group(parsed_file, record)

        return parsed_file

    def _extract_record_type(self, raw_text: str) -> str:
        """Extract the record type code from the first pipe-delimited field."""
        pipe_pos = raw_text.find("|")
        if pipe_pos == -1:
            return raw_text.strip()[:2]
        return raw_text[:pipe_pos].strip()

    def _split_fields(self, raw_text: str) -> list:
        """Split a pipe-delimited line into fields, preserving empty strings."""
        return raw_text.split("|")

    def _get_field(self, fields: list, index: int, default: str = "") -> str:
        """Safely get a field value by index, returning default if out of bounds."""
        if index < len(fields):
            return fields[index].strip() if fields[index] else ""
        return default

    def _parse_line(self, line_number: int, raw_text: str) -> Union[
        RecordType00, RecordType01, RecordType02, RecordType03,
        RecordType04, RecordType05, RecordType06, RecordType07,
        RecordType08, RecordType09, RecordType10, RecordType11,
        RecordType12, RecordType13, RecordType14, None
    ]:
        """Parse a single line into the appropriate record type dataclass."""
        fields = self._split_fields(raw_text)
        record_type = self._get_field(fields, 0)

        parser_map = {
            "00": self._parse_record_00,
            "01": self._parse_record_01,
            "02": self._parse_record_02,
            "03": self._parse_record_03,
            "04": self._parse_record_04,
            "05": self._parse_record_05,
            "06": self._parse_record_06,
            "07": self._parse_record_07,
            "08": self._parse_record_08,
            "09": self._parse_record_09,
            "10": self._parse_record_10,
            "11": self._parse_record_11,
            "12": self._parse_record_12,
            "13": self._parse_record_13,
            "14": self._parse_record_14,
        }

        parser_fn = parser_map.get(record_type)
        if parser_fn is None:
            raise PsvParserError(
                f"Unknown record type '{record_type}' at line {line_number}",
                line_number=line_number,
                raw_text=raw_text,
            )

        return parser_fn(line_number, fields)

    def _parse_record_00(self, line_number: int, fields: list) -> RecordType00:
        return RecordType00(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            extract_date=self._get_field(fields, 1),
            extract_period_start_date=self._get_field(fields, 2),
            extract_period_end_date=self._get_field(fields, 3),
            number_of_records=self._get_field(fields, 4),
            number_of_providers=self._get_field(fields, 5),
        )

    def _parse_record_01(self, line_number: int, fields: list) -> RecordType01:
        return RecordType01(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            provider_full_name=self._get_field(fields, 2),
            provider_name_type=self._get_field(fields, 3),
            organization_type_code=self._get_field(fields, 4),
            organization_type_description=self._get_field(fields, 5),
            medicare_part_a=self._get_field(fields, 6),
            medicare_part_b=self._get_field(fields, 7),
            location_status_indicator=self._get_field(fields, 8),
            billing_indicator=self._get_field(fields, 9),
            xml_indicator=self._get_field(fields, 10),
            provider_directory_indicator=self._get_field(fields, 11),
            medicaid_service_provider_count=self._get_field(fields, 12),
            medicaid_member_count=self._get_field(fields, 13),
            revalidation_date=self._get_field(fields, 14),
            ltc_delegate_action_indicator=self._get_field(fields, 15),
            ltc_delegate_last_action_date=self._get_field(fields, 16),
        )

    def _parse_record_02(self, line_number: int, fields: list) -> RecordType02:
        return RecordType02(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            address_type_code=self._get_field(fields, 2),
            name_address_specific=self._get_field(fields, 3),
            street_address_1=self._get_field(fields, 4),
            street_address_2=self._get_field(fields, 5),
            city=self._get_field(fields, 6),
            state=self._get_field(fields, 7),
            zip_code=self._get_field(fields, 8),
            zip_code_extension=self._get_field(fields, 9),
            practice_location_county_code=self._get_field(fields, 10),
            email_address=self._get_field(fields, 11),
            contact_person=self._get_field(fields, 12),
            phone_number_contact=self._get_field(fields, 13),
            phone_extension_contact=self._get_field(fields, 14),
            phone_number_member_use=self._get_field(fields, 15),
        )

    def _parse_record_03(self, line_number: int, fields: list) -> RecordType03:
        return RecordType03(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            tax_id_number=self._get_field(fields, 2),
            tax_id_type=self._get_field(fields, 3),
            tin_effective_date=self._get_field(fields, 4),
            tin_end_date=self._get_field(fields, 5),
        )

    def _parse_record_04(self, line_number: int, fields: list) -> RecordType04:
        return RecordType04(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            provider_contract_code=self._get_field(fields, 2),
            contract_effective_date=self._get_field(fields, 3),
            contract_end_date=self._get_field(fields, 4),
            contract_enrollment_status_code=self._get_field(fields, 5),
            contract_enrollment_status_description=self._get_field(fields, 6),
        )

    def _parse_record_05(self, line_number: int, fields: list) -> RecordType05:
        return RecordType05(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            provider_type_code=self._get_field(fields, 2),
            provider_type_description=self._get_field(fields, 3),
            provider_specialty_code=self._get_field(fields, 4),
            provider_specialty_description=self._get_field(fields, 5),
            provider_type_specialty_effective_date=self._get_field(fields, 6),
            provider_type_specialty_end_date=self._get_field(fields, 7),
        )

    def _parse_record_06(self, line_number: int, fields: list) -> RecordType06:
        return RecordType06(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            npi=self._get_field(fields, 2),
            npi_effective_date=self._get_field(fields, 3),
            npi_end_date=self._get_field(fields, 4),
            npi_type_description=self._get_field(fields, 5),
        )

    def _parse_record_07(self, line_number: int, fields: list) -> RecordType07:
        return RecordType07(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            taxonomy_code=self._get_field(fields, 2),
            taxonomy_effective_date=self._get_field(fields, 3),
            taxonomy_end_date=self._get_field(fields, 4),
        )

    def _parse_record_08(self, line_number: int, fields: list) -> RecordType08:
        return RecordType08(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            aca_payment_hold_effective_date=self._get_field(fields, 2),
            aca_payment_hold_end_date=self._get_field(fields, 3),
            aca_payment_hold_indicator=self._get_field(fields, 4),
        )

    def _parse_record_09(self, line_number: int, fields: list) -> RecordType09:
        return RecordType09(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            value_added_payment_start_date=self._get_field(fields, 2),
            value_added_payment_end_date=self._get_field(fields, 3),
            eligible_for_value_added_payment=self._get_field(fields, 4),
        )

    def _parse_record_10(self, line_number: int, fields: list) -> RecordType10:
        return RecordType10(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            waiver_program_code=self._get_field(fields, 2),
            waiver_program_description=self._get_field(fields, 3),
            waiver_program_effective_date=self._get_field(fields, 4),
            waiver_program_end_date=self._get_field(fields, 5),
        )

    def _parse_record_11(self, line_number: int, fields: list) -> RecordType11:
        return RecordType11(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            waiver_service_code=self._get_field(fields, 2),
            waiver_service_description=self._get_field(fields, 3),
            waiver_service_effective_date=self._get_field(fields, 4),
            waiver_service_end_date=self._get_field(fields, 5),
            waiver_service_status_code=self._get_field(fields, 6),
            waiver_service_status_description=self._get_field(fields, 7),
        )

    def _parse_record_12(self, line_number: int, fields: list) -> RecordType12:
        return RecordType12(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            county_code=self._get_field(fields, 2),
        )

    def _parse_record_13(self, line_number: int, fields: list) -> RecordType13:
        return RecordType13(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            license_number=self._get_field(fields, 2),
            license_effective_date=self._get_field(fields, 3),
            license_end_date=self._get_field(fields, 4),
            licensure_board_code=self._get_field(fields, 5),
            licensure_board_description=self._get_field(fields, 6),
            license_classification_code=self._get_field(fields, 7),
            license_classification_description=self._get_field(fields, 8),
        )

    def _parse_record_14(self, line_number: int, fields: list) -> RecordType14:
        return RecordType14(
            line_number=line_number,
            record_type=self._get_field(fields, 0),
            medicaid_provider_number=self._get_field(fields, 1),
            certification_number=self._get_field(fields, 2),
            certification_type_code=self._get_field(fields, 3),
            certification_type_description=self._get_field(fields, 4),
            special_program_certification_code=self._get_field(fields, 5),
            special_program_certification_description=self._get_field(fields, 6),
            certification_effective_date=self._get_field(fields, 7),
            certification_end_date=self._get_field(fields, 8),
        )

    def _add_to_provider_group(self, parsed_file: ParsedFile, record) -> None:
        """Route a parsed record to the correct provider group."""
        mcd_id = record.medicaid_provider_number

        if mcd_id not in parsed_file.providers:
            parsed_file.providers[mcd_id] = ProviderGroup(
                medicaid_provider_number=mcd_id
            )

        group = parsed_file.providers[mcd_id]

        if isinstance(record, RecordType01):
            group.record_01 = record
        elif isinstance(record, RecordType02):
            group.records_02.append(record)
        elif isinstance(record, RecordType03):
            group.records_03.append(record)
        elif isinstance(record, RecordType04):
            group.records_04.append(record)
        elif isinstance(record, RecordType05):
            group.records_05.append(record)
        elif isinstance(record, RecordType06):
            group.records_06.append(record)
        elif isinstance(record, RecordType07):
            group.records_07.append(record)
        elif isinstance(record, RecordType08):
            group.records_08.append(record)
        elif isinstance(record, RecordType09):
            group.records_09.append(record)
        elif isinstance(record, RecordType10):
            group.records_10.append(record)
        elif isinstance(record, RecordType11):
            group.records_11.append(record)
        elif isinstance(record, RecordType12):
            group.records_12.append(record)
        elif isinstance(record, RecordType13):
            group.records_13.append(record)
        elif isinstance(record, RecordType14):
            group.records_14.append(record)
