"""
Tests for Expected State Generators (Stage 1 and Stage 2).
These tests run without DB connectivity — they only test the generation logic.
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from src.interfaces.icd_d06.parser import IcdD06Parser as PsvParser
from src.interfaces.icd_d06.expected_state import IcdD06ExpectedStateGenerator as ExpectedStateGenerator

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
DATA_DIR = os.path.join(_PROJECT_ROOT, "data", "icd_d06")
BASELINE_FILE = os.path.join(DATA_DIR, "WI_PROV_FILE_EXTRACT_T.psv")


@pytest.fixture
def parsed_file():
    parser = PsvParser()
    return parser.parse_file(BASELINE_FILE)


@pytest.fixture
def generator(parsed_file):
    return ExpectedStateGenerator(parsed_file)


class TestStage1ExpectedState:
    """Tests for Stage 1 (MedicaidProviderRaw) expected state generation."""

    def test_generates_one_row_per_source_line(self, generator, parsed_file):
        stage1 = generator.generate_stage1()
        assert len(stage1) == len(parsed_file.source_lines)

    def test_first_row_is_header(self, generator):
        stage1 = generator.generate_stage1()
        assert stage1[0]["RecordType"] == "00"

    def test_row_has_positional_columns(self, generator):
        stage1 = generator.generate_stage1()
        row = stage1[1]  # Second row (first provider record)
        assert "RecordType" in row
        assert "MedicaidProviderNumber" in row
        for i in range(3, 18):
            assert f"Column{i}" in row

    def test_record_type_correctly_extracted(self, generator):
        stage1 = generator.generate_stage1()
        # Second row should be RecordType 01
        assert stage1[1]["RecordType"] == "01"
        assert stage1[1]["MedicaidProviderNumber"] == "000000000012345"

    def test_column3_contains_provider_name(self, generator):
        stage1 = generator.generate_stage1()
        # For RecordType 01, Column3 is Provider Full Name
        row = stage1[1]
        assert "Smith" in row["Column3"]

    def test_line_numbers_sequential(self, generator):
        stage1 = generator.generate_stage1()
        line_nums = [r["line_number"] for r in stage1]
        assert line_nums == list(range(1, len(stage1) + 1))


class TestStage2ExpectedState:
    """Tests for Stage 2 (Parsed Record-Type Tables) expected state generation."""

    def test_generates_field_expectations(self, generator):
        stage2 = generator.generate_stage2()
        assert len(stage2) > 0

    def test_skips_record_type_00(self, generator):
        stage2 = generator.generate_stage2()
        record_types = set(r["record_type"] for r in stage2)
        assert "00" not in record_types

    def test_skips_record_type_09(self, generator):
        stage2 = generator.generate_stage2()
        record_types = set(r["record_type"] for r in stage2)
        assert "09" not in record_types

    def test_maps_to_correct_tables(self, generator):
        stage2 = generator.generate_stage2()
        tables = set(r["target_table"] for r in stage2)
        assert "MedicaidProviderMain" in tables
        assert "MedicaidProviderAddress" in tables
        assert "MedicaidProviderContract" in tables
        assert "MedicaidProviderNpi" in tables

    def test_provider_main_has_expected_columns(self, generator):
        stage2 = generator.generate_stage2()
        main_cols = set(
            r["column_name"] for r in stage2
            if r["target_table"] == "MedicaidProviderMain" and r["entity_id"] == "000000000012345"
        )
        assert "MedicaidProviderNumber" in main_cols
        assert "ProviderFullName" in main_cols
        assert "ProviderNameType" in main_cols
        assert "BillingIndicator" in main_cols
        assert "RevalidationDate" in main_cols

    def test_date_converted_to_iso_format(self, generator):
        stage2 = generator.generate_stage2()
        reval = next(
            r for r in stage2
            if r["target_table"] == "MedicaidProviderMain"
            and r["entity_id"] == "000000000012345"
            and r["column_name"] == "RevalidationDate"
        )
        assert reval["expected_value"] == "2027-01-15"

    def test_contract_fields_correct(self, generator):
        stage2 = generator.generate_stage2()
        contracts = [
            r for r in stage2
            if r["target_table"] == "MedicaidProviderContract"
            and r["entity_id"] == "000000000067890"
            and r["column_name"] == "ProviderContractCode"
        ]
        codes = [r["expected_value"] for r in contracts]
        assert "MEDSV" in codes
        assert "WVR" in codes

    def test_address_fields_correct(self, generator):
        stage2 = generator.generate_stage2()
        addr = next(
            r for r in stage2
            if r["target_table"] == "MedicaidProviderAddress"
            and r["entity_id"] == "000000000012345"
            and r["column_name"] == "City"
        )
        assert addr["expected_value"] == "Madison"

    def test_all_providers_represented(self, generator, parsed_file):
        stage2 = generator.generate_stage2()
        providers = set(r["entity_id"] for r in stage2)
        assert providers == set(parsed_file.providers.keys())


class TestStage3NameFormatting:
    """Tests for name formatting logic used in Stage 3."""

    def test_personal_name_formatting(self):
        from src.interfaces.icd_d06.stage3_generator import IcdD06Stage3Generator as Stage3Generator
        # "Smith                    John         M" → "John M Smith"
        raw = "Smith                    John         M"
        result = Stage3Generator._format_name(raw, "P")
        assert result == "John M Smith"

    def test_business_name_passthrough(self):
        from src.interfaces.icd_d06.stage3_generator import IcdD06Stage3Generator as Stage3Generator
        raw = "Lakeside Medical Group"
        result = Stage3Generator._format_name(raw, "B")
        assert result == "Lakeside Medical Group"

    def test_zip_code_with_extension(self):
        from src.interfaces.icd_d06.stage3_generator import IcdD06Stage3Generator as Stage3Generator
        result = Stage3Generator._format_zip("53703", "1234")
        assert result == "53703-1234"

    def test_zip_code_without_extension(self):
        from src.interfaces.icd_d06.stage3_generator import IcdD06Stage3Generator as Stage3Generator
        result = Stage3Generator._format_zip("53703", "")
        assert result == "53703"

    def test_zip_code_empty(self):
        from src.interfaces.icd_d06.stage3_generator import IcdD06Stage3Generator as Stage3Generator
        result = Stage3Generator._format_zip("", "")
        assert result == ""
