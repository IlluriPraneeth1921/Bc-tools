"""
Data models for the ICD-D12 FSIA (Functional Screen / Initial Assessment) File.

Two record types:
- HeaderRecord (HDR): File metadata — creation date, time, record count
- DetailRecord (DTL): One per member — demographics + 60+ assessment fields

File is fixed-width space-delimited.
"""
from dataclasses import dataclass, field
from typing import Optional, List

from src.interfaces.base import BaseParsedFile


@dataclass
class SourceLine:
    """Represents a single line from the source FSIA file with traceability metadata."""
    line_number: int
    raw_text: str
    record_type: str  # "HDR" or "DTL"


@dataclass
class HeaderRecord:
    """HDR record — file metadata. One per file."""
    line_number: int
    record_type: str  # "HDR"
    creation_date: str  # YYYYMMDD
    creation_time: str  # HHMMSS
    detail_record_count: str  # 6 digits, zero-padded


@dataclass
class DetailRecord:
    """DTL detail record — one per member with full assessment data."""
    line_number: int
    record_type: str  # "DTL"
    # Demographics
    medicaid_id: str  # 10 chars — MCI ID
    first_name: str  # 20 chars
    last_name: str  # 20 chars
    middle_name: str  # 15 chars
    # Living Situation
    appl_pref_live_cd: str  # 3 chars
    gard_pref_live_cd: str  # 3 chars
    # ADLs (Activities of Daily Living)
    bath_help_cd: str  # 3 chars
    bath_adpv_eqp_cd: str  # 3 chars
    dres_help_cd: str  # 3 chars
    eat_help_cd: str  # 3 chars
    mbl_help_cd: str  # 3 chars
    mbl_adpv_eqp_cd: str  # 9 chars (multi-select)
    tlt_help_cd: str  # 3 chars
    tlt_adpv_eqp_cd: str  # 15 chars (multi-select)
    xfer_help_cd: str  # 3 chars
    xfer_adpv_eqp_cd: str  # 12 chars (multi-select)
    # IADLs (Instrumental Activities of Daily Living)
    meal_prep_help_lvl_cd: str  # 3 chars
    med_mgt_help_lvl_cd: str  # 3 chars
    mony_mgt_help_lvl_cd: str  # 3 chars
    ldry_chor_help_lvl_cd: str  # 3 chars
    phn_use_abty_cd: str  # 3 chars
    phn_acs_cd: str  # 3 chars
    trnsp_drv_cd: str  # 3 chars
    # Additional Supports
    onght_care_spvs_cd: str  # 3 chars
    empl_stat_cd: str  # 3 chars
    wkshp_empl_flg: str  # 1 char
    indv_int_work_cmny_cd: str  # 1 char
    cmny_empl_flg: str  # 1 char
    voc_empl_flg: str  # 1 char
    home_empl_flg: str  # 1 char
    empl_asst_cd: str  # 3 chars
    # Health Related Services
    bhv_itrvn_cd: str  # 3 chars
    exrc_rng_motn_cd: str  # 3 chars
    med_fld_flush_cd: str  # 3 chars
    med_adm_cd: str  # 3 chars
    pain_med_mgt_cd: str  # 3 chars
    osty_cd: str  # 3 chars
    chr_bed_posn_cd: str  # 3 chars
    oxy_rspir_trtm_cd: str  # 3 chars
    in_home_dlys_cd: str  # 3 chars
    tot_prnt_ntrt_cd: str  # 3 chars
    xfsn_cd: str  # 3 chars
    trchos_cd: str  # 3 chars
    tube_feed_cd: str  # 3 chars
    ulcr_stg_2_cd: str  # 3 chars
    ulcr_stg_3_4_cd: str  # 3 chars
    urin_cath_cd: str  # 3 chars
    othr_wnd_care_cd: str  # 3 chars
    vent_itrvn_cd: str  # 3 chars
    nurs_ases_cd: str  # 3 chars
    othr_srvc_cd: str  # 3 chars
    othr_srvc_txt: str  # 75 chars
    skl_thrp_cd: str  # 3 chars
    # Communication and Cognition
    comm_cd: str  # 3 chars
    mem_ipar_flg: str  # 1 char
    shrt_term_mem_loss_flg: str  # 1 char
    uabl_to_rmbr_flg: str  # 1 char
    long_term_mem_loss_flg: str  # 1 char
    uabl_dter_txt: str  # 75 chars
    dly_dcsn_make_cd: str  # 3 chars
    phy_rsist_care_cd: str  # 3 chars
    # Behaviors and Mental Health
    wndr_cd: str  # 3 chars
    self_injr_bhv_cd: str  # 3 chars
    ofns_bhv_to_othr_cd: str  # 3 chars
    mntl_hlth_need_cd: str  # 3 chars
    sbtnc_abus_flg: str  # 1 char
    sbtnc_abus_cur_flg: str  # 1 char
    sbtnc_abus_past_flg: str  # 1 char
    # Target Groups and Eligibility
    elg_calc_dt: str  # 8 chars YYYYMMDD


@dataclass
class ParsedFile(BaseParsedFile):
    """Complete parsed representation of an FSIA file."""
    header: Optional[HeaderRecord] = None
    members: dict = field(default_factory=dict)  # Medicaid ID → DetailRecord

    @property
    def record_count(self) -> int:
        """Total detail records."""
        return len(self.members)

    @property
    def entity_count(self) -> int:
        """Number of distinct members."""
        return len(self.members)

    @property
    def entity_ids(self) -> List[str]:
        """List of Medicaid IDs."""
        return list(self.members.keys())
