-- =============================================================================
-- TEST SCENARIO 1: PERFECT MATCH
-- =============================================================================
-- This script inserts data into Stage 1 (MedicaidProviderRaw), Stage 2
-- (CustomerInterfaceModule parsed tables), Stage 3 (InterfaceModule Incoming
-- tables), AND Stage 4 (OrganizationModule in Carity DB) such that the data
-- is fully consistent across all 4 stages.
--
-- NOTE: Stages 1-3 target the Interface DB.
--       Stage 4 targets the Carity DB (OrganizationModule schema).
--
-- Providers:
--   000000000012345 - Smith, John M (Individual Physician)
--   000000000067890 - Lakeside Medical Group (Organization)
--   000000000024680 - Johnson, Mary A (Sole Proprietor Dentist)
--
-- Use this to verify: "pipeline produces correct output when everything is right"
-- =============================================================================

USE [WiDHS.Qc.Interface.Carity.ToolTesting]

DECLARE @BatchKey UNIQUEIDENTIFIER = NEWID();
DECLARE @Now DATETIME2 = GETUTCDATE();

DECLARE @McdId1 NVARCHAR(15) = N'000000000012345';
DECLARE @McdId2 NVARCHAR(15) = N'000000000067890';
DECLARE @McdId3 NVARCHAR(15) = N'000000000024680';

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
-- AddressTypeCode = field[2], NameTypeCode = field[3][:1] (first char of name string)
-- NameAddressSpecific = field[3][:50], StreetAddress1 = field[4], StreetAddress2 = field[5]
-- City = field[6], State = field[7], ZipCode = field[8], ZipCodeExtension = field[9]
-- PracticeLocationCountyCode = field[10], EmailAddress = field[11], PhoneNumberMemberUse = field[15]
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
-- LicenseNumber = field[2], LicenseEffectiveDate = field[3], LicenseEndDate = field[4]
-- LicensureBoardCode = field[5], LicensureBoardDescription = field[6]
-- LicenseClassificationDescription = field[7]
INSERT INTO [CustomerInterfaceModule].[MedicaidProviderLicense]
    (MedicaidProviderNumber, LicenseNumber, LicenseEffectiveDate, LicenseEndDate,
     LicensureBoardCode, LicensureBoardDescription, LicenseClassificationDescription,
     LastSynchronizationTimestamp)
VALUES
    (@McdId1, N'MD12345678', '2020-01-01', '2027-01-01', N'MED', N'Medical Examining Board', N'PH1', @Now),
    (@McdId3, N'DT98765432', '2021-03-15', '2027-03-15', N'DEN', N'Dentistry Examining Board', N'DEN', @Now);

-- MedicaidProviderCertificationAndCredentials
-- CertificationNumber = field[2], CertificationTypeCode = field[3]
-- CertificationTypeDescription = field[4], SpecialProgramCertificationDescription = field[6]
-- CertificationEffectiveDate = field[7], CertificationEndDate = field[8]
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
-- STAGE 3: InterfaceModule (Incoming Tables) — PERFECT MATCH
-- =============================================================================

DECLARE @OrgKey1 UNIQUEIDENTIFIER = NEWID();
DECLARE @OrgKey2 UNIQUEIDENTIFIER = NEWID();
DECLARE @OrgKey3 UNIQUEIDENTIFIER = NEWID();
DECLARE @LocKey1 UNIQUEIDENTIFIER = NEWID();
DECLARE @LocKey2 UNIQUEIDENTIFIER = NEWID();
DECLARE @LocKey3 UNIQUEIDENTIFIER = NEWID();

-- IncomingOrganization
-- Name: Personal (type P) = "First MI Last", Business (type B) = trimmed as-is
-- Status: "Active" only if WVR contract (status A, current) AND IRIS waiver program (current)
--   Provider1: No WVR, no IRIS -> Inactive
--   Provider2: WVR contract A (2019-9999) + IRIS (2020-9999) -> Active
--   Provider3: No WVR, no IRIS -> Inactive
INSERT INTO [InterfaceModule].[IncomingOrganization]
    (IncomingOrganizationKey, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (@OrgKey1, N'John M Smith', N'John M Smith', N'John M Smith',
     N'Inactive', N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (@OrgKey2, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (@OrgKey3, N'Mary A Johnson', N'Mary A Johnson', N'Mary A Johnson',
     N'Inactive', N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingOrganizationIdentifiers
-- MCD ID: TypeDisplayName = "Medicaid Provider ID", TypeIdentifier = 1
-- NPI (BR-D06-022 dedup most recent): TypeDisplayName = "National Provider Identifier", TypeIdentifier = 2
--   Provider2: two NPIs, 1112223334 (eff 2020) most recent
-- TIN (BR-D06-023): S -> "Social Security Number (SSN)", F -> "Federal Employer Identification Number"
INSERT INTO [InterfaceModule].[IncomingOrganizationIdentifiers]
    (IncomingOrganizationIdentifiersKey, IncomingOrganizationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @OrgKey1, @McdId1, N'Medicaid Provider ID', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'1234567890', N'National Provider Identifier', 2, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey1, N'391234567', N'Social Security Number (SSN)', 3, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, @McdId2, N'Medicaid Provider ID', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'1112223334', N'National Provider Identifier', 2, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey2, N'396789012', N'Federal Employer Identification Number', 4, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, @McdId3, N'Medicaid Provider ID', 1, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'5556667778', N'National Provider Identifier', 2, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'392468013', N'Social Security Number (SSN)', 3, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingOrganizationAddresses
-- CurrentDisplayName: "Yes" for S, "No" for M and P
-- PostalCode: ZIP-Extension format (e.g., "53703-1234")
-- PhysicalAddressTypeDisplayName: S -> "Rendering/Location", M -> "Organization", P -> "Billing"
-- CurrentIdentifier: 1 for S, 0 for M and P
-- IsActive: always 1
-- IsPrimary: 1 for S, 0 for M and P
-- OrganizationPhysicalAddressTypeIdentifier: 1 for S, 2 for M, 3 for P
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
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'Yes', 1, 1, 1, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0);

-- IncomingOrganizationCredentials
-- License (record 13): TypeDisplayName = "Licensed", CredentialNumber = license_number
-- Certification (record 14): TypeDisplayName = "Certified", CredentialNumber = certification_number
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
    (NEWID(), @OrgKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @OrgKey3, N'Certified', 2, 1, N'CERT005', '2021-03-15', '9999-12-31', NULL, N'DQA', @McdId3, @Now, 1, 0, 0);

-- IncomingOrganizationBusinessTypes
INSERT INTO [InterfaceModule].[IncomingOrganizationBusinessTypes]
    (IncomingOrganizationBusinessTypesKey, IncomingOrganizationKey,
     DisplayName, Identifier, CodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @OrgKey1, N'For Profit', 1, 1, @McdId1, @Now, 0, 0),
    (NEWID(), @OrgKey2, N'Not for Profit', 6, 1, @McdId2, @Now, 0, 0),
    (NEWID(), @OrgKey3, N'Sole Proprietor', 4, 1, @McdId3, @Now, 0, 0);

-- IncomingLocation
INSERT INTO [InterfaceModule].[IncomingLocation]
    (IncomingLocationKey, Version, IncomingOrganizationKey, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, PhoneLastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError, HasErrors)
VALUES
    (@LocKey1, 1, @OrgKey1, N'John M Smith', N'John M Smith', N'John M Smith',
     N'Inactive', N'MMIS', 1, 1, @McdId1, @Now, @Now, 1, 0, 0, 0),
    (@LocKey2, 1, @OrgKey2, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, @McdId2, @Now, @Now, 1, 0, 0, 0),
    (@LocKey3, 1, @OrgKey3, N'Mary A Johnson', N'Mary A Johnson', N'Mary A Johnson',
     N'Inactive', N'MMIS', 1, 1, @McdId3, @Now, @Now, 1, 0, 0, 0);

-- IncomingLocationIdentifiers
INSERT INTO [InterfaceModule].[IncomingLocationIdentifiers]
    (IncomingLocationIdentifiersKey, IncomingLocationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, @McdId1, N'Medicaid Provider ID', 1, 1, N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'1234567890', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'391234567', N'Social Security Number (SSN)', 3, 1, N'MMIS', 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, @McdId2, N'Medicaid Provider ID', 1, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'1112223334', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'396789012', N'Federal Employer Identification Number', 4, 1, N'MMIS', 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, @McdId3, N'Medicaid Provider ID', 1, 1, N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'5556667778', N'National Provider Identifier', 2, 1, N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'392468013', N'Social Security Number (SSN)', 3, 1, N'MMIS', 1, 1, @McdId3, @Now, 1, 0, 0);

-- IncomingLocationAddresses
-- PhysicalAddressTypeDisplayName: S -> "Rendering/Location", M -> "Organization", P -> "Billing"
-- PhysicalAddressTypeIdentifier: 1 for S, 2 for M, 3 for P
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
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'Yes', 1, 1, 1, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, @McdId3, N'MMIS', 1, 1, @Now, 1, 0, 0);

-- IncomingLocationCredentials
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
    (NEWID(), @LocKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL, @McdId3, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'Certified', 2, 1, N'CERT005', '2021-03-15', '9999-12-31', NULL, N'DQA', @McdId3, @Now, 1, 0, 0);

-- IncomingLocationSpecialty
-- IsPrimary: first specialty = 1, rest = 0
INSERT INTO [InterfaceModule].[IncomingLocationSpecialty]
    (IncomingLocationSpecialtyKey, IncomingLocationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     IsPrimary, CustomerProviderIdentifier, LastSynchronizationTimestamp, IsReadyToProcess, HasResponseMessages, HasFatalError)
VALUES
    (NEWID(), @LocKey1, N'General Practice', 100, 1, N'MMIS', 1, 1, 1, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey1, N'Internal Medicine', 110, 1, N'MMIS', 1, 1, 0, @McdId1, @Now, 1, 0, 0),
    (NEWID(), @LocKey2, N'200 - Audiologist', 200, 1, N'MMIS', 1, 1, 1, @McdId2, @Now, 1, 0, 0),
    (NEWID(), @LocKey3, N'General Dentistry', 300, 1, N'MMIS', 1, 1, 1, @McdId3, @Now, 1, 0, 0);

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
-- STAGE 4: OrganizationModule (Carity DB) — PERFECT MATCH
-- =============================================================================
-- Stage 4 is a straight copy of Stage 3 data into the final Carity DB tables.
-- The comparator maps: IncomingOrganization → Organization, IncomingLocation → Location, etc.
-- It groups rows by Value (identifiers), BusinessProfileFullName, or BusinessProfileShortName.
--
-- NOTE: These inserts target the CARITY database, not the Interface database.
-- Run this section against the Carity DB (e.g., WiDHS.Qc.Carity.ToolTestig).
-- =============================================================================

USE [WiDHS.Qc.Carity.ToolTestig]

-- Organization
INSERT INTO [OrganizationModule].[Organization]
    (OrganizationKey, Version, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@OrgKey1, 1, N'John M Smith', N'John M Smith', N'John M Smith',
     N'Inactive', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@OrgKey2, 1, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@OrgKey3, 1, N'Mary A Johnson', N'Mary A Johnson', N'Mary A Johnson',
     N'Inactive', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now);

-- Location
INSERT INTO [OrganizationModule].[Location]
    (LocationKey, Version, OrganizationKey, BusinessProfileFullName, BusinessProfileDoingBusinessAsName, BusinessProfileShortName,
     StatusDisplayName, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (@LocKey1, 1, @OrgKey1, N'John M Smith', N'John M Smith', N'John M Smith',
     N'Inactive', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@LocKey2, 1, @OrgKey2, N'Lakeside Medical Group', N'Lakeside Medical Group', N'Lakeside Medical Group',
     N'Active', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (@LocKey3, 1, @OrgKey3, N'Mary A Johnson', N'Mary A Johnson', N'Mary A Johnson',
     N'Inactive', N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now);

-- OrganizationIdentifiers
INSERT INTO [OrganizationModule].[OrganizationIdentifiers]
    (OrganizationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier)
VALUES
    (@OrgKey1, @McdId1, N'Medicaid Provider ID', 1, 1),
    (@OrgKey1, N'1234567890', N'National Provider Identifier', 2, 1),
    (@OrgKey1, N'391234567', N'Social Security Number (SSN)', 3, 1),
    (@OrgKey2, @McdId2, N'Medicaid Provider ID', 1, 1),
    (@OrgKey2, N'1112223334', N'National Provider Identifier', 2, 1),
    (@OrgKey2, N'396789012', N'Federal Employer Identification Number', 4, 1),
    (@OrgKey3, @McdId3, N'Medicaid Provider ID', 1, 1),
    (@OrgKey3, N'5556667778', N'National Provider Identifier', 2, 1),
    (@OrgKey3, N'392468013', N'Social Security Number (SSN)', 3, 1);

-- LocationIdentifiers
INSERT INTO [OrganizationModule].[LocationIdentifiers]
    (LocationKey, Value, TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier)
VALUES
    (@LocKey1, @McdId1, N'Medicaid Provider ID', 1, 1),
    (@LocKey1, N'1234567890', N'National Provider Identifier', 2, 1),
    (@LocKey1, N'391234567', N'Social Security Number (SSN)', 3, 1),
    (@LocKey2, @McdId2, N'Medicaid Provider ID', 1, 1),
    (@LocKey2, N'1112223334', N'National Provider Identifier', 2, 1),
    (@LocKey2, N'396789012', N'Federal Employer Identification Number', 4, 1),
    (@LocKey3, @McdId3, N'Medicaid Provider ID', 1, 1),
    (@LocKey3, N'5556667778', N'National Provider Identifier', 2, 1),
    (@LocKey3, N'392468013', N'Social Security Number (SSN)', 3, 1);

-- OrganizationAddresses
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
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@OrgKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@OrgKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1);

-- LocationAddresses
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
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'Yes', 1, 1, 1, N'MMIS', 1, 1),
    (@LocKey3, N'Organization', 2, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1),
    (@LocKey3, N'Billing', 3, 1,
     N'250 Oak Avenue', N' ', N'Green Bay', N'WI', N'54301-0001',
     N'No', 0, 1, 0, N'MMIS', 1, 1);

-- OrganizationCredentials
INSERT INTO [OrganizationModule].[OrganizationCredentials]
    (OrganizationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CredentialNumber, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
     LicensureBoardDisplayName, CertificationTypeDisplayName)
VALUES
    (@OrgKey1, N'Licensed', 1, 1, N'MD12345678', '2020-01-01', '2027-01-01', N'Medical Examining Board', NULL),
    (@OrgKey1, N'Certified', 2, 1, N'CERT001', '2020-01-01', '9999-12-31', NULL, N'American Board of Medical Specialties (ABMS)'),
    (@OrgKey1, N'Certified', 2, 1, N'CERT002', '2022-06-01', '9999-12-31', NULL, N'HealthCheck Screener'),
    (@OrgKey2, N'Certified', 2, 1, N'CERT003', '2018-06-01', '9999-12-31', NULL, N'JCAHO'),
    (@OrgKey2, N'Certified', 2, 1, N'CERT004', '2019-01-01', '9999-12-31', NULL, N'Home and Community-Based Services Compliance'),
    (@OrgKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL),
    (@OrgKey3, N'Certified', 2, 1, N'CERT005', '2021-03-15', '9999-12-31', NULL, N'DQA');

-- LocationCredentials
INSERT INTO [OrganizationModule].[LocationCredentials]
    (LocationKey,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     CredentialNumber, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
     LicensureBoardDisplayName, CertificationTypeDisplayName)
VALUES
    (@LocKey1, N'Licensed', 1, 1, N'MD12345678', '2020-01-01', '2027-01-01', N'Medical Examining Board', NULL),
    (@LocKey1, N'Certified', 2, 1, N'CERT001', '2020-01-01', '9999-12-31', NULL, N'American Board of Medical Specialties (ABMS)'),
    (@LocKey1, N'Certified', 2, 1, N'CERT002', '2022-06-01', '9999-12-31', NULL, N'HealthCheck Screener'),
    (@LocKey2, N'Certified', 2, 1, N'CERT003', '2018-06-01', '9999-12-31', NULL, N'JCAHO'),
    (@LocKey2, N'Certified', 2, 1, N'CERT004', '2019-01-01', '9999-12-31', NULL, N'Home and Community-Based Services Compliance'),
    (@LocKey3, N'Licensed', 1, 1, N'DT98765432', '2021-03-15', '2027-03-15', N'Dentistry Examining Board', NULL),
    (@LocKey3, N'Certified', 2, 1, N'CERT005', '2021-03-15', '9999-12-31', NULL, N'DQA');

-- OrganizationBusinessTypes
INSERT INTO [OrganizationModule].[OrganizationBusinessTypes]
    (OrganizationKey, DisplayName, Identifier, CodeSystemIdentifier)
VALUES
    (@OrgKey1, N'For Profit', 1, 1),
    (@OrgKey2, N'Not for Profit', 6, 1),
    (@OrgKey3, N'Sole Proprietor', 4, 1);

-- LocationSpecialty
INSERT INTO [OrganizationModule].[LocationSpecialty]
    (LocationSpecialtyKey, Version, LocationKey, IsPrimary,
     TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
     ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp)
VALUES
    (NEWID(), 1, @LocKey1, 1, N'General Practice', 100, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (NEWID(), 1, @LocKey1, 0, N'Internal Medicine', 110, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (NEWID(), 1, @LocKey2, 1, N'Multi-Specialty Clinic', 200, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now),
    (NEWID(), 1, @LocKey3, 1, N'General Dentistry', 300, 1, N'MMIS', 1, 1, N'pl-test', @Now, N'pl-test', @Now);


PRINT 'TEST SCENARIO 1 (Perfect Match) inserted successfully.';
PRINT 'Provider 1: ' + @McdId1 + ' | OrgKey: ' + CAST(@OrgKey1 AS NVARCHAR(50)) + ' | LocKey: ' + CAST(@LocKey1 AS NVARCHAR(50));
PRINT 'Provider 2: ' + @McdId2 + ' | OrgKey: ' + CAST(@OrgKey2 AS NVARCHAR(50)) + ' | LocKey: ' + CAST(@LocKey2 AS NVARCHAR(50));
PRINT 'Provider 3: ' + @McdId3 + ' | OrgKey: ' + CAST(@OrgKey3 AS NVARCHAR(50)) + ' | LocKey: ' + CAST(@LocKey3 AS NVARCHAR(50));
GO
