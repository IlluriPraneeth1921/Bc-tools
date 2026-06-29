"""
Generate ICD-D12 FSIA test data files based on the specification.

File format: Fixed-width fields separated by single space delimiter.
- HDR record: HDR + date(8) + time(6) + record_count(6)
- DTL records: Medicaid_ID(10) + First_Name(20) + Last_Name(20) + Middle_Name(15) + data fields...

All fields are space-padded to their defined length.
"""
import os

# Field definitions: (field_name, length)
# Based on the ICD-D12 FSIA File Mapping specification
DETAIL_FIELDS = [
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


def pad_field(value: str, length: int) -> str:
    """Right-pad a value with spaces to the specified length."""
    return value.ljust(length)[:length]


def build_header(date: str, time: str, record_count: int) -> str:
    """Build an HDR record."""
    parts = [
        pad_field("HDR", 3),
        pad_field(date, 8),
        pad_field(time, 6),
        pad_field(str(record_count).zfill(6), 6),
    ]
    return " ".join(parts)


def build_detail(fields: dict) -> str:
    """Build a DTL record from a dict of field values."""
    parts = []
    for field_name, length in DETAIL_FIELDS:
        value = fields.get(field_name, "")
        parts.append(pad_field(value, length))
    return " ".join(parts)


def generate_baseline():
    """Generate baseline test file with 3 members."""
    members = [
        {
            "medicaid_id": "0000000001",
            "first_name": "John",
            "last_name": "Smith",
            "middle_name": "M",
            "appl_pref_live_cd": "024",
            "gard_pref_live_cd": "001",
            "bath_help_cd": "001",
            "bath_adpv_eqp_cd": "005",
            "dres_help_cd": "001",
            "eat_help_cd": "001",
            "mbl_help_cd": "002",
            "mbl_adpv_eqp_cd": "002003007",
            "tlt_help_cd": "001",
            "tlt_adpv_eqp_cd": "002003",
            "xfer_help_cd": "002",
            "xfer_adpv_eqp_cd": "001002003004",
            "meal_prep_help_lvl_cd": "002",
            "med_mgt_help_lvl_cd": "003",
            "mony_mgt_help_lvl_cd": "001",
            "ldry_chor_help_lvl_cd": "002",
            "phn_use_abty_cd": "002",
            "phn_acs_cd": "001",
            "trnsp_drv_cd": "005",
            "onght_care_spvs_cd": "001",
            "empl_stat_cd": "001",
            "wkshp_empl_flg": "0",
            "indv_int_work_cmny_cd": "0",
            "cmny_empl_flg": "0",
            "voc_empl_flg": "0",
            "home_empl_flg": "0",
            "empl_asst_cd": "001",
            "bhv_itrvn_cd": "001",
            "exrc_rng_motn_cd": "001",
            "med_fld_flush_cd": "000",
            "med_adm_cd": "001",
            "pain_med_mgt_cd": "001",
            "osty_cd": "000",
            "chr_bed_posn_cd": "000",
            "oxy_rspir_trtm_cd": "000",
            "in_home_dlys_cd": "000",
            "tot_prnt_ntrt_cd": "000",
            "xfsn_cd": "000",
            "trchos_cd": "000",
            "tube_feed_cd": "000",
            "ulcr_stg_2_cd": "000",
            "ulcr_stg_3_4_cd": "000",
            "urin_cath_cd": "000",
            "othr_wnd_care_cd": "000",
            "vent_itrvn_cd": "000",
            "nurs_ases_cd": "001",
            "othr_srvc_cd": "000",
            "othr_srvc_txt": "",
            "skl_thrp_cd": "001",
            "comm_cd": "001",
            "mem_ipar_flg": "1",
            "shrt_term_mem_loss_flg": "1",
            "uabl_to_rmbr_flg": "0",
            "long_term_mem_loss_flg": "0",
            "uabl_dter_txt": "",
            "dly_dcsn_make_cd": "001",
            "phy_rsist_care_cd": "000",
            "wndr_cd": "001",
            "self_injr_bhv_cd": "000",
            "ofns_bhv_to_othr_cd": "000",
            "mntl_hlth_need_cd": "001",
            "sbtnc_abus_flg": "0",
            "sbtnc_abus_cur_flg": "0",
            "sbtnc_abus_past_flg": "0",
            "elg_calc_dt": "20260115",
        },
        {
            "medicaid_id": "0000000002",
            "first_name": "Mary",
            "last_name": "Johnson",
            "middle_name": "A",
            "appl_pref_live_cd": "025",
            "gard_pref_live_cd": "002",
            "bath_help_cd": "002",
            "bath_adpv_eqp_cd": "",
            "dres_help_cd": "002",
            "eat_help_cd": "000",
            "mbl_help_cd": "001",
            "mbl_adpv_eqp_cd": "003",
            "tlt_help_cd": "000",
            "tlt_adpv_eqp_cd": "",
            "xfer_help_cd": "001",
            "xfer_adpv_eqp_cd": "002",
            "meal_prep_help_lvl_cd": "003",
            "med_mgt_help_lvl_cd": "005",
            "mony_mgt_help_lvl_cd": "002",
            "ldry_chor_help_lvl_cd": "002",
            "phn_use_abty_cd": "001",
            "phn_acs_cd": "002",
            "trnsp_drv_cd": "006",
            "onght_care_spvs_cd": "002",
            "empl_stat_cd": "002",
            "wkshp_empl_flg": "0",
            "indv_int_work_cmny_cd": "1",
            "cmny_empl_flg": "0",
            "voc_empl_flg": "0",
            "home_empl_flg": "0",
            "empl_asst_cd": "002",
            "bhv_itrvn_cd": "002",
            "exrc_rng_motn_cd": "001",
            "med_fld_flush_cd": "000",
            "med_adm_cd": "002",
            "pain_med_mgt_cd": "001",
            "osty_cd": "000",
            "chr_bed_posn_cd": "001",
            "oxy_rspir_trtm_cd": "001",
            "in_home_dlys_cd": "000",
            "tot_prnt_ntrt_cd": "000",
            "xfsn_cd": "000",
            "trchos_cd": "000",
            "tube_feed_cd": "000",
            "ulcr_stg_2_cd": "001",
            "ulcr_stg_3_4_cd": "000",
            "urin_cath_cd": "000",
            "othr_wnd_care_cd": "001",
            "vent_itrvn_cd": "000",
            "nurs_ases_cd": "001",
            "othr_srvc_cd": "000",
            "othr_srvc_txt": "",
            "skl_thrp_cd": "002",
            "comm_cd": "002",
            "mem_ipar_flg": "1",
            "shrt_term_mem_loss_flg": "0",
            "uabl_to_rmbr_flg": "1",
            "long_term_mem_loss_flg": "1",
            "uabl_dter_txt": "",
            "dly_dcsn_make_cd": "002",
            "phy_rsist_care_cd": "001",
            "wndr_cd": "002",
            "self_injr_bhv_cd": "001",
            "ofns_bhv_to_othr_cd": "001",
            "mntl_hlth_need_cd": "002",
            "sbtnc_abus_flg": "1",
            "sbtnc_abus_cur_flg": "1",
            "sbtnc_abus_past_flg": "0",
            "elg_calc_dt": "20260210",
        },
        {
            "medicaid_id": "0000000003",
            "first_name": "Robert",
            "last_name": "Williams",
            "middle_name": "J",
            "appl_pref_live_cd": "026",
            "gard_pref_live_cd": "003",
            "bath_help_cd": "000",
            "bath_adpv_eqp_cd": "",
            "dres_help_cd": "000",
            "eat_help_cd": "000",
            "mbl_help_cd": "000",
            "mbl_adpv_eqp_cd": "",
            "tlt_help_cd": "000",
            "tlt_adpv_eqp_cd": "",
            "xfer_help_cd": "000",
            "xfer_adpv_eqp_cd": "",
            "meal_prep_help_lvl_cd": "000",
            "med_mgt_help_lvl_cd": "002",
            "mony_mgt_help_lvl_cd": "000",
            "ldry_chor_help_lvl_cd": "000",
            "phn_use_abty_cd": "001",
            "phn_acs_cd": "001",
            "trnsp_drv_cd": "001",
            "onght_care_spvs_cd": "000",
            "empl_stat_cd": "003",
            "wkshp_empl_flg": "0",
            "indv_int_work_cmny_cd": "0",
            "cmny_empl_flg": "1",
            "voc_empl_flg": "0",
            "home_empl_flg": "0",
            "empl_asst_cd": "000",
            "bhv_itrvn_cd": "000",
            "exrc_rng_motn_cd": "000",
            "med_fld_flush_cd": "000",
            "med_adm_cd": "000",
            "pain_med_mgt_cd": "000",
            "osty_cd": "000",
            "chr_bed_posn_cd": "000",
            "oxy_rspir_trtm_cd": "000",
            "in_home_dlys_cd": "000",
            "tot_prnt_ntrt_cd": "000",
            "xfsn_cd": "000",
            "trchos_cd": "000",
            "tube_feed_cd": "000",
            "ulcr_stg_2_cd": "000",
            "ulcr_stg_3_4_cd": "000",
            "urin_cath_cd": "000",
            "othr_wnd_care_cd": "000",
            "vent_itrvn_cd": "000",
            "nurs_ases_cd": "000",
            "othr_srvc_cd": "001",
            "othr_srvc_txt": "Needs specialized wound care per doctor orders",
            "skl_thrp_cd": "001",
            "comm_cd": "001",
            "mem_ipar_flg": "0",
            "shrt_term_mem_loss_flg": "0",
            "uabl_to_rmbr_flg": "0",
            "long_term_mem_loss_flg": "0",
            "uabl_dter_txt": "",
            "dly_dcsn_make_cd": "000",
            "phy_rsist_care_cd": "000",
            "wndr_cd": "000",
            "self_injr_bhv_cd": "000",
            "ofns_bhv_to_othr_cd": "000",
            "mntl_hlth_need_cd": "000",
            "sbtnc_abus_flg": "0",
            "sbtnc_abus_cur_flg": "0",
            "sbtnc_abus_past_flg": "0",
            "elg_calc_dt": "20260305",
        },
    ]

    lines = [build_header("20260618", "103000", len(members))]
    for m in members:
        lines.append(build_detail(m))

    return "\n".join(lines)


def generate_max_lengths():
    """Generate test file with maximum field lengths."""
    member = {
        "medicaid_id": "9999999999",
        "first_name": "Alexandriaaaaaaaaaaaa",  # 20 chars
        "last_name": "Konstantinopoulosssss",  # 20 chars (truncated to 20)
        "middle_name": "Marie Elizabeth",  # 15 chars
        "appl_pref_live_cd": "031",
        "gard_pref_live_cd": "009",
        "bath_help_cd": "002",
        "bath_adpv_eqp_cd": "005",
        "dres_help_cd": "002",
        "eat_help_cd": "002",
        "mbl_help_cd": "002",
        "mbl_adpv_eqp_cd": "002003007",
        "tlt_help_cd": "002",
        "tlt_adpv_eqp_cd": "002003004005006",  # 15 chars max
        "xfer_help_cd": "002",
        "xfer_adpv_eqp_cd": "001002003004",  # 12 chars max
        "meal_prep_help_lvl_cd": "003",
        "med_mgt_help_lvl_cd": "006",
        "mony_mgt_help_lvl_cd": "002",
        "ldry_chor_help_lvl_cd": "002",
        "phn_use_abty_cd": "002",
        "phn_acs_cd": "002",
        "trnsp_drv_cd": "006",
        "onght_care_spvs_cd": "002",
        "empl_stat_cd": "003",
        "wkshp_empl_flg": "1",
        "indv_int_work_cmny_cd": "1",
        "cmny_empl_flg": "1",
        "voc_empl_flg": "1",
        "home_empl_flg": "1",
        "empl_asst_cd": "003",
        "bhv_itrvn_cd": "003",
        "exrc_rng_motn_cd": "002",
        "med_fld_flush_cd": "002",
        "med_adm_cd": "002",
        "pain_med_mgt_cd": "002",
        "osty_cd": "002",
        "chr_bed_posn_cd": "002",
        "oxy_rspir_trtm_cd": "002",
        "in_home_dlys_cd": "002",
        "tot_prnt_ntrt_cd": "002",
        "xfsn_cd": "002",
        "trchos_cd": "002",
        "tube_feed_cd": "002",
        "ulcr_stg_2_cd": "002",
        "ulcr_stg_3_4_cd": "002",
        "urin_cath_cd": "002",
        "othr_wnd_care_cd": "002",
        "vent_itrvn_cd": "002",
        "nurs_ases_cd": "002",
        "othr_srvc_cd": "001",
        "othr_srvc_txt": "This is a maximum length other service text field that goes up to seventy-five",
        "skl_thrp_cd": "003",
        "comm_cd": "003",
        "mem_ipar_flg": "1",
        "shrt_term_mem_loss_flg": "1",
        "uabl_to_rmbr_flg": "1",
        "long_term_mem_loss_flg": "1",
        "uabl_dter_txt": "Unable to determine due to advanced dementia and lack of reliable informant av",
        "dly_dcsn_make_cd": "003",
        "phy_rsist_care_cd": "002",
        "wndr_cd": "003",
        "self_injr_bhv_cd": "003",
        "ofns_bhv_to_othr_cd": "003",
        "mntl_hlth_need_cd": "003",
        "sbtnc_abus_flg": "1",
        "sbtnc_abus_cur_flg": "1",
        "sbtnc_abus_past_flg": "1",
        "elg_calc_dt": "20261231",
    }

    lines = [build_header("20260618", "103000", 1)]
    lines.append(build_detail(member))
    return "\n".join(lines)


def generate_min_empty():
    """Generate test file with minimal/empty optional fields."""
    member = {
        "medicaid_id": "0000000010",
        "first_name": "A",
        "last_name": "",
        "middle_name": "",
        "appl_pref_live_cd": "",
        "gard_pref_live_cd": "",
        "bath_help_cd": "",
        "bath_adpv_eqp_cd": "",
        "dres_help_cd": "",
        "eat_help_cd": "",
        "mbl_help_cd": "",
        "mbl_adpv_eqp_cd": "",
        "tlt_help_cd": "",
        "tlt_adpv_eqp_cd": "",
        "xfer_help_cd": "",
        "xfer_adpv_eqp_cd": "",
        "meal_prep_help_lvl_cd": "",
        "med_mgt_help_lvl_cd": "",
        "mony_mgt_help_lvl_cd": "",
        "ldry_chor_help_lvl_cd": "",
        "phn_use_abty_cd": "",
        "phn_acs_cd": "",
        "trnsp_drv_cd": "",
        "onght_care_spvs_cd": "",
        "empl_stat_cd": "",
        "wkshp_empl_flg": "",
        "indv_int_work_cmny_cd": "",
        "cmny_empl_flg": "",
        "voc_empl_flg": "",
        "home_empl_flg": "",
        "empl_asst_cd": "",
        "bhv_itrvn_cd": "",
        "exrc_rng_motn_cd": "",
        "med_fld_flush_cd": "",
        "med_adm_cd": "",
        "pain_med_mgt_cd": "",
        "osty_cd": "",
        "chr_bed_posn_cd": "",
        "oxy_rspir_trtm_cd": "",
        "in_home_dlys_cd": "",
        "tot_prnt_ntrt_cd": "",
        "xfsn_cd": "",
        "trchos_cd": "",
        "tube_feed_cd": "",
        "ulcr_stg_2_cd": "",
        "ulcr_stg_3_4_cd": "",
        "urin_cath_cd": "",
        "othr_wnd_care_cd": "",
        "vent_itrvn_cd": "",
        "nurs_ases_cd": "",
        "othr_srvc_cd": "",
        "othr_srvc_txt": "",
        "skl_thrp_cd": "",
        "comm_cd": "",
        "mem_ipar_flg": "",
        "shrt_term_mem_loss_flg": "",
        "uabl_to_rmbr_flg": "",
        "long_term_mem_loss_flg": "",
        "uabl_dter_txt": "",
        "dly_dcsn_make_cd": "",
        "phy_rsist_care_cd": "",
        "wndr_cd": "",
        "self_injr_bhv_cd": "",
        "ofns_bhv_to_othr_cd": "",
        "mntl_hlth_need_cd": "",
        "sbtnc_abus_flg": "",
        "sbtnc_abus_cur_flg": "",
        "sbtnc_abus_past_flg": "",
        "elg_calc_dt": "20260101",
    }

    lines = [build_header("20260618", "103000", 1)]
    lines.append(build_detail(member))
    return "\n".join(lines)



# ─── Additional test scenario generators ─────────────────────────────────────

def _baseline_member_1():
    """Member 1: moderate ADL needs, memory impairment."""
    return {
        "medicaid_id": "0000000001", "first_name": "John", "last_name": "Smith", "middle_name": "M",
        "appl_pref_live_cd": "024", "gard_pref_live_cd": "001",
        "bath_help_cd": "001", "bath_adpv_eqp_cd": "005", "dres_help_cd": "001", "eat_help_cd": "001",
        "mbl_help_cd": "002", "mbl_adpv_eqp_cd": "002003007", "tlt_help_cd": "001",
        "tlt_adpv_eqp_cd": "002003", "xfer_help_cd": "002", "xfer_adpv_eqp_cd": "001002003004",
        "meal_prep_help_lvl_cd": "002", "med_mgt_help_lvl_cd": "003", "mony_mgt_help_lvl_cd": "001",
        "ldry_chor_help_lvl_cd": "002", "phn_use_abty_cd": "002", "phn_acs_cd": "001", "trnsp_drv_cd": "005",
        "onght_care_spvs_cd": "001", "empl_stat_cd": "001",
        "wkshp_empl_flg": "0", "indv_int_work_cmny_cd": "0", "cmny_empl_flg": "0", "voc_empl_flg": "0", "home_empl_flg": "0",
        "empl_asst_cd": "001",
        "bhv_itrvn_cd": "001", "exrc_rng_motn_cd": "001", "med_fld_flush_cd": "000", "med_adm_cd": "001",
        "pain_med_mgt_cd": "001", "osty_cd": "000", "chr_bed_posn_cd": "000", "oxy_rspir_trtm_cd": "000",
        "in_home_dlys_cd": "000", "tot_prnt_ntrt_cd": "000", "xfsn_cd": "000", "trchos_cd": "000",
        "tube_feed_cd": "000", "ulcr_stg_2_cd": "000", "ulcr_stg_3_4_cd": "000", "urin_cath_cd": "000",
        "othr_wnd_care_cd": "000", "vent_itrvn_cd": "000", "nurs_ases_cd": "001", "othr_srvc_cd": "000",
        "othr_srvc_txt": "", "skl_thrp_cd": "001",
        "comm_cd": "001", "mem_ipar_flg": "1", "shrt_term_mem_loss_flg": "1", "uabl_to_rmbr_flg": "0",
        "long_term_mem_loss_flg": "0", "uabl_dter_txt": "", "dly_dcsn_make_cd": "001", "phy_rsist_care_cd": "000",
        "wndr_cd": "001", "self_injr_bhv_cd": "000", "ofns_bhv_to_othr_cd": "000", "mntl_hlth_need_cd": "001",
        "sbtnc_abus_flg": "0", "sbtnc_abus_cur_flg": "0", "sbtnc_abus_past_flg": "0",
        "elg_calc_dt": "20260115",
    }


def _baseline_member_2():
    """Member 2: high needs, substance abuse, overnight supervision."""
    return {
        "medicaid_id": "0000000002", "first_name": "Mary", "last_name": "Johnson", "middle_name": "A",
        "appl_pref_live_cd": "025", "gard_pref_live_cd": "002",
        "bath_help_cd": "002", "bath_adpv_eqp_cd": "", "dres_help_cd": "002", "eat_help_cd": "000",
        "mbl_help_cd": "001", "mbl_adpv_eqp_cd": "003", "tlt_help_cd": "000",
        "tlt_adpv_eqp_cd": "", "xfer_help_cd": "001", "xfer_adpv_eqp_cd": "002",
        "meal_prep_help_lvl_cd": "003", "med_mgt_help_lvl_cd": "005", "mony_mgt_help_lvl_cd": "002",
        "ldry_chor_help_lvl_cd": "002", "phn_use_abty_cd": "001", "phn_acs_cd": "002", "trnsp_drv_cd": "006",
        "onght_care_spvs_cd": "002", "empl_stat_cd": "002",
        "wkshp_empl_flg": "0", "indv_int_work_cmny_cd": "1", "cmny_empl_flg": "0", "voc_empl_flg": "0", "home_empl_flg": "0",
        "empl_asst_cd": "002",
        "bhv_itrvn_cd": "002", "exrc_rng_motn_cd": "001", "med_fld_flush_cd": "000", "med_adm_cd": "002",
        "pain_med_mgt_cd": "001", "osty_cd": "000", "chr_bed_posn_cd": "001", "oxy_rspir_trtm_cd": "001",
        "in_home_dlys_cd": "000", "tot_prnt_ntrt_cd": "000", "xfsn_cd": "000", "trchos_cd": "000",
        "tube_feed_cd": "000", "ulcr_stg_2_cd": "001", "ulcr_stg_3_4_cd": "000", "urin_cath_cd": "000",
        "othr_wnd_care_cd": "001", "vent_itrvn_cd": "000", "nurs_ases_cd": "001", "othr_srvc_cd": "000",
        "othr_srvc_txt": "", "skl_thrp_cd": "002",
        "comm_cd": "002", "mem_ipar_flg": "1", "shrt_term_mem_loss_flg": "0", "uabl_to_rmbr_flg": "1",
        "long_term_mem_loss_flg": "1", "uabl_dter_txt": "", "dly_dcsn_make_cd": "002", "phy_rsist_care_cd": "001",
        "wndr_cd": "002", "self_injr_bhv_cd": "001", "ofns_bhv_to_othr_cd": "001", "mntl_hlth_need_cd": "002",
        "sbtnc_abus_flg": "1", "sbtnc_abus_cur_flg": "1", "sbtnc_abus_past_flg": "0",
        "elg_calc_dt": "20260210",
    }


def _baseline_member_3():
    """Member 3: independent, employed, wound care."""
    return {
        "medicaid_id": "0000000003", "first_name": "Robert", "last_name": "Williams", "middle_name": "J",
        "appl_pref_live_cd": "026", "gard_pref_live_cd": "003",
        "bath_help_cd": "000", "bath_adpv_eqp_cd": "", "dres_help_cd": "000", "eat_help_cd": "000",
        "mbl_help_cd": "000", "mbl_adpv_eqp_cd": "", "tlt_help_cd": "000",
        "tlt_adpv_eqp_cd": "", "xfer_help_cd": "000", "xfer_adpv_eqp_cd": "",
        "meal_prep_help_lvl_cd": "000", "med_mgt_help_lvl_cd": "002", "mony_mgt_help_lvl_cd": "000",
        "ldry_chor_help_lvl_cd": "000", "phn_use_abty_cd": "001", "phn_acs_cd": "001", "trnsp_drv_cd": "001",
        "onght_care_spvs_cd": "000", "empl_stat_cd": "003",
        "wkshp_empl_flg": "0", "indv_int_work_cmny_cd": "0", "cmny_empl_flg": "1", "voc_empl_flg": "0", "home_empl_flg": "0",
        "empl_asst_cd": "000",
        "bhv_itrvn_cd": "000", "exrc_rng_motn_cd": "000", "med_fld_flush_cd": "000", "med_adm_cd": "000",
        "pain_med_mgt_cd": "000", "osty_cd": "000", "chr_bed_posn_cd": "000", "oxy_rspir_trtm_cd": "000",
        "in_home_dlys_cd": "000", "tot_prnt_ntrt_cd": "000", "xfsn_cd": "000", "trchos_cd": "000",
        "tube_feed_cd": "000", "ulcr_stg_2_cd": "000", "ulcr_stg_3_4_cd": "000", "urin_cath_cd": "000",
        "othr_wnd_care_cd": "000", "vent_itrvn_cd": "000", "nurs_ases_cd": "000", "othr_srvc_cd": "001",
        "othr_srvc_txt": "Needs specialized wound care per doctor orders", "skl_thrp_cd": "001",
        "comm_cd": "001", "mem_ipar_flg": "0", "shrt_term_mem_loss_flg": "0", "uabl_to_rmbr_flg": "0",
        "long_term_mem_loss_flg": "0", "uabl_dter_txt": "", "dly_dcsn_make_cd": "000", "phy_rsist_care_cd": "000",
        "wndr_cd": "000", "self_injr_bhv_cd": "000", "ofns_bhv_to_othr_cd": "000", "mntl_hlth_need_cd": "000",
        "sbtnc_abus_flg": "0", "sbtnc_abus_cur_flg": "0", "sbtnc_abus_past_flg": "0",
        "elg_calc_dt": "20260305",
    }


def generate_03_all_adl_combinations():
    """Test all ADL help code combinations — triggers personal care Yes/No boundary."""
    members = [
        # All independent → Personal Care = No
        {**_baseline_member_3(), "medicaid_id": "0000000011", "first_name": "Alice", "last_name": "Independent",
         "bath_help_cd": "000", "dres_help_cd": "000", "eat_help_cd": "000",
         "mbl_help_cd": "000", "tlt_help_cd": "000", "xfer_help_cd": "000"},
        # Only bathing=001 → Personal Care = Yes
        {**_baseline_member_3(), "medicaid_id": "0000000012", "first_name": "Bob", "last_name": "BathOnly",
         "bath_help_cd": "001", "dres_help_cd": "000", "eat_help_cd": "000",
         "mbl_help_cd": "000", "tlt_help_cd": "000", "xfer_help_cd": "000"},
        # All max help (002) → Personal Care = Yes
        {**_baseline_member_3(), "medicaid_id": "0000000013", "first_name": "Carol", "last_name": "MaxHelp",
         "bath_help_cd": "002", "dres_help_cd": "002", "eat_help_cd": "002",
         "mbl_help_cd": "002", "tlt_help_cd": "002", "xfer_help_cd": "002"},
    ]
    lines = [build_header("20260618", "110000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_04_boundary_dates():
    """Test eligibility date edge cases."""
    members = [
        {**_baseline_member_1(), "medicaid_id": "0000000021", "elg_calc_dt": "20260101"},  # Jan 1
        {**_baseline_member_1(), "medicaid_id": "0000000022", "elg_calc_dt": "20261231"},  # Dec 31
        {**_baseline_member_1(), "medicaid_id": "0000000023", "elg_calc_dt": "20260229"},  # Leap day (not valid 2026)
        {**_baseline_member_1(), "medicaid_id": "0000000024", "elg_calc_dt": "20240229"},  # Leap day (valid 2024)
    ]
    lines = [build_header("20260618", "120000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_05_all_codes():
    """Exercise all possible code values for key fields."""
    members = [
        {**_baseline_member_1(), "medicaid_id": "0000000031", "appl_pref_live_cd": "024", "trnsp_drv_cd": "001", "empl_stat_cd": "001"},
        {**_baseline_member_1(), "medicaid_id": "0000000032", "appl_pref_live_cd": "025", "trnsp_drv_cd": "002", "empl_stat_cd": "002"},
        {**_baseline_member_1(), "medicaid_id": "0000000033", "appl_pref_live_cd": "026", "trnsp_drv_cd": "003", "empl_stat_cd": "003"},
        {**_baseline_member_1(), "medicaid_id": "0000000034", "appl_pref_live_cd": "027", "trnsp_drv_cd": "004"},
        {**_baseline_member_1(), "medicaid_id": "0000000035", "appl_pref_live_cd": "028", "trnsp_drv_cd": "005"},
        {**_baseline_member_1(), "medicaid_id": "0000000036", "appl_pref_live_cd": "029", "trnsp_drv_cd": "006"},
        {**_baseline_member_1(), "medicaid_id": "0000000037", "appl_pref_live_cd": "030"},
        {**_baseline_member_1(), "medicaid_id": "0000000038", "appl_pref_live_cd": "031"},
    ]
    lines = [build_header("20260618", "130000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_06_composite_rule_scenarios():
    """Test composite business rules: supportive home care, DME, med admin, transport."""
    members = [
        # Supportive home care: only memory flag triggers
        {**_baseline_member_3(), "medicaid_id": "0000000041", "first_name": "MemOnly", "last_name": "Test",
         "mem_ipar_flg": "1", "meal_prep_help_lvl_cd": "000", "ldry_chor_help_lvl_cd": "000"},
        # Supportive home care: only phone access triggers
        {**_baseline_member_3(), "medicaid_id": "0000000042", "first_name": "PhoneOnly", "last_name": "Test",
         "phn_acs_cd": "002", "mem_ipar_flg": "0"},
        # Med admin: code 005 triggers Yes
        {**_baseline_member_3(), "medicaid_id": "0000000043", "first_name": "MedFive", "last_name": "Test",
         "med_mgt_help_lvl_cd": "005"},
        # Med admin: code 006 triggers Yes
        {**_baseline_member_3(), "medicaid_id": "0000000044", "first_name": "MedSix", "last_name": "Test",
         "med_mgt_help_lvl_cd": "006"},
        # Med admin: code 001 (no meds) → No
        {**_baseline_member_3(), "medicaid_id": "0000000045", "first_name": "NoMeds", "last_name": "Test",
         "med_mgt_help_lvl_cd": "001"},
        # Transport: code 003 (safety concerns) → Yes
        {**_baseline_member_3(), "medicaid_id": "0000000046", "first_name": "SafetyConcern", "last_name": "Test",
         "trnsp_drv_cd": "003"},
        # DME: mobility equipment only
        {**_baseline_member_3(), "medicaid_id": "0000000047", "first_name": "MobEquip", "last_name": "Test",
         "mbl_adpv_eqp_cd": "007"},
    ]
    lines = [build_header("20260618", "140000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_07_special_chars():
    """Test special characters in text fields."""
    members = [
        {**_baseline_member_1(), "medicaid_id": "0000000051", "first_name": "O'Brien", "last_name": "McDonald-Smith",
         "othr_srvc_cd": "001", "othr_srvc_txt": "Pt needs 24/7 care; wound care (stage 3) & PT/OT services"},
        {**_baseline_member_1(), "medicaid_id": "0000000052", "first_name": "Jose", "last_name": "Garcia",
         "uabl_dter_txt": "Unable to determine - client non-verbal; interpreter needed (Hmong)"},
    ]
    lines = [build_header("20260618", "150000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_08_large_volume():
    """Generate 50 members for volume testing."""
    members = []
    for i in range(1, 51):
        m = {**_baseline_member_1()}
        m["medicaid_id"] = f"00000001{i:02d}"
        m["first_name"] = f"Member{i:02d}"
        m["last_name"] = f"Volume{i:02d}"
        # Vary some fields
        m["bath_help_cd"] = f"00{i % 3}"
        m["elg_calc_dt"] = f"2026{(i % 12) + 1:02d}{(i % 28) + 1:02d}"
        members.append(m)
    lines = [build_header("20260618", "160000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_upd01_adl_changes():
    """Update: ADL levels increased for member 1 (condition worsened)."""
    m1 = _baseline_member_1()
    m1["bath_help_cd"] = "002"  # was 001
    m1["dres_help_cd"] = "002"  # was 001
    m1["mbl_help_cd"] = "002"   # was 002 (no change)
    m1["xfer_help_cd"] = "002"  # was 002 (no change)
    m1["mbl_adpv_eqp_cd"] = "002003007"  # added all equipment
    members = [m1, _baseline_member_2(), _baseline_member_3()]
    lines = [build_header("20260619", "103000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_upd02_employment_changes():
    """Update: Member 3 employment status changed (gained work)."""
    m3 = _baseline_member_3()
    m3["empl_stat_cd"] = "001"  # was 003
    m3["wkshp_empl_flg"] = "1"  # was 0
    m3["cmny_empl_flg"] = "0"   # was 1
    m3["empl_asst_cd"] = "002"  # was 000
    members = [_baseline_member_1(), _baseline_member_2(), m3]
    lines = [build_header("20260619", "110000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_upd03_health_services_changes():
    """Update: Member 2 gains new health service needs."""
    m2 = _baseline_member_2()
    m2["in_home_dlys_cd"] = "002"   # was 000 → now needs dialysis
    m2["tube_feed_cd"] = "001"      # was 000 → now needs tube feeding
    m2["trchos_cd"] = "001"         # was 000 → tracheostomy care
    m2["oxy_rspir_trtm_cd"] = "002" # was 001 → increased
    members = [_baseline_member_1(), m2, _baseline_member_3()]
    lines = [build_header("20260619", "120000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_upd04_cognition_changes():
    """Update: Member 1 cognition deteriorated."""
    m1 = _baseline_member_1()
    m1["mem_ipar_flg"] = "1"
    m1["shrt_term_mem_loss_flg"] = "1"
    m1["uabl_to_rmbr_flg"] = "1"       # was 0
    m1["long_term_mem_loss_flg"] = "1"  # was 0
    m1["dly_dcsn_make_cd"] = "003"      # was 001 → worse
    m1["wndr_cd"] = "003"              # was 001 → worse
    m1["uabl_dter_txt"] = "Progressive dementia noted by care team"
    members = [m1, _baseline_member_2(), _baseline_member_3()]
    lines = [build_header("20260620", "103000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_upd05_eligibility_date_change():
    """Update: All members get new eligibility dates (re-assessment)."""
    m1 = _baseline_member_1()
    m1["elg_calc_dt"] = "20260701"
    m2 = _baseline_member_2()
    m2["elg_calc_dt"] = "20260701"
    m3 = _baseline_member_3()
    m3["elg_calc_dt"] = "20260701"
    members = [m1, m2, m3]
    lines = [build_header("20260701", "103000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_upd06_new_members():
    """Update: Two new members added to the file."""
    m4 = {**_baseline_member_1(), "medicaid_id": "0000000004", "first_name": "Susan", "last_name": "Davis", "middle_name": "K",
          "elg_calc_dt": "20260615"}
    m5 = {**_baseline_member_2(), "medicaid_id": "0000000005", "first_name": "Thomas", "last_name": "Anderson", "middle_name": "",
          "elg_calc_dt": "20260615"}
    members = [_baseline_member_1(), _baseline_member_2(), _baseline_member_3(), m4, m5]
    lines = [build_header("20260620", "110000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_del01_member_removed():
    """Delete: Member 2 removed from file entirely."""
    members = [_baseline_member_1(), _baseline_member_3()]
    lines = [build_header("20260621", "103000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_del02_services_cleared():
    """Delete: Member 1 has all health services cleared (no longer needed)."""
    m1 = _baseline_member_1()
    m1["bhv_itrvn_cd"] = "000"
    m1["exrc_rng_motn_cd"] = "000"
    m1["med_adm_cd"] = "000"
    m1["pain_med_mgt_cd"] = "000"
    m1["nurs_ases_cd"] = "000"
    m1["skl_thrp_cd"] = "000"
    m1["othr_srvc_cd"] = "000"
    m1["othr_srvc_txt"] = ""
    members = [m1, _baseline_member_2(), _baseline_member_3()]
    lines = [build_header("20260621", "110000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_del03_multiple_members_removed():
    """Delete: Members 2 and 3 removed, only member 1 remains."""
    members = [_baseline_member_1()]
    lines = [build_header("20260622", "103000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


def generate_del04_adl_independence_gained():
    """Delete: Member 1 regains independence (ADLs all go to 000)."""
    m1 = _baseline_member_1()
    m1["bath_help_cd"] = "000"
    m1["dres_help_cd"] = "000"
    m1["eat_help_cd"] = "000"
    m1["mbl_help_cd"] = "000"
    m1["tlt_help_cd"] = "000"
    m1["xfer_help_cd"] = "000"
    m1["bath_adpv_eqp_cd"] = ""
    m1["mbl_adpv_eqp_cd"] = ""
    m1["tlt_adpv_eqp_cd"] = ""
    m1["xfer_adpv_eqp_cd"] = ""
    members = [m1, _baseline_member_2(), _baseline_member_3()]
    lines = [build_header("20260622", "110000", len(members))]
    for m in members:
        lines.append(build_detail(m))
    return "\n".join(lines)


# ─── Main entry point ────────────────────────────────────────────────────────

if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.abspath(__file__))

    generators = [
        ("WI_FSIA_FILE_EXTRACT_T.txt", generate_baseline),
        ("WI_FSIA_FILE_EXTRACT_T_01_MAX_LENGTHS.txt", generate_max_lengths),
        ("WI_FSIA_FILE_EXTRACT_T_02_MIN_EMPTY.txt", generate_min_empty),
        ("WI_FSIA_FILE_EXTRACT_T_03_ALL_ADL_COMBINATIONS.txt", generate_03_all_adl_combinations),
        ("WI_FSIA_FILE_EXTRACT_T_04_BOUNDARY_DATES.txt", generate_04_boundary_dates),
        ("WI_FSIA_FILE_EXTRACT_T_05_ALL_CODES.txt", generate_05_all_codes),
        ("WI_FSIA_FILE_EXTRACT_T_06_COMPOSITE_RULES.txt", generate_06_composite_rule_scenarios),
        ("WI_FSIA_FILE_EXTRACT_T_07_SPECIAL_CHARS.txt", generate_07_special_chars),
        ("WI_FSIA_FILE_EXTRACT_T_08_LARGE_VOLUME.txt", generate_08_large_volume),
        ("WI_FSIA_FILE_EXTRACT_T_UPD01_ADL_CHANGES.txt", generate_upd01_adl_changes),
        ("WI_FSIA_FILE_EXTRACT_T_UPD02_EMPLOYMENT_CHANGES.txt", generate_upd02_employment_changes),
        ("WI_FSIA_FILE_EXTRACT_T_UPD03_HEALTH_SERVICES.txt", generate_upd03_health_services_changes),
        ("WI_FSIA_FILE_EXTRACT_T_UPD04_COGNITION_CHANGES.txt", generate_upd04_cognition_changes),
        ("WI_FSIA_FILE_EXTRACT_T_UPD05_ELIGIBILITY_DATE.txt", generate_upd05_eligibility_date_change),
        ("WI_FSIA_FILE_EXTRACT_T_UPD06_NEW_MEMBERS.txt", generate_upd06_new_members),
        ("WI_FSIA_FILE_EXTRACT_T_DEL01_MEMBER_REMOVED.txt", generate_del01_member_removed),
        ("WI_FSIA_FILE_EXTRACT_T_DEL02_SERVICES_CLEARED.txt", generate_del02_services_cleared),
        ("WI_FSIA_FILE_EXTRACT_T_DEL03_MULTIPLE_REMOVED.txt", generate_del03_multiple_members_removed),
        ("WI_FSIA_FILE_EXTRACT_T_DEL04_ADL_INDEPENDENCE.txt", generate_del04_adl_independence_gained),
    ]

    for filename, gen_func in generators:
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w") as f:
            f.write(gen_func())
        print(f"Generated: {filename}")

    print(f"\nTotal files generated: {len(generators)}")
