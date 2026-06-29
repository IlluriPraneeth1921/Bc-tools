"""
Unit tests for the PsvParser using actual test .psv files.
"""
import os
import sys
import pytest

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from src.interfaces.icd_d06.parser import IcdD06Parser as PsvParser, PsvParserError
from src.interfaces.icd_d06.models import (
    RecordType00, RecordType01, RecordType02, RecordType03,
    RecordType04, RecordType05, RecordType06, RecordType07,
    RecordType08, RecordType09, RecordType10, RecordType11,
    RecordType12, RecordType13, RecordType14, ParsedFile,
)

# Path to test data files — go up to workspace root (pl-test/../)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
TEST_DATA_DIR = os.path.join(_PROJECT_ROOT, "data", "icd_d06")


@pytest.fixture
def parser():
    return PsvParser()


@pytest.fixture
def baseline_file_path():
    return os.path.join(TEST_DATA_DIR, "WI_PROV_FILE_EXTRACT_T.psv")


class TestPsvParserBaseline:
    """Tests using the baseline test file (3 providers, all record types)."""

    def test_parse_baseline_file_loads_successfully(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        assert result is not None
        assert isinstance(result, ParsedFile)

    def test_parse_baseline_header(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        assert result.header is not None
        assert isinstance(result.header, RecordType00)
        assert result.header.record_type == "00"
        assert result.header.extract_date == "20260618"
        assert result.header.extract_period_start_date == "20240618"
        assert result.header.extract_period_end_date == "20260618"
        assert result.header.number_of_records == "000000000049"
        assert result.header.number_of_providers == "000000000003"

    def test_parse_baseline_provider_count(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        assert result.provider_count == 3

    def test_parse_baseline_record_count(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        assert result.record_count == 49

    def test_parse_baseline_provider_ids(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        expected_ids = {"000000000012345", "000000000067890", "000000000024680"}
        assert set(result.providers.keys()) == expected_ids

    def test_parse_baseline_source_lines_have_line_numbers(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        # Line numbers should start at 1
        assert result.source_lines[0].line_number == 1
        # All lines should have sequential line numbers
        for i, line in enumerate(result.source_lines):
            assert line.line_number == i + 1

    def test_parse_baseline_record_type_01_fields(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]
        rec01 = provider.record_01

        assert rec01 is not None
        assert rec01.record_type == "01"
        assert rec01.medicaid_provider_number == "000000000012345"
        assert rec01.provider_name_type == "P"
        assert rec01.organization_type_code == "1"
        assert rec01.organization_type_description == "For Profit"
        assert rec01.medicare_part_a == "A"
        assert rec01.medicare_part_b == "B"
        assert rec01.location_status_indicator == "I"
        assert rec01.billing_indicator == "B"
        assert rec01.xml_indicator == "Y"
        assert rec01.provider_directory_indicator == "Y"
        assert rec01.revalidation_date == "20270115"
        assert rec01.ltc_delegate_action_indicator == "Y"
        assert rec01.ltc_delegate_last_action_date == "20260101"

    def test_parse_baseline_record_type_02_addresses(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]

        # Smith should have 3 address records (S, M, P)
        assert len(provider.records_02) == 3

        # Check service address
        service_addr = next(r for r in provider.records_02 if r.address_type_code == "S")
        assert service_addr.street_address_1 == "123 Main Street"
        assert service_addr.street_address_2 == "Suite 200"
        assert service_addr.city == "Madison"
        assert service_addr.state == "WI"
        assert service_addr.zip_code == "53703"
        assert service_addr.zip_code_extension == "1234"
        assert service_addr.practice_location_county_code == "5500100000"

    def test_parse_baseline_record_type_03_tin(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]

        assert len(provider.records_03) == 1
        tin = provider.records_03[0]
        assert tin.tax_id_number == "391234567"
        assert tin.tax_id_type == "S"
        assert tin.tin_effective_date == "20200101"
        assert tin.tin_end_date == "99991231"

    def test_parse_baseline_record_type_04_contract(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        # Lakeside has 2 contracts (MEDSV + WVR)
        assert len(provider.records_04) == 2
        wvr = next(r for r in provider.records_04 if r.provider_contract_code == "WVR")
        assert wvr.contract_effective_date == "20190101"
        assert wvr.contract_end_date == "99991231"
        assert wvr.contract_enrollment_status_code == "A"
        assert wvr.contract_enrollment_status_description == "Active"

    def test_parse_baseline_record_type_05_specialty(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]

        # Smith has 2 specialties
        assert len(provider.records_05) == 2
        gp = next(r for r in provider.records_05 if r.provider_specialty_code == "100")
        assert gp.provider_type_code == "31"
        assert gp.provider_type_description == "Physician"
        assert gp.provider_specialty_description == "General Practice"

    def test_parse_baseline_record_type_06_npi(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        # Lakeside has 2 NPIs
        assert len(provider.records_06) == 2
        subpart = next(r for r in provider.records_06 if r.npi_type_description == "Subpart NPI")
        assert subpart.npi == "1112223334"

    def test_parse_baseline_record_type_07_taxonomy(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]

        assert len(provider.records_07) == 1
        assert provider.records_07[0].taxonomy_code == "207Q00000X"

    def test_parse_baseline_record_type_08_aca(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        assert len(provider.records_08) == 1
        aca = provider.records_08[0]
        assert aca.aca_payment_hold_effective_date == "20250101"
        assert aca.aca_payment_hold_end_date == "20250601"
        assert aca.aca_payment_hold_indicator == "C"

    def test_parse_baseline_record_type_09_value_added(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000024680"]

        assert len(provider.records_09) == 1
        va = provider.records_09[0]
        assert va.value_added_payment_start_date == "20240101"
        assert va.eligible_for_value_added_payment == "0128"

    def test_parse_baseline_record_type_10_waiver_program(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        assert len(provider.records_10) == 2
        iris = next(r for r in provider.records_10 if r.waiver_program_code == "IRIS")
        assert iris.waiver_program_description == "IRIS:Include, Respect, I Self-Direct"

    def test_parse_baseline_record_type_11_waiver_service(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        assert len(provider.records_11) == 3
        care_mgmt = next(r for r in provider.records_11 if r.waiver_service_code == "WVR016")
        assert care_mgmt.waiver_service_description == "Care Management"
        assert care_mgmt.waiver_service_status_code == "A"
        assert care_mgmt.waiver_service_status_description == "Active"

    def test_parse_baseline_record_type_12_county(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        assert len(provider.records_12) == 3
        county_codes = {r.county_code for r in provider.records_12}
        assert "4000100000" in county_codes

    def test_parse_baseline_record_type_13_license(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]

        assert len(provider.records_13) == 1
        lic = provider.records_13[0]
        assert lic.license_number == "MD12345678"
        assert lic.licensure_board_code == "MED"
        assert lic.licensure_board_description == "Medical Examining Board"
        assert lic.license_classification_code == "PH1"
        assert lic.license_classification_description == "DSPS Physician(MD)"

    def test_parse_baseline_record_type_14_certification(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]

        assert len(provider.records_14) == 2
        hm = next(r for r in provider.records_14 if r.certification_type_code == "HM")
        assert hm.certification_type_description == "Home and Community-Based Services Compliance"
        assert hm.special_program_certification_code == "10"
        assert hm.special_program_certification_description == "HCBS Compliance"


class TestPsvParserEdgeCases:
    """Tests for edge cases and error handling."""

    def test_parse_empty_content(self, parser):
        result = parser.parse_content("", filename="empty.psv")
        assert result.provider_count == 0
        assert result.header is None
        assert len(result.source_lines) == 0

    def test_parse_header_only(self, parser):
        content = "00|20260618|20240618|20260618|000000000000|000000000000"
        result = parser.parse_content(content, filename="header_only.psv")
        assert result.header is not None
        assert result.provider_count == 0

    def test_parse_unknown_record_type_raises_error(self, parser):
        content = "00|20260618|20240618|20260618|000000000001|000000000001\n99|bad_record"
        with pytest.raises(PsvParserError) as exc_info:
            parser.parse_content(content, filename="bad.psv")
        assert "Unknown record type" in str(exc_info.value)
        assert exc_info.value.line_number == 2

    def test_parse_preserves_raw_text(self, parser):
        line = "01|000000000012345|Smith                    John         M|P|1|For Profit|A|B|I|B|Y|Y|00005|00012|20270115|Y|20260101"
        content = f"00|20260618|20240618|20260618|000000000001|000000000001\n{line}"
        result = parser.parse_content(content, filename="test.psv")
        assert result.source_lines[1].raw_text == line

    def test_parse_handles_trailing_empty_fields(self, parser):
        content = "00|20260618|20240618|20260618|000000000001|000000000001\n01|000000000099999|Test|B|1|For Profit|A|B|I|B|Y|Y|||20270115|N|"
        result = parser.parse_content(content, filename="trailing.psv")
        provider = result.providers["000000000099999"]
        assert provider.record_01.medicaid_service_provider_count == ""
        assert provider.record_01.medicaid_member_count == ""

    def test_parse_large_file(self, parser):
        """Test parsing the large volume file (50 providers)."""
        filepath = os.path.join(TEST_DATA_DIR, "WI_PROV_FILE_EXTRACT_T_08_LARGE_VOLUME.psv")
        if not os.path.exists(filepath):
            pytest.skip("Large volume test file not found")

        result = parser.parse_file(filepath)
        assert result.provider_count == 50
        assert result.header.number_of_providers == "000000000050"
        # Every provider should have at least record type 01
        for mcd_id, group in result.providers.items():
            assert group.record_01 is not None, f"Provider {mcd_id} missing record type 01"

    def test_parse_line_numbers_are_sequential(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        line_numbers = [sl.line_number for sl in result.source_lines]
        assert line_numbers == list(range(1, len(line_numbers) + 1))

    def test_parse_business_name_provider(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000067890"]
        assert provider.record_01.provider_name_type == "B"
        assert provider.record_01.provider_full_name == "Lakeside Medical Group"

    def test_parse_personal_name_provider(self, parser, baseline_file_path):
        result = parser.parse_file(baseline_file_path)
        provider = result.providers["000000000012345"]
        assert provider.record_01.provider_name_type == "P"
        # Personal name is in fixed-position format within the 50-char field
        assert "Smith" in provider.record_01.provider_full_name
        assert "John" in provider.record_01.provider_full_name


class TestPsvParserMultipleOccurrences:
    """Tests using the multiple occurrences test file."""

    def test_parse_multiple_service_locations(self, parser):
        filepath = os.path.join(TEST_DATA_DIR, "WI_PROV_FILE_EXTRACT_T_03_MULTIPLE_OCCURRENCES.psv")
        if not os.path.exists(filepath):
            pytest.skip("Multiple occurrences test file not found")

        result = parser.parse_file(filepath)
        provider = result.providers["000000000099999"]

        # Should have 3 service locations
        service_addrs = [r for r in provider.records_02 if r.address_type_code == "S"]
        assert len(service_addrs) == 3

        # Should have 4 contracts
        assert len(provider.records_04) == 4

        # Should have 4 NPIs
        assert len(provider.records_06) == 4

        # Should have 8 counties
        assert len(provider.records_12) == 8

        # Should have 4 licenses
        assert len(provider.records_13) == 4


class TestTestRun:
    """Tests for the TestRun model."""

    def test_test_run_creates_unique_id(self):
        from src.core.test_run import TestRun
        run1 = TestRun()
        run2 = TestRun()
        assert run1.test_run_id != run2.test_run_id

    def test_test_run_mark_completed_all_pass(self):
        from src.core.test_run import TestRun
        run = TestRun()
        run.stage1_pass_count = 10
        run.stage2_pass_count = 10
        run.stage3_pass_count = 10
        run.mark_completed()
        assert run.overall_status == "PASS"
        assert run.end_timestamp is not None

    def test_test_run_mark_completed_has_failures(self):
        from src.core.test_run import TestRun
        run = TestRun()
        run.stage1_pass_count = 10
        run.stage2_pass_count = 8
        run.stage2_fail_count = 2
        run.stage3_pass_count = 10
        run.mark_completed()
        assert run.overall_status == "PARTIAL"

    def test_test_run_summary(self):
        from src.core.test_run import TestRun
        run = TestRun(source_filename="test.psv")
        run.total_providers = 3
        run.total_source_lines = 50
        summary = run.summary
        assert summary["source_filename"] == "test.psv"
        assert summary["total_providers"] == 3
