"""
Expected State Generator for ICD-D12 FSIA File.
Generates expected state for pipeline stages 1, 2, and 4.

Stage 1: Raw ingestion into LongTermCareFunctionalScreenFormRaw (one row per source line)
Stage 2: Parsed into LongTermCareFunctionalScreenForm table (one row per detail record)
Stage 3: SKIPPED — no intermediate transformation in Interface DB
Stage 4: CustomFormModule tables in Carity DB (form instances, field answers)
         CustomFormDefinitionKey: 964B0DFB-ED99-4F5A-8449-B43C013B9062 (Version 55)
"""
from typing import List, Dict, Any, Optional

from src.interfaces.base import BaseExpectedStateGenerator, BaseParsedFile
from src.interfaces.icd_d12.models import ParsedFile, DetailRecord
from src.interfaces.icd_d12.parser import DETAIL_FIELDS


# =============================================================================
# Column Name Mapping: Python snake_case → Database PascalCase
# =============================================================================
# The FsiaRaw table uses PascalCase column names. This mapping translates
# from the Python field definitions (snake_case) to the actual DB columns.
# Used by Stage 2 expected state generator and comparator.
# =============================================================================

SNAKE_TO_PASCAL: Dict[str, str] = {
    "medicaid_id": "MemberId",
    "first_name": "FirstName",
    "last_name": "LastName",
    "middle_name": "MiddleName",
    "appl_pref_live_cd": "ApplicantPrefersToLiveCode",
    "gard_pref_live_cd": "GuardianPreferenceForLivingCode",
    "bath_help_cd": "BathingHelpCode",
    "bath_adpv_eqp_cd": "BathingAdaptiveEquipmentCode",
    "dres_help_cd": "DressingHelpCode",
    "eat_help_cd": "EatingHelpCode",
    "mbl_help_cd": "MobilityHelpCode",
    "mbl_adpv_eqp_cd": "MobilityAdaptiveEquipmentCode",
    "tlt_help_cd": "ToiletingHelpCode",
    "tlt_adpv_eqp_cd": "ToiletingAdaptiveEquipmentCode",
    "xfer_help_cd": "TransferringHelpCode",
    "xfer_adpv_eqp_cd": "TransferringAdaptiveEquipmentCode",
    "meal_prep_help_lvl_cd": "MealPreparationHelpLevelCode",
    "med_mgt_help_lvl_cd": "MedicationManagementHelpLevelCode",
    "mony_mgt_help_lvl_cd": "MoneyManagementHelpLevelCode",
    "ldry_chor_help_lvl_cd": "LaundryChoresHelpLevelCode",
    "phn_use_abty_cd": "TelephoneUseAbilityCode",
    "phn_acs_cd": "TelephoneAccessCode",
    "trnsp_drv_cd": "TransportationDrivingCode",
    "onght_care_spvs_cd": "OvernightCareSupervisionCode",
    "empl_stat_cd": "EmploymentStatusCode",
    "wkshp_empl_flg": "WorkshopEmploymentFlag",
    "indv_int_work_cmny_cd": "IndividualInterestInWorkingInCommunityCode",
    "cmny_empl_flg": "CommunityEmploymentFlag",
    "voc_empl_flg": "VocationalEmploymentFlag",
    "home_empl_flg": "HomeEmploymentFlag",
    "empl_asst_cd": "EmploymentAssistanceCode",
    "bhv_itrvn_cd": "BehaviorsRequiringInterventionsCode",
    "exrc_rng_motn_cd": "ExercisesRangeOfMotionCode",
    "med_fld_flush_cd": "MedicationsFluidFlushCode",
    "med_adm_cd": "MedicationAdministrationCode",
    "pain_med_mgt_cd": "PainMedicationManagementCode",
    "osty_cd": "OstomyCode",
    "chr_bed_posn_cd": "ChairBedPositioningCode",
    "oxy_rspir_trtm_cd": "OxygenRespiratoryTreatmentCode",
    "in_home_dlys_cd": "InHomeDialysisCode",
    "tot_prnt_ntrt_cd": "TotalParenteralNutritionCode",
    "xfsn_cd": "TransfusionCode",
    "trchos_cd": "TracheostomyCode",
    "tube_feed_cd": "TubeFeedingCode",
    "ulcr_stg_2_cd": "UlcerStageTwoCode",
    "ulcr_stg_3_4_cd": "UlcerStageThreeFourCode",
    "urin_cath_cd": "UrinaryCatheterCode",
    "othr_wnd_care_cd": "OtherWoundCareCode",
    "vent_itrvn_cd": "VentilatorInterventionCode",
    "nurs_ases_cd": "NursingAssessmentCode",
    "othr_srvc_cd": "OtherServiceCode",
    "othr_srvc_txt": "OtherServiceText",
    "skl_thrp_cd": "SkilledTherapyCode",
    "comm_cd": "CommunicationCode",
    "mem_ipar_flg": "MemoryImpairmentFlag",
    "shrt_term_mem_loss_flg": "ShortTermMemoryLossFlag",
    "uabl_to_rmbr_flg": "UnableToRememberFlag",
    "long_term_mem_loss_flg": "LongTermMemoryLossFlag",
    "uabl_dter_txt": "UnableToDetermineText",
    "dly_dcsn_make_cd": "DailyDecisionMakingCode",
    "phy_rsist_care_cd": "PhysicallyResistiveToCareCode",
    "wndr_cd": "WanderingCode",
    "self_injr_bhv_cd": "SelfInjuriousBehaviorCode",
    "ofns_bhv_to_othr_cd": "OffensiveBehaviorToOthersCode",
    "mntl_hlth_need_cd": "MentalHealthNeedCode",
    "sbtnc_abus_flg": "SubstanceAbuseFlag",
    "sbtnc_abus_cur_flg": "SubstanceAbuseCurrentFlag",
    "sbtnc_abus_past_flg": "SubstanceAbusePastFlag",
    "elg_calc_dt": "EligibilityCalculatedDate",
}

# Reverse mapping for convenience
PASCAL_TO_SNAKE: Dict[str, str] = {v: k for k, v in SNAKE_TO_PASCAL.items()}


class IcdD12ExpectedStateGenerator(BaseExpectedStateGenerator):
    """Generates expected state for all 4 stages of the ICD-D12 FSIA pipeline."""

    def __init__(self, parsed_file: BaseParsedFile, vocab_client=None):
        if not isinstance(parsed_file, ParsedFile):
            raise TypeError("IcdD12ExpectedStateGenerator requires an ICD-D12 ParsedFile")
        self.parsed_file: ParsedFile = parsed_file
        self.vocab_client = vocab_client

    def generate_stage1(self) -> List[Dict[str, Any]]:
        """
        Generate expected raw staging rows.
        Stage 1 stores the entire raw line as-is (one row per source line).
        """
        expected_rows = []
        for source_line in self.parsed_file.source_lines:
            expected_rows.append({
                "line_number": source_line.line_number,
                "RecordType": source_line.record_type,
                "RawText": source_line.raw_text,
            })
        return expected_rows

    def generate_stage2(self) -> List[Dict[str, Any]]:
        """
        Generate expected parsed rows (EAV format).
        Stage 2 parses each DTL record into individual field columns
        in the LongTermCareFunctionalScreenForm table.

        Column names are output in PascalCase to match the actual DB schema.
        """
        expected_rows = []
        for source_line in self.parsed_file.source_lines:
            if source_line.record_type != "DTL":
                continue

            medicaid_id = source_line.raw_text[:10].strip()
            member = self.parsed_file.members.get(medicaid_id)
            if not member:
                continue

            # Generate one expected row per field, using PascalCase DB column names
            for field_name, _ in DETAIL_FIELDS:
                value = getattr(member, field_name, "")
                db_column = SNAKE_TO_PASCAL.get(field_name, field_name)
                expected_rows.append({
                    "line_number": source_line.line_number,
                    "entity_id": medicaid_id,
                    "record_type": "DTL",
                    "target_table": "LongTermCareFunctionalScreenForm",
                    "column_name": db_column,
                    "expected_value": value,
                })

        return expected_rows

    def generate_stage3(self) -> List[Dict[str, Any]]:
        """
        Stage 3 is SKIPPED for ICD-D12.

        The FSIA pipeline goes directly from Stage 2 (parsed in Interface DB)
        to Stage 4 (CustomFormModule in Carity DB). There is no intermediate
        transformation stage in the Interface DB for this interface.

        Returns an empty list — the comparator will also return a no-op result.
        """
        return []

    def generate_stage4(self) -> List[Dict[str, Any]]:
        """
        Generate expected Stage 4 (final) rows in CustomFormModule tables.

        The FSIA pipeline transforms Stage 2 parsed field codes directly into
        Carity DB CustomFormModule tables:
        - CustomFormInstance records (linked to CustomFormDefinition EA2E961E-...)
        - CaseCustomFormInstance records (linking form to case)
        - FieldAnswerBase + SimpleSingleSelectFieldAnswer records
        - DateFieldAnswer records (eligibility date)
        - PersonEmployment records

        Business rules determine Yes/No mappings for composite fields.
        """
        from src.interfaces.icd_d12.plugin import IcdD12Plugin

        expected_rows = []

        for medicaid_id, member in self.parsed_file.members.items():
            # --- CustomFormInstance record ---
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.CustomFormInstance",
                "CustomFormDefinitionKey", f"FormInstance|{medicaid_id}",
                IcdD12Plugin.CUSTOM_FORM_DEFINITION_KEY,
            ))

            # --- Personal care needs (BR: composite of ADL fields) ---
            personal_care_needed = self._determine_personal_care_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"PersonalCare|{medicaid_id}",
                personal_care_needed,
                business_rule="BR-D12-ADL",
            ))

            # --- Supportive home care needs (BR: composite of IADL fields) ---
            supportive_home_care_needed = self._determine_supportive_home_care(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"SupportiveHomeCare|{medicaid_id}",
                supportive_home_care_needed,
                business_rule="BR-D12-IADL",
            ))

            # --- Medication administration ---
            med_admin_needed = self._determine_med_admin_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"MedAdmin|{medicaid_id}",
                med_admin_needed,
            ))

            # --- Money management ---
            money_mgt_needed = self._determine_money_mgt_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"MoneyMgt|{medicaid_id}",
                money_mgt_needed,
            ))

            # --- Transportation ---
            transport_needed = self._determine_transport_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"Transportation|{medicaid_id}",
                transport_needed,
            ))

            # --- DME needs (BR: composite of adaptive equipment fields) ---
            dme_needed = self._determine_dme_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"DME|{medicaid_id}",
                dme_needed,
            ))

            # --- Overnight care supervision needs ---
            overnight_care_needed = self._determine_overnight_care_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"OvernightCare|{medicaid_id}",
                overnight_care_needed,
            ))

            # --- Living preference ---
            if member.appl_pref_live_cd.strip():
                display = self._resolve_vocab("pref_live", member.appl_pref_live_cd)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"PrefLive|{medicaid_id}",
                    display, vocab_used="pref_live",
                ))

            # --- Eligibility date ---
            if member.elg_calc_dt.strip():
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.DateFieldAnswer",
                    "Value", f"ElgCalcDt|{medicaid_id}",
                    self._fmt_date(member.elg_calc_dt),
                ))

            # --- Employment (PersonEmployment record) ---
            if member.empl_stat_cd.strip() and member.empl_stat_cd != "000":
                expected_rows.append(self._row(
                    medicaid_id, "PersonModule.PersonEmployment",
                    "StatusDisplayName", f"Employment|{medicaid_id}",
                    self._resolve_vocab("empl_stat", member.empl_stat_cd),
                    vocab_used="empl_stat", business_rule="BR-D12-009",
                ))

        return expected_rows

    # =========================================================================
    # Business Rule Evaluations
    # =========================================================================

    def _determine_personal_care_needed(self, member: DetailRecord) -> str:
        """
        Set "Yes" if any ADL help code is 001 or 002 (needs help).
        Fields: BATH_HELP_CD, DRES_HELP_CD, EAT_HELP_CD, MBL_HELP_CD,
                TLT_HELP_CD, XFER_HELP_CD
        """
        adl_fields = [
            member.bath_help_cd, member.dres_help_cd, member.eat_help_cd,
            member.mbl_help_cd, member.tlt_help_cd, member.xfer_help_cd,
        ]
        for val in adl_fields:
            if val.strip() in ("001", "002"):
                return "Yes"
        return "No"

    def _determine_supportive_home_care(self, member: DetailRecord) -> str:
        """
        Set "Yes" if any contributing IADL/cognition field indicates need.
        Contributing fields: MEAL_PREP (001/002/003), LDRY_CHOR (001/002),
        PHN_USE_ABTY (002), PHN_ACS (002), COMM (002/003),
        MEM_IPAR_FLG (1), SHRT_TERM_MEM_LOSS_FLG (1), UABL_TO_RMBR_FLG (1),
        LONG_TERM_MEM_LOSS_FLG (1), DLY_DCSN_MAKE (001/002/003),
        PHY_RSIST_CARE (001/002)
        """
        if member.meal_prep_help_lvl_cd.strip() in ("001", "002", "003"):
            return "Yes"
        if member.ldry_chor_help_lvl_cd.strip() in ("001", "002"):
            return "Yes"
        if member.phn_use_abty_cd.strip() == "002":
            return "Yes"
        if member.phn_acs_cd.strip() == "002":
            return "Yes"
        if member.comm_cd.strip() in ("002", "003"):
            return "Yes"
        if member.mem_ipar_flg.strip() == "1":
            return "Yes"
        if member.shrt_term_mem_loss_flg.strip() == "1":
            return "Yes"
        if member.uabl_to_rmbr_flg.strip() == "1":
            return "Yes"
        if member.long_term_mem_loss_flg.strip() == "1":
            return "Yes"
        if member.dly_dcsn_make_cd.strip() in ("001", "002", "003"):
            return "Yes"
        if member.phy_rsist_care_cd.strip() in ("001", "002"):
            return "Yes"
        return "No"

    def _determine_med_admin_needed(self, member: DetailRecord) -> str:
        """Set "Yes" if MED_MGT_HELP_LVL_CD is 003, 005, or 006."""
        if member.med_mgt_help_lvl_cd.strip() in ("003", "005", "006"):
            return "Yes"
        return "No"

    def _determine_money_mgt_needed(self, member: DetailRecord) -> str:
        """Set "Yes" if MONY_MGT_HELP_LVL_CD is 001 or 002."""
        if member.mony_mgt_help_lvl_cd.strip() in ("001", "002"):
            return "Yes"
        return "No"

    def _determine_transport_needed(self, member: DetailRecord) -> str:
        """Set "Yes" if TRNSP_DRV_CD is 003, 004, 005, or 006."""
        if member.trnsp_drv_cd.strip() in ("003", "004", "005", "006"):
            return "Yes"
        return "No"

    def _determine_dme_needed(self, member: DetailRecord) -> str:
        """
        Set "Yes" if any adaptive equipment code field has a non-blank value.
        Fields: BATH_ADPV_EQP_CD, MBL_ADPV_EQP_CD, TLT_ADPV_EQP_CD, XFER_ADPV_EQP_CD
        """
        equip_fields = [
            member.bath_adpv_eqp_cd, member.mbl_adpv_eqp_cd,
            member.tlt_adpv_eqp_cd, member.xfer_adpv_eqp_cd,
        ]
        for val in equip_fields:
            if val.strip():
                return "Yes"
        return "No"

    def _determine_overnight_care_needed(self, member: DetailRecord) -> str:
        """
        Set "Yes" if ONGHT_CARE_SPVS_CD is 001 or 002 (caregiver needed overnight).
        Code 000 = No overnight care needed.
        """
        if member.onght_care_spvs_cd.strip() in ("001", "002"):
            return "Yes"
        return "No"

    # =========================================================================
    # Helpers
    # =========================================================================

    def _resolve_vocab(self, lookup_name: str, value: str) -> str:
        """Resolve a code via vocabulary lookup, falling back to the raw code."""
        if self.vocab_client:
            display = self.vocab_client.lookup_display_name(lookup_name, value.strip())
            if display:
                return display
        return value.strip()

    @staticmethod
    def _fmt_date(value: str) -> Optional[str]:
        """Format YYYYMMDD to ISO date."""
        value = value.strip()
        if not value or len(value) != 8:
            return None
        try:
            from datetime import date
            return date(int(value[0:4]), int(value[4:6]), int(value[6:8])).isoformat()
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _row(entity_id: str, target_table: str, target_column: str,
             row_key: str, expected_value: str, vocab_used: str = None,
             business_rule: str = None) -> Dict:
        """Build a standard expected state row dict."""
        return {
            "entity_id": entity_id,
            "record_type": "DTL",
            "target_table": target_table,
            "target_column": target_column,
            "row_key": row_key,
            "expected_value": expected_value,
            "vocab_used": vocab_used,
            "business_rule": business_rule,
        }
