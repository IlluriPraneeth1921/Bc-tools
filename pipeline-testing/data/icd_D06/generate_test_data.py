"""
Generate ICD-D06 Medicaid Provider File test data.

File format: Pipe-delimited (.psv)
- Record Type 00: Header (1 per file)
- Record Types 01-14: Provider data (multiple per provider)

Each line is: RecordType|Field1|Field2|...|FieldN
"""
import os


def build_header(extract_date, period_start, period_end, num_records, num_providers):
    """Build a Record Type 00 header line."""
    return f"00|{extract_date}|{period_start}|{period_end}|{str(num_records).zfill(12)}|{str(num_providers).zfill(12)}"


def build_record(record_type, fields):
    """Build a pipe-delimited record line."""
    return f"{record_type:02d}|" + "|".join(fields)


# =============================================================================
# Baseline providers
# =============================================================================

def _provider_12345():
    """Provider 1: Personal physician, John Smith."""
    lines = [
        "01|000000000012345|Smith                    John         M|P|1|For Profit|A|B|I|B|Y|Y|00005|00012|20270115|Y|20260101",
        "02|000000000012345|S|Smith                    John         M|123 Main Street|Suite 200|Madison|WI|53703|1234|5500100000|admin@smithmedical.com|Jane Doe|6085551234|1001|6085559876",
        "02|000000000012345|M|Smith                    John         M|PO Box 4456| |Madison|WI|53704|4456| |john.smith@email.com| | | | ",
        "02|000000000012345|P|Smith Medical Billing LLC|789 Payment Ave| |Madison|WI|53703|1234| | |Bob Wilson|6085552345|2002|",
        "03|000000000012345|391234567|S|20200101|99991231",
        "04|000000000012345|MEDSV|20200101|99991231|A|Active",
        "05|000000000012345|31|Physician|100|General Practice|20200101|99991231",
        "05|000000000012345|31|Physician|110|Internal Medicine|20200101|99991231",
        "06|000000000012345|1234567890|20200101|99991231|NPI",
        "07|000000000012345|207Q00000X|20200101|99991231",
        "13|000000000012345|MD12345678|20200101|20270101|MED|Medical Examining Board|PH1|DSPS Physician(MD)",
        "14|000000000012345|CERT001|BM|American Board of Medical Specialties (ABMS)| | |20200101|99991231",
        "14|000000000012345|CERT002|HC|HealthCheck Screener| | |20220601|99991231",
    ]
    return lines


def _provider_67890():
    """Provider 2: Clinic, Lakeside Medical Group (with waivers)."""
    lines = [
        "01|000000000067890|Lakeside Medical Group|B|6|Not for Profit|A| |O|Y|Y|Y| | |20261201|N|",
        "02|000000000067890|S|Lakeside Medical Group|500 Lake Drive|Building C|Milwaukee|WI|53202|5678|4000100000| |Sarah Connor|4145551000| |4145551111",
        "02|000000000067890|M|Lakeside Medical Group|PO Box 8899| |Milwaukee|WI|53201|8899| |info@lakesidemedical.org| | | | ",
        "02|000000000067890|P|Lakeside Medical Group|500 Lake Drive|Building C|Milwaukee|WI|53202|5678| | |Sarah Connor|4145551000| |",
        "03|000000000067890|396789012|F|20180601|99991231",
        "04|000000000067890|MEDSV|20180601|99991231|A|Active",
        "04|000000000067890|WVR|20190101|99991231|A|Active",
        "05|000000000067890|01|Clinic|200|Multi-Specialty Clinic|20180601|99991231",
        "06|000000000067890|9876543210|20180601|99991231|NPI",
        "06|000000000067890|1112223334|20200101|99991231|Subpart NPI",
        "07|000000000067890|261QM0801X|20180601|99991231",
        "08|000000000067890|20250101|20250601|C",
        "10|000000000067890|FAMCR|Family Care|20190101|99991231",
        "10|000000000067890|IRIS|IRIS:Include, Respect, I Self-Direct|20200601|99991231",
        "11|000000000067890|WVR001|Transportation (Non Emerg Med & Comm) - FC/FCP/PACE|20190101|99991231|A|Active",
        "11|000000000067890|WVR005|Respite Care|20200601|99991231|A|Active",
        "11|000000000067890|WVR016|Care Management|20190101|99991231|A|Active",
        "12|000000000067890|4000100000",
        "12|000000000067890|4000200000",
        "12|000000000067890|4000300000",
        "14|000000000067890|CERT003|JC|JCAHO| | |20180601|99991231",
        "14|000000000067890|CERT004|HM|Home and Community-Based Services Compliance|10|HCBS Compliance|20190101|99991231",
    ]
    return lines


def _provider_24680():
    """Provider 3: Dentist, Mary Johnson."""
    lines = [
        "01|000000000024680|Johnson                  Mary         A|P|4|Sole Proprietor| |B|I|N|Y|Y|00003|00008|20270601|N|",
        "02|000000000024680|S|Johnson                  Mary         A|250 Oak Avenue| |Green Bay|WI|54301|0001|0500100000| |Mary Johnson|9205553456| |9205553457",
        "02|000000000024680|M|Johnson                  Mary         A|250 Oak Avenue| |Green Bay|WI|54301|0001| |mary.johnson@greenbayhealth.com| | | | ",
        "02|000000000024680|P|Johnson                  Mary         A|250 Oak Avenue| |Green Bay|WI|54301|0001| | |Mary Johnson|9205553456| |",
        "03|000000000024680|392468013|S|20210315|99991231",
        "04|000000000024680|DENTL|20210315|99991231|A|Active",
        "05|000000000024680|35|Dentist|300|General Dentistry|20210315|99991231",
        "06|000000000024680|5556667778|20210315|99991231|NPI",
        "07|000000000024680|1223G0001X|20210315|99991231",
        "09|000000000024680|20240101|99991231|0128",
        "12|000000000024680|0500100000",
        "12|000000000024680|0500200000",
        "13|000000000024680|DT98765432|20210315|20270315|DEN|Dentistry Examining Board|DEN|Dentist",
        "14|000000000024680|CERT005|DD|DQA| | |20210315|99991231",
    ]
    return lines


def _build_file(providers, extract_date="20260618", period_start="20240618", period_end="20260618"):
    """Assemble a complete file from a list of provider line-lists."""
    all_lines = []
    for p in providers:
        all_lines.extend(p)
    num_records = len(all_lines)
    num_providers = len(providers)
    header = build_header(extract_date, period_start, period_end, num_records, num_providers)
    return "\n".join([header] + all_lines)


# =============================================================================
# File generators
# =============================================================================

def generate_baseline():
    """Baseline: 3 providers with full record coverage."""
    return _build_file([_provider_12345(), _provider_67890(), _provider_24680()])


def generate_01_max_lengths():
    """All fields at maximum character lengths."""
    lines = [
        "01|000000000099999|" + "A" * 50 + "|P|9|" + "X" * 25 + "|A|B|I|B|Y|Y|99999|99999|20271231|Y|20261231",
        "02|000000000099999|S|" + "N" * 50 + "|" + "S" * 30 + "|" + "S" * 30 + "|" + "C" * 30 + "|WI|99999|9999|" + "9" * 10 + "|" + "e" * 256 + "|" + "C" * 50 + "|9999999999|9999|9999999999",
        "03|000000000099999|999999999|F|20200101|99991231",
        "04|000000000099999|ABCDE|20200101|99991231|A|" + "D" * 21,
        "05|000000000099999|99|" + "T" * 50 + "|999|" + "S" * 50 + "|20200101|99991231",
        "06|000000000099999|" + "9" * 15 + "|20200101|99991231|" + "N" * 50,
        "07|000000000099999|" + "T" * 10 + "|20200101|99991231",
        "11|000000000099999|" + "W" * 6 + "|" + "D" * 250 + "|20200101|99991231|A|" + "S" * 30,
        "13|000000000099999|" + "L" * 10 + "|20200101|99991231|ABC|" + "B" * 50 + "|XYZ|" + "C" * 50,
        "14|000000000099999|" + "C" * 15 + "|XX|" + "T" * 50 + "|YY|" + "P" * 50 + "|20200101|99991231",
    ]
    return _build_file([lines])


def generate_02_min_empty():
    """Minimal required fields only, optional fields empty."""
    lines = [
        "01|000000000000001|A|B|1|X| | |I|Y| | | | | | |",
        "02|000000000000001|S| | | | |WI| | | | | | | | ",
    ]
    return _build_file([lines])


def generate_03_multiple_occurrences():
    """Provider with many records of same type (addresses, contracts, specialties)."""
    lines = [
        "01|000000000099999|Multi Record Provider|B|1|For Profit|A|B|O|Y|Y|Y|00010|00050|20270101|N|",
        "02|000000000099999|S|Multi Record Provider|100 First St| |Madison|WI|53701|0001| | | | | | ",
        "02|000000000099999|S|Multi Record Provider|200 Second St| |Milwaukee|WI|53202|0002| | | | | | ",
        "02|000000000099999|S|Multi Record Provider|300 Third St| |Green Bay|WI|54301|0003| | | | | | ",
        "02|000000000099999|M|Multi Record Provider|PO Box 999| |Madison|WI|53701|0001| | | | | | ",
        "02|000000000099999|P|Multi Record Provider|400 Payment Rd| |Madison|WI|53703|0004| | | | | | ",
        "04|000000000099999|MEDSV|20200101|99991231|A|Active",
        "04|000000000099999|WVR|20200101|99991231|A|Active",
        "04|000000000099999|DENTL|20210101|99991231|A|Active",
        "04|000000000099999|PHARM|20220101|99991231|A|Active",
        "05|000000000099999|01|Clinic|100|General Practice|20200101|99991231",
        "05|000000000099999|01|Clinic|200|Multi-Specialty|20200101|99991231",
        "05|000000000099999|01|Clinic|300|Pediatrics|20210101|99991231",
        "06|000000000099999|1111111111|20200101|99991231|NPI",
        "06|000000000099999|2222222222|20210101|99991231|NPI",
        "06|000000000099999|3333333333|20220101|99991231|Subpart NPI",
        "06|000000000099999|4444444444|20230101|99991231|Subpart NPI",
        "12|000000000099999|1000100000",
        "12|000000000099999|1000200000",
        "12|000000000099999|1000300000",
        "12|000000000099999|1000400000",
        "12|000000000099999|1000500000",
        "12|000000000099999|1000600000",
        "12|000000000099999|1000700000",
        "12|000000000099999|1000800000",
        "13|000000000099999|LIC0001|20200101|99991231|MED|Medical Board|PH1|Physician",
        "13|000000000099999|LIC0002|20200101|99991231|NRS|Nursing Board|RN1|Registered Nurse",
        "13|000000000099999|LIC0003|20210101|99991231|DEN|Dental Board|DEN|Dentist",
        "13|000000000099999|LIC0004|20220101|99991231|PHR|Pharmacy Board|PH2|Pharmacist",
    ]
    return _build_file([lines])


def generate_04_boundary_dates():
    """Date edge cases: far future, epoch boundaries."""
    lines = [
        "01|000000000044444|Date Test Provider|B|1|For Profit| | |O|Y| | | | |99991231|N|",
        "03|000000000044444|444444444|F|20000101|99991231",
        "03|000000000044444|444444445|S|19990101|20000101",
        "04|000000000044444|MEDSV|20000101|99991231|A|Active",
        "04|000000000044444|WVR|20240229|99991231|A|Active",
    ]
    return _build_file([lines])


def generate_05_all_codes():
    """All billing indicator, org type, location status codes."""
    providers = []
    codes = [
        ("000000000055001", "Y", "1", "I"),
        ("000000000055002", "N", "2", "O"),
        ("000000000055003", "B", "3", "Y"),
        ("000000000055004", "R", "4", "E"),
    ]
    for mcd_id, billing, org_type, loc_status in codes:
        lines = [f"01|{mcd_id}|Code Test {mcd_id[-1]}|B|{org_type}|Type {org_type}|A|B|{loc_status}|{billing}|Y|Y| | |20270101|N|"]
        providers.append(lines)
    return _build_file(providers)


def generate_06_waiver_scenarios():
    """Complex waiver program/service combinations for BR-D06-020 status logic."""
    lines = [
        # WVR active + IRIS active → Status = Active
        "01|000000000066001|Active Waiver Provider|B|1|For Profit| | |O|Y|Y|Y| | |20270101|N|",
        "04|000000000066001|WVR|20190101|99991231|A|Active",
        "10|000000000066001|IRIS|IRIS Program|20200601|99991231",
        "11|000000000066001|WVR001|Transport|20190101|99991231|A|Active",
        # WVR active but NO IRIS → Status = Inactive
        "01|000000000066002|No IRIS Provider|B|1|For Profit| | |O|Y|Y|Y| | |20270101|N|",
        "04|000000000066002|WVR|20190101|99991231|A|Active",
        "10|000000000066002|FAMCR|Family Care|20190101|99991231",
        # No WVR contract → Status = Inactive
        "01|000000000066003|No WVR Provider|B|1|For Profit| | |O|Y|Y|Y| | |20270101|N|",
        "04|000000000066003|MEDSV|20190101|99991231|A|Active",
    ]
    return _build_file([lines], extract_date="20260618")


def generate_07_special_chars():
    """Special characters in names and descriptions."""
    lines = [
        "01|000000000077777|O'Brien-McDonald & Associates, LLC|B|1|For Profit|A|B|O|Y|Y|Y| | |20270101|N|",
        "02|000000000077777|S|O'Brien-McDonald & Associates, LLC|123 Main St. #400| |St. Paul|WI|53703|1234| | | | | | ",
        "11|000000000077777|WVR099|PT/OT (Physical/Occupational Therapy) - \"Enhanced\"|20200101|99991231|A|Active",
    ]
    return _build_file([lines])


def generate_08_large_volume():
    """50 providers for volume testing."""
    providers = []
    for i in range(1, 51):
        mcd_id = f"0000000008{i:04d}"
        lines = [
            f"01|{mcd_id}|Volume Provider {i:03d}|B|1|For Profit|A|B|O|Y|Y|Y|{i:05d}|{i*2:05d}|20270101|N|",
            f"02|{mcd_id}|S|Volume Provider {i:03d}|{i*100} Main St| |Madison|WI|53{700+i:03d}|{i:04d}| | | | | | ",
            f"04|{mcd_id}|MEDSV|20200101|99991231|A|Active",
            f"06|{mcd_id}|{i:010d}|20200101|99991231|NPI",
        ]
        providers.append(lines)
    return _build_file(providers)


# --- Update scenarios ---

def generate_upd01_address_changes():
    """Update: Provider 1 address changed."""
    p1 = _provider_12345()
    # Replace the S address line
    p1[1] = "02|000000000012345|S|Smith                    John         M|456 New Boulevard|Floor 3|Madison|WI|53706|5678|5500100000|new@smithmedical.com|Jane Doe|6085559999|1001|6085559876"
    return _build_file([p1, _provider_67890(), _provider_24680()])


def generate_upd02_contract_status():
    """Update: Provider 2 WVR contract terminated."""
    p2 = _provider_67890()
    # Change WVR contract to terminated
    p2[6] = "04|000000000067890|WVR|20190101|20260601|T|Terminated"
    return _build_file([_provider_12345(), p2, _provider_24680()])


def generate_upd03_demographics():
    """Update: Provider 1 name type changed, revalidation date updated."""
    p1 = _provider_12345()
    p1[0] = "01|000000000012345|Smith Medical Group LLC|B|1|For Profit|A|B|I|B|Y|Y|00005|00012|20280101|Y|20260601"
    return _build_file([p1, _provider_67890(), _provider_24680()])


def generate_upd04_npi_taxonomy():
    """Update: Provider 1 gets new NPI, provider 3 taxonomy changed."""
    p1 = _provider_12345()
    p1.append("06|000000000012345|9999999999|20260101|99991231|NPI")
    p3 = _provider_24680()
    p3[8] = "07|000000000024680|1234567890X|20260101|99991231"
    return _build_file([p1, _provider_67890(), p3])


def generate_upd05_waiver_changes():
    """Update: Provider 2 gains new waiver services."""
    p2 = _provider_67890()
    p2.append("11|000000000067890|WVR020|Adult Day Care|20260101|99991231|A|Active")
    p2.append("11|000000000067890|WVR025|Nursing Services|20260101|99991231|A|Active")
    return _build_file([_provider_12345(), p2, _provider_24680()])


def generate_upd06_new_providers():
    """Update: Two new providers added."""
    new_provider = [
        "01|000000000099001|New Provider One|B|1|For Profit| | |O|Y|Y|Y| | |20280101|N|",
        "02|000000000099001|S|New Provider One|999 New Ave| |Appleton|WI|54911|0001| | | | | | ",
        "04|000000000099001|MEDSV|20260601|99991231|A|Active",
        "06|000000000099001|8888888888|20260601|99991231|NPI",
    ]
    new_provider2 = [
        "01|000000000099002|New Provider Two|P|2|Government| | |I|N|Y|Y| | |20280101|N|",
        "02|000000000099002|S|New Provider Two|888 Gov Blvd| |Milwaukee|WI|53201|0001| | | | | | ",
        "04|000000000099002|MEDSV|20260601|99991231|A|Active",
    ]
    return _build_file([_provider_12345(), _provider_67890(), _provider_24680(), new_provider, new_provider2])


def generate_upd07_term_reactivation():
    """Update: Provider 3 contract terminated then reactivated."""
    p3 = _provider_24680()
    p3[5] = "04|000000000024680|DENTL|20210315|20260101|T|Terminated"
    p3.append("04|000000000024680|DENTL|20260201|99991231|A|Active")
    return _build_file([_provider_12345(), _provider_67890(), p3])


# --- Delete scenarios ---

def generate_del01_provider_removed():
    """Delete: Provider 3 removed entirely."""
    return _build_file([_provider_12345(), _provider_67890()])


def generate_del02_subrecord_removed():
    """Delete: Provider 1 loses second specialty and one certification."""
    p1 = _provider_12345()
    # Remove "Internal Medicine" specialty (index 7) and CERT002 (index 12)
    p1 = [l for i, l in enumerate(p1) if i not in (7, 12)]
    return _build_file([p1, _provider_67890(), _provider_24680()])


def generate_del03_waiver_records_removed():
    """Delete: Provider 2 loses waiver services."""
    p2 = _provider_67890()
    # Remove waiver service lines (indices 14, 15, 16)
    p2 = [l for i, l in enumerate(p2) if i not in (14, 15, 16)]
    return _build_file([_provider_12345(), p2, _provider_24680()])


def generate_del04_multiple_providers_removed():
    """Delete: Providers 2 and 3 removed, only provider 1 remains."""
    return _build_file([_provider_12345()])


def generate_del05_certs_license_removed():
    """Delete: Provider 1 loses all certifications and license."""
    p1 = _provider_12345()
    # Remove license (index 10) and both certs (indices 11, 12)
    p1 = [l for i, l in enumerate(p1) if i not in (10, 11, 12)]
    return _build_file([p1, _provider_67890(), _provider_24680()])


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.abspath(__file__))

    generators = [
        ("WI_PROV_FILE_EXTRACT_T.psv", generate_baseline),
        ("WI_PROV_FILE_EXTRACT_T_01_MAX_LENGTHS.psv", generate_01_max_lengths),
        ("WI_PROV_FILE_EXTRACT_T_02_MIN_EMPTY.psv", generate_02_min_empty),
        ("WI_PROV_FILE_EXTRACT_T_03_MULTIPLE_OCCURRENCES.psv", generate_03_multiple_occurrences),
        ("WI_PROV_FILE_EXTRACT_T_04_BOUNDARY_DATES.psv", generate_04_boundary_dates),
        ("WI_PROV_FILE_EXTRACT_T_05_ALL_CODES.psv", generate_05_all_codes),
        ("WI_PROV_FILE_EXTRACT_T_06_WAIVER_SCENARIOS.psv", generate_06_waiver_scenarios),
        ("WI_PROV_FILE_EXTRACT_T_07_SPECIAL_CHARS.psv", generate_07_special_chars),
        ("WI_PROV_FILE_EXTRACT_T_08_LARGE_VOLUME.psv", generate_08_large_volume),
        ("WI_PROV_FILE_EXTRACT_T_UPD01_ADDRESS_CHANGES.psv", generate_upd01_address_changes),
        ("WI_PROV_FILE_EXTRACT_T_UPD02_CONTRACT_STATUS.psv", generate_upd02_contract_status),
        ("WI_PROV_FILE_EXTRACT_T_UPD03_DEMOGRAPHICS.psv", generate_upd03_demographics),
        ("WI_PROV_FILE_EXTRACT_T_UPD04_NPI_TAXONOMY.psv", generate_upd04_npi_taxonomy),
        ("WI_PROV_FILE_EXTRACT_T_UPD05_WAIVER_CHANGES.psv", generate_upd05_waiver_changes),
        ("WI_PROV_FILE_EXTRACT_T_UPD06_NEW_PROVIDERS.psv", generate_upd06_new_providers),
        ("WI_PROV_FILE_EXTRACT_T_UPD07_TERM_REACTIVATION.psv", generate_upd07_term_reactivation),
        ("WI_PROV_FILE_EXTRACT_T_DEL01_PROVIDER_REMOVED.psv", generate_del01_provider_removed),
        ("WI_PROV_FILE_EXTRACT_T_DEL02_SUBRECORD_REMOVED.psv", generate_del02_subrecord_removed),
        ("WI_PROV_FILE_EXTRACT_T_DEL03_WAIVER_RECORDS_REMOVED.psv", generate_del03_waiver_records_removed),
        ("WI_PROV_FILE_EXTRACT_T_DEL04_MULTIPLE_PROVIDERS_REMOVED.psv", generate_del04_multiple_providers_removed),
        ("WI_PROV_FILE_EXTRACT_T_DEL05_CERTS_LICENSE_REMOVED.psv", generate_del05_certs_license_removed),
    ]

    for filename, gen_func in generators:
        filepath = os.path.join(output_dir, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(gen_func())
        print(f"Generated: {filename}")

    print(f"\nTotal files generated: {len(generators)}")
