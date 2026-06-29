-- =============================================================================
-- TEST SCENARIO 3: LARGE MISMATCH (11 intentional differences for Provider 3)
-- =============================================================================
-- This script inserts data into Stage 1 (MedicaidProviderRaw), Stage 2
-- (CustomerInterfaceModule parsed tables), Stage 3 (InterfaceModule)
-- Incoming tables, AND Stage 4 (OrganizationModule in Carity DB).
-- Stages 1 and 2 are fully consistent. Stage 3 has
-- 11 intentional mismatches for Provider 3 (000000000024680) ONLY.
-- Stage 4 has LARGE mismatches simulating a Carity DB that is severely out of sync.
--
-- Providers:
--   000000000012345 - Smith, John M (Individual Physician)
--   000000000067890 - Lakeside Medical Group (Organization)
--   000000000024680 - Johnson, Mary A (Sole Proprietor Dentist)
--
-- Expected Mismatches (Provider 3 only):
--   1.  Name: "Johnson, Mary" instead of "Mary A Johnson"
--   2.  StatusDisplayName: "Active" instead of "Inactive"
--   3.  NPI Value: "9999999999" instead of "5556667778"
--   4.  TIN Value: "999888777" instead of "392468013"
--   5.  TIN TypeDisplayName: "Social Security Number" instead of "Social Security Number (SSN)"
--   6.  S (Rendering) PhysicalAddressCityName: "Chicago" instead of "Green Bay"
--   7.  S (Rendering) PhysicalAddressStateProvinceDisplayName: "IL" instead of "WI"
--   8.  S (Rendering) PhysicalAddressPostalCode: "60601-0001" instead of "54301-0001"
--   9.  BusinessType: "Government"/5 instead of "Sole Proprietor"/4
--   10. Specialty TypeDisplayName: "Orthodontics" instead of "General Dentistry"
--   11. CERT005 "Certified" row MISSING (removed from Stage 3)
--
-- Use this to verify: "pipeline detects large mismatches in Stage 3"
-- =============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting]

DECLARE @BatchKey UNIQUEIDENTIFIER = NEWID();
DECLARE @Now DATETIME2 = GETUTCDATE();

DECLARE @McdId1 NVARCHAR(15) = N'000000000012345';
DECLARE @McdId2 NVARCHAR(15) = N'000000000067890';
DECLARE @McdId3 NVARCHAR(15) = N'000000000024680';

-- Cleanup existing test data
DELETE FROM [InterfaceModule].[IncomingLocationTaxonomies] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingLocationSpecialty] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingLocationCredentials] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingLocationAddresses] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingLocationIdentifiers] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingLocation] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingOrganizationCredentials] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingOrganizationAddresses] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingOrganizationIdentifiers] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingOrganizationBusinessTypes] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [InterfaceModule].[IncomingOrganization] WHERE CustomerProviderIdentifier LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderCertificationAndCredentials] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderCountyAndTribeServed] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderWaiverService] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderWaiverProgram] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderAcaPaymentHold] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderLicense] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderTaxonomy] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderNpi] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderTypeAndSpecialty] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderContract] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderTin] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderContact] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderAddress] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderMain] WHERE MedicaidProviderNumber LIKE N'000000000%';
DELETE FROM [CustomerInterfaceModule].[MedicaidProviderRaw] WHERE MedicaidProviderNumber LIKE N'000000000%';

-- =============================================================================
-- STAGE 1: CustomerInterfaceModule.MedicaidProviderRaw
-- =============================================================================
-- All lines from the PSV file (except line 0 header) inserted as raw columns.
-- =============================================================================

INSERT INTO [CustomerInterfaceModule].[MedicaidProviderRaw]
    (RecordType, MedicaidProviderNumber, Column3, Column4, Column5, Column6,
     Column7, Column8, Column9, Column10, Column11, Column12, Column13,
     Column14, Column15, Column16, Column17, HasErrors, InterfaceBatchKey)
VALUES
-- Provider 1: 000000000012345 (Smith, John M)
    ('01', @McdId1, N'Smith                    John         M', N'P', N'1', N'For Profit', N'A', N'B', N'I', N'B', N'Y', N'Y', N'00005', N'00012', N'20270115', N'Y', N'20260101', 0, @BatchKey),
    ('02', @McdId1, N'S', N'Smith                    John         M', N'123 Main Street', N'Suite 200', N'Madison', N'WI', N'53703', N'1234', N'5500100000', N'admin@smithmedical.com', N'Jane Doe', N'6085551234', N'1001', N'6085559876', NULL, 0, @BatchKey),
    ('02', @McdId1, N'M', N'Smith                    John         M', N'PO Box 4456', N' ', N'Madison', N'WI', N'53704', N'4456', N' ', N'john.smith@email.com', N' ', N' ', N' ', N' ', NULL, 0, @BatchKey),
    ('02', @McdId1, N'P', N'Smith Medical Billing LLC', N'789 Payment Ave', N' ', N'Madison', N'WI', N'53703', N'1234', N' ', N' ', N'Bob Wilson', N'6085552345', N'2002', N'', NULL, 0, @BatchKey),
    ('03', @McdId1, N'391234567', N'S', N'20200101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('04', @McdId1, N'MEDSV', N'20200101', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('05', @McdId1, N'31', N'Physician', N'100', N'General Practice', N'20200101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('05', @McdId1, N'31', N'Physician', N'110', N'Internal Medicine', N'20200101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('06', @McdId1, N'1234567890', N'20200101', N'99991231', N'NPI', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('07', @McdId1, N'207Q00000X', N'20200101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('13', @McdId1, N'MD12345678', N'20200101', N'20270101', N'MED', N'Medical Examining Board', N'PH1', N'DSPS Physician(MD)', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('14', @McdId1, N'CERT001', N'BM', N'American Board of Medical Specialties (ABMS)', N' ', N' ', N'20200101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('14', @McdId1, N'CERT002', N'HC', N'HealthCheck Screener', N' ', N' ', N'20220601', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
-- Provider 2: 000000000067890 (Lakeside Medical Group)
    ('01', @McdId2, N'Lakeside Medical Group', N'B', N'6', N'Not for Profit', N'A', N' ', N'O', N'Y', N'Y', N'Y', N' ', N' ', N'20261201', N'N', N'', 0, @BatchKey),
    ('02', @McdId2, N'S', N'Lakeside Medical Group', N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202', N'5678', N'4000100000', N' ', N'Sarah Connor', N'4145551000', N' ', N'4145551111', NULL, 0, @BatchKey),
    ('02', @McdId2, N'M', N'Lakeside Medical Group', N'PO Box 8899', N' ', N'Milwaukee', N'WI', N'53201', N'8899', N' ', N'info@lakesidemedical.org', N' ', N' ', N' ', N' ', NULL, 0, @BatchKey),
    ('02', @McdId2, N'P', N'Lakeside Medical Group', N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202', N'5678', N' ', N' ', N'Sarah Connor', N'4145551000', N' ', N'', NULL, 0, @BatchKey),
    ('03', @McdId2, N'396789012', N'F', N'20180601', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('04', @McdId2, N'MEDSV', N'20180601', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('04', @McdId2, N'WVR', N'20190101', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('05', @McdId2, N'01', N'Clinic', N'200', N'Multi-Specialty Clinic', N'20180601', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('06', @McdId2, N'9876543210', N'20180601', N'99991231', N'NPI', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('06', @McdId2, N'1112223334', N'20200101', N'99991231', N'Subpart NPI', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('07', @McdId2, N'261QM0801X', N'20180601', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('08', @McdId2, N'20250101', N'20250601', N'C', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('10', @McdId2, N'FAMCR', N'Family Care', N'20190101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('10', @McdId2, N'IRIS', N'IRIS:Include, Respect, I Self-Direct', N'20200601', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('11', @McdId2, N'WVR001', N'Transportation (Non Emerg Med & Comm) - FC/FCP/PACE', N'20190101', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('11', @McdId2, N'WVR005', N'Respite Care', N'20200601', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('11', @McdId2, N'WVR016', N'Care Management', N'20190101', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('12', @McdId2, N'4000100000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('12', @McdId2, N'4000200000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('12', @McdId2, N'4000300000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('14', @McdId2, N'CERT003', N'JC', N'JCAHO', N' ', N' ', N'20180601', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('14', @McdId2, N'CERT004', N'HM', N'Home and Community-Based Services Compliance', N'10', N'HCBS Compliance', N'20190101', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
-- Provider 3: 000000000024680 (Johnson, Mary A)
    ('01', @McdId3, N'Johnson                  Mary         A', N'P', N'4', N'Sole Proprietor', N' ', N'B', N'I', N'N', N'Y', N'Y', N'00003', N'00008', N'20270601', N'N', N'', 0, @BatchKey),
    ('02', @McdId3, N'S', N'Johnson                  Mary         A', N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301', N'0001', N'0500100000', N' ', N'Mary Johnson', N'9205553456', N' ', N'9205553457', NULL, 0, @BatchKey),
    ('02', @McdId3, N'M', N'Johnson                  Mary         A', N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301', N'0001', N' ', N'mary.johnson@greenbayhealth.com', N' ', N' ', N' ', N' ', NULL, 0, @BatchKey),
    ('02', @McdId3, N'P', N'Johnson                  Mary         A', N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301', N'0001', N' ', N' ', N'Mary Johnson', N'9205553456', N' ', N'', NULL, 0, @BatchKey),
    ('03', @McdId3, N'392468013', N'S', N'20210315', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('04', @McdId3, N'DENTL', N'20210315', N'99991231', N'A', N'Active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('05', @McdId3, N'35', N'Dentist', N'300', N'General Dentistry', N'20210315', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('06', @McdId3, N'5556667778', N'20210315', N'99991231', N'NPI', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('07', @McdId3, N'1223G0001X', N'20210315', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('09', @McdId3, N'20240101', N'99991231', N'0128', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('12', @McdId3, N'0500100000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('12', @McdId3, N'0500200000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('13', @McdId3, N'DT98765432', N'20210315', N'20270315', N'DEN', N'Dentistry Examining Board', N'DEN', N'Dentist', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey),
    ('14', @McdId3, N'CERT005', N'DD', N'DQA', N' ', N' ', N'20210315', N'99991231', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, @BatchKey);


-- =============================================================================
-- STAGE 2: CustomerInterfaceModule (Parsed Tables)
-- =============================================================================

-- MedicaidProviderMain
-- BillingIndicator = field[9], ProviderNameType = field[3], RevalidationDate = field[14]
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderMain]
    (MedicaidProviderNumber, ProviderFullName, ProviderNameType, OrganizationTypeCode,
     OrganizationTypeDescription, BillingIndicator, RevalidationDate, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'Smith                    John         M', N'P', N'1', N'For Profit', N'B', '2027-01-15', @Now),
    (@McdId2, N'Lakeside Medical Group', N'B', N'6', N'Not for Profit', N'Y', '2026-12-01', @Now),
    (@McdId3, N'Johnson                  Mary         A', N'P', N'4', N'Sole Proprietor', N'N', '2027-06-01', @Now);

-- MedicaidProviderAddress
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderAddress]
    (MedicaidProviderNumber, AddressTypeCode, NameTypeCode, NameAddressSpecific,
     StreetAddress1, StreetAddress2, City, State, ZipCode, ZipCodeExtension,
     PracticeLocationCountyCode, EmailAddress, PhoneNumberMemberUse, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'S', N'S', N'Smith                    John         M', N'123 Main Street', N'Suite 200', N'Madison', N'WI', N'53703', N'1234', N'5500100000', N'admin@smithmedical.com', N'6085559876', @Now),
    (@McdId1, N'M', N'S', N'Smith                    John         M', N'PO Box 4456', N' ', N'Madison', N'WI', N'53704', N'4456', N' ', N'john.smith@email.com', N' ', @Now),
    (@McdId1, N'P', N'S', N'Smith Medical Billing LLC', N'789 Payment Ave', N' ', N'Madison', N'WI', N'53703', N'1234', N' ', N' ', N'', @Now),
    (@McdId2, N'S', N'L', N'Lakeside Medical Group', N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202', N'5678', N'4000100000', N' ', N'4145551111', @Now),
    (@McdId2, N'M', N'L', N'Lakeside Medical Group', N'PO Box 8899', N' ', N'Milwaukee', N'WI', N'53201', N'8899', N' ', N'info@lakesidemedical.org', N' ', @Now),
    (@McdId2, N'P', N'L', N'Lakeside Medical Group', N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202', N'5678', N' ', N' ', N'', @Now),
    (@McdId3, N'S', N'J', N'Johnson                  Mary         A', N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301', N'0001', N'0500100000', N' ', N'9205553457', @Now),
    (@McdId3, N'M', N'J', N'Johnson                  Mary         A', N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301', N'0001', N' ', N'mary.johnson@greenbayhealth.com', N' ', @Now),
    (@McdId3, N'P', N'J', N'Johnson                  Mary         A', N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301', N'0001', N' ', N' ', N'', @Now);

-- MedicaidProviderContact
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderContact]
    (MedicaidProviderNumber, ContactPerson, PhoneNumberContactPerson,
     PhoneNumberExtensionContactPerson, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'Jane Doe', N'6085551234', N'1001', @Now),
    (@McdId1, N'Bob Wilson', N'6085552345', N'2002', @Now),
    (@McdId2, N'Sarah Connor', N'4145551000', N' ', @Now),
    (@McdId3, N'Mary Johnson', N'9205553456', N' ', @Now);

-- MedicaidProviderTin
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderTin]
    (MedicaidProviderNumber, TaxIdNumber, TaxIdType, TinEffectiveDate, TinEndDate, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'391234567', N'S', '2020-01-01', '9999-12-31', @Now),
    (@McdId2, N'396789012', N'F', '2018-06-01', '9999-12-31', @Now),
    (@McdId3, N'392468013', N'S', '2021-03-15', '9999-12-31', @Now);

-- MedicaidProviderContract
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderContract]
    (MedicaidProviderNumber, ProviderContractCode, ContractEffectiveDate, ContractEndDate,
     ContractEnrollmentStatusCode, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'MEDSV', '2020-01-01', '9999-12-31', N'A', @Now),
    (@McdId2, N'MEDSV', '2018-06-01', '9999-12-31', N'A', @Now),
    (@McdId2, N'WVR', '2019-01-01', '9999-12-31', N'A', @Now),
    (@McdId3, N'DENTL', '2021-03-15', '9999-12-31', N'A', @Now);

-- MedicaidProviderTypeAndSpecialty
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderTypeAndSpecialty]
    (MedicaidProviderNumber, ProviderType, ProviderTypeDescription, ProviderSpecialtyCode,
     ProviderSpecialtyDescription, ProviderTypeAndSpecialtyEffectiveDate,
     ProviderTypeAndSpecialtyEndDate, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'31', N'Physician', N'100', N'General Practice', '2020-01-01', '9999-12-31', @Now),
    (@McdId1, N'31', N'Physician', N'110', N'Internal Medicine', '2020-01-01', '9999-12-31', @Now),
    (@McdId2, N'01', N'Clinic', N'200', N'Multi-Specialty Clinic', '2018-06-01', '9999-12-31', @Now),
    (@McdId3, N'35', N'Dentist', N'300', N'General Dentistry', '2021-03-15', '9999-12-31', @Now);

-- MedicaidProviderNpi
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderNpi]
    (MedicaidProviderNumber, Npi, NpiEffectiveDate, NpiEndDate, NpiTypeDescription, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'1234567890     ', '2020-01-01', '9999-12-31', N'NPI', @Now),
    (@McdId2, N'9876543210     ', '2018-06-01', '9999-12-31', N'NPI', @Now),
    (@McdId2, N'1112223334     ', '2020-01-01', '9999-12-31', N'Subpart NPI', @Now),
    (@McdId3, N'5556667778     ', '2021-03-15', '9999-12-31', N'NPI', @Now);

-- MedicaidProviderTaxonomy
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderTaxonomy]
    (MedicaidProviderNumber, Taxonomy, TaxonomyEffectiveDate, TaxonomyEndDate, LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'207Q00000X', '2020-01-01', '9999-12-31', @Now),
    (@McdId2, N'261QM0801X', '2018-06-01', '9999-12-31', @Now),
    (@McdId3, N'1223G0001X', '2021-03-15', '9999-12-31', @Now);

-- MedicaidProviderLicense
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderLicense]
    (MedicaidProviderNumber, LicenseNumber, LicenseEffectiveDate, LicenseEndDate,
     LicensureBoardCode, LicensureBoardDescription, LicenseClassificationDescription,
     LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'MD12345678', '2020-01-01', '2027-01-01', N'MED', N'Medical Examining Board', N'PH1', @Now),
    (@McdId3, N'DT98765432', '2021-03-15', '2027-03-15', N'DEN', N'Dentistry Examining Board', N'DEN', @Now);

-- MedicaidProviderCertificationAndCredentials
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderCertificationAndCredentials]
    (MedicaidProviderNumber, CertificationNumber, CertificationEffectiveDate, CertificationEndDate,
     CertificationTypeCode, CertificationTypeDescription, SpecialProgramCertificationDescription,
     LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'CERT001', '2020-01-01', '9999-12-31', N'BM', N'American Board of Medical Specialties (ABMS)', N'', @Now),
    (@McdId1, N'CERT002', '2022-06-01', '9999-12-31', N'HC', N'HealthCheck Screener', N'', @Now),
    (@McdId2, N'CERT003', '2018-06-01', '9999-12-31', N'JC', N'JCAHO', N'', @Now),
    (@McdId2, N'CERT004', '2019-01-01', '9999-12-31', N'HM', N'Home and Community-Based Services Compliance', N'HCBS Compliance', @Now),
    (@McdId3, N'CERT005', '2021-03-15', '9999-12-31', N'DD', N'DQA', N'', @Now);

-- MedicaidProviderAcaPaymentHold (record type 08)
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderAcaPaymentHold]
    (MedicaidProviderNumber, AcaPaymentHoldEffectiveDate, AcaPaymentHoldEndDate,
     AcaPaymentHoldIndicator, LastSynchronizationTimestamp)
VALUES
    (@McdId2, '2025-01-01', '2025-06-01', N'C', @Now);

-- MedicaidProviderWaiverProgram (record type 10)
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderWaiverProgram]
    (MedicaidProviderNumber, WaiverProgramCode, WaiverProgramDescription,
     WaiverProgramEffectiveDate, WaiverProgramEndDate, LastSynchronizationTimestamp)
VALUES
    (@McdId2, N'FAMCR', N'Family Care', '2019-01-01', '9999-12-31', @Now),
    (@McdId2, N'IRIS', N'IRIS:Include, Respect, I Self-Direct', '2020-06-01', '9999-12-31', @Now);

-- MedicaidProviderWaiverService (record type 11)
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderWaiverService]
    (MedicaidProviderNumber, WaiverServiceCode, WaiverServiceDescription,
     WaiverServiceEffectiveDate, WaiverServiceEndDate, WaiverServiceStatusCode,
     LastSynchronizationTimestamp)
VALUES
    (@McdId2, N'WVR001', N'Transportation (Non Emerg Med & Comm) - FC/FCP/PACE', '2019-01-01', '9999-12-31', N'A', @Now),
    (@McdId2, N'WVR005', N'Respite Care', '2020-06-01', '9999-12-31', N'A', @Now),
    (@McdId2, N'WVR016', N'Care Management', '2019-01-01', '9999-12-31', N'A', @Now);

-- MedicaidProviderCountyAndTribeServed (record type 12)
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderCountyAndTribeServed]
    (MedicaidProviderNumber, CountyCode, LastSynchronizationTimestamp)
VALUES
    (@McdId2, N'4000100000', @Now),
    (@McdId2, N'4000200000', @Now),
    (@McdId2, N'4000300000', @Now),
    (@McdId3, N'0500100000', @Now),
    (@McdId3, N'0500200000', @Now);


-- =============================================================================
-- STAGE 3: InterfaceModule (Incoming Tables) — LARGE MISMATCH
-- =============================================================================
-- Provider 3 has 11 intentional mismatches:
--   MISMATCH #1:  Name "Johnson, Mary" (should be "Mary A Johnson")
--   MISMATCH #2:  StatusDisplayName "Active" (should be "Inactive")
--   MISMATCH #3:  NPI "9999999999" (should be "5556667778")
--   MISMATCH #4:  TIN "999888777" (should be "392468013")
--   MISMATCH #5:  TIN TypeDisplayName "Social Security Number" (should be "Social Security Number (SSN)")
--   MISMATCH #6:  S (Rendering) City "Chicago" (should be "Green Bay")
--   MISMATCH #7:  S (Rendering) State "IL" (should be "WI")
--   MISMATCH #8:  S (Rendering) PostalCode "60601-0001" (should be "54301-0001")
--   MISMATCH #9:  BusinessType "Government"/5 (should be "Sole Proprietor"/4)
--   MISMATCH #10: Specialty "Orthodontics" (should be "General Dentistry")
--   MISMATCH #11: CERT005 "Certified" row MISSING
-- =============================================================================

DECLARE @OrgKey1 UNIQUEIDENTIFIER = NEWID();
DECLARE @OrgKey2 UNIQUEIDENTIFIER = NEWID();
DECLARE @OrgKey3 UNIQUEIDENTIFIER = NEWID();
DECLARE @LocKey1 UNIQUEIDENTIFIER = NEWID();
DECLARE @LocKey2 UNIQUEIDENTIFIER = NEWID();
DECLARE @LocKey3 UNIQUEIDENTIFIER = NEWID();

-- IncomingOrganization
-- MISMATCH #1: Provider 3 name changed from "Mary A Johnson" to "Johnson, Mary"
-- MISMATCH #2: Provider 3 StatusDisplayName changed from "Inactive" to "Active"
INSERT INTO [InterfaceModule].[IncomingOrganization]
    (IncomingOrganizationKey, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (@OrgKey1, N'John M Smith', N'John M Smith', N'John M Smith',
     N'Inactive', N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (@OrgKey2, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (@OrgKey3, N'Johnson, Mary', N'Johnson, Mary', N'Johnson, Mary',
     N'Active', N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingOrganizationIdentifiers
-- MISMATCH #3: Provider 3 NPI changed from "5556667778" to "9999999999"
-- MISMATCH #4: Provider 3 TIN changed from "392468013" to "999888777"
-- MISMATCH #5: Provider 3 TIN TypeDisplayName changed from "Social Security Number (SSN)" to "Social Security Number"
INSERT INTO [InterfaceModule].[IncomingOrganizationIdentifiers]
    (IncomingOrganizationIdentifiersKey, IncomingOrganizationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @OrgKey1, @McdId1, N'Medicaid Provider ID', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'1234567890', N'National Provider Identifier', 2, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'391234567', N'Social Security Number (SSN)', 3, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, @McdId2, N'Medicaid Provider ID', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'9876543210', N'National Provider Identifier', 2, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'1112223334', N'National Provider Identifier', 2, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'396789012', N'Federal Employer Identification Number', 4, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, @McdId3, N'Medicaid Provider ID', 1, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'9999999999', N'National Provider Identifier', 2, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'999888777', N'Social Security Number', 3, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingOrganizationAddresses
-- MISMATCH #6: Provider 3 S (Rendering) City changed from "Green Bay" to "Chicago"
-- MISMATCH #7: Provider 3 S (Rendering) State changed from "WI" to "IL"
-- MISMATCH #8: Provider 3 S (Rendering) PostalCode changed from "54301-0001" to "60601-0001"
INSERT INTO [InterfaceModule].[IncomingOrganizationAddresses]
    (IncomingOrganizationAddressesKey, IncomingOrganizationKey,
     OrganizationPhysicalAddressTypeDisplayName, OrganizationPhysicalAddressTypeIdentifier, OrganizationPhysicalAddressTypeCodeSystemIdentifier,
     PhysicalAddressFirstStreetAddress, PhysicalAddressSecondStreetAddress, PhysicalAddressCityName,
     PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
     CurrentDisplayName, CurrentIdentifier,
     IsActive, IsPrimary, CustomerProviderIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @OrgKey1, N'Rendering/Location', 1, 1,
     N'123 Main Street', N'Suite 200', N'Madison', N'WI', N'53703-1234',
     N'Yes', 1, 1, 1, @McdId1, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'Organization', 2, 1,
     N'PO Box 4456', N' ', N'Madison', N'WI', N'53704-4456',
     N'No', 0, 1, 0, @McdId1, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'Billing', 3, 1,
     N'789 Payment Ave', N' ', N'Madison', N'WI', N'53703-1234',
     N'No', 0, 1, 0, @McdId1, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'Rendering/Location', 1, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'Yes', 1, 1, 1, @McdId2, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'Organization', 2, 1,
     N'PO Box 8899', N' ', N'Milwaukee', N'WI', N'53201-8899',
     N'No', 0, 1, 0, @McdId2, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'Billing', 3, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'No', 0, 1, 0, @McdId2, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Rendering/Location', 1, 1,
     N'250 Oak Avenue', N' ', N'Chicago', N'IL', N'60601-0001',
     N'Yes', 1, 1, 1, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0);

-- IncomingOrganizationCredentials
-- MISMATCH #11: Provider 3 CERT005 "Certified" row REMOVED (only keep "Licensed" DT98765432 row)
INSERT INTO [InterfaceModule].[IncomingOrganizationCredentials]
    (IncomingOrganizationCredentialsKey, IncomingOrganizationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CredentialNumber, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
     LicensureBoardDisplayName, CertificationTypeDisplayName,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @OrgKey1, N'Licensed', 1, 1, N'MD12345678', '2020-01-01', '2027-01-01', N'Medical Examining Board', NULL, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'Certified', 2, 1, N'CERT001', '2020-01-01', '9999-12-31', NULL, N'American Board of Medical Specialties (ABMS)', @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'Certified', 2, 1, N'CERT002', '2022-06-01', '9999-12-31', NULL, N'HealthCheck Screener', @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'Certified', 2, 1, N'CERT003', '2018-06-01', '9999-12-31', NULL, N'JCAHO', @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'Certified', 2, 1, N'CERT004', '2019-01-01', '9999-12-31', NULL, N'Home and Community-Based Services Compliance', @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL, @McdId3, @Now, 1, 0, 0);

-- IncomingOrganizationBusinessTypes
-- MISMATCH #9: Provider 3 BusinessType changed from "Sole Proprietor"/4 to "Government"/5
INSERT INTO [InterfaceModule].[IncomingOrganizationBusinessTypes]
    (IncomingOrganizationBusinessTypesKey, IncomingOrganizationKey,
     DisplayName, Identifier, CodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @OrgKey1, N'For Profit', 1, 1, @McdId1, @Now, 0, 0),
    (NEWID(), @OrgKey2, N'Not for Profit', 6, 1, @McdId2, @Now, 0, 0),
    (NEWID(), @OrgKey3, N'Government', 5, 1, @McdId3, @Now, 0, 0);

-- IncomingLocation
-- MISMATCH #1: Provider 3 name changed from "Mary A Johnson" to "Johnson, Mary"
-- MISMATCH #2: Provider 3 StatusDisplayName changed from "Inactive" to "Active"
INSERT INTO [InterfaceModule].[IncomingLocation]
    (IncomingLocationKey, Version, IncomingOrganizationKey, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, PhoneLastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError, HasErrors)
VALUES
    (@LocKey1, 1, @OrgKey1, N'John M Smith', N'John M Smith', N'John M Smith',
     N'Inactive', N'MMIS', 1, 1, @McdId1, @Now, @Now, 1, 0, 0, 0),
    (@LocKey2, 1, @OrgKey2, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, @McdId2, @Now, @Now, 1, 0, 0, 0),
    (@LocKey3, 1, @OrgKey3, N'Johnson, Mary', N'Johnson, Mary', N'Johnson, Mary',
     N'Active', N'MMIS', 1, 1, @McdId3, @Now, @Now, 1, 0, 0, 0);

-- IncomingLocationIdentifiers
-- MISMATCH #3: Provider 3 NPI changed from "5556667778" to "9999999999"
-- MISMATCH #4: Provider 3 TIN changed from "392468013" to "999888777"
-- MISMATCH #5: Provider 3 TIN TypeDisplayName changed from "Social Security Number (SSN)" to "Social Security Number"
INSERT INTO [InterfaceModule].[IncomingLocationIdentifiers]
    (IncomingLocationIdentifiersKey, IncomingLocationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, @McdId1, N'Medicaid Provider ID', 1, 1, N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'1234567890', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'391234567', N'Social Security Number (SSN)', 3, 1, N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, @McdId2, N'Medicaid Provider ID', 1, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'9876543210', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'1112223334', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'396789012', N'Federal Employer Identification Number', 4, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, @McdId3, N'Medicaid Provider ID', 1, 1, N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'9999999999', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'999888777', N'Social Security Number', 3, 1, N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingLocationAddresses
-- MISMATCH #6: Provider 3 S (Rendering) City changed from "Green Bay" to "Chicago"
-- MISMATCH #7: Provider 3 S (Rendering) State changed from "WI" to "IL"
-- MISMATCH #8: Provider 3 S (Rendering) PostalCode changed from "54301-0001" to "60601-0001"
INSERT INTO [InterfaceModule].[IncomingLocationAddresses]
    (IncomingLocationAddressesKey, IncomingLocationKey,
     PhysicalAddressTypeDisplayName, PhysicalAddressTypeIdentifier, PhysicalAddressTypeCodeSystemIdentifier,
     PhysicalAddressFirstStreetAddress, PhysicalAddressSecondStreetAddress, PhysicalAddressCityName,
     PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
     CurrentDisplayName, CurrentIdentifier,
     IsActive, IsPrimary, CustomerProviderIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, N'Rendering/Location', 1, 1,
     N'123 Main Street', N'Suite 200', N'Madison', N'WI', N'53703-1234',
     N'Yes', 1, 1, 1, @McdId1, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'Organization', 2, 1,
     N'PO Box 4456', N' ', N'Madison', N'WI', N'53704-4456',
     N'No', 0, 1, 0, @McdId1, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'Billing', 3, 1,
     N'789 Payment Ave', N' ', N'Madison', N'WI', N'53703-1234',
     N'No', 0, 1, 0, @McdId1, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'Rendering/Location', 1, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'Yes', 1, 1, 1, @McdId2, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'Organization', 2, 1,
     N'PO Box 8899', N' ', N'Milwaukee', N'WI', N'53201-8899',
     N'No', 0, 1, 0, @McdId2, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'Billing', 3, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'No', 0, 1, 0, @McdId2, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Rendering/Location', 1, 1,
     N'250 Oak Avenue', N' ', N'Chicago', N'IL', N'60601-0001',
     N'Yes', 1, 1, 1, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0);

-- IncomingLocationCredentials
-- MISMATCH #11: Provider 3 CERT005 "Certified" row REMOVED (only keep "Licensed" DT98765432 row)
INSERT INTO [InterfaceModule].[IncomingLocationCredentials]
    (IncomingLocationCredentialsKey, IncomingLocationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CredentialNumber, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
     LicensureBoardDisplayName, CertificationTypeDisplayName,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, N'Licensed', 1, 1, N'MD12345678', '2020-01-01', '2027-01-01', N'Medical Examining Board', NULL, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'Certified', 2, 1, N'CERT001', '2020-01-01', '9999-12-31', NULL, N'American Board of Medical Specialties (ABMS)', @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'Certified', 2, 1, N'CERT002', '2022-06-01', '9999-12-31', NULL, N'HealthCheck Screener', @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'Certified', 2, 1, N'CERT003', '2018-06-01', '9999-12-31', NULL, N'JCAHO', @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'Certified', 2, 1, N'CERT004', '2019-01-01', '9999-12-31', NULL, N'Home and Community-Based Services Compliance', @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL, @McdId3, @Now, 1, 0, 0);

-- IncomingLocationSpecialty
-- MISMATCH #10: Provider 3 TypeDisplayName changed from "General Dentistry" to "Orthodontics"
INSERT INTO [InterfaceModule].[IncomingLocationSpecialty]
    (IncomingLocationSpecialtyKey, IncomingLocationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     IsPrimary, CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, N'General Practice', 100, 1, N'MMIS', 1, 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'Internal Medicine', 110, 1, N'MMIS', 1, 1, 0, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'200 - Audiologist', 200, 1, N'MMIS', 1, 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Orthodontics', 300, 1, N'MMIS', 1, 1, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingLocationTaxonomies
INSERT INTO [InterfaceModule].[IncomingLocationTaxonomies]
    (IncomingLocationTaxonomiesKey, IncomingLocationKey,
     Code, CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, N'207Q00000X', @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'261QM0801X', @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'1223G0001X', @McdId3, @Now, 1, 0, 0);

-- NOTE: IncomingLocationExtensionWaiverServices does not exist in InterfaceModule schema.
-- Waiver services are written to [CustomerOrganizationModule].[LocationExtensionWaiverServices]
-- in Stage 4 (Carity DB) via FK join to LocationExtension. Stage 3 comparison for this
-- table is expected to report MISSING since the table doesn't exist in InterfaceModule.
-- No insert needed here.

-- =============================================================================
-- STAGE 4: OrganizationModule (Carity DB) — LARGE MISMATCH
-- =============================================================================
-- Stage 4 represents the Carity DB state BEFORE the pipeline runs.
-- It simulates a Carity DB that is severely out of sync with Stage 3:
--   LARGE MISMATCH A: Provider 3 Organization name = "M Johnson DDS" (completely wrong)
--   LARGE MISMATCH B: Provider 3 StatusDisplayName = "Terminated" (wrong status)
--   LARGE MISMATCH C: Provider 1 Organization name = "J Smith MD" (abbreviated wrong)
--   LARGE MISMATCH D: Provider 2 NPI "9876543210" MISSING from Carity
--   LARGE MISMATCH E: Provider 3 TIN value = "111222333" (completely wrong)
--   LARGE MISMATCH F: Provider 3 all addresses have wrong city "Milwaukee" / state "WI"
--   LARGE MISMATCH G: Provider 1 BusinessType = "Not for Profit"/6 (should be "For Profit"/1)
--   LARGE MISMATCH H: Provider 3 LocationSpecialty = "Pediatric Dentistry" (completely wrong)
--   LARGE MISMATCH I: Provider 2 CERT003 and CERT004 rows MISSING from Carity
--   LARGE MISMATCH J: Provider 3 Location name = "M Johnson DDS" (matches wrong org name)
--
-- NOTE: These inserts target the CARITY database, not the Interface database.
-- Run this section against the Carity DB (e.g., WiDHS.Qc.Carity.ToolTestig).
-- =============================================================================

USE [WiDHS.Qc.Carity.ToolTestig]

-- Organization
-- LARGE MISMATCH A: Provider 3 name = "M Johnson DDS" (should match Stage 3 "Johnson, Mary")
-- LARGE MISMATCH B: Provider 3 StatusDisplayName = "Terminated" (Stage 3 has "Active")
-- LARGE MISMATCH C: Provider 1 name = "J Smith MD" (should be "John M Smith")
INSERT INTO [OrganizationModule].[Organization]
    (OrganizationKey, Version, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@OrgKey1, 1, N'J Smith MD', N'J Smith MD', N'J Smith MD',
     N'Inactive', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@OrgKey2, 1, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@OrgKey3, 1, N'M Johnson DDS', N'M Johnson DDS', N'M Johnson DDS',
     N'Terminated', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now);

-- Location
-- LARGE MISMATCH J: Provider 3 Location name = "M Johnson DDS" (should match Stage 3 "Johnson, Mary")
-- LARGE MISMATCH C: Provider 1 name = "J Smith MD" (should be "John M Smith")
INSERT INTO [OrganizationModule].[Location]
    (LocationKey, Version, OrganizationKey, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@LocKey1, 1, @OrgKey1, N'J Smith MD', N'J Smith MD', N'J Smith MD',
     N'Inactive', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@LocKey2, 1, @OrgKey2, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@LocKey3, 1, @OrgKey3, N'M Johnson DDS', N'M Johnson DDS', N'M Johnson DDS',
     N'Terminated', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now);

-- OrganizationIdentifiers
-- LARGE MISMATCH D: Provider 2 NPI "9876543210" MISSING (only has Medicaid ID and FEIN)
-- LARGE MISMATCH E: Provider 3 TIN value = "111222333" (should be "999888777" per Stage 3)
INSERT INTO [OrganizationModule].[OrganizationIdentifiers]
    (OrganizationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier)
VALUES
    (@OrgKey1, @McdId1, N'Medicaid Provider ID', 1, 1),
    (@OrgKey1, N'1234567890', N'National Provider Identifier', 2, 1),
    (@OrgKey1, N'391234567', N'Social Security Number (SSN)', 3, 1),
    (@OrgKey2, @McdId2, N'Medicaid Provider ID', 1, 1),
    (@OrgKey2, N'396789012', N'Federal Employer Identification Number', 4, 1),
    (@OrgKey3, @McdId3, N'Medicaid Provider ID', 1, 1),
    (@OrgKey3, N'9999999999', N'National Provider Identifier', 2, 1),
    (@OrgKey3, N'111222333', N'Social Security Number', 3, 1);

-- LocationIdentifiers
-- LARGE MISMATCH D: Provider 2 NPI "9876543210" MISSING
-- LARGE MISMATCH E: Provider 3 TIN value = "111222333" (should be "999888777" per Stage 3)
INSERT INTO [OrganizationModule].[LocationIdentifiers]
    (LocationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier)
VALUES
    (@LocKey1, @McdId1, N'Medicaid Provider ID', 1, 1),
    (@LocKey1, N'1234567890', N'National Provider Identifier', 2, 1),
    (@LocKey1, N'391234567', N'Social Security Number (SSN)', 3, 1),
    (@LocKey2, @McdId2, N'Medicaid Provider ID', 1, 1),
    (@LocKey2, N'396789012', N'Federal Employer Identification Number', 4, 1),
    (@LocKey3, @McdId3, N'Medicaid Provider ID', 1, 1),
    (@LocKey3, N'9999999999', N'National Provider Identifier', 2, 1),
    (@LocKey3, N'111222333', N'Social Security Number', 3, 1);

-- OrganizationAddresses
-- LARGE MISMATCH F: Provider 3 ALL address rows have wrong city "Milwaukee" / state "WI"
INSERT INTO [OrganizationModule].[OrganizationAddresses]
    (OrganizationKey,
     OrganizationPhysicalAddressTypeDisplayName, OrganizationPhysicalAddressTypeIdentifier, OrganizationPhysicalAddressTypeCodeSystemIdentifier,
     PhysicalAddressFirstStreetAddress, PhysicalAddressSecondStreetAddress, PhysicalAddressCityName,
     PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
     CurrentDisplayName, CurrentIdentifier,
     IsActive, IsPrimary,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier)
VALUES
    (@OrgKey1, N'Rendering/Location', 1, 1,
     N'123 Main Street', N'Suite 200', N'Madison', N'WI', N'53703-1234',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@OrgKey1, N'Organization', 2, 1,
     N'PO Box 4456', N' ', N'Madison', N'WI', N'53704-4456',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@OrgKey1, N'Billing', 3, 1,
     N'789 Payment Ave', N' ', N'Madison', N'WI', N'53703-1234',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@OrgKey2, N'Rendering/Location', 1, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@OrgKey2, N'Organization', 2, 1,
     N'PO Box 8899', N' ', N'Milwaukee', N'WI', N'53201-8899',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@OrgKey2, N'Billing', 3, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@OrgKey3, N'Rendering/Location', 1, 1,
     N'250 Oak Avenue', N' ', N'Milwaukee', N'WI', N'53202-0001',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@OrgKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Milwaukee', N'WI', N'53202-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@OrgKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Milwaukee', N'WI', N'53202-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1);

-- LocationAddresses
-- LARGE MISMATCH F: Provider 3 ALL address rows have wrong city "Milwaukee" / state "WI"
INSERT INTO [OrganizationModule].[LocationAddresses]
    (LocationKey,
     PhysicalAddressTypeDisplayName, PhysicalAddressTypeIdentifier, PhysicalAddressTypeCodeSystemIdentifier,
     PhysicalAddressFirstStreetAddress, PhysicalAddressSecondStreetAddress, PhysicalAddressCityName,
     PhysicalAddressStateProvinceDisplayName, PhysicalAddressPostalCode,
     CurrentDisplayName, CurrentIdentifier,
     IsActive, IsPrimary,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier)
VALUES
    (@LocKey1, N'Rendering/Location', 1, 1,
     N'123 Main Street', N'Suite 200', N'Madison', N'WI', N'53703-1234',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@LocKey1, N'Organization', 2, 1,
     N'PO Box 4456', N' ', N'Madison', N'WI', N'53704-4456',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@LocKey1, N'Billing', 3, 1,
     N'789 Payment Ave', N' ', N'Madison', N'WI', N'53703-1234',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@LocKey2, N'Rendering/Location', 1, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@LocKey2, N'Organization', 2, 1,
     N'PO Box 8899', N' ', N'Milwaukee', N'WI', N'53201-8899',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@LocKey2, N'Billing', 3, 1,
     N'500 Lake Drive', N'Building C', N'Milwaukee', N'WI', N'53202-5678',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@LocKey3, N'Rendering/Location', 1, 1,
     N'250 Oak Avenue', N' ', N'Milwaukee', N'WI', N'53202-0001',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@LocKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Milwaukee', N'WI', N'53202-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@LocKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Milwaukee', N'WI', N'53202-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1);

-- OrganizationCredentials
-- LARGE MISMATCH I: Provider 2 CERT003 and CERT004 rows MISSING from Carity
INSERT INTO [OrganizationModule].[OrganizationCredentials]
    (OrganizationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CredentialNumber, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
     LicensureBoardDisplayName, CertificationTypeDisplayName)
VALUES
    (@OrgKey1, N'Licensed', 1, 1, N'MD12345678', '2020-01-01', '2027-01-01', N'Medical Examining Board', NULL),
    (@OrgKey1, N'Certified', 2, 1, N'CERT001', '2020-01-01', '9999-12-31', NULL, N'American Board of Medical Specialties (ABMS)'),
    (@OrgKey1, N'Certified', 2, 1, N'CERT002', '2022-06-01', '9999-12-31', NULL, N'HealthCheck Screener'),
    (@OrgKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL);

-- LocationCredentials
-- LARGE MISMATCH I: Provider 2 CERT003 and CERT004 rows MISSING from Carity
INSERT INTO [OrganizationModule].[LocationCredentials]
    (LocationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CredentialNumber, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
     LicensureBoardDisplayName, CertificationTypeDisplayName)
VALUES
    (@LocKey1, N'Licensed', 1, 1, N'MD12345678', '2020-01-01', '2027-01-01', N'Medical Examining Board', NULL),
    (@LocKey1, N'Certified', 2, 1, N'CERT001', '2020-01-01', '9999-12-31', NULL, N'American Board of Medical Specialties (ABMS)'),
    (@LocKey1, N'Certified', 2, 1, N'CERT002', '2022-06-01', '9999-12-31', NULL, N'HealthCheck Screener'),
    (@LocKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL);

-- OrganizationBusinessTypes
-- LARGE MISMATCH G: Provider 1 BusinessType = "Not for Profit"/6 (should be "For Profit"/1)
INSERT INTO [OrganizationModule].[OrganizationBusinessTypes]
    (OrganizationKey, DisplayName, Identifier, CodeSystemIdentifier)
VALUES
    (@OrgKey1, N'Not for Profit', 6, 1),
    (@OrgKey2, N'Not for Profit', 6, 1),
    (@OrgKey3, N'Government', 5, 1);

-- LocationSpecialty
-- LARGE MISMATCH H: Provider 3 LocationSpecialty = "Pediatric Dentistry" (should be "Orthodontics" per Stage 3)
INSERT INTO [OrganizationModule].[LocationSpecialty]
    (LocationSpecialtyKey, Version, LocationKey, IsPrimary,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (NEWID(), 1, @LocKey1, 1, N'General Practice', 100, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (NEWID(), 1, @LocKey1, 0, N'Internal Medicine', 110, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (NEWID(), 1, @LocKey2, 1, N'Multi-Specialty Clinic', 200, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (NEWID(), 1, @LocKey3, 1, N'Pediatric Dentistry', 300, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now);


PRINT 'TEST SCENARIO 3 (Large Mismatch) inserted successfully.';
PRINT 'Provider 1: ' + @McdId1 + ' | OrgKey: ' + CAST(@OrgKey1 AS NVARCHAR(50)) + ' | LocKey: ' + CAST(@LocKey1 AS NVARCHAR(50));
PRINT 'Provider 2: ' + @McdId2 + ' | OrgKey: ' + CAST(@OrgKey2 AS NVARCHAR(50)) + ' | LocKey: ' + CAST(@LocKey2 AS NVARCHAR(50));
PRINT 'Provider 3: ' + @McdId3 + ' | OrgKey: ' + CAST(@OrgKey3 AS NVARCHAR(50)) + ' | LocKey: ' + CAST(@LocKey3 AS NVARCHAR(50));
PRINT '';
PRINT 'Expected Stage 3 Mismatches (Provider 3 = 000000000024680 ONLY):';
PRINT '  MISMATCH #1:  BusinessProfileFullName/DoingBusinessAs/ShortName = "Johnson, Mary" (expected: "Mary A Johnson")';
PRINT '                Affects: IncomingOrganization, IncomingLocation';
PRINT '  MISMATCH #2:  StatusDisplayName = "Active" (expected: "Inactive")';
PRINT '                Affects: IncomingOrganization, IncomingLocation';
PRINT '  MISMATCH #3:  NPI Value = "9999999999" (expected: "5556667778")';
PRINT '                Affects: IncomingOrganizationIdentifiers, IncomingLocationIdentifiers';
PRINT '  MISMATCH #4:  TIN Value = "999888777" (expected: "392468013")';
PRINT '                Affects: IncomingOrganizationIdentifiers, IncomingLocationIdentifiers';
PRINT '  MISMATCH #5:  TIN TypeDisplayName = "Social Security Number" (expected: "Social Security Number (SSN)")';
PRINT '                Affects: IncomingOrganizationIdentifiers, IncomingLocationIdentifiers';
PRINT '  MISMATCH #6:  S (Rendering) PhysicalAddressCityName = "Chicago" (expected: "Green Bay")';
PRINT '                Affects: IncomingOrganizationAddresses, IncomingLocationAddresses';
PRINT '  MISMATCH #7:  S (Rendering) PhysicalAddressStateProvinceDisplayName = "IL" (expected: "WI")';
PRINT '                Affects: IncomingOrganizationAddresses, IncomingLocationAddresses';
PRINT '  MISMATCH #8:  S (Rendering) PhysicalAddressPostalCode = "60601-0001" (expected: "54301-0001")';
PRINT '                Affects: IncomingOrganizationAddresses, IncomingLocationAddresses';
PRINT '  MISMATCH #9:  BusinessType DisplayName = "Government" / Identifier = 5 (expected: "Sole Proprietor" / 4)';
PRINT '                Affects: IncomingOrganizationBusinessTypes';
PRINT '  MISMATCH #10: Specialty TypeDisplayName = "Orthodontics" (expected: "General Dentistry")';
PRINT '                Affects: IncomingLocationSpecialty';
PRINT '  MISMATCH #11: CERT005 "Certified" row MISSING from IncomingOrganizationCredentials and IncomingLocationCredentials';
PRINT '                Affects: IncomingOrganizationCredentials, IncomingLocationCredentials';
PRINT '';
PRINT 'Expected Stage 4 Mismatches (Carity DB):';
PRINT '  LARGE MISMATCH A: Provider 3 Organization name = "M Johnson DDS" (Stage 3 has "Johnson, Mary")';
PRINT '                    Affects: Organization, Location';
PRINT '  LARGE MISMATCH B: Provider 3 StatusDisplayName = "Terminated" (Stage 3 has "Active")';
PRINT '                    Affects: Organization, Location';
PRINT '  LARGE MISMATCH C: Provider 1 Organization/Location name = "J Smith MD" (Stage 3 has "John M Smith")';
PRINT '                    Affects: Organization, Location';
PRINT '  LARGE MISMATCH D: Provider 2 NPI "9876543210" MISSING from Carity';
PRINT '                    Affects: OrganizationIdentifiers, LocationIdentifiers';
PRINT '  LARGE MISMATCH E: Provider 3 TIN = "111222333" (Stage 3 has "999888777")';
PRINT '                    Affects: OrganizationIdentifiers, LocationIdentifiers';
PRINT '  LARGE MISMATCH F: Provider 3 all addresses have city "Milwaukee"/"WI" (Stage 3 has "Chicago"/"IL" for Rendering)';
PRINT '                    Affects: OrganizationAddresses, LocationAddresses';
PRINT '  LARGE MISMATCH G: Provider 1 BusinessType = "Not for Profit"/6 (Stage 3 has "For Profit"/1)';
PRINT '                    Affects: OrganizationBusinessTypes';
PRINT '  LARGE MISMATCH H: Provider 3 LocationSpecialty = "Pediatric Dentistry" (Stage 3 has "Orthodontics")';
PRINT '                    Affects: LocationSpecialty';
PRINT '  LARGE MISMATCH I: Provider 2 CERT003 + CERT004 rows MISSING from Carity';
PRINT '                    Affects: OrganizationCredentials, LocationCredentials';
PRINT '  LARGE MISMATCH J: Provider 3 Location name = "M Johnson DDS" (Stage 3 has "Johnson, Mary")';
PRINT '                    Affects: Location';
GO
