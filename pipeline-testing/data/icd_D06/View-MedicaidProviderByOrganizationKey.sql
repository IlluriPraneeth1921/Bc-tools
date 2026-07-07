-- ============================================================
-- View Medicaid Provider Data by OrganizationKey
-- Grouped by entity: Interface DB then Application DB with matching columns.
--
-- Usage: Set the database names and OrganizationKey, run in SQLCMD mode.
-- ============================================================

:setvar AppDb "WiDHS.Qc.Carity"
:setvar InterfaceDb "WiDHS.Qc.Interface.Carity"

DECLARE @OrganizationKey UNIQUEIDENTIFIER = '2D502973-B5AF-40D0-949D-B47A000A9BE5';

DECLARE @IncomingOrganizationKey UNIQUEIDENTIFIER = (
    SELECT IncomingOrganizationKey
    FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganization
    WHERE OrganizationKey = @OrganizationKey
);

PRINT '--- OrganizationKey: ' + CAST(@OrganizationKey AS VARCHAR(36));
PRINT '--- IncomingOrganizationKey: ' + ISNULL(CAST(@IncomingOrganizationKey AS VARCHAR(36)), 'NULL');
PRINT '';

-- ============================================================
-- ORGANIZATION
-- ============================================================

PRINT '=== ORGANIZATION ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationKey, BusinessProfileFullName, BusinessProfileShortName, StatusDisplayName
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganization
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT OrganizationKey, BusinessProfileFullName, BusinessProfileShortName, StatusDisplayName
FROM [$(AppDb)].OrganizationModule.Organization
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATIONS
-- ============================================================

PRINT '';
PRINT '=== LOCATIONS ===';

PRINT '--- [Interface] ---';
SELECT IncomingLocationKey, BusinessProfileFullName, BusinessProfileShortName, StatusDisplayName
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocation
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT LocationKey, BusinessProfileFullName, BusinessProfileShortName, StatusDisplayName
FROM [$(AppDb)].OrganizationModule.Location
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION ADDRESSES
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION ADDRESSES ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationAddressesKey, PhysicalAddressFirstStreetAddress, PhysicalAddressCityName, PhysicalAddressPostalCode, IsPrimary
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationAddresses
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT PhysicalAddressFirstStreetAddress, PhysicalAddressCityName, PhysicalAddressPostalCode, IsPrimary
FROM [$(AppDb)].OrganizationModule.OrganizationAddresses
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION ADDRESSES
-- ============================================================

PRINT '';
PRINT '=== LOCATION ADDRESSES ===';

PRINT '--- [Interface] ---';
SELECT la.IncomingLocationAddressesKey, la.PhysicalAddressFirstStreetAddress, la.PhysicalAddressCityName, la.PhysicalAddressPostalCode, la.IsPrimary
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationAddresses la
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = la.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT la.PhysicalAddressFirstStreetAddress, la.PhysicalAddressCityName, la.PhysicalAddressPostalCode, la.IsPrimary
FROM [$(AppDb)].OrganizationModule.LocationAddresses la
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = la.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION EMAILS
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION EMAILS ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationEmailAddressesKey, EmailAddress, IsPrimary
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationEmailAddresses
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT EmailAddress, IsPrimary
FROM [$(AppDb)].OrganizationModule.OrganizationEmailAddresses
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION EMAILS
-- ============================================================

PRINT '';
PRINT '=== LOCATION EMAILS ===';

PRINT '--- [Interface] ---';
SELECT le.IncomingLocationEmailAddressesKey, le.EmailAddress, le.IsPrimary
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationEmailAddresses le
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = le.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT le.EmailAddress, le.IsPrimary
FROM [$(AppDb)].OrganizationModule.LocationEmailAddresses le
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = le.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION IDENTIFIERS
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION IDENTIFIERS ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationIdentifiersKey, Value, TypeDisplayName, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationIdentifiers
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT Value, TypeDisplayName, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.OrganizationIdentifiers
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION IDENTIFIERS
-- ============================================================

PRINT '';
PRINT '=== LOCATION IDENTIFIERS ===';

PRINT '--- [Interface] ---';
SELECT li.IncomingLocationIdentifiersKey, li.Value, li.TypeDisplayName, li.EffectiveDateRangeStartDate, li.EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationIdentifiers li
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = li.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT li.Value, li.TypeDisplayName, li.EffectiveDateRangeStartDate, li.EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.LocationIdentifiers li
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = li.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION PHONES
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION PHONES ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationPhonesKey, PhoneNumber, PhoneExtensionNumber, IsPrimary
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationPhones
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT PhoneNumber, PhoneExtensionNumber, IsPrimary
FROM [$(AppDb)].OrganizationModule.OrganizationPhones
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION PHONES
-- ============================================================

PRINT '';
PRINT '=== LOCATION PHONES ===';

PRINT '--- [Interface] ---';
SELECT lp.IncomingLocationPhonesKey, lp.PhoneNumber, lp.PhoneExtensionNumber, lp.IsPrimary
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationPhones lp
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = lp.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT lp.PhoneNumber, lp.PhoneExtensionNumber, lp.IsPrimary
FROM [$(AppDb)].OrganizationModule.LocationPhones lp
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = lp.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION TYPES
-- ============================================================

PRINT '';
PRINT '=== LOCATION TYPES ===';

PRINT '--- [Interface] ---';
SELECT lt.IncomingLocationTypeKey, lt.PrimaryTypeDisplayName
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationType lt
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = lt.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT lt.LocationTypeKey, lt.PrimaryTypeDisplayName
FROM [$(AppDb)].OrganizationModule.LocationType lt
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = lt.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION SPECIALTIES
-- ============================================================

PRINT '';
PRINT '=== LOCATION SPECIALTIES ===';

PRINT '--- [Interface] ---';
SELECT ls.IncomingLocationSpecialtyKey, ls.TypeDisplayName, ls.EffectiveDateRangeStartDate, ls.EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationSpecialty ls
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = ls.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT ls.LocationSpecialtyKey, ls.TypeDisplayName, ls.EffectiveDateRangeStartDate, ls.EffectiveDateRangeEndDate, ls.IsPrimary
FROM [$(AppDb)].OrganizationModule.LocationSpecialty ls
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = ls.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION POINT OF CONTACTS
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION POINT OF CONTACTS ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationPointOfContactKey, Name, Title, EmailAddressAddress, PhoneNumber, TypeDisplayName
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationPointOfContact
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT OrganizationPointOfContactKey, Name, Title, EmailAddressAddress, PhoneNumber, TypeDisplayName
FROM [$(AppDb)].OrganizationModule.OrganizationPointOfContact
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION POINT OF CONTACTS
-- ============================================================

PRINT '';
PRINT '=== LOCATION POINT OF CONTACTS ===';

PRINT '--- [Interface] ---';
SELECT poc.IncomingLocationPointOfContactKey, poc.Name, poc.Title, poc.EmailAddressAddress, poc.PhoneNumber, poc.TypeDisplayName
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationPointOfContact poc
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = poc.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT poc.LocationPointOfContactKey, poc.Name, poc.Title, poc.EmailAddressAddress, poc.PhoneNumber, poc.TypeDisplayName
FROM [$(AppDb)].OrganizationModule.LocationPointOfContact poc
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = poc.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- PAYMENT SUSPENSIONS
-- ============================================================

PRINT '';
PRINT '=== PAYMENT SUSPENSIONS ===';

PRINT '--- [Interface] ---';
SELECT ps.IncomingPaymentSuspensionKey, ps.StatusDisplayName, ps.EffectiveDateRangeStartDate, ps.EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingPaymentSuspension ps
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = ps.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT ps.PaymentSuspensionKey, ps.StatusDisplayName, ps.EffectiveDateRangeStartDate, ps.EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.PaymentSuspension ps
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = ps.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- WAIVER SERVICES
-- ============================================================

PRINT '';
PRINT '=== WAIVER SERVICES ===';

PRINT '--- [Interface] ---';
SELECT lews.IncomingLocationExtensionWaiverServicesKey, lews.WaiverServiceCodeDisplayName, lews.EffectiveDateRangeStartDate, lews.EffectiveDateRangeEndDate, lews.IsActive
FROM [$(InterfaceDb)].CustomerInterfaceModule.IncomingLocationExtensionWaiverServices lews
JOIN [$(InterfaceDb)].CustomerInterfaceModule.IncomingLocationExtension le ON le.IncomingLocationExtensionKey = lews.IncomingLocationExtensionKey
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = le.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
PRINT '(Customer schema - depends on CustomerOrganizationModule.LocationExtensionWaiverService table)';

-- ============================================================
-- ORGANIZATION CREDENTIALS
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION CREDENTIALS ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationCredentialsKey, CredentialNumber, TypeDisplayName, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationCredentials
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT CredentialNumber, TypeDisplayName, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.OrganizationCredentials
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION CREDENTIALS
-- ============================================================

PRINT '';
PRINT '=== LOCATION CREDENTIALS ===';

PRINT '--- [Interface] ---';
SELECT lc.IncomingLocationCredentialsKey, lc.CredentialNumber, lc.TypeDisplayName, lc.EffectiveDateRangeStartDate, lc.EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationCredentials lc
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = lc.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT lc.CredentialNumber, lc.TypeDisplayName, lc.EffectiveDateRangeStartDate, lc.EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.LocationCredentials lc
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = lc.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION BUSINESS TYPES
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION BUSINESS TYPES ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationBusinessTypesKey, DisplayName, Identifier, CodeSystemIdentifier
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationBusinessTypes
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT DisplayName, Identifier, CodeSystemIdentifier
FROM [$(AppDb)].OrganizationModule.OrganizationBusinessTypes
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION TYPES
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION TYPES ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationOrganizationTypesKey, DisplayName, Identifier, CodeSystemIdentifier
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationOrganizationTypes
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT DisplayName, Identifier, CodeSystemIdentifier
FROM [$(AppDb)].OrganizationModule.OrganizationOrganizationTypes
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION SUPPORTED PROGRAMS
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION SUPPORTED PROGRAMS ===';

PRINT '--- [Interface] ---';
SELECT IncomingOrganizationSupportedProgramsKey, ProgramKey, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationSupportedPrograms
WHERE IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT ProgramKey, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.OrganizationSupportedPrograms
WHERE OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION SUPPORTED PROGRAMS
-- ============================================================

PRINT '';
PRINT '=== LOCATION SUPPORTED PROGRAMS ===';

PRINT '--- [Interface] ---';
SELECT lsp.IncomingLocationSupportedProgramsKey, lsp.ProgramKey, lsp.EffectiveDateRangeStartDate, lsp.EffectiveDateRangeEndDate
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationSupportedPrograms lsp
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = lsp.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT lsp.ProgramKey, lsp.EffectiveDateRangeStartDate, lsp.EffectiveDateRangeEndDate
FROM [$(AppDb)].OrganizationModule.LocationSupportedPrograms lsp
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = lsp.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION TAXONOMIES
-- ============================================================

PRINT '';
PRINT '=== LOCATION TAXONOMIES ===';

PRINT '--- [Interface] ---';
SELECT ltx.IncomingLocationTaxonomiesKey, ltx.Code, ltx.ClassificationName, ltx.SpecializationName
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationTaxonomies ltx
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = ltx.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT ltx.Code, ltx.ClassificationName, ltx.SpecializationName
FROM [$(AppDb)].OrganizationModule.LocationTaxonomies ltx
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = ltx.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION TYPE SUBTYPES
-- ============================================================

PRINT '';
PRINT '=== LOCATION TYPE SUBTYPES ===';

PRINT '--- [Interface] ---';
SELECT lts.IncomingLocationTypeSubtypesKey, lts.DisplayName, lts.Identifier, lts.CodeSystemIdentifier
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationTypeSubtypes lts
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocationType lt ON lt.IncomingLocationTypeKey = lts.IncomingLocationTypeKey
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = lt.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT lts.DisplayName, lts.Identifier, lts.CodeSystemIdentifier
FROM [$(AppDb)].OrganizationModule.LocationTypeSubtypes lts
JOIN [$(AppDb)].OrganizationModule.LocationType lt ON lt.LocationTypeKey = lts.LocationTypeKey
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = lt.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- ORGANIZATION POC ASSOCIATED PROGRAMS
-- ============================================================

PRINT '';
PRINT '=== ORGANIZATION POC ASSOCIATED PROGRAMS ===';

PRINT '--- [Interface] ---';
SELECT ap.IncomingOrganizationPointOfContactAssociatedProgramsKey, ap.ProgramKey
FROM [$(InterfaceDb)].InterfaceModule.IncomingOrganizationPointOfContactAssociatedPrograms ap
JOIN [$(InterfaceDb)].InterfaceModule.IncomingOrganizationPointOfContact poc ON poc.IncomingOrganizationPointOfContactKey = ap.IncomingOrganizationPointOfContactKey
WHERE poc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT ap.ProgramKey
FROM [$(AppDb)].OrganizationModule.OrganizationPointOfContactAssociatedPrograms ap
JOIN [$(AppDb)].OrganizationModule.OrganizationPointOfContact poc ON poc.OrganizationPointOfContactKey = ap.OrganizationPointOfContactKey
WHERE poc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION POC ASSOCIATED PROGRAMS
-- ============================================================

PRINT '';
PRINT '=== LOCATION POC ASSOCIATED PROGRAMS ===';

PRINT '--- [Interface] ---';
SELECT ap.IncomingLocationPointOfContactAssociatedProgramsKey, ap.ProgramKey
FROM [$(InterfaceDb)].InterfaceModule.IncomingLocationPointOfContactAssociatedPrograms ap
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocationPointOfContact poc ON poc.IncomingLocationPointOfContactKey = ap.IncomingLocationPointOfContactKey
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = poc.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '--- [App] ---';
SELECT ap.ProgramKey
FROM [$(AppDb)].OrganizationModule.LocationPointOfContactAssociatedPrograms ap
JOIN [$(AppDb)].OrganizationModule.LocationPointOfContact poc ON poc.LocationPointOfContactKey = ap.LocationPointOfContactKey
JOIN [$(AppDb)].OrganizationModule.Location loc ON loc.LocationKey = poc.LocationKey
WHERE loc.OrganizationKey = @OrganizationKey;

-- ============================================================
-- LOCATION EXTENSION (Customer)
-- ============================================================

PRINT '';
PRINT '=== LOCATION EXTENSION ===';

PRINT '--- [Interface] ---';
SELECT le.IncomingLocationExtensionKey, le.IncomingLocationKey, le.LocationKey, le.LocationExtensionKey
FROM [$(InterfaceDb)].CustomerInterfaceModule.IncomingLocationExtension le
JOIN [$(InterfaceDb)].InterfaceModule.IncomingLocation loc ON loc.IncomingLocationKey = le.IncomingLocationKey
WHERE loc.IncomingOrganizationKey = @IncomingOrganizationKey;

PRINT '';
PRINT '=== DONE ===';
