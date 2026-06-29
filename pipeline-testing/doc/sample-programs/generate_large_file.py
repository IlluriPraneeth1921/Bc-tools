"""Generate a large volume test file with 50 providers for performance testing."""
import random
import os

random.seed(42)

output_path = r'c:\Whitelisted\Projects\WIDHS Testing\WI_PROV_FILE_EXTRACT_T_08_LARGE_VOLUME.psv'

cities = [
    ("Madison", "53703", "5500100000"), ("Milwaukee", "53202", "4000100000"),
    ("Green Bay", "54301", "0500100000"), ("Kenosha", "53140", "2600100000"),
    ("Racine", "53402", "5100100000"), ("Appleton", "54911", "4400100000"),
    ("Waukesha", "53186", "6700100000"), ("Oshkosh", "54901", "6600100000"),
    ("Eau Claire", "54701", "1800100000"), ("Janesville", "53545", "5300100000"),
    ("La Crosse", "54601", "3200100000"), ("Sheboygan", "53081", "5900100000"),
    ("Fond du Lac", "54935", "2000100000"), ("Wausau", "54401", "3700100000"),
    ("Brookfield", "53005", "6700200000"), ("Beloit", "53511", "5300200000"),
    ("Manitowoc", "54220", "3600100000"), ("West Allis", "53214", "4000200000"),
    ("Superior", "54880", "1600100000"), ("Stevens Point", "54481", "4900100000"),
]

org_types = [("1", "For Profit"), ("2", "Other"), ("3", "Partnership"), ("4", "Sole Proprietor"),
             ("5", "County Agency"), ("6", "Not for Profit"), ("7", "Limited Liability"),
             ("8", "State Agency"), ("9", "Municipality"), ("A", "Tribal Agency")]

contract_codes = ["MEDSV", "DENTL", "WVR", "PHARM", "HOSPT"]
provider_types = [("31", "Physician", "100", "General Practice"),
                  ("01", "Clinic", "200", "Multi-Specialty Clinic"),
                  ("35", "Dentist", "300", "General Dentistry"),
                  ("20", "Hospital", "150", "General Acute Care Hospital"),
                  ("40", "Pharmacy", "350", "Retail Pharmacy")]

first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
               "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
               "Thomas", "Sarah", "Charles", "Karen"]
last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
              "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
              "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
business_names = ["Health Systems Inc", "Medical Associates", "Family Health Clinic",
                  "Regional Medical Center", "Community Health Services",
                  "Wellness Partners LLC", "Care Network Group",
                  "Professional Medical Corp", "Integrated Health Solutions",
                  "Premier Healthcare Alliance"]

lines = []
num_providers = 50
record_count = 0

for i in range(1, num_providers + 1):
    mcd_id = f"{i:015d}"
    city_info = cities[i % len(cities)]
    city, zipcode, county = city_info
    org = org_types[i % len(org_types)]
    pt = provider_types[i % len(provider_types)]
    
    is_personal = i % 3 == 0
    if is_personal:
        fname = first_names[i % len(first_names)]
        lname = last_names[i % len(last_names)]
        name_padded = f"{lname:<25}{fname:<13}{lname[0]}"
        name_type = "P"
    else:
        bname = f"{business_names[i % len(business_names)]} {i}"
        name_padded = bname[:50]
        name_type = "B"

    medicare_a = "A" if i % 4 != 0 else " "
    medicare_b = "B" if i % 3 != 0 else " "
    loc_status = ["I", "O", "E", "Y"][i % 4]
    billing = ["Y", "N", "B", "R"][i % 4]
    xml_ind = "Y" if i % 2 == 0 else "N"
    prov_dir = "Y" if i % 3 != 0 else "N"
    svc_count = f"{(i * 3):05d}" if i % 5 == 0 else " "
    mem_count = f"{(i * 7):05d}" if i % 5 == 0 else " "
    reval_date = f"2027{(i % 12 + 1):02d}{(i % 28 + 1):02d}"
    ltc_ind = "Y" if i % 7 == 0 else "N"
    ltc_date = f"2026{(i % 12 + 1):02d}01" if i % 7 == 0 else ""

    # Record 01
    lines.append(f"01|{mcd_id}|{name_padded}|{name_type}|{org[0]}|{org[1]}|{medicare_a}|{medicare_b}|{loc_status}|{billing}|{xml_ind}|{prov_dir}|{svc_count}|{mem_count}|{reval_date}|{ltc_ind}|{ltc_date}")
    record_count += 1

    # Record 02 - Service, Mailing, Pay-To
    for addr_type in ["S", "M", "P"]:
        street = f"{i * 100} Provider Street {i}"
        contact = f"Contact Person {i}" if addr_type in ("S", "P") else ""
        phone = f"608555{i:04d}" if addr_type in ("S", "P") else ""
        email = f"provider{i}@test.com" if addr_type == "M" else ""
        county_val = county if addr_type == "S" else ""
        mem_phone = f"608444{i:04d}" if addr_type == "S" else ""
        lines.append(f"02|{mcd_id}|{addr_type}|{name_padded}|{street}| |{city}|WI|{zipcode}| |{county_val}|{email}|{contact}|{phone}| |{mem_phone}")
        record_count += 1

    # Record 03
    tin = f"{900000000 + i}"
    tin_type = "F" if name_type == "B" else "S"
    lines.append(f"03|{mcd_id}|{tin}|{tin_type}|20200101|99991231")
    record_count += 1

    # Record 04 - 1 or 2 contracts
    contract = contract_codes[i % len(contract_codes)]
    lines.append(f"04|{mcd_id}|{contract}|20200101|99991231|A|Active")
    record_count += 1
    if i % 4 == 0:
        lines.append(f"04|{mcd_id}|MEDSV|20150101|20191231|P|Provider Request")
        record_count += 1

    # Record 05
    lines.append(f"05|{mcd_id}|{pt[0]}|{pt[1]}|{pt[2]}|{pt[3]}|20200101|99991231")
    record_count += 1

    # Record 06
    npi = f"{8000000000 + i}"
    lines.append(f"06|{mcd_id}|{npi}|20200101|99991231|NPI")
    record_count += 1

    # Record 07
    taxonomy = ["207Q00000X", "261QM0801X", "1223G0001X", "282N00000X", "333600000X"][i % 5]
    lines.append(f"07|{mcd_id}|{taxonomy}|20200101|99991231")
    record_count += 1

    # Record 13 - License for some
    if i % 3 == 0:
        lic_num = f"LIC{i:07d}"
        lines.append(f"13|{mcd_id}|{lic_num}|20200101|20270101|MED|Medical Examining Board|PH1|DSPS Physician(MD)")
        record_count += 1

    # Record 14 - Certification for some
    if i % 5 == 0:
        cert_num = f"CERT{i:011d}"
        lines.append(f"14|{mcd_id}|{cert_num}|BM|American Board of Medical Specialties (ABMS)| | |20200101|99991231")
        record_count += 1

# Build header
header = f"00|20260618|20240618|20260618|{record_count:012d}|{num_providers:012d}"

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(header + '\n')
    for line in lines:
        f.write(line + '\n')

print(f"Generated {output_path}")
print(f"Providers: {num_providers}, Total records: {record_count}")
