"""
Expected State Generator for ICD-D06 Medicaid Provider File.
Generates expected state for Stage 1 (Raw), Stage 2 (Parsed), Stage 3 (Incoming), and Stage 4 (Final).
"""
import json
import os
from typing import List, Dict, Any, Optional

from src.interfaces.base import BaseExpectedStateGenerator, BaseParsedFile
from src.interfaces.icd_d06.models import ParsedFile
from src.interfaces.icd_d06.stage3_generator import IcdD06Stage3Generator


# Load Stage 2 schema mapping
_SCHEMA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "database", "stage2_schema.json"
)


def _load_stage2_schema() -> Dict[str, Any]:
    """Load stage 2 schema, returning empty dict if file not found."""
    try:
        with open(_SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


STAGE2_SCHEMA: Dict[str, Any] = _load_stage2_schema()


class IcdD06ExpectedStateGenerator(BaseExpectedStateGenerator):
    """Generates expected state for all 4 stages of the ICD-D06 pipeline."""

    def __init__(self, parsed_file: BaseParsedFile, vocab_client=None):
        if not isinstance(parsed_file, ParsedFile):
            raise TypeError("IcdD06ExpectedStateGenerator requires an ICD-D06 ParsedFile")
        self.parsed_file: ParsedFile = parsed_file
        self.vocab_client = vocab_client

    def generate_stage1(self) -> List[Dict[str, Any]]:
        """Generate expected MedicaidProviderRaw rows (positional Column3-Column17)."""
        expected_rows = []
        for source_line in self.parsed_file.source_lines:
            fields = source_line.raw_text.split("|")
            row = {
                "line_number": source_line.line_number,
                "RecordType": self._get_field(fields, 0, max_len=2),
                "MedicaidProviderNumber": self._get_field(fields, 1, max_len=15),
            }
            for i in range(2, 17):
                row[f"Column{i + 1}"] = self._get_field(fields, i, max_len=4000)
            expected_rows.append(row)
        return expected_rows

    def generate_stage2(self) -> List[Dict[str, Any]]:
        """Generate expected parsed record-type table rows (EAV format)."""
        expected_rows = []
        for source_line in self.parsed_file.source_lines:
            fields = source_line.raw_text.split("|")
            record_type = self._get_field(fields, 0, max_len=2)
            mapping = self._get_stage2_mapping(record_type, fields)
            if mapping is None:
                continue
            for col_name, expected_value in mapping["columns"].items():
                expected_rows.append({
                    "line_number": source_line.line_number,
                    "entity_id": self._get_field(fields, 1, max_len=15),
                    "record_type": record_type,
                    "target_table": mapping["table"],
                    "column_name": col_name,
                    "expected_value": expected_value,
                })
        return expected_rows

    def generate_stage3(self) -> List[Dict[str, Any]]:
        """Generate expected Stage 3 (Incoming) rows using Stage3Generator."""
        if self.vocab_client is None:
            raise RuntimeError("VocabClient is required to generate Stage 3 expected state")
        generator = IcdD06Stage3Generator(self.parsed_file, self.vocab_client)
        return generator.generate()

    def generate_stage4(self) -> List[Dict[str, Any]]:
        """
        Generate expected Stage 4 (Final) rows.
        Stage 3→4 is a straight copy, so expected values are the same as Stage 3.
        """
        return self.generate_stage3()

    def _get_stage2_mapping(self, record_type: str, fields: list) -> Optional[Dict]:
        if record_type in ("00", "09"):
            return None
        mappers = {
            "01": self._map_01, "02": self._map_02, "03": self._map_03,
            "04": self._map_04, "05": self._map_05, "06": self._map_06,
            "07": self._map_07, "08": self._map_08, "10": self._map_10,
            "11": self._map_11, "12": self._map_12, "13": self._map_13,
            "14": self._map_14,
        }
        mapper = mappers.get(record_type)
        return mapper(fields) if mapper else None

    def _map_01(self, f):
        return {"table": "MedicaidProviderMain", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "ProviderFullName": self._get_field(f, 2, 50),
            "ProviderNameType": self._get_field(f, 3, 1),
            "OrganizationTypeCode": self._get_field(f, 4, 1),
            "OrganizationTypeDescription": self._get_field(f, 5, 25),
            "BillingIndicator": self._get_field(f, 9, 1),
            "RevalidationDate": self._fmt_date(self._get_field(f, 14)),
        }}

    def _map_02(self, f):
        return {"table": "MedicaidProviderAddress", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "AddressTypeCode": self._get_field(f, 2, 1),
            "NameTypeCode": self._get_field(f, 3, 1),
            "NameAddressSpecific": self._get_field(f, 3, 50),
            "StreetAddress1": self._get_field(f, 4, 30),
            "StreetAddress2": self._get_field(f, 5, 30),
            "City": self._get_field(f, 6, 30),
            "State": self._get_field(f, 7, 2),
            "ZipCode": self._get_field(f, 8, 5),
            "ZipCodeExtension": self._get_field(f, 9, 4),
            "PracticeLocationCountyCode": self._get_field(f, 10, 10),
            "EmailAddress": self._get_field(f, 11, 256),
            "PhoneNumberMemberUse": self._get_field(f, 15, 10),
        }}

    def _map_03(self, f):
        return {"table": "MedicaidProviderTin", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "TaxIdNumber": self._get_field(f, 2, 9),
            "TaxIdType": self._get_field(f, 3, 1),
            "TinEffectiveDate": self._fmt_date(self._get_field(f, 4)),
            "TinEndDate": self._fmt_date(self._get_field(f, 5)),
        }}

    def _map_04(self, f):
        return {"table": "MedicaidProviderContract", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "ProviderContractCode": self._get_field(f, 2, 5),
            "ContractEffectiveDate": self._fmt_date(self._get_field(f, 3)),
            "ContractEndDate": self._fmt_date(self._get_field(f, 4)),
            "ContractEnrollmentStatusCode": self._get_field(f, 5, 1),
        }}

    def _map_05(self, f):
        return {"table": "MedicaidProviderTypeAndSpecialty", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "ProviderType": self._get_field(f, 2, 2),
            "ProviderTypeDescription": self._get_field(f, 3, 50),
            "ProviderSpecialtyCode": self._get_field(f, 4, 3),
            "ProviderSpecialtyDescription": self._get_field(f, 5, 50),
            "ProviderTypeAndSpecialtyEffectiveDate": self._fmt_date(self._get_field(f, 6)),
            "ProviderTypeAndSpecialtyEndDate": self._fmt_date(self._get_field(f, 7)),
        }}

    def _map_06(self, f):
        return {"table": "MedicaidProviderNpi", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "Npi": self._get_field(f, 2, 15),
            "NpiEffectiveDate": self._fmt_date(self._get_field(f, 3)),
            "NpiEndDate": self._fmt_date(self._get_field(f, 4)),
            "NpiTypeDescription": self._get_field(f, 5, 50),
        }}

    def _map_07(self, f):
        return {"table": "MedicaidProviderTaxonomy", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "Taxonomy": self._get_field(f, 2, 10),
            "TaxonomyEffectiveDate": self._fmt_date(self._get_field(f, 3)),
            "TaxonomyEndDate": self._fmt_date(self._get_field(f, 4)),
        }}

    def _map_08(self, f):
        return {"table": "MedicaidProviderAcaPaymentHold", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "AcaPaymentHoldEffectiveDate": self._fmt_date(self._get_field(f, 2)),
            "AcaPaymentHoldEndDate": self._fmt_date(self._get_field(f, 3)),
            "AcaPaymentHoldIndicator": self._get_field(f, 4, 1),
        }}

    def _map_10(self, f):
        return {"table": "MedicaidProviderWaiverProgram", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "WaiverProgramCode": self._get_field(f, 2, 5),
            "WaiverProgramDescription": self._get_field(f, 3, 50),
            "WaiverProgramEffectiveDate": self._fmt_date(self._get_field(f, 4)),
            "WaiverProgramEndDate": self._fmt_date(self._get_field(f, 5)),
        }}

    def _map_11(self, f):
        return {"table": "MedicaidProviderWaiverService", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "WaiverServiceCode": self._get_field(f, 2, 6),
            "WaiverServiceDescription": self._get_field(f, 3, 250),
            "WaiverServiceEffectiveDate": self._fmt_date(self._get_field(f, 4)),
            "WaiverServiceEndDate": self._fmt_date(self._get_field(f, 5)),
            "WaiverServiceStatusCode": self._get_field(f, 6, 1),
        }}

    def _map_12(self, f):
        return {"table": "MedicaidProviderCountyAndTribeServed", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "CountyCode": self._get_field(f, 2, 10),
        }}

    def _map_13(self, f):
        return {"table": "MedicaidProviderLicense", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "LicenseNumber": self._get_field(f, 2, 10),
            "LicenseEffectiveDate": self._fmt_date(self._get_field(f, 3)),
            "LicenseEndDate": self._fmt_date(self._get_field(f, 4)),
            "LicensureBoardCode": self._get_field(f, 5, 3),
            "LicensureBoardDescription": self._get_field(f, 6, 50),
            "LicenseClassificationDescription": self._get_field(f, 7, 50),
        }}

    def _map_14(self, f):
        return {"table": "MedicaidProviderCertificationAndCredentials", "columns": {
            "MedicaidProviderNumber": self._get_field(f, 1, 15),
            "CertificationNumber": self._get_field(f, 2, 15),
            "CertificationEffectiveDate": self._fmt_date(self._get_field(f, 7)),
            "CertificationEndDate": self._fmt_date(self._get_field(f, 8)),
            "CertificationTypeCode": self._get_field(f, 3, 2),
            "CertificationTypeDescription": self._get_field(f, 4, 50),
            "SpecialProgramCertificationDescription": self._get_field(f, 6, 50),
        }}

    @staticmethod
    def _get_field(fields: list, index: int, max_len: int = None) -> str:
        value = fields[index].strip() if index < len(fields) and fields[index] else ""
        return value[:max_len] if max_len and len(value) > max_len else value

    @staticmethod
    def _fmt_date(value: str) -> Optional[str]:
        if not value or len(value) != 8:
            return None
        try:
            from datetime import date
            return date(int(value[0:4]), int(value[4:6]), int(value[6:8])).isoformat()
        except (ValueError, TypeError):
            return None
