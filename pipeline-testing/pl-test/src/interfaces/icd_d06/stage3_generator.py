"""
Stage 3 Expected State Generator for ICD-D06.

Generates what the Incoming (InterfaceModule) tables SHOULD contain after
the stored procedures transform data from Stage 2 parsed tables.

This is the most complex stage — it applies:
- Vocabulary lookups (from VocabularyLookupDisplayNames)
- Business rules (BR-D06-xxx)
- Data transformations (name formatting, ZIP codes, address types, etc.)
- Filtering (PHW skip, Billing "R" skip)
- Deduplication (NPI/TIN most recent)
- Status determination (BR-D06-020)
- Dual-write (Organization + Location level)
"""
from typing import List, Dict, Any, Optional
from datetime import date

from src.interfaces.icd_d06.models import ParsedFile, ProviderGroup


class IcdD06Stage3Generator:
    """
    Generates expected Stage 3 (Incoming) rows from a ParsedFile.
    Requires a VocabClient instance for vocabulary lookups.
    """

    def __init__(self, parsed_file: ParsedFile, vocab):
        self.parsed_file = parsed_file
        self.vocab = vocab

    def generate(self) -> List[Dict[str, Any]]:
        """
        Generate all expected Stage 3 rows.
        Returns a flat list of dicts with keys:
            entity_id, record_type, target_table, target_column, row_key, expected_value, vocab_used, business_rule
        """
        expected_rows = []

        for mcd_id, group in self.parsed_file.providers.items():
            if not group.record_01:
                continue

            # Apply filters (BR-D06-005, BR-D06-012)
            if self._should_skip_provider(group):
                continue

            # Generate rows for each Incoming table
            expected_rows.extend(self._generate_organization(group))
            expected_rows.extend(self._generate_location(group))
            expected_rows.extend(self._generate_identifiers(group))
            expected_rows.extend(self._generate_addresses(group))
            expected_rows.extend(self._generate_emails(group))
            expected_rows.extend(self._generate_phones(group))
            expected_rows.extend(self._generate_business_types(group))
            expected_rows.extend(self._generate_organization_types(group))
            expected_rows.extend(self._generate_location_types(group))
            expected_rows.extend(self._generate_location_type_subtypes(group))
            expected_rows.extend(self._generate_specialties(group))
            expected_rows.extend(self._generate_credentials(group))
            expected_rows.extend(self._generate_taxonomies(group))
            expected_rows.extend(self._generate_supported_programs(group))
            expected_rows.extend(self._generate_point_of_contacts(group))
            expected_rows.extend(self._generate_poc_associated_programs(group))
            expected_rows.extend(self._generate_payment_suspensions(group))
            expected_rows.extend(self._generate_waiver_services(group))

        return expected_rows

    # =========================================================================
    # Filters
    # =========================================================================

    def _should_skip_provider(self, group: ProviderGroup) -> bool:
        """Apply BR-D06-005 and BR-D06-012 filters."""
        rec01 = group.record_01

        # BR-D06-012: Billing Indicator "R" → skip
        if rec01.billing_indicator == "R":
            return True

        # BR-D06-005: PHW providers (Type=90, Specialty starts with 85) → skip
        for ptps in group.records_05:
            if ptps.provider_type_code == "90" and ptps.provider_specialty_code.startswith("85"):
                return True

        return False

    # =========================================================================
    # Organization
    # =========================================================================

    def _generate_organization(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganization expected rows."""
        rec01 = group.record_01
        mcd_id = rec01.medicaid_provider_number
        rows = []

        full_name = self._format_name(rec01.provider_full_name, rec01.provider_name_type)
        status = self._determine_status(group)

        rows.append(self._row(mcd_id, "01", "IncomingOrganization", "BusinessProfileFullName", mcd_id, full_name))
        rows.append(self._row(mcd_id, "01", "IncomingOrganization", "BusinessProfileDoingBusinessAsName", mcd_id, full_name))
        rows.append(self._row(mcd_id, "01", "IncomingOrganization", "BusinessProfileShortName", mcd_id, full_name))
        rows.append(self._row(mcd_id, "01", "IncomingOrganization", "StatusDisplayName", mcd_id, status, business_rule="BR-D06-020"))
        rows.append(self._row(mcd_id, "01", "IncomingOrganization", "ProvenanceTypeDisplayName", mcd_id, "MMIS"))

        return rows

    # =========================================================================
    # Location
    # =========================================================================

    def _generate_location(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingLocation expected rows."""
        rec01 = group.record_01
        mcd_id = rec01.medicaid_provider_number
        rows = []

        full_name = self._format_name(rec01.provider_full_name, rec01.provider_name_type)
        status = self._determine_status(group)

        rows.append(self._row(mcd_id, "01", "IncomingLocation", "BusinessProfileFullName", mcd_id, full_name))
        rows.append(self._row(mcd_id, "01", "IncomingLocation", "BusinessProfileDoingBusinessAsName", mcd_id, full_name))
        rows.append(self._row(mcd_id, "01", "IncomingLocation", "BusinessProfileShortName", mcd_id, full_name))
        rows.append(self._row(mcd_id, "01", "IncomingLocation", "StatusDisplayName", mcd_id, status, business_rule="BR-D06-020"))
        rows.append(self._row(mcd_id, "01", "IncomingLocation", "ProvenanceTypeDisplayName", mcd_id, "MMIS"))

        return rows

    # =========================================================================
    # Identifiers (MCD ID, NPI, TIN)
    # =========================================================================

    def _generate_identifiers(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationIdentifiers + IncomingLocationIdentifiers."""
        mcd_id = group.medicaid_provider_number
        rows = []

        # MCD ID identifier — no date range for MCD ID
        for table in ["IncomingOrganizationIdentifiers", "IncomingLocationIdentifiers"]:
            rows.append(self._row(mcd_id, "01", table, "Value", f"MCD|{mcd_id}", mcd_id))
            rows.append(self._row(mcd_id, "01", table, "TypeDisplayName", f"MCD|{mcd_id}", "Medicaid Provider ID"))
            rows.append(self._row(mcd_id, "01", table, "EffectiveDateRangeStartDate", f"MCD|{mcd_id}", ""))
            rows.append(self._row(mcd_id, "01", table, "EffectiveDateRangeEndDate", f"MCD|{mcd_id}", ""))

        # NPI — dedup: most recent effective date, tiebreaker: last in file (BR-D06-022)
        selected_npi = self._dedup_npi(group.records_06)
        if selected_npi:
            npi_eff = self._parse_date(selected_npi.npi_effective_date)
            npi_end = self._parse_date(selected_npi.npi_end_date)
            npi_eff_str = npi_eff.isoformat() if npi_eff else ""
            npi_end_str = npi_end.isoformat() if npi_end else ""
            for table in ["IncomingOrganizationIdentifiers", "IncomingLocationIdentifiers"]:
                rows.append(self._row(mcd_id, "06", table, "Value", f"NPI|{selected_npi.npi}", selected_npi.npi, business_rule="BR-D06-022"))
                rows.append(self._row(mcd_id, "06", table, "TypeDisplayName", f"NPI|{selected_npi.npi}", "National Provider Identifier"))
                rows.append(self._row(mcd_id, "06", table, "EffectiveDateRangeStartDate", f"NPI|{selected_npi.npi}", npi_eff_str, business_rule="BR-D06-022"))
                rows.append(self._row(mcd_id, "06", table, "EffectiveDateRangeEndDate", f"NPI|{selected_npi.npi}", npi_end_str, business_rule="BR-D06-022"))

        # TIN — dedup per type: most recent effective date, tiebreaker: last in file (BR-D06-023)
        for tin_type in ["S", "F"]:
            selected_tin = self._dedup_tin(group.records_03, tin_type)
            if selected_tin:
                type_display = self.vocab.lookup_display_name("tax_id_type", tin_type)
                if type_display is None:
                    type_display = "Federal Employer Identification Number" if tin_type == "F" else "Social Security Number"
                tin_eff = self._parse_date(selected_tin.tin_effective_date)
                tin_end = self._parse_date(selected_tin.tin_end_date)
                tin_eff_str = tin_eff.isoformat() if tin_eff else ""
                tin_end_str = tin_end.isoformat() if tin_end else ""
                for table in ["IncomingOrganizationIdentifiers", "IncomingLocationIdentifiers"]:
                    rows.append(self._row(mcd_id, "03", table, "Value", f"TIN|{selected_tin.tax_id_number}", selected_tin.tax_id_number, business_rule="BR-D06-023", vocab_used="tax_id_type"))
                    rows.append(self._row(mcd_id, "03", table, "TypeDisplayName", f"TIN|{selected_tin.tax_id_number}", type_display, vocab_used="tax_id_type"))
                    rows.append(self._row(mcd_id, "03", table, "EffectiveDateRangeStartDate", f"TIN|{selected_tin.tax_id_number}", tin_eff_str, business_rule="BR-D06-023"))
                    rows.append(self._row(mcd_id, "03", table, "EffectiveDateRangeEndDate", f"TIN|{selected_tin.tax_id_number}", tin_end_str, business_rule="BR-D06-023"))

        return rows

    # =========================================================================
    # Addresses
    # =========================================================================

    def _generate_addresses(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationAddresses + IncomingLocationAddresses."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for addr in group.records_02:
            addr_type_display = self.vocab.lookup_display_name("address_type", addr.address_type_code)
            if addr_type_display is None:
                addr_type_display = {
                    "S": "Rendering/Location Address",
                    "P": "Billing Address",
                    "M": "Mailing Address",
                    "I": "1099 Address",
                }.get(addr.address_type_code, addr.address_type_code)

            # ZIP code formatting (BR-D06-019)
            postal_code = self._format_zip(addr.zip_code, addr.zip_code_extension)

            # Current flag (BR-D06-018: Address Type "S" is "Current")
            is_current = "Yes" if addr.address_type_code == "S" else "No"

            row_key = f"{addr.address_type_code}|{mcd_id}"

            for table in ["IncomingOrganizationAddresses", "IncomingLocationAddresses"]:
                # Column name differs between Org and Location tables
                addr_type_col = "OrganizationPhysicalAddressTypeDisplayName" if table == "IncomingOrganizationAddresses" else "PhysicalAddressTypeDisplayName"
                rows.append(self._row(mcd_id, "02", table, addr_type_col, row_key, addr_type_display, vocab_used="address_type"))
                rows.append(self._row(mcd_id, "02", table, "PhysicalAddressFirstStreetAddress", row_key, addr.street_address_1))
                rows.append(self._row(mcd_id, "02", table, "PhysicalAddressSecondStreetAddress", row_key, addr.street_address_2))
                rows.append(self._row(mcd_id, "02", table, "PhysicalAddressCityName", row_key, addr.city))
                rows.append(self._row(mcd_id, "02", table, "PhysicalAddressPostalCode", row_key, postal_code, business_rule="BR-D06-019"))
                rows.append(self._row(mcd_id, "02", table, "CurrentDisplayName", row_key, is_current, business_rule="BR-D06-018"))

        return rows

    # =========================================================================
    # Emails
    # =========================================================================

    def _generate_emails(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationEmailAddresses + IncomingLocationEmailAddresses."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for addr in group.records_02:
            if not addr.email_address or not addr.email_address.strip():
                continue

            is_primary = "Yes" if addr.address_type_code == "S" else "No"
            row_key = f"EMAIL|{addr.address_type_code}|{mcd_id}"

            for table in ["IncomingOrganizationEmailAddresses", "IncomingLocationEmailAddresses"]:
                rows.append(self._row(mcd_id, "02", table, "EmailAddress", row_key, addr.email_address.strip()))
                rows.append(self._row(mcd_id, "02", table, "IsPrimary", row_key, is_primary))

        return rows

    # =========================================================================
    # Phones
    # =========================================================================

    def _generate_phones(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationPhones + IncomingLocationPhones."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for addr in group.records_02:
            if not addr.phone_number_contact or not addr.phone_number_contact.strip():
                continue

            is_primary = "Yes" if addr.address_type_code == "S" else "No"
            row_key = f"PHONE|{addr.address_type_code}|{mcd_id}"
            extension = addr.phone_extension_contact.strip() if addr.phone_extension_contact else ""

            for table in ["IncomingOrganizationPhones", "IncomingLocationPhones"]:
                rows.append(self._row(mcd_id, "02", table, "PhoneNumber", row_key, addr.phone_number_contact.strip()))
                rows.append(self._row(mcd_id, "02", table, "PhoneExtensionNumber", row_key, extension))
                rows.append(self._row(mcd_id, "02", table, "IsPrimary", row_key, is_primary))

        return rows

    # =========================================================================
    # Business Types
    # =========================================================================

    def _generate_business_types(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationBusinessTypes."""
        mcd_id = group.medicaid_provider_number
        rec01 = group.record_01
        rows = []

        if rec01.organization_type_description:
            display = self.vocab.lookup_display_name("org_business_type", rec01.organization_type_description)
            if display is None:
                display = rec01.organization_type_description

            # Identifier is the organization_type_code, CodeSystemIdentifier is the code system
            identifier = rec01.organization_type_code if rec01.organization_type_code else ""
            code_system = self.vocab.lookup_display_name("org_business_type_code_system", rec01.organization_type_code)
            if code_system is None:
                code_system = "MMIS"

            rows.append(self._row(mcd_id, "01", "IncomingOrganizationBusinessTypes", "DisplayName", mcd_id, display, vocab_used="org_business_type"))
            rows.append(self._row(mcd_id, "01", "IncomingOrganizationBusinessTypes", "Identifier", mcd_id, identifier))
            rows.append(self._row(mcd_id, "01", "IncomingOrganizationBusinessTypes", "CodeSystemIdentifier", mcd_id, code_system))

        return rows

    # =========================================================================
    # Organization Types
    # =========================================================================

    def _generate_organization_types(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationOrganizationTypes."""
        mcd_id = group.medicaid_provider_number
        rec01 = group.record_01
        rows = []

        if rec01.organization_type_code:
            display = self.vocab.lookup_display_name("org_type", rec01.organization_type_code)
            if display is None:
                display = rec01.organization_type_description.strip() if rec01.organization_type_description else rec01.organization_type_code

            code_system = self.vocab.lookup_display_name("org_type_code_system", rec01.organization_type_code)
            if code_system is None:
                code_system = "MMIS"

            rows.append(self._row(mcd_id, "01", "IncomingOrganizationOrganizationTypes", "DisplayName", mcd_id, display, vocab_used="org_type"))
            rows.append(self._row(mcd_id, "01", "IncomingOrganizationOrganizationTypes", "Identifier", mcd_id, rec01.organization_type_code))
            rows.append(self._row(mcd_id, "01", "IncomingOrganizationOrganizationTypes", "CodeSystemIdentifier", mcd_id, code_system))

        return rows

    # =========================================================================
    # Location Types
    # =========================================================================

    def _generate_location_types(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingLocationType from Record Type 05."""
        mcd_id = group.medicaid_provider_number
        rows = []

        # Use the first (primary) provider type from records_05
        if group.records_05:
            ptps = group.records_05[0]
            type_display = self.vocab.lookup_display_name("provider_type", ptps.provider_type_code)
            if type_display is None:
                type_display = ptps.provider_type_description.strip() if ptps.provider_type_description else ptps.provider_type_code

            row_key = f"LOCTYPE|{ptps.provider_type_code}"
            rows.append(self._row(mcd_id, "05", "IncomingLocationType", "PrimaryTypeDisplayName", row_key, type_display, vocab_used="provider_type"))

        return rows

    # =========================================================================
    # Location Type Subtypes
    # =========================================================================

    def _generate_location_type_subtypes(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingLocationTypeSubtypes from Record Type 05."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for ptps in group.records_05:
            subtype_display = self.vocab.lookup_display_name("provider_specialty_subtype", ptps.provider_specialty_code)
            if subtype_display is None:
                subtype_display = ptps.provider_specialty_description.strip() if ptps.provider_specialty_description else ptps.provider_specialty_code

            code_system = self.vocab.lookup_display_name("provider_specialty_subtype_code_system", ptps.provider_specialty_code)
            if code_system is None:
                code_system = "MMIS"

            row_key = f"SUBTYPE|{ptps.provider_type_code}|{ptps.provider_specialty_code}"
            rows.append(self._row(mcd_id, "05", "IncomingLocationTypeSubtypes", "DisplayName", row_key, subtype_display, vocab_used="provider_specialty_subtype"))
            rows.append(self._row(mcd_id, "05", "IncomingLocationTypeSubtypes", "Identifier", row_key, ptps.provider_specialty_code))
            rows.append(self._row(mcd_id, "05", "IncomingLocationTypeSubtypes", "CodeSystemIdentifier", row_key, code_system))

        return rows

    # =========================================================================
    # Specialties
    # =========================================================================

    def _generate_specialties(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingLocationSpecialty."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for idx, ptps in enumerate(group.records_05):
            specialty_display = self.vocab.lookup_display_name("provider_specialty", ptps.provider_specialty_code)
            if specialty_display is None:
                specialty_display = ptps.provider_specialty_description

            eff_date = self._parse_date(ptps.provider_type_specialty_effective_date)
            end_date = self._parse_date(ptps.provider_type_specialty_end_date)
            eff_str = eff_date.isoformat() if eff_date else ""
            end_str = end_date.isoformat() if end_date else ""

            # First specialty in the list is primary
            is_primary = "Yes" if idx == 0 else "No"

            row_key = f"{ptps.provider_specialty_code}|{ptps.provider_type_specialty_effective_date}"
            rows.append(self._row(mcd_id, "05", "IncomingLocationSpecialty", "TypeDisplayName", row_key, specialty_display, vocab_used="provider_specialty"))
            rows.append(self._row(mcd_id, "05", "IncomingLocationSpecialty", "EffectiveDateRangeStartDate", row_key, eff_str))
            rows.append(self._row(mcd_id, "05", "IncomingLocationSpecialty", "EffectiveDateRangeEndDate", row_key, end_str))
            rows.append(self._row(mcd_id, "05", "IncomingLocationSpecialty", "IsPrimary", row_key, is_primary))

        return rows

    # =========================================================================
    # Credentials (Licenses + Certifications)
    # =========================================================================

    def _generate_credentials(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationCredentials + IncomingLocationCredentials."""
        mcd_id = group.medicaid_provider_number
        rows = []

        # Licenses (Record Type 13) → TypeDisplayName = "Licensed"
        for lic in group.records_13:
            row_key = f"LIC|{lic.license_number}"
            lic_eff = self._parse_date(lic.license_effective_date)
            lic_end = self._parse_date(lic.license_end_date)
            lic_eff_str = lic_eff.isoformat() if lic_eff else ""
            lic_end_str = lic_end.isoformat() if lic_end else ""

            for table in ["IncomingOrganizationCredentials", "IncomingLocationCredentials"]:
                rows.append(self._row(mcd_id, "13", table, "CredentialNumber", row_key, lic.license_number))
                rows.append(self._row(mcd_id, "13", table, "TypeDisplayName", row_key, "Licensed"))
                rows.append(self._row(mcd_id, "13", table, "EffectiveDateRangeStartDate", row_key, lic_eff_str))
                rows.append(self._row(mcd_id, "13", table, "EffectiveDateRangeEndDate", row_key, lic_end_str))
                if lic.licensure_board_description:
                    rows.append(self._row(mcd_id, "13", table, "LicensureBoardDisplayName", row_key, lic.licensure_board_description, vocab_used="licensure_board"))

        # Certifications (Record Type 14) → TypeDisplayName = "Certified"
        for cert in group.records_14:
            row_key = f"CERT|{cert.certification_number}|{cert.certification_type_code}"
            cert_eff = self._parse_date(cert.certification_effective_date)
            cert_end = self._parse_date(cert.certification_end_date)
            cert_eff_str = cert_eff.isoformat() if cert_eff else ""
            cert_end_str = cert_end.isoformat() if cert_end else ""

            for table in ["IncomingOrganizationCredentials", "IncomingLocationCredentials"]:
                rows.append(self._row(mcd_id, "14", table, "CredentialNumber", row_key, cert.certification_number))
                rows.append(self._row(mcd_id, "14", table, "TypeDisplayName", row_key, "Certified"))
                rows.append(self._row(mcd_id, "14", table, "EffectiveDateRangeStartDate", row_key, cert_eff_str))
                rows.append(self._row(mcd_id, "14", table, "EffectiveDateRangeEndDate", row_key, cert_end_str))
                if cert.certification_type_description:
                    rows.append(self._row(mcd_id, "14", table, "CertificationTypeDisplayName", row_key, cert.certification_type_description, vocab_used="certification_type"))

        return rows

    # =========================================================================
    # Waiver Services
    # =========================================================================

    def _generate_waiver_services(self, group: ProviderGroup) -> List[Dict]:
        """Generate expected waiver service rows."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for ws in group.records_11:
            row_key = f"WS|{ws.waiver_service_code}"
            is_active = "1" if ws.waiver_service_status_code == "1" else "0"

            svc_display = self.vocab.lookup_display_name("waiver_service", ws.waiver_service_code)
            if svc_display is None:
                svc_display = ws.waiver_service_description

            ws_eff = self._parse_date(ws.waiver_service_effective_date)
            ws_end = self._parse_date(ws.waiver_service_end_date)
            ws_eff_str = ws_eff.isoformat() if ws_eff else ""
            ws_end_str = ws_end.isoformat() if ws_end else ""

            rows.append(self._row(mcd_id, "11", "IncomingLocationExtensionWaiverServices", "WaiverServiceCodeDisplayName", row_key, svc_display, vocab_used="waiver_service", business_rule="BR-D06-015"))
            rows.append(self._row(mcd_id, "11", "IncomingLocationExtensionWaiverServices", "EffectiveDateRangeStartDate", row_key, ws_eff_str))
            rows.append(self._row(mcd_id, "11", "IncomingLocationExtensionWaiverServices", "EffectiveDateRangeEndDate", row_key, ws_end_str))
            rows.append(self._row(mcd_id, "11", "IncomingLocationExtensionWaiverServices", "IsActive", row_key, is_active))

        return rows

    # =========================================================================
    # Taxonomies
    # =========================================================================

    def _generate_taxonomies(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingLocationTaxonomies from Record Type 07."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for tax in group.records_07:
            code = tax.taxonomy_code.strip()
            row_key = f"TAX|{code}"

            # Taxonomy classification/specialization names come from a taxonomy lookup
            classification = self.vocab.lookup_display_name("taxonomy_classification", code)
            if classification is None:
                classification = ""
            specialization = self.vocab.lookup_display_name("taxonomy_specialization", code)
            if specialization is None:
                specialization = ""

            rows.append(self._row(mcd_id, "07", "IncomingLocationTaxonomies", "Code", row_key, code))
            rows.append(self._row(mcd_id, "07", "IncomingLocationTaxonomies", "ClassificationName", row_key, classification, vocab_used="taxonomy_classification"))
            rows.append(self._row(mcd_id, "07", "IncomingLocationTaxonomies", "SpecializationName", row_key, specialization, vocab_used="taxonomy_specialization"))

        return rows

    # =========================================================================
    # Supported Programs
    # =========================================================================

    def _generate_supported_programs(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationSupportedPrograms + IncomingLocationSupportedPrograms from Record Type 10."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for prog in group.records_10:
            program_display = self.vocab.lookup_display_name("waiver_program", prog.waiver_program_code)
            if program_display is None:
                program_display = prog.waiver_program_description.strip() if prog.waiver_program_description else prog.waiver_program_code

            eff_date = self._parse_date(prog.waiver_program_effective_date)
            end_date = self._parse_date(prog.waiver_program_end_date)
            eff_str = eff_date.isoformat() if eff_date else ""
            end_str = end_date.isoformat() if end_date else ""

            row_key = f"PROG|{prog.waiver_program_code}"

            for table in ["IncomingOrganizationSupportedPrograms", "IncomingLocationSupportedPrograms"]:
                rows.append(self._row(mcd_id, "10", table, "ProgramKey", row_key, program_display, vocab_used="waiver_program"))
                rows.append(self._row(mcd_id, "10", table, "EffectiveDateRangeStartDate", row_key, eff_str))
                rows.append(self._row(mcd_id, "10", table, "EffectiveDateRangeEndDate", row_key, end_str))

        return rows

    # =========================================================================
    # Point of Contacts
    # =========================================================================

    def _generate_point_of_contacts(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationPointOfContact + IncomingLocationPointOfContact from Record Type 02."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for addr in group.records_02:
            contact_name = addr.contact_person.strip() if addr.contact_person else ""
            if not contact_name:
                continue

            row_key = f"POC|{addr.address_type_code}|{mcd_id}"
            phone = addr.phone_number_contact.strip() if addr.phone_number_contact else ""
            email = addr.email_address.strip() if addr.email_address else ""

            # Map address type to POC type display name
            poc_type_map = {
                "S": "Rendering/Location",
                "P": "Billing",
                "M": "Mailing",
                "I": "1099",
            }
            type_display = self.vocab.lookup_display_name("poc_type", addr.address_type_code)
            if type_display is None:
                type_display = poc_type_map.get(addr.address_type_code, addr.address_type_code)

            for table in ["IncomingOrganizationPointOfContact", "IncomingLocationPointOfContact"]:
                rows.append(self._row(mcd_id, "02", table, "Name", row_key, contact_name))
                rows.append(self._row(mcd_id, "02", table, "Title", row_key, ""))
                rows.append(self._row(mcd_id, "02", table, "TypeDisplayName", row_key, type_display))
                if phone:
                    rows.append(self._row(mcd_id, "02", table, "PhoneNumber", row_key, phone))
                if email:
                    rows.append(self._row(mcd_id, "02", table, "EmailAddressAddress", row_key, email))

        return rows

    # =========================================================================
    # POC Associated Programs
    # =========================================================================

    def _generate_poc_associated_programs(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingOrganizationPointOfContactAssociatedPrograms + IncomingLocationPointOfContactAssociatedPrograms."""
        mcd_id = group.medicaid_provider_number
        rows = []

        # Each POC (derived from address records with contact person) gets associated
        # with the supported programs (from records_10) for this provider.
        has_contacts = any(
            addr.contact_person and addr.contact_person.strip()
            for addr in group.records_02
        )
        if not has_contacts or not group.records_10:
            return rows

        for addr in group.records_02:
            contact_name = addr.contact_person.strip() if addr.contact_person else ""
            if not contact_name:
                continue

            for prog in group.records_10:
                program_display = self.vocab.lookup_display_name("waiver_program", prog.waiver_program_code)
                if program_display is None:
                    program_display = prog.waiver_program_description.strip() if prog.waiver_program_description else prog.waiver_program_code

                row_key = f"POCPROG|{addr.address_type_code}|{prog.waiver_program_code}|{mcd_id}"

                rows.append(self._row(mcd_id, "10", "IncomingOrganizationPointOfContactAssociatedPrograms", "ProgramKey", row_key, program_display, vocab_used="waiver_program"))
                rows.append(self._row(mcd_id, "10", "IncomingLocationPointOfContactAssociatedPrograms", "ProgramKey", row_key, program_display, vocab_used="waiver_program"))

        return rows

    # =========================================================================
    # Payment Suspensions
    # =========================================================================

    def _generate_payment_suspensions(self, group: ProviderGroup) -> List[Dict]:
        """Generate IncomingPaymentSuspension from Record Type 08 (ACA Payment Hold)."""
        mcd_id = group.medicaid_provider_number
        rows = []

        for hold in group.records_08:
            eff_date = self._parse_date(hold.aca_payment_hold_effective_date)
            end_date = self._parse_date(hold.aca_payment_hold_end_date)
            eff_str = eff_date.isoformat() if eff_date else ""
            end_str = end_date.isoformat() if end_date else ""

            # Map ACA indicator to status display name
            status_map = {"A": "Active", "C": "Closed", "T": "Terminated"}
            status_display = status_map.get(hold.aca_payment_hold_indicator, hold.aca_payment_hold_indicator)

            row_key = f"PAYSUS|{hold.aca_payment_hold_effective_date}|{hold.aca_payment_hold_indicator}"
            rows.append(self._row(mcd_id, "08", "IncomingPaymentSuspension", "StatusDisplayName", row_key, status_display))
            rows.append(self._row(mcd_id, "08", "IncomingPaymentSuspension", "EffectiveDateRangeStartDate", row_key, eff_str))
            rows.append(self._row(mcd_id, "08", "IncomingPaymentSuspension", "EffectiveDateRangeEndDate", row_key, end_str))

        return rows

    # =========================================================================
    # Business Rules
    # =========================================================================

    def _determine_status(self, group: ProviderGroup) -> str:
        """
        BR-D06-020: Status = "Active" when BOTH:
        1. Has WVR contract with status "A" and date range includes today
        2. Has IRIS waiver program with date range includes today
        Otherwise "Inactive".
        """
        today = date.today()

        has_active_wvr = False
        for contract in group.records_04:
            if contract.provider_contract_code == "WVR" and contract.contract_enrollment_status_code == "A":
                eff = self._parse_date(contract.contract_effective_date)
                end = self._parse_date(contract.contract_end_date)
                if eff and end and eff <= today <= end:
                    has_active_wvr = True
                    break

        has_active_iris = False
        for prog in group.records_10:
            if prog.waiver_program_code == "IRIS":
                eff = self._parse_date(prog.waiver_program_effective_date)
                end = self._parse_date(prog.waiver_program_end_date)
                if eff and end and eff <= today <= end:
                    has_active_iris = True
                    break

        return "Active" if (has_active_wvr and has_active_iris) else "Inactive"

    def _dedup_npi(self, npi_records) -> Optional[Any]:
        """BR-D06-022: Keep only most recent NPI. Tiebreaker: last in file."""
        if not npi_records:
            return None
        sorted_npis = sorted(
            npi_records,
            key=lambda r: (self._parse_date(r.npi_effective_date) or date.min, r.line_number),
            reverse=True,
        )
        return sorted_npis[0]

    def _dedup_tin(self, tin_records, tin_type: str) -> Optional[Any]:
        """BR-D06-023: Keep only most recent TIN per type. Tiebreaker: last in file."""
        typed_tins = [t for t in tin_records if t.tax_id_type == tin_type]
        if not typed_tins:
            return None
        sorted_tins = sorted(
            typed_tins,
            key=lambda r: (self._parse_date(r.tin_effective_date) or date.min, r.line_number),
            reverse=True,
        )
        return sorted_tins[0]

    # =========================================================================
    # Transformations
    # =========================================================================

    @staticmethod
    def _format_name(raw_name: str, name_type: str) -> str:
        """
        Format provider name per ICD-D06 rules.
        Personal (P): source is "Last(1-25) First(26-38) MI(39)" → target is "First MI Last"
        Business (B): stored directly as-is.

        The source data uses fixed-width positional layout within the 50-char field:
          - Positions 0-24 (25 chars): Last name
          - Positions 25-37 (13 chars): First name
          - Position 38 (1 char): Middle initial

        Note: The parser strips trailing whitespace from the field, so the string
        may be shorter than 39 chars even for Personal names. We use position 25
        as the boundary — if the string is long enough to contain a first name
        (len > 25), we extract it positionally.
        """
        if name_type == "P":
            last = raw_name[0:25].strip() if len(raw_name) > 0 else ""
            first = raw_name[25:38].strip() if len(raw_name) > 25 else ""
            mi = raw_name[38:39].strip() if len(raw_name) > 38 else ""
            parts = [p for p in [first, mi, last] if p]
            return " ".join(parts)
        return raw_name.strip()

    @staticmethod
    def _format_zip(zip_code: str, extension: str) -> str:
        """BR-D06-019: Format ZIP as 5 digits or 5-dash-4."""
        zip_code = zip_code.strip() if zip_code else ""
        extension = extension.strip() if extension else ""
        if zip_code and extension:
            return f"{zip_code}-{extension}"
        return zip_code

    @staticmethod
    def _parse_date(date_str: str) -> Optional[date]:
        """Parse YYYYMMDD string to date object."""
        if not date_str or len(date_str) != 8:
            return None
        try:
            return date(int(date_str[0:4]), int(date_str[4:6]), int(date_str[6:8]))
        except (ValueError, TypeError):
            return None

    # =========================================================================
    # Utility
    # =========================================================================

    @staticmethod
    def _row(mcd_id: str, record_type: str, target_table: str, target_column: str,
             row_key: str, expected_value: str, vocab_used: str = None, business_rule: str = None) -> Dict:
        """Build a standard expected state row dict."""
        return {
            "entity_id": mcd_id,
            "record_type": record_type,
            "target_table": target_table,
            "target_column": target_column,
            "row_key": row_key,
            "expected_value": expected_value,
            "vocab_used": vocab_used,
            "business_rule": business_rule,
        }
