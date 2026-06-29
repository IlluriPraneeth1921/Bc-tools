"""
ICD-D06 Interface Plugin implementation.

Provides metadata and factory methods for the Medicaid Provider File interface.
"""
from typing import List, Dict, Optional, Any

from src.interfaces.base import (
    InterfacePlugin,
    BaseParser,
    BaseExpectedStateGenerator,
    BaseComparator,
    BaseParsedFile,
)
from src.interfaces.icd_d06.vocab_config import VOCAB_LOOKUP_KEYS


class IcdD06Plugin(InterfacePlugin):
    """ICD-D06: Medicaid Provider File interface plugin."""

    @property
    def interface_type(self) -> str:
        return "icd_d06"

    @property
    def display_name(self) -> str:
        return "ICD-D06: Medicaid Provider File"

    @property
    def file_extensions(self) -> List[str]:
        return [".psv"]

    @property
    def entity_id_field_name(self) -> str:
        return "MedicaidProviderNumber"

    @property
    def description(self) -> str:
        return (
            "Wisconsin DHS Medicaid Provider File Extract with 15 record types (00-14). "
            "Pipe-delimited format with provider demographics, addresses, contracts, "
            "NPIs, taxonomies, waivers, and credentials."
        )

    @property
    def vocab_lookup_keys(self) -> Dict[str, str]:
        return VOCAB_LOOKUP_KEYS

    def create_parser(self) -> BaseParser:
        from src.interfaces.icd_d06.parser import IcdD06Parser
        return IcdD06Parser()

    def create_expected_state_generator(
        self, parsed_file: BaseParsedFile, vocab_client: Optional[Any] = None
    ) -> BaseExpectedStateGenerator:
        from src.interfaces.icd_d06.expected_state import IcdD06ExpectedStateGenerator
        return IcdD06ExpectedStateGenerator(parsed_file, vocab_client)

    def create_comparator(self, entity_id_prefix: str) -> BaseComparator:
        from src.interfaces.icd_d06.comparator import IcdD06Comparator
        return IcdD06Comparator(entity_id_prefix)

    @property
    def pipeline_cleanup_config(self):
        """ICD-D06 Stages 1-3 cleanup targets."""
        return [
            # Stage 1
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderRaw", "filter_column": "MedicaidProviderNumber"},
            # Stage 2 — children first, then parent (MedicaidProviderMain has FK children)
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderAddress", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderContact", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderTin", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderContract", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderTypeAndSpecialty", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderNpi", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderTaxonomy", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderAcaPaymentHold", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderWaiverProgram", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderWaiverService", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderCountyAndTribeServed", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderLicense", "filter_column": "MedicaidProviderNumber"},
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderCertificationAndCredentials", "filter_column": "MedicaidProviderNumber"},
            # Stage 2 — parent last
            {"schema": "CustomerInterfaceModule", "table": "MedicaidProviderMain", "filter_column": "MedicaidProviderNumber"},
            # Stage 3 — FK-child first
            {"schema": "InterfaceModule", "table": "IncomingLocationTypeSubtypes",
             "parent_schema": "InterfaceModule", "parent_table": "IncomingLocationType",
             "fk_column": "IncomingLocationTypeKey", "parent_filter_column": "CustomerProviderIdentifier"},
            # Stage 3 — direct filter tables
            {"schema": "InterfaceModule", "table": "IncomingLocationType", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationIdentifiers", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationAddresses", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationCredentials", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationPhones", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationEmailAddresses", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationPointOfContact", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationPointOfContactAssociatedPrograms", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationBusinessTypes", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationOrganizationTypes", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganizationSupportedPrograms", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationIdentifiers", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationAddresses", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationCredentials", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationPhones", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationEmailAddresses", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationPointOfContact", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationPointOfContactAssociatedPrograms", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationSupportedPrograms", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationSpecialty", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingLocationTaxonomies", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingMedicaidEnrollment", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingPaymentSuspension", "filter_column": "CustomerProviderIdentifier"},
            # Parents last
            {"schema": "InterfaceModule", "table": "IncomingLocation", "filter_column": "CustomerProviderIdentifier"},
            {"schema": "InterfaceModule", "table": "IncomingOrganization", "filter_column": "CustomerProviderIdentifier"},
        ]

    @property
    def carity_cleanup_config(self):
        """ICD-D06 Stage 4 (Carity DB) cleanup targets.

        Carity tables use GUID primary keys (LocationKey, OrganizationKey).
        To filter by provider number, we join through the Identifiers tables
        where Value stores the Medicaid Provider Number.
        """
        return [
            # === Grandchild tables (FK to a child, not directly to Location/Organization) ===
            {"schema": "OrganizationModule", "table": "LocationTypeSubtypes",
             "parent_schema": "OrganizationModule", "parent_table": "LocationType",
             "fk_column": "LocationTypeKey", "parent_filter_column": "LocationKey",
             "parent_lookup_schema": "OrganizationModule", "parent_lookup_table": "LocationIdentifiers", "parent_lookup_filter_column": "Value"},
            {"schema": "CustomerOrganizationModule", "table": "LocationExtensionWaiverServices",
             "parent_schema": "CustomerOrganizationModule", "parent_table": "LocationExtension",
             "fk_column": "LocationExtensionKey", "parent_filter_column": "LocationKey",
             "parent_lookup_schema": "OrganizationModule", "parent_lookup_table": "LocationIdentifiers", "parent_lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationPointOfContactAssociatedPrograms",
             "parent_schema": "OrganizationModule", "parent_table": "LocationPointOfContact",
             "fk_column": "LocationPointOfContactKey", "parent_filter_column": "LocationKey",
             "parent_lookup_schema": "OrganizationModule", "parent_lookup_table": "LocationIdentifiers", "parent_lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationServiceAreaCountyAreas",
             "parent_schema": "OrganizationModule", "parent_table": "LocationServiceArea",
             "fk_column": "LocationServiceAreaKey", "parent_filter_column": "LocationKey",
             "parent_lookup_schema": "OrganizationModule", "parent_lookup_table": "LocationIdentifiers", "parent_lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationPointOfContactAssociatedPrograms",
             "parent_schema": "OrganizationModule", "parent_table": "OrganizationPointOfContact",
             "fk_column": "OrganizationPointOfContactKey", "parent_filter_column": "OrganizationKey",
             "parent_lookup_schema": "OrganizationModule", "parent_lookup_table": "OrganizationIdentifiers", "parent_lookup_filter_column": "Value"},
            # === Location-keyed child tables (join through LocationIdentifiers.Value) ===
            {"schema": "OrganizationModule", "table": "LocationType", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "CustomerOrganizationModule", "table": "LocationExtension", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationAddresses", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationCredentials", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationPhones", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationEmailAddresses", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationPointOfContact", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationSupportedPrograms", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationSpecialty", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationTaxonomies", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "LocationServiceArea", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "MedicaidEnrollment", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "PaymentSuspension", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            # === Organization-keyed child tables (join through OrganizationIdentifiers.Value) ===
            {"schema": "OrganizationModule", "table": "OrganizationAddresses", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationCredentials", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationPhones", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationEmailAddresses", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationPointOfContact", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationBusinessTypes", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationOrganizationTypes", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationSupportedPrograms", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            # === Identifiers tables themselves (delete AFTER children that reference the same key) ===
            {"schema": "OrganizationModule", "table": "LocationIdentifiers", "filter_column": "LocationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "LocationIdentifiers", "lookup_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "OrganizationIdentifiers", "filter_column": "OrganizationKey",
             "lookup_schema": "OrganizationModule", "lookup_table": "OrganizationIdentifiers", "lookup_filter_column": "Value"},
            # === Parent tables last (join through Identifiers to find by provider number) ===
            {"schema": "OrganizationModule", "table": "Location",
             "parent_schema": "OrganizationModule", "parent_table": "LocationIdentifiers",
             "fk_column": "LocationKey", "parent_filter_column": "Value"},
            {"schema": "OrganizationModule", "table": "Organization",
             "parent_schema": "OrganizationModule", "parent_table": "OrganizationIdentifiers",
             "fk_column": "OrganizationKey", "parent_filter_column": "Value"},
        ]
