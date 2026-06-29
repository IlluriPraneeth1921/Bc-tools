"""
Fixed-width space-delimited parser for the ICD-D12 FSIA File.

The FSIA file has two record types:
- HDR: Header record (starts with "HDR")
- DTL: Detail records (one per member, starts with Medicaid ID)

Fields are fixed-width and separated by single space delimiters.
"""
from typing import List, Tuple

from src.interfaces.base import BaseParser
from src.interfaces.icd_d12.models import (
    SourceLine,
    HeaderRecord,
    DetailRecord,
    ParsedFile,
)


# Field definitions: (field_name, length)
# Each field is followed by a 1-char space delimiter (except the last field)
DETAIL_FIELDS: List[Tuple[str, int]] = [
    ("medicaid_id", 10),
    ("first_name", 20),
    ("last_name", 20),
    ("middle_name", 15),
    # Living Situation
    ("appl_pref_live_cd", 3),
    ("gard_pref_live_cd", 3),
    # ADLs
    ("bath_help_cd", 3),
    ("bath_adpv_eqp_cd", 3),
    ("dres_help_cd", 3),
    ("eat_help_cd", 3),
    ("mbl_help_cd", 3),
    ("mbl_adpv_eqp_cd", 9),
    ("tlt_help_cd", 3),
    ("tlt_adpv_eqp_cd", 15),
    ("xfer_help_cd", 3),
    ("xfer_adpv_eqp_cd", 12),
    # IADLs
    ("meal_prep_help_lvl_cd", 3),
    ("med_mgt_help_lvl_cd", 3),
    ("mony_mgt_help_lvl_cd", 3),
    ("ldry_chor_help_lvl_cd", 3),
    ("phn_use_abty_cd", 3),
    ("phn_acs_cd", 3),
    ("trnsp_drv_cd", 3),
    # Additional Supports
    ("onght_care_spvs_cd", 3),
    ("empl_stat_cd", 3),
    ("wkshp_empl_flg", 1),
    ("indv_int_work_cmny_cd", 1),
    ("cmny_empl_flg", 1),
    ("voc_empl_flg", 1),
    ("home_empl_flg", 1),
    ("empl_asst_cd", 3),
    # Health Related Services
    ("bhv_itrvn_cd", 3),
    ("exrc_rng_motn_cd", 3),
    ("med_fld_flush_cd", 3),
    ("med_adm_cd", 3),
    ("pain_med_mgt_cd", 3),
    ("osty_cd", 3),
    ("chr_bed_posn_cd", 3),
    ("oxy_rspir_trtm_cd", 3),
    ("in_home_dlys_cd", 3),
    ("tot_prnt_ntrt_cd", 3),
    ("xfsn_cd", 3),
    ("trchos_cd", 3),
    ("tube_feed_cd", 3),
    ("ulcr_stg_2_cd", 3),
    ("ulcr_stg_3_4_cd", 3),
    ("urin_cath_cd", 3),
    ("othr_wnd_care_cd", 3),
    ("vent_itrvn_cd", 3),
    ("nurs_ases_cd", 3),
    ("othr_srvc_cd", 3),
    ("othr_srvc_txt", 75),
    ("skl_thrp_cd", 3),
    # Communication and Cognition
    ("comm_cd", 3),
    ("mem_ipar_flg", 1),
    ("shrt_term_mem_loss_flg", 1),
    ("uabl_to_rmbr_flg", 1),
    ("long_term_mem_loss_flg", 1),
    ("uabl_dter_txt", 75),
    ("dly_dcsn_make_cd", 3),
    ("phy_rsist_care_cd", 3),
    # Behaviors and Mental Health
    ("wndr_cd", 3),
    ("self_injr_bhv_cd", 3),
    ("ofns_bhv_to_othr_cd", 3),
    ("mntl_hlth_need_cd", 3),
    ("sbtnc_abus_flg", 1),
    ("sbtnc_abus_cur_flg", 1),
    ("sbtnc_abus_past_flg", 1),
    # Target Groups and Eligibility
    ("elg_calc_dt", 8),
]

# Header fields: (field_name, length)
HEADER_FIELDS: List[Tuple[str, int]] = [
    ("record_type", 3),       # "HDR"
    ("creation_date", 8),     # YYYYMMDD
    ("creation_time", 6),     # HHMMSS
    ("detail_record_count", 6),  # zero-padded count
]


class FsiaParserError(Exception):
    """Raised when the FSIA parser encounters an unrecoverable error."""

    def __init__(self, message: str, line_number: int = None, raw_text: str = None):
        self.line_number = line_number
        self.raw_text = raw_text
        super().__init__(message)


class IcdD12Parser(BaseParser):
    """
    Parses an ICD-D12 FSIA file (fixed-width space-delimited) into structured data.

    The parser reads the file line by line:
    - Line 1: HDR record (header with file metadata)
    - Lines 2+: DTL records (one per member)

    Fields are extracted by splitting on single-space delimiters and reading
    fixed-width positions.
    """

    def parse_file(self, filepath: str) -> ParsedFile:
        """Parse an FSIA .txt file from a local filesystem path."""
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        return self.parse_content(content, filename=filepath)

    def parse_content(self, content: str, filename: str = "unknown") -> ParsedFile:
        """Parse FSIA file content from a string."""
        parsed_file = ParsedFile(filename=filename)
        lines = content.splitlines()

        for line_number, raw_text in enumerate(lines, start=1):
            if not raw_text.strip():
                continue

            # Determine record type
            if raw_text.startswith("HDR"):
                record_type = "HDR"
            else:
                record_type = "DTL"

            source_line = SourceLine(
                line_number=line_number,
                raw_text=raw_text,
                record_type=record_type,
            )
            parsed_file.source_lines.append(source_line)

            if record_type == "HDR":
                parsed_file.header = self._parse_header(line_number, raw_text)
            else:
                detail = self._parse_detail(line_number, raw_text)
                parsed_file.members[detail.medicaid_id] = detail

        return parsed_file

    def _parse_header(self, line_number: int, raw_text: str) -> HeaderRecord:
        """Parse the HDR header record using fixed-width positions."""
        fields = self._extract_fixed_fields(raw_text, HEADER_FIELDS)
        return HeaderRecord(
            line_number=line_number,
            record_type=fields["record_type"],
            creation_date=fields["creation_date"],
            creation_time=fields["creation_time"],
            detail_record_count=fields["detail_record_count"],
        )

    def _parse_detail(self, line_number: int, raw_text: str) -> DetailRecord:
        """Parse a DTL detail record using fixed-width positions."""
        fields = self._extract_fixed_fields(raw_text, DETAIL_FIELDS)
        return DetailRecord(
            line_number=line_number,
            record_type="DTL",
            **fields,
        )

    def _extract_fixed_fields(self, raw_text: str, field_defs: List[Tuple[str, int]]) -> dict:
        """
        Extract fields from a fixed-width space-delimited line.

        Each field occupies exactly `length` characters, followed by a 1-character
        space delimiter (except the last field). Values are stripped of trailing spaces.
        """
        result = {}
        pos = 0

        for i, (field_name, length) in enumerate(field_defs):
            # Extract the field value at the current position
            end_pos = pos + length
            if pos < len(raw_text):
                value = raw_text[pos:min(end_pos, len(raw_text))]
                result[field_name] = value.rstrip()
            else:
                result[field_name] = ""

            # Skip past the field and the delimiter (1 space)
            pos = end_pos + 1  # +1 for the space delimiter

        return result
