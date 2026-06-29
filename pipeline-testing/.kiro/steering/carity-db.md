---
inclusion: manual
---

# WiDHS.QcPhi.Carity Database Schema Reference

This is the production Carity application database (`WiDHS.QcPhi.Carity`) that stores the canonical data for organizations, locations, persons, programs, services, and all related clinical/administrative records. The interface database (`WiDHS.QcPhi.Interface`) feeds processed data into this system. This reference documents the schema structure relevant to interface processing workflows including D05 (authorizations), D06 (providers), D12 (FSIA), and verification responses.

## Database Statistics

- **Total schemas**: 81
- **Total tables**: 831
- **Total rows**: 95,181,634

## Schema Summary

| Schema | Tables | Total Rows | Interface Relevant |
|--------|--------|-----------|-------------------|
| AacapModule | 2 | 0 |  |
| AnnouncementModule | 2 | 0 |  |
| ApplicationModule | 1 | 0 |  |
| AppointmentModule | 5 | 0 |  |
| AttachmentModule | 11 | 23 |  |
| BehaviorManagementPlanModule | 5 | 0 |  |
| BillOfRightsModule | 1 | 0 |  |
| BudgetManagementModule | 3 | 3,239,994 |  |
| CaseActivityModule | 1 | 1,751,319 |  |
| CaseModule | 2 | 45,368 |  |
| CompletionModule | 2 | 2,129,181 |  |
| ContactModule | 3 | 0 |  |
| ContractModule | 5 | 0 |  |
| CrisisBedIntakePacketModule | 2 | 0 |  |
| CrisisHomeIntakeModule | 15 | 0 |  |
| CrisisHouseAgreementModule | 1 | 0 |  |
| CrisisHousingAssessmentModule | 25 | 0 |  |
| CrisisIntakeModule | 2 | 0 |  |
| CrisisPreventionPlanModule | 11 | 0 |  |
| CrisisTemporaryHousingModule | 6 | 0 |  |
| CustomFormModule | 46 | 4,723,906 | **Yes** |
| CustomMetadataModule | 3 | 0 |  |
| CustomerHcbsSettingsRuleModificationModule | 2 | 0 |  |
| CustomerInterfaceModule | 7 | 0 | **Yes** |
| CustomerNoticeOfActionAndAppealModule | 9 | 0 |  |
| CustomerOrganizationModule | 5 | 25,557 | **Yes** |
| CustomerPersonCenteredPlanModule | 27 | 339,185 | **Yes** |
| CustomerProgramEnrollmentModule | 4 | 0 | **Yes** |
| CustomerRiskAgreementModule | 2 | 0 |  |
| DatabaseAdministrationModule | 1 | 42 |  |
| DeathAndMortalityModule | 1 | 0 |  |
| DomainHistoryModule | 2 | 117 |  |
| EmergencyDispositionModule | 6 | 0 |  |
| FileModule | 1 | 8 |  |
| FormModule | 2 | 11 |  |
| FreedomOfChoiceModule | 1 | 0 |  |
| GovernanceModule | 7 | 2,620 |  |
| GrievanceAppealModule | 8 | 0 |  |
| GuardianshipModule | 15 | 0 |  |
| HealthInformationModule | 9 | 0 | **Yes** |
| IncidentManagementModule | 13 | 0 |  |
| IndividualSupportTeamModule | 13 | 0 |  |
| IntakeReferralModule | 1 | 0 |  |
| InterRaiScreeningModule | 5 | 0 |  |
| InterfaceModule | 41 | 0 | **Yes** |
| IssueTrackerModule | 3 | 0 |  |
| LetterModule | 8 | 23 |  |
| MessageModule | 5 | 0 |  |
| NoteModule | 33 | 26,264,956 |  |
| NotificationModule | 22 | 31,488 |  |
| OfflineModule | 1 | 0 |  |
| OrganizationModule | 62 | 3,071,308 | **Yes** |
| PersonCenteredPlanModule | 69 | 32,058,828 |  |
| PersonHistoryModule | 1 | 0 |  |
| PersonMaintenanceModule | 2 | 0 |  |
| PersonModule | 43 | 1,879,631 | **Yes** |
| PostCrisisReviewModule | 12 | 0 |  |
| ProfilePictureModule | 1 | 0 |  |
| ProgramApplicationModule | 6 | 0 |  |
| ProgramDischargeModule | 3 | 0 |  |
| ProgramEnrollmentModule | 3 | 387,546 | **Yes** |
| ProgramModule | 17 | 53 |  |
| ProtectiveServicesModule | 49 | 0 |  |
| RateModule | 17 | 647 |  |
| RegionModule | 4 | 0 |  |
| ReportModule | 10 | 257 |  |
| ReportableEventModule | 43 | 0 |  |
| ResponseMessageModule | 1 | 23 |  |
| SafetyDevicePacketModule | 1 | 0 |  |
| SecurityModule | 14 | 60,514 |  |
| ServiceAuthorizationModule | 9 | 5,447,280 | **Yes** |
| ServiceDefinitionModule | 15 | 4,610 |  |
| ServiceEventModule | 2 | 0 |  |
| ServiceImplementationPlanModule | 6 | 0 |  |
| SignatureModule | 2 | 416,722 |  |
| TaskModule | 2 | 31,647 |  |
| VocabularyModule | 19 | 924,245 |  |
| WaitlistModule | 5 | 0 |  |
| WorkTeamModule | 2 | 2,017 |  |
| WorkflowModule | 2 | 12,342,482 |  |
| dbo | 1 | 26 |  |

---

## Interface-Relevant Schemas (Detailed)

### OrganizationModule

Core provider/organization/location/staff data. Target for D06 provider file sync. Contains the canonical provider records that the interface database syncs provider data into.

#### OrganizationModule.Location
**Rows**: 130,844

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ContractedEmergencyTransitionHousingBedCount` (int, NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `TotalBedCount` (int, NULL)
  - `TotalAvailableBedCount` (int, NULL)
  - `BusinessProfileDoingBusinessAsName` (nvarchar(200), NULL)
  - `BusinessProfileFullName` (nvarchar(200), NOT NULL)
  - `BusinessProfileNote` (nvarchar(MAX), NULL)
  - `BusinessProfileShortName` (nvarchar(500), NULL)
  - `BusinessProfileWebsiteUrlAddress` (nvarchar(510), NULL)
  - `ExternalStatusDisplayName` (nvarchar(8000), NULL)
  - `ExternalStatusIdentifier` (bigint, NULL)
  - `ExternalStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Location_BusinessProfileFullName` (BusinessProfileFullName)
  - `IX_Location_BusinessProfileShortName` (BusinessProfileShortName)
  - `IX_Location_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Location_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_Location_Organization_LocationKey` (LocationKey, OrganizationKey)
  - `IX_Location_OrganizationKey` (OrganizationKey)
  - `IX_Location_StatusIdentifier` (StatusIdentifier)

#### OrganizationModule.LocationAddresses
**Rows**: 166,424

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `PhysicalAddressTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `PhysicalAddressTypeIdentifier` (bigint, NOT NULL)
  - `PhysicalAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressVerificationStatusIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `IsActive` (bit, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitudeValue` (float, NULL)
  - `PhysicalAddressCareOfName` (nvarchar(500), NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_LocationAddresses_LocationKey` (LocationKey)

#### OrganizationModule.LocationCredentials
**Rows**: 13,582

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `AccreditationBodyCodeSystemIdentifier` (bigint, NULL)
  - `AccreditationBodyDisplayName` (nvarchar(8000), NULL)
  - `AccreditationBodyIdentifier` (bigint, NULL)
  - `CertificationTypeCodeSystemIdentifier` (bigint, NULL)
  - `CertificationTypeDisplayName` (nvarchar(8000), NULL)
  - `CertificationTypeIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `LicensureBoardCodeSystemIdentifier` (bigint, NULL)
  - `LicensureBoardDisplayName` (nvarchar(8000), NULL)
  - `LicensureBoardIdentifier` (bigint, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `CredentialNumber` (nvarchar(40), NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_LocationCredentials_LocationKey` (LocationKey)

#### OrganizationModule.LocationEmailAddresses
**Rows**: 85,140

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EmailAddress` (nvarchar(510), NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_LocationEmailAddresses_LocationKey` (LocationKey)

#### OrganizationModule.LocationExternalLocationAssignment
**Rows**: 0

**Columns:**
  - `LocationExternalLocationAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `OriginalLocationExternalLocationAssignmentKey` (uniqueidentifier, NULL)
  - `AssignedLocationDisplayName` (nvarchar(500), NOT NULL)
  - `AssignedLocationKey` (uniqueidentifier, NOT NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentTypeIdentifier` (bigint, NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `InitiatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `InitiatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `AssignedLocationKey` → OrganizationModule.Location.LocationKey
  - `OriginalLocationExternalLocationAssignmentKey` → OrganizationModule.LocationExternalLocationAssignment.LocationExternalLocationAssignmentKey
  - `InitiatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationExternalLocationAssignment_AssignedLocationKey` (AssignedLocationKey)
  - `IX_LocationExternalLocationAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationExternalLocationAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationExternalLocationAssignment_InitiatedStaffMemberKey` (InitiatedStaffMemberKey)
  - `IX_LocationExternalLocationAssignment_LocationKey` (LocationKey)
  - `IX_LocationExternalLocationAssignment_OriginalLocationExternalLocationAssignmentKey` (OriginalLocationExternalLocationAssignmentKey)

#### OrganizationModule.LocationExternalStaffMemberAssignment
**Rows**: 0

**Columns:**
  - `LocationExternalStaffMemberAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `OriginalLocationExternalStaffMemberAssignmentKey` (uniqueidentifier, NULL)
  - `AssignedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `AssignedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentTypeIdentifier` (bigint, NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `InitiatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `InitiatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `OriginalLocationExternalStaffMemberAssignmentKey` → OrganizationModule.LocationExternalStaffMemberAssignment.LocationExternalStaffMemberAssignmentKey
  - `AssignedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `InitiatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationExternalStaffMemberAssignment_AssignedStaffMemberKey` (AssignedStaffMemberKey)
  - `IX_LocationExternalStaffMemberAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationExternalStaffMemberAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationExternalStaffMemberAssignment_InitiatedStaffMemberKey` (InitiatedStaffMemberKey)
  - `IX_LocationExternalStaffMemberAssignment_LocationKey` (LocationKey)
  - `IX_LocationExternalStaffMemberAssignment_OriginalLocationExternalStaffMemberAssignmentKey` (OriginalLocationExternalStaffMemberAssignmentKey)

#### OrganizationModule.LocationIdentifiers
**Rows**: 187,940

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_LocationIdentifiers_LocationKey` (LocationKey)
  - `IX_LocationIdentifiers_NationalProviderIdentifier` (LocationKey, TypeIdentifier) (UNIQUE)
  - `IX_LocationIdentifiers_ProviderNumber` (LocationKey, TypeIdentifier) (UNIQUE)
  - `IX_LocationIdentifiers_TypeIdentifier` (TypeIdentifier)

#### OrganizationModule.LocationPhones
**Rows**: 132,527

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(50), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_LocationPhones_LocationKey` (LocationKey)
  - `IX_LocationPhones_Primary` (LocationKey, IsPrimary) (UNIQUE)

#### OrganizationModule.LocationPointOfContact
**Rows**: 138,457

**Columns:**
  - `LocationPointOfContactKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Name` (nvarchar(200), NULL)
  - `Title` (nvarchar(510), NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EmailAddressAddress` (nvarchar(510), NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(50), NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationPointOfContact_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationPointOfContact_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationPointOfContact_LocationKey` (LocationKey)

#### OrganizationModule.LocationPointOfContactAssociatedPrograms
**Rows**: 138,457

**Columns:**
  - `LocationPointOfContactKey` (uniqueidentifier, NOT NULL)
  - `ProgramDisplayName` (nvarchar(500), NULL)
  - `ProgramKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationPointOfContactKey` → OrganizationModule.LocationPointOfContact.LocationPointOfContactKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey

**Indexes:**
  - `IX_LocationPointOfContactAssociatedPrograms_LocationPointOfContactKey` (LocationPointOfContactKey)
  - `IX_LocationPointOfContactAssociatedPrograms_ProgramKey` (ProgramKey)

#### OrganizationModule.LocationServiceArea
**Rows**: 0

**Columns:**
  - `LocationServiceAreaKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `StateProvinceDisplayName` (nvarchar(8000), NOT NULL)
  - `StateProvinceIdentifier` (bigint, NOT NULL)
  - `StateProvinceCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationServiceArea_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationServiceArea_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationServiceArea_LocationKey` (LocationKey)

#### OrganizationModule.LocationServiceAreaCountyAreas
**Rows**: 0

**Columns:**
  - `LocationServiceAreaKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `LocationServiceAreaKey` → OrganizationModule.LocationServiceArea.LocationServiceAreaKey

**Indexes:**
  - `IX_LocationServiceAreaCountyAreas_LocationServiceAreaKey` (LocationServiceAreaKey)

#### OrganizationModule.LocationSpecialty
**Rows**: 9,779

**Columns:**
  - `LocationSpecialtyKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationSpecialty_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationSpecialty_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationSpecialty_LocationKey` (LocationKey)
  - `IX_LocationSpecialty_TypeIdentifier` (TypeIdentifier)

#### OrganizationModule.LocationSpecialtyServiceReferences
**Rows**: 0

**Columns:**
  - `LocationSpecialtyKey` (uniqueidentifier, NOT NULL)
  - `Modifier1Name` (nvarchar(510), NULL)
  - `Modifier2Name` (nvarchar(510), NULL)
  - `Modifier3Name` (nvarchar(510), NULL)
  - `Modifier4Name` (nvarchar(510), NULL)
  - `Name` (nvarchar(600), NULL)
  - `ProcedureCode` (nvarchar(20), NULL)
  - `ServiceKeyReference` (uniqueidentifier, NOT NULL)
  - `StatusName` (nvarchar(510), NULL)

**Foreign Keys:**
  - `LocationSpecialtyKey` → OrganizationModule.LocationSpecialty.LocationSpecialtyKey

**Indexes:**
  - `IX_LocationSpecialtyServiceReferences_LocationSpecialtyKey` (LocationSpecialtyKey)

#### OrganizationModule.LocationSupportedPrograms
**Rows**: 130,844

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey

**Indexes:**
  - `IX_LocationSupportedPrograms_LocationKey` (LocationKey)
  - `IX_LocationSupportedPrograms_ProgramKey` (ProgramKey)

#### OrganizationModule.LocationSupportedRoles
**Rows**: 210

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_LocationSupportedRoles_LocationKey` (LocationKey)
  - `IX_LocationSupportedRoles_SystemRoleKey` (SystemRoleKey)

#### OrganizationModule.LocationTaxonomies
**Rows**: 1,390

**Columns:**
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(20), NULL)
  - `GroupingName` (nvarchar(200), NULL)
  - `ClassificationName` (nvarchar(200), NULL)
  - `SpecializationName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_LocationTaxonomies_LocationKey` (LocationKey)

#### OrganizationModule.LocationType
**Rows**: 130,819

**Columns:**
  - `LocationTypeKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `PrimaryTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `PrimaryTypeIdentifier` (bigint, NOT NULL)
  - `PrimaryTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationType_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationType_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationType_LocationKey` (LocationKey)
  - `IX_LocationType_PrimaryTypeIdentifier` (PrimaryTypeIdentifier)

#### OrganizationModule.LocationTypeSubtypes
**Rows**: 9,797

**Columns:**
  - `LocationTypeKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `LocationTypeKey` → OrganizationModule.LocationType.LocationTypeKey

**Indexes:**
  - `IX_LocationTypeSubtypes_Identifier` (Identifier)
  - `IX_LocationTypeSubtypes_LocationTypeKey` (LocationTypeKey)

#### OrganizationModule.MedicaidEnrollment
**Rows**: 54

**Columns:**
  - `MedicaidEnrollmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `RecertificationDueDate` (date, NULL)
  - `EnrollmentStatusIdentifier` (bigint, NULL)
  - `EnrollmentStatusDisplayName` (nvarchar(8000), NULL)
  - `EnrollmentStatusCodeSystemIdentifier` (bigint, NULL)
  - `EnrollmentTypeIdentifier` (bigint, NULL)
  - `EnrollmentTypeDisplayName` (nvarchar(8000), NULL)
  - `EnrollmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeIdentifier` (bigint, NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_MedicaidEnrollment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_MedicaidEnrollment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_MedicaidEnrollment_LocationKey` (LocationKey)
  - `IX_MedicaidEnrollment_OrganizationKey` (OrganizationKey)

#### OrganizationModule.MedicaidEnrollmentEligibilitySpans
**Rows**: 0

**Columns:**
  - `MedicaidEnrollmentKey` (uniqueidentifier, NOT NULL)
  - `EffectiveStartDate` (date, NOT NULL)
  - `EffectiveEndDate` (date, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `MedicaidEnrollmentKey` → OrganizationModule.MedicaidEnrollment.MedicaidEnrollmentKey

**Indexes:**
  - `IX_MedicaidEnrollmentEligibilitySpans_MedicaidEnrollmentKey` (MedicaidEnrollmentKey)

#### OrganizationModule.MedicaidEnrollmentManagedCareOrganizationAffiliations
**Rows**: 0

**Columns:**
  - `MedicaidEnrollmentKey` (uniqueidentifier, NOT NULL)
  - `ManagedCareOrganizationName` (nvarchar(200), NULL)
  - `EffectiveDateRangeStartDateTime` (datetime2, NULL)
  - `EffectiveDateRangeEndDateTime` (datetime2, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `MedicaidEnrollmentKey` → OrganizationModule.MedicaidEnrollment.MedicaidEnrollmentKey

**Indexes:**
  - `IX_MedicaidEnrollmentManagedCareOrganizationAffiliations_MedicaidEnrollmentKey` (MedicaidEnrollmentKey)

#### OrganizationModule.MedicaidEnrollmentStateMedicaidIdentifiers
**Rows**: 0

**Columns:**
  - `MedicaidEnrollmentKey` (uniqueidentifier, NOT NULL)
  - `Identifier` (nvarchar(40), NULL)
  - `StateJurisdictionIdentifier` (bigint, NULL)
  - `StateJurisdictionDisplayName` (nvarchar(8000), NULL)
  - `StateJurisdictionCodeSystemIdentifier` (bigint, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `MedicaidEnrollmentKey` → OrganizationModule.MedicaidEnrollment.MedicaidEnrollmentKey

**Indexes:**
  - `IX_MedicaidEnrollmentStateMedicaidIdentifiers_MedicaidEnrollmentKey` (MedicaidEnrollmentKey)

#### OrganizationModule.Organization
**Rows**: 130,844

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `BusinessProfileDoingBusinessAsName` (nvarchar(200), NULL)
  - `BusinessProfileFullName` (nvarchar(200), NOT NULL)
  - `BusinessProfileNote` (nvarchar(MAX), NULL)
  - `BusinessProfileShortName` (nvarchar(200), NULL)
  - `BusinessProfileWebsiteUrlAddress` (nvarchar(510), NULL)
  - `ExternalStatusDisplayName` (nvarchar(8000), NULL)
  - `ExternalStatusIdentifier` (bigint, NULL)
  - `ExternalStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Organization_BusinessProfileFullName` (BusinessProfileFullName)
  - `IX_Organization_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Organization_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### OrganizationModule.OrganizationAddresses
**Rows**: 166,424

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `OrganizationPhysicalAddressTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `OrganizationPhysicalAddressTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `OrganizationPhysicalAddressTypeIdentifier` (bigint, NOT NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressVerificationStatusIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `IsActive` (bit, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitudeValue` (float, NULL)
  - `PhysicalAddressCareOfName` (nvarchar(500), NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationAddresses_Current` (OrganizationKey, CurrentIdentifier) (UNIQUE)
  - `IX_OrganizationAddresses_OrganizationKey` (OrganizationKey)

#### OrganizationModule.OrganizationBusinessTypes
**Rows**: 477

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationBusinessTypes_OrganizationKey_Clustered` (OrganizationKey)

#### OrganizationModule.OrganizationCredentials
**Rows**: 13,582

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `AccreditationBodyCodeSystemIdentifier` (bigint, NULL)
  - `AccreditationBodyDisplayName` (nvarchar(8000), NULL)
  - `AccreditationBodyIdentifier` (bigint, NULL)
  - `CertificationTypeCodeSystemIdentifier` (bigint, NULL)
  - `CertificationTypeDisplayName` (nvarchar(8000), NULL)
  - `CertificationTypeIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `LicensureBoardCodeSystemIdentifier` (bigint, NULL)
  - `LicensureBoardDisplayName` (nvarchar(8000), NULL)
  - `LicensureBoardIdentifier` (bigint, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `CredentialNumber` (nvarchar(40), NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationCredentials_OrganizationKey` (OrganizationKey)

#### OrganizationModule.OrganizationCustomFormInstance
**Rows**: 0

**Columns:**
  - `OrganizationCustomFormInstanceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CustomFormInstanceKey` (uniqueidentifier, NOT NULL)
  - `PreviousOrganizationCustomFormInstanceKey` (uniqueidentifier, NULL)
  - `ProgramKey` (uniqueidentifier, NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FormTypeIdentifier` (bigint, NOT NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormInstanceKey` → CustomFormModule.CustomFormInstance.CustomFormInstanceKey
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `PreviousOrganizationCustomFormInstanceKey` → OrganizationModule.OrganizationCustomFormInstance.OrganizationCustomFormInstanceKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OrganizationCustomFormInstance_CustomFormInstanceKey` (CustomFormInstanceKey)
  - `IX_OrganizationCustomFormInstance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OrganizationCustomFormInstance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OrganizationCustomFormInstance_LocationKey` (LocationKey)
  - `IX_OrganizationCustomFormInstance_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationCustomFormInstance_PreviousOrganizationCustomFormInstanceKey` (PreviousOrganizationCustomFormInstanceKey)
  - `IX_OrganizationCustomFormInstance_ProgramKey` (ProgramKey)

#### OrganizationModule.OrganizationEmailAddresses
**Rows**: 85,140

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `EmailAddress` (nvarchar(510), NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationEmailAddresses_OrganizationKey` (OrganizationKey)

#### OrganizationModule.OrganizationExternalLocationAssignment
**Rows**: 0

**Columns:**
  - `OrganizationExternalLocationAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `OriginalOrganizationExternalLocationAssignmentKey` (uniqueidentifier, NULL)
  - `AssignedLocationDisplayName` (nvarchar(500), NOT NULL)
  - `AssignedLocationKey` (uniqueidentifier, NOT NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentTypeIdentifier` (bigint, NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `InitiatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `InitiatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `AssignedLocationKey` → OrganizationModule.Location.LocationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `OriginalOrganizationExternalLocationAssignmentKey` → OrganizationModule.OrganizationExternalLocationAssignment.OrganizationExternalLocationAssignmentKey
  - `InitiatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OrganizationExternalLocationAssignment_AssignedLocationKey` (AssignedLocationKey)
  - `IX_OrganizationExternalLocationAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OrganizationExternalLocationAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OrganizationExternalLocationAssignment_InitiatedStaffMemberKey` (InitiatedStaffMemberKey)
  - `IX_OrganizationExternalLocationAssignment_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationExternalLocationAssignment_OriginalOrganizationExternalLocationAssignmentKey` (OriginalOrganizationExternalLocationAssignmentKey)

#### OrganizationModule.OrganizationExternalStaffMemberAssignment
**Rows**: 0

**Columns:**
  - `OrganizationExternalStaffMemberAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `OriginalOrganizationExternalStaffMemberAssignmentKey` (uniqueidentifier, NULL)
  - `AssignedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `AssignedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentTypeIdentifier` (bigint, NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `InitiatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `InitiatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `OriginalOrganizationExternalStaffMemberAssignmentKey` → OrganizationModule.OrganizationExternalStaffMemberAssignment.OrganizationExternalStaffMemberAssignmentKey
  - `AssignedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `InitiatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OrganizationExternalStaffMemberAssignment_AssignedStaffMemberKey` (AssignedStaffMemberKey)
  - `IX_OrganizationExternalStaffMemberAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OrganizationExternalStaffMemberAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OrganizationExternalStaffMemberAssignment_InitiatedStaffMemberKey` (InitiatedStaffMemberKey)
  - `IX_OrganizationExternalStaffMemberAssignment_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationExternalStaffMemberAssignment_OriginalOrganizationExternalStaffMemberAssignmentKey` (OriginalOrganizationExternalStaffMemberAssignmentKey)

#### OrganizationModule.OrganizationFormActivityInstance
**Rows**: 0

**Columns:**
  - `OrganizationFormActivityInstanceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Identifier` (bigint, NULL)
  - `IsActive` (bit, NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `OrganizationFormActivityKeyReference` (uniqueidentifier, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `ProgramKeyReference` (uniqueidentifier, NULL)
  - `RegistrationStatusEnum` (nvarchar(100), NOT NULL)
  - `ActivityTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ActivityTypeIdentifier` (bigint, NOT NULL)
  - `ActivityTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ClrTypeAssemblyQualifiedName` (nvarchar(1000), NOT NULL)
  - `ClrTypeDisplayName` (nvarchar(500), NULL)
  - `ClrTypeFullName` (nvarchar(500), NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NULL)
  - `FormTypeIdentifier` (bigint, NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OrganizationFormActivityInstance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OrganizationFormActivityInstance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OrganizationFormActivityInstance_LocationKey` (LocationKey)
  - `IX_OrganizationFormActivityInstance_OrganizationFormActivityKeyReference` (OrganizationFormActivityKeyReference)
  - `IX_OrganizationFormActivityInstance_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationFormActivityInstance_ProgramKeyReference` (ProgramKeyReference)

#### OrganizationModule.OrganizationIdentifiers
**Rows**: 187,940

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationIdentifiers_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationIdentifiers_TypeIdentifier` (TypeIdentifier)

#### OrganizationModule.OrganizationLetterInstance
**Rows**: 0

**Columns:**
  - `LetterInstanceBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `LocationKey` (uniqueidentifier, NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `LetterInstanceBaseKey` → LetterModule.LetterInstanceBase.LetterInstanceBaseKey
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationLetterInstance_LocationKey` (LocationKey)
  - `IX_OrganizationLetterInstance_OrganizationKey` (OrganizationKey)

#### OrganizationModule.OrganizationOrganizationTypes
**Rows**: 130,819

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationOrganizationTypes_OrganizationKey_Clustered` (OrganizationKey)

#### OrganizationModule.OrganizationPhones
**Rows**: 132,527

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `OrganizationPhoneTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `OrganizationPhoneTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `OrganizationPhoneTypeIdentifier` (bigint, NOT NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(50), NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_OrganizationPhones_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationPhones_Primary` (OrganizationKey, IsPrimary) (UNIQUE)

#### OrganizationModule.OrganizationPointOfContact
**Rows**: 138,457

**Columns:**
  - `OrganizationPointOfContactKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Name` (nvarchar(200), NULL)
  - `Title` (nvarchar(510), NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `EmailAddressAddress` (nvarchar(510), NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(50), NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OrganizationPointOfContact_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OrganizationPointOfContact_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OrganizationPointOfContact_OrganizationKey` (OrganizationKey)

#### OrganizationModule.OrganizationPointOfContactAssociatedPrograms
**Rows**: 138,457

**Columns:**
  - `OrganizationPointOfContactKey` (uniqueidentifier, NOT NULL)
  - `ProgramDisplayName` (nvarchar(500), NULL)
  - `ProgramKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OrganizationPointOfContactKey` → OrganizationModule.OrganizationPointOfContact.OrganizationPointOfContactKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey

**Indexes:**
  - `IX_OrganizationPointOfContactAssociatedPrograms_OrganizationPointOfContactKey` (OrganizationPointOfContactKey)
  - `IX_OrganizationPointOfContactAssociatedPrograms_ProgramKey` (ProgramKey)

#### OrganizationModule.OrganizationSupportedPrograms
**Rows**: 130,844

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey

**Indexes:**
  - `IX_OrganizationSupportedPrograms_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationSupportedPrograms_ProgramKey` (ProgramKey)

#### OrganizationModule.OrganizationSupportedRoles
**Rows**: 210

**Columns:**
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_OrganizationSupportedRoles_OrganizationKey` (OrganizationKey)
  - `IX_OrganizationSupportedRoles_SystemRoleKey` (SystemRoleKey)

#### OrganizationModule.PaymentSuspension
**Rows**: 10

**Columns:**
  - `PaymentSuspensionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeStartDate` (datetime2, NOT NULL)
  - `EffectiveDateRangeEndDate` (datetime2, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PaymentSuspension_EffectiveDateRange` (EffectiveDateRangeStartDate, EffectiveDateRangeEndDate)
  - `IX_PaymentSuspension_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PaymentSuspension_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PaymentSuspension_LocationKey` (LocationKey)
  - `IX_PaymentSuspension_StatusIdentifier` (StatusIdentifier)

#### OrganizationModule.ProviderEnrollment
**Rows**: 0

**Columns:**
  - `ProviderEnrollmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `FullName` (nvarchar(200), NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NOT NULL)
  - `ProviderWebsiteUrlAddress` (nvarchar(510), NULL)
  - `ShortName` (nvarchar(200), NULL)
  - `IdentifierValue` (nvarchar(100), NULL)
  - `IdentifierTypeDisplayName` (nvarchar(8000), NULL)
  - `IdentifierTypeIdentifier` (bigint, NULL)
  - `IdentifierTypeCodeSystemIdentifier` (bigint, NULL)
  - `ProviderAddressCityName` (nvarchar(200), NULL)
  - `ProviderAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `ProviderAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `ProviderAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `ProviderAddressCountryIdentifier` (bigint, NULL)
  - `ProviderAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `ProviderAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `ProviderAddressCountyAreaIdentifier` (bigint, NULL)
  - `ProviderAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `ProviderAddressPostalCode` (nvarchar(20), NULL)
  - `ProviderAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `ProviderAddressStateProvinceIdentifier` (bigint, NULL)
  - `ProviderAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `ProviderAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `ProviderAddressVerificationStatusIdentifier` (bigint, NULL)
  - `ProviderAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProviderContactName` (nvarchar(200), NULL)
  - `ProviderContactTitle` (nvarchar(510), NULL)
  - `ProviderContactEmailAddress` (nvarchar(510), NULL)
  - `ProviderContactPhoneExtensionNumber` (nvarchar(40), NULL)
  - `ProviderContactPhoneNumber` (nvarchar(500), NULL)
  - `ProviderContactTypeDisplayName` (nvarchar(8000), NULL)
  - `ProviderContactTypeIdentifier` (bigint, NULL)
  - `ProviderContactTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `ProviderAddressCareOfName` (nvarchar(500), NULL)
  - `ProviderAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `ProviderAddressGeographicalCoordinatesLongitudeValue` (float, NULL)

**Foreign Keys:**
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ProviderEnrollment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ProviderEnrollment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### OrganizationModule.ServiceArea
**Rows**: 0

**Columns:**
  - `ServiceAreaKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `StateProvinceDisplayName` (nvarchar(8000), NOT NULL)
  - `StateProvinceIdentifier` (bigint, NOT NULL)
  - `StateProvinceCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ServiceArea_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ServiceArea_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ServiceArea_OrganizationKey` (OrganizationKey)

#### OrganizationModule.ServiceAreaCountyAreas
**Rows**: 0

**Columns:**
  - `ServiceAreaKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `ServiceAreaKey` → OrganizationModule.ServiceArea.ServiceAreaKey

**Indexes:**
  - `IX_ServiceAreaCountyAreas_ServiceAreaKey` (ServiceAreaKey)

#### OrganizationModule.StaffCustomFormInstance
**Rows**: 0

**Columns:**
  - `StaffCustomFormInstanceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CustomFormInstanceKey` (uniqueidentifier, NOT NULL)
  - `PreviousStaffCustomFormInstanceKey` (uniqueidentifier, NULL)
  - `ProgramKey` (uniqueidentifier, NULL)
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FormTypeIdentifier` (bigint, NOT NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormInstanceKey` → CustomFormModule.CustomFormInstance.CustomFormInstanceKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `PreviousStaffCustomFormInstanceKey` → OrganizationModule.StaffCustomFormInstance.StaffCustomFormInstanceKey
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffCustomFormInstance_CustomFormInstanceKey` (CustomFormInstanceKey)
  - `IX_StaffCustomFormInstance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffCustomFormInstance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffCustomFormInstance_PreviousStaffCustomFormInstanceKey` (PreviousStaffCustomFormInstanceKey)
  - `IX_StaffCustomFormInstance_ProgramKey` (ProgramKey)
  - `IX_StaffCustomFormInstance_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffDelegation
**Rows**: 0

**Columns:**
  - `StaffDelegationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `DelegateeStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `DelegateeStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `DelegatorStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `DelegatorStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `LocationDisplayName` (nvarchar(500), NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `DelegateeStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `DelegatorStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffDelegation_DelegateeStaffMemberKey` (DelegateeStaffMemberKey)
  - `IX_StaffDelegation_DelegatorStaffMemberKey` (DelegatorStaffMemberKey)
  - `IX_StaffDelegation_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffDelegation_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffDelegation_LocationKey` (LocationKey)

#### OrganizationModule.StaffFormActivityInstance
**Rows**: 0

**Columns:**
  - `StaffFormActivityInstanceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Identifier` (bigint, NULL)
  - `IsActive` (bit, NULL)
  - `ProgramKeyReference` (uniqueidentifier, NULL)
  - `RegistrationStatusEnum` (nvarchar(100), NOT NULL)
  - `StaffFormActivityKeyReference` (uniqueidentifier, NOT NULL)
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `ActivityTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ActivityTypeIdentifier` (bigint, NOT NULL)
  - `ActivityTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ClrTypeAssemblyQualifiedName` (nvarchar(1000), NOT NULL)
  - `ClrTypeDisplayName` (nvarchar(500), NULL)
  - `ClrTypeFullName` (nvarchar(500), NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NULL)
  - `FormTypeIdentifier` (bigint, NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsCreatedFromMyProfile` (bit, NOT NULL)
  - `IsMemberVisible` (bit, NOT NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffFormActivityInstance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffFormActivityInstance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffFormActivityInstance_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffLetterInstance
**Rows**: 0

**Columns:**
  - `LetterInstanceBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `LetterInstanceBaseKey` → LetterModule.LetterInstanceBase.LetterInstanceBaseKey
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffLetterInstance_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMember
**Rows**: 114,360

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `BirthDate` (date, NULL)
  - `IsReceivingEmailNotification` (bit, NULL)
  - `IsReceivingTextNotification` (bit, NULL)
  - `OrganizationKey` (uniqueidentifier, NOT NULL)
  - `ProfilePictureKey` (uniqueidentifier, NULL)
  - `EmploymentProfileJobTitle` (nvarchar(500), NULL)
  - `EmploymentProfileDateRangeEndDate` (date, NULL)
  - `EmploymentProfileDateRangeStartDate` (date, NULL)
  - `EmploymentProfileEmploymentTypeDisplayName` (nvarchar(8000), NULL)
  - `EmploymentProfileEmploymentTypeIdentifier` (bigint, NULL)
  - `EmploymentProfileEmploymentTypeCodeSystemIdentifier` (bigint, NULL)
  - `EmploymentProfileFullTimeEquivalentDisplayName` (nvarchar(8000), NULL)
  - `EmploymentProfileFullTimeEquivalentIdentifier` (bigint, NULL)
  - `EmploymentProfileFullTimeEquivalentCodeSystemIdentifier` (bigint, NULL)
  - `EmploymentProfileStaffJobTitleDisplayName` (nvarchar(8000), NULL)
  - `EmploymentProfileStaffJobTitleIdentifier` (bigint, NULL)
  - `EmploymentProfileStaffJobTitleCodeSystemIdentifier` (bigint, NULL)
  - `GenderDisplayName` (nvarchar(8000), NULL)
  - `GenderIdentifier` (bigint, NULL)
  - `GenderCodeSystemIdentifier` (bigint, NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `PreferredMethodOfContactDisplayName` (nvarchar(8000), NULL)
  - `PreferredMethodOfContactIdentifier` (bigint, NULL)
  - `PreferredMethodOfContactCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey
  - `ProfilePictureKey` → ProfilePictureModule.ProfilePicture.ProfilePictureKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffMember_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffMember_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffMember_OrganizationKey` (OrganizationKey)
  - `IX_StaffMember_ProfilePictureKey` (ProfilePictureKey)

#### OrganizationModule.StaffMemberAddress
**Rows**: 0

**Columns:**
  - `StaffMemberAddressKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsActive` (bit, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressVerificationStatusIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `PhysicalAddressCareOfName` (nvarchar(500), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitudeValue` (float, NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffMemberAddress_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffMemberAddress_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffMemberAddress_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberAddressAttributes
**Rows**: 0

**Columns:**
  - `StaffMemberAddressKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `StaffMemberAddressKey` → OrganizationModule.StaffMemberAddress.StaffMemberAddressKey

**Indexes:**
  - `IX_StaffMemberAddressAttributes_StaffMemberAddressKey` (StaffMemberAddressKey)

#### OrganizationModule.StaffMemberCredentials
**Rows**: 0

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `CategoryCodeSystemIdentifier` (bigint, NOT NULL)
  - `CategoryDisplayName` (nvarchar(8000), NOT NULL)
  - `CategoryIdentifier` (bigint, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `IncludeInDisplayName` (bit, NULL)
  - `IssuerName` (nvarchar(200), NULL)
  - `QualificationNumber` (nvarchar(100), NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffMemberCredentials_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberEmailAddresses
**Rows**: 74,156

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EmailAddress` (nvarchar(510), NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffMemberEmailAddresses_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberIdentifiers
**Rows**: 0

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffMemberIdentifiers_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberLanguages
**Rows**: 0

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `HumanLanguageCodeSystemIdentifier` (bigint, NULL)
  - `HumanLanguageDisplayName` (nvarchar(8000), NULL)
  - `HumanLanguageIdentifier` (bigint, NULL)
  - `ReadingProficiencyCodeSystemIdentifier` (bigint, NULL)
  - `ReadingProficiencyDisplayName` (nvarchar(8000), NULL)
  - `ReadingProficiencyIdentifier` (bigint, NULL)
  - `SpeakingProficiencyCodeSystemIdentifier` (bigint, NULL)
  - `SpeakingProficiencyDisplayName` (nvarchar(8000), NULL)
  - `SpeakingProficiencyIdentifier` (bigint, NULL)
  - `WritingProficiencyCodeSystemIdentifier` (bigint, NULL)
  - `WritingProficiencyDisplayName` (nvarchar(8000), NULL)
  - `WritingProficiencyIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffMemberLanguages_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberLocationAssignment
**Rows**: 114,357

**Columns:**
  - `StaffMemberLocationAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffMemberLocationAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffMemberLocationAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffMemberLocationAssignment_LocationAndStaffMember` (LocationKey, StaffMemberKey) (UNIQUE)
  - `IX_StaffMemberLocationAssignment_LocationKey` (LocationKey)
  - `IX_StaffMemberLocationAssignment_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberLocationAssignmentGrantedRoles
**Rows**: 5,770

**Columns:**
  - `StaffMemberLocationAssignmentKey` (uniqueidentifier, NOT NULL)
  - `GrantedSystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `StaffMemberLocationAssignmentKey` → OrganizationModule.StaffMemberLocationAssignment.StaffMemberLocationAssignmentKey
  - `GrantedSystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_StaffMemberLocationAssignmentGrantedRoles_GrantedSystemRoleKey` (GrantedSystemRoleKey)
  - `IX_StaffMemberLocationAssignmentGrantedRoles_StaffMemberLocationAssignmentKey` (StaffMemberLocationAssignmentKey)

#### OrganizationModule.StaffMemberLocationAssignmentSupportedPrograms
**Rows**: 0

**Columns:**
  - `StaffMemberLocationAssignmentKey` (uniqueidentifier, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)

**Foreign Keys:**
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `StaffMemberLocationAssignmentKey` → OrganizationModule.StaffMemberLocationAssignment.StaffMemberLocationAssignmentKey

**Indexes:**
  - `IX_StaffMemberLocationAssignmentSupportedPrograms_ProgramKey` (ProgramKey)
  - `IX_StaffMemberLocationAssignmentSupportedPrograms_StaffMemberLocationAssignmentKey` (StaffMemberLocationAssignmentKey)

#### OrganizationModule.StaffMemberLocationAssignmentType
**Rows**: 0

**Columns:**
  - `StaffMemberLocationAssignmentTypeKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `LocationAssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `LocationAssignmentTypeIdentifier` (bigint, NULL)
  - `LocationAssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_StaffMemberLocationAssignmentType_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_StaffMemberLocationAssignmentType_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_StaffMemberLocationAssignmentType_LocationAssignmentType` (LocationAssignmentTypeCodeSystemIdentifier, LocationAssignmentTypeIdentifier)
  - `IX_StaffMemberLocationAssignmentType_StaffMember_Types` (StaffMemberKey, LocationAssignmentTypeCodeSystemIdentifier, LocationAssignmentTypeIdentifier)
  - `IX_StaffMemberLocationAssignmentType_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberLookup
**Rows**: 114,360

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL) [PK]
  - `PrimaryPhoneNumber` (nvarchar(70), NULL)
  - `LockStatus` (bit, NULL)
  - `Supervisors` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

#### OrganizationModule.StaffMemberPhones
**Rows**: 114,184

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `PhoneExtensionNumber` (nvarchar(40), NULL)
  - `PhoneNumber` (nvarchar(500), NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffMemberPhones_Primary` (StaffMemberKey, IsPrimary) (UNIQUE)
  - `IX_StaffMemberPhones_StaffMemberKey` (StaffMemberKey)

#### OrganizationModule.StaffMemberRelationships
**Rows**: 2,126

**Columns:**
  - `StaffMemberKey` (uniqueidentifier, NOT NULL)
  - `RelatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `RelatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `StaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `RelatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey

**Indexes:**
  - `IX_StaffMemberRelationships_RelatedStaffMemberKey` (RelatedStaffMemberKey)
  - `IX_StaffMemberRelationships_StaffMemberKey` (StaffMemberKey)


### CustomerOrganizationModule

WiDHS-specific extensions for provider/location sync. Contains sync status tracking and waiver service associations for locations.

#### CustomerOrganizationModule.LocationExtension
**Rows**: 8,452

**Columns:**
  - `LocationExtensionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `HasConflict` (bit, NULL)
  - `LastSynchronizedTimestamp` (datetime2, NULL)
  - `SiTransactionKeyReference` (nvarchar(100), NULL)
  - `ResponseStatusCode` (nvarchar(20), NULL)
  - `ResponseSenderAgencyName` (nvarchar(20), NULL)
  - `TransactionId` (nvarchar(100), NULL)
  - `HasWarnings` (bit, NULL)
  - `LastProviderChangeTypeCode` (nvarchar(100), NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationExtension_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationExtension_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationExtension_LocationKey` (LocationKey)

#### CustomerOrganizationModule.LocationExtensionSyncMessages
**Rows**: 0

**Columns:**
  - `LocationExtensionKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(20), NULL)
  - `Description` (nvarchar(MAX), NULL)
  - `ClassificationCode` (nvarchar(20), NULL)
  - `Timestamp` (datetime2, NOT NULL)

**Foreign Keys:**
  - `LocationExtensionKey` → CustomerOrganizationModule.LocationExtension.LocationExtensionKey

**Indexes:**
  - `IX_LocationExtensionSyncMessages_LocationExtensionKey` (LocationExtensionKey)

#### CustomerOrganizationModule.LocationExtensionWaiverServices
**Rows**: 17,105

**Columns:**
  - `LocationExtensionKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `WaiverServiceCodeCodeSystemIdentifier` (bigint, NOT NULL)
  - `WaiverServiceCodeDisplayName` (nvarchar(8000), NOT NULL)
  - `WaiverServiceCodeIdentifier` (bigint, NOT NULL)
  - `IsActive` (bit, NOT NULL)

**Foreign Keys:**
  - `LocationExtensionKey` → CustomerOrganizationModule.LocationExtension.LocationExtensionKey

**Indexes:**
  - `IX_LocationExtensionWaiverServices_LocationExtensionKey` (LocationExtensionKey)

#### CustomerOrganizationModule.LocationSyncTransaction
**Rows**: 0

**Columns:**
  - `LocationSyncTransactionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationExtensionKey` (uniqueidentifier, NOT NULL)
  - `SiTransactionKeyReference` (nvarchar(100), NULL)
  - `ResponseStatusCode` (nvarchar(20), NULL)
  - `TransactionId` (nvarchar(100), NULL)
  - `ProviderChangeTypeCode` (nvarchar(100), NULL)
  - `RequestJsonTextFile` (nvarchar(MAX), NULL)
  - `Timestamp` (datetime2, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `ResponseJsonTextFile` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `LocationExtensionKey` → CustomerOrganizationModule.LocationExtension.LocationExtensionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LocationSyncTransaction_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LocationSyncTransaction_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LocationSyncTransaction_LocationExtensionKey` (LocationExtensionKey)

#### CustomerOrganizationModule.LocationSyncTransactionMessages
**Rows**: 0

**Columns:**
  - `LocationSyncTransactionKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(20), NULL)
  - `Description` (nvarchar(MAX), NULL)
  - `ClassificationCode` (nvarchar(20), NULL)
  - `Timestamp` (datetime2, NOT NULL)

**Foreign Keys:**
  - `LocationSyncTransactionKey` → CustomerOrganizationModule.LocationSyncTransaction.LocationSyncTransactionKey

**Indexes:**
  - `IX_LocationSyncTransactionMessages_LocationSyncTransactionKey` (LocationSyncTransactionKey)


### InterfaceModule

Carity's built-in interface staging tables within the production DB. These are Carity's own incoming data staging (distinct from the WiDHS interface database). Holds incoming person, organization, location, and service line data during import processing.

#### InterfaceModule.IncomingDiagnosis
**Rows**: 0

**Columns:**
  - `IncomingDiagnosisKey` (uniqueidentifier, NOT NULL) [PK]
  - `DiagnosisKey` (uniqueidentifier, NULL)
  - `Version` (int, NOT NULL)
  - `DiagnosisDate` (date, NULL)
  - `IsCurrent` (bit, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsProgramQualified` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `DiagnosedByName` (nvarchar(200), NULL)
  - `DiagnosedByCredentialTypeDisplayName` (nvarchar(8000), NULL)
  - `DiagnosedByCredentialTypeIdentifier` (bigint, NULL)
  - `DiagnosedByCredentialTypeCodeSystemIdentifier` (bigint, NULL)
  - `DiagnosisCodeCode` (nvarchar(100), NULL)
  - `DiagnosisCodeDisplayName` (nvarchar(8000), NULL)
  - `DiagnosisCodeCodeSystemIdentifier` (nvarchar(100), NULL)
  - `DiagnosisCodeCodeSystemVersion` (nvarchar(510), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_IncomingDiagnosis_CaseKey` (CaseKey)
  - `IX_IncomingDiagnosis_DiagnosisCodeCode` (DiagnosisCodeCode)
  - `IX_IncomingDiagnosis_DiagnosisKey` (DiagnosisKey)
  - `IX_IncomingDiagnosis_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingDiagnosis_ProvenanceSourceIdentifier` (ProvenanceSourceIdentifier)

#### InterfaceModule.IncomingFinancialEligibility
**Rows**: 0

**Columns:**
  - `IncomingFinancialEligibilityKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `FinancialEligibilityTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `FinancialEligibilityTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FinancialEligibilityTypeIdentifier` (bigint, NOT NULL)
  - `FinancialEligibilityDescription` (nvarchar(8000), NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerFinancialEligibilityIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingFinancialEligibility_CustomerFinancialEligiblityIdentifier` (CustomerFinancialEligibilityIdentifier)
  - `IX_IncomingFinancialEligibility_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingFinancialEligibility_PersonKey` (PersonKey)

#### InterfaceModule.IncomingHealthInsurance
**Rows**: 0

**Columns:**
  - `IncomingHealthInsuranceKey` (uniqueidentifier, NOT NULL) [PK]
  - `HealthInsuranceKey` (uniqueidentifier, NULL)
  - `Version` (int, NOT NULL)
  - `BeneficiaryIdentifier` (nvarchar(100), NULL)
  - `CoverageDescription` (nvarchar(500), NULL)
  - `GroupNumber` (nvarchar(40), NULL)
  - `OrganizationName` (nvarchar(200), NULL)
  - `PlanName` (nvarchar(200), NULL)
  - `PolicyNumber` (nvarchar(40), NULL)
  - `CaseKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsDeleted` (bit, NOT NULL)
  - `CustomerEnrollIdentifier` (nvarchar(100), NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `HealthInsuranceKey` → HealthInformationModule.HealthInsurance.HealthInsuranceKey
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey

**Indexes:**
  - `IX_IncomingHealthInsurance_CaseKey` (CaseKey)
  - `IX_IncomingHealthInsurance_HealthInsuranceKey` (HealthInsuranceKey)
  - `IX_IncomingHealthInsurance_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingHealthInsurance_IsReadyToProcess` (IsReadyToProcess)
  - `IX_IncomingHealthInsurance_TypeIdentifier` (TypeIdentifier)

#### InterfaceModule.IncomingLocation
**Rows**: 0

**Columns:**
  - `IncomingLocationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `IncomingOrganizationKey` (uniqueidentifier, NULL)
  - `BusinessProfileDoingBusinessAsName` (nvarchar(200), NULL)
  - `BusinessProfileFullName` (nvarchar(200), NOT NULL)
  - `BusinessProfileShortName` (nvarchar(200), NOT NULL)
  - `BusinessProfileTotalBedCount` (int, NULL)
  - `BusinessProfileWebsiteUrlAddress` (nvarchar(510), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `PhoneLastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `PhoneHashChecksumValue` (varbinary(64), NULL)
  - `HasErrors` (bit, NOT NULL)
  - `ErrorMessage` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `IncomingOrganizationKey` → InterfaceModule.IncomingOrganization.IncomingOrganizationKey
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `AK_IncomingLocation_UniqueLocationKey` (LocationKey) (UNIQUE)
  - `IX_IncomingLocation_IncomingOrganizationKey` (IncomingOrganizationKey)

#### InterfaceModule.IncomingLocationAddresses
**Rows**: 0

**Columns:**
  - `IncomingLocationAddressesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingLocationKey` (uniqueidentifier, NOT NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `PhysicalAddressTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `PhysicalAddressTypeIdentifier` (bigint, NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitude` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitude` (float, NULL)

**Foreign Keys:**
  - `IncomingLocationKey` → InterfaceModule.IncomingLocation.IncomingLocationKey
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_IncomingLocationAddresses_IncomingLocationKey` (IncomingLocationKey)
  - `IX_IncomingLocationAddresses_LocationKey` (LocationKey)

#### InterfaceModule.IncomingLocationIdentifiers
**Rows**: 0

**Columns:**
  - `IncomingLocationIdentifiersKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingLocationKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingLocationKey` → InterfaceModule.IncomingLocation.IncomingLocationKey

**Indexes:**
  - `IX_IncomingLocationIdentifiers_IncomingLocationKey` (IncomingLocationKey)

#### InterfaceModule.IncomingLocationPhones
**Rows**: 0

**Columns:**
  - `IncomingLocationPhonesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingLocationKey` (uniqueidentifier, NOT NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(500), NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)

**Foreign Keys:**
  - `IncomingLocationKey` → InterfaceModule.IncomingLocation.IncomingLocationKey
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_IncomingLocationPhones_IncomingLocationKey` (IncomingLocationKey)
  - `IX_IncomingLocationPhones_LocationKey` (LocationKey)

#### InterfaceModule.IncomingLocationSpecialty
**Rows**: 0

**Columns:**
  - `IncomingLocationSpecialtyKey` (uniqueidentifier, NOT NULL) [PK]
  - `LocationSpecialtyKey` (uniqueidentifier, NULL)
  - `IncomingLocationKey` (uniqueidentifier, NOT NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `CustomerProviderIdentifier` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingLocationKey` → InterfaceModule.IncomingLocation.IncomingLocationKey
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_IncomingLocationSpecialty_LocationKey` (LocationKey)
  - `IX_IncomingLocationSpecialty_LocationSpecialtyKey` (LocationSpecialtyKey)
  - `IX_IncomingLocationSpecialty_TypeIdentifier` (TypeIdentifier)

#### InterfaceModule.IncomingLocationType
**Rows**: 0

**Columns:**
  - `IncomingLocationTypeKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingLocationKey` (uniqueidentifier, NOT NULL)
  - `LocationTypeKey` (uniqueidentifier, NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `PrimaryTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `PrimaryTypeIdentifier` (bigint, NOT NULL)
  - `PrimaryTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(1000), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingLocationKey` → InterfaceModule.IncomingLocation.IncomingLocationKey
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `LocationTypeKey` → OrganizationModule.LocationType.LocationTypeKey

**Indexes:**
  - `IX_IncomingLocationType_LocationKey` (LocationKey)
  - `IX_IncomingLocationType_LocationTypeKey` (LocationTypeKey)

#### InterfaceModule.IncomingLocationTypeSubtypes
**Rows**: 0

**Columns:**
  - `IncomingLocationTypeKey` (uniqueidentifier, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)

**Foreign Keys:**
  - `IncomingLocationTypeKey` → InterfaceModule.IncomingLocationType.IncomingLocationTypeKey

**Indexes:**
  - `IX_IncomingLocationTypeSubtypes_IncomingLocationTypeKey` (IncomingLocationTypeKey)

#### InterfaceModule.IncomingMedication
**Rows**: 0

**Columns:**
  - `IncomingMedicationKey` (uniqueidentifier, NOT NULL) [PK]
  - `MedicationKey` (uniqueidentifier, NULL)
  - `Version` (int, NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `DoseMeasure` (float, NULL)
  - `DoseUnitDisplayName` (nvarchar(8000), NULL)
  - `DoseUnitIdentifier` (bigint, NULL)
  - `DoseUnitCodeSystemIdentifier` (bigint, NULL)
  - `FrequencyDisplayName` (nvarchar(8000), NULL)
  - `FrequencyIdentifier` (bigint, NULL)
  - `FrequencyCodeSystemIdentifier` (bigint, NULL)
  - `NameCode` (nvarchar(100), NULL)
  - `NameDisplayName` (nvarchar(8000), NULL)
  - `NameCodeSystemIdentifier` (nvarchar(100), NULL)
  - `NameCodeSystemVersion` (nvarchar(510), NULL)
  - `ProReNataDisplayName` (nvarchar(8000), NULL)
  - `ProReNataIdentifier` (bigint, NULL)
  - `ProReNataCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `RouteDisplayName` (nvarchar(8000), NULL)
  - `RouteIdentifier` (bigint, NULL)
  - `RouteCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `LastSourceFileName` (nvarchar(500), NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerMedicationIdentifier` (nvarchar(200), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_IncomingMedication_CaseKey` (CaseKey)
  - `IX_IncomingMedication_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingMedication_MedicationKey` (MedicationKey)
  - `IX_IncomingMedication_NameCode` (NameCode)
  - `IX_IncomingMedication_ProvenanceSourceIdentifier` (ProvenanceSourceIdentifier)

#### InterfaceModule.IncomingOrganization
**Rows**: 0

**Columns:**
  - `IncomingOrganizationKey` (uniqueidentifier, NOT NULL) [PK]
  - `OrganizationKey` (uniqueidentifier, NULL)
  - `BusinessProfileDoingBusinessAsName` (nvarchar(200), NULL)
  - `BusinessProfileFullName` (nvarchar(200), NOT NULL)
  - `BusinessProfileShortName` (nvarchar(200), NOT NULL)
  - `BusinessProfileWebsiteUrlAddress` (nvarchar(510), NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `PhoneLastSynchronizationTimestamp` (datetime2, NULL)
  - `PhoneHashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `AK_IncomingOrganization_CustomerProviderIdentifier` (CustomerProviderIdentifier) (UNIQUE)
  - `AK_IncomingOrganization_UniqueOrganizationKey` (OrganizationKey) (UNIQUE)
  - `IX_IncomingOrganization_OrganizationKey` (OrganizationKey)

#### InterfaceModule.IncomingOrganizationAddresses
**Rows**: 0

**Columns:**
  - `IncomingOrganizationAddressesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingOrganizationKey` (uniqueidentifier, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `OrganizationPhysicalAddressTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `OrganizationPhysicalAddressTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `OrganizationPhysicalAddressTypeIdentifier` (bigint, NOT NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `IsActive` (bit, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitude` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitude` (float, NULL)

**Foreign Keys:**
  - `IncomingOrganizationKey` → InterfaceModule.IncomingOrganization.IncomingOrganizationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_IncomingOrganizationAddresses_IncomingOrganizationKey` (IncomingOrganizationKey)
  - `IX_IncomingOrganizationAddresses_OrganizationKey` (OrganizationKey)

#### InterfaceModule.IncomingOrganizationBusinessTypes
**Rows**: 0

**Columns:**
  - `IncomingOrganizationBusinessTypesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingOrganizationKey` (uniqueidentifier, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(1000), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingOrganizationKey` → InterfaceModule.IncomingOrganization.IncomingOrganizationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_IncomingOrganizationBusinessTypes_IncomingOrganizationKey` (IncomingOrganizationKey)
  - `IX_IncomingOrganizationBusinessTypes_OrganizationKey` (OrganizationKey)

#### InterfaceModule.IncomingOrganizationIdentifiers
**Rows**: 0

**Columns:**
  - `IncomingOrganizationIdentifiersKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingOrganizationKey` (uniqueidentifier, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(1000), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingOrganizationKey` → InterfaceModule.IncomingOrganization.IncomingOrganizationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_IncomingOrganizationIdentifiers_IncomingOrganizationKey` (IncomingOrganizationKey)
  - `IX_IncomingOrganizationIdentifiers_OrganizationKey` (OrganizationKey)

#### InterfaceModule.IncomingOrganizationPhones
**Rows**: 0

**Columns:**
  - `IncomingOrganizationPhonesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingOrganizationKey` (uniqueidentifier, NOT NULL)
  - `OrganizationKey` (uniqueidentifier, NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(500), NOT NULL)
  - `IncomingOrganizationPhoneTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `IncomingOrganizationPhoneTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `IncomingOrganizationPhoneTypeIdentifier` (bigint, NOT NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerProviderIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingOrganizationKey` → InterfaceModule.IncomingOrganization.IncomingOrganizationKey
  - `OrganizationKey` → OrganizationModule.Organization.OrganizationKey

**Indexes:**
  - `IX_IncomingOrganizationPhones_IncomingOrganizationKey` (IncomingOrganizationKey)
  - `IX_IncomingOrganizationPhones_OrganizationKey` (OrganizationKey)

#### InterfaceModule.IncomingPerson
**Rows**: 0

**Columns:**
  - `IncomingPersonKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `BirthDate` (date, NULL)
  - `DeathDate` (date, NULL)
  - `IsUnknown` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `BirthRecordAdoptionInformationNote` (nvarchar(MAX), NULL)
  - `BirthRecordApgarScoreFiveMinuteValue` (int, NULL)
  - `BirthRecordApgarScoreOneMinuteValue` (int, NULL)
  - `BirthRecordApgarScoreTenMinuteValue` (int, NULL)
  - `BirthRecordBirthWeightValue` (decimal(19,5), NULL)
  - `BirthRecordFatherName` (nvarchar(200), NULL)
  - `BirthRecordGestationValue` (int, NULL)
  - `BirthRecordMotherName` (nvarchar(200), NULL)
  - `BirthRecordName` (nvarchar(200), NULL)
  - `BirthRecordPlaceOfBirthName` (nvarchar(8000), NULL)
  - `BirthRecordMethodOfDeliveryDisplayName` (nvarchar(8000), NULL)
  - `BirthRecordMethodOfDeliveryIdentifier` (bigint, NULL)
  - `BirthRecordMethodOfDeliveryCodeSystemIdentifier` (bigint, NULL)
  - `EducationAndEmploymentEducationLevelNote` (nvarchar(MAX), NULL)
  - `EducationAndEmploymentEducationLevelEducationLevelDisplayName` (nvarchar(8000), NULL)
  - `EducationAndEmploymentEducationLevelEducationLevelIdentifier` (bigint, NULL)
  - `EducationAndEmploymentEducationLevelEducationLevelCodeSystemIdentifier` (bigint, NULL)
  - `EducationAndEmploymentEmploymentStatusNote` (nvarchar(MAX), NULL)
  - `EducationAndEmploymentEmploymentStatusEmploymentStatusDisplayName` (nvarchar(8000), NULL)
  - `EducationAndEmploymentEmploymentStatusEmploymentStatusIdentifier` (bigint, NULL)
  - `EducationAndEmploymentEmploymentStatusEmploymentStatusCodeSystemIdentifier` (bigint, NULL)
  - `EnglishFluencyNeedsInterpreterDescription` (nvarchar(8000), NULL)
  - `EnglishFluencyLevelDisplayName` (nvarchar(8000), NULL)
  - `EnglishFluencyLevelIdentifier` (bigint, NULL)
  - `EnglishFluencyLevelCodeSystemIdentifier` (bigint, NULL)
  - `EnglishFluencyNeedsInterpreterDisplayName` (nvarchar(8000), NULL)
  - `EnglishFluencyNeedsInterpreterIdentifier` (bigint, NULL)
  - `EnglishFluencyNeedsInterpreterCodeSystemIdentifier` (bigint, NULL)
  - `GenderDisplayName` (nvarchar(8000), NULL)
  - `GenderIdentifier` (bigint, NULL)
  - `GenderCodeSystemIdentifier` (bigint, NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `SanitizedFirstName` (nvarchar(200), NULL)
  - `SanitizedLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `PhysicalTraitsHeightMeasure` (float, NULL)
  - `PhysicalTraitsIdentifyingAttributesNote` (nvarchar(MAX), NULL)
  - `PhysicalTraitsWeightMeasure` (float, NULL)
  - `PhysicalTraitsEyeColorDisplayName` (nvarchar(8000), NULL)
  - `PhysicalTraitsEyeColorIdentifier` (bigint, NULL)
  - `PhysicalTraitsEyeColorCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalTraitsHairColorDisplayName` (nvarchar(8000), NULL)
  - `PhysicalTraitsHairColorIdentifier` (bigint, NULL)
  - `PhysicalTraitsHairColorCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `TribalNationLeadTypeDisplayName` (nvarchar(8000), NULL)
  - `TribalNationLeadTypeIdentifier` (bigint, NULL)
  - `TribalNationLeadTypeCodeSystemIdentifier` (bigint, NULL)
  - `TribalNationPreferenceTypeDisplayName` (nvarchar(8000), NULL)
  - `TribalNationPreferenceTypeIdentifier` (bigint, NULL)
  - `TribalNationPreferenceTypeCodeSystemIdentifier` (bigint, NULL)
  - `TribalNationTribalNationTypeDisplayName` (nvarchar(8000), NULL)
  - `TribalNationTribalNationTypeIdentifier` (bigint, NULL)
  - `TribalNationTribalNationTypeCodeSystemIdentifier` (bigint, NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `IsAlreadyLinkedToProd` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `AK_IncomingPerson_CustomerPersonIdentifier` (CustomerPersonIdentifier) (UNIQUE)
  - `AK_IncomingPerson_UniquePersonKey` (PersonKey) (UNIQUE)
  - `IX_IncomingPerson_BirthDate` (BirthDate)
  - `IX_IncomingPerson_IsReadyToProcess` (IsReadyToProcess)
  - `IX_IncomingPerson_PersonKey` (PersonKey)
  - `IX_IncomingPerson_ProvenanceSourceIdentifier` (ProvenanceSourceIdentifier)

#### InterfaceModule.IncomingPersonAddress
**Rows**: 0

**Columns:**
  - `IncomingPersonAddressKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `PersonAddressKey` (uniqueidentifier, NULL)
  - `IsActive` (bit, NULL)
  - `IsPrimary` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `AddressTypeDisplayName` (nvarchar(8000), NULL)
  - `AddressTypeIdentifier` (bigint, NULL)
  - `AddressTypeCodeSystemIdentifier` (bigint, NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitude` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitude` (float, NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey
  - `PersonAddressKey` → PersonModule.PersonAddress.PersonAddressKey

**Indexes:**
  - `IX_IncomingPersonAddress_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonAddress_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonAddress_PersonAddressKey` (PersonAddressKey)
  - `IX_IncomingPersonAddress_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonAddressAttributes
**Rows**: 0

**Columns:**
  - `IncomingPersonAddressAttributesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonAddressKey` (uniqueidentifier, NOT NULL)
  - `PersonAddressKey` (uniqueidentifier, NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonAddressKey` → InterfaceModule.IncomingPersonAddress.IncomingPersonAddressKey
  - `PersonAddressKey` → PersonModule.PersonAddress.PersonAddressKey

**Indexes:**
  - `IX_IncomingPersonAddressAttributes_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonAddressAttributes_IncomingPersonAddressKey` (IncomingPersonAddressKey)
  - `IX_IncomingPersonAddressAttributes_PersonAddressKey` (PersonAddressKey)
  - `IX_IncomingPersonContactRepresentativeTypes_CustomerPersonIdentifier` (CustomerPersonIdentifier)

#### InterfaceModule.IncomingPersonAlternateNames
**Rows**: 0

**Columns:**
  - `IncomingPersonAlternateNamesKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `FirstName` (nvarchar(200), NULL)
  - `LastName` (nvarchar(200), NULL)
  - `MiddleName` (nvarchar(200), NULL)
  - `SuffixName` (nvarchar(200), NULL)
  - `MaidenName` (nvarchar(200), NULL)
  - `PreferredName` (nvarchar(200), NULL)
  - `PrefixName` (nvarchar(200), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonAlternateNames_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonAlternateNames_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonAttributes
**Rows**: 0

**Columns:**
  - `IncomingPersonAttributesKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `ValueCodeSystemIdentifier` (bigint, NULL)
  - `ValueDisplayName` (nvarchar(8000), NULL)
  - `ValueIdentifier` (bigint, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonAttributes_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonAttributes_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonContact
**Rows**: 0

**Columns:**
  - `IncomingPersonContactKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonContactKey` (uniqueidentifier, NULL)
  - `OrganizationName` (nvarchar(200), NULL)
  - `DoesLiveWithPerson` (bit, NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `YearOfBirthValue` (int, NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `EmailAddressAddress` (nvarchar(510), NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(500), NULL)
  - `PhoneTypeDisplayName` (nvarchar(8000), NULL)
  - `PhoneTypeIdentifier` (bigint, NULL)
  - `PhoneTypeCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `RelationshipTypeDisplayName` (nvarchar(8000), NULL)
  - `RelationshipTypeIdentifier` (bigint, NULL)
  - `RelationshipTypeCodeSystemIdentifier` (bigint, NULL)
  - `ReleaseOfInformationProvidedDisplayName` (nvarchar(8000), NULL)
  - `ReleaseOfInformationProvidedIdentifier` (bigint, NULL)
  - `ReleaseOfInformationProvidedCodeSystemIdentifier` (bigint, NULL)
  - `SpecialtyDisplayName` (nvarchar(MAX), NULL)
  - `SpecialtyIdentifier` (bigint, NULL)
  - `SpecialtyCodeSystemIdentifier` (bigint, NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSourceFileName` (nvarchar(500), NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonContactIdentifier` (nvarchar(100), NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitude` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitude` (float, NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey
  - `PersonContactKey` → PersonModule.PersonContact.PersonContactKey

**Indexes:**
  - `IX_IncomingPersonContact_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonContact_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonContact_PersonContactKey` (PersonContactKey)
  - `IX_IncomingPersonContact_PersonKey` (PersonKey)
  - `IX_IncomingPersonContact_ProvenanceSourceIdentifier` (ProvenanceSourceIdentifier)

#### InterfaceModule.IncomingPersonContactRepresentativeTypes
**Rows**: 0

**Columns:**
  - `IncomingPersonContactRepresentativeTypesKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonContactKey` (uniqueidentifier, NOT NULL)
  - `PersonContactKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `RepresentativeTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `RepresentativeTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `RepresentativeTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(1000), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonContactKey` → InterfaceModule.IncomingPersonContact.IncomingPersonContactKey
  - `PersonContactKey` → PersonModule.PersonContact.PersonContactKey

**Indexes:**
  - `IX_IncomingPersonContactRepresentativeTypes_IncomingPersonContactKey` (IncomingPersonContactKey)
  - `IX_IncomingPersonContactRepresentativeTypes_PersonContactKey` (PersonContactKey)

#### InterfaceModule.IncomingPersonEmailAddresses
**Rows**: 0

**Columns:**
  - `IncomingPersonEmailAddressesKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `EmailAddress` (nvarchar(510), NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSourceFileName` (nvarchar(500), NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonEmailAddresses_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonEmailAddresses_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonEmailAddresses_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonEthnicities
**Rows**: 0

**Columns:**
  - `IncomingPersonEthnicitiesKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `EthnicityCodeSystemIdentifier` (bigint, NULL)
  - `EthnicityDisplayName` (nvarchar(8000), NULL)
  - `EthnicityIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonEthnicities_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonEthnicities_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonEthnicities_PersonKey` (PersonKey)
  - `IX_IncomingPersonEthnicities_ProvenanceSourceIdentifier` (ProvenanceSourceIdentifier)

#### InterfaceModule.IncomingPersonIdentifiers
**Rows**: 0

**Columns:**
  - `IncomingPersonIdentifiersKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonIdentifiers_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonIdentifiers_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonIdentifiers_PersonKey` (PersonKey)
  - `IX_IncomingPersonIdentifiers_TypeIdentifier` (TypeIdentifier, Value, IncomingPersonKey)
  - `IX_IncomingPersonIdentifiers_Value` (Value)

#### InterfaceModule.IncomingPersonIncome
**Rows**: 0

**Columns:**
  - `IncomingPersonIncomeKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `IncomeSourceCodeSystemIdentifier` (bigint, NOT NULL)
  - `IncomeSourceDisplayName` (nvarchar(8000), NOT NULL)
  - `IncomeSourceIdentifier` (bigint, NOT NULL)
  - `IsActive` (bit, NULL)
  - `MonthlyAmount` (decimal(19,5), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonIncome_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonIncome_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonIncome_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonLanguages
**Rows**: 0

**Columns:**
  - `IncomingPersonLanguagesKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `HumanLanguageCodeSystemIdentifier` (bigint, NULL)
  - `HumanLanguageDisplayName` (nvarchar(8000), NULL)
  - `HumanLanguageIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonLanguages_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonLanguages_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonLanguages_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonLockIns
**Rows**: 0

**Columns:**
  - `IncomingPersonLockInsKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `LockInCategoryCodeSystemIdentifier` (bigint, NULL)
  - `LockInCategoryDisplayName` (nvarchar(8000), NULL)
  - `LockInCategoryIdentifier` (bigint, NULL)
  - `LockInDateRangeEndDate` (date, NULL)
  - `LockInDateRangeStartDate` (date, NULL)
  - `LockInTypeCodeSystemIdentifier` (bigint, NULL)
  - `LockInTypeDisplayName` (nvarchar(8000), NULL)
  - `LockInTypeIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `Description` (nvarchar(500), NULL)
  - `ProviderIdentifier` (nvarchar(40), NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonLockIns_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonLockIns_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonLockIns_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonMedicaidNumbers
**Rows**: 0

**Columns:**
  - `IncomingPersonMedicaidNumbersKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `StatusCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NOT NULL)
  - `StatusIdentifier` (bigint, NOT NULL)
  - `IsOriginal` (bit, NOT NULL)
  - `Value` (nvarchar(40), NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonMedicaidNumbers_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonMedicaidNumbers_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonMedicaidNumbers_PersonKey` (PersonKey)
  - `IX_IncomingPersonMedicaidNumbers_StatusIdentifier` (StatusIdentifier, Value)

#### InterfaceModule.IncomingPersonPhones
**Rows**: 0

**Columns:**
  - `IncomingPersonPhonesKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(500), NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NULL)
  - `IsTextTelephone` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerEntityIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)
  - `LastSourceFileName` (nvarchar(1000), NOT NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonPhones_CustomerEntityIdentifier` (CustomerEntityIdentifier)
  - `IX_IncomingPersonPhones_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonPhones_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonRaces
**Rows**: 0

**Columns:**
  - `IncomingPersonRaceKey` (uniqueidentifier, NOT NULL) [PK]
  - `PersonKey` (uniqueidentifier, NULL)
  - `RaceCodeSystemIdentifier` (bigint, NULL)
  - `RaceDisplayName` (nvarchar(8000), NULL)
  - `RaceIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NULL)
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonRaces_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonRaces_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonRaces_PersonKey` (PersonKey)

#### InterfaceModule.IncomingPersonSpendDowns
**Rows**: 0

**Columns:**
  - `IncomingPersonSpendDownsKey` (uniqueidentifier, NOT NULL) [PK]
  - `IncomingPersonKey` (uniqueidentifier, NULL)
  - `PersonKey` (uniqueidentifier, NULL)
  - `BaseDateRangeEndDate` (date, NULL)
  - `BaseDateRangeStartDate` (date, NULL)
  - `Amount` (decimal(19,5), NULL)
  - `RemainingAmount` (decimal(19,5), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `IncomingPersonKey` → InterfaceModule.IncomingPerson.IncomingPersonKey
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_IncomingPersonSpendDowns_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingPersonSpendDowns_IncomingPersonKey` (IncomingPersonKey)
  - `IX_IncomingPersonSpendDowns_PersonKey` (PersonKey)

#### InterfaceModule.IncomingServiceLine
**Rows**: 0

**Columns:**
  - `IncomingServiceLineKey` (uniqueidentifier, NOT NULL) [PK]
  - `ServiceLineKey` (uniqueidentifier, NULL)
  - `LineNumber` (nvarchar(40), NULL)
  - `Version` (int, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `RequestReceivedDate` (date, NULL)
  - `ReviewedDate` (date, NULL)
  - `ServiceAuthorizationKey` (uniqueidentifier, NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NULL)
  - `AuthorizedDurationLength` (decimal(19,5), NULL)
  - `AuthorizedRateAmount` (decimal(19,5), NULL)
  - `AuthorizedTotalCostAmount` (decimal(19,5), NULL)
  - `AuthorizedTotalUnitCount` (decimal(19,5), NULL)
  - `AuthorizedUnitCount` (decimal(19,5), NULL)
  - `AuthorizedEffectiveDateEndDate` (date, NULL)
  - `AuthorizedEffectiveDateStartDate` (date, NULL)
  - `AuthorizedFrequencyDisplayName` (nvarchar(8000), NULL)
  - `AuthorizedFrequencyIdentifier` (bigint, NULL)
  - `AuthorizedFrequencyCodeSystemIdentifier` (bigint, NULL)
  - `RequestedDurationLength` (decimal(19,5), NULL)
  - `RequestedRateAmount` (decimal(19,5), NULL)
  - `RequestedTotalCostAmount` (decimal(19,5), NULL)
  - `RequestedTotalUnitCount` (decimal(19,5), NULL)
  - `RequestedUnitCount` (decimal(19,5), NULL)
  - `RequestedEffectiveDateEndDate` (date, NULL)
  - `RequestedEffectiveDateStartDate` (date, NULL)
  - `RequestedFrequencyDisplayName` (nvarchar(8000), NULL)
  - `RequestedFrequencyIdentifier` (bigint, NULL)
  - `RequestedFrequencyCodeSystemIdentifier` (bigint, NULL)
  - `ResponseErrorNote` (nvarchar(MAX), NULL)
  - `ResponseErrorCode` (nvarchar(30), NULL)
  - `ResponseOutcomeDisplayName` (nvarchar(8000), NULL)
  - `ResponseOutcomeIdentifier` (bigint, NULL)
  - `ResponseOutcomeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `UtilizationDate` (date, NULL)
  - `UtilizationUsedUnitCount` (decimal(19,5), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NULL)
  - `EntityCreatedTimestamp` (datetime2, NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NULL)
  - `EntityUpdatedTimestamp` (datetime2, NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `HasResponseMessages` (bit, NOT NULL)
  - `HasFatalError` (bit, NOT NULL)
  - `IsReadyToProcess` (bit, NOT NULL)
  - `CustomerPersonIdentifier` (nvarchar(100), NOT NULL)
  - `LastSynchronizationTimestamp` (datetime2, NOT NULL)
  - `HashChecksumValue` (varbinary(64), NULL)

**Foreign Keys:**
  - `ServiceLineKey` → ServiceAuthorizationModule.ServiceLine.ServiceLineKey

**Indexes:**
  - `IX_IncomingServiceLine_CustomerPersonIdentifier` (CustomerPersonIdentifier)
  - `IX_IncomingServiceLine_ServiceAuthorizationKey` (ServiceAuthorizationKey)
  - `IX_IncomingServiceLine_ServiceDefinitionKey` (ServiceDefinitionKey)

#### InterfaceModule.InterfaceBatch
**Rows**: 0

**Columns:**
  - `InterfaceBatchKey` (uniqueidentifier, NOT NULL) [PK]
  - `CategoryName` (nvarchar(80), NULL)
  - `FolderPathName` (nvarchar(2000), NOT NULL)
  - `TotalFilesCount` (int, NOT NULL)
  - `TotalSuccessCount` (int, NOT NULL)
  - `TotalFailCount` (int, NOT NULL)
  - `CreatedDateTimestamp` (datetime2, NOT NULL)
  - `IsProcessed` (bit, NOT NULL)
  - `ProcessedDateTimestamp` (datetime2, NULL)
  - `IsArchived` (bit, NOT NULL)
  - `ArchivedFolderName` (nvarchar(2000), NULL)
  - `ArchivedDateTimestamp` (datetime2, NULL)

#### InterfaceModule.InterfaceBatchInformation
**Rows**: 0

**Columns:**
  - `InterfaceBatchInformationKey` (uniqueidentifier, NOT NULL) [PK]
  - `InterfaceBatchKey` (uniqueidentifier, NOT NULL)
  - `FileName` (nvarchar(400), NOT NULL)
  - `CreatedDateTimestamp` (datetime2, NOT NULL)
  - `FileSizeLength` (bigint, NOT NULL)
  - `TotalRecordsCount` (int, NOT NULL)
  - `IsProcessed` (bit, NOT NULL)
  - `ProcessedDateTimestamp` (datetime2, NULL)
  - `TotalProcessedCount` (int, NULL)
  - `StatusName` (nvarchar(20), NULL)
  - `Note` (nvarchar(4000), NULL)
  - `TransferType` (nvarchar(200), NULL)

**Foreign Keys:**
  - `InterfaceBatchKey` → InterfaceModule.InterfaceBatch.InterfaceBatchKey

#### InterfaceModule.InterfaceBatchInformationIndexOperations
**Rows**: 0

**Columns:**
  - `InterfaceBatchInformationIndexOperationsKey` (uniqueidentifier, NOT NULL) [PK]
  - `CategoryName` (nvarchar(80), NULL)
  - `TableName` (nvarchar(400), NULL)
  - `DropConstraintCommandName` (nvarchar(2000), NULL)
  - `CreateConstraintCommandName` (nvarchar(2000), NULL)
  - `IsDeleted` (bit, NOT NULL)

#### InterfaceModule.InterfaceBatchInformationTableFileMapping
**Rows**: 0

**Columns:**
  - `InterfaceBatchInformationTableFileMappingKey` (uniqueidentifier, NOT NULL) [PK]
  - `CategoryName` (nvarchar(80), NULL)
  - `TypeName` (nvarchar(80), NULL)
  - `TableName` (nvarchar(800), NULL)
  - `FileName` (nvarchar(800), NULL)
  - `IsDeleted` (bit, NOT NULL)

#### InterfaceModule.ProcessLog
**Rows**: 0

**Columns:**
  - `ProcessLogKey` (uniqueidentifier, NOT NULL) [PK]
  - `LogTimestamp` (datetime2, NOT NULL)
  - `LoggerLevelName` (nvarchar(100), NOT NULL)
  - `Message` (nvarchar(MAX), NOT NULL)
  - `Code` (nvarchar(100), NULL)
  - `SourceDataIdentifier` (nvarchar(510), NULL)
  - `AggregateKeyReference` (uniqueidentifier, NULL)
  - `FieldName` (nvarchar(800), NULL)
  - `ModuleName` (nvarchar(800), NOT NULL)
  - `ProcessStepName` (nvarchar(400), NOT NULL)
  - `CurrentUserName` (nvarchar(400), NOT NULL)

**Indexes:**
  - `IX_ProcessLog_LogTimestamp` (LogTimestamp)
  - `IX_ProcessLog_ModuleName` (ModuleName)
  - `IX_ProcessLog_ProcessStepName` (ProcessStepName)

#### InterfaceModule.VocabularyLookup
**Rows**: 0

**Columns:**
  - `VocabularyLookupKey` (uniqueidentifier, NOT NULL) [PK]
  - `CustomerSystemName` (nvarchar(100), NOT NULL)
  - `CustomerTableName` (nvarchar(510), NOT NULL)
  - `CustomerColumnName` (nvarchar(510), NOT NULL)

**Indexes:**
  - `AK_VocabularyLookup` (CustomerSystemName, CustomerTableName, CustomerColumnName) (UNIQUE)

#### InterfaceModule.VocabularyLookupDisplayNames
**Rows**: 0

**Columns:**
  - `VocabularyLookupKey` (uniqueidentifier, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (nvarchar(100), NOT NULL)
  - `CodeSystemIdentifier` (nvarchar(100), NOT NULL)
  - `CustomerValue` (nvarchar(8000), NOT NULL)

**Foreign Keys:**
  - `VocabularyLookupKey` → InterfaceModule.VocabularyLookup.VocabularyLookupKey

**Indexes:**
  - `AK_VocabularyLookupKey_CustomerValue` (VocabularyLookupKey, CustomerValue) (UNIQUE)
  - `IX_VocabularyLookupDisplayNames_VocabularyLookupKey_Clustered` (VocabularyLookupKey)


### CustomerInterfaceModule

WiDHS-specific interface extensions. Contains verification response data and outgoing views for FEA/IRIS authorization responses.

#### CustomerInterfaceModule.VerificationResponse
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CostShareAmountTypeValue` (nvarchar(100), NULL)
  - `CostShareEffectiveDate` (date, NULL)
  - `CostShareEndDate` (date, NULL)
  - `ErrorCode` (nvarchar(20), NULL)
  - `ErrorDescription` (nvarchar(MAX), NULL)
  - `IsMemberFound` (bit, NOT NULL)
  - `LastUpdateAttemptedTimestamp` (datetime2, NOT NULL)
  - `LastUpdatedTimestamp` (datetime2, NOT NULL)
  - `MemberCostShareAmount` (decimal(19,5), NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `SubmittedClientIdentifier` (nvarchar(40), NULL)
  - `TransactionReferenceIdentifier` (nvarchar(100), NULL)
  - `TransactionStatusValue` (nvarchar(100), NULL)
  - `UniqueClientIdentifier` (nvarchar(40), NULL)
  - `WaiverGroupTypeValue` (nvarchar(100), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_VerificationResponse_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_VerificationResponse_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_VerificationResponse_PersonKey` (PersonKey)

#### CustomerInterfaceModule.VerificationResponseAdultLevelOfCares
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL)
  - `CommunityWaiverEligibilityValue` (nvarchar(100), NULL)
  - `CommunityWaiverProgramStartVerificationValue` (nvarchar(100), NULL)
  - `EffectiveDate` (date, NULL)
  - `EndDate` (date, NULL)
  - `HasAlzheimerOrIrreversibleDementia` (bit, NULL)
  - `HasDisabilityPerFederal` (bit, NULL)
  - `HasDisabilityPerState` (bit, NULL)
  - `HasNoTargetGroup` (bit, NULL)
  - `HasPhysicalDisability` (bit, NULL)
  - `HasSevereAndPersistentIllness` (bit, NULL)
  - `HasTerminalCondition` (bit, NULL)
  - `IsFrailElder` (bit, NULL)
  - `StatusCodeValue` (nvarchar(100), NULL)
  - `WaiverProgramValue` (nvarchar(100), NULL)

**Foreign Keys:**
  - `VerificationResponseKey` → CustomerInterfaceModule.VerificationResponse.VerificationResponseKey

**Indexes:**
  - `IX_VerificationResponseAdultLevelOfCares_VerificationResponseKey` (VerificationResponseKey)

#### CustomerInterfaceModule.VerificationResponseBenefitPlans
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDate` (date, NULL)
  - `EndDate` (date, NULL)
  - `Value` (nvarchar(100), NULL)

**Foreign Keys:**
  - `VerificationResponseKey` → CustomerInterfaceModule.VerificationResponse.VerificationResponseKey

**Indexes:**
  - `IX_VerificationResponseBenefitPlans_VerificationResponseKey` (VerificationResponseKey)

#### CustomerInterfaceModule.VerificationResponseChildLevelOfCares
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDate` (date, NULL)
  - `EndDate` (date, NULL)
  - `TargetGroupValue` (nvarchar(100), NULL)
  - `WaiverProgramEligibilityValue` (nvarchar(100), NULL)
  - `WaiverProgramValue` (nvarchar(100), NULL)

**Foreign Keys:**
  - `VerificationResponseKey` → CustomerInterfaceModule.VerificationResponse.VerificationResponseKey

**Indexes:**
  - `IX_VerificationResponseChildLevelOfCares_VerificationResponseKey` (VerificationResponseKey)

#### CustomerInterfaceModule.VerificationResponseManagedCareOrganizations
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDate` (date, NULL)
  - `EndDate` (date, NULL)
  - `Identifier` (nvarchar(40), NULL)
  - `Name` (nvarchar(200), NULL)
  - `ProgramValue` (nvarchar(100), NULL)

**Foreign Keys:**
  - `VerificationResponseKey` → CustomerInterfaceModule.VerificationResponse.VerificationResponseKey

**Indexes:**
  - `IX_VerificationResponseManagedCareOrganizations_VerificationResponseKey` (VerificationResponseKey)

#### CustomerInterfaceModule.VerificationResponseSelfDirectedPersonalCareEnrollments
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL)
  - `AgencyIdentifier` (nvarchar(100), NULL)
  - `EffectiveDate` (date, NULL)
  - `EndDate` (date, NULL)
  - `StatusValue` (nvarchar(100), NULL)
  - `WaiverProgramValue` (nvarchar(100), NULL)

**Foreign Keys:**
  - `VerificationResponseKey` → CustomerInterfaceModule.VerificationResponse.VerificationResponseKey

**Indexes:**
  - `IX_VerificationResponseSelfDirectedPersonalCareEnrollments_VerificationResponseKey` (VerificationResponseKey)

#### CustomerInterfaceModule.VerificationResponseWaiverPrograms
**Rows**: 0

**Columns:**
  - `VerificationResponseKey` (uniqueidentifier, NOT NULL)
  - `AgencyValue` (nvarchar(100), NULL)
  - `EffectiveDate` (date, NULL)
  - `EndDate` (date, NULL)
  - `ProgramValue` (nvarchar(100), NULL)
  - `StatusValue` (nvarchar(100), NULL)

**Foreign Keys:**
  - `VerificationResponseKey` → CustomerInterfaceModule.VerificationResponse.VerificationResponseKey

**Indexes:**
  - `IX_VerificationResponseWaiverPrograms_VerificationResponseKey` (VerificationResponseKey)


### PersonModule

Core person/member data. Target for FSIA and waiver enrollment data. Contains demographics, addresses, contacts, identifiers (Medicaid numbers), and program assignments.

#### PersonModule.CostShare
**Rows**: 65,980

**Columns:**
  - `CostShareKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Amount` (decimal(19,5), NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PaymentStatusCodeSystemIdentifier` (bigint, NULL)
  - `PaymentStatusDisplayName` (nvarchar(8000), NULL)
  - `PaymentStatusIdentifier` (bigint, NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `YearMonthYearValue` (int, NULL)
  - `YearMonthMonthName` (nvarchar(100), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey

**Indexes:**
  - `IX_CostShare_PersonKey` (PersonKey)
  - `IX_CostShare_ProgramKey` (ProgramKey)

#### PersonModule.CostSharePayments
**Rows**: 48,479

**Columns:**
  - `CostShareKey` (uniqueidentifier, NOT NULL)
  - `Amount` (decimal(19,5), NOT NULL)
  - `Date` (date, NULL)

**Foreign Keys:**
  - `CostShareKey` → PersonModule.CostShare.CostShareKey

**Indexes:**
  - `IX_CostSharePayments_CostShareKey` (CostShareKey)

#### PersonModule.FinancialEligibility
**Rows**: 0

**Columns:**
  - `FinancialEligibilityKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Description` (nvarchar(MAX), NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `FinancialEligibilityTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `FinancialEligibilityTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FinancialEligibilityTypeIdentifier` (bigint, NOT NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `StatusCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NOT NULL)
  - `StatusIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `CrisisIntakeKey` (uniqueidentifier, NULL)
  - `RecertificationDueDate` (date, NULL)

**Foreign Keys:**
  - `CrisisIntakeKey` → CrisisIntakeModule.CrisisIntake.CrisisIntakeKey
  - `PersonKey` → PersonModule.Person.PersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_FinancialEligibility_CrisisIntakeKey` (CrisisIntakeKey)
  - `IX_FinancialEligibility_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_FinancialEligibility_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_FinancialEligibility_PersonKey` (PersonKey)

#### PersonModule.Person
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `BirthDate` (date, NULL)
  - `DeathDate` (date, NULL)
  - `IsEnableEmailNotifications` (bit, NOT NULL)
  - `IsEnableTextNotifications` (bit, NOT NULL)
  - `IsUnknown` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PersonIdentifier` (nvarchar(40), NOT NULL)
  - `ProfilePictureKey` (uniqueidentifier, NULL)
  - `BirthRecordAdoptionInformationNote` (nvarchar(MAX), NULL)
  - `BirthRecordApgarScoreFiveMinuteValue` (int, NULL)
  - `BirthRecordApgarScoreOneMinuteValue` (int, NULL)
  - `BirthRecordApgarScoreTenMinuteValue` (int, NULL)
  - `BirthRecordBirthWeightValue` (decimal(19,5), NULL)
  - `BirthRecordFatherName` (nvarchar(200), NULL)
  - `BirthRecordGestationValue` (int, NULL)
  - `BirthRecordMotherName` (nvarchar(200), NULL)
  - `BirthRecordName` (nvarchar(200), NULL)
  - `BirthRecordPlaceOfBirthName` (nvarchar(8000), NULL)
  - `BirthRecordMethodOfDeliveryDisplayName` (nvarchar(8000), NULL)
  - `BirthRecordMethodOfDeliveryIdentifier` (bigint, NULL)
  - `BirthRecordMethodOfDeliveryCodeSystemIdentifier` (bigint, NULL)
  - `CommunicationPreferredMethodTypeDisplayName` (nvarchar(8000), NULL)
  - `CommunicationPreferredMethodTypeIdentifier` (bigint, NULL)
  - `CommunicationPreferredMethodTypeCodeSystemIdentifier` (bigint, NULL)
  - `EducationEducationLevelEducationLevelCodeSystemIdentifier` (bigint, NULL)
  - `EducationEducationLevelEducationLevelDisplayName` (nvarchar(8000), NULL)
  - `EducationEducationLevelEducationLevelIdentifier` (bigint, NULL)
  - `EducationEducationLevelNote` (nvarchar(MAX), NULL)
  - `EnglishFluencyLevelCodeSystemIdentifier` (bigint, NULL)
  - `EnglishFluencyLevelDisplayName` (nvarchar(8000), NULL)
  - `EnglishFluencyLevelIdentifier` (bigint, NULL)
  - `EnglishFluencyNeedsInterpreterDescription` (nvarchar(8000), NULL)
  - `EnglishFluencyNeedsInterpreterDisplayName` (nvarchar(8000), NULL)
  - `EnglishFluencyNeedsInterpreterIdentifier` (bigint, NULL)
  - `EnglishFluencyNeedsInterpreterCodeSystemIdentifier` (bigint, NULL)
  - `BirthAssignedGenderCodeSystemIdentifier` (bigint, NULL)
  - `BirthAssignedGenderDisplayName` (nvarchar(8000), NULL)
  - `BirthAssignedGenderIdentifier` (bigint, NULL)
  - `GenderIdentityCodeSystemIdentifier` (bigint, NULL)
  - `GenderIdentityDisplayName` (nvarchar(8000), NULL)
  - `GenderIdentityIdentifier` (bigint, NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `PhysicalTraitsEyeColorCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalTraitsEyeColorDisplayName` (nvarchar(8000), NULL)
  - `PhysicalTraitsEyeColorIdentifier` (bigint, NULL)
  - `PhysicalTraitsHairColorCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalTraitsHairColorDisplayName` (nvarchar(8000), NULL)
  - `PhysicalTraitsHairColorIdentifier` (bigint, NULL)
  - `PhysicalTraitsHeightMeasure` (float, NULL)
  - `PhysicalTraitsIdentifyingAttributesNote` (nvarchar(MAX), NULL)
  - `PhysicalTraitsWeightMeasure` (float, NULL)
  - `PronounsCodeSystemIdentifier` (bigint, NULL)
  - `PronounsDisplayName` (nvarchar(8000), NULL)
  - `PronounsIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `SexualOrientationCodeSystemIdentifier` (bigint, NULL)
  - `SexualOrientationDisplayName` (nvarchar(8000), NULL)
  - `SexualOrientationIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `TribalNationLeadTypeCodeSystemIdentifier` (bigint, NULL)
  - `TribalNationLeadTypeDisplayName` (nvarchar(8000), NULL)
  - `TribalNationLeadTypeIdentifier` (bigint, NULL)
  - `TribalNationPreferenceTypeCodeSystemIdentifier` (bigint, NULL)
  - `TribalNationPreferenceTypeDisplayName` (nvarchar(8000), NULL)
  - `TribalNationPreferenceTypeIdentifier` (bigint, NULL)
  - `TribalNationTribalNationTypeCodeSystemIdentifier` (bigint, NULL)
  - `TribalNationTribalNationTypeDisplayName` (nvarchar(8000), NULL)
  - `TribalNationTribalNationTypeIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ProfilePictureKey` → ProfilePictureModule.ProfilePicture.ProfilePictureKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `AK_Person_PersonIdentifier` (PersonIdentifier) (UNIQUE)
  - `IX_Person_BirthDate` (BirthDate)
  - `IX_Person_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Person_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_Person_NameFirstName` (NameFirstName)
  - `IX_Person_NameLastName` (NameLastName)
  - `IX_Person_ProfilePictureKey` (ProfilePictureKey)
  - `IX_Person_Provenance` (ProvenanceTypeDisplayName, ProvenanceTypeCodeSystemIdentifier, ProvenanceTypeIdentifier, ProvenanceSourceIdentifier)
  - `IX_Person_Search` (PersonIdentifier, NameFirstName, NameLastName)

#### PersonModule.PersonAddress
**Rows**: 130,671

**Columns:**
  - `PersonAddressKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsActive` (bit, NULL)
  - `IsPrimary` (bit, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `AddressTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `AddressTypeIdentifier` (bigint, NOT NULL)
  - `AddressTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `CurrentDisplayName` (nvarchar(8000), NULL)
  - `CurrentIdentifier` (bigint, NULL)
  - `CurrentCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressVerificationStatusIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TemporaryLocationTypeDisplayName` (nvarchar(8000), NULL)
  - `TemporaryLocationTypeIdentifier` (bigint, NULL)
  - `TemporaryLocationTypeCodeSystemIdentifier` (bigint, NULL)
  - `DateRangeEndDate` (date, NULL)
  - `DateRangeStartDate` (date, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `PhysicalAddressCareOfName` (nvarchar(500), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitudeValue` (float, NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonAddress_Current` (PersonKey, CurrentIdentifier) (UNIQUE)
  - `IX_PersonAddress_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonAddress_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonAddress_PersonKey` (PersonKey)

#### PersonModule.PersonAddressAttributes
**Rows**: 0

**Columns:**
  - `PersonAddressKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `PersonAddressKey` → PersonModule.PersonAddress.PersonAddressKey

**Indexes:**
  - `IX_PersonAddressAttributes_PersonAddressKey` (PersonAddressKey)

#### PersonModule.PersonAlternateNames
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `FirstName` (nvarchar(200), NULL)
  - `LastName` (nvarchar(200), NULL)
  - `MiddleName` (nvarchar(200), NULL)
  - `SuffixName` (nvarchar(200), NULL)
  - `MaidenName` (nvarchar(200), NULL)
  - `PreferredName` (nvarchar(200), NULL)
  - `PrefixName` (nvarchar(200), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonAlternateNames_PersonKey` (PersonKey)

#### PersonModule.PersonAttributes
**Rows**: 90,736

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `ValueCodeSystemIdentifier` (bigint, NULL)
  - `ValueDisplayName` (nvarchar(8000), NULL)
  - `ValueIdentifier` (bigint, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonAttributes_PersonKey` (PersonKey)

#### PersonModule.PersonContact
**Rows**: 91,728

**Columns:**
  - `PersonContactKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `DoesLiveWithPerson` (bit, NULL)
  - `IsTextTelephone` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `OrganizationName` (nvarchar(400), NULL)
  - `YearOfBirthValue` (int, NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `EmailAddressAddress` (nvarchar(510), NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `PhoneExtensionNumber` (nvarchar(40), NULL)
  - `PhoneNumber` (nvarchar(500), NULL)
  - `PhoneTypeDisplayName` (nvarchar(8000), NULL)
  - `PhoneTypeIdentifier` (bigint, NULL)
  - `PhoneTypeCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressVerificationStatusIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `RelationshipTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `RelationshipTypeIdentifier` (bigint, NOT NULL)
  - `RelationshipTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ReleaseOfInformationProvidedDisplayName` (nvarchar(8000), NULL)
  - `ReleaseOfInformationProvidedIdentifier` (bigint, NULL)
  - `ReleaseOfInformationProvidedCodeSystemIdentifier` (bigint, NULL)
  - `SpecialtyDisplayName` (nvarchar(8000), NULL)
  - `SpecialtyIdentifier` (bigint, NULL)
  - `SpecialtyCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsMemberOfCircleofSupport` (bit, NULL)
  - `PhysicalAddressCareOfName` (nvarchar(500), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitudeValue` (float, NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonContact_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonContact_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonContact_PersonKey` (PersonKey)

#### PersonModule.PersonContactAddresses
**Rows**: 74,901

**Columns:**
  - `PersonContactKey` (uniqueidentifier, NOT NULL)
  - `AddressTypeCodeSystemIdentifier` (bigint, NULL)
  - `AddressTypeDisplayName` (nvarchar(8000), NULL)
  - `AddressTypeIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `PhysicalAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountryIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressCountyAreaIdentifier` (bigint, NULL)
  - `PhysicalAddressPostalCode` (nvarchar(20), NULL)
  - `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressStateProvinceIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `PhysicalAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `PhysicalAddressVerificationStatusIdentifier` (bigint, NULL)
  - `PhysicalAddressCityName` (nvarchar(200), NULL)
  - `PhysicalAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `PhysicalAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `DoesLiveWithPerson` (bit, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PhysicalAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `PhysicalAddressGeographicalCoordinatesLongitudeValue` (float, NULL)
  - `PhysicalAddressCareOfName` (nvarchar(500), NULL)

**Foreign Keys:**
  - `PersonContactKey` → PersonModule.PersonContact.PersonContactKey

**Indexes:**
  - `IX_PersonContactAddresses_PersonContactKey` (PersonContactKey)

#### PersonModule.PersonContactPhones
**Rows**: 100,492

**Columns:**
  - `PersonContactKey` (uniqueidentifier, NOT NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(50), NULL)
  - `PhoneTypeCodeSystemIdentifier` (bigint, NULL)
  - `PhoneTypeDisplayName` (nvarchar(8000), NULL)
  - `PhoneTypeIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PhoneAddedDateTimestamp` (datetime2, NOT NULL)

**Foreign Keys:**
  - `PersonContactKey` → PersonModule.PersonContact.PersonContactKey

**Indexes:**
  - `IX_PersonContactPhones_PersonContactKey` (PersonContactKey)

#### PersonModule.PersonContactRepresentativeTypes
**Rows**: 94,527

**Columns:**
  - `PersonContactKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `RepresentativeTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `RepresentativeTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `RepresentativeTypeIdentifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `PersonContactKey` → PersonModule.PersonContact.PersonContactKey

**Indexes:**
  - `IX_PersonContactRepresentativeTypes_PersonContactKey` (PersonContactKey)

#### PersonModule.PersonElectronicTypes
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonElectronicTypes_PersonKey` (PersonKey)

#### PersonModule.PersonEligibilities
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `EligibilityCategoryCodeSystemIdentifier` (bigint, NOT NULL)
  - `EligibilityCategoryDisplayName` (nvarchar(8000), NOT NULL)
  - `EligibilityCategoryIdentifier` (bigint, NOT NULL)
  - `EligibilityTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EligibilityTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `EligibilityTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `StatusCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NOT NULL)
  - `StatusIdentifier` (bigint, NOT NULL)
  - `Description` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonEligibilities_[EffectiveDateRange` (EffectiveDateRangeStartDate, EffectiveDateRangeEndDate, StatusIdentifier, StatusCodeSystemIdentifier)
  - `IX_PersonEligibilities_EligibilityCategoryIdentifier_StatusIdentifier` (EligibilityCategoryIdentifier, StatusIdentifier)
  - `IX_PersonEligibilities_PersonKey` (PersonKey)

#### PersonModule.PersonEmailAddresses
**Rows**: 18,047

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `EmailAddress` (nvarchar(510), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonEmailAddresses_PersonKey` (PersonKey)

#### PersonModule.PersonEmployment
**Rows**: 0

**Columns:**
  - `PersonEmploymentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `EmployerName` (nvarchar(200), NULL)
  - `HoursWorkedPerWeekCount` (int, NULL)
  - `JobTitle` (nvarchar(510), NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `WageAmount` (decimal(19,5), NULL)
  - `WageTypeCodeSystemIdentifier` (bigint, NULL)
  - `WageTypeDisplayName` (nvarchar(8000), NULL)
  - `WageTypeIdentifier` (bigint, NULL)
  - `HasAccessedDivisionOfVocationalRehabilitationCodeSystemIdentifier` (bigint, NULL)
  - `HasAccessedDivisionOfVocationalRehabilitationDisplayName` (nvarchar(8000), NULL)
  - `HasAccessedDivisionOfVocationalRehabilitationIdentifier` (bigint, NULL)
  - `HasCompetitiveIntegratedEmploymentOutcomeCodeSystemIdentifier` (bigint, NULL)
  - `HasCompetitiveIntegratedEmploymentOutcomeDisplayName` (nvarchar(8000), NULL)
  - `HasCompetitiveIntegratedEmploymentOutcomeIdentifier` (bigint, NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonEmployment_PersonKey` (PersonKey)

#### PersonModule.PersonEthnicities
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `EthnicityCodeSystemIdentifier` (bigint, NULL)
  - `EthnicityDisplayName` (nvarchar(8000), NULL)
  - `EthnicityIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonEthnicities_PersonKey` (PersonKey)

#### PersonModule.PersonIdentifiers
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `Value` (nvarchar(100), NOT NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonIdentifiers_PersonKey` (PersonKey)
  - `IX_PersonIdentifiers_Query` (TypeCodeSystemIdentifier, TypeIdentifier, Value)

#### PersonModule.PersonIncomes
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `IncomeSourceCodeSystemIdentifier` (bigint, NOT NULL)
  - `IncomeSourceDisplayName` (nvarchar(8000), NOT NULL)
  - `IncomeSourceIdentifier` (bigint, NOT NULL)
  - `IsActive` (bit, NULL)
  - `MonthlyAmount` (decimal(19,5), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonIncomes_PersonKey` (PersonKey)

#### PersonModule.PersonLanguages
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `HowToCommunicateDescription` (nvarchar(MAX), NULL)
  - `HumanLanguageCodeSystemIdentifier` (bigint, NULL)
  - `HumanLanguageDisplayName` (nvarchar(8000), NULL)
  - `HumanLanguageIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonLanguages_PersonKey` (PersonKey)

#### PersonModule.PersonLink
**Rows**: 0

**Columns:**
  - `PersonLinkKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Comment` (nvarchar(510), NULL)
  - `LinkedFromPersonKey` (uniqueidentifier, NOT NULL)
  - `LinkedToPersonKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LinkedFromPersonKey` → PersonModule.Person.PersonKey
  - `LinkedToPersonKey` → PersonModule.Person.PersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonLink_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonLink_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonLink_LinkedFromPersonKey` (LinkedFromPersonKey)
  - `IX_PersonLink_LinkedToPersonKey` (LinkedToPersonKey)

#### PersonModule.PersonLocationAssignment
**Rows**: 359,217

**Columns:**
  - `PersonLocationAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `TransferredFromPersonLocationAssignmentKey` (uniqueidentifier, NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NULL)
  - `ProvenanceTypeIdentifier` (bigint, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `InitiatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `InitiatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `PersonLocationAssignmentTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `PersonLocationAssignmentTypeIdentifier` (bigint, NOT NULL)
  - `PersonLocationAssignmentTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsProgramManagingLocation` (bit, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `TransferredFromPersonLocationAssignmentKey` → PersonModule.PersonLocationAssignment.PersonLocationAssignmentKey
  - `InitiatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonLocationAssignment_AssignmentType_Dates` (CaseKey, PersonLocationAssignmentTypeCodeSystemIdentifier, PersonLocationAssignmentTypeIdentifier, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate)
  - `IX_PersonLocationAssignment_CaseKey` (CaseKey)
  - `IX_PersonLocationAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonLocationAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonLocationAssignment_InitiatedStaffMemberKey` (InitiatedStaffMemberKey)
  - `IX_PersonLocationAssignment_Location_Dates` (CaseKey, LocationKey, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate)
  - `IX_PersonLocationAssignment_LocationKey` (LocationKey)
  - `IX_PersonLocationAssignment_PersonLocationAssignmentType` (PersonLocationAssignmentTypeCodeSystemIdentifier, PersonLocationAssignmentTypeIdentifier)
  - `IX_PersonLocationAssignment_TransferredFromPersonLocationAssignmentKey` (TransferredFromPersonLocationAssignmentKey)

#### PersonModule.PersonLocationAssignmentDefinition
**Rows**: 6

**Columns:**
  - `PersonLocationAssignmentDefinitionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CapacityPerLocationCount` (int, NULL)
  - `IsActive` (bit, NOT NULL)
  - `IsAssignmentRestrictedByServiceArea` (bit, NOT NULL)
  - `IsMultipleAssignmentsAllowedForSameType` (bit, NOT NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `AssignmentTypeIdentifier` (bigint, NOT NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `LocationPrimaryTypeDisplayName` (nvarchar(8000), NULL)
  - `LocationPrimaryTypeIdentifier` (bigint, NULL)
  - `LocationPrimaryTypeCodeSystemIdentifier` (bigint, NULL)
  - `LocationSubtypeDisplayName` (nvarchar(8000), NULL)
  - `LocationSubtypeIdentifier` (bigint, NULL)
  - `LocationSubtypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonLocationAssignmentDefinition_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonLocationAssignmentDefinition_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### PersonModule.PersonLocationAssignmentDefinitionAssigner
**Rows**: 14

**Columns:**
  - `PersonLocationAssignmentDefinitionAssignerKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsAssignmentRestrictedByAssignersLocation` (bit, NOT NULL)
  - `IsAssignmentRestrictedByAssignersOrganization` (bit, NOT NULL)
  - `RequiresTransferAuthorization` (bit, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)
  - `PersonLocationAssignmentDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonLocationAssignmentDefinitionKey` → PersonModule.PersonLocationAssignmentDefinition.PersonLocationAssignmentDefinitionKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonLocationAssignmentDefinitionAssigner_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonLocationAssignmentDefinitionAssigner_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonLocationAssignmentDefinitionAssigner_PersonLocationAssignmentDefinitionKey` (PersonLocationAssignmentDefinitionKey)
  - `IX_PersonLocationAssignmentDefinitionAssigner_SystemRoleKey` (SystemRoleKey)

#### PersonModule.PersonLocationAssignmentDefinitionAssignerApprovers
**Rows**: 0

**Columns:**
  - `PersonLocationAssignmentDefinitionAssignerKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `PersonLocationAssignmentDefinitionAssignerKey` → PersonModule.PersonLocationAssignmentDefinitionAssigner.PersonLocationAssignmentDefinitionAssignerKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_PersonLocationAssignmentDefinitionAssignerApprovers_PersonLocationAssignmentDefinitionAssignerKey` (PersonLocationAssignmentDefinitionAssignerKey)
  - `IX_PersonLocationAssignmentDefinitionAssignerApprovers_SystemRoleKey` (SystemRoleKey)

#### PersonModule.PersonLocationAssignmentDefinitionUnassigner
**Rows**: 6

**Columns:**
  - `PersonLocationAssignmentDefinitionUnassignerKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsUnassignmentRestrictedByUnassignersLocation` (bit, NOT NULL)
  - `IsUnassignmentRestrictedByUnassignersOrganization` (bit, NOT NULL)
  - `PersonLocationAssignmentDefinitionKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonLocationAssignmentDefinitionKey` → PersonModule.PersonLocationAssignmentDefinition.PersonLocationAssignmentDefinitionKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonLocationAssignmentDefinitionUnassigner_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonLocationAssignmentDefinitionUnassigner_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonLocationAssignmentDefinitionUnassigner_PersonLocationAssignmentDefinitionKey` (PersonLocationAssignmentDefinitionKey)
  - `IX_PersonLocationAssignmentDefinitionUnassigner_SystemRoleKey` (SystemRoleKey)

#### PersonModule.PersonLockIns
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `LockInCategoryCodeSystemIdentifier` (bigint, NULL)
  - `LockInCategoryDisplayName` (nvarchar(8000), NULL)
  - `LockInCategoryIdentifier` (bigint, NULL)
  - `LockInDateRangeEndDate` (date, NULL)
  - `LockInDateRangeStartDate` (date, NULL)
  - `LockInTypeCodeSystemIdentifier` (bigint, NULL)
  - `LockInTypeDisplayName` (nvarchar(8000), NULL)
  - `LockInTypeIdentifier` (bigint, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NULL)
  - `ProvenanceTypeIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `Description` (nvarchar(500), NULL)
  - `ProviderIdentifier` (nvarchar(40), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonLockIns_PersonKey` (PersonKey)

#### PersonModule.PersonLookup
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL) [PK]
  - `PrimaryPhoneNumber` (nvarchar(70), NULL)
  - `CurrentAddressFirstStreetAddress` (nvarchar(600), NULL)
  - `CurrentAddressSecondStreetAddress` (nvarchar(600), NULL)
  - `CurrentAddressCountryName` (nvarchar(500), NULL)
  - `CurrentAddressCountyAreaName` (nvarchar(500), NULL)
  - `CurrentAddressPostalCode` (nvarchar(20), NULL)
  - `CurrentAddressStateProvinceName` (nvarchar(500), NULL)
  - `CurrentAddressCityName` (nvarchar(200), NULL)
  - `CurrentAddressTypeName` (nvarchar(500), NULL)
  - `SocialSecurityNumber` (nvarchar(100), NULL)
  - `ActiveMedicaidNumber` (nvarchar(40), NULL)
  - `AlternateNames` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

#### PersonModule.PersonMedicaidNumbers
**Rows**: 45,523

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `StatusCodeSystemIdentifier` (bigint, NOT NULL)
  - `StatusDisplayName` (nvarchar(8000), NOT NULL)
  - `StatusIdentifier` (bigint, NOT NULL)
  - `IsOriginal` (bit, NOT NULL)
  - `Value` (nvarchar(40), NOT NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonMedicaidNumbers_Active` (PersonKey, StatusIdentifier) (UNIQUE)
  - `IX_PersonMedicaidNumbers_PersonKey` (PersonKey)
  - `IX_PersonMedicaidNumbers_StatusIdentifier` (Value, StatusIdentifier)

#### PersonModule.PersonOtherBenefits
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `IsActive` (bit, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `MonthlyAmount` (decimal(19,5), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonOtherBenefits_PersonKey` (PersonKey)

#### PersonModule.PersonPhones
**Rows**: 83,108

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `PhoneExtensionNumber` (nvarchar(20), NULL)
  - `PhoneNumber` (nvarchar(50), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `IsTextTelephone` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonPhones_PersonKey` (PersonKey)
  - `IX_PersonPhones_Primary` (PersonKey, IsPrimary) (UNIQUE)

#### PersonModule.PersonRaces
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `RaceCodeSystemIdentifier` (bigint, NULL)
  - `RaceDisplayName` (nvarchar(8000), NULL)
  - `RaceIdentifier` (bigint, NULL)
  - `IsPrimary` (bit, NOT NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonRaces_PersonKey` (PersonKey)

#### PersonModule.PersonSpendDowns
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `BaseDateRangeEndDate` (date, NULL)
  - `BaseDateRangeStartDate` (date, NULL)
  - `Amount` (decimal(19,5), NULL)
  - `RemainingAmount` (decimal(19,5), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonSpendDowns_PersonKey` (PersonKey)

#### PersonModule.PersonStaffMemberAssignment
**Rows**: 358,602

**Columns:**
  - `PersonStaffMemberAssignmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsPrimaryAssignment` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `TransferredFromPersonStaffMemberAssignmentKey` (uniqueidentifier, NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `AssignedLocationDisplayName` (nvarchar(500), NOT NULL)
  - `AssignedLocationKey` (uniqueidentifier, NOT NULL)
  - `AssignedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `AssignedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `AssignmentLocationSubtypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentLocationSubtypeIdentifier` (bigint, NULL)
  - `AssignmentLocationSubtypeCodeSystemIdentifier` (bigint, NULL)
  - `AssignmentLocationTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentLocationTypeIdentifier` (bigint, NULL)
  - `AssignmentLocationTypeCodeSystemIdentifier` (bigint, NULL)
  - `AssignmentTypeSystemRoleDisplayName` (nvarchar(500), NOT NULL)
  - `AssignmentTypeSystemRoleKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `InitiatedStaffMemberDisplayName` (nvarchar(500), NOT NULL)
  - `InitiatedStaffMemberKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsMemberOfCircleOfSupport` (bit, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `AssignedLocationKey` → OrganizationModule.Location.LocationKey
  - `TransferredFromPersonStaffMemberAssignmentKey` → PersonModule.PersonStaffMemberAssignment.PersonStaffMemberAssignmentKey
  - `AssignedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `InitiatedStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `AssignmentTypeSystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonStaffMemberAssignment_AssessorKey_LocationKey` (AssignedLocationDisplayName, PersonStaffMemberAssignmentKey, AssignedLocationKey)
  - `IX_PersonStaffMemberAssignment_AssignedLocationKey` (AssignedLocationKey)
  - `IX_PersonStaffMemberAssignment_AssignedStaffMember_Dates` (CaseKey, AssignedStaffMemberKey, EffectiveDateRangeStartDate, EffectiveDateRangeEndDate)
  - `IX_PersonStaffMemberAssignment_AssignedStaffMemberKey_CaeKey_AssignedLocationKey` (CaseKey, AssignedLocationKey, AssignedStaffMemberKey)
  - `IX_PersonStaffMemberAssignment_AssignmentTypeSystemRoleKey` (AssignmentTypeSystemRoleKey)
  - `IX_PersonStaffMemberAssignment_CaseKey` (CaseKey)
  - `IX_PersonStaffMemberAssignment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonStaffMemberAssignment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonStaffMemberAssignment_InitiatedStaffMemberKey` (InitiatedStaffMemberKey)
  - `IX_PersonStaffMemberAssignment_TransferredFromPersonStaffMemberAssignmentKey` (TransferredFromPersonStaffMemberAssignmentKey)

#### PersonModule.PersonStaffMemberAssignmentConfiguration
**Rows**: 2

**Columns:**
  - `PersonStaffMemberAssignmentConfigurationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonStaffMemberAssignmentConfiguration_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentConfiguration_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentConfiguration_ProgramKey` (ProgramKey)

#### PersonModule.PersonStaffMemberAssignmentConfigurationCaseManagerAssignmentDefinitions
**Rows**: 4

**Columns:**
  - `PersonStaffMemberAssignmentConfigurationKey` (uniqueidentifier, NOT NULL)
  - `PersonStaffMemberAssignmentDefinitionKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `PersonStaffMemberAssignmentConfigurationKey` → PersonModule.PersonStaffMemberAssignmentConfiguration.PersonStaffMemberAssignmentConfigurationKey
  - `PersonStaffMemberAssignmentDefinitionKey` → PersonModule.PersonStaffMemberAssignmentDefinition.PersonStaffMemberAssignmentDefinitionKey

**Indexes:**
  - `IX_PersonStaffMemberAssignmentConfigurationCaseManagerAssignmentDefinitions_PersonStaffMemberAssignmentConfigurationKey` (PersonStaffMemberAssignmentConfigurationKey)
  - `IX_PersonStaffMemberAssignmentConfigurationCaseManagerAssignmentDefinitions_PersonStaffMemberAssignmentConfigurationKey_PersonSt` (PersonStaffMemberAssignmentConfigurationKey, PersonStaffMemberAssignmentDefinitionKey) (UNIQUE)
  - `IX_PersonStaffMemberAssignmentConfigurationCaseManagerAssignmentDefinitions_PersonStaffMemberAssignmentDefinitionKey` (PersonStaffMemberAssignmentDefinitionKey)

#### PersonModule.PersonStaffMemberAssignmentDefinition
**Rows**: 3

**Columns:**
  - `PersonStaffMemberAssignmentDefinitionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AutoCreateLocationAssignment` (bit, NOT NULL)
  - `CapacityPerStaffMemberCount` (int, NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `IsMultipleAssignmentsAllowedForSameType` (bit, NOT NULL)
  - `PersonLocationAssignmentDefinitionKey` (uniqueidentifier, NULL)
  - `RequiresLocationAssignment` (bit, NOT NULL)
  - `AssignmentTypeSystemRoleDisplayName` (nvarchar(500), NOT NULL)
  - `AssignmentTypeSystemRoleKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonLocationAssignmentDefinitionKey` → PersonModule.PersonLocationAssignmentDefinition.PersonLocationAssignmentDefinitionKey
  - `AssignmentTypeSystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonStaffMemberAssignmentDefinition_AssignmentTypeSystemRoleKey` (AssignmentTypeSystemRoleKey)
  - `IX_PersonStaffMemberAssignmentDefinition_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentDefinition_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentDefinition_PersonLocationAssignmentDefinitionKey` (PersonLocationAssignmentDefinitionKey)

#### PersonModule.PersonStaffMemberAssignmentDefinitionAssigner
**Rows**: 9

**Columns:**
  - `PersonStaffMemberAssignmentDefinitionAssignerKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsAssignmentRestrictedByAssignersLocation` (bit, NOT NULL)
  - `IsAssignmentRestrictedByAssignersOrganization` (bit, NOT NULL)
  - `RequiresTransferAuthorization` (bit, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)
  - `PersonStaffMemberAssignmentDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonStaffMemberAssignmentDefinitionKey` → PersonModule.PersonStaffMemberAssignmentDefinition.PersonStaffMemberAssignmentDefinitionKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonStaffMemberAssignmentDefinitionAssigner_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentDefinitionAssigner_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentDefinitionAssigner_PersonStaffMemberAssignmentDefinitionKey` (PersonStaffMemberAssignmentDefinitionKey)
  - `IX_PersonStaffMemberAssignmentDefinitionAssigner_SystemRoleKey` (SystemRoleKey)

#### PersonModule.PersonStaffMemberAssignmentDefinitionAssignerApprovers
**Rows**: 0

**Columns:**
  - `PersonStaffMemberAssignmentDefinitionAssignerKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `PersonStaffMemberAssignmentDefinitionAssignerKey` → PersonModule.PersonStaffMemberAssignmentDefinitionAssigner.PersonStaffMemberAssignmentDefinitionAssignerKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_PersonStaffMemberAssignmentDefinitionAssignerApprovers_PersonStaffMemberAssignmentDefinitionAssignerKey` (PersonStaffMemberAssignmentDefinitionAssignerKey)
  - `IX_PersonStaffMemberAssignmentDefinitionAssignerApprovers_SystemRoleKey` (SystemRoleKey)

#### PersonModule.PersonStaffMemberAssignmentDefinitionUnassigner
**Rows**: 0

**Columns:**
  - `PersonStaffMemberAssignmentDefinitionUnassignerKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsUnassignmentRestrictedByUnassignersLocation` (bit, NOT NULL)
  - `IsUnassignmentRestrictedByUnassignersOrganization` (bit, NOT NULL)
  - `PersonStaffMemberAssignmentDefinitionKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonStaffMemberAssignmentDefinitionKey` → PersonModule.PersonStaffMemberAssignmentDefinition.PersonStaffMemberAssignmentDefinitionKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonStaffMemberAssignmentDefinitionUnassigner_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentDefinitionUnassigner_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonStaffMemberAssignmentDefinitionUnassigner_PersonStaffMemberAssignmentDefinitionKey` (PersonStaffMemberAssignmentDefinitionKey)
  - `IX_PersonStaffMemberAssignmentDefinitionUnassigner_SystemRoleKey` (SystemRoleKey)

#### PersonModule.PersonStatusHistory
**Rows**: 0

**Columns:**
  - `PersonStatusHistoryKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `CurrentStatusDisplayName` (nvarchar(8000), NULL)
  - `CurrentStatusIdentifier` (bigint, NULL)
  - `CurrentStatusCodeSystemIdentifier` (bigint, NULL)
  - `PreviousStatusDisplayName` (nvarchar(8000), NULL)
  - `PreviousStatusIdentifier` (bigint, NULL)
  - `PreviousStatusCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonStatusHistory_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonStatusHistory_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonStatusHistory_PersonKey` (PersonKey)

#### PersonModule.PersonTypes
**Rows**: 45,368

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonTypes_Identifier` (Identifier)
  - `IX_PersonTypes_PersonKey` (PersonKey)

#### PersonModule.PersonWarnings
**Rows**: 0

**Columns:**
  - `PersonKey` (uniqueidentifier, NOT NULL)
  - `CategoryCodeSystemIdentifier` (bigint, NULL)
  - `CategoryDisplayName` (nvarchar(8000), NULL)
  - `CategoryIdentifier` (bigint, NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `IsCurrent` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `PersonKey` → PersonModule.Person.PersonKey

**Indexes:**
  - `IX_PersonWarnings_PersonKey` (PersonKey)


### ProgramEnrollmentModule

Program enrollment tracking. Links persons to waiver programs with enrollment dates and suspension tracking.

#### ProgramEnrollmentModule.ProgramEnrollment
**Rows**: 294,313

**Columns:**
  - `ProgramEnrollmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `EnrollmentDateRangeEndDate` (date, NULL)
  - `EnrollmentDateRangeStartDate` (date, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NULL)
  - `ProvenanceTypeIdentifier` (bigint, NULL)
  - `RecertificationDate` (date, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `StatusReasonCodeSystemIdentifier` (bigint, NULL)
  - `StatusReasonDisplayName` (nvarchar(8000), NULL)
  - `StatusReasonIdentifier` (bigint, NULL)
  - `SuspensionStatusCodeSystemIdentifier` (bigint, NULL)
  - `SuspensionStatusDisplayName` (nvarchar(8000), NULL)
  - `SuspensionStatusIdentifier` (bigint, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ProgramEnrollment_CaseKey` (CaseKey)
  - `IX_ProgramEnrollment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ProgramEnrollment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ProgramEnrollment_ProgramKey` (ProgramKey)

#### ProgramEnrollmentModule.ProgramEnrollmentSuspension
**Rows**: 93,233

**Columns:**
  - `ProgramEnrollmentSuspensionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `DateRangeEndDate` (date, NULL)
  - `DateRangeStartDate` (date, NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `ProgramEnrollmentKey` (uniqueidentifier, NOT NULL)
  - `ReasonCodeSystemIdentifier` (bigint, NOT NULL)
  - `ReasonDisplayName` (nvarchar(8000), NOT NULL)
  - `ReasonIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ProgramEnrollmentKey` → ProgramEnrollmentModule.ProgramEnrollment.ProgramEnrollmentKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ProgramEnrollmentSuspension_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ProgramEnrollmentSuspension_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ProgramEnrollmentSuspension_ProgramEnrollmentKey` (ProgramEnrollmentKey)

#### ProgramEnrollmentModule.SynchronizationRecord
**Rows**: 0

**Columns:**
  - `SynchronizationRecordKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ConflictStatusCodeSystemIdentifier` (bigint, NULL)
  - `ConflictStatusDisplayName` (nvarchar(8000), NULL)
  - `ConflictStatusIdentifier` (bigint, NULL)
  - `EnrollmentDateRangeEndDate` (date, NULL)
  - `EnrollmentDateRangeStartDate` (date, NULL)
  - `HasConflict` (bit, NULL)
  - `LastSynchronizedTimestamp` (datetime2, NULL)
  - `OriginalStatusCodeSystemIdentifier` (bigint, NULL)
  - `OriginalStatusDisplayName` (nvarchar(8000), NULL)
  - `OriginalStatusIdentifier` (bigint, NULL)
  - `ProgramEnrollmentKey` (uniqueidentifier, NOT NULL)
  - `TranslatedStatusCodeSystemIdentifier` (bigint, NULL)
  - `TranslatedStatusDisplayName` (nvarchar(8000), NULL)
  - `TranslatedStatusIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ProgramEnrollmentKey` → ProgramEnrollmentModule.ProgramEnrollment.ProgramEnrollmentKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_SynchronizationRecord_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_SynchronizationRecord_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_SynchronizationRecord_ProgramEnrollmentKey` (ProgramEnrollmentKey)


### CustomerProgramEnrollmentModule

WiDHS-specific enrollment sync extensions. Tracks sync status and messages for program enrollment data.

#### CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
**Rows**: 0

**Columns:**
  - `ProgramEnrollmentExtensionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `HasConflict` (bit, NOT NULL)
  - `IdUniqueClientIdentifier` (nvarchar(20), NULL)
  - `LastChangeTypeCode` (nvarchar(100), NULL)
  - `LastSuspensionChangeTypeCode` (nvarchar(100), NULL)
  - `LastSynchronizedTimestamp` (datetime2, NULL)
  - `MmisEffectiveDate` (date, NULL)
  - `MmisEndDate` (date, NULL)
  - `PreUpdateBeginDate` (date, NULL)
  - `PreUpdateEndDate` (date, NULL)
  - `PreUpdateSuspensionStartDate` (date, NULL)
  - `ProgramEnrollmentKey` (uniqueidentifier, NOT NULL)
  - `ResponseStatusCode` (nvarchar(20), NULL)
  - `SiTransactionKeyReference` (nvarchar(100), NULL)
  - `SubmittedClientId` (nvarchar(20), NULL)
  - `TransactionTypeCode` (nvarchar(2), NULL)
  - `TxnRefId` (nvarchar(20), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `PreUpdateSuspensionEndDate` (date, NULL)
  - `ConflictStatusReasonCodeSystemIdentifier` (bigint, NULL)
  - `ConflictStatusReasonDisplayName` (nvarchar(8000), NULL)
  - `ConflictStatusReasonIdentifier` (bigint, NULL)
  - `EventBodyDescription` (nvarchar(8000), NULL)
  - `EventTypeAssemblyQualifiedName` (nvarchar(1000), NULL)
  - `EventTypeDisplayName` (nvarchar(500), NULL)
  - `EventTypeFullName` (nvarchar(500), NULL)
  - `TransactionStatusCodeSystemIdentifier` (bigint, NULL)
  - `TransactionStatusDisplayName` (nvarchar(8000), NULL)
  - `TransactionStatusIdentifier` (bigint, NULL)

**Foreign Keys:**
  - `ProgramEnrollmentKey` → ProgramEnrollmentModule.ProgramEnrollment.ProgramEnrollmentKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ProgramEnrollmentExtension_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ProgramEnrollmentExtension_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ProgramEnrollmentExtension_ProgramEnrollmentKey` (ProgramEnrollmentKey)

#### CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages
**Rows**: 0

**Columns:**
  - `ProgramEnrollmentExtensionKey` (uniqueidentifier, NOT NULL)
  - `ClassificationCode` (nvarchar(20), NULL)
  - `Code` (nvarchar(20), NULL)
  - `Description` (nvarchar(MAX), NULL)
  - `ErrorTypeCode` (nvarchar(20), NULL)
  - `Timestamp` (datetime2, NOT NULL)

**Foreign Keys:**
  - `ProgramEnrollmentExtensionKey` → CustomerProgramEnrollmentModule.ProgramEnrollmentExtension.ProgramEnrollmentExtensionKey

**Indexes:**
  - `IX_ProgramEnrollmentExtensionMessages_ProgramEnrollmentExtensionKey` (ProgramEnrollmentExtensionKey)

#### CustomerProgramEnrollmentModule.SyncTransaction
**Rows**: 0

**Columns:**
  - `SyncTransactionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ChangeTypeCode` (nvarchar(100), NULL)
  - `IdUniqueClientIdentifier` (nvarchar(20), NULL)
  - `MmisEffectiveDate` (date, NULL)
  - `MmisEndDate` (date, NULL)
  - `PreUpdateSuspensionEndDate` (date, NULL)
  - `PreUpdateSuspensionStartDate` (date, NULL)
  - `ProgramEnrollmentExtensionKey` (uniqueidentifier, NOT NULL)
  - `RequestJsonTextFile` (nvarchar(MAX), NULL)
  - `ResponseStatusCode` (nvarchar(20), NULL)
  - `SiTransactionKeyReference` (nvarchar(100), NULL)
  - `SubmittedClientId` (nvarchar(20), NULL)
  - `SuspensionChangeTypeCode` (nvarchar(100), NULL)
  - `Timestamp` (datetime2, NOT NULL)
  - `TransactionTypeCode` (nvarchar(2), NULL)
  - `TxnRefId` (nvarchar(20), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `ConflictStatusReasonCodeSystemIdentifier` (bigint, NULL)
  - `ConflictStatusReasonDisplayName` (nvarchar(8000), NULL)
  - `ConflictStatusReasonIdentifier` (bigint, NULL)
  - `MmisTransactionTypeName` (nvarchar(100), NULL)
  - `ResponseJsonTextFile` (nvarchar(MAX), NULL)
  - `EventBodyDescription` (nvarchar(8000), NULL)
  - `EventTypeAssemblyQualifiedName` (nvarchar(1000), NULL)
  - `EventTypeDisplayName` (nvarchar(500), NULL)
  - `EventTypeFullName` (nvarchar(500), NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)

**Foreign Keys:**
  - `ProgramEnrollmentExtensionKey` → CustomerProgramEnrollmentModule.ProgramEnrollmentExtension.ProgramEnrollmentExtensionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_SyncTransaction_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_SyncTransaction_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_SyncTransaction_ProgramEnrollmentExtensionKey` (ProgramEnrollmentExtensionKey)

#### CustomerProgramEnrollmentModule.SyncTransactionMessages
**Rows**: 0

**Columns:**
  - `SyncTransactionKey` (uniqueidentifier, NOT NULL)
  - `ClassificationCode` (nvarchar(20), NULL)
  - `Code` (nvarchar(20), NULL)
  - `Description` (nvarchar(MAX), NULL)
  - `ErrorTypeCode` (nvarchar(20), NULL)
  - `Timestamp` (datetime2, NOT NULL)

**Foreign Keys:**
  - `SyncTransactionKey` → CustomerProgramEnrollmentModule.SyncTransaction.SyncTransactionKey

**Indexes:**
  - `IX_SyncTransactionMessages_SyncTransactionKey` (SyncTransactionKey)


### HealthInformationModule

Clinical health data including diagnoses, medications, allergies, health insurance, and treatments.

#### HealthInformationModule.AdvanceDirective
**Rows**: 0

**Columns:**
  - `AdvanceDirectiveKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `AdvanceDirectiveTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `AdvanceDirectiveTypeIdentifier` (bigint, NOT NULL)
  - `AdvanceDirectiveTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_AdvanceDirective_CaseKey` (CaseKey)
  - `IX_AdvanceDirective_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_AdvanceDirective_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### HealthInformationModule.Allergy
**Rows**: 0

**Columns:**
  - `AllergyKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AllergenDescription` (nvarchar(MAX), NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `AllergyTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `AllergyTypeIdentifier` (bigint, NOT NULL)
  - `AllergyTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Allergy_CaseKey` (CaseKey)
  - `IX_Allergy_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Allergy_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### HealthInformationModule.DeviceAndModification
**Rows**: 0

**Columns:**
  - `DeviceAndModificationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `SubTypeDisplayName` (nvarchar(8000), NULL)
  - `SubTypeIdentifier` (bigint, NULL)
  - `SubTypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_DeviceAndModification_CaseKey` (CaseKey)
  - `IX_DeviceAndModification_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_DeviceAndModification_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### HealthInformationModule.Diagnosis
**Rows**: 0

**Columns:**
  - `DiagnosisKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `DiagnosisDate` (date, NULL)
  - `IsCurrent` (bit, NOT NULL)
  - `IsProgramQualified` (bit, NULL)
  - `IsPrimary` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `DiagnosedByName` (nvarchar(500), NULL)
  - `DiagnosedByCredentialTypeDisplayName` (nvarchar(8000), NULL)
  - `DiagnosedByCredentialTypeIdentifier` (bigint, NULL)
  - `DiagnosedByCredentialTypeCodeSystemIdentifier` (bigint, NULL)
  - `DiagnosisCodeCode` (nvarchar(100), NOT NULL)
  - `DiagnosisCodeDisplayName` (nvarchar(8000), NOT NULL)
  - `DiagnosisCodeCodeSystemIdentifier` (nvarchar(100), NOT NULL)
  - `DiagnosisCodeCodeSystemVersion` (nvarchar(510), NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Diagnosis_CaseKey` (CaseKey)
  - `IX_Diagnosis_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Diagnosis_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### HealthInformationModule.DiagnosisQualifiedPrograms
**Rows**: 0

**Columns:**
  - `DiagnosisKey` (uniqueidentifier, NOT NULL)
  - `DisplayName` (nvarchar(500), NOT NULL)
  - `KeyReference` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `DiagnosisKey` → HealthInformationModule.Diagnosis.DiagnosisKey

**Indexes:**
  - `IX_DiagnosisQualifiedPrograms_DiagnosisKey` (DiagnosisKey)

#### HealthInformationModule.HealthInsurance
**Rows**: 0

**Columns:**
  - `HealthInsuranceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `BeneficiaryIdentifier` (nvarchar(100), NULL)
  - `CoverageDescription` (nvarchar(500), NULL)
  - `GroupNumber` (nvarchar(40), NULL)
  - `OrganizationName` (nvarchar(500), NULL)
  - `PlanName` (nvarchar(200), NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `PolicyNumber` (nvarchar(60), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `EffectiveDateRangeEndDate` (date, NULL)
  - `EffectiveDateRangeStartDate` (date, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsDeleted` (bit, NOT NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_HealthInsurance_CaseKey` (CaseKey)
  - `IX_HealthInsurance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_HealthInsurance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### HealthInformationModule.HealthInsuranceCoverages
**Rows**: 0

**Columns:**
  - `HealthInsuranceKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `HealthInsuranceKey` → HealthInformationModule.HealthInsurance.HealthInsuranceKey

**Indexes:**
  - `IX_HealthInsuranceCoverages_HealthInsuranceKey` (HealthInsuranceKey)

#### HealthInformationModule.Medication
**Rows**: 0

**Columns:**
  - `MedicationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `DoseMeasure` (float, NULL)
  - `DoseUnitDisplayName` (nvarchar(8000), NULL)
  - `DoseUnitIdentifier` (bigint, NULL)
  - `DoseUnitCodeSystemIdentifier` (bigint, NULL)
  - `FrequencyDisplayName` (nvarchar(8000), NULL)
  - `FrequencyIdentifier` (bigint, NULL)
  - `FrequencyCodeSystemIdentifier` (bigint, NULL)
  - `NameCode` (nvarchar(100), NOT NULL)
  - `NameDisplayName` (nvarchar(8000), NOT NULL)
  - `NameCodeSystemIdentifier` (nvarchar(100), NOT NULL)
  - `NameCodeSystemVersion` (nvarchar(510), NULL)
  - `ProReNataDisplayName` (nvarchar(8000), NULL)
  - `ProReNataIdentifier` (bigint, NULL)
  - `ProReNataCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `RouteDisplayName` (nvarchar(8000), NULL)
  - `RouteIdentifier` (bigint, NULL)
  - `RouteCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Medication_CaseKey` (CaseKey)
  - `IX_Medication_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Medication_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### HealthInformationModule.Treatment
**Rows**: 0

**Columns:**
  - `TreatmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsActive` (bit, NOT NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Treatment_CaseKey` (CaseKey)
  - `IX_Treatment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Treatment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)


### CustomFormModule

Custom form definitions and answer storage. Includes LTC Needs Assessment and other assessment instruments used in care planning.

#### CustomFormModule.AggregateSelector
**Rows**: 3

**Columns:**
  - `AggregateSelectorKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `DisplayTypeCode` (nvarchar(200), NULL)
  - `FilterTypeCode` (nvarchar(200), NULL)
  - `Name` (nvarchar(200), NULL)
  - `AggregateSingleSelectFieldDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `AggregateSingleSelectFieldDefinitionKey` → CustomFormModule.AggregateSingleSelectFieldDefinition.CustomFormElementDefinitionBaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_AggregateSelector_AggregateSingleSelectFieldDefinitionKey` (AggregateSingleSelectFieldDefinitionKey)
  - `IX_AggregateSelector_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_AggregateSelector_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.AggregateSelectorFilterParameters
**Rows**: 2

**Columns:**
  - `AggregateSelectorKey` (uniqueidentifier, NOT NULL)
  - `ParameterValueCodeSystemIdentifier` (bigint, NULL)
  - `ParameterValueDisplayName` (nvarchar(8000), NULL)
  - `ParameterValueIdentifier` (bigint, NULL)
  - `ParameterCode` (nvarchar(200), NULL)
  - `ParameterDisplayName` (nvarchar(200), NULL)
  - `ParameterValueDescription` (nvarchar(8000), NULL)
  - `ParameterValueKeyReference` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `AggregateSelectorKey` → CustomFormModule.AggregateSelector.AggregateSelectorKey

**Indexes:**
  - `IX_AggregateSelectorFilterParameters_AggregateSelectorKey` (AggregateSelectorKey)

#### CustomFormModule.AggregateSingleSelectFieldAnswer
**Rows**: 37,757

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `DisplayName` (nvarchar(200), NULL)
  - `KeyReference` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.AggregateSingleSelectFieldDefinition
**Rows**: 3

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.CaseCustomFormInstance
**Rows**: 235,073

**Columns:**
  - `CaseCustomFormInstanceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CustomFormInstanceKey` (uniqueidentifier, NOT NULL)
  - `PreviousCaseCustomFormInstanceKey` (uniqueidentifier, NULL)
  - `ProgramKey` (uniqueidentifier, NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FormTypeIdentifier` (bigint, NOT NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `PreviousCaseCustomFormInstanceKey` → CustomFormModule.CaseCustomFormInstance.CaseCustomFormInstanceKey
  - `CustomFormInstanceKey` → CustomFormModule.CustomFormInstance.CustomFormInstanceKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CaseCustomFormInstance_CaseKey` (CaseKey)
  - `IX_CaseCustomFormInstance_CustomFormInstanceKey` (CustomFormInstanceKey)
  - `IX_CaseCustomFormInstance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CaseCustomFormInstance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_CaseCustomFormInstance_PreviousCaseCustomFormInstanceKey` (PreviousCaseCustomFormInstanceKey)
  - `IX_CaseCustomFormInstance_ProgramKey` (ProgramKey)

#### CustomFormModule.CustomFieldGroupDefinition
**Rows**: 22

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)
  - `MaximumLengthValue` (int, NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.CustomFormDefinition
**Rows**: 6

**Columns:**
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Description` (nvarchar(500), NULL)
  - `DisplayName` (nvarchar(500), NOT NULL)
  - `IsActive` (bit, NULL)
  - `IsCreateIssueAllowed` (bit, NULL)
  - `IsScoringActive` (bit, NOT NULL)
  - `Name` (nvarchar(500), NOT NULL)
  - `PreviousCustomFormDefinitionKey` (uniqueidentifier, NULL)
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `VersionNumber` (int, NOT NULL)
  - `WorkflowDefinitionIdentifier` (nvarchar(200), NULL)
  - `CustomFormDefinitionValidationKey` (uniqueidentifier, NULL)
  - `ClassificationDisplayName` (nvarchar(8000), NULL)
  - `ClassificationIdentifier` (bigint, NULL)
  - `ClassificationCodeSystemIdentifier` (bigint, NULL)
  - `ExtensionSubTypeDisplayName` (nvarchar(8000), NULL)
  - `ExtensionSubTypeIdentifier` (bigint, NULL)
  - `ExtensionSubTypeCodeSystemIdentifier` (bigint, NULL)
  - `ExtensionTypeDisplayName` (nvarchar(8000), NULL)
  - `ExtensionTypeIdentifier` (bigint, NULL)
  - `ExtensionTypeCodeSystemIdentifier` (bigint, NULL)
  - `FormCategoryDisplayName` (nvarchar(8000), NULL)
  - `FormCategoryIdentifier` (bigint, NULL)
  - `FormCategoryCodeSystemIdentifier` (bigint, NULL)
  - `HelpDocumentationDisplayName` (nvarchar(200), NULL)
  - `HelpDocumentationUrlAddress` (nvarchar(510), NULL)
  - `SaveTypeDisplayName` (nvarchar(8000), NULL)
  - `SaveTypeIdentifier` (bigint, NULL)
  - `SaveTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PreviousCustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `CustomFormDefinitionValidationKey` → CustomFormModule.CustomFormDefinitionValidation.CustomFormDefinitionValidationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormDefinition_CustomFormDefinitionValidationKey` (CustomFormDefinitionValidationKey)
  - `IX_CustomFormDefinition_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormDefinition_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_CustomFormDefinition_ExtensionSubType` (ExtensionSubTypeCodeSystemIdentifier, ExtensionSubTypeIdentifier)
  - `IX_CustomFormDefinition_ExtensionType` (ExtensionTypeCodeSystemIdentifier, ExtensionTypeIdentifier)
  - `IX_CustomFormDefinition_PreviousCustomFormDefinitionKey` (PreviousCustomFormDefinitionKey)

#### CustomFormModule.CustomFormDefinitionAssociatedPrograms
**Rows**: 0

**Columns:**
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey

**Indexes:**
  - `IX_CustomFormDefinitionAssociatedPrograms_CustomFormDefinitionKey_Clustered` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionAssociatedPrograms_ProgramKey` (ProgramKey)

#### CustomFormModule.CustomFormDefinitionFullAccessSystemRoles
**Rows**: 25

**Columns:**
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_CustomFormDefinitionFullAccessSystemRoles_CustomFormDefinitionKey_Clustered` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionFullAccessSystemRoles_SystemRoleKey` (SystemRoleKey)

#### CustomFormModule.CustomFormDefinitionMember
**Rows**: 82

**Columns:**
  - `CustomFormDefinitionMemberKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CustomFormElementDefinitionBaseKeyReference` (uniqueidentifier, NOT NULL)
  - `CustomFormElementIdentifier` (nvarchar(200), NOT NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormDefinitionMember_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionMember_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormDefinitionMember_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.CustomFormDefinitionMemberChild
**Rows**: 76

**Columns:**
  - `CustomFormDefinitionMemberChildKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ChildCustomFormDefinitionMemberKey` (uniqueidentifier, NULL)
  - `CustomFormDefinitionMemberKey` (uniqueidentifier, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `DisplayOrderNumber` (int, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionMemberKey` → CustomFormModule.CustomFormDefinitionMember.CustomFormDefinitionMemberKey
  - `ChildCustomFormDefinitionMemberKey` → CustomFormModule.CustomFormDefinitionMember.CustomFormDefinitionMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormDefinitionMemberChild_ChildCustomFormDefinitionMemberKey` (ChildCustomFormDefinitionMemberKey)
  - `IX_CustomFormDefinitionMemberChild_CustomFormDefinitionMemberKey` (CustomFormDefinitionMemberKey)
  - `IX_CustomFormDefinitionMemberChild_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormDefinitionMemberChild_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.CustomFormDefinitionReadOnlyAccessSystemRoles
**Rows**: 16

**Columns:**
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `SystemRoleKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `SystemRoleKey` → SecurityModule.SystemRole.SystemRoleKey

**Indexes:**
  - `IX_CustomFormDefinitionReadOnlyAccessSystemRoles_CustomFormDefinitionKey_Clustered` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionReadOnlyAccessSystemRoles_SystemRoleKey` (SystemRoleKey)

#### CustomFormModule.CustomFormDefinitionRule
**Rows**: 6

**Columns:**
  - `CustomFormDefinitionRuleKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Name` (nvarchar(500), NOT NULL)
  - `Value` (nvarchar(MAX), NULL)
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormDefinitionRule_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionRule_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormDefinitionRule_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.CustomFormDefinitionScoreRange
**Rows**: 6

**Columns:**
  - `CustomFormDefinitionScoreRangeKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Description` (nvarchar(500), NOT NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `ScoreRangeMaximumValue` (decimal(19,5), NULL)
  - `ScoreRangeMinimumValue` (decimal(19,5), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormDefinitionScoreRange_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionScoreRange_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormDefinitionScoreRange_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.CustomFormDefinitionValidation
**Rows**: 0

**Columns:**
  - `CustomFormDefinitionValidationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormDefinitionValidation_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormDefinitionValidation_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormDefinitionValidation_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.CustomFormDefinitionValidationBlockFormCreationWorkflowStates
**Rows**: 0

**Columns:**
  - `CustomFormDefinitionValidationKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `CustomFormDefinitionValidationKey` → CustomFormModule.CustomFormDefinitionValidation.CustomFormDefinitionValidationKey

**Indexes:**
  - `IX_CustomFormDefinitionValidationBlockFormCreationWorkflowStates_CustomFormDefinitionValidationKey` (CustomFormDefinitionValidationKey)

#### CustomFormModule.CustomFormDefinitionValidationValidationsToApply
**Rows**: 0

**Columns:**
  - `CustomFormDefinitionValidationKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `CustomFormDefinitionValidationKey` → CustomFormModule.CustomFormDefinitionValidation.CustomFormDefinitionValidationKey

**Indexes:**
  - `IX_CustomFormDefinitionValidationValidationsToApply_CustomFormDefinitionValidationKey` (CustomFormDefinitionValidationKey)

#### CustomFormModule.CustomFormDefinitionWorkflowStatuses
**Rows**: 0

**Columns:**
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `Name` (nvarchar(200), NULL)
  - `DisplayName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey

#### CustomFormModule.CustomFormElementDefinitionBase
**Rows**: 82

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Code` (nvarchar(500), NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `CustomFormElementPrefillIdentifier` (nvarchar(508), NULL)
  - `CustomFormNamespaceKey` (uniqueidentifier, NOT NULL)
  - `DisplayName` (nvarchar(8000), NULL)
  - `HelpNote` (nvarchar(MAX), NULL)
  - `IsHidden` (bit, NOT NULL)
  - `IsReadOnly` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)
  - `CustomFormElementPrefillSubIdentifierCodeSystemIdentifier` (nvarchar(510), NULL)
  - `CustomFormElementPrefillSubIdentifierDisplayName` (nvarchar(510), NULL)
  - `CustomFormElementPrefillSubIdentifierIdentifier` (nvarchar(510), NULL)
  - `HelpDocumentationDisplayName` (nvarchar(200), NULL)
  - `HelpDocumentationUrlAddress` (nvarchar(510), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `CustomFormNamespaceKey` → CustomFormModule.CustomFormNamespace.CustomFormNamespaceKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormElementDefinitionBase_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormElementDefinitionBase_CustomFormNamespaceKey` (CustomFormNamespaceKey)
  - `IX_CustomFormElementDefinitionBase_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormElementDefinitionBase_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.CustomFormInstance
**Rows**: 235,073

**Columns:**
  - `CustomFormInstanceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AggregateKeyReference` (uniqueidentifier, NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `PreviousCustomFormInstanceKey` (uniqueidentifier, NULL)
  - `ScoreValue` (decimal(19,5), NULL)
  - `ScoreRangeDisplayName` (nvarchar(500), NULL)
  - `ScoreRangeKeyReference` (uniqueidentifier, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `PreviousCustomFormInstanceKey` → CustomFormModule.CustomFormInstance.CustomFormInstanceKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormInstance_AggregateKeyReference` (AggregateKeyReference)
  - `IX_CustomFormInstance_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormInstance_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormInstance_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_CustomFormInstance_PreviousCustomFormInstanceKey` (PreviousCustomFormInstanceKey)

#### CustomFormModule.CustomFormInstanceSignatureField
**Rows**: 402

**Columns:**
  - `CustomFormInstanceSignatureFieldKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `SignatureContextKey` (uniqueidentifier, NOT NULL)
  - `SignatureFieldDefinitionKey` (uniqueidentifier, NOT NULL)
  - `CustomFormInstanceKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormInstanceKey` → CustomFormModule.CustomFormInstance.CustomFormInstanceKey
  - `SignatureContextKey` → SignatureModule.SignatureContext.SignatureContextKey
  - `SignatureFieldDefinitionKey` → CustomFormModule.SignatureFieldDefinition.CustomFormElementDefinitionBaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormInstanceSignatureField_CustomFormInstanceKey` (CustomFormInstanceKey)
  - `IX_CustomFormInstanceSignatureField_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormInstanceSignatureField_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_CustomFormInstanceSignatureField_SignatureContextKey` (SignatureContextKey)
  - `IX_CustomFormInstanceSignatureField_SignatureFieldDefinitionKey` (SignatureFieldDefinitionKey)

#### CustomFormModule.CustomFormInstanceSignatureFieldSignatures
**Rows**: 402

**Columns:**
  - `CustomFormInstanceSignatureFieldKey` (uniqueidentifier, NOT NULL)
  - `SignatureDefinitionKeyReference` (uniqueidentifier, NOT NULL)
  - `SignatureKeyReference` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `CustomFormInstanceSignatureFieldKey` → CustomFormModule.CustomFormInstanceSignatureField.CustomFormInstanceSignatureFieldKey

**Indexes:**
  - `IX_CustomFormInstanceSignatureFieldSignatures_CustomFormInstanceSignatureFieldKey` (CustomFormInstanceSignatureFieldKey)

#### CustomFormModule.CustomFormNamespace
**Rows**: 6

**Columns:**
  - `CustomFormNamespaceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Code` (nvarchar(20), NULL)
  - `CustomFormDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `CustomFormDefinitionKey` → CustomFormModule.CustomFormDefinition.CustomFormDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_CustomFormNamespace_CustomFormDefinitionKey` (CustomFormDefinitionKey)
  - `IX_CustomFormNamespace_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_CustomFormNamespace_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomFormModule.DateFieldAnswer
**Rows**: 516,116

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `DateTime` (datetime2, NULL)

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.DateFieldDefinition
**Rows**: 9

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.FieldAnswerBase
**Rows**: 2,126,090

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL)
  - `IndexNumber` (int, NOT NULL)
  - `PreviousFieldAnswerBaseKey` (uniqueidentifier, NULL)
  - `CustomFormInstanceKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `IsRequired` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey
  - `CustomFormInstanceKey` → CustomFormModule.CustomFormInstance.CustomFormInstanceKey
  - `PreviousFieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_FieldAnswerBase_CustomFormElementDefinitionBaseKey` (CustomFormElementDefinitionBaseKey)
  - `IX_FieldAnswerBase_CustomFormInstanceKey` (CustomFormInstanceKey)
  - `IX_FieldAnswerBase_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_FieldAnswerBase_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_FieldAnswerBase_PreviousFieldAnswerBaseKey` (PreviousFieldAnswerBaseKey)

#### CustomFormModule.LikertScaleFieldAnswer
**Rows**: 0

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.LikertScaleFieldAnswerAnswers
**Rows**: 0

**Columns:**
  - `LikertScaleFieldAnswerKey` (uniqueidentifier, NOT NULL)
  - `SimpleSelectOptionValueCode` (nvarchar(500), NULL)
  - `SimpleSelectOptionValueDisplayName` (nvarchar(500), NULL)
  - `SimpleSelectOptionValueDisplayOrderNumber` (int, NULL)
  - `SimpleSelectOptionValueScore` (decimal(19,5), NULL)
  - `LikertScaleQuestionKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `LikertScaleFieldAnswerKey` → CustomFormModule.LikertScaleFieldAnswer.FieldAnswerBaseKey
  - `LikertScaleQuestionKey` → CustomFormModule.LikertScaleQuestion.LikertScaleQuestionKey

**Indexes:**
  - `IX_LikertScaleFieldAnswerAnswers_LikertScaleFieldAnswerKey_Clustered` (LikertScaleFieldAnswerKey)
  - `IX_LikertScaleFieldAnswerAnswers_LikertScaleQuestionKey` (LikertScaleQuestionKey)

#### CustomFormModule.LikertScaleFieldDefinition
**Rows**: 0

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.LikertScaleFieldDefinitionOptions
**Rows**: 0

**Columns:**
  - `LikertScaleFieldDefinitionKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(500), NULL)
  - `DisplayName` (nvarchar(8000), NULL)
  - `DisplayOrderNumber` (int, NOT NULL)
  - `Score` (decimal(19,5), NULL)

**Foreign Keys:**
  - `LikertScaleFieldDefinitionKey` → CustomFormModule.LikertScaleFieldDefinition.CustomFormElementDefinitionBaseKey

**Indexes:**
  - `IX_LikertScaleFieldDefinitionOptions_LikertScaleFieldDefinitionKey_Clustered` (LikertScaleFieldDefinitionKey)

#### CustomFormModule.LikertScaleQuestion
**Rows**: 0

**Columns:**
  - `LikertScaleQuestionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `Code` (nvarchar(500), NULL)
  - `Description` (nvarchar(8000), NULL)
  - `DisplayOrderNumber` (int, NOT NULL)
  - `LikertScaleFieldDefinitionKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `LikertScaleFieldDefinitionKey` → CustomFormModule.LikertScaleFieldDefinition.CustomFormElementDefinitionBaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_LikertScaleQuestion_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_LikertScaleQuestion_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_LikertScaleQuestion_LikertScaleFieldDefinitionKey` (LikertScaleFieldDefinitionKey)

#### CustomFormModule.NumericFieldAnswer
**Rows**: 116,756

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `Value` (decimal(19,5), NULL)

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.NumericFieldDefinition
**Rows**: 1

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `DecimalPlaceCount` (int, NULL)
  - `IsDecimal` (bit, NOT NULL)
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)
  - `RangeMaximumValue` (int, NULL)
  - `RangeMinimumValue` (int, NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.SignatureDefinition
**Rows**: 2

**Columns:**
  - `SignatureDefinitionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `DisplayOrderValue` (int, NOT NULL)
  - `IsRequired` (bit, NOT NULL)
  - `SignatureFieldDefinitionKey` (uniqueidentifier, NULL)
  - `CertificationMessageDisplayName` (nvarchar(8000), NULL)
  - `CertificationMessageIdentifier` (bigint, NULL)
  - `CertificationMessageCodeSystemIdentifier` (bigint, NULL)
  - `SignerTypeDisplayName` (nvarchar(8000), NULL)
  - `SignerTypeIdentifier` (bigint, NULL)
  - `SignerTypeCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `DisplayOrderNumber` (int, NULL)

**Foreign Keys:**
  - `SignatureFieldDefinitionKey` → CustomFormModule.SignatureFieldDefinition.CustomFormElementDefinitionBaseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_SignatureDefinition_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_SignatureDefinition_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_SignatureDefinition_SignatureFieldDefinitionKey` (SignatureFieldDefinitionKey)

#### CustomFormModule.SignatureFieldDefinition
**Rows**: 2

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.SimpleMultiSelectFieldAnswer
**Rows**: 603

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.SimpleMultiSelectFieldAnswerAnswers
**Rows**: 288

**Columns:**
  - `SimpleMultiSelectFieldAnswerKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(500), NULL)
  - `DisplayName` (nvarchar(8000), NULL)
  - `DisplayOrderNumber` (int, NOT NULL)
  - `Score` (decimal(19,5), NULL)
  - `IsRequired` (bit, NOT NULL)

**Foreign Keys:**
  - `SimpleMultiSelectFieldAnswerKey` → CustomFormModule.SimpleMultiSelectFieldAnswer.FieldAnswerBaseKey

**Indexes:**
  - `IX_SimpleMultiSelectFieldAnswerAnswers_SimpleMultiSelectFieldAnswerKey_Clustered` (SimpleMultiSelectFieldAnswerKey)

#### CustomFormModule.SimpleMultiSelectFieldDefinition
**Rows**: 3

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `SelectorCodeGroupCode` (nvarchar(500), NULL)
  - `SelectorCodeGroupDisplayName` (nvarchar(500), NULL)
  - `LoadTypeCode` (nvarchar(500), NULL)
  - `LoadTypeDisplayName` (nvarchar(500), NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.SimpleMultiSelectFieldDefinitionOptions
**Rows**: 10

**Columns:**
  - `SimpleMultiSelectFieldDefinitionKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(500), NULL)
  - `DisplayName` (nvarchar(8000), NULL)
  - `DisplayOrderNumber` (int, NOT NULL)
  - `Score` (decimal(19,5), NULL)
  - `IsRequired` (bit, NOT NULL)

**Foreign Keys:**
  - `SimpleMultiSelectFieldDefinitionKey` → CustomFormModule.SimpleMultiSelectFieldDefinition.CustomFormElementDefinitionBaseKey

**Indexes:**
  - `IX_SimpleMultiSelectFieldDefinitionOptions_SimpleMultiSelectFieldDefinitionKey_Clustered` (SimpleMultiSelectFieldDefinitionKey)

#### CustomFormModule.SimpleSingleSelectFieldAnswer
**Rows**: 1,306,395

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `OptionCode` (nvarchar(500), NULL)
  - `OptionDisplayName` (nvarchar(8000), NULL)
  - `OptionDisplayOrderNumber` (int, NULL)
  - `OptionScore` (decimal(19,5), NULL)

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.SimpleSingleSelectFieldDefinition
**Rows**: 27

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)
  - `SelectorCodeGroupCode` (nvarchar(500), NULL)
  - `SelectorCodeGroupDisplayName` (nvarchar(500), NULL)
  - `LoadTypeCode` (nvarchar(500), NULL)
  - `LoadTypeDisplayName` (nvarchar(500), NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.SimpleSingleSelectFieldDefinitionOptions
**Rows**: 84

**Columns:**
  - `SimpleSingleSelectFieldDefinitionKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(500), NULL)
  - `DisplayName` (nvarchar(8000), NULL)
  - `DisplayOrderNumber` (int, NOT NULL)
  - `Score` (decimal(19,5), NULL)

**Foreign Keys:**
  - `SimpleSingleSelectFieldDefinitionKey` → CustomFormModule.SimpleSingleSelectFieldDefinition.CustomFormElementDefinitionBaseKey

**Indexes:**
  - `IX_SimpleSingleSelectFieldDefinitionOptions_SimpleSingleSelectFieldDefinitionKey_Clustered` (SimpleSingleSelectFieldDefinitionKey)

#### CustomFormModule.TextFieldAnswer
**Rows**: 148,463

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.TextFieldDefinition
**Rows**: 15

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `PlaceHolderName` (nvarchar(MAX), NULL)
  - `RegexCode` (nvarchar(500), NULL)
  - `StringLength` (int, NOT NULL)
  - `TypeEnum` (nvarchar(100), NOT NULL)
  - `ValidationErrorMessage` (nvarchar(MAX), NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey

#### CustomFormModule.TimeFieldAnswer
**Rows**: 0

**Columns:**
  - `FieldAnswerBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `DateTime` (datetime2, NULL)

**Foreign Keys:**
  - `FieldAnswerBaseKey` → CustomFormModule.FieldAnswerBase.FieldAnswerBaseKey

#### CustomFormModule.TimeFieldDefinition
**Rows**: 0

**Columns:**
  - `CustomFormElementDefinitionBaseKey` (uniqueidentifier, NOT NULL) [PK]
  - `IsRequired` (bit, NOT NULL)
  - `IsScrollSpyShown` (bit, NOT NULL)

**Foreign Keys:**
  - `CustomFormElementDefinitionBaseKey` → CustomFormModule.CustomFormElementDefinitionBase.CustomFormElementDefinitionBaseKey


### CustomerPersonCenteredPlanModule

IRIS person-centered plan extensions. Contains emergency backup plans, budget amendments, one-time expenses, and plan extensions specific to WiDHS/IRIS.

#### CustomerPersonCenteredPlanModule.AmendmentDemographics
**Rows**: 0

**Columns:**
  - `AmendmentDemographicsKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AddressCityName` (nvarchar(200), NULL)
  - `AddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `AddressCountryDisplayName` (nvarchar(8000), NULL)
  - `AddressCountryIdentifier` (bigint, NULL)
  - `AddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `AddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `AddressCountyAreaIdentifier` (bigint, NULL)
  - `AddressFirstStreetAddress` (nvarchar(500), NULL)
  - `AddressPostalCode` (nvarchar(20), NULL)
  - `AddressSecondStreetAddress` (nvarchar(500), NULL)
  - `AddressCareOfName` (nvarchar(500), NULL)
  - `AddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `AddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `AddressStateProvinceIdentifier` (bigint, NULL)
  - `AddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `AddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `AddressVerificationStatusIdentifier` (bigint, NULL)
  - `AddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `AddressGeographicalCoordinatesLongitudeValue` (float, NULL)
  - `BirthDate` (date, NULL)
  - `BudgetAmendmentKey` (uniqueidentifier, NOT NULL)
  - `IdentifiedNeedDate` (date, NOT NULL)
  - `IrisStartDate` (date, NOT NULL)
  - `MedicaidId` (nvarchar(100), NOT NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `BudgetAmendmentKey` → CustomerPersonCenteredPlanModule.BudgetAmendment.BudgetAmendmentKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_AmendmentDemographics_BudgetAmendmentKey` (BudgetAmendmentKey)
  - `IX_AmendmentDemographics_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_AmendmentDemographics_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomerPersonCenteredPlanModule.AmendmentDemographicsDecisionMakers
**Rows**: 0

**Columns:**
  - `AmendmentDemographicsKey` (uniqueidentifier, NOT NULL)
  - `FirstName` (nvarchar(200), NULL)
  - `LastName` (nvarchar(200), NULL)
  - `MaidenName` (nvarchar(200), NULL)
  - `MiddleName` (nvarchar(200), NULL)
  - `PreferredName` (nvarchar(200), NULL)
  - `PrefixName` (nvarchar(200), NULL)
  - `SuffixName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `AmendmentDemographicsKey` → CustomerPersonCenteredPlanModule.AmendmentDemographics.AmendmentDemographicsKey

**Indexes:**
  - `IX_AmendmentDemographicsDecisionMakers_AmendmentDemographicsKey` (AmendmentDemographicsKey)

#### CustomerPersonCenteredPlanModule.AmendmentDemographicsIrisConsultants
**Rows**: 0

**Columns:**
  - `AmendmentDemographicsKey` (uniqueidentifier, NOT NULL)
  - `FirstName` (nvarchar(200), NULL)
  - `LastName` (nvarchar(200), NULL)
  - `MaidenName` (nvarchar(200), NULL)
  - `MiddleName` (nvarchar(200), NULL)
  - `PreferredName` (nvarchar(200), NULL)
  - `PrefixName` (nvarchar(200), NULL)
  - `SuffixName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `AmendmentDemographicsKey` → CustomerPersonCenteredPlanModule.AmendmentDemographics.AmendmentDemographicsKey

**Indexes:**
  - `IX_AmendmentDemographicsIrisConsultants_AmendmentDemographicsKey` (AmendmentDemographicsKey)

#### CustomerPersonCenteredPlanModule.AmendmentPlannedService
**Rows**: 0

**Columns:**
  - `AmendmentPlannedServiceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `BudgetAmendmentKey` (uniqueidentifier, NOT NULL)
  - `CategoryEnum` (nvarchar(100), NULL)
  - `DurationLength` (decimal(19,5), NULL)
  - `EffectiveDateEndDate` (date, NULL)
  - `EffectiveDateStartDate` (date, NULL)
  - `FrequencyDescription` (nvarchar(8000), NULL)
  - `FrequencyTypeCodeSystemIdentifier` (bigint, NULL)
  - `FrequencyTypeDisplayName` (nvarchar(8000), NULL)
  - `FrequencyTypeIdentifier` (bigint, NULL)
  - `HourPerWeekCount` (decimal(19,5), NULL)
  - `IsNewBudgetRequested` (bit, NOT NULL)
  - `IsTaxApplied` (bit, NULL)
  - `OrderingProviderIdentifier` (nvarchar(40), NULL)
  - `OrderingProviderName` (nvarchar(1500), NULL)
  - `OrderingProviderStaffMemberKey` (uniqueidentifier, NULL)
  - `PlannedServiceReferenceIsApprovedAmendment` (bit, NULL)
  - `PlannedServiceReferencePlannedServiceKey` (uniqueidentifier, NULL)
  - `PlannedServiceReferenceOriginalPlannedServiceKey` (uniqueidentifier, NULL)
  - `ProviderIdentifier` (nvarchar(40), NULL)
  - `ProviderLocationKey` (uniqueidentifier, NULL)
  - `ProviderName` (nvarchar(1500), NULL)
  - `RateAmount` (decimal(19,5), NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NULL)
  - `ServiceModifier1CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier1DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier1Identifier` (bigint, NULL)
  - `ServiceModifier2CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier2DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier2Identifier` (bigint, NULL)
  - `ServiceModifier3CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier3DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier3Identifier` (bigint, NULL)
  - `ServiceModifier4CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier4DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier4Identifier` (bigint, NULL)
  - `ServiceName` (nvarchar(8000), NULL)
  - `ServiceProcedureCodeCodeSystemIdentifier` (bigint, NULL)
  - `ServiceProcedureCodeDisplayName` (nvarchar(8000), NULL)
  - `ServiceProcedureCodeIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `TaxRatePercentage` (decimal(19,5), NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `UnitCount` (decimal(19,5), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `BudgetAmendmentKey` → CustomerPersonCenteredPlanModule.BudgetAmendment.BudgetAmendmentKey
  - `ProviderLocationKey` → OrganizationModule.Location.LocationKey
  - `PlannedServiceReferencePlannedServiceKey` → PersonCenteredPlanModule.PlannedService.PlannedServiceKey
  - `PlannedServiceReferenceOriginalPlannedServiceKey` → PersonCenteredPlanModule.PlannedService.PlannedServiceKey
  - `ServiceDefinitionKey` → ServiceDefinitionModule.ServiceDefinition.ServiceDefinitionKey
  - `OrderingProviderStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_AmendmentPlannedService_BudgetAmendmentKey` (BudgetAmendmentKey)
  - `IX_AmendmentPlannedService_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_AmendmentPlannedService_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_AmendmentPlannedService_OrderingProviderStaffMemberKey` (OrderingProviderStaffMemberKey)
  - `IX_AmendmentPlannedService_PlannedServiceReferenceOriginalPlannedServiceKey` (PlannedServiceReferenceOriginalPlannedServiceKey)
  - `IX_AmendmentPlannedService_PlannedServiceReferencePlannedServiceKey` (PlannedServiceReferencePlannedServiceKey)
  - `IX_AmendmentPlannedService_ProviderLocationKey` (ProviderLocationKey)
  - `IX_AmendmentPlannedService_ServiceDefinitionKey` (ServiceDefinitionKey)

#### CustomerPersonCenteredPlanModule.AmendmentPlannedServiceAttributes
**Rows**: 0

**Columns:**
  - `AmendmentPlannedServiceKey` (uniqueidentifier, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `ValueCodeSystemIdentifier` (bigint, NULL)
  - `ValueDisplayName` (nvarchar(8000), NULL)
  - `ValueIdentifier` (bigint, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `AmendmentPlannedServiceKey` → CustomerPersonCenteredPlanModule.AmendmentPlannedService.AmendmentPlannedServiceKey

**Indexes:**
  - `IX_AmendmentPlannedServiceAttributes_AmendmentPlannedServiceKey` (AmendmentPlannedServiceKey)

#### CustomerPersonCenteredPlanModule.AmendmentPlannedServiceGoals
**Rows**: 0

**Columns:**
  - `AmendmentPlannedServiceKey` (uniqueidentifier, NOT NULL)
  - `GoalKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `AmendmentPlannedServiceKey` → CustomerPersonCenteredPlanModule.AmendmentPlannedService.AmendmentPlannedServiceKey
  - `GoalKey` → PersonCenteredPlanModule.Goal.GoalKey

**Indexes:**
  - `IX_AmendmentPlannedServiceGoals_AmendmentPlannedServiceKey` (AmendmentPlannedServiceKey)
  - `IX_AmendmentPlannedServiceGoals_GoalKey` (GoalKey)

#### CustomerPersonCenteredPlanModule.AmendmentPlannedServiceOtherProviders
**Rows**: 0

**Columns:**
  - `AmendmentPlannedServiceKey` (uniqueidentifier, NOT NULL) [PK]
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL) [PK]
  - `ProviderLocationKey` (uniqueidentifier, NOT NULL) [PK]
  - `ProviderLocationDisplayName` (nvarchar(1000), NULL)

**Foreign Keys:**
  - `AmendmentPlannedServiceKey` → CustomerPersonCenteredPlanModule.AmendmentPlannedService.AmendmentPlannedServiceKey
  - `ProviderLocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_AmendmentPlannedServiceOtherProviders_AmendmentPlannedServiceKey` (AmendmentPlannedServiceKey)
  - `IX_AmendmentPlannedServiceOtherProviders_ProviderLocationKey` (ProviderLocationKey)
  - `IX_AmendmentPlannedServiceOtherProviders_TypeIdentifier` (TypeIdentifier)

#### CustomerPersonCenteredPlanModule.AmendmentSupportingDocumentation
**Rows**: 0

**Columns:**
  - `AmendmentSupportingDocumentationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `BudgetAmendmentKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `BudgetAmendmentKey` → CustomerPersonCenteredPlanModule.BudgetAmendment.BudgetAmendmentKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_AmendmentSupportingDocumentation_BudgetAmendmentKey` (BudgetAmendmentKey)
  - `IX_AmendmentSupportingDocumentation_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_AmendmentSupportingDocumentation_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)

#### CustomerPersonCenteredPlanModule.AmendmentSupportingDocumentationOptional
**Rows**: 0

**Columns:**
  - `AmendmentSupportingDocumentationKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `AmendmentSupportingDocumentationKey` → CustomerPersonCenteredPlanModule.AmendmentSupportingDocumentation.AmendmentSupportingDocumentationKey

**Indexes:**
  - `IX_AmendmentSupportingDocumentationOptional_AmendmentSupportingDocumentationKey` (AmendmentSupportingDocumentationKey)

#### CustomerPersonCenteredPlanModule.AmendmentSupportingDocumentationRequired
**Rows**: 0

**Columns:**
  - `AmendmentSupportingDocumentationKey` (uniqueidentifier, NOT NULL)
  - `CodeSystemIdentifier` (bigint, NOT NULL)
  - `DisplayName` (nvarchar(8000), NOT NULL)
  - `Identifier` (bigint, NOT NULL)

**Foreign Keys:**
  - `AmendmentSupportingDocumentationKey` → CustomerPersonCenteredPlanModule.AmendmentSupportingDocumentation.AmendmentSupportingDocumentationKey

**Indexes:**
  - `IX_AmendmentSupportingDocumentationRequired_AmendmentSupportingDocumentationKey` (AmendmentSupportingDocumentationKey)

#### CustomerPersonCenteredPlanModule.BudgetAmendment
**Rows**: 0

**Columns:**
  - `BudgetAmendmentKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AdditionalInformationCommunityInvolvementNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationEmploymentHoursNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationFamilyMemberCountNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationIndependentTimeOccurrencesPerWeekNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationLivingArrangementCodeSystemIdentifier` (bigint, NULL)
  - `AdditionalInformationLivingArrangementDisplayName` (nvarchar(8000), NULL)
  - `AdditionalInformationLivingArrangementIdentifier` (bigint, NULL)
  - `AdditionalInformationWaiverRecipientCountNote` (nvarchar(MAX), NULL)
  - `ExpeditedRequestReasonCodeSystemIdentifier` (bigint, NULL)
  - `ExpeditedRequestReasonDisplayName` (nvarchar(8000), NULL)
  - `ExpeditedRequestReasonIdentifier` (bigint, NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FormTypeIdentifier` (bigint, NOT NULL)
  - `IsExpeditedRequest` (bit, NOT NULL)
  - `IsPresubmissionProcessCompleted` (bit, NOT NULL)
  - `OriginalRequestInformationRateAmount` (decimal(19,5), NULL)
  - `OriginalRequestInformationUnitCount` (decimal(19,5), NULL)
  - `PersonCenteredPlanReferencePersonCenteredPlanKey` (uniqueidentifier, NOT NULL)
  - `RequestJustificationCurrentSupportHistoryNote` (nvarchar(MAX), NULL)
  - `RequestJustificationDenialImpactNote` (nvarchar(MAX), NULL)
  - `RequestJustificationExploredSupportsNote` (nvarchar(MAX), NULL)
  - `RequestJustificationPromptingEventNote` (nvarchar(MAX), NULL)
  - `RequestJustificationRequestedLengthCodeSystemIdentifier` (bigint, NULL)
  - `RequestJustificationRequestedLengthDisplayName` (nvarchar(8000), NULL)
  - `RequestJustificationRequestedLengthIdentifier` (bigint, NULL)
  - `RequestJustificationRequestedServiceBenefitNote` (nvarchar(MAX), NULL)
  - `ReviewersDhsReviewerStaffMemberDisplayName` (nvarchar(500), NULL)
  - `ReviewersDhsReviewerStaffMemberKey` (uniqueidentifier, NULL)
  - `ReviewersIcaReviewerStaffMemberDisplayName` (nvarchar(500), NULL)
  - `ReviewersIcaReviewerStaffMemberKey` (uniqueidentifier, NULL)
  - `SignatureContextKey` (uniqueidentifier, NULL)
  - `ProgramKey` (uniqueidentifier, NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `RequestJustificationTimeLimitedNote` (nvarchar(8000), NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `PersonCenteredPlanReferencePersonCenteredPlanKey` → PersonCenteredPlanModule.PersonCenteredPlan.PersonCenteredPlanKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `SignatureContextKey` → SignatureModule.SignatureContext.SignatureContextKey
  - `ReviewersDhsReviewerStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `ReviewersIcaReviewerStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_BudgetAmendment_CaseKey` (CaseKey)
  - `IX_BudgetAmendment_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_BudgetAmendment_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_BudgetAmendment_PersonCenteredPlanReferencePersonCenteredPlanKey` (PersonCenteredPlanReferencePersonCenteredPlanKey)
  - `IX_BudgetAmendment_ProgramKey` (ProgramKey)
  - `IX_BudgetAmendment_ReviewersDhsReviewerStaffMemberKey` (ReviewersDhsReviewerStaffMemberKey)
  - `IX_BudgetAmendment_ReviewersIcaReviewerStaffMemberKey` (ReviewersIcaReviewerStaffMemberKey)
  - `IX_BudgetAmendment_SignatureContextKey` (SignatureContextKey)

#### CustomerPersonCenteredPlanModule.BudgetAmendmentProviders
**Rows**: 0

**Columns:**
  - `BudgetAmendmentKey` (uniqueidentifier, NOT NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentTypeIdentifier` (bigint, NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `BudgetAmendmentKey` → CustomerPersonCenteredPlanModule.BudgetAmendment.BudgetAmendmentKey
  - `LocationKey` → OrganizationModule.Location.LocationKey

**Indexes:**
  - `IX_BudgetAmendmentProviders_BudgetAmendmentKey` (BudgetAmendmentKey)
  - `IX_BudgetAmendmentProviders_LocationKey` (LocationKey)

#### CustomerPersonCenteredPlanModule.EmergencyBackupPlan
**Rows**: 28,941

**Columns:**
  - `EmergencyBackupPlanKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AdditionalInformationDescription` (nvarchar(MAX), NULL)
  - `BehavioralNeedsHasBehavioralSupportPlanCodeSystemIdentifier` (bigint, NULL)
  - `BehavioralNeedsHasBehavioralSupportPlanDisplayName` (nvarchar(8000), NULL)
  - `BehavioralNeedsHasBehavioralSupportPlanIdentifier` (bigint, NULL)
  - `EmergencyBackupPlanMedicalNeedsKey` (uniqueidentifier, NULL)
  - `GeneralInformationAllergiesDescription` (nvarchar(8000), NULL)
  - `GeneralInformationLivingSituationCodeSystemIdentifier` (bigint, NULL)
  - `GeneralInformationLivingSituationDisplayName` (nvarchar(8000), NULL)
  - `GeneralInformationLivingSituationIdentifier` (bigint, NULL)
  - `GeneralInformationPreferredHospitalName` (nvarchar(8000), NULL)
  - `PersonCenteredPlanExtensionKey` (uniqueidentifier, NULL)
  - `PharmacyAndMedicationsComments` (nvarchar(MAX), NULL)
  - `PharmacyAndMedicationsMedicationsDescription` (nvarchar(8000), NULL)
  - `PharmacyAndMedicationsPharmacyName` (nvarchar(200), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `EmergencyBackupPlanMedicalNeedsKey` → CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds.EmergencyBackupPlanMedicalNeedsKey
  - `PersonCenteredPlanExtensionKey` → CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension.PersonCenteredPlanExtensionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_EmergencyBackupPlan_EmergencyBackupPlanMedicalNeedsKey` (EmergencyBackupPlanMedicalNeedsKey)
  - `IX_EmergencyBackupPlan_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_EmergencyBackupPlan_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_EmergencyBackupPlan_PersonCenteredPlanExtensionKey` (PersonCenteredPlanExtensionKey)

#### CustomerPersonCenteredPlanModule.EmergencyBackupPlanContact
**Rows**: 0

**Columns:**
  - `EmergencyBackupPlanContactKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CanHelpWithDescription` (nvarchar(8000), NULL)
  - `CategoryCodeSystemIdentifier` (bigint, NULL)
  - `CategoryDisplayName` (nvarchar(8000), NULL)
  - `CategoryIdentifier` (bigint, NULL)
  - `ContactTypeCodeSystemIdentifier` (bigint, NULL)
  - `ContactTypeDisplayName` (nvarchar(8000), NULL)
  - `ContactTypeIdentifier` (bigint, NULL)
  - `EmergencyBackupPlanKey` (uniqueidentifier, NULL)
  - `EmergencySituationCodeSystemIdentifier` (bigint, NULL)
  - `EmergencySituationDisplayName` (nvarchar(8000), NULL)
  - `EmergencySituationIdentifier` (bigint, NULL)
  - `LocationDisplayName` (nvarchar(500), NULL)
  - `LocationKey` (uniqueidentifier, NULL)
  - `OrganizationName` (nvarchar(200), NULL)
  - `PersonContactKeyReference` (uniqueidentifier, NULL)
  - `PersonLocationAssignmentKeyReference` (uniqueidentifier, NULL)
  - `PersonNameFirstName` (nvarchar(200), NULL)
  - `PersonNameLastName` (nvarchar(200), NULL)
  - `PersonNameMaidenName` (nvarchar(200), NULL)
  - `PersonNameMiddleName` (nvarchar(200), NULL)
  - `PersonNamePreferredName` (nvarchar(200), NULL)
  - `PersonNamePrefixName` (nvarchar(200), NULL)
  - `PersonNameSuffixName` (nvarchar(200), NULL)
  - `PhoneExtensionNumber` (nvarchar(40), NULL)
  - `PhoneNumber` (nvarchar(500), NULL)
  - `RelationshipTypeCodeSystemIdentifier` (bigint, NULL)
  - `RelationshipTypeDisplayName` (nvarchar(8000), NULL)
  - `RelationshipTypeIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `EmergencyBackupPlanKey` → CustomerPersonCenteredPlanModule.EmergencyBackupPlan.EmergencyBackupPlanKey
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_EmergencyBackupPlanContact_EmergencyBackupPlanKey` (EmergencyBackupPlanKey)
  - `IX_EmergencyBackupPlanContact_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_EmergencyBackupPlanContact_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_EmergencyBackupPlanContact_LocationKey` (LocationKey)

#### CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds
**Rows**: 28,941

**Columns:**
  - `EmergencyBackupPlanMedicalNeedsKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AdditionalMedicalNotes` (nvarchar(MAX), NULL)
  - `EmergencyBackupPlanKey` (uniqueidentifier, NULL)
  - `PrimaryMedicalProviderPersonContactKeyReference` (uniqueidentifier, NULL)
  - `PrimaryMedicalProviderPersonNameFirstName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPersonNameLastName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPersonNameMaidenName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPersonNameMiddleName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPersonNamePreferredName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPersonNamePrefixName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPersonNameSuffixName` (nvarchar(200), NULL)
  - `PrimaryMedicalProviderPrimaryPhoneNumberExtensionNumber` (nvarchar(40), NULL)
  - `PrimaryMedicalProviderPrimaryPhoneNumberNumber` (nvarchar(500), NULL)
  - `SdpcRegisteredNurseNameFirstName` (nvarchar(200), NULL)
  - `SdpcRegisteredNurseNameLastName` (nvarchar(200), NULL)
  - `SdpcRegisteredNurseNameMaidenName` (nvarchar(200), NULL)
  - `SdpcRegisteredNurseNameMiddleName` (nvarchar(200), NULL)
  - `SdpcRegisteredNurseNamePreferredName` (nvarchar(200), NULL)
  - `SdpcRegisteredNurseNamePrefixName` (nvarchar(200), NULL)
  - `SdpcRegisteredNurseNameSuffixName` (nvarchar(200), NULL)
  - `SdpcRegisteredNursePhoneNumberExtensionNumber` (nvarchar(40), NULL)
  - `SdpcRegisteredNursePhoneNumberNumber` (nvarchar(500), NULL)
  - `SdpcRegisteredNurseStaffMemberKey` (uniqueidentifier, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `MapcAgencyName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `EmergencyBackupPlanKey` → CustomerPersonCenteredPlanModule.EmergencyBackupPlan.EmergencyBackupPlanKey
  - `SdpcRegisteredNurseStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_EmergencyBackupPlanMedicalNeeds_EmergencyBackupPlanKey` (EmergencyBackupPlanKey)
  - `IX_EmergencyBackupPlanMedicalNeeds_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_EmergencyBackupPlanMedicalNeeds_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_EmergencyBackupPlanMedicalNeeds_SdpcRegisteredNurseStaffMemberKey` (SdpcRegisteredNurseStaffMemberKey)

#### CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeedsMedicalEquipmentSupplies
**Rows**: 73,344

**Columns:**
  - `EmergencyBackupPlanMedicalNeedsKey` (uniqueidentifier, NOT NULL)
  - `Code` (nvarchar(20), NULL)
  - `DisplayName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `EmergencyBackupPlanMedicalNeedsKey` → CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds.EmergencyBackupPlanMedicalNeedsKey

**Indexes:**
  - `IX_EmergencyBackupPlanMedicalNeedsMedicalEquipmentSupplies_EmergencyBackupPlanMedicalNeedsKey` (EmergencyBackupPlanMedicalNeedsKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpense
**Rows**: 0

**Columns:**
  - `OneTimeExpenseKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AdditionalInformationCommunityInvolvementNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationEmploymentHoursNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationFamilyMemberCountNote` (nvarchar(MAX), NULL)
  - `AdditionalInformationLivingArrangementCodeSystemIdentifier` (bigint, NULL)
  - `AdditionalInformationLivingArrangementDisplayName` (nvarchar(8000), NULL)
  - `AdditionalInformationLivingArrangementIdentifier` (bigint, NULL)
  - `AdditionalInformationWaiverRecipientCountNote` (nvarchar(MAX), NULL)
  - `ExpeditedRequestReasonCodeSystemIdentifier` (bigint, NULL)
  - `ExpeditedRequestReasonDisplayName` (nvarchar(8000), NULL)
  - `ExpeditedRequestReasonIdentifier` (bigint, NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `FormTypeIdentifier` (bigint, NOT NULL)
  - `IsExpeditedRequest` (bit, NOT NULL)
  - `IsPreviouslySubmitted` (bit, NULL)
  - `IsPresubmissionProcessCompleted` (bit, NOT NULL)
  - `OriginalRequestInformationRateAmount` (decimal(19,5), NULL)
  - `OriginalRequestInformationUnitCount` (decimal(19,5), NULL)
  - `PersonCenteredPlanReferencePersonCenteredPlanKey` (uniqueidentifier, NOT NULL)
  - `RequestJustificationSupportNeededNote` (nvarchar(MAX), NULL)
  - `RequestJustificationLongTermCareNeedNote` (nvarchar(MAX), NULL)
  - `RequestJustificationStepsWithinBudgetNote` (nvarchar(MAX), NULL)
  - `RequestJustificationIndependenceNote` (nvarchar(MAX), NULL)
  - `RequestJustificationCostEfficiencyNote` (nvarchar(MAX), NULL)
  - `RequestJustificationExistingResourcesNote` (nvarchar(MAX), NULL)
  - `RequestJustificationHealthSafetyNote` (nvarchar(MAX), NULL)
  - `RequestJustificationIsVehicleModification` (bit, NULL)
  - `RequestJustificationVehicleMakeName` (nvarchar(510), NULL)
  - `RequestJustificationVehicleModelName` (nvarchar(510), NULL)
  - `RequestJustificationVehicleCurrentMileageValue` (decimal(19,5), NULL)
  - `RequestJustificationVehicleOwnerRelationshipName` (nvarchar(510), NULL)
  - `RequestJustificationIsPreviouslyFundedVehicleModification` (bit, NULL)
  - `RequestJustificationPreviouslyFundedEstimatedValue` (decimal(19,5), NULL)
  - `ReviewersDhsReviewerStaffMemberDisplayName` (nvarchar(500), NULL)
  - `ReviewersDhsReviewerStaffMemberKey` (uniqueidentifier, NULL)
  - `ReviewersIcaReviewerStaffMemberDisplayName` (nvarchar(500), NULL)
  - `ReviewersIcaReviewerStaffMemberKey` (uniqueidentifier, NULL)
  - `SignatureContextKey` (uniqueidentifier, NULL)
  - `ProgramKey` (uniqueidentifier, NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `RequestJustificationIsWisLoanRequest` (bit, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `PersonCenteredPlanReferencePersonCenteredPlanKey` → PersonCenteredPlanModule.PersonCenteredPlan.PersonCenteredPlanKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `SignatureContextKey` → SignatureModule.SignatureContext.SignatureContextKey
  - `ReviewersDhsReviewerStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `ReviewersIcaReviewerStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OneTimeExpense_CaseKey` (CaseKey)
  - `IX_OneTimeExpense_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OneTimeExpense_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OneTimeExpense_PersonCenteredPlanReferencePersonCenteredPlanKey` (PersonCenteredPlanReferencePersonCenteredPlanKey)
  - `IX_OneTimeExpense_ProgramKey` (ProgramKey)
  - `IX_OneTimeExpense_ReviewersDhsReviewerStaffMemberKey` (ReviewersDhsReviewerStaffMemberKey)
  - `IX_OneTimeExpense_ReviewersIcaReviewerStaffMemberKey` (ReviewersIcaReviewerStaffMemberKey)
  - `IX_OneTimeExpense_SignatureContextKey` (SignatureContextKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpenseDemographics
**Rows**: 0

**Columns:**
  - `OneTimeExpenseDemographicsKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AddressCityName` (nvarchar(200), NULL)
  - `AddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `AddressCountryDisplayName` (nvarchar(8000), NULL)
  - `AddressCountryIdentifier` (bigint, NULL)
  - `AddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `AddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `AddressCountyAreaIdentifier` (bigint, NULL)
  - `AddressFirstStreetAddress` (nvarchar(500), NULL)
  - `AddressPostalCode` (nvarchar(20), NULL)
  - `AddressCareOfName` (nvarchar(500), NULL)
  - `AddressSecondStreetAddress` (nvarchar(500), NULL)
  - `AddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `AddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `AddressStateProvinceIdentifier` (bigint, NULL)
  - `AddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `AddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `AddressVerificationStatusIdentifier` (bigint, NULL)
  - `AddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `AddressGeographicalCoordinatesLongitudeValue` (float, NULL)
  - `BirthDate` (date, NULL)
  - `OneTimeExpenseKey` (uniqueidentifier, NOT NULL)
  - `IdentifiedNeedDate` (date, NOT NULL)
  - `IrisStartDate` (date, NOT NULL)
  - `MedicaidId` (nvarchar(100), NOT NULL)
  - `NameFirstName` (nvarchar(200), NULL)
  - `NameLastName` (nvarchar(200), NULL)
  - `NameMaidenName` (nvarchar(200), NULL)
  - `NameMiddleName` (nvarchar(200), NULL)
  - `NamePreferredName` (nvarchar(200), NULL)
  - `NamePrefixName` (nvarchar(200), NULL)
  - `NameSuffixName` (nvarchar(200), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `OneTimeExpenseKey` → CustomerPersonCenteredPlanModule.OneTimeExpense.OneTimeExpenseKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OneTimeExpenseDemographics_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OneTimeExpenseDemographics_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OneTimeExpenseDemographics_OneTimeExpenseKey` (OneTimeExpenseKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpenseDemographicsDecisionMakers
**Rows**: 0

**Columns:**
  - `OneTimeExpenseDemographicsKey` (uniqueidentifier, NOT NULL)
  - `FirstName` (nvarchar(200), NULL)
  - `LastName` (nvarchar(200), NULL)
  - `MaidenName` (nvarchar(200), NULL)
  - `MiddleName` (nvarchar(200), NULL)
  - `PreferredName` (nvarchar(200), NULL)
  - `PrefixName` (nvarchar(200), NULL)
  - `SuffixName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `OneTimeExpenseDemographicsKey` → CustomerPersonCenteredPlanModule.OneTimeExpenseDemographics.OneTimeExpenseDemographicsKey

**Indexes:**
  - `IX_OneTimeExpenseDemographicsDecisionMakers_OneTimeExpenseDemographicsKey` (OneTimeExpenseDemographicsKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpenseDemographicsIrisConsultants
**Rows**: 0

**Columns:**
  - `OneTimeExpenseDemographicsKey` (uniqueidentifier, NOT NULL)
  - `FirstName` (nvarchar(200), NULL)
  - `LastName` (nvarchar(200), NULL)
  - `MaidenName` (nvarchar(200), NULL)
  - `MiddleName` (nvarchar(200), NULL)
  - `PreferredName` (nvarchar(200), NULL)
  - `PrefixName` (nvarchar(200), NULL)
  - `SuffixName` (nvarchar(200), NULL)

**Foreign Keys:**
  - `OneTimeExpenseDemographicsKey` → CustomerPersonCenteredPlanModule.OneTimeExpenseDemographics.OneTimeExpenseDemographicsKey

**Indexes:**
  - `IX_OneTimeExpenseDemographicsIrisConsultants_OneTimeExpenseDemographicsKey` (OneTimeExpenseDemographicsKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpensePlannedService
**Rows**: 0

**Columns:**
  - `OneTimeExpensePlannedServiceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `OneTimeExpenseKey` (uniqueidentifier, NOT NULL)
  - `CategoryEnum` (nvarchar(100), NULL)
  - `DurationLength` (decimal(19,5), NULL)
  - `EffectiveDateEndDate` (date, NULL)
  - `EffectiveDateStartDate` (date, NULL)
  - `FrequencyDescription` (nvarchar(8000), NULL)
  - `FrequencyTypeCodeSystemIdentifier` (bigint, NULL)
  - `FrequencyTypeDisplayName` (nvarchar(8000), NULL)
  - `FrequencyTypeIdentifier` (bigint, NULL)
  - `HourPerWeekCount` (decimal(19,5), NULL)
  - `IsNewBudgetRequested` (bit, NOT NULL)
  - `IsTaxApplied` (bit, NULL)
  - `OrderingProviderIdentifier` (nvarchar(40), NULL)
  - `OrderingProviderName` (nvarchar(1500), NULL)
  - `OrderingProviderStaffMemberKey` (uniqueidentifier, NULL)
  - `PlannedServiceReferenceIsApprovedAmendment` (bit, NULL)
  - `PlannedServiceReferencePlannedServiceKey` (uniqueidentifier, NULL)
  - `PlannedServiceReferenceOriginalPlannedServiceKey` (uniqueidentifier, NULL)
  - `ProviderIdentifier` (nvarchar(40), NULL)
  - `ProviderLocationKey` (uniqueidentifier, NULL)
  - `ProviderName` (nvarchar(1500), NULL)
  - `RateAmount` (decimal(19,5), NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NULL)
  - `ServiceModifier1CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier1DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier1Identifier` (bigint, NULL)
  - `ServiceModifier2CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier2DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier2Identifier` (bigint, NULL)
  - `ServiceModifier3CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier3DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier3Identifier` (bigint, NULL)
  - `ServiceModifier4CodeSystemIdentifier` (bigint, NULL)
  - `ServiceModifier4DisplayName` (nvarchar(8000), NULL)
  - `ServiceModifier4Identifier` (bigint, NULL)
  - `ServiceName` (nvarchar(8000), NULL)
  - `ServiceProcedureCodeCodeSystemIdentifier` (bigint, NULL)
  - `ServiceProcedureCodeDisplayName` (nvarchar(8000), NULL)
  - `ServiceProcedureCodeIdentifier` (bigint, NULL)
  - `StatusCodeSystemIdentifier` (bigint, NULL)
  - `StatusDisplayName` (nvarchar(8000), NULL)
  - `StatusIdentifier` (bigint, NULL)
  - `TaxRatePercentage` (decimal(19,5), NULL)
  - `TypeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NULL)
  - `TypeIdentifier` (bigint, NULL)
  - `UnitCount` (decimal(19,5), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ProviderLocationKey` → OrganizationModule.Location.LocationKey
  - `OneTimeExpenseKey` → CustomerPersonCenteredPlanModule.OneTimeExpense.OneTimeExpenseKey
  - `PlannedServiceReferencePlannedServiceKey` → PersonCenteredPlanModule.PlannedService.PlannedServiceKey
  - `PlannedServiceReferenceOriginalPlannedServiceKey` → PersonCenteredPlanModule.PlannedService.PlannedServiceKey
  - `ServiceDefinitionKey` → ServiceDefinitionModule.ServiceDefinition.ServiceDefinitionKey
  - `OrderingProviderStaffMemberKey` → OrganizationModule.StaffMember.StaffMemberKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_OneTimeExpensePlannedService_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_OneTimeExpensePlannedService_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_OneTimeExpensePlannedService_OneTimeExpenseKey` (OneTimeExpenseKey)
  - `IX_OneTimeExpensePlannedService_OrderingProviderStaffMemberKey` (OrderingProviderStaffMemberKey)
  - `IX_OneTimeExpensePlannedService_PlannedServiceReferenceOriginalPlannedServiceKey` (PlannedServiceReferenceOriginalPlannedServiceKey)
  - `IX_OneTimeExpensePlannedService_PlannedServiceReferencePlannedServiceKey` (PlannedServiceReferencePlannedServiceKey)
  - `IX_OneTimeExpensePlannedService_ProviderLocationKey` (ProviderLocationKey)
  - `IX_OneTimeExpensePlannedService_ServiceDefinitionKey` (ServiceDefinitionKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpensePlannedServiceAttributes
**Rows**: 0

**Columns:**
  - `OneTimeExpensePlannedServiceKey` (uniqueidentifier, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `ValueCodeSystemIdentifier` (bigint, NULL)
  - `ValueDisplayName` (nvarchar(8000), NULL)
  - `ValueIdentifier` (bigint, NULL)
  - `Note` (nvarchar(MAX), NULL)

**Foreign Keys:**
  - `OneTimeExpensePlannedServiceKey` → CustomerPersonCenteredPlanModule.OneTimeExpensePlannedService.OneTimeExpensePlannedServiceKey

**Indexes:**
  - `IX_OneTimeExpensePlannedServiceAttributes_OneTimeExpensePlannedServiceKey` (OneTimeExpensePlannedServiceKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpensePlannedServiceGoals
**Rows**: 0

**Columns:**
  - `OneTimeExpensePlannedServiceKey` (uniqueidentifier, NOT NULL)
  - `GoalKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `GoalKey` → PersonCenteredPlanModule.Goal.GoalKey
  - `OneTimeExpensePlannedServiceKey` → CustomerPersonCenteredPlanModule.OneTimeExpensePlannedService.OneTimeExpensePlannedServiceKey

**Indexes:**
  - `IX_OneTimeExpensePlannedServiceGoals_GoalKey` (GoalKey)
  - `IX_OneTimeExpensePlannedServiceGoals_OneTimeExpensePlannedServiceKey` (OneTimeExpensePlannedServiceKey)

#### CustomerPersonCenteredPlanModule.OneTimeExpensePlannedServiceOtherProviders
**Rows**: 0

**Columns:**
  - `OneTimeExpensePlannedServiceKey` (uniqueidentifier, NOT NULL) [PK]
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL) [PK]
  - `ProviderLocationKey` (uniqueidentifier, NOT NULL) [PK]
  - `ProviderLocationDisplayName` (nvarchar(1000), NULL)

**Foreign Keys:**
  - `ProviderLocationKey` → OrganizationModule.Location.LocationKey
  - `OneTimeExpensePlannedServiceKey` → CustomerPersonCenteredPlanModule.OneTimeExpensePlannedService.OneTimeExpensePlannedServiceKey

**Indexes:**
  - `IX_OneTimeExpensePlannedServiceOtherProviders_OneTimeExpensePlannedServiceKey` (OneTimeExpensePlannedServiceKey)
  - `IX_OneTimeExpensePlannedServiceOtherProviders_ProviderLocationKey` (ProviderLocationKey)
  - `IX_OneTimeExpensePlannedServiceOtherProviders_TypeIdentifier` (TypeIdentifier)

#### CustomerPersonCenteredPlanModule.OneTimeExpenseProviders
**Rows**: 0

**Columns:**
  - `OneTimeExpenseKey` (uniqueidentifier, NOT NULL)
  - `AssignmentTypeCodeSystemIdentifier` (bigint, NULL)
  - `AssignmentTypeDisplayName` (nvarchar(8000), NULL)
  - `AssignmentTypeIdentifier` (bigint, NULL)
  - `LocationKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `LocationKey` → OrganizationModule.Location.LocationKey
  - `OneTimeExpenseKey` → CustomerPersonCenteredPlanModule.OneTimeExpense.OneTimeExpenseKey

**Indexes:**
  - `IX_OneTimeExpenseProviders_LocationKey` (LocationKey)
  - `IX_OneTimeExpenseProviders_OneTimeExpenseKey` (OneTimeExpenseKey)

#### CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension
**Rows**: 207,959

**Columns:**
  - `PersonCenteredPlanExtensionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `LtcNeedsAssessmentDisplayName` (nvarchar(500), NULL)
  - `LtcNeedsAssessmentKeyReference` (uniqueidentifier, NULL)
  - `PersonCenteredPlanKey` (uniqueidentifier, NOT NULL)
  - `RiskAgreementDisplayName` (nvarchar(500), NULL)
  - `RiskAgreementKeyReference` (uniqueidentifier, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonCenteredPlanKey` → PersonCenteredPlanModule.PersonCenteredPlan.PersonCenteredPlanKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_PersonCenteredPlanExtension_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_PersonCenteredPlanExtension_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_PersonCenteredPlanExtension_PersonCenteredPlanKey` (PersonCenteredPlanKey)

#### CustomerPersonCenteredPlanModule.WhereILive
**Rows**: 0

**Columns:**
  - `WhereILiveKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ImportanceOfWhereYouLiveDescription` (nvarchar(8000), NULL)
  - `LivingSituationTypeCodeSystemIdentifier` (bigint, NULL)
  - `LivingSituationTypeDisplayName` (nvarchar(8000), NULL)
  - `LivingSituationTypeIdentifier` (bigint, NULL)
  - `OtherArrangementsDescription` (nvarchar(8000), NULL)
  - `PersonCenteredPlanExtensionKey` (uniqueidentifier, NOT NULL)
  - `SatisfactionWithLivingArrangementNote` (nvarchar(MAX), NULL)
  - `SatisfactionWithLivingArrangementValueCodeSystemIdentifier` (bigint, NULL)
  - `SatisfactionWithLivingArrangementValueDisplayName` (nvarchar(8000), NULL)
  - `SatisfactionWithLivingArrangementValueIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PersonCenteredPlanExtensionKey` → CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension.PersonCenteredPlanExtensionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_WhereILive_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_WhereILive_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_WhereILive_PersonCenteredPlanExtensionKey` (PersonCenteredPlanExtensionKey)


### ServiceAuthorizationModule

Service authorization records. Target for D05 authorization request/response data. Contains authorizations, service lines, decisions, and utilization tracking.

#### ServiceAuthorizationModule.Decision
**Rows**: 1,289,019

**Columns:**
  - `DecisionKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ClaimNote` (nvarchar(MAX), NULL)
  - `DecisionDate` (date, NOT NULL)
  - `SupervisorName` (nvarchar(200), NULL)
  - `SupervisorReviewDate` (date, NULL)
  - `ServiceLineKey` (uniqueidentifier, NOT NULL)
  - `ReasonDisplayName` (nvarchar(8000), NULL)
  - `ReasonIdentifier` (bigint, NULL)
  - `ReasonCodeSystemIdentifier` (bigint, NULL)
  - `ReviewedByDisplayName` (nvarchar(500), NOT NULL)
  - `ReviewedByKeyReference` (uniqueidentifier, NOT NULL)
  - `ReviewNeededDisplayName` (nvarchar(8000), NOT NULL)
  - `ReviewNeededIdentifier` (bigint, NOT NULL)
  - `ReviewNeededCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ServiceLineKey` → ServiceAuthorizationModule.ServiceLine.ServiceLineKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_Decision_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_Decision_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_Decision_ServiceLineKey` (ServiceLineKey)

#### ServiceAuthorizationModule.ServiceAuthorization
**Rows**: 1,308,288

**Columns:**
  - `ServiceAuthorizationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `CaseManagerName` (nvarchar(1000), NULL)
  - `OriginalServiceAuthorizationKeyReference` (uniqueidentifier, NULL)
  - `ServiceAuthorizationNumber` (nvarchar(40), NOT NULL)
  - `ProgramKey` (uniqueidentifier, NULL)
  - `CaseKey` (uniqueidentifier, NOT NULL)
  - `CreateByServiceAuthorizationTypeDisplayName` (nvarchar(8000), NULL)
  - `CreateByServiceAuthorizationTypeIdentifier` (bigint, NULL)
  - `CreateByServiceAuthorizationTypeCodeSystemIdentifier` (bigint, NULL)
  - `FormTypeDisplayName` (nvarchar(8000), NULL)
  - `FormTypeIdentifier` (bigint, NULL)
  - `FormTypeCodeSystemIdentifier` (bigint, NULL)
  - `ProvenanceSourceIdentifier` (nvarchar(1000), NULL)
  - `ProvenanceTypeDisplayName` (nvarchar(8000), NOT NULL)
  - `ProvenanceTypeIdentifier` (bigint, NOT NULL)
  - `ProvenanceTypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `ProviderReferenceLocationKey` (uniqueidentifier, NULL)
  - `ProviderReferenceName` (nvarchar(400), NULL)
  - `ProviderReferenceNationalProviderIdentifier` (nvarchar(100), NULL)
  - `ProviderReferenceProviderIdentifier` (nvarchar(40), NULL)
  - `ProviderReferenceAddressCityName` (nvarchar(200), NULL)
  - `ProviderReferenceAddressFirstStreetAddress` (nvarchar(500), NULL)
  - `ProviderReferenceAddressSecondStreetAddress` (nvarchar(500), NULL)
  - `ProviderReferenceAddressCountryDisplayName` (nvarchar(8000), NULL)
  - `ProviderReferenceAddressCountryIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressCountryCodeSystemIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressCountyAreaDisplayName` (nvarchar(8000), NULL)
  - `ProviderReferenceAddressCountyAreaIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressCountyAreaCodeSystemIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressPostalCode` (nvarchar(20), NULL)
  - `ProviderReferenceAddressStateProvinceDisplayName` (nvarchar(8000), NULL)
  - `ProviderReferenceAddressStateProvinceIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressStateProvinceCodeSystemIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressVerificationStatusDisplayName` (nvarchar(8000), NULL)
  - `ProviderReferenceAddressVerificationStatusIdentifier` (bigint, NULL)
  - `ProviderReferenceAddressVerificationStatusCodeSystemIdentifier` (bigint, NULL)
  - `ProviderReferenceSpecialtyDisplayName` (nvarchar(8000), NULL)
  - `ProviderReferenceSpecialtyIdentifier` (bigint, NULL)
  - `ProviderReferenceSpecialtyCodeSystemIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `PersonCenteredPlanKeyReference` (uniqueidentifier, NULL)
  - `ProviderReferenceAddressCareOfName` (nvarchar(500), NULL)
  - `ProviderReferenceAddressGeographicalCoordinatesLatitudeValue` (float, NULL)
  - `ProviderReferenceAddressGeographicalCoordinatesLongitudeValue` (float, NULL)

**Foreign Keys:**
  - `CaseKey` → CaseModule.Case.CaseKey
  - `ProviderReferenceLocationKey` → OrganizationModule.Location.LocationKey
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ServiceAuthorization_CaseKey` (CaseKey)
  - `IX_ServiceAuthorization_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ServiceAuthorization_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ServiceAuthorization_ProgramKey` (ProgramKey)
  - `IX_ServiceAuthorization_ProviderReferenceLocationKey` (ProviderReferenceLocationKey)

#### ServiceAuthorizationModule.ServiceAuthorizationConfiguration
**Rows**: 2

**Columns:**
  - `ServiceAuthorizationConfigurationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `AutoApproveAllFlag` (bit, NOT NULL)
  - `AutoApproveFlag` (bit, NOT NULL)
  - `AutoCreateFlag` (bit, NOT NULL)
  - `AutoCreateAllFlag` (bit, NOT NULL)
  - `ProgramKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ProgramKey` → ProgramModule.Program.ProgramKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ServiceAuthorizationConfiguration_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ServiceAuthorizationConfiguration_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ServiceAuthorizationConfiguration_ProgramKey` (ProgramKey)

#### ServiceAuthorizationModule.ServiceAuthorizationConfigurationAutoApproveServiceDefinitions
**Rows**: 0

**Columns:**
  - `ServiceAuthorizationConfigurationKey` (uniqueidentifier, NOT NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `ServiceAuthorizationConfigurationKey` → ServiceAuthorizationModule.ServiceAuthorizationConfiguration.ServiceAuthorizationConfigurationKey
  - `ServiceDefinitionKey` → ServiceDefinitionModule.ServiceDefinition.ServiceDefinitionKey

**Indexes:**
  - `IX_ServiceAuthorizationConfigurationAutoApproveServiceDefinitions_ServiceAuthorizationConfigurationKey` (ServiceAuthorizationConfigurationKey)
  - `IX_ServiceAuthorizationConfigurationAutoApproveServiceDefinitions_ServiceAuthorizationConfigurationKey_ServiceDefinitionKey` (ServiceAuthorizationConfigurationKey, ServiceDefinitionKey) (UNIQUE)
  - `IX_ServiceAuthorizationConfigurationAutoApproveServiceDefinitions_ServiceDefinitionKey` (ServiceDefinitionKey)

#### ServiceAuthorizationModule.ServiceAuthorizationConfigurationAutoCreateServiceDefinitions
**Rows**: 0

**Columns:**
  - `ServiceAuthorizationConfigurationKey` (uniqueidentifier, NOT NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NOT NULL)

**Foreign Keys:**
  - `ServiceAuthorizationConfigurationKey` → ServiceAuthorizationModule.ServiceAuthorizationConfiguration.ServiceAuthorizationConfigurationKey
  - `ServiceDefinitionKey` → ServiceDefinitionModule.ServiceDefinition.ServiceDefinitionKey

**Indexes:**
  - `IX_ServiceAuthorizationConfigurationAutoCreateServiceDefinitions_ServiceAuthorizationConfigurationKey` (ServiceAuthorizationConfigurationKey)
  - `IX_ServiceAuthorizationConfigurationAutoCreateServiceDefinitions_ServiceAuthorizationConfigurationKey_ServiceDefinitionKey` (ServiceAuthorizationConfigurationKey, ServiceDefinitionKey) (UNIQUE)
  - `IX_ServiceAuthorizationConfigurationAutoCreateServiceDefinitions_ServiceDefinitionKey` (ServiceDefinitionKey)

#### ServiceAuthorizationModule.ServiceAuthorizationOtherProviders
**Rows**: 271,933

**Columns:**
  - `ServiceAuthorizationKey` (uniqueidentifier, NOT NULL) [PK]
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `TypeDisplayName` (nvarchar(1000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL) [PK]
  - `ProviderLocationKey` (uniqueidentifier, NOT NULL) [PK]
  - `ProviderLocationDisplayName` (nvarchar(1000), NULL)

**Foreign Keys:**
  - `ProviderLocationKey` → OrganizationModule.Location.LocationKey
  - `ServiceAuthorizationKey` → ServiceAuthorizationModule.ServiceAuthorization.ServiceAuthorizationKey

**Indexes:**
  - `IX_ServiceAuthorizationOtherProviders_ProviderLocationKey` (ProviderLocationKey)
  - `IX_ServiceAuthorizationOtherProviders_ServiceAuthorizationKey` (ServiceAuthorizationKey)
  - `IX_ServiceAuthorizationOtherProviders_TypeIdentifier` (TypeIdentifier)

#### ServiceAuthorizationModule.ServiceLine
**Rows**: 1,289,019

**Columns:**
  - `ServiceLineKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `IsNeedManualMassAdjustment` (bit, NULL)
  - `LineNumber` (nvarchar(40), NULL)
  - `Note` (nvarchar(MAX), NULL)
  - `RequestReceivedDate` (date, NOT NULL)
  - `ReviewedDate` (date, NULL)
  - `ServiceAuthorizationKey` (uniqueidentifier, NOT NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NOT NULL)
  - `AuthorizedDurationLength` (decimal(19,5), NULL)
  - `AuthorizedRateAmount` (decimal(19,5), NULL)
  - `AuthorizedTotalCostAmount` (decimal(19,5), NULL)
  - `AuthorizedTotalUnitCount` (decimal(19,5), NULL)
  - `AuthorizedUnitCount` (decimal(19,5), NULL)
  - `AuthorizedEffectiveDateEndDate` (date, NULL)
  - `AuthorizedEffectiveDateStartDate` (date, NULL)
  - `AuthorizedFrequencyDisplayName` (nvarchar(8000), NULL)
  - `AuthorizedFrequencyIdentifier` (bigint, NULL)
  - `AuthorizedFrequencyCodeSystemIdentifier` (bigint, NULL)
  - `RequestedDurationLength` (decimal(19,5), NULL)
  - `RequestedRateAmount` (decimal(19,5), NULL)
  - `RequestedTotalCostAmount` (decimal(19,5), NULL)
  - `RequestedTotalUnitCount` (decimal(19,5), NULL)
  - `RequestedUnitCount` (decimal(19,5), NULL)
  - `RequestedEffectiveDateEndDate` (date, NULL)
  - `RequestedEffectiveDateStartDate` (date, NULL)
  - `RequestedFrequencyDisplayName` (nvarchar(8000), NULL)
  - `RequestedFrequencyIdentifier` (bigint, NULL)
  - `RequestedFrequencyCodeSystemIdentifier` (bigint, NULL)
  - `ResponseErrorCode` (nvarchar(30), NULL)
  - `ResponseErrorNote` (nvarchar(MAX), NULL)
  - `ResponseOutcomeDisplayName` (nvarchar(8000), NULL)
  - `ResponseOutcomeIdentifier` (bigint, NULL)
  - `ResponseOutcomeCodeSystemIdentifier` (bigint, NULL)
  - `TypeDisplayName` (nvarchar(8000), NOT NULL)
  - `TypeIdentifier` (bigint, NOT NULL)
  - `TypeCodeSystemIdentifier` (bigint, NOT NULL)
  - `UtilizationAmountPaidCount` (decimal(19,5), NULL)
  - `UtilizationAmountRemainingCount` (decimal(19,5), NULL)
  - `UtilizationAmountUsedCount` (decimal(19,5), NULL)
  - `UtilizationDate` (date, NULL)
  - `UtilizationPaidUnitsCount` (decimal(19,5), NULL)
  - `UtilizationUsedUnitCount` (decimal(19,5), NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)
  - `PlannedServiceKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `PlannedServiceKey` → PersonCenteredPlanModule.PlannedService.PlannedServiceKey
  - `ServiceAuthorizationKey` → ServiceAuthorizationModule.ServiceAuthorization.ServiceAuthorizationKey
  - `ServiceDefinitionKey` → ServiceDefinitionModule.ServiceDefinition.ServiceDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ServiceLine_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ServiceLine_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ServiceLine_PlannedServiceKey` (PlannedServiceKey)
  - `IX_ServiceLine_ServiceAuthorizationKey` (ServiceAuthorizationKey)
  - `IX_ServiceLine_ServiceDefinitionKey` (ServiceDefinitionKey)

#### ServiceAuthorizationModule.ServiceUtilization
**Rows**: 0

**Columns:**
  - `ServiceUtilizationKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `PaidAmount` (decimal(19,5), NOT NULL)
  - `ServiceDateRangeEndDate` (date, NULL)
  - `ServiceDateRangeStartDate` (date, NULL)
  - `ServiceLineKey` (uniqueidentifier, NOT NULL)
  - `UnitCount` (decimal(19,5), NULL)
  - `UnitTypeCodeSystemIdentifier` (bigint, NULL)
  - `UnitTypeDisplayName` (nvarchar(8000), NULL)
  - `UnitTypeIdentifier` (bigint, NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ServiceLineKey` → ServiceAuthorizationModule.ServiceLine.ServiceLineKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_ServiceUtilization_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_ServiceUtilization_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_ServiceUtilization_ServiceLineKey` (ServiceLineKey)

#### ServiceAuthorizationModule.SupportedService
**Rows**: 1,289,019

**Columns:**
  - `SupportedServiceKey` (uniqueidentifier, NOT NULL) [PK]
  - `Version` (int, NOT NULL)
  - `ServiceDefinitionKey` (uniqueidentifier, NOT NULL)
  - `ServiceAuthorizationKey` (uniqueidentifier, NOT NULL)
  - `EntityCreatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityCreatedTimestamp` (datetime2, NOT NULL)
  - `EntityCreatedUserContextKey` (uniqueidentifier, NULL)
  - `EntityUpdatedAccountIdentifier` (nvarchar(508), NOT NULL)
  - `EntityUpdatedTimestamp` (datetime2, NOT NULL)
  - `EntityUpdatedUserContextKey` (uniqueidentifier, NULL)

**Foreign Keys:**
  - `ServiceAuthorizationKey` → ServiceAuthorizationModule.ServiceAuthorization.ServiceAuthorizationKey
  - `ServiceDefinitionKey` → ServiceDefinitionModule.ServiceDefinition.ServiceDefinitionKey
  - `EntityCreatedUserContextKey` → SecurityModule.UserContext.UserContextKey
  - `EntityUpdatedUserContextKey` → SecurityModule.UserContext.UserContextKey

**Indexes:**
  - `IX_SupportedService_EntityCreatedUserContextKey` (EntityCreatedUserContextKey)
  - `IX_SupportedService_EntityUpdatedUserContextKey` (EntityUpdatedUserContextKey)
  - `IX_SupportedService_ServiceAuthorizationKey` (ServiceAuthorizationKey)
  - `IX_SupportedService_ServiceDefinitionKey` (ServiceDefinitionKey)


---

## Other Schemas (Table List Only)

These schemas are part of the Carity application but are less directly involved in interface data processing.

### AacapModule
**Tables**: 2 | **Total Rows**: 0

- CalocusCasii
- Ecsii

### AnnouncementModule
**Tables**: 2 | **Total Rows**: 0

- Announcement
- AnnouncementSystemTypes

### ApplicationModule
**Tables**: 1 | **Total Rows**: 0

- ApplicationConfiguration

### AppointmentModule
**Tables**: 5 | **Total Rows**: 0

- Appointment
- AppointmentAttributes
- AppointmentRecurrence
- AppointmentRecurrenceDateNameEnums
- AppointmentRecurrenceRecurringExceptionItems

### AttachmentModule
**Tables**: 11 | **Total Rows**: 23

- AttachmentAccess (23 rows)
- AttachmentAccessFullAccessSystemRoles
- AttachmentAccessReadonlyAccessSystemRoles
- CaseAttachment
- GuardianshipAttachment
- LocationAttachment
- MessageAttachment
- OrganizationAttachment
- ProtectiveServicesReportAttachment
- StaffMemberAttachment
- SystemAttachment

### BehaviorManagementPlanModule
**Tables**: 5 | **Total Rows**: 0

- BehaviorIntervention
- BehaviorInterventionChallengingBehaviors
- BehaviorManagementPlan
- BehaviorManagementPlanNecessaryRightsModifications
- BehaviorManagementPlanQualifiedProfessionals

### BillOfRightsModule
**Tables**: 1 | **Total Rows**: 0

- BillOfRights

### BudgetManagementModule
**Tables**: 3 | **Total Rows**: 3,239,994

- BudgetEntry (3,034,514 rows)
- BudgetEntryServiceDefinitions
- BudgetLedger (205,480 rows)

### CaseActivityModule
**Tables**: 1 | **Total Rows**: 1,751,319

- CaseActivityInstance (1,751,319 rows)

### CaseModule
**Tables**: 2 | **Total Rows**: 45,368

- Case (45,368 rows)
- CaseLetterInstance

### CompletionModule
**Tables**: 2 | **Total Rows**: 2,129,181

- CompletionContext (1,653,343 rows)
- Requirement (475,838 rows)

### ContactModule
**Tables**: 3 | **Total Rows**: 0

- Contact
- ContactDevelopmentalDisabilityTypes
- ContactFollowUps

### ContractModule
**Tables**: 5 | **Total Rows**: 0

- AssociatedService
- Contract
- ContractLocations
- ServiceDefinitionReference
- ServiceDefinitionReferenceServiceRates

### CrisisBedIntakePacketModule
**Tables**: 2 | **Total Rows**: 0

- CrisisBedIntakePacket
- CrisisForm

### CrisisHomeIntakeModule
**Tables**: 15 | **Total Rows**: 0

- CrisisHomeIntake
- HealthInsuranceReference
- HealthInsuranceReferenceCoverages
- PersonHealthInformation
- PersonHealthInformationAllergies
- PersonHealthInformationDiagnoses
- PersonHealthInformationMedications
- PersonInformation
- PersonInformationEligibilities
- RelationshipsAndContacts
- RelationshipsAndContactsEmergencyContacts
- RelationshipsAndContactsGuardians
- RelationshipsAndContactsMedicalManagers
- RelationshipsAndContactsNoContactContacts
- RelationshipsAndContactsPersonalContacts

### CrisisHouseAgreementModule
**Tables**: 1 | **Total Rows**: 0

- CrisisHouseAgreement

### CrisisHousingAssessmentModule
**Tables**: 25 | **Total Rows**: 0

- BehaviorInformation
- BehaviorInformationDiagnoses
- BehaviorInformationReportableEventSummaries
- BehaviorInformationSafetyDevices
- CrisisHousingAssessment
- CrisisHousingAssessmentGuardianReferences
- CrisisHousingPersonAddressReference
- CrisisHousingPersonAddressReferenceAddressAttributes
- CrisisInformation
- CrisisInformationCurrentRiskBehaviors
- MedicalInformation
- MedicalInformationAllergies
- PersonServiceInformation
- PersonServiceInformationCurrentServicesReceiving
- PersonServiceInformationEligibleExternalServices
- PersonServiceInformationEligibleServices
- PersonServiceInformationOtherServicesReceiving
- Recommendation
- RecommendationCrisisServices
- RecommendationLevelOfServices
- RecommendationMedicalServices
- RecommendationOtherServices
- RecommendationPlacements
- RecommendationPlans
- RecommendationPrograms

### CrisisIntakeModule
**Tables**: 2 | **Total Rows**: 0

- CrisisIntake
- CrisisIntakeEligibilities

### CrisisPreventionPlanModule
**Tables**: 11 | **Total Rows**: 0

- CrisisPreventionPersonAddressReference
- CrisisPreventionPersonAddressReferenceAddressAttributes
- CrisisPreventionPlan
- CrisisPreventionPlanDiagnoses
- CrisisPreventionPlanPersonHistoryReferences
- CrisisPreventionPlanReportableEventSummaries
- StageOfBehavior
- StageOfBehaviorExcludedParties
- StageOfBehaviorInvolvedParties
- SupportInformation
- SupportInformationGuardians

### CrisisTemporaryHousingModule
**Tables**: 6 | **Total Rows**: 0

- CrisisTemporaryHousing
- FollowUpDetails
- FollowUpDetailsContacts
- FollowUpDetailsContactTypes
- PersonAddressReference
- PersonAddressReferenceAttributes

### CustomMetadataModule
**Tables**: 3 | **Total Rows**: 0

- CustomMetadata
- CustomPropertyMetadata
- CustomPropertyMetadataItems

### CustomerHcbsSettingsRuleModificationModule
**Tables**: 2 | **Total Rows**: 0

- HcbsSettingsRuleModification
- InstructionsAndDemographics

### CustomerNoticeOfActionAndAppealModule
**Tables**: 9 | **Total Rows**: 0

- AppealSection
- AppealSectionPreHearingInvestigations
- HearingSection
- HearingSectionStaffNotifiedOfHearingDate
- NoticeOfActionAndAppeal
- NoticeOfActionSection
- NoticeOfActionSectionReasonsForNoticeOfActions
- OverviewSection
- OverviewSectionProcessedStages

### CustomerRiskAgreementModule
**Tables**: 2 | **Total Rows**: 0

- OverviewAndDemographics
- RiskAgreement

### DatabaseAdministrationModule
**Tables**: 1 | **Total Rows**: 42

- UpgradeMigrationExecutionHistory (42 rows)

### DeathAndMortalityModule
**Tables**: 1 | **Total Rows**: 0

- DeathAndMortality

### DomainHistoryModule
**Tables**: 2 | **Total Rows**: 117

- DomainHistoryEvent (45 rows)
- DomainHistoryEventContextObjects (72 rows)

### EmergencyDispositionModule
**Tables**: 6 | **Total Rows**: 0

- EmergencyDisposition
- EmergencyDispositionFollowUp
- EmergencyDispositionFollowUpContacts
- EmergencyDispositionFollowUpContactTypes
- ERInformation
- ERInformationStayInformationConcernTypes

### FileModule
**Tables**: 1 | **Total Rows**: 8

- File (8 rows)

### FormModule
**Tables**: 2 | **Total Rows**: 11

- FormCategoryMapping (3 rows)
- FormCategoryMappingTypes (8 rows)

### FreedomOfChoiceModule
**Tables**: 1 | **Total Rows**: 0

- FreedomOfChoice

### GovernanceModule
**Tables**: 7 | **Total Rows**: 2,620

- ConceptDomain (729 rows)
- GovernanceBody (1 rows)
- GovernanceBodyCodeSystems (5 rows)
- GovernanceBodyMember (1 rows)
- GovernanceBodyMemberGrantedRoles (1,883 rows)
- GovernanceBodySystems
- System (1 rows)

### GrievanceAppealModule
**Tables**: 8 | **Total Rows**: 0

- Appellant
- AppellantRepresentativeTypes
- GrievanceAppeal
- GrievanceAppealRepresentatives
- HearingInformation
- HearingInformationHearings
- Witness
- WitnessRepresentativeTypes

### GuardianshipModule
**Tables**: 15 | **Total Rows**: 0

- ConservatorshipGuardianshipPlan
- ConservatorshipGuardianshipPlanDescriptionItems
- Guardianship
- GuardianshipAppointment
- GuardianshipAppointmentLimitedToList
- GuardianshipAssessment
- GuardianshipAssessmentBehavioralFunctioningTypes
- GuardianshipAssessmentImpairmentTypes
- GuardianshipAsset
- GuardianshipBudget
- GuardianshipPetition
- GuardianshipPetitionHearings
- GuardianshipPetitionLimitedToList
- GuardianshipPlan
- GuardianshipPlanCategories

### IncidentManagementModule
**Tables**: 13 | **Total Rows**: 0

- IncidentEvent
- IncidentEventIncidentReports
- IncidentReport
- IncidentReportAssignments
- IncidentReportImmediateActions
- IncidentReportMitigationPreventativeActions
- IncidentReportNotes
- IncidentReportNotifiedEntities
- IncidentTypeFormReference
- InvolvedIndividual
- InvolvedIndividualRepresentativeTypes
- Resolution
- SelfReportedIncident

### IndividualSupportTeamModule
**Tables**: 13 | **Total Rows**: 0

- IndividualSupportTeam
- IndividualSupportTeamAgenciesProvidingServices
- IndividualSupportTeamFollowUp
- IndividualSupportTeamFollowUpContactTypes
- IndividualSupportTeamFollowUpDates
- IndividualSupportTeamFollowUpWhoDidYouContact
- IndividualSupportTeamMember
- IndividualSupportTeamMemberParticipant
- IndividualSupportTeamMemberParticipantRoles
- IndividualSupportTeamMemberRoles
- IndividualSupportTeamPlansToImplement
- SupportTeamPersonAddressReference
- SupportTeamPersonAddressReferenceAddressAttributes

### IntakeReferralModule
**Tables**: 1 | **Total Rows**: 0

- IntakeReferral

### InterRaiScreeningModule
**Tables**: 5 | **Total Rows**: 0

- InterRaiScreening
- Pasrr
- PasrrFacilities
- Result
- ResultEligiblePrograms

### IssueTrackerModule
**Tables**: 3 | **Total Rows**: 0

- CorrectiveActionPlan
- CorrectiveActionPlanActionSteps
- IssueTracker

### LetterModule
**Tables**: 8 | **Total Rows**: 23

- LetterDefinition (12 rows)
- LetterDefinitionFullAccessSystemRoles
- LetterDefinitionPrograms (11 rows)
- LetterDefinitionReadOnlyAccessSystemRoles
- LetterInstance
- LetterInstanceBase
- LetterInstanceFullAccessSystemRoles
- LetterInstanceReadOnlyAccessSystemRoles

### MessageModule
**Tables**: 5 | **Total Rows**: 0

- Message
- MessageAccount
- MessageFolder
- MessageFolderMember
- MessageRecipients

### NoteModule
**Tables**: 33 | **Total Rows**: 26,264,956

- CaseNote (13,132,478 rows)
- CaseNoteComments
- CrisisContactNote
- CrisisContactNoteAdditionalCrisisServices
- CrisisContactNoteEnhancedLevelOfServices
- CrisisContactNoteOtherServices
- CrisisContactNotePlacements
- CrisisContactNotePlansAndMeetings
- CrisisContactNoteProvidedCrisisServices
- CrisisContactNoteVisitsAndFollowUps
- CrisisContactNoteWaiverServices
- CrisisResidentialNote
- CrisisResidentialNoteSleepPatterns
- GeneralNote
- GeneralNoteActivityTypes
- GeneralNoteExplorationAndDiscovery
- GeneralNoteExplorationAndDiscoveryExplorationSources
- GeneralNoteExplorationAndDiscoveryExplorationTypes
- GuardianshipNote
- GuardianshipNoteActivityTypes
- LocationNote
- OrganizationNote
- ProtectiveServicesReportNote
- ProviderExplorationAndDiscoveryNote
- ProviderExplorationAndDiscoveryNoteActivityTypes
- ProviderNoteExplorationAndDiscovery
- ProviderNoteExplorationAndDiscoveryExplorationSources
- ProviderNoteExplorationAndDiscoveryExplorationTypes
- SafetyAssessment (13,132,478 rows)
- SafetyAssessmentObservedSafetyFactors
- SafetyAssessmentObservedVulnerabilityFactors
- ScratchPadNote
- StaffMemberNote

### NotificationModule
**Tables**: 22 | **Total Rows**: 31,488

- CaseNotificationDefinition (72 rows)
- CaseNotificationDefinitionRecipients (962 rows)
- CaseNotificationInstance (9,770 rows)
- LocationNotificationDefinition
- LocationNotificationDefinitionRecipients
- LocationNotificationInstance
- NotificationDefinitionBase (73 rows)
- NotificationDelivery (10,704 rows)
- NotificationInstanceBase (9,806 rows)
- NotificationTriggerDefinition (64 rows)
- OrganizationNotificationDefinition
- OrganizationNotificationDefinitionRecipients
- OrganizationNotificationInstance
- ProtectiveServicesReportNotificationDefinition
- ProtectiveServicesReportNotificationDefinitionRecipients
- ProtectiveServicesReportNotificationInstance
- StaffMemberNotificationDefinition (1 rows)
- StaffMemberNotificationDefinitionRecipients
- StaffMemberNotificationInstance (36 rows)
- SystemNotificationDefinition
- SystemNotificationDefinitionRecipients
- SystemNotificationInstance

### OfflineModule
**Tables**: 1 | **Total Rows**: 0

- OfflineAggregate

### PersonCenteredPlanModule
**Tables**: 69 | **Total Rows**: 32,058,828

- AboutMeDescription (202,587 rows)
- AboutMeDescriptionDescriptionItems (202,587 rows)
- AdditionalQuestion
- AdditionalQuestionAnswerTypes
- AdditionalQuestionDateList
- AdditionalQuestionDescriptionList
- Barrier
- BarrierDomain
- BarrierGoal
- BarrierNeed
- Domain
- DomainNeed
- FollowingUpAppointment
- Goal (2,317,454 rows)
- GoalConsiderations
- GoalDomain
- GoalNaturalSupports
- GoalService (16,976,448 rows)
- ImportantFactor
- ImportantFactorGoal
- Intervention (2,452,776 rows)
- InterventionGoal (8,400,664 rows)
- Meeting (207,959 rows)
- MeetingAttendee
- MeetingPreference
- MeetingPreferenceWhatSpecificHelpDidIAskFor
- Milestone
- MilestoneGoal
- MilestoneService
- MonitoringQuestion
- MyLifeTodayDescription
- MyLifeTodayDescriptionRoutines
- MyPlanToAddressSafetyNeeds
- MyPlanToAddressSafetyNeedsNeedsIWillAddress
- MyPlanToAddressSafetyNeedsServicesOffered
- Need
- NeedGoal
- NeedUnmetNeedCategories
- PersonCenteredPlan (207,959 rows)
- PersonCenteredPlanAboutMeDescriptions
- PersonCenteredPlanAdditionalSimpleQuestionItems
- PersonCenteredPlanChangeReasons
- PersonCenteredPlanConfiguration (2 rows)
- PersonCenteredPlanMedicationReviews
- PersonCenteredPlanMonitoring
- PersonCenteredPlanMonitoringGoalReferences
- PersonCenteredPlanMonitoringReviewedServices
- PersonCenteredPlanOtherAgendaItems
- PersonCenteredPlanProviders
- PlannedService (1,090,392 rows)
- PlannedServiceAttributes
- PlannedServiceNeedTypes
- PlannedServiceOtherProviders
- PlannedServiceProviderInvitations
- PlannedServiceScopes
- PlannedServiceSupportsProvided
- QuestionGroup
- Review
- ReviewConcludedResultTypes
- ReviewRequiredFollowUps
- Risk
- RiskGoal
- Strength
- StrengthGoal
- StrengthNeed
- SupportTeamMember
- SupportTeamMemberRepresentativeTypes
- Survey
- SurveySurveyItems

### PersonHistoryModule
**Tables**: 1 | **Total Rows**: 0

- PersonHistory

### PersonMaintenanceModule
**Tables**: 2 | **Total Rows**: 0

- Operation
- PersonMaintenance

### PostCrisisReviewModule
**Tables**: 12 | **Total Rows**: 0

- PostCrisisReview
- PostCrisisReviewFollowUp
- PostCrisisReviewFollowUpContacts
- PostCrisisReviewFollowUpContactTypes
- ReviewRecommendation
- ReviewRecommendationCrisisServices
- ReviewRecommendationEnhancedServices
- ReviewRecommendationFollowUps
- ReviewRecommendationOtherServices
- ReviewRecommendationPlacements
- ReviewRecommendationPlans
- ReviewRecommendationWaiverServices

### ProfilePictureModule
**Tables**: 1 | **Total Rows**: 0

- ProfilePicture

### ProgramApplicationModule
**Tables**: 6 | **Total Rows**: 0

- ApplicationForm
- ApplicationTypeConfiguration
- ApplicationTypeConfigurationRequiredCaseAttachmentCategories
- ApplicationTypeConfigurationRequiredFormTypes
- ProgramApplication
- ProgramApplicationConfiguration

### ProgramDischargeModule
**Tables**: 3 | **Total Rows**: 0

- ProgramDischarge
- ProgramDischargeEligibilities
- ProgramDischargeProgramEligibilities

### ProgramModule
**Tables**: 17 | **Total Rows**: 53

- GenericPropertyConfiguration (11 rows)
- GenericPropertyConfigurationRules (23 rows)
- Program (3 rows)
- ProgramCharacteristic
- ProgramCharacteristicTypes
- ProgramConfiguration (10 rows)
- ProgramConfigurationUserInterfaceConfigurations
- ProgramEligibilityTypes
- ProgramEnrollmentConfiguration (2 rows)
- ProgramEnrollmentConfigurationRequiredFinancialEligibilityTypes
- ProgramEnrollmentConfigurationRequiredLivingArrangementTypes
- ProgramEnrollmentConfigurationRequiredPersonLocationAssignmentTypes (4 rows)
- ProgramFinancialEligibility
- ProgramFinancialEligibilityTypes
- ProgramFundingSources
- ProgramProgramEligibilityTypes
- ProgramSupportedEligibilityTypes

### ProtectiveServicesModule
**Tables**: 49 | **Total Rows**: 0

- Allegation
- AllegationAllegationTypes
- AllegationCategory
- AllegationContext
- AllegationContextDependencies
- AllegationContextDiagnoses
- AllegationPerpetrator
- AllegationPersonDependencies
- AllegationPersonMentalFunctions
- CourtWork
- CriticalAlert
- Eligibility
- EligibilityReasons
- ExtensionRequest
- GuardianshipConservatorshipPlan
- GuardianshipConservatorshipPlanDescriptionItems
- Investigation
- InvestigationCaseFacts
- Perpetrator
- PerpetratorAddress
- PerpetratorEmails
- PerpetratorPhones
- ProtectiveServicesDecision
- ProtectiveServicesDecisionResponsePriorityCriteria
- ProtectiveServicesReport
- ProtectiveServicesReportAlert
- ProtectiveServicesReportAllegedVictims
- ProtectiveServicesReportAppointment
- ProtectiveServicesReportAppointmentLimitedToList
- ProtectiveServicesReportAsset
- ProtectiveServicesReportLink
- ProtectiveServicesReportPetition
- ProtectiveServicesReportPetitionHearings
- ProtectiveServicesReportPetitionLimitedToList
- ProviderReferral
- ProviderReferralServicesRequested
- Reporter
- ReporterAddress
- ReporterEmails
- ReporterPhones
- ReportStaffMemberAssignment
- SafetyAssessment
- SafetyAssessmentFactorsAffectingSafeties
- SafetyAssessmentFactorsAffectingVulnerabilities
- SafetyInterventionPlan
- SafetyInterventionPlanCaregiverNames
- SafetyMitigationItem
- SafetyMitigationItemAssignedParties
- SafetyMitigationItemInterventions

### RateModule
**Tables**: 17 | **Total Rows**: 647

- AssessedNeedsServiceRateSetting
- AssessedNeedsServiceRateSettingActivityTypes
- AssessedNeedsServiceRateSettingInstance
- AssessedNeedsServiceRateSettingInstanceActivities
- DisabilityWaiverRateSetting
- DisabilityWaiverRateSettingInstance
- DisabilityWaiverRateSettingInstanceParameters
- DisabilityWaiverRateSettingParameters
- ServiceRate (324 rows)
- ServiceRateLocationRates
- ServiceRateRegionRates
- ServiceScheduleRateSetting
- ServiceScheduleRateSettingInstance
- SupportedLivingServiceRateInstance
- SupportedLivingServiceRateSetting
- UserCapturedRateSetting (323 rows)
- UserCapturedRateSettingInstance

### RegionModule
**Tables**: 4 | **Total Rows**: 0

- City
- CityPostalCodes
- Region
- RegionCounties

### ReportModule
**Tables**: 10 | **Total Rows**: 257

- DataSet (23 rows)
- DataSetChildDataSets (43 rows)
- ReportMenuItem (33 rows)
- ReportMenuItemFullAccessSystemRoles
- ReportMenuItemPrograms
- ReportMenuItemReadOnlyAccessSystemRoles (158 rows)
- Subscription
- SubscriptionReportParameters
- SubscriptionSubscribers
- SubscriptionWeekDayNames

### ReportableEventModule
**Tables**: 43 | **Total Rows**: 0

- AneEventCategory
- AneEventCategoryAneTypes
- DangerousSituationEventCategory
- DeathEventCategory
- EmergencyDepartmentVisitEventCategory
- EmergencyRestraintEventCategory
- EmergencyRestraintEventCategoryRestraintTimes
- EventCategoryForm
- EventCategoryFormEventCategoryTypes
- HospitalAdmissionEventCategory
- LawEnforcementInterventionEventCategory
- MedicationErrorEventCategory
- MedicationErrorEventCategoryResults
- MissingPersonEventCategory
- OtherIncidentEventCategory
- PhysicalAssaultEventCategory
- PhysicalAssaultEventCategoryIndividuals
- PhysicalDisplacementEventCategory
- PhysicalDisplacementEventCategoryActions
- PhysicalDisplacementEventCategoryCauses
- ReportableEvent
- ReportableEventAllegedPerpetrators
- ReportableEventEligibilities
- ReportableEventEmergencyServicesInvolved
- ReportableEventFollowUp
- ReportableEventFollowUpRemediationActionSteps
- ReportableEventFollowUpThingsDoneToAddressAne
- ReportableEventFollowUpThingsDoneToAddressCriticalIncidentUnrelatedToAne
- ReportableEventReporter
- ReportableEventReporterRepresentativeTypes
- ReportableEventReviewCompletedStep
- ReportableEventWhoReportedToCertifyingLicensingAgency
- ReportableEventWitness
- ReportableEventWitnessRepresentativeTypes
- RightsViolationEventCategory
- SeclusionEventCategory
- SeriousInjuryEventCategory
- SeriousInjuryEventCategoryLocationsTreatmentReceived
- SeriousInjuryEventCategoryTypes
- SuicideAttemptEventCategory
- SuicideThreatEventCategory
- SuicideThreatEventCategoryTypes
- TransportationAccidentEventCategory

### ResponseMessageModule
**Tables**: 1 | **Total Rows**: 23

- ResponseMessage (23 rows)

### SafetyDevicePacketModule
**Tables**: 1 | **Total Rows**: 0

- SafetyDevicePacket

### SecurityModule
**Tables**: 14 | **Total Rows**: 60,514

- OrganizationAccess (4 rows)
- OrganizationAccessGrantedRoles
- PersonAccess
- PersonAccessGrantedRoles
- SystemAccount (13 rows)
- SystemAccountGrantedRoles (11 rows)
- SystemPermission (1,655 rows)
- SystemRole (1,883 rows)
- SystemRoleCache (85 rows)
- SystemRoleGrantedRoles (4,652 rows)
- SystemRolePermissions (1,654 rows)
- SystemRoleWarnings
- UserContext (50,554 rows)
- UserPreference (3 rows)

### ServiceDefinitionModule
**Tables**: 15 | **Total Rows**: 4,610

- DemographicRestrictions
- DemographicRestrictionsGenders
- ServiceDefinition (323 rows)
- ServiceDefinitionLocationType (323 rows)
- ServiceDefinitionLocationTypeSpecialtyCodes (1,857 rows)
- ServiceDefinitionLocationTypeSubTypes (1,136 rows)
- ServiceDefinitionOtherCodes (323 rows)
- ServiceDefinitionServiceAttributes (536 rows)
- ServiceDefinitionServiceFrequencies
- ServiceDefinitionServiceLimits
- ServiceDefinitionServiceLocations
- ServiceDefinitionSupportedPrograms
- ServiceLimit (56 rows)
- ServiceLimitScopes
- ServiceLimitServiceDefinitions (56 rows)

### ServiceEventModule
**Tables**: 2 | **Total Rows**: 0

- OtherProviderInformation
- ServiceEvent

### ServiceImplementationPlanModule
**Tables**: 6 | **Total Rows**: 0

- GoalProgress
- GoalProgressImplementationStrategies
- GoalProgressSupporters
- ServiceImplementationPlan
- ServiceImplementationPlanDetail
- ServiceImplementationPlanDetailScopes

### SignatureModule
**Tables**: 2 | **Total Rows**: 416,722

- Signature (208,361 rows)
- SignatureContext (208,361 rows)

### TaskModule
**Tables**: 2 | **Total Rows**: 31,647

- Task (31,613 rows)
- TaskQueue (34 rows)

### VocabularyModule
**Tables**: 19 | **Total Rows**: 924,245

- CodeSystem (5 rows)
- CodeSystemMap
- CodeSystemMapping
- CodeSystemVersion (5 rows)
- Concept (140,966 rows)
- ConceptVersion (140,966 rows)
- ConceptVersionComments
- ConceptVersionProperties (671 rows)
- JurisdictionalDomain (2 rows)
- JurisdictionalDomainMapBindings
- Relationship (185,434 rows)
- Term (141,692 rows)
- ValueSet (793 rows)
- ValueSetConceptDomainBindings (793 rows)
- ValueSetMember (140,882 rows)
- ValueSetMemberProperties (2,806 rows)
- ValueSetMemberTerms (144,890 rows)
- ValueSetRule (5,026 rows)
- ValueSetRuleProperties (19,314 rows)

### WaitlistModule
**Tables**: 5 | **Total Rows**: 0

- Offer
- OfferGroup
- WaitlistItem
- WaitlistItemLetter
- WaitlistRankingQueueItem

### WorkTeamModule
**Tables**: 2 | **Total Rows**: 2,017

- WorkTeam (34 rows)
- WorkTeamMember (1,983 rows)

### WorkflowModule
**Tables**: 2 | **Total Rows**: 12,342,482

- WorkflowInstance (3,563,238 rows)
- WorkflowInstanceHistoryEvent (8,779,244 rows)

### dbo
**Tables**: 1 | **Total Rows**: 26

- __RefactorLog (26 rows)

---

## Views

Key views relevant to interface processing:

### CustomerInterfaceModule Views

- `CustomerInterfaceModule.FeaOrganizationsView`
- `CustomerInterfaceModule.OutgoingFeaAndIrisAuthorizationsView`
- `CustomerInterfaceModule.OutgoingFeaAuthorizationView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityCustomFormReferralView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityPersonAddressView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityPersonContactView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityPersonLocationAssignmentView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityPersonStaffAssignmentView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityPersonView`
- `CustomerInterfaceModule.OutgoingFeaEligibilityProgramEnrollmentView`
- `CustomerInterfaceModule.OutgoingIrisAuthorizationView`

### InterfaceModule Views

- `InterfaceModule.IncomingPersonMedicaidNumbersView`
- `InterfaceModule.IncomingPersonView`

### PersonModule Views

- `PersonModule.PersonCurrentAddressView`
- `PersonModule.PersonLookupView`
- `PersonModule.PersonMedicaidNumbersView`

### OrganizationModule Views

- `OrganizationModule.StaffMemberLookupView`

### CommonModule Views

- `CommonModule.GenerateNEWIDView`

### WorkflowModule Views

- `WorkflowModule.WorkflowInstanceCurrentEventData`

### AnalysisModule Views (Reporting/Analytics)

- `AnalysisModule.DimAssesmentAndService`
- `AnalysisModule.DimCaseDiagnosis`
- `AnalysisModule.DimCaseHealthInsurance`
- `AnalysisModule.DimCasePersonLocationAssignment`
- `AnalysisModule.DimCasePersonStaffMemberAssignment`
- `AnalysisModule.DimContactContactFormDetails`
- `AnalysisModule.DimContactContactFormFollowUps`
- `AnalysisModule.DimContactContactFormPersonBeingReferred`
- `AnalysisModule.DimContactContactFormReferralSource`
- `AnalysisModule.DimCustomForm`
- `AnalysisModule.DimEligiCareIntakeAssessmentAnswers`
- `AnalysisModule.DimEligiCareIntakeAssessmentWorkflowSummary`
- `AnalysisModule.DimEligiCarePerson`
- `AnalysisModule.DimEligiCareProviderOrgnization`
- `AnalysisModule.DimFindingsTrackerCorrectiveActionPlan`
- `AnalysisModule.DimFindingsTrackerFindingDetails`
- `AnalysisModule.DimFindingsTrackerOverview`
- `AnalysisModule.DimFindingsTrackerProviderOrganizationInformation`
- `AnalysisModule.DimFindingsTrackerResolutionDetails`
- `AnalysisModule.DimIntakeIntakeAssessmentQuestionsAndAnswers`
- `AnalysisModule.DimIntakeIntakeAssessmentRecordInformation`
- `AnalysisModule.DimLocation`
- `AnalysisModule.DimLocationType`
- `AnalysisModule.DimMedicaidInfo`
- `AnalysisModule.DimNotificationsIndividuals`
- `AnalysisModule.DimOrganizationSecurity`
- `AnalysisModule.DimPerson`
- `AnalysisModule.DimPersonAddress`
- `AnalysisModule.DimPersonAssigment`
- `AnalysisModule.DimPersonContact`
- `AnalysisModule.DimPersonEmailAddress`
- `AnalysisModule.DimPersonEthnicity`
- `AnalysisModule.DimPersonIdentifier`
- `AnalysisModule.DimPersonLanguage`
- `AnalysisModule.DimPersonPhone`
- `AnalysisModule.DimPersonRace`
- `AnalysisModule.DimPersonReviewSecurity`
- `AnalysisModule.DimPersonSecurity`
- `AnalysisModule.DimPersonWaitlistEnrollment`
- `AnalysisModule.DimPersonWarning`
- `AnalysisModule.DimProgramCharacterstics`
- `AnalysisModule.DimProgramDefinition`
- `AnalysisModule.DimProgramDischarge`
- `AnalysisModule.DimProgramFunding`
- `AnalysisModule.DimProvider`
- `AnalysisModule.DimProviderReviewFormAnswers`
- `AnalysisModule.DimProviderReviewOrgnization`
- `AnalysisModule.DimProviderReviewWorkflowSummary`
- `AnalysisModule.DimProviderType`
- `AnalysisModule.DimReport`
- `AnalysisModule.DimRole`
- `AnalysisModule.DimSupportPlan`
- `AnalysisModule.DimSupportedEligibility`
- `AnalysisModule.DimUserAccessingAndSystemUse`
- `AnalysisModule.DimWaitlistRecordStatus`
- `AnalysisModule.DimWaiver`
- `AnalysisModule.FactApplicationToService`
- `AnalysisModule.FactContactContactForm`
- `AnalysisModule.FactEligiCareContactForm`
- `AnalysisModule.FactEligiCareHousemateCompatibility`
- `AnalysisModule.FactEligiCareISPServicesProvided`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_Barrier`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_CaseActivity`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_Goal`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_LegalCourtAssignedRep`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_LegalRep`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_Need`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_Service`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_ServiceScheduleRate`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_Strength`
- `AnalysisModule.FactEligiCareIndividualSupportPlan_Support`
- `AnalysisModule.FactEligiCareIntakeAssessment`
- `AnalysisModule.FactEligiCareLegacyAssessmentResult`
- `AnalysisModule.FactEligiCareServiceEvents`
- `AnalysisModule.FactEligiCareServicePacket`
- `AnalysisModule.FactEligiCareServicePacketTimeliness`
- `AnalysisModule.FactFindingsTracker`
- `AnalysisModule.FactFirstAssessmentAndServiceEvent`
- `AnalysisModule.FactIntakeIntakeAssessment`
- `AnalysisModule.FactNotificationsMeasures`
- `AnalysisModule.FactPerson`
- `AnalysisModule.FactPersonReviewForms`
- `AnalysisModule.FactPortalUtilization`
- `AnalysisModule.FactPortalUtilizationMeasure`
- `AnalysisModule.FactProviderReviewForms`
- `AnalysisModule.FactWaiverQuarterly`
