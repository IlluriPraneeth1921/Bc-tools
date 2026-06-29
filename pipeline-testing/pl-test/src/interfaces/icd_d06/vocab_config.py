"""
ICD-D06 Vocabulary Lookup Key mappings.

These define how the ICD-D06 Medicaid Provider File maps source values
to vocabulary lookup definitions in the VocabularyLookup tables.
"""

VOCAB_LOOKUP_KEYS = {
    "address_type": "MMIS.MEDICAID PROVIDER.Location Address Type",
    "identifier_type": "MMIS.MEDICAID PROVIDER.Location Identifier Types",
    "org_business_type": "MMIS.MEDICAID PROVIDER.Organization Business Types",
    "certification_type": "MMIS.MEDICAID PROVIDER.Certification Type",
    "licensure_board": "MMIS.MEDICAID PROVIDER.Licensure Board",
    "waiver_service": "MMIS.MEDICAID PROVIDER.Service Definition Other Code Value",
    "provider_specialty": "MMIS.Provider Specialty.Location Specialty Code Type",
    "provider_type": "MMIS.Provider Type.Location Subtype",
    "taxonomy": "MMIS.Provider Taxonomy.Taxonomy Codes",
    "tax_id_type": "MMIS.Tax ID Type.Organization Identifier Types",
    "aca_status": "MMIS.Record Type 08.Payment Suspension Status",
    "county_code": "MMIS.County Code.Counties/Areas",
    "state": "MMIS.State.States/Provinces",
}
