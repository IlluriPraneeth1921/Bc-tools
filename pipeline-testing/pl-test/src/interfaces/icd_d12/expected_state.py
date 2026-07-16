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

# =============================================================================
# CustomFormElementDefinitionBaseKey Mapping
# =============================================================================
# Maps semantic row_key prefixes to their CustomFormElementDefinitionBaseKey
# in the LTC Needs Assessment form (Version 55).
# These keys identify which form question a SimpleSingleSelectFieldAnswer,
# SimpleMultiSelectFieldAnswerAnswers, or TextFieldAnswer belongs to.
# =============================================================================

FIELD_DEFINITION_KEYS: Dict[str, str] = {
    # ADL / Personal Care section — composite Yes/No
    "PersonalCare": "2EE5C671-6F5F-485B-8D93-B43C013B9109",
    # IADL / Supportive Home Care section — composite Yes/No
    "SupportiveHomeCare": "4C671ACA-D3E2-496C-9D9F-B43C013B9119",
    # Medication Administration — composite Yes/No
    "MedAdmin": "DD310347-9EDF-4A73-B36F-B43C013B9135",
    # Money Management — composite Yes/No
    "MoneyMgt": "D8F8A59A-CD1D-483D-8053-B43C013B912D",
    # Transportation — composite Yes/No
    "Transportation": "5DC5212D-A09F-43FB-B2AD-B43C013B9122",
    # DME (Durable Medical Equipment) — composite Yes/No
    "DME": "F21C4837-D4EA-43CD-B764-B43C013B91DB",
    # Overnight Care Supervision — composite Yes/No
    "OvernightCare": "962C09A3-8E1A-45F7-850C-B43C013B9145",
    # Applicant Living Preference
    "PrefLive": "CC779440-C489-47E6-AA64-B43C013B90FE",
    # Guardian Living Preference
    "GardPrefLive": "92026B8E-4E43-4A12-9A9F-B43C013B9102",
    # Employment Yes/No
    "Employment": "FEEBBEF5-B531-49ED-8794-B43C013B9153",
    # Health Related Services — composite Yes/No
    "HealthRelatedServices": "7C3A1ECD-9BD8-4082-81D6-B43C013B915E",
    # Behavioral/Mental Health section
    "Wandering": "04813AE6-1398-4608-8A86-B43C013B91A0",
    "SelfInjuriousBehavior": "04813AE6-1398-4608-8A86-B43C013B91A0",
    "OffensiveBehavior": "04813AE6-1398-4608-8A86-B43C013B91A0",
    "MentalHealthNeed": "20AC06CC-EC69-468E-9C23-B43C013B9175",
    "SubstanceAbuse": "C6A9526D-600A-4FC8-9262-B43C013B9188",
    # Multi-select: Health Services checklist
    "HealthService": "5BD03816-5B74-40A5-B4DE-B43C013B9164",
    # Multi-select: ADL Equipment checklists (DME section)
    "BathingEquipment": "78F824CB-B4EB-461E-8560-B43C013B91D6",
    "MobilityEquipment": "78F824CB-B4EB-461E-8560-B43C013B91D6",
    "ToiletingEquipment": "78F824CB-B4EB-461E-8560-B43C013B91D6",
    "TransferringEquipment": "78F824CB-B4EB-461E-8560-B43C013B91D6",
    # Multi-select: Living Preference checkboxes
    "PrefLiveCheckbox": "6C8165C0-48B8-4F63-954C-B43C013B90FA",
    "GardPrefLiveCheckbox": "92026B8E-4E43-4A12-9A9F-B43C013B9102",
    # Text: Other Service Text
    "OtherServiceText": "F53840F3-ECE0-4399-AE91-B43C013B9166",
    # Date: Eligibility Date
    "ElgCalcDt": "8F6D256E-1AFD-431E-8598-B43C013B90F4",
    # CaseCustomFormInstance (no specific element key)
    "CaseFormInstance": None,

    # =========================================================================
    # Individual Field-Level Answers (per-field SimpleSingleSelectFieldAnswer)
    # =========================================================================
    # The pipeline creates a SimpleSingleSelectFieldAnswer for each individual
    # source field with the code resolved to its vocab display name.
    # These keys are resolved dynamically from the form definition at runtime.
    # When set to None, the comparator matches by entity_id + display name only.
    # =========================================================================
    # ADL individual help level answers
    "BathHelp": None,
    "DresHelp": None,
    "EatHelp": None,
    "MblHelp": None,
    "TltHelp": None,
    "XferHelp": None,
    # IADL individual answers
    "MealPrepHelp": None,
    "MedMgtHelp": None,
    "MonyMgtHelp": None,
    "LdryChorHelp": None,
    "PhnUseAbty": None,
    "PhnAcs": None,
    "TrnspDrv": None,
    # Overnight Care frequency
    "OvernightCareFreq": None,
    # Employment Status code
    "EmplStat": None,
    # Employment Assistance
    "EmplAsst": None,
    # Health service individual frequency answers
    "BhvItrvn": None,
    "ExrcRngMotn": None,
    "MedFldFlush": None,
    "MedAdmFreq": None,
    "PainMedMgt": None,
    "Osty": None,
    "ChrBedPosn": None,
    "OxyRspirTrtm": None,
    "InHomeDlys": None,
    "TotPrntNtrt": None,
    "Xfsn": None,
    "Trchos": None,
    "TubeFeed": None,
    "UlcrStg2": None,
    "UlcrStg34": None,
    "UrinCath": None,
    "OthrWndCare": None,
    "VentItrvn": None,
    "NursAses": None,
    "OthrSrvc": None,
    "SklThrp": None,
    # Communication and Cognition
    "Comm": None,
    "DlyDcsnMake": None,
    "PhyRsistCare": None,
    # Behavior frequency answers
    "WndrFreq": None,
    "SelfInjrBhvFreq": None,
    "OfnsBhvFreq": None,
    "MntlHlthNeedFreq": None,
    # Substance abuse flags
    "SbtncAbusFlg": None,
    "SbtncAbusCurFlg": None,
    "SbtncAbusPastFlg": None,
    # Memory flags
    "MemIparFlg": None,
    "ShrtTermMemLossFlg": None,
    "UablToRmbrFlg": None,
    "LongTermMemLossFlg": None,
    # Employment flags
    "WkshpEmplFlg": None,
    "IndvIntWorkCmny": None,
    "CmnyEmplFlg": None,
    "VocEmplFlg": None,
    "HomeEmplFlg": None,
}


class IcdD12ExpectedStateGenerator(BaseExpectedStateGenerator):
    """Generates expected state for all 4 stages of the ICD-D12 FSIA pipeline."""

    def __init__(self, parsed_file: BaseParsedFile, vocab_client=None, custom_form_definition_key: str = None):
        if not isinstance(parsed_file, ParsedFile):
            raise TypeError("IcdD12ExpectedStateGenerator requires an ICD-D12 ParsedFile")
        self.parsed_file: ParsedFile = parsed_file
        self.vocab_client = vocab_client
        if custom_form_definition_key:
            self.custom_form_definition_key = custom_form_definition_key
        else:
            from src.core.config import settings
            self.custom_form_definition_key = settings.D12_CUSTOM_FORM_DEFINITION_KEY
        # Initialize static vocab fallback maps
        self._init_vocab_fallbacks()

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
                value = getattr(member, field_name, "").strip()
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
        - PersonEmployment records

        Note: Per v2.0, ELG_CALC_DT is no longer stored as a DateFieldAnswer.

        Business rules determine Yes/No mappings for composite fields.
        """
        expected_rows = []

        for medicaid_id, member in self.parsed_file.members.items():
            # --- CustomFormInstance record ---
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.CustomFormInstance",
                "CustomFormDefinitionKey", f"FormInstance|{medicaid_id}",
                self.custom_form_definition_key,
            ))

            # --- CaseCustomFormInstance record (links form to case) ---
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.CaseCustomFormInstance",
                "FormTypeDisplayName", f"CaseFormInstance|{medicaid_id}",
                "LTC Needs Assessment",
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

            # --- Living preference (Applicant) ---
            # Stored as SimpleMultiSelectFieldAnswerAnswers (checkbox-style)
            if member.appl_pref_live_cd.strip():
                display = self._resolve_vocab("pref_live", member.appl_pref_live_cd)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"PrefLive|{member.appl_pref_live_cd.strip()}|{medicaid_id}",
                    display, vocab_used="pref_live",
                ))

            # --- Living preference (Guardian) ---
            # Stored as SimpleMultiSelectFieldAnswerAnswers (checkbox-style)
            if member.gard_pref_live_cd.strip() and member.gard_pref_live_cd.strip() != "000":
                gard_display = self._resolve_vocab("gard_pref_live", member.gard_pref_live_cd)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"GardPrefLive|{member.gard_pref_live_cd.strip()}|{medicaid_id}",
                    gard_display, vocab_used="gard_pref_live",
                ))

            # --- Eligibility date (Screening Completion Date) ---
            # Stored as DateFieldAnswer despite v2.0 notes suggesting otherwise.
            # The pipeline DOES create this record with DateTime = ELG_CALC_DT.
            elg_dt = member.elg_calc_dt.strip()
            if elg_dt and len(elg_dt) == 8:
                # Format as ISO date for comparison (YYYYMMDD → YYYY-MM-DD)
                iso_date = f"{elg_dt[0:4]}-{elg_dt[4:6]}-{elg_dt[6:8]}"
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.DateFieldAnswer",
                    "DateTime", f"ElgCalcDt|{medicaid_id}",
                    iso_date,
                ))

            # --- Employment Yes/No (SimpleSingleSelectFieldAnswer) ---
            # 003 (Full-time) or 004 (Part-time) → "Yes"; 001 (Retired) or 002 (Not working) → "No"
            empl_cd = member.empl_stat_cd.strip()
            if empl_cd and empl_cd != "000":
                empl_yes_no = self.OPTION_YES if empl_cd in ("003", "004") else self.OPTION_NO
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"Employment|{medicaid_id}",
                    empl_yes_no, business_rule="BR-D12-009",
                ))

            # --- PersonEmployment record ---
            if empl_cd and empl_cd != "000":
                # StatusDisplayName: 001→Retired, 002→Unemployed, 003→Full Time, 004→Part Time
                expected_rows.append(self._row(
                    medicaid_id, "PersonModule.PersonEmployment",
                    "StatusDisplayName", f"PersonEmployment|{medicaid_id}",
                    self._resolve_vocab("empl_stat", member.empl_stat_cd),
                    vocab_used="empl_stat", business_rule="BR-D12-009",
                ))

                # TypeDisplayName: 001/002→Unpaid, 003/004→Paid
                type_display = "Paid" if empl_cd in ("003", "004") else "Unpaid"
                expected_rows.append(self._row(
                    medicaid_id, "PersonModule.PersonEmployment",
                    "TypeDisplayName", f"PersonEmployment|{medicaid_id}",
                    type_display, business_rule="BR-D12-009",
                ))

                # HasCompetitiveIntegratedEmploymentOutcomeDisplayName: from CMNY_EMPL_FLG
                cmny_display = "Yes" if member.cmny_empl_flg.strip() == "Y" else "No"
                expected_rows.append(self._row(
                    medicaid_id, "PersonModule.PersonEmployment",
                    "HasCompetitiveIntegratedEmploymentOutcomeDisplayName",
                    f"PersonEmployment|{medicaid_id}",
                    cmny_display, business_rule="BR-D12-009",
                ))

                # HasAccessedDivisionOfVocationalRehabilitationDisplayName: from VOC_EMPL_FLG
                voc_display = "Yes" if member.voc_empl_flg.strip() == "Y" else "No"
                expected_rows.append(self._row(
                    medicaid_id, "PersonModule.PersonEmployment",
                    "HasAccessedDivisionOfVocationalRehabilitationDisplayName",
                    f"PersonEmployment|{medicaid_id}",
                    voc_display, business_rule="BR-D12-009",
                ))

                # Note: composite of WKSHP_EMPL_FLG, INDV_INT_WORK_CMNY_CD, HOME_EMPL_FLG, EMPL_ASST_CD
                note_parts = []
                if member.wkshp_empl_flg.strip() == "Y":
                    note_parts.append("Workshop Employment")
                if member.indv_int_work_cmny_cd.strip() == "Y":
                    note_parts.append("Interest in Working in Community")
                if member.home_empl_flg.strip() == "Y":
                    note_parts.append("Home Employment")
                empl_asst = member.empl_asst_cd.strip()
                if empl_asst:
                    empl_asst_map = {
                        "000": "Need for Assistance to Work: Independent",
                        "001": "Need for Assistance to Work: Needs help weekly or less",
                        "002": "Need for Assistance to Work: Needs help every day but does not need continuous presence",
                        "003": "Need for Assistance to Work: Needs the continuous presence of another person",
                        "004": "Need for Assistance to Work: Not applicable",
                    }
                    if empl_asst in empl_asst_map:
                        note_parts.append(empl_asst_map[empl_asst])
                if note_parts:
                    expected_rows.append(self._row(
                        medicaid_id, "PersonModule.PersonEmployment",
                        "Note", f"PersonEmployment|{medicaid_id}",
                        "; ".join(note_parts), business_rule="BR-D12-009",
                    ))

            # --- Health Related Services Yes/No (composite) ---
            health_services_needed = self._determine_health_services_needed(member)
            expected_rows.append(self._row(
                medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                "OptionDisplayName", f"HealthRelatedServices|{medicaid_id}",
                health_services_needed, business_rule="BR-D12-HRS",
            ))

            # --- Behavior/Mental Health individual Yes/No fields ---
            # WNDR_CD: 001→Yes (wanders), 000→No
            wndr_val = member.wndr_cd.strip()
            if wndr_val and wndr_val != "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"Wandering|{medicaid_id}",
                    self.OPTION_YES, business_rule="BR-D12-BHV",
                ))
            elif wndr_val == "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"Wandering|{medicaid_id}",
                    self.OPTION_NO, business_rule="BR-D12-BHV",
                ))

            # SELF_INJR_BHV_CD: 001→Yes (self-injurious behavior), 000→No
            self_injr_val = member.self_injr_bhv_cd.strip()
            if self_injr_val and self_injr_val != "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"SelfInjuriousBehavior|{medicaid_id}",
                    self.OPTION_YES, business_rule="BR-D12-BHV",
                ))
            elif self_injr_val == "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"SelfInjuriousBehavior|{medicaid_id}",
                    self.OPTION_NO, business_rule="BR-D12-BHV",
                ))

            # OFNS_BHV_TO_OTHR_CD: 001→Yes (offensive behavior), 000→No
            ofns_val = member.ofns_bhv_to_othr_cd.strip()
            if ofns_val and ofns_val != "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"OffensiveBehavior|{medicaid_id}",
                    self.OPTION_YES, business_rule="BR-D12-BHV",
                ))
            elif ofns_val == "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"OffensiveBehavior|{medicaid_id}",
                    self.OPTION_NO, business_rule="BR-D12-BHV",
                ))

            # MNTL_HLTH_NEED_CD: 001→Yes (mental health need), 000→No
            mntl_val = member.mntl_hlth_need_cd.strip()
            if mntl_val and mntl_val != "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"MentalHealthNeed|{medicaid_id}",
                    self.OPTION_YES, business_rule="BR-D12-BHV",
                ))
            elif mntl_val == "000":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"MentalHealthNeed|{medicaid_id}",
                    self.OPTION_NO, business_rule="BR-D12-BHV",
                ))

            # SBTNC_ABUS_CUR_FLG: Y→Yes (current substance abuse), N→No
            sbtnc_cur_val = member.sbtnc_abus_cur_flg.strip()
            if sbtnc_cur_val == "Y":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"SubstanceAbuse|{medicaid_id}",
                    self.OPTION_YES, business_rule="BR-D12-BHV",
                ))
            elif sbtnc_cur_val == "N":
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleSingleSelectFieldAnswer",
                    "OptionDisplayName", f"SubstanceAbuse|{medicaid_id}",
                    self.OPTION_NO, business_rule="BR-D12-BHV",
                ))

            # =================================================================
            # Individual Field-Level Notes (TextFieldAnswer)
            # =================================================================
            # The pipeline creates a TextFieldAnswer for each "Notes" section
            # on the form. FSIA doesn't populate these — they remain NULL.
            # We verify they exist but are empty.
            # =================================================================
            notes_fields = [
                "PersonalCareServicesNotes",
                "SupportiveHomeCareNotes",
                "MedicationAdministrationManagementNotes",
                "MoneyManagementServicesNotes",
                "TransportationServicesNotes",
                "HealthRelatedServicesNotes",
                "NeedforOvernightCareNotes",
                "NeedforEmploymentServicesNotes",
                "MedicalEquipmentSuppliesNotes",
                "BehaviorsupportNotes",
                "MentalHealthServicesNotes",
                "SubstanceAbuseneedsNotes",
                "EgressRelatedNeedsNotes",
                "EnvironmentalHazardsNotes",
                "FallRiskPreventionNote",
                "MedicalproviderNeedsNotes",
                "RespiteServicesNotes",
                "DayProgramServicesNotes",
                "PERSNotes",
                "SchoolServicesNotes",
                "LivingSituationNotes",
                "OtherSpecify",
            ]
            for notes_field in notes_fields:
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.TextFieldAnswer",
                    "Note", f"{notes_field}|{medicaid_id}",
                    "",  # FSIA doesn't populate notes — expect NULL/empty
                ))

            # --- ADL Adaptive Equipment multi-select checkboxes ---
            # Bathing: BATH_ADPV_EQP_CD = 3-char single code → "Uses Adaptive Equipment"
            bath_equip = member.bath_adpv_eqp_cd.strip()
            if bath_equip and bath_equip != "000":
                bath_equip_display = self._resolve_adl_equipment("bath", bath_equip)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"BathingEquipment|{bath_equip}|{medicaid_id}",
                    bath_equip_display, business_rule="BR-D12-ADL-EQP",
                ))

            # Mobility: MBL_ADPV_EQP_CD = 9 chars (up to 3 codes of 3 chars each)
            mbl_equip_codes = self._parse_multi_select_codes(member.mbl_adpv_eqp_cd, 3)
            for code in mbl_equip_codes:
                mbl_equip_display = self._resolve_adl_equipment("mbl", code)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"MobilityEquipment|{code}|{medicaid_id}",
                    mbl_equip_display, business_rule="BR-D12-ADL-EQP",
                ))

            # Toileting: TLT_ADPV_EQP_CD = 15 chars (up to 5 codes of 3 chars each)
            tlt_equip_codes = self._parse_multi_select_codes(member.tlt_adpv_eqp_cd, 3)
            for code in tlt_equip_codes:
                tlt_equip_display = self._resolve_adl_equipment("tlt", code)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"ToiletingEquipment|{code}|{medicaid_id}",
                    tlt_equip_display, business_rule="BR-D12-ADL-EQP",
                ))

            # Transferring: XFER_ADPV_EQP_CD = 12 chars (up to 4 codes of 3 chars each)
            xfer_equip_codes = self._parse_multi_select_codes(member.xfer_adpv_eqp_cd, 3)
            for code in xfer_equip_codes:
                xfer_equip_display = self._resolve_adl_equipment("xfer", code)
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"TransferringEquipment|{code}|{medicaid_id}",
                    xfer_equip_display, business_rule="BR-D12-ADL-EQP",
                ))

            # --- Health Related Services multi-select checkboxes ---
            # Each health service field that is active gets a checkbox entry
            health_service_checks = self._get_health_service_checkboxes(member)
            for field_name, display_name in health_service_checks:
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.SimpleMultiSelectFieldAnswerAnswers",
                    "DisplayName", f"HealthService|{field_name}|{medicaid_id}",
                    display_name, business_rule="BR-D12-HRS",
                ))

            # --- Other Service Text (TextFieldAnswer) ---
            othr_srvc_txt = member.othr_srvc_txt.strip()
            if othr_srvc_txt:
                expected_rows.append(self._row(
                    medicaid_id, "CustomFormModule.TextFieldAnswer",
                    "Note", f"OtherServiceText|{medicaid_id}",
                    othr_srvc_txt,
                ))

        return expected_rows

    # =========================================================================
    # Display Name Constants for SimpleSingleSelectFieldAnswer
    # =========================================================================
    # The pipeline stores full display names (not just "Yes"/"No") in the
    # OptionDisplayName column. These must match exactly for comparison.
    # =========================================================================
    OPTION_YES = "Yes, there is an identified need"
    OPTION_NO = "No, there is not an identified need"

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
                return self.OPTION_YES
        return self.OPTION_NO

    def _determine_supportive_home_care(self, member: DetailRecord) -> str:
        """
        Set "Yes" if any contributing IADL/cognition field indicates need.
        Contributing fields: MEAL_PREP (001/002/003), LDRY_CHOR (001/002),
        PHN_USE_ABTY (002), PHN_ACS (002), COMM (001/002/003),
        MEM_IPAR_FLG (Y), SHRT_TERM_MEM_LOSS_FLG (Y), UABL_TO_RMBR_FLG (Y),
        LONG_TERM_MEM_LOSS_FLG (Y), DLY_DCSN_MAKE (001/002/003),
        PHY_RSIST_CARE (001)
        """
        if member.meal_prep_help_lvl_cd.strip() in ("001", "002", "003"):
            return self.OPTION_YES
        if member.ldry_chor_help_lvl_cd.strip() in ("001", "002"):
            return self.OPTION_YES
        if member.phn_use_abty_cd.strip() == "002":
            return self.OPTION_YES
        if member.phn_acs_cd.strip() == "002":
            return self.OPTION_YES
        if member.comm_cd.strip() in ("001", "002", "003"):
            return self.OPTION_YES
        if member.mem_ipar_flg.strip() == "Y":
            return self.OPTION_YES
        if member.shrt_term_mem_loss_flg.strip() == "Y":
            return self.OPTION_YES
        if member.uabl_to_rmbr_flg.strip() == "Y":
            return self.OPTION_YES
        if member.long_term_mem_loss_flg.strip() == "Y":
            return self.OPTION_YES
        if member.dly_dcsn_make_cd.strip() in ("001", "002", "003"):
            return self.OPTION_YES
        if member.phy_rsist_care_cd.strip() == "001":
            return self.OPTION_YES
        return self.OPTION_NO

    def _determine_med_admin_needed(self, member: DetailRecord) -> str:
        """Set "Yes" if MED_MGT_HELP_LVL_CD is 003, 005, or 006."""
        if member.med_mgt_help_lvl_cd.strip() in ("003", "005", "006"):
            return self.OPTION_YES
        return self.OPTION_NO

    def _determine_money_mgt_needed(self, member: DetailRecord) -> str:
        """Set "Yes" if MONY_MGT_HELP_LVL_CD is 001 or 002."""
        if member.mony_mgt_help_lvl_cd.strip() in ("001", "002"):
            return self.OPTION_YES
        return self.OPTION_NO

    def _determine_transport_needed(self, member: DetailRecord) -> str:
        """Set "Yes" if TRNSP_DRV_CD is 003, 004, 005, or 006."""
        if member.trnsp_drv_cd.strip() in ("003", "004", "005", "006"):
            return self.OPTION_YES
        return self.OPTION_NO

    def _determine_dme_needed(self, member: DetailRecord) -> str:
        """
        Set "Yes" if any adaptive equipment code field has a non-blank, non-000 value.
        Fields: BATH_ADPV_EQP_CD, MBL_ADPV_EQP_CD, TLT_ADPV_EQP_CD, XFER_ADPV_EQP_CD
        """
        equip_fields = [
            member.bath_adpv_eqp_cd, member.mbl_adpv_eqp_cd,
            member.tlt_adpv_eqp_cd, member.xfer_adpv_eqp_cd,
        ]
        for val in equip_fields:
            stripped = val.strip()
            if stripped and stripped != "000":
                return self.OPTION_YES
        return self.OPTION_NO

    def _determine_overnight_care_needed(self, member: DetailRecord) -> str:
        """
        Set "Yes" if ONGHT_CARE_SPVS_CD is 001 or 002 (caregiver needed overnight).
        Code 000 = No overnight care needed.
        """
        if member.onght_care_spvs_cd.strip() in ("001", "002"):
            return self.OPTION_YES
        return self.OPTION_NO

    def _determine_health_services_needed(self, member: DetailRecord) -> str:
        """
        Set "Yes" if ANY health service code indicates active service.

        Standard codes: 001-006 → active (contributes Yes)
        Special cases:
        - CHR_BED_POSN_CD: only 005 or 006 contribute (001-004 do not)
        - SKL_THRP_CD: only 001 or 002 contribute
        - OTHR_SRVC_CD: 001-006 contribute (same as standard)
        Codes 000, blank, or spaces → inactive
        """
        # Standard health service fields (001-006 = active)
        standard_fields = [
            member.bhv_itrvn_cd,
            member.exrc_rng_motn_cd,
            member.med_fld_flush_cd,
            member.med_adm_cd,
            member.pain_med_mgt_cd,
            member.osty_cd,
            member.oxy_rspir_trtm_cd,
            member.in_home_dlys_cd,
            member.tot_prnt_ntrt_cd,
            member.xfsn_cd,
            member.trchos_cd,
            member.tube_feed_cd,
            member.ulcr_stg_2_cd,
            member.ulcr_stg_3_4_cd,
            member.urin_cath_cd,
            member.othr_wnd_care_cd,
            member.vent_itrvn_cd,
            member.nurs_ases_cd,
            member.othr_srvc_cd,
        ]
        for val in standard_fields:
            code = val.strip()
            if code and code != "000":
                return self.OPTION_YES

        # CHR_BED_POSN_CD: special — only 005 or 006 contribute
        chr_bed = member.chr_bed_posn_cd.strip()
        if chr_bed in ("005", "006"):
            return self.OPTION_YES

        # SKL_THRP_CD: special — only 001 or 002 contribute
        skl_thrp = member.skl_thrp_cd.strip()
        if skl_thrp in ("001", "002"):
            return self.OPTION_YES

        return self.OPTION_NO

    def _get_health_service_checkboxes(self, member: DetailRecord) -> List[tuple]:
        """
        Return list of (field_name, display_name) for each active health service.
        These become individual checkbox entries in SimpleMultiSelectFieldAnswerAnswers.

        Same rules as _determine_health_services_needed for which codes are active.
        """
        checkboxes = []

        # Standard service fields: code 001-006 = active checkbox
        service_field_map = [
            ("bhv_itrvn_cd", member.bhv_itrvn_cd, "Behaviors Requiring Intervention"),
            ("exrc_rng_motn_cd", member.exrc_rng_motn_cd, "Exercises/Range of Motion"),
            ("med_fld_flush_cd", member.med_fld_flush_cd, "Medications/Fluid Flush"),
            ("med_adm_cd", member.med_adm_cd, "Medication Administration"),
            ("pain_med_mgt_cd", member.pain_med_mgt_cd, "Pain/Medication Management"),
            ("osty_cd", member.osty_cd, "Ostomy"),
            ("oxy_rspir_trtm_cd", member.oxy_rspir_trtm_cd, "Oxygen/Respiratory Treatment"),
            ("in_home_dlys_cd", member.in_home_dlys_cd, "In-Home Dialysis"),
            ("tot_prnt_ntrt_cd", member.tot_prnt_ntrt_cd, "Total Parenteral Nutrition"),
            ("xfsn_cd", member.xfsn_cd, "Transfusion"),
            ("trchos_cd", member.trchos_cd, "Tracheostomy"),
            ("tube_feed_cd", member.tube_feed_cd, "Tube Feeding"),
            ("ulcr_stg_2_cd", member.ulcr_stg_2_cd, "Ulcer Stage 2"),
            ("ulcr_stg_3_4_cd", member.ulcr_stg_3_4_cd, "Ulcer Stage 3/4"),
            ("urin_cath_cd", member.urin_cath_cd, "Urinary Catheter"),
            ("othr_wnd_care_cd", member.othr_wnd_care_cd, "Other Wound Care"),
            ("vent_itrvn_cd", member.vent_itrvn_cd, "Ventilator Intervention"),
            ("nurs_ases_cd", member.nurs_ases_cd, "Nursing Assessment"),
            ("othr_srvc_cd", member.othr_srvc_cd, "Other Service"),
        ]
        for field_name, value, display in service_field_map:
            code = value.strip()
            if code and code != "000":
                checkboxes.append((field_name, display))

        # CHR_BED_POSN_CD: special — only 005 or 006 contribute
        chr_bed = member.chr_bed_posn_cd.strip()
        if chr_bed in ("005", "006"):
            checkboxes.append(("chr_bed_posn_cd", "Chair/Bed Positioning"))

        # SKL_THRP_CD: special — only 001 or 002 contribute
        skl_thrp = member.skl_thrp_cd.strip()
        if skl_thrp in ("001", "002"):
            checkboxes.append(("skl_thrp_cd", "Skilled Therapy"))

        return checkboxes

    @staticmethod
    def _parse_multi_select_codes(raw_value: str, code_length: int) -> List[str]:
        """
        Parse a multi-select field (concatenated fixed-width codes) into individual codes.
        E.g., "002003007" with code_length=3 → ["002", "003", "007"]
        Blank/space-only segments are excluded.
        """
        value = raw_value.rstrip()
        if not value:
            return []
        codes = []
        for i in range(0, len(value), code_length):
            code = value[i:i + code_length].strip()
            if code and code != "000":
                codes.append(code)
        return codes

    # =========================================================================
    # Helpers
    # =========================================================================

    # Static vocabulary fallbacks for codes that may not be in the vocab DB.
    # These are used when the vocab client cannot resolve a code.
    _EMPL_STAT_DISPLAY: Dict[str, str] = {
        "001": "Retired",
        "002": "Unemployed",
        "003": "Full Time",
        "004": "Part Time",
    }

    _PREF_LIVE_DISPLAY: Dict[str, str] = {
        "024": "Stay at current residence",
        "025": "Move to their own home or apartment",
        "026": "Move to someone else's home or apartment",
        "027": "Move to an apartment with onsite services",
        "028": "Move to a group residential setting",
        "029": "Move to a health care facility or institution",
        "030": "No Permanent Residence",
        "031": "Unsure, or unable to determine person's preference for living arrangement",
    }

    _GARD_PREF_LIVE_DISPLAY: Dict[str, str] = {
        "000": "Not Applicable",
        "001": "Stay at current residence",
        "002": "Move to their own home or apartment",
        "003": "Move to an apartment with onsite services",
        "004": "Move to a group residential care setting",
        "005": "Move to a health care facility or institution",
        "007": "No consensus among multiple parties",
        "008": "Move to someone else's home or apartment",
        "009": "No response or no preference from guardian or family",
    }

    # ADL Help level display names (shared by bath, dres, eat, mbl, tlt, xfer)
    _ADL_HELP_DISPLAY: Dict[str, str] = {
        "000": "Independent in completing the activity safely",
        "001": "Help needed - helper need NOT be present",
        "002": "Help needed - helper MUST be present",
    }

    # IADL display names
    _MEAL_PREP_HELP_DISPLAY: Dict[str, str] = {
        "000": "Independent",
        "001": "Needs help weekly or less",
        "002": "Needs help 2-7 times/week",
        "003": "Needs help with every meal",
    }

    _MED_MGT_HELP_DISPLAY: Dict[str, str] = {
        "001": "NA - Has no medications",
        "002": "Independent",
        "003": "Needs help 1-2 days a week or less",
        "005": "Needs help at least 1x/day 3-7 days a week - can direct",
        "006": "Needs help at least 1x/day 3-7 days a week - cannot direct",
    }

    _MONY_MGT_HELP_DISPLAY: Dict[str, str] = {
        "000": "Independent",
        "001": "Can only complete small transactions",
        "002": "Needs help from another person with all transactions",
    }

    _LDRY_CHOR_HELP_DISPLAY: Dict[str, str] = {
        "000": "Independent",
        "001": "Needs help weekly or less",
        "002": "Needs help more than once a week",
    }

    _PHN_USE_ABTY_DISPLAY: Dict[str, str] = {
        "001": "Independent - has cognitive and physical abilities",
        "002": "Lacks cognitive or physical abilities to use phone",
    }

    _PHN_ACS_DISPLAY: Dict[str, str] = {
        "001": "Currently has working telephone or access",
        "002": "Has no phone and no access to phone",
    }

    _TRNSP_DRV_DISPLAY: Dict[str, str] = {
        "001": "Drives regular vehicle",
        "002": "Drives adapted vehicle",
        "003": "Drives regular vehicle with serious safety concerns",
        "004": "Drives adapted vehicle with serious safety concerns",
        "005": "Cannot drive due to physical/psychiatric/cognitive impairment",
        "006": "Does not drive due to other reasons",
    }

    _ONGHT_CARE_SPVS_DISPLAY: Dict[str, str] = {
        "000": "No",
        "001": "Yes - caregiver can get at least 6 hours uninterrupted sleep",
        "002": "Yes - caregiver cannot get at least 6 hours uninterrupted sleep",
    }

    _EMPL_ASST_DISPLAY: Dict[str, str] = {
        "000": "Independent",
        "001": "Needs help weekly or less",
        "002": "Needs help every day but not continuous presence",
        "003": "Needs continuous presence of another person",
        "004": "Not applicable",
    }

    # Health Related Services frequency (with Independent option)
    _HLTH_SRVC_DISPLAY: Dict[str, str] = {
        "000": "Independent",
        "001": "1-3/Month",
        "002": "Weekly",
        "003": "2-6/Week",
        "004": "1-2/Day",
        "005": "3-4/Day",
        "006": "5+/Day",
    }

    # Health Related Services frequency (no Independent option)
    _HLTH_SRVC_NO_INDEP_DISPLAY: Dict[str, str] = {
        "001": "1-3/Month",
        "002": "Weekly",
        "003": "2-6/Week",
        "004": "1-2/Day",
        "005": "3-4/Day",
        "006": "5+/Day",
    }

    # Chair/Bed Positioning (only high-frequency)
    _CHR_BED_POSN_DISPLAY: Dict[str, str] = {
        "005": "3-4/Day",
        "006": "5+/Day",
    }

    # Skilled Therapy
    _SKL_THRP_DISPLAY: Dict[str, str] = {
        "001": "1-4 sessions/week",
        "002": "5+ sessions/week",
    }

    # Communication
    _COMM_DISPLAY: Dict[str, str] = {
        "000": "Can fully communicate with no or minor impairment",
        "001": "Can fully communicate with assistive device",
        "002": "Can communicate ONLY BASIC needs",
        "003": "No effective communication",
    }

    # Daily Decision Making
    _DLY_DCSN_MAKE_DISPLAY: Dict[str, str] = {
        "000": "Makes decisions consistent with own lifestyle/values/goals",
        "001": "Makes safe familiar/routine decisions but not in new situations",
        "002": "Needs help with reminding, planning, or adjusting routine",
        "003": "Needs help from another person most or all of the time",
    }

    # Physically Resistive to Care
    _PHY_RSIST_CARE_DISPLAY: Dict[str, str] = {
        "000": "No",
        "001": "Yes, physically resistive due to cognitive impairment",
    }

    # Wandering
    _WNDR_DISPLAY: Dict[str, str] = {
        "000": "Does not wander",
        "001": "Daytime wandering, but sleeps nights",
        "002": "Wanders during the night, or during both day and night",
    }

    # Self-Injurious Behaviors
    _SELF_INJR_BHV_DISPLAY: Dict[str, str] = {
        "000": "No injurious behaviors demonstrated",
        "001": "Some self-injurious behaviors require interventions weekly or less",
        "002": "Self-injurious behaviors require interventions 2-6 times/week or 1-2 times/day",
        "003": "Self-injurious behaviors require intensive 1-on-1 interventions more than twice each day",
    }

    # Offensive Behavior
    _OFNS_BHV_DISPLAY: Dict[str, str] = {
        "000": "No offensive or violent behaviors demonstrated",
        "001": "Some offensive or violent behaviors require occasional interventions weekly or less",
        "002": "Offensive or violent behaviors require interventions 2-6 times/week or 1-2 times/day",
        "003": "Offensive or violent behaviors require intensive 1-on-1 interventions more than twice each day",
    }

    # Mental Health Needs
    _MNTL_HLTH_NEED_DISPLAY: Dict[str, str] = {
        "000": "No mental health problems or needs evident",
        "001": "No current diagnosis - person may be at risk",
        "002": "Person has a current diagnosis of mental illness",
    }

    # ADL Adaptive Equipment code → display name mappings
    _BATH_EQUIPMENT_DISPLAY: Dict[str, str] = {
        "005": "Uses Adaptive Equipment",
    }

    _MBL_EQUIPMENT_DISPLAY: Dict[str, str] = {
        "002": "Cane/Crutch",
        "003": "Walker",
        "007": "Wheelchair",
    }

    _TLT_EQUIPMENT_DISPLAY: Dict[str, str] = {
        "002": "Raised Toilet Seat",
        "003": "Grab Bars",
        "004": "Bedside Commode",
        "005": "Urinal/Bedpan",
        "006": "Ostomy Supplies",
        "008": "Incontinence Supplies",
    }

    _XFER_EQUIPMENT_DISPLAY: Dict[str, str] = {
        "001": "Transfer Board",
        "002": "Mechanical Lift",
        "003": "Trapeze",
        "004": "Hospital Bed",
    }

    def _resolve_vocab(self, lookup_name: str, value: str) -> str:
        """Resolve a code via vocabulary lookup, falling back to static mappings then the raw code."""
        code = value.strip()
        if self.vocab_client:
            display = self.vocab_client.lookup_display_name(lookup_name, code)
            if display:
                return display
        # Static fallback for known lookup types
        fallback_map = self._VOCAB_FALLBACKS.get(lookup_name)
        if fallback_map and code in fallback_map:
            return fallback_map[code]
        return code

    # Consolidated vocab fallback map (lookup_name → display dict)
    _VOCAB_FALLBACKS: Dict[str, Dict[str, str]] = {}

    @classmethod
    def _init_vocab_fallbacks(cls):
        """Initialize the consolidated vocab fallback map."""
        if cls._VOCAB_FALLBACKS:
            return
        cls._VOCAB_FALLBACKS = {
            "empl_stat": cls._EMPL_STAT_DISPLAY,
            "pref_live": cls._PREF_LIVE_DISPLAY,
            "gard_pref_live": cls._GARD_PREF_LIVE_DISPLAY,
            "bath_help": cls._ADL_HELP_DISPLAY,
            "dres_help": cls._ADL_HELP_DISPLAY,
            "eat_help": cls._ADL_HELP_DISPLAY,
            "mbl_help": cls._ADL_HELP_DISPLAY,
            "tlt_help": cls._ADL_HELP_DISPLAY,
            "xfer_help": cls._ADL_HELP_DISPLAY,
            "meal_prep": cls._MEAL_PREP_HELP_DISPLAY,
            "med_mgt": cls._MED_MGT_HELP_DISPLAY,
            "mony_mgt": cls._MONY_MGT_HELP_DISPLAY,
            "ldry_chor": cls._LDRY_CHOR_HELP_DISPLAY,
            "phn_use_abty": cls._PHN_USE_ABTY_DISPLAY,
            "phn_acs": cls._PHN_ACS_DISPLAY,
            "trnsp_drv": cls._TRNSP_DRV_DISPLAY,
            "onght_care": cls._ONGHT_CARE_SPVS_DISPLAY,
            "empl_asst": cls._EMPL_ASST_DISPLAY,
            "hlth_srvc": cls._HLTH_SRVC_DISPLAY,
            "hlth_srvc_no_indep": cls._HLTH_SRVC_NO_INDEP_DISPLAY,
            "chr_bed_posn": cls._CHR_BED_POSN_DISPLAY,
            "skl_thrp": cls._SKL_THRP_DISPLAY,
            "comm": cls._COMM_DISPLAY,
            "dly_dcsn_make": cls._DLY_DCSN_MAKE_DISPLAY,
            "phy_rsist_care": cls._PHY_RSIST_CARE_DISPLAY,
            "wndr": cls._WNDR_DISPLAY,
            "self_injr_bhv": cls._SELF_INJR_BHV_DISPLAY,
            "ofns_bhv": cls._OFNS_BHV_DISPLAY,
            "mntl_hlth_need": cls._MNTL_HLTH_NEED_DISPLAY,
        }

    def _resolve_adl_equipment(self, adl_type: str, code: str) -> str:
        """Resolve an ADL adaptive equipment code to its display name."""
        code = code.strip()
        if self.vocab_client:
            display = self.vocab_client.lookup_display_name(f"{adl_type}_adpv_eqp", code)
            if display:
                return display
        # Static fallback
        equipment_maps = {
            "bath": self._BATH_EQUIPMENT_DISPLAY,
            "mbl": self._MBL_EQUIPMENT_DISPLAY,
            "tlt": self._TLT_EQUIPMENT_DISPLAY,
            "xfer": self._XFER_EQUIPMENT_DISPLAY,
        }
        display_map = equipment_maps.get(adl_type, {})
        return display_map.get(code, code)

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
        """Build a standard expected state row dict.
        
        Automatically resolves the CustomFormElementDefinitionBaseKey from the
        row_key prefix (part before the first '|') using the FIELD_DEFINITION_KEYS mapping.
        """
        # Extract the semantic name from row_key (e.g., "PersonalCare" from "PersonalCare|4774443560")
        row_key_prefix = row_key.split("|")[0] if "|" in row_key else row_key
        field_def_key = FIELD_DEFINITION_KEYS.get(row_key_prefix)

        return {
            "entity_id": entity_id,
            "record_type": "DTL",
            "target_table": target_table,
            "target_column": target_column,
            "row_key": row_key,
            "expected_value": expected_value,
            "vocab_used": vocab_used,
            "business_rule": business_rule,
            "field_definition_key": field_def_key,
        }
