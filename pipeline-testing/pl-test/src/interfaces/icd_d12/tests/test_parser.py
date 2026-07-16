"""
Unit tests for the ICD-D12 FSIA Parser.
Tests run without DB connectivity — only test parsing logic.
"""
import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))

from src.interfaces.icd_d12.parser import IcdD12Parser, FsiaParserError
from src.interfaces.icd_d12.models import HeaderRecord, DetailRecord, ParsedFile

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))))
DATA_DIR = os.path.join(_PROJECT_ROOT, "data", "icd_d12")
BASELINE_FILE = os.path.join(DATA_DIR, "WI_FSIA_FILE_EXTRACT_T.txt")
MAX_LENGTHS_FILE = os.path.join(DATA_DIR, "WI_FSIA_FILE_EXTRACT_T_01_MAX_LENGTHS.txt")
MIN_EMPTY_FILE = os.path.join(DATA_DIR, "WI_FSIA_FILE_EXTRACT_T_02_MIN_EMPTY.txt")


@pytest.fixture
def parser():
    return IcdD12Parser()


@pytest.fixture
def parsed_baseline(parser):
    return parser.parse_file(BASELINE_FILE)


class TestHeaderParsing:
    """Tests for HDR record parsing."""

    def test_header_parsed(self, parsed_baseline):
        assert parsed_baseline.header is not None

    def test_header_record_type(self, parsed_baseline):
        assert parsed_baseline.header.record_type == "HDR"

    def test_header_creation_date(self, parsed_baseline):
        assert parsed_baseline.header.creation_date == "20260618"

    def test_header_creation_time(self, parsed_baseline):
        assert parsed_baseline.header.creation_time == "103000"

    def test_header_detail_count(self, parsed_baseline):
        assert parsed_baseline.header.detail_record_count == "000003"


class TestDetailParsing:
    """Tests for DTL detail record parsing."""

    def test_correct_member_count(self, parsed_baseline):
        assert parsed_baseline.entity_count == 3

    def test_member_ids(self, parsed_baseline):
        assert "9999999001" in parsed_baseline.entity_ids
        assert "9999999002" in parsed_baseline.entity_ids
        assert "9999999003" in parsed_baseline.entity_ids

    def test_member1_demographics(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.medicaid_id == "9999999001"
        assert m.first_name == "John"
        assert m.last_name == "Smith"
        assert m.middle_name == "M"

    def test_member2_demographics(self, parsed_baseline):
        m = parsed_baseline.members["9999999002"]
        assert m.medicaid_id == "9999999002"
        assert m.first_name == "Mary"
        assert m.last_name == "Johnson"
        assert m.middle_name == "A"

    def test_member3_demographics(self, parsed_baseline):
        m = parsed_baseline.members["9999999003"]
        assert m.medicaid_id == "9999999003"
        assert m.first_name == "Robert"
        assert m.last_name == "Williams"
        assert m.middle_name == "J"

    def test_living_situation_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.appl_pref_live_cd == "024"
        assert m.gard_pref_live_cd == "001"

    def test_adl_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.bath_help_cd == "001"
        assert m.bath_adpv_eqp_cd == "005"
        assert m.dres_help_cd == "001"
        assert m.eat_help_cd == "001"
        assert m.mbl_help_cd == "002"
        assert m.tlt_help_cd == "001"
        assert m.xfer_help_cd == "002"

    def test_multi_select_mobility_equipment(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.mbl_adpv_eqp_cd == "002003007"

    def test_multi_select_toileting_equipment(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.tlt_adpv_eqp_cd == "002003"

    def test_multi_select_transferring_equipment(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.xfer_adpv_eqp_cd == "001002003004"

    def test_iadl_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.meal_prep_help_lvl_cd == "002"
        assert m.med_mgt_help_lvl_cd == "003"
        assert m.mony_mgt_help_lvl_cd == "001"
        assert m.ldry_chor_help_lvl_cd == "002"
        assert m.phn_use_abty_cd == "002"
        assert m.phn_acs_cd == "001"
        assert m.trnsp_drv_cd == "005"

    def test_employment_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.empl_stat_cd == "001"
        assert m.wkshp_empl_flg == "N"
        assert m.indv_int_work_cmny_cd == "N"
        assert m.cmny_empl_flg == "N"

    def test_health_service_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.bhv_itrvn_cd == "001"
        assert m.nurs_ases_cd == "001"
        assert m.othr_srvc_cd == "000"
        assert m.othr_srvc_txt == ""

    def test_other_service_text(self, parsed_baseline):
        m = parsed_baseline.members["9999999003"]
        assert "wound care" in m.othr_srvc_txt.lower()

    def test_cognition_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.comm_cd == "001"
        assert m.mem_ipar_flg == "Y"
        assert m.shrt_term_mem_loss_flg == "Y"
        assert m.uabl_to_rmbr_flg == "N"
        assert m.long_term_mem_loss_flg == "N"
        assert m.dly_dcsn_make_cd == "001"

    def test_behavior_fields(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.wndr_cd == "001"
        assert m.self_injr_bhv_cd == "000"
        assert m.mntl_hlth_need_cd == "001"
        assert m.sbtnc_abus_flg == "N"

    def test_eligibility_date(self, parsed_baseline):
        m = parsed_baseline.members["9999999001"]
        assert m.elg_calc_dt == "20260115"

    def test_member2_eligibility_date(self, parsed_baseline):
        m = parsed_baseline.members["9999999002"]
        assert m.elg_calc_dt == "20260210"

    def test_member3_eligibility_date(self, parsed_baseline):
        m = parsed_baseline.members["9999999003"]
        assert m.elg_calc_dt == "20260305"


class TestSourceLines:
    """Tests for source line tracking."""

    def test_source_line_count(self, parsed_baseline):
        assert len(parsed_baseline.source_lines) == 4  # 1 HDR + 3 DTL

    def test_source_line_numbers_sequential(self, parsed_baseline):
        line_nums = [sl.line_number for sl in parsed_baseline.source_lines]
        assert line_nums == [1, 2, 3, 4]

    def test_source_line_record_types(self, parsed_baseline):
        types = [sl.record_type for sl in parsed_baseline.source_lines]
        assert types == ["HDR", "DTL", "DTL", "DTL"]


class TestMaxLengths:
    """Tests for maximum field length file."""

    def test_parses_max_length_file(self, parser):
        parsed = parser.parse_file(MAX_LENGTHS_FILE)
        assert parsed.entity_count == 1

    def test_max_length_name(self, parser):
        parsed = parser.parse_file(MAX_LENGTHS_FILE)
        m = parsed.members["9999999999"]
        assert len(m.first_name) == 20
        assert len(m.last_name) == 20

    def test_max_length_other_text(self, parser):
        parsed = parser.parse_file(MAX_LENGTHS_FILE)
        m = parsed.members["9999999999"]
        assert len(m.othr_srvc_txt) <= 75
        assert m.othr_srvc_txt.strip() != ""


class TestMinEmpty:
    """Tests for minimal/empty optional fields file."""

    def test_parses_min_empty_file(self, parser):
        parsed = parser.parse_file(MIN_EMPTY_FILE)
        assert parsed.entity_count == 1

    def test_empty_optional_fields(self, parser):
        parsed = parser.parse_file(MIN_EMPTY_FILE)
        m = parsed.members["0000000010"]
        assert m.first_name == "A"
        assert m.last_name == ""
        assert m.middle_name == ""
        assert m.bath_help_cd == ""
        assert m.othr_srvc_txt == ""

    def test_required_fields_present(self, parser):
        parsed = parser.parse_file(MIN_EMPTY_FILE)
        m = parsed.members["0000000010"]
        assert m.medicaid_id == "0000000010"
        assert m.elg_calc_dt == "20260101"


class TestExpectedStateGenerator:
    """Tests for expected state generation (no DB needed)."""

    def test_stage1_generates_all_lines(self, parsed_baseline):
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage1 = gen.generate_stage1()
        assert len(stage1) == 4  # HDR + 3 DTL

    def test_stage2_generates_field_rows(self, parsed_baseline):
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage2 = gen.generate_stage2()
        # 3 members × 69 fields each = 207
        assert len(stage2) == 3 * 69

    def test_stage2_has_correct_entity_ids(self, parsed_baseline):
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage2 = gen.generate_stage2()
        ids = set(r["entity_id"] for r in stage2)
        assert ids == {"9999999001", "9999999002", "9999999003"}

    def test_stage4_personal_care_yes(self, parsed_baseline):
        """Member 1 has ADL help codes 001/002 → personal care = Yes."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        pc = next(r for r in stage4 if r["row_key"] == "PersonalCare|9999999001")
        assert pc["expected_value"] == "Yes, there is an identified need"

    def test_stage4_personal_care_no(self, parsed_baseline):
        """Member 3 has all ADL codes 000 → personal care = No."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        pc = next(r for r in stage4 if r["row_key"] == "PersonalCare|9999999003")
        assert pc["expected_value"] == "No, there is not an identified need"

    def test_stage4_med_admin_yes(self, parsed_baseline):
        """Member 1 has med_mgt=003 → med admin = Yes."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        ma = next(r for r in stage4 if r["row_key"] == "MedAdmin|9999999001")
        assert ma["expected_value"] == "Yes, there is an identified need"

    def test_stage4_med_admin_no(self, parsed_baseline):
        """Member 3 has med_mgt=002 (Independent) → med admin = No."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        ma = next(r for r in stage4 if r["row_key"] == "MedAdmin|9999999003")
        assert ma["expected_value"] == "No, there is not an identified need"

    def test_stage4_transport_yes(self, parsed_baseline):
        """Member 1 has trnsp=005 → transport = Yes."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        t = next(r for r in stage4 if r["row_key"] == "Transportation|9999999001")
        assert t["expected_value"] == "Yes, there is an identified need"

    def test_stage4_transport_no(self, parsed_baseline):
        """Member 3 has trnsp=001 (drives regular) → transport = No."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        t = next(r for r in stage4 if r["row_key"] == "Transportation|9999999003")
        assert t["expected_value"] == "No, there is not an identified need"

    def test_stage4_dme_yes(self, parsed_baseline):
        """Member 1 has adaptive equipment → DME = Yes."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        d = next(r for r in stage4 if r["row_key"] == "DME|9999999001")
        assert d["expected_value"] == "Yes, there is an identified need"

    def test_stage4_dme_no(self, parsed_baseline):
        """Member 3 has no adaptive equipment → DME = No."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        d = next(r for r in stage4 if r["row_key"] == "DME|9999999003")
        assert d["expected_value"] == "No, there is not an identified need"

    def test_stage4_eligibility_date_stored(self, parsed_baseline):
        """ELG_CALC_DT IS stored as a DateFieldAnswer (Screening Completion Date)."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        elg_rows = [r for r in stage4 if "ElgCalcDt" in r.get("row_key", "")]
        assert len(elg_rows) == 3  # One per member
        for row in elg_rows:
            assert row["target_table"] == "CustomFormModule.DateFieldAnswer"
            assert row["target_column"] == "DateTime"

    def test_stage3_returns_empty(self, parsed_baseline):
        """Stage 3 is skipped for D12 — returns empty list."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        assert gen.generate_stage3() == []

    def test_stage4_includes_form_definition_key(self, parsed_baseline):
        """Stage 4 includes CustomFormInstance with correct CustomFormDefinitionKey."""
        from src.interfaces.icd_d12.expected_state import IcdD12ExpectedStateGenerator
        gen = IcdD12ExpectedStateGenerator(parsed_baseline)
        stage4 = gen.generate_stage4()
        fi = next(r for r in stage4 if r["row_key"] == "FormInstance|9999999001")
        assert fi["target_table"] == "CustomFormModule.CustomFormInstance"
        assert fi["target_column"] == "CustomFormDefinitionKey"
        assert fi["expected_value"] == "8D435D5E-B605-4DF6-8B1C-B47B012FDB34"


class TestPluginRegistry:
    """Tests for plugin registration."""

    def test_icd_d12_registered(self):
        from src.interfaces import get_interface, list_interface_types
        assert "icd_d12" in list_interface_types()

    def test_get_icd_d12_plugin(self):
        from src.interfaces import get_interface
        plugin = get_interface("icd_d12")
        assert plugin.interface_type == "icd_d12"
        assert plugin.display_name == "ICD-D12: FSIA Adult Functional Screen File"
        assert ".txt" in plugin.file_extensions
        assert plugin.entity_id_field_name == "MedicaidId"

    def test_create_parser_from_plugin(self):
        from src.interfaces import get_interface
        plugin = get_interface("icd_d12")
        parser = plugin.create_parser()
        parsed = parser.parse_file(BASELINE_FILE)
        assert parsed.entity_count == 3
