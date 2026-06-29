---
inclusion: manual
---

# WiDHS.QcPhi.Interface.Carity Database Schema Reference

## Overview

This document describes the schema of the **WiDHS.QcPhi.Interface.Carity** database - the interface/staging database that receives data from external systems (Wisconsin DHS, FEA fiscal agents, IRIS) before processing into the Carity production database. It serves as the ingestion layer for all inbound and outbound data exchanges.

### Interface Patterns

| Prefix/Pattern | Purpose |
|---|---|
| `Incoming*` | Staging tables for inbound data from external systems |
| `Outgoing*` | Staging tables for outbound data to external systems |
| `*Raw` | Raw file content before parsing (linked to InterfaceBatchFiles) |
| `*Lookup` | Cross-reference/mapping tables between external IDs and Carity keys |
| `MedicaidProvider*` | Parsed provider data from D06 PSV file (ICD-D06) |
| `InterfaceBatch*` | Batch processing metadata and file tracking |
| `Process*` | Execution logging and orchestration |
| `Vocabulary*` | Code/value translation between systems |

### Column Conventions

- `*Key` (uniqueidentifier) - Primary/foreign key GUIDs
- `LastSynchronizationTimestamp` / `LastSynchronizedTimestamp` - When the row was last synced to Carity
- `IsReadyToProcess` (bit) - Flag indicating record is validated and ready for processing
- `HasErrors` (bit) - Flag indicating validation errors exist
- `HasConflict` (bit) - Flag indicating data conflict with existing Carity record
- `Version` (int) - Optimistic concurrency version number
- `EntityCreated*` / `EntityUpdated*` - Audit trail columns

---

## Schema: `CustomerInterfaceModule`

### AuthorizationUtilization

**Row Count:** 0 (empty)

**Columns:**

- `AuthorizationUtilizationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PayerIdentifier` (nvarchar, 16, Nullable)
- `ClaimNumber` (nvarchar, 40, Nullable)
- `PatientControlNumber` (nvarchar, 76, Nullable)
- `ClaimLineNumber` (int, 4, Nullable)
- `AuthorizationNumber` (nvarchar, 60, NOT NULL)
- `MemberId` (nvarchar, 20, Nullable)
- `BillingProviderId` (nvarchar, 20, Nullable)
- `RenderingProviderId` (nvarchar, 20, Nullable)
- `ProcedureCode` (nvarchar, 14, Nullable)
- `Modifier1` (nvarchar, 4, Nullable)
- `Modifier2` (nvarchar, 4, Nullable)
- `Modifier3` (nvarchar, 4, Nullable)
- `Modifier4` (nvarchar, 4, Nullable)
- `RevenueCode` (nvarchar, 8, Nullable)
- `DateOfServiceFrom` (date, 3, Nullable)
- `DateOfServiceTo` (date, 3, Nullable)
- `AdjudicationDate` (date, 3, Nullable)
- `UnitsBilled` (decimal, 9, Nullable)
- `UnitsPaid` (decimal, 9, Nullable)
- `AmountBilled` (decimal, 9, Nullable)
- `AmountPaid` (decimal, 9, Nullable)
- `FeaDatePaid` (date, 3, Nullable)
- `AdjustmentIndicator` (char, 1, Nullable)
- `OriginalClaimNumber` (nvarchar, 40, Nullable)
- `ServiceLineKey` (uniqueidentifier, 16, Nullable)
- `UnitsToApply` (decimal, 9, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HasErrors` (bit, 1, NOT NULL)
- `LastSynchronizationTimestamp` (datetimeoffset, 10, NOT NULL)

**Indexes:**

- `IX_AuthorizationUtilization_ClaimNumber_ClaimLineNumber` (NONCLUSTERED): ClaimNumber, ClaimLineNumber

---

### AuthorizationUtilizationRaw

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchFilesKey` (uniqueidentifier, 16, NOT NULL)
- `RawText` (nvarchar, MAX, Nullable)

**Foreign Keys:**

- `InterfaceBatchFilesKey` -> `[InterfaceModule].[InterfaceBatchFiles].[InterfaceBatchFilesKey]`

**Indexes:**

- `IX_AuthorizationUtilizationRaw_InterfaceBatchFilesKey` (NONCLUSTERED): InterfaceBatchFilesKey

---

### FeaDetails

**Row Count:** 0 (empty)

**Columns:**

- `FeaDetailsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `BillingProviderId` (nvarchar, 100, NOT NULL)
- `PayerId` (nvarchar, 200, NOT NULL)

**Indexes:**

- `UQ_FeaDetails_FeaName` (UNIQUE NONCLUSTERED): BillingProviderId

---

### IncomingLocationExtension

**Row Count:** 368,979 rows

**Columns:**

- `IncomingLocationExtensionKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `LocationExtensionKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `HasConflict` (bit, 1, Nullable)
- `LastSynchronizedTimestamp` (datetime2, 8, Nullable)
- `SiTransactionKeyReference` (nvarchar, 100, Nullable)
- `ResponseStatusCode` (nvarchar, 20, Nullable)
- `ResponseSenderAgencyName` (nvarchar, 20, Nullable)
- `TransactionId` (nvarchar, 100, Nullable)
- `HasWarnings` (bit, 1, Nullable)
- `LastProviderChangeTypeCode` (nvarchar, 100, Nullable)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationExtension_LocationKey` (NONCLUSTERED): LocationKey
- `IX_IncomingLocationExtension_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey

---

### IncomingLocationExtensionWaiverServices

**Row Count:** 517,830 rows

**Columns:**

- `IncomingLocationExtensionWaiverServicesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationExtensionKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `LocationExtensionKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `WaiverServiceCodeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `WaiverServiceCodeDisplayName` (nvarchar, 8000, NOT NULL)
- `WaiverServiceCodeIdentifier` (bigint, 8, NOT NULL)
- `IsActive` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationExtensionKey` -> `[CustomerInterfaceModule].[IncomingLocationExtension].[IncomingLocationExtensionKey]`

**Indexes:**

- `IX_IncomingLocationExtensionWaiverServices_IncomingLocationExtensionKey` (NONCLUSTERED): IncomingLocationExtensionKey

---

### IrisAuthorizationInboundResponse

**Row Count:** 0 (empty)

**Columns:**

- `IrisAuthorizationInboundResponseKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `ReportedDate` (date, 3, NOT NULL)
- `AuthorizationNumber` (nvarchar, 60, NOT NULL)
- `ErrorDescription` (nvarchar, MAX, Nullable)
- `ServiceLineKey` (uniqueidentifier, 16, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HasErrors` (bit, 1, NOT NULL)
- `InterfaceBatchKey` (uniqueidentifier, 16, NOT NULL)

**Indexes:**

- `IX_IrisAuthorizationInboundResponse_InterfaceBatchKey_AuthorizationNumber` (NONCLUSTERED): InterfaceBatchKey, AuthorizationNumber

---

### IrisCostShare

**Row Count:** 0 (empty)

**Columns:**

- `IrisCostShareKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `MemberId` (nvarchar, 24, NOT NULL)
- `CostShareKey` (uniqueidentifier, 16, Nullable)
- `Amount` (decimal, 9, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `ProgramKey` (uniqueidentifier, 16, Nullable)
- `YearMonthYearValue` (int, 4, NOT NULL)
- `YearMonthMonthValue` (int, 4, NOT NULL)
- `IsReadyToProcess` (bit, 1, Nullable)
- `HasErrors` (bit, 1, Nullable)

**Indexes:**

- `UQ_IrisCostShare` (UNIQUE NONCLUSTERED): MemberId, YearMonthYearValue, YearMonthMonthValue

---

### IrisCostShareRaw

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchFilesKey` (uniqueidentifier, 16, NOT NULL)
- `RawText` (nvarchar, MAX, Nullable)

**Foreign Keys:**

- `InterfaceBatchFilesKey` -> `[InterfaceModule].[InterfaceBatchFiles].[InterfaceBatchFilesKey]`

**Indexes:**

- `IX_IrisCostShareRaw_InterfaceBatchFilesKey` (NONCLUSTERED): InterfaceBatchFilesKey

---

### LongTermCareFunctionalScreenForm

**Row Count:** 0 (empty)

**Columns:**

- `LongTermCareFunctionalScreenFormKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `MemberId` (varchar, 10, NOT NULL)
- `FirstName` (varchar, 20, Nullable)
- `LastName` (varchar, 20, Nullable)
- `MiddleName` (varchar, 15, Nullable)
- `ApplicantPrefersToLiveCode` (varchar, 3, Nullable)
- `GuardianPreferenceForLivingCode` (varchar, 3, Nullable)
- `BathingHelpCode` (varchar, 3, Nullable)
- `BathingAdaptiveEquipmentCode` (varchar, 3, Nullable)
- `DressingHelpCode` (varchar, 3, Nullable)
- `EatingHelpCode` (varchar, 3, Nullable)
- `MobilityHelpCode` (varchar, 3, Nullable)
- `MobilityAdaptiveEquipmentCode` (varchar, 9, Nullable)
- `ToiletingHelpCode` (varchar, 3, Nullable)
- `ToiletingAdaptiveEquipmentCode` (varchar, 15, Nullable)
- `TransferringHelpCode` (varchar, 3, Nullable)
- `TransferringAdaptiveEquipmentCode` (varchar, 12, Nullable)
- `MealPreparationHelpLevelCode` (varchar, 3, Nullable)
- `MedicationManagementHelpLevelCode` (varchar, 3, Nullable)
- `MoneyManagementHelpLevelCode` (varchar, 3, Nullable)
- `LaundryChoresHelpLevelCode` (varchar, 3, Nullable)
- `TelephoneUseAbilityCode` (varchar, 3, Nullable)
- `TelephoneAccessCode` (varchar, 3, Nullable)
- `TransportationDrivingCode` (varchar, 3, Nullable)
- `OvernightCareSupervisionCode` (varchar, 3, Nullable)
- `EmploymentStatusCode` (varchar, 3, Nullable)
- `WorkshopEmploymentFlag` (char, 1, Nullable)
- `IndividualInterestInWorkingInCommunityCode` (char, 1, Nullable)
- `CommunityEmploymentFlag` (char, 1, Nullable)
- `VocationalEmploymentFlag` (char, 1, Nullable)
- `HomeEmploymentFlag` (char, 1, Nullable)
- `EmploymentAssistanceCode` (varchar, 3, Nullable)
- `BehaviorsRequiringInterventionsCode` (varchar, 3, Nullable)
- `ExercisesRangeOfMotionCode` (varchar, 3, Nullable)
- `MedicationsFluidFlushCode` (varchar, 3, Nullable)
- `MedicationAdministrationCode` (varchar, 3, Nullable)
- `PainMedicationManagementCode` (varchar, 3, Nullable)
- `OstomyCode` (varchar, 3, Nullable)
- `ChairBedPositioningCode` (varchar, 3, Nullable)
- `OxygenRespiratoryTreatmentCode` (varchar, 3, Nullable)
- `InHomeDialysisCode` (varchar, 3, Nullable)
- `TotalParenteralNutritionCode` (varchar, 3, Nullable)
- `TransfusionCode` (varchar, 3, Nullable)
- `TracheostomyCode` (varchar, 3, Nullable)
- `TubeFeedingCode` (varchar, 3, Nullable)
- `UlcerStageTwoCode` (varchar, 3, Nullable)
- `UlcerStageThreeFourCode` (varchar, 3, Nullable)
- `UrinaryCatheterCode` (varchar, 3, Nullable)
- `OtherWoundCareCode` (varchar, 3, Nullable)
- `VentilatorInterventionCode` (varchar, 3, Nullable)
- `NursingAssessmentCode` (varchar, 3, Nullable)
- `OtherServiceCode` (varchar, 3, Nullable)
- `OtherServiceText` (varchar, 75, Nullable)
- `SkilledTherapyCode` (varchar, 3, Nullable)
- `CommunicationCode` (varchar, 3, Nullable)
- `MemoryImpairmentFlag` (char, 1, Nullable)
- `ShortTermMemoryLossFlag` (char, 1, Nullable)
- `UnableToRememberFlag` (char, 1, Nullable)
- `LongTermMemoryLossFlag` (char, 1, Nullable)
- `UnableToDetermineText` (varchar, 75, Nullable)
- `DailyDecisionMakingCode` (varchar, 3, Nullable)
- `PhysicallyResistiveToCareCode` (varchar, 3, Nullable)
- `WanderingCode` (varchar, 3, Nullable)
- `SelfInjuriousBehaviorCode` (varchar, 3, Nullable)
- `OffensiveBehaviorToOthersCode` (varchar, 3, Nullable)
- `MentalHealthNeedCode` (varchar, 3, Nullable)
- `SubstanceAbuseFlag` (char, 1, Nullable)
- `SubstanceAbuseCurrentFlag` (char, 1, Nullable)
- `SubstanceAbusePastFlag` (char, 1, Nullable)
- `EligibilityCalculatedDate` (date, 3, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `CustomFormInstanceKey` (uniqueidentifier, 16, Nullable)
- `InterfaceBatchKey` (uniqueidentifier, 16, Nullable)
- `LastSynchronizationTimestamp` (datetimeoffset, 10, NOT NULL)

---

### LongTermCareFunctionalScreenFormRaw

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchKey` (uniqueidentifier, 16, Nullable)
- `RawText` (nvarchar, MAX, Nullable)

**Indexes:**

- `IX_LongTermCareFunctionalScreenFormRaw_InterfaceBatchKey` (CLUSTERED): InterfaceBatchKey

---

### MedicaidProviderAcaPaymentHold

**Row Count:** 37 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `AcaPaymentHoldEffectiveDate` (date, 3, Nullable)
- `AcaPaymentHoldEndDate` (date, 3, Nullable)
- `AcaPaymentHoldIndicator` (nchar, 2, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderAcaPaymentHold_MedicaidProviderNumber` (NONCLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderAddress

**Row Count:** 1,474,893 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `AddressTypeCode` (char, 1, Nullable)
- `NameTypeCode` (char, 1, Nullable)
- `NameAddressSpecific` (nvarchar, 100, Nullable)
- `StreetAddress1` (varchar, 30, Nullable)
- `StreetAddress2` (varchar, 30, Nullable)
- `City` (varchar, 30, Nullable)
- `State` (varchar, 2, Nullable)
- `ZipCode` (char, 5, Nullable)
- `ZipCodeExtension` (char, 4, Nullable)
- `PracticeLocationCountyCode` (varchar, 10, Nullable)
- `EmailAddress` (varchar, 256, Nullable)
- `PhoneNumberMemberUse` (varchar, 10, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderAddress_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderCertificationAndCredentials

**Row Count:** 61,446 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `CertificationNumber` (nvarchar, 30, Nullable)
- `CertificationEffectiveDate` (date, 3, Nullable)
- `CertificationEndDate` (date, 3, Nullable)
- `CertificationTypeCode` (nvarchar, 4, Nullable)
- `CertificationTypeDescription` (nvarchar, 100, Nullable)
- `SpecialProgramCertificationDescription` (nvarchar, 100, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderCertificationAndCredentials_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderContact

**Row Count:** 737,472 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `ContactPerson` (varchar, 50, Nullable)
- `PhoneNumberContactPerson` (varchar, 10, Nullable)
- `PhoneNumberExtensionContactPerson` (varchar, 4, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderContact_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderContract

**Row Count:** 1,967,776 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `ProviderContractCode` (varchar, 5, Nullable)
- `ContractEffectiveDate` (date, 3, Nullable)
- `ContractEndDate` (date, 3, Nullable)
- `ContractEnrollmentStatusCode` (char, 1, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderContract_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderCountyAndTribeServed

**Row Count:** 80,382 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `CountyCode` (nvarchar, 20, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderCountyAndTribeServed_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderLicense

**Row Count:** 115,467 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `LicenseNumber` (nvarchar, 20, Nullable)
- `LicenseEffectiveDate` (date, 3, Nullable)
- `LicenseEndDate` (date, 3, Nullable)
- `LicensureBoardCode` (nvarchar, 6, Nullable)
- `LicensureBoardDescription` (nvarchar, 100, Nullable)
- `LicenseClassificationDescription` (nvarchar, 100, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderLicense_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderMain

**Row Count:** 368,736 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL) **[PK]**
- `ProviderFullName` (nvarchar, 100, Nullable)
- `ProviderNameType` (nvarchar, 2, Nullable)
- `OrganizationTypeCode` (nvarchar, 2, Nullable)
- `OrganizationTypeDescription` (nvarchar, 50, Nullable)
- `BillingIndicator` (nvarchar, 2, Nullable)
- `RevalidationDate` (date, 3, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

---

### MedicaidProviderNpi

**Row Count:** 116,819 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `Npi` (char, 15, Nullable)
- `NpiEffectiveDate` (date, 3, Nullable)
- `NpiEndDate` (date, 3, Nullable)
- `NpiTypeDescription` (nvarchar, 100, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderNpi_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderRaw

**Row Count:** 60,455,685 rows

**Columns:**

- `RecordType` (char, 2, NOT NULL)
- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `Column3` (nvarchar, 8000, Nullable)
- `Column4` (nvarchar, 8000, Nullable)
- `Column5` (nvarchar, 8000, Nullable)
- `Column6` (nvarchar, 8000, Nullable)
- `Column7` (nvarchar, 8000, Nullable)
- `Column8` (nvarchar, 8000, Nullable)
- `Column9` (nvarchar, 8000, Nullable)
- `Column10` (nvarchar, 8000, Nullable)
- `Column11` (nvarchar, 8000, Nullable)
- `Column12` (nvarchar, 8000, Nullable)
- `Column13` (nvarchar, 8000, Nullable)
- `Column14` (nvarchar, 8000, Nullable)
- `Column15` (nvarchar, 8000, Nullable)
- `Column16` (nvarchar, 8000, Nullable)
- `Column17` (nvarchar, 8000, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `InterfaceBatchKey` (uniqueidentifier, 16, Nullable)

**Indexes:**

- `IX_MedicaidProviderRaw__RecordType_InterfaceBatchKey_MedicaidProviderNumber` (CLUSTERED): RecordType, InterfaceBatchKey, MedicaidProviderNumber

---

### MedicaidProviderTaxonomy

**Row Count:** 133,452 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `Taxonomy` (nvarchar, 20, Nullable)
- `TaxonomyEffectiveDate` (date, 3, Nullable)
- `TaxonomyEndDate` (date, 3, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderTaxonomy_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderTin

**Row Count:** 380,789 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `TaxIdNumber` (char, 9, Nullable)
- `TaxIdType` (char, 1, Nullable)
- `TinEffectiveDate` (date, 3, Nullable)
- `TinEndDate` (date, 3, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderTin_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderTypeAndSpecialty

**Row Count:** 371,520 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `ProviderType` (char, 2, Nullable)
- `ProviderTypeDescription` (nvarchar, 100, Nullable)
- `ProviderSpecialtyCode` (char, 3, Nullable)
- `ProviderSpecialtyDescription` (nvarchar, 100, Nullable)
- `ProviderTypeAndSpecialtyEffectiveDate` (date, 3, Nullable)
- `ProviderTypeAndSpecialtyEndDate` (date, 3, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderTypeAndSpecialty_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderWaiverProgram

**Row Count:** 62,092 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `WaiverProgramCode` (nvarchar, 10, Nullable)
- `WaiverProgramDescription` (nvarchar, 100, Nullable)
- `WaiverProgramEffectiveDate` (date, 3, Nullable)
- `WaiverProgramEndDate` (date, 3, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderWaiverProgram_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### MedicaidProviderWaiverService

**Row Count:** 516,230 rows

**Columns:**

- `MedicaidProviderNumber` (nvarchar, 30, NOT NULL)
- `WaiverServiceCode` (nvarchar, 12, Nullable)
- `WaiverServiceDescription` (nvarchar, 500, Nullable)
- `WaiverServiceEffectiveDate` (date, 3, Nullable)
- `WaiverServiceEndDate` (date, 3, Nullable)
- `WaiverServiceStatusCode` (char, 1, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)

**Indexes:**

- `IX_MedicaidProviderWaiverService_MedicaidProviderNumber` (CLUSTERED): MedicaidProviderNumber

---

### OutgoingFeaAuthorization

**Row Count:** 0 (empty)

**Columns:**

- `OutgoingFeaAuthorizationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `ServiceLineKey` (uniqueidentifier, 16, NOT NULL)
- `Fea` (nvarchar, 2040, Nullable)
- `FeaOrganizationKey` (uniqueidentifier, 16, Nullable)
- `ServiceAuthorizationProviderReferenceOrganizationKey` (uniqueidentifier, 16, Nullable)
- `ServiceAuthorizationProviderReferenceLocationKey` (uniqueidentifier, 16, Nullable)
- `ServiceAuthorizationProviderReferenceOrgType` (bigint, 8, Nullable)
- `IsPrimaryServicingProvider` (bit, 1, Nullable)
- `AuthorizationNumber` (nvarchar, 40, Nullable)
- `FundingSource` (nvarchar, 2040, Nullable)
- `Ica` (nvarchar, 2040, Nullable)
- `Mci` (nvarchar, 2040, Nullable)
- `ServiceCode` (nvarchar, 2040, Nullable)
- `Modifier1` (nvarchar, 16, Nullable)
- `Modifier2` (nvarchar, 16, Nullable)
- `Modifier3` (nvarchar, 16, Nullable)
- `SpcCode` (nvarchar, 2040, Nullable)
- `StartDate` (nvarchar, 20, Nullable)
- `EndDate` (nvarchar, 20, Nullable)
- `Frequency` (nvarchar, 2040, Nullable)
- `UnitsByFrequency` (bigint, 8, Nullable)
- `UnitType` (nvarchar, 2040, Nullable)
- `UnitRate` (decimal, 9, Nullable)
- `AuthorizationType` (nchar, 2, Nullable)
- `Phw` (nvarchar, 96, Nullable)
- `ProviderId` (nvarchar, 96, Nullable)
- `QualifierId` (nvarchar, 4, Nullable)
- `TotalDollarAmount` (decimal, 9, Nullable)
- `TotalUnits` (bigint, 8, Nullable)
- `Notes` (nvarchar, 8000, Nullable)
- `ServiceDescription` (nvarchar, 2040, Nullable)
- `Npi` (nvarchar, 2040, Nullable)
- `ProviderMedicaidId` (nvarchar, 96, Nullable)
- `CreatedDate` (datetime, 8, NOT NULL)
- `UpdatedDate` (datetime, 8, NOT NULL)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `DateLastSent` (datetime2, 8, Nullable)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `AK_OutgoingFeaAuthorization_ServiceLineKey_ServiceAuthorizationProviderReferenceLocationKey` (UNIQUE NONCLUSTERED): ServiceLineKey, ServiceAuthorizationProviderReferenceLocationKey

---

### OutgoingFeaEligibilityCustomFormReferral

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `ReferralDate` (datetime2, 8, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityCustomFormReferral_PersonKey` (NONCLUSTERED): PersonKey

---

### OutgoingFeaEligibilityPerson

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `FeaOrganizationKey` (uniqueidentifier, 16, Nullable)
- `MedicaidId` (nvarchar, 100, Nullable)
- `SocialSecurityNumber` (nvarchar, 100, Nullable)
- `FirstName` (nvarchar, 200, Nullable)
- `MiddleInitial` (char, 1, Nullable)
- `LastName` (nvarchar, 200, Nullable)
- `Phone` (nvarchar, 50, Nullable)
- `Email` (nvarchar, 510, Nullable)
- `CountyOfResponsibility` (nvarchar, 8000, Nullable)
- `Dob` (date, 3, Nullable)
- `Gender` (nvarchar, 8000, Nullable)
- `Race` (nvarchar, 8000, Nullable)
- `Ethnicity` (nvarchar, 8000, Nullable)
- `PrimaryLanguage` (nvarchar, 8000, Nullable)
- `CurrentLivingArrangement` (nvarchar, 8000, Nullable)
- `TargetGroup` (nvarchar, 200, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityPerson_PersonKey` (NONCLUSTERED): PersonKey, FeaOrganizationKey

---

### OutgoingFeaEligibilityPersonAddress

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `ResidentialAddress1` (nvarchar, 500, Nullable)
- `ResidentialAddress2` (nvarchar, 500, Nullable)
- `ResidentialCity` (nvarchar, 200, Nullable)
- `ResidentialState` (nvarchar, 8000, Nullable)
- `ResidentialZip` (nvarchar, 20, Nullable)
- `MailingAddressName` (nvarchar, 200, Nullable)
- `MailingAddress1` (nvarchar, 500, Nullable)
- `MailingAddress2` (nvarchar, 500, Nullable)
- `MailingAddressCity` (nvarchar, 200, Nullable)
- `MailingAddressState` (nvarchar, 8000, Nullable)
- `MailingAddressZip` (nvarchar, 20, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityPersonAddress_PersonKey` (NONCLUSTERED): PersonKey

---

### OutgoingFeaEligibilityPersonContact

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `Guardian1FirstName` (nvarchar, 200, Nullable)
- `Guardian1LastName` (nvarchar, 200, Nullable)
- `Guardian1FirstAddress` (nvarchar, 1000, Nullable)
- `Guardian1SecondAddress` (nvarchar, 1000, Nullable)
- `Guardian1City` (nvarchar, 200, Nullable)
- `Guardian1State` (nvarchar, 8000, Nullable)
- `Guardian1Zip` (nvarchar, 20, Nullable)
- `Guardian1Phone` (nvarchar, 50, Nullable)
- `Guardian1Email` (nvarchar, 510, Nullable)
- `Guardian2FirstName` (nvarchar, 200, Nullable)
- `Guardian2LastName` (nvarchar, 200, Nullable)
- `Guardian2FirstAddress` (nvarchar, 1000, Nullable)
- `Guardian2SecondAddress` (nvarchar, 1000, Nullable)
- `Guardian2City` (nvarchar, 200, Nullable)
- `Guardian2State` (nvarchar, 8000, Nullable)
- `Guardian2Zip` (nvarchar, 20, Nullable)
- `Guardian2Phone` (nvarchar, 50, Nullable)
- `Guardian2Email` (nvarchar, 510, Nullable)
- `Guardian3FirstName` (nvarchar, 200, Nullable)
- `Guardian3LastName` (nvarchar, 200, Nullable)
- `Guardian3FirstAddress` (nvarchar, 1000, Nullable)
- `Guardian3SecondAddress` (nvarchar, 1000, Nullable)
- `Guardian3City` (nvarchar, 200, Nullable)
- `Guardian3State` (nvarchar, 8000, Nullable)
- `Guardian3Zip` (nvarchar, 20, Nullable)
- `Guardian3Phone` (nvarchar, 50, Nullable)
- `Guardian3Email` (nvarchar, 510, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityPersonContact_PersonKey` (NONCLUSTERED): PersonKey

---

### OutgoingFeaEligibilityPersonLocationAssignment

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `FEA` (nvarchar, 200, Nullable)
- `ICA` (nvarchar, 200, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityPersonLocationAssignment_PersonKey` (NONCLUSTERED): PersonKey

---

### OutgoingFeaEligibilityPersonStaffAssignment

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `IrisConsultantId` (nvarchar, 200, Nullable)
- `IrisConsultantFirstName` (nvarchar, 200, Nullable)
- `IrisConsultantLastName` (nvarchar, 200, Nullable)
- `IrisConsultantPhoneNumber` (nvarchar, 500, Nullable)
- `IrisConsultantEmail` (nvarchar, 100, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityPersonStaffAssignment_PersonKey` (NONCLUSTERED): PersonKey

---

### OutgoingFeaEligibilityProgramEnrollment

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `StartDate` (date, 3, Nullable)
- `TermDate` (date, 3, Nullable)
- `Status` (nvarchar, 8000, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_OutgoingFeaEligibilityProgramEnrollment_PersonKey` (NONCLUSTERED): PersonKey

---

### OutgoingIrisAuthorization

**Row Count:** 0 (empty)

**Columns:**

- `OutgoingIrisAuthorizationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `ServiceLineKey` (uniqueidentifier, 16, NOT NULL)
- `RecordNumber` (nvarchar, 40, NOT NULL)
- `FeaBusinessProfileFullName` (nvarchar, 200, NOT NULL)
- `FeaOrganizationKey` (uniqueidentifier, 16, Nullable)
- `ServiceAuthorizationProviderReferenceOrganizationKey` (uniqueidentifier, 16, Nullable)
- `ServiceAuthorizationProviderReferenceLocationKey` (uniqueidentifier, 16, Nullable)
- `ServiceAuthorizationProviderReferenceOrgType` (bigint, 8, Nullable)
- `IsPrimaryServicingProvider` (bit, 1, Nullable)
- `MemberId` (nvarchar, 100, Nullable)
- `BillingProviderId` (nvarchar, 100, Nullable)
- `AuthorizationNumber` (nvarchar, 40, Nullable)
- `AuthorizationStatus` (nvarchar, 8000, Nullable)
- `ServiceCode` (nvarchar, 8000, Nullable)
- `Modifier1` (nvarchar, 8000, Nullable)
- `Modifier2` (nvarchar, 8000, Nullable)
- `Modifier3` (nvarchar, 8000, Nullable)
- `Modifier4` (nvarchar, 8000, Nullable)
- `AuthorizedEffectiveDate` (date, 3, Nullable)
- `AuthorizedEndDate` (date, 3, Nullable)
- `AuthorizationType` (nvarchar, 100, NOT NULL)
- `ParticipantDob` (date, 3, Nullable)
- `ParticipantSsn` (nvarchar, 100, Nullable)
- `ParticipantName` (nvarchar, 200, Nullable)
- `RenderingProviderId` (nvarchar, 100, Nullable)
- `RenderingQualifierId` (nvarchar, 8000, Nullable)
- `RenderingProviderNpi` (nvarchar, 100, Nullable)
- `BillingQualifierId` (nvarchar, 8000, Nullable)
- `BillingProviderNpi` (nvarchar, 100, Nullable)
- `ServiceCodeQualifier` (nvarchar, 8000, Nullable)
- `ServiceDescription` (nvarchar, 600, Nullable)
- `TotalDollarAmount` (decimal, 9, Nullable)
- `TotalUnits` (decimal, 9, Nullable)
- `UnitRate` (decimal, 9, Nullable)
- `UnitType` (nvarchar, 8000, Nullable)
- `Frequency` (nvarchar, 8000, Nullable)
- `UnitsByFrequency` (decimal, 9, Nullable)
- `CreatedDate` (datetime, 8, NOT NULL)
- `UpdatedDate` (datetime, 8, NOT NULL)
- `ParticipantStatus` (nvarchar, 8000, Nullable)
- `DateLastSent` (datetime2, 8, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsReadyToSend` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `AK_OutgoingIrisAuthorization_ServiceLineKey_ServiceAuthorizationProviderReferenceLocationKey` (UNIQUE NONCLUSTERED): ServiceLineKey, ServiceAuthorizationProviderReferenceLocationKey

---

### WaiverMember

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, Nullable)
- `MemberId` (varchar, 10, NOT NULL) **[PK]**
- `DateOfDeath` (date, 3, Nullable)
- `MedicaidEligibilityEffectiveDate` (date, 3, Nullable)
- `MedicaidEligibilityEndDate` (date, 3, Nullable)
- `McoProgramCode` (varchar, 5, Nullable)
- `McoId` (varchar, 15, Nullable)
- `McoName` (varchar, 50, Nullable)
- `McoEffectiveDate` (date, 3, Nullable)
- `McoEndDate` (date, 3, Nullable)
- `MemberCostShareAmount` (decimal, 5, Nullable)
- `CostShareAmountType` (varchar, 9, Nullable)
- `CostShareEffectiveDate` (date, 3, Nullable)
- `WaiverProgram0` (varchar, 100, Nullable)
- `WaiverEnrollmentEffectiveDate0` (date, 3, Nullable)
- `WaiverEnrollmentEndDate0` (date, 3, Nullable)
- `WaiverEnrollmentStatus0` (char, 1, Nullable)
- `StopReasonCode0` (varchar, 2, Nullable)
- `WaiverProgram1` (varchar, 100, Nullable)
- `WaiverEnrollmentEffectiveDate1` (date, 3, Nullable)
- `WaiverEnrollmentEndDate1` (date, 3, Nullable)
- `WaiverEnrollmentStatus1` (char, 1, Nullable)
- `StopReasonCode1` (varchar, 2, Nullable)
- `WaiverProgram2` (varchar, 100, Nullable)
- `WaiverEnrollmentEffectiveDate2` (date, 3, Nullable)
- `WaiverEnrollmentEndDate2` (date, 3, Nullable)
- `WaiverEnrollmentStatus2` (char, 1, Nullable)
- `StopReasonCode2` (varchar, 2, Nullable)
- `WaiverProgram3` (varchar, 100, Nullable)
- `WaiverEnrollmentEffectiveDate3` (date, 3, Nullable)
- `WaiverEnrollmentEndDate3` (date, 3, Nullable)
- `WaiverEnrollmentStatus3` (char, 1, Nullable)
- `StopReasonCode3` (varchar, 2, Nullable)
- `WaiverProgram4` (varchar, 100, Nullable)
- `WaiverEnrollmentEffectiveDate4` (date, 3, Nullable)
- `WaiverEnrollmentEndDate4` (date, 3, Nullable)
- `WaiverEnrollmentStatus4` (char, 1, Nullable)
- `StopReasonCode4` (varchar, 2, Nullable)
- `LocIndicator` (char, 1, Nullable)
- `AdultLocWaiverProgram` (varchar, 100, Nullable)
- `AdultLocWaiverProgramStartVerification` (varchar, 2, Nullable)
- `AdultLocFsiaAgencyTypeCode` (varchar, 3, Nullable)
- `AdultLocWaiverEligibilityIndicator` (char, 1, Nullable)
- `AdultLocFrailElderIndicator` (char, 1, Nullable)
- `AdultLocPhysicalDisabilityIndicator` (char, 1, Nullable)
- `AdultLocDisabilityPerFederalIndicator` (char, 1, Nullable)
- `AdultLocDisabilityPerStateIndicator` (char, 1, Nullable)
- `AdultLocAlzheimersDiseaseOrOtherIrreversibleDementiaInd` (char, 1, Nullable)
- `AdultLocTerminalConditionsIndicator` (char, 1, Nullable)
- `AdultLocSevereAndPersistentMentalIllnessIndicator` (char, 1, Nullable)
- `AdultLocNoTargetGroupIndicator` (char, 1, Nullable)
- `AdultLocStatusCode` (char, 1, Nullable)
- `AdultLocEffectiveDate` (date, 3, Nullable)
- `AdultLocEndDate` (date, 3, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `IsPersonReadyToProcess` (bit, 1, NOT NULL)
- `IsProgramEnrollmentReadyToProcess` (bit, 1, NOT NULL)
- `IsCostShareReadyToProcess` (bit, 1, NOT NULL)
- `CostShareKey` (uniqueidentifier, 16, Nullable)
- `LastSynchronizationTimestamp` (datetimeoffset, 10, NOT NULL)

---

### WaiverMemberProgramEnrollmentStaging

**Row Count:** 0 (empty)

**Columns:**

- `MemberId` (varchar, 10, NOT NULL)
- `ProgramEnrollmentKey` (uniqueidentifier, 16, NOT NULL)

**Foreign Keys:**

- `MemberId` -> `[CustomerInterfaceModule].[WaiverMember].[MemberId]`

---

### WaiverMemberRaw

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchKey` (uniqueidentifier, 16, Nullable)
- `RawText` (nvarchar, MAX, Nullable)

**Indexes:**

- `IX_WaiverMemberRaw_InterfaceBatchKey` (CLUSTERED): InterfaceBatchKey

---

## Schema: `CustomerLookupModule`

### CostShareLookup

**Row Count:** 3,285 rows

**Columns:**

- `CostShareKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `Amount` (decimal, 9, NOT NULL)
- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `YearMonthYearValue` (int, 4, Nullable)
- `YearMonthMonthName` (nvarchar, 100, Nullable)

**Indexes:**

- `IX_CostShareLookup_PersonKey` (NONCLUSTERED): PersonKey

---

### CustomFormInstanceLookup

**Row Count:** 0 (empty)

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL)
- `CaseKey` (uniqueidentifier, 16, NOT NULL)
- `CustomFormInstanceKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `FormName` (nvarchar, 200, NOT NULL)
- `WorkflowState` (nvarchar, 200, Nullable)
- `HasMultipleInstances` (bit, 1, NOT NULL)

**Indexes:**

- `IX_CustomFormInstanceLookup_PersonKey_FormName` (UNIQUE NONCLUSTERED): PersonKey, FormName
- `IX_CustomFormInstanceLookup_CaseKey` (NONCLUSTERED): CaseKey

---

### OrganizationLocationLookup

**Row Count:** 49,738 rows

**Columns:**

- `OrganizationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `LocationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LocationStatusDisplayName` (nvarchar, 8000, NOT NULL)
- `LocationStatusIdentifier` (bigint, 8, NOT NULL)
- `OrganizationStatusDisplayName` (nvarchar, 8000, NOT NULL)
- `OrganizationStatusIdentifier` (bigint, 8, NOT NULL)

**Indexes:**

- `IX_OrganizationLocationLookup_CustomerProviderIdentifier` (NONCLUSTERED): CustomerProviderIdentifier

---

### PersonLookup

**Row Count:** 45,368 rows

**Columns:**

- `PersonKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CaseKey` (uniqueidentifier, 16, Nullable)
- `MedicaidId` (nvarchar, 100, Nullable)

**Indexes:**

- `IX_PersonLookup_MedicaidId` (NONCLUSTERED): MedicaidId

---

### ProgramEnrollmentLookup

**Row Count:** 294,313 rows

**Columns:**

- `ProgramEnrollmentKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `EnrollmentDateRangeEndDate` (date, 3, Nullable)
- `EnrollmentDateRangeStartDate` (date, 3, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `ProgramKey` (uniqueidentifier, 16, NOT NULL)
- `ProgramDisplayName` (nvarchar, 200, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `RecertificationDate` (date, 3, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `StatusReasonCodeSystemIdentifier` (bigint, 8, Nullable)
- `StatusReasonDisplayName` (nvarchar, 8000, Nullable)
- `StatusReasonIdentifier` (bigint, 8, Nullable)
- `SuspensionStatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `SuspensionStatusDisplayName` (nvarchar, 8000, Nullable)
- `SuspensionStatusIdentifier` (bigint, 8, Nullable)
- `CaseKey` (uniqueidentifier, 16, NOT NULL)

**Indexes:**

- `IX_ProgramEnrollmentLookup_CaseKey` (NONCLUSTERED): CaseKey

---

### ProgramLookup

**Row Count:** 3 rows

**Columns:**

- `ProgramKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `DisplayName` (nvarchar, 200, NOT NULL)

---

### ServiceLineLookup

**Row Count:** 0 (empty)

**Columns:**

- `ServiceAuthorizationNumber` (nvarchar, 40, NOT NULL)
- `ServiceLineKey` (uniqueidentifier, 16, NOT NULL)
- `Unit15MinAttribute` (bit, 1, NOT NULL)

---

## Schema: `InterfaceModule`

### IncomingDiagnosis

**Row Count:** 0 (empty)

**Columns:**

- `IncomingDiagnosisKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `DiagnosisKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `DiagnosisDate` (date, 3, Nullable)
- `IsCurrent` (bit, 1, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `IsProgramQualified` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `CaseKey` (uniqueidentifier, 16, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `DiagnosedByName` (nvarchar, 200, Nullable)
- `DiagnosedByCredentialTypeDisplayName` (nvarchar, 8000, Nullable)
- `DiagnosedByCredentialTypeIdentifier` (bigint, 8, Nullable)
- `DiagnosedByCredentialTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `DiagnosisCodeCode` (nvarchar, 100, Nullable)
- `DiagnosisCodeDisplayName` (nvarchar, 8000, Nullable)
- `DiagnosisCodeCodeSystemIdentifier` (nvarchar, 100, Nullable)
- `DiagnosisCodeCodeSystemVersion` (nvarchar, 510, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingDiagnosis_ProvenanceSourceIdentifier` (NONCLUSTERED): ProvenanceSourceIdentifier
- `IX_IncomingDiagnosis_DiagnosisCodeCode` (NONCLUSTERED): DiagnosisCodeCode
- `IX_IncomingDiagnosis_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingDiagnosis_DiagnosisKey` (NONCLUSTERED): DiagnosisKey
- `IX_IncomingDiagnosis_CaseKey` (NONCLUSTERED): CaseKey

---

### IncomingFinancialEligibility

**Row Count:** 0 (empty)

**Columns:**

- `IncomingFinancialEligibilityKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `FinancialEligibilityTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `FinancialEligibilityTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `FinancialEligibilityTypeIdentifier` (bigint, 8, NOT NULL)
- `FinancialEligibilityDescription` (nvarchar, 8000, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerFinancialEligibilityIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingFinancialEligibility_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingFinancialEligibility_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingFinancialEligibility_CustomerFinancialEligiblityIdentifier` (NONCLUSTERED): CustomerFinancialEligibilityIdentifier

---

### IncomingHealthInsurance

**Row Count:** 0 (empty)

**Columns:**

- `IncomingHealthInsuranceKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `HealthInsuranceKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `BeneficiaryIdentifier` (nvarchar, 100, Nullable)
- `CoverageDescription` (nvarchar, 500, Nullable)
- `GroupNumber` (nvarchar, 40, Nullable)
- `OrganizationName` (nvarchar, 200, Nullable)
- `PlanName` (nvarchar, 200, Nullable)
- `PolicyNumber` (nvarchar, 40, Nullable)
- `CaseKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `IsDeleted` (bit, 1, NOT NULL)
- `CustomerEnrollIdentifier` (nvarchar, 100, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingHealthInsurance_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingHealthInsurance_TypeIdentifier` (NONCLUSTERED): TypeIdentifier
- `IX_IncomingHealthInsurance_CaseKey` (NONCLUSTERED): CaseKey
- `IX_IncomingHealthInsurance_IsReadyToProcess` (NONCLUSTERED): IsReadyToProcess
- `IX_IncomingHealthInsurance_HealthInsuranceKey` (NONCLUSTERED): HealthInsuranceKey

---

### IncomingLocation

**Row Count:** 368,979 rows

**Columns:**

- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `Version` (int, 4, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `IncomingOrganizationKey` (uniqueidentifier, 16, Nullable)
- `BusinessProfileDoingBusinessAsName` (nvarchar, 200, Nullable)
- `BusinessProfileFullName` (nvarchar, 200, NOT NULL)
- `BusinessProfileShortName` (nvarchar, 200, NOT NULL)
- `BusinessProfileTotalBedCount` (int, 4, Nullable)
- `BusinessProfileWebsiteUrlAddress` (nvarchar, 510, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `PhoneLastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `PhoneHashChecksumValue` (varbinary, 64, Nullable)
- `HasErrors` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `AK_IncomingLocation_UniqueLocationKey` (UNIQUE NONCLUSTERED): LocationKey
- `IX_IncomingLocation_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingLocationAddresses

**Row Count:** 1,533,316 rows

**Columns:**

- `IncomingLocationAddressesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `CurrentCodeSystemIdentifier` (bigint, 8, Nullable)
- `CurrentDisplayName` (nvarchar, 8000, Nullable)
- `CurrentIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountryCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountryDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountryIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountyAreaIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressPostalCode` (nvarchar, 20, Nullable)
- `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressStateProvinceDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressStateProvinceIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCityName` (nvarchar, 200, Nullable)
- `PhysicalAddressFirstStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressSecondStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `PhysicalAddressTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `PhysicalAddressTypeIdentifier` (bigint, 8, NOT NULL)
- `PhysicalAddressGeographicalCoordinatesLatitude` (float, 8, Nullable)
- `PhysicalAddressGeographicalCoordinatesLongitude` (float, 8, Nullable)
- `IsActive` (bit, 1, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationAddresses_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingLocationAddresses_LocationKey` (NONCLUSTERED): LocationKey

---

### IncomingLocationCredentials

**Row Count:** 190,493 rows

**Columns:**

- `IncomingLocationCredentialsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `AccreditationBodyCodeSystemIdentifier` (bigint, 8, Nullable)
- `AccreditationBodyDisplayName` (nvarchar, 8000, Nullable)
- `AccreditationBodyIdentifier` (bigint, 8, Nullable)
- `CertificationTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `CertificationTypeDisplayName` (nvarchar, 8000, Nullable)
- `CertificationTypeIdentifier` (bigint, 8, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `LicensureBoardCodeSystemIdentifier` (bigint, 8, Nullable)
- `LicensureBoardDisplayName` (nvarchar, 8000, Nullable)
- `LicensureBoardIdentifier` (bigint, 8, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `CredentialNumber` (nvarchar, 40, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationCredentials_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingLocationCredentials_LocationKey` (NONCLUSTERED): LocationKey

---

### IncomingLocationEmailAddresses

**Row Count:** 331,322 rows

**Columns:**

- `IncomingLocationEmailAddressesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, Nullable)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `EmailAddress` (nvarchar, 510, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationEmailAddresses_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingLocationEmailAddresses_LocationKey` (NONCLUSTERED): LocationKey

---

### IncomingLocationIdentifiers

**Row Count:** 871,282 rows

**Columns:**

- `IncomingLocationIdentifiersKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `Value` (nvarchar, 100, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationIdentifiers_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey

---

### IncomingLocationPhones

**Row Count:** 214,569 rows

**Columns:**

- `IncomingLocationPhonesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `PhoneExtensionNumber` (nvarchar, 20, Nullable)
- `PhoneNumber` (nvarchar, 500, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TypeDisplayName` (nvarchar, 8000, Nullable)
- `TypeIdentifier` (bigint, 8, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `IsTextTelephone` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationPhones_LocationKey` (NONCLUSTERED): LocationKey
- `IX_IncomingLocationPhones_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey

---

### IncomingLocationPointOfContact

**Row Count:** 773,998 rows

**Columns:**

- `IncomingLocationPointOfContactKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `LocationPointOfContactKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `Name` (nvarchar, 200, Nullable)
- `Title` (nvarchar, 510, Nullable)
- `EmailAddressAddress` (nvarchar, 510, Nullable)
- `PhoneExtensionNumber` (nvarchar, 20, Nullable)
- `PhoneNumber` (nvarchar, 50, Nullable)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationPointOfContact_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingLocationPointOfContact_LocationKey` (NONCLUSTERED): LocationKey

---

### IncomingLocationPointOfContactAssociatedPrograms

**Row Count:** 3,006,525 rows

**Columns:**

- `IncomingLocationPointOfContactAssociatedProgramsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationPointOfContactKey` (uniqueidentifier, 16, NOT NULL)
- `LocationPointOfContactKey` (uniqueidentifier, 16, Nullable)
- `ProgramDisplayName` (nvarchar, 500, Nullable)
- `ProgramKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationPointOfContactKey` -> `[InterfaceModule].[IncomingLocationPointOfContact].[IncomingLocationPointOfContactKey]`

**Indexes:**

- `IX_IncomingLocationPointOfContactAssociatedPrograms_ProgramKey` (NONCLUSTERED): ProgramKey
- `IX_IncomingLocationPointOfContactAssociatedPrograms_IncomingLocationPointOfContactKey` (NONCLUSTERED): IncomingLocationPointOfContactKey

---

### IncomingLocationSpecialty

**Row Count:** 371,701 rows

**Columns:**

- `IncomingLocationSpecialtyKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `LocationSpecialtyKey` (uniqueidentifier, 16, Nullable)
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `TypeDisplayName` (nvarchar, 8000, Nullable)
- `TypeIdentifier` (bigint, 8, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 1000, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationSpecialty_TypeIdentifier` (NONCLUSTERED): TypeIdentifier
- `IX_IncomingLocationSpecialty_LocationKey` (NONCLUSTERED): LocationKey
- `IX_IncomingLocationSpecialty_LocationSpecialtyKey` (NONCLUSTERED): LocationSpecialtyKey

---

### IncomingLocationSupportedPrograms

**Row Count:** 64,265 rows

**Columns:**

- `IncomingLocationSupportedProgramsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `ProgramKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationSupportedPrograms_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingLocationSupportedPrograms_ProgramKey` (NONCLUSTERED): ProgramKey

---

### IncomingLocationTaxonomies

**Row Count:** 133,463 rows

**Columns:**

- `IncomingLocationTaxonomiesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `Code` (nvarchar, 20, Nullable)
- `GroupingName` (nvarchar, 200, Nullable)
- `ClassificationName` (nvarchar, 200, Nullable)
- `SpecializationName` (nvarchar, 200, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationTaxonomies_LocationKey` (NONCLUSTERED): LocationKey
- `IX_IncomingLocationTaxonomies_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey

---

### IncomingLocationType

**Row Count:** 363,687 rows

**Columns:**

- `IncomingLocationTypeKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationTypeKey` (uniqueidentifier, 16, Nullable)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `PrimaryTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `PrimaryTypeIdentifier` (bigint, 8, NOT NULL)
- `PrimaryTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 1000, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingLocationType_LocationKey` (NONCLUSTERED): LocationKey
- `IX_IncomingLocationType_LocationTypeKey` (NONCLUSTERED): LocationTypeKey

---

### IncomingLocationTypeSubtypes

**Row Count:** 373,107 rows

**Columns:**

- `IncomingLocationTypeSubtypesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationTypeKey` (uniqueidentifier, 16, NOT NULL)
- `LocationTypeKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `CodeSystemIdentifier` (bigint, 8, NOT NULL)
- `DisplayName` (nvarchar, 8000, NOT NULL)
- `Identifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, Nullable)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationTypeKey` -> `[InterfaceModule].[IncomingLocationType].[IncomingLocationTypeKey]`

**Indexes:**

- `IX_IncomingLocationTypeSubtypes_IncomingLocationTypeKey` (NONCLUSTERED): IncomingLocationTypeKey

---

### IncomingMedicaidEnrollment

**Row Count:** 368,736 rows

**Columns:**

- `IncomingMedicaidEnrollmentKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `IncomingLocationKey` (uniqueidentifier, 16, Nullable)
- `MedicaidEnrollmentKey` (uniqueidentifier, 16, Nullable)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `RecertificationDueDate` (date, 3, Nullable)
- `EnrollmentStatusIdentifier` (bigint, 8, Nullable)
- `EnrollmentStatusDisplayName` (nvarchar, 8000, Nullable)
- `EnrollmentStatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `EnrollmentTypeIdentifier` (bigint, 8, Nullable)
- `EnrollmentTypeDisplayName` (nvarchar, 8000, Nullable)
- `EnrollmentTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeIdentifier` (bigint, 8, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, Nullable)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`
- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingMedicaidEnrollment_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `IX_IncomingMedicaidEnrollment_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey
- `IX_IncomingMedicaidEnrollment_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingMedicaidEnrollment_LocationKey` (NONCLUSTERED): LocationKey

---

### IncomingMedication

**Row Count:** 0 (empty)

**Columns:**

- `IncomingMedicationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `MedicationKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `IsActive` (bit, 1, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `CaseKey` (uniqueidentifier, 16, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `DoseMeasure` (float, 8, Nullable)
- `DoseUnitDisplayName` (nvarchar, 8000, Nullable)
- `DoseUnitIdentifier` (bigint, 8, Nullable)
- `DoseUnitCodeSystemIdentifier` (bigint, 8, Nullable)
- `FrequencyDisplayName` (nvarchar, 8000, Nullable)
- `FrequencyIdentifier` (bigint, 8, Nullable)
- `FrequencyCodeSystemIdentifier` (bigint, 8, Nullable)
- `NameCode` (nvarchar, 100, Nullable)
- `NameDisplayName` (nvarchar, 8000, Nullable)
- `NameCodeSystemIdentifier` (nvarchar, 100, Nullable)
- `NameCodeSystemVersion` (nvarchar, 510, Nullable)
- `ProReNataDisplayName` (nvarchar, 8000, Nullable)
- `ProReNataIdentifier` (bigint, 8, Nullable)
- `ProReNataCodeSystemIdentifier` (bigint, 8, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `RouteDisplayName` (nvarchar, 8000, Nullable)
- `RouteIdentifier` (bigint, 8, Nullable)
- `RouteCodeSystemIdentifier` (bigint, 8, Nullable)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `LastSourceFileName` (nvarchar, 500, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerMedicationIdentifier` (nvarchar, 200, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingMedication_MedicationKey` (NONCLUSTERED): MedicationKey
- `IX_IncomingMedication_NameCode` (NONCLUSTERED): NameCode
- `IX_IncomingMedication_CaseKey` (NONCLUSTERED): CaseKey
- `IX_IncomingMedication_ProvenanceSourceIdentifier` (NONCLUSTERED): ProvenanceSourceIdentifier
- `IX_IncomingMedication_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey

---

### IncomingOrganization

**Row Count:** 368,979 rows

**Columns:**

- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `BusinessProfileDoingBusinessAsName` (nvarchar, 200, Nullable)
- `BusinessProfileFullName` (nvarchar, 200, NOT NULL)
- `BusinessProfileShortName` (nvarchar, 200, NOT NULL)
- `BusinessProfileWebsiteUrlAddress` (nvarchar, 510, Nullable)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `PhoneLastSynchronizationTimestamp` (datetime2, 8, Nullable)
- `PhoneHashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)

**Indexes:**

- `IX_IncomingOrganization_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `AK_IncomingOrganization_CustomerProviderIdentifier` (UNIQUE NONCLUSTERED): CustomerProviderIdentifier
- `AK_IncomingOrganization_UniqueOrganizationKey` (UNIQUE NONCLUSTERED): OrganizationKey

---

### IncomingOrganizationAddresses

**Row Count:** 1,533,316 rows

**Columns:**

- `IncomingOrganizationAddressesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `CurrentCodeSystemIdentifier` (bigint, 8, Nullable)
- `CurrentDisplayName` (nvarchar, 8000, Nullable)
- `CurrentIdentifier` (bigint, 8, Nullable)
- `OrganizationPhysicalAddressTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `OrganizationPhysicalAddressTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `OrganizationPhysicalAddressTypeIdentifier` (bigint, 8, NOT NULL)
- `PhysicalAddressCountryCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountryDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountryIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountyAreaIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressPostalCode` (nvarchar, 20, Nullable)
- `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressStateProvinceDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressStateProvinceIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCityName` (nvarchar, 200, Nullable)
- `PhysicalAddressFirstStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressSecondStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressGeographicalCoordinatesLatitude` (float, 8, Nullable)
- `PhysicalAddressGeographicalCoordinatesLongitude` (float, 8, Nullable)
- `IsActive` (bit, 1, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationAddresses_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `IX_IncomingOrganizationAddresses_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingOrganizationBusinessTypes

**Row Count:** 368,736 rows

**Columns:**

- `IncomingOrganizationBusinessTypesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `CodeSystemIdentifier` (bigint, 8, NOT NULL)
- `DisplayName` (nvarchar, 8000, NOT NULL)
- `Identifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 1000, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationBusinessTypes_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `IX_IncomingOrganizationBusinessTypes_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingOrganizationCredentials

**Row Count:** 190,493 rows

**Columns:**

- `IncomingOrganizationCredentialsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `AccreditationBodyCodeSystemIdentifier` (bigint, 8, Nullable)
- `AccreditationBodyDisplayName` (nvarchar, 8000, Nullable)
- `AccreditationBodyIdentifier` (bigint, 8, Nullable)
- `CertificationTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `CertificationTypeDisplayName` (nvarchar, 8000, Nullable)
- `CertificationTypeIdentifier` (bigint, 8, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `LicensureBoardCodeSystemIdentifier` (bigint, 8, Nullable)
- `LicensureBoardDisplayName` (nvarchar, 8000, Nullable)
- `LicensureBoardIdentifier` (bigint, 8, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `CredentialNumber` (nvarchar, 40, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationCredentials_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey
- `IX_IncomingOrganizationCredentials_OrganizationKey` (NONCLUSTERED): OrganizationKey

---

### IncomingOrganizationEmailAddresses

**Row Count:** 331,322 rows

**Columns:**

- `IncomingOrganizationEmailAddressesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `EmailAddress` (nvarchar, 510, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationEmailAddresses_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `IX_IncomingOrganizationEmailAddresses_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingOrganizationIdentifiers

**Row Count:** 871,282 rows

**Columns:**

- `IncomingOrganizationIdentifiersKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `Value` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 1000, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationIdentifiers_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `IX_IncomingOrganizationIdentifiers_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingOrganizationOrganizationTypes

**Row Count:** 368,979 rows

**Columns:**

- `IncomingOrganizationOrganizationTypesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `CodeSystemIdentifier` (bigint, 8, NOT NULL)
- `DisplayName` (nvarchar, 8000, NOT NULL)
- `Identifier` (bigint, 8, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationOrganizationTypes_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey
- `IX_IncomingOrganizationOrganizationTypes_OrganizationKey` (NONCLUSTERED): OrganizationKey

---

### IncomingOrganizationPhones

**Row Count:** 214,569 rows

**Columns:**

- `IncomingOrganizationPhonesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `PhoneExtensionNumber` (nvarchar, 20, Nullable)
- `PhoneNumber` (nvarchar, 500, NOT NULL)
- `IncomingOrganizationPhoneTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `IncomingOrganizationPhoneTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `IncomingOrganizationPhoneTypeIdentifier` (bigint, 8, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `IsTextTelephone` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `IsReadyToProcess` (bit, 1, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationPhones_OrganizationKey` (NONCLUSTERED): OrganizationKey
- `IX_IncomingOrganizationPhones_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingOrganizationPointOfContact

**Row Count:** 773,998 rows

**Columns:**

- `IncomingOrganizationPointOfContactKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `OrganizationPointOfContactKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `IsPrimary` (bit, 1, NOT NULL)
- `Name` (nvarchar, 200, Nullable)
- `Title` (nvarchar, 510, Nullable)
- `EmailAddressAddress` (nvarchar, 510, Nullable)
- `PhoneExtensionNumber` (nvarchar, 20, Nullable)
- `PhoneNumber` (nvarchar, 50, Nullable)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationPointOfContact_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey
- `IX_IncomingOrganizationPointOfContact_OrganizationKey` (NONCLUSTERED): OrganizationKey

---

### IncomingOrganizationPointOfContactAssociatedPrograms

**Row Count:** 1,489,260 rows

**Columns:**

- `IncomingOrganizationPointOfContactAssociatedProgramsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationPointOfContactKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationPointOfContactKey` (uniqueidentifier, 16, Nullable)
- `ProgramDisplayName` (nvarchar, 500, Nullable)
- `ProgramKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationPointOfContactKey` -> `[InterfaceModule].[IncomingOrganizationPointOfContact].[IncomingOrganizationPointOfContactKey]`

**Indexes:**

- `IX_IncomingOrganizationPointOfContactAssociatedPrograms_ProgramKey` (NONCLUSTERED): ProgramKey
- `IX_IncomingOrganizationPointOfContactAssociatedPrograms_IncomingOrganizationPointOfContactKey` (NONCLUSTERED): IncomingOrganizationPointOfContactKey

---

### IncomingOrganizationSupportedPrograms

**Row Count:** 64,265 rows

**Columns:**

- `IncomingOrganizationSupportedProgramsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingOrganizationKey` (uniqueidentifier, 16, NOT NULL)
- `OrganizationKey` (uniqueidentifier, 16, Nullable)
- `ProgramKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`

**Indexes:**

- `IX_IncomingOrganizationSupportedPrograms_ProgramKey` (NONCLUSTERED): ProgramKey
- `IX_IncomingOrganizationSupportedPrograms_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey

---

### IncomingPaymentSuspension

**Row Count:** 46 rows

**Columns:**

- `IncomingPaymentSuspensionKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingLocationKey` (uniqueidentifier, 16, NOT NULL)
- `LocationKey` (uniqueidentifier, 16, Nullable)
- `PaymentSuspensionKey` (uniqueidentifier, 16, Nullable)
- `Version` (int, 4, NOT NULL)
- `EffectiveDateRangeStartDate` (datetime2, 8, NOT NULL)
- `EffectiveDateRangeEndDate` (datetime2, 8, Nullable)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityCreatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, NOT NULL)
- `EntityUpdatedTimestamp` (datetime2, 8, NOT NULL)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `CustomerProviderIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `ErrorMessage` (nvarchar, MAX, Nullable)
- `IsDeleted` (bit, 1, Nullable)

**Foreign Keys:**

- `IncomingLocationKey` -> `[InterfaceModule].[IncomingLocation].[IncomingLocationKey]`

**Indexes:**

- `IX_IncomingPaymentSuspension_IncomingLocationKey` (NONCLUSTERED): IncomingLocationKey
- `IX_IncomingPaymentSuspension_LocationKey` (NONCLUSTERED): LocationKey

---

### IncomingPerson

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `BirthDate` (date, 3, Nullable)
- `DeathDate` (date, 3, Nullable)
- `IsUnknown` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `BirthRecordAdoptionInformationNote` (nvarchar, MAX, Nullable)
- `BirthRecordApgarScoreFiveMinuteValue` (int, 4, Nullable)
- `BirthRecordApgarScoreOneMinuteValue` (int, 4, Nullable)
- `BirthRecordApgarScoreTenMinuteValue` (int, 4, Nullable)
- `BirthRecordBirthWeightValue` (decimal, 9, Nullable)
- `BirthRecordFatherName` (nvarchar, 200, Nullable)
- `BirthRecordGestationValue` (int, 4, Nullable)
- `BirthRecordMotherName` (nvarchar, 200, Nullable)
- `BirthRecordName` (nvarchar, 200, Nullable)
- `BirthRecordPlaceOfBirthName` (nvarchar, 8000, Nullable)
- `BirthRecordMethodOfDeliveryDisplayName` (nvarchar, 8000, Nullable)
- `BirthRecordMethodOfDeliveryIdentifier` (bigint, 8, Nullable)
- `BirthRecordMethodOfDeliveryCodeSystemIdentifier` (bigint, 8, Nullable)
- `EducationAndEmploymentEducationLevelNote` (nvarchar, MAX, Nullable)
- `EducationAndEmploymentEducationLevelEducationLevelDisplayName` (nvarchar, 8000, Nullable)
- `EducationAndEmploymentEducationLevelEducationLevelIdentifier` (bigint, 8, Nullable)
- `EducationAndEmploymentEducationLevelEducationLevelCodeSystemIdentifier` (bigint, 8, Nullable)
- `EducationAndEmploymentEmploymentStatusNote` (nvarchar, MAX, Nullable)
- `EducationAndEmploymentEmploymentStatusEmploymentStatusDisplayName` (nvarchar, 8000, Nullable)
- `EducationAndEmploymentEmploymentStatusEmploymentStatusIdentifier` (bigint, 8, Nullable)
- `EducationAndEmploymentEmploymentStatusEmploymentStatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `EnglishFluencyNeedsInterpreterDescription` (nvarchar, 8000, Nullable)
- `EnglishFluencyLevelDisplayName` (nvarchar, 8000, Nullable)
- `EnglishFluencyLevelIdentifier` (bigint, 8, Nullable)
- `EnglishFluencyLevelCodeSystemIdentifier` (bigint, 8, Nullable)
- `EnglishFluencyNeedsInterpreterDisplayName` (nvarchar, 8000, Nullable)
- `EnglishFluencyNeedsInterpreterIdentifier` (bigint, 8, Nullable)
- `EnglishFluencyNeedsInterpreterCodeSystemIdentifier` (bigint, 8, Nullable)
- `GenderDisplayName` (nvarchar, 8000, Nullable)
- `GenderIdentifier` (bigint, 8, Nullable)
- `GenderCodeSystemIdentifier` (bigint, 8, Nullable)
- `NameFirstName` (nvarchar, 200, Nullable)
- `NameLastName` (nvarchar, 200, Nullable)
- `SanitizedFirstName` (nvarchar, 200, Nullable)
- `SanitizedLastName` (nvarchar, 200, Nullable)
- `NameMaidenName` (nvarchar, 200, Nullable)
- `NameMiddleName` (nvarchar, 200, Nullable)
- `NamePreferredName` (nvarchar, 200, Nullable)
- `NamePrefixName` (nvarchar, 200, Nullable)
- `NameSuffixName` (nvarchar, 200, Nullable)
- `PhysicalTraitsHeightMeasure` (float, 8, Nullable)
- `PhysicalTraitsIdentifyingAttributesNote` (nvarchar, MAX, Nullable)
- `PhysicalTraitsWeightMeasure` (float, 8, Nullable)
- `PhysicalTraitsEyeColorDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalTraitsEyeColorIdentifier` (bigint, 8, Nullable)
- `PhysicalTraitsEyeColorCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalTraitsHairColorDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalTraitsHairColorIdentifier` (bigint, 8, Nullable)
- `PhysicalTraitsHairColorCodeSystemIdentifier` (bigint, 8, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `TribalNationLeadTypeDisplayName` (nvarchar, 8000, Nullable)
- `TribalNationLeadTypeIdentifier` (bigint, 8, Nullable)
- `TribalNationLeadTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TribalNationPreferenceTypeDisplayName` (nvarchar, 8000, Nullable)
- `TribalNationPreferenceTypeIdentifier` (bigint, 8, Nullable)
- `TribalNationPreferenceTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TribalNationTribalNationTypeDisplayName` (nvarchar, 8000, Nullable)
- `TribalNationTribalNationTypeIdentifier` (bigint, 8, Nullable)
- `TribalNationTribalNationTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `IsAlreadyLinkedToProd` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_IncomingPerson_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPerson_IsReadyToProcess` (NONCLUSTERED): IsReadyToProcess
- `IX_IncomingPerson_ProvenanceSourceIdentifier` (NONCLUSTERED): ProvenanceSourceIdentifier
- `AK_IncomingPerson_UniquePersonKey` (UNIQUE NONCLUSTERED): PersonKey
- `AK_IncomingPerson_CustomerPersonIdentifier` (UNIQUE NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPerson_BirthDate` (NONCLUSTERED): BirthDate

---

### IncomingPersonAddress

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonAddressKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `PersonAddressKey` (uniqueidentifier, 16, Nullable)
- `IsActive` (bit, 1, Nullable)
- `IsPrimary` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `AddressTypeDisplayName` (nvarchar, 8000, Nullable)
- `AddressTypeIdentifier` (bigint, 8, Nullable)
- `AddressTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `CurrentDisplayName` (nvarchar, 8000, Nullable)
- `CurrentIdentifier` (bigint, 8, Nullable)
- `CurrentCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCityName` (nvarchar, 200, Nullable)
- `PhysicalAddressFirstStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressSecondStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressCountryDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountryIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountryCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountyAreaIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressPostalCode` (nvarchar, 20, Nullable)
- `PhysicalAddressStateProvinceDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressStateProvinceIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressGeographicalCoordinatesLatitude` (float, 8, Nullable)
- `PhysicalAddressGeographicalCoordinatesLongitude` (float, 8, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonAddress_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonAddress_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonAddress_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonAddress_PersonAddressKey` (NONCLUSTERED): PersonAddressKey

---

### IncomingPersonAddressAttributes

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonAddressAttributesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonAddressKey` (uniqueidentifier, 16, NOT NULL)
- `PersonAddressKey` (uniqueidentifier, 16, Nullable)
- `CodeSystemIdentifier` (bigint, 8, NOT NULL)
- `DisplayName` (nvarchar, 8000, NOT NULL)
- `Identifier` (bigint, 8, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonAddressKey` -> `[InterfaceModule].[IncomingPersonAddress].[IncomingPersonAddressKey]`

**Indexes:**

- `IX_IncomingPersonAddressAttributes_PersonAddressKey` (NONCLUSTERED): PersonAddressKey
- `IX_IncomingPersonAddressAttributes_IncomingPersonAddressKey` (NONCLUSTERED): IncomingPersonAddressKey
- `IX_IncomingPersonAddressAttributes_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonContactRepresentativeTypes_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingPersonAlternateNames

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonAlternateNamesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TypeDisplayName` (nvarchar, 8000, Nullable)
- `TypeIdentifier` (bigint, 8, Nullable)
- `FirstName` (nvarchar, 200, Nullable)
- `LastName` (nvarchar, 200, Nullable)
- `MiddleName` (nvarchar, 200, Nullable)
- `SuffixName` (nvarchar, 200, Nullable)
- `MaidenName` (nvarchar, 200, Nullable)
- `PreferredName` (nvarchar, 200, Nullable)
- `PrefixName` (nvarchar, 200, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_IncomingPersonAlternateNames_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonAlternateNames_PersonKey` (NONCLUSTERED): PersonKey

---

### IncomingPersonAttributes

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonAttributesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `TypeDisplayName` (nvarchar, 8000, NOT NULL)
- `TypeIdentifier` (bigint, 8, NOT NULL)
- `ValueCodeSystemIdentifier` (bigint, 8, Nullable)
- `ValueDisplayName` (nvarchar, 8000, Nullable)
- `ValueIdentifier` (bigint, 8, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_IncomingPersonAttributes_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonAttributes_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingPersonContact

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonContactKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonContactKey` (uniqueidentifier, 16, Nullable)
- `OrganizationName` (nvarchar, 200, Nullable)
- `DoesLiveWithPerson` (bit, 1, Nullable)
- `IsTextTelephone` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `YearOfBirthValue` (int, 4, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `EmailAddressAddress` (nvarchar, 510, Nullable)
- `NameFirstName` (nvarchar, 200, Nullable)
- `NameLastName` (nvarchar, 200, Nullable)
- `NameMaidenName` (nvarchar, 200, Nullable)
- `NameMiddleName` (nvarchar, 200, Nullable)
- `NamePreferredName` (nvarchar, 200, Nullable)
- `NamePrefixName` (nvarchar, 200, Nullable)
- `NameSuffixName` (nvarchar, 200, Nullable)
- `PhoneExtensionNumber` (nvarchar, 20, Nullable)
- `PhoneNumber` (nvarchar, 500, Nullable)
- `PhoneTypeDisplayName` (nvarchar, 8000, Nullable)
- `PhoneTypeIdentifier` (bigint, 8, Nullable)
- `PhoneTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCityName` (nvarchar, 200, Nullable)
- `PhysicalAddressFirstStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressSecondStreetAddress` (nvarchar, 500, Nullable)
- `PhysicalAddressCountryDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountryIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountryCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressCountyAreaIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressCountyAreaCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressPostalCode` (nvarchar, 20, Nullable)
- `PhysicalAddressStateProvinceDisplayName` (nvarchar, 8000, Nullable)
- `PhysicalAddressStateProvinceIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressStateProvinceCodeSystemIdentifier` (bigint, 8, Nullable)
- `PhysicalAddressGeographicalCoordinatesLatitude` (float, 8, Nullable)
- `PhysicalAddressGeographicalCoordinatesLongitude` (float, 8, Nullable)
- `RelationshipTypeDisplayName` (nvarchar, 8000, Nullable)
- `RelationshipTypeIdentifier` (bigint, 8, Nullable)
- `RelationshipTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `ReleaseOfInformationProvidedDisplayName` (nvarchar, 8000, Nullable)
- `ReleaseOfInformationProvidedIdentifier` (bigint, 8, Nullable)
- `ReleaseOfInformationProvidedCodeSystemIdentifier` (bigint, 8, Nullable)
- `SpecialtyDisplayName` (nvarchar, MAX, Nullable)
- `SpecialtyIdentifier` (bigint, 8, Nullable)
- `SpecialtyCodeSystemIdentifier` (bigint, 8, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSourceFileName` (nvarchar, 500, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonContactIdentifier` (nvarchar, 100, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonContact_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonContact_ProvenanceSourceIdentifier` (NONCLUSTERED): ProvenanceSourceIdentifier
- `IX_IncomingPersonContact_PersonContactKey` (NONCLUSTERED): PersonContactKey
- `IX_IncomingPersonContact_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonContact_PersonKey` (NONCLUSTERED): PersonKey

---

### IncomingPersonContactRepresentativeTypes

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonContactRepresentativeTypesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonContactKey` (uniqueidentifier, 16, NOT NULL)
- `PersonContactKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `RepresentativeTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `RepresentativeTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `RepresentativeTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 1000, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonContactKey` -> `[InterfaceModule].[IncomingPersonContact].[IncomingPersonContactKey]`

**Indexes:**

- `IX_IncomingPersonContactRepresentativeTypes_IncomingPersonContactKey` (NONCLUSTERED): IncomingPersonContactKey
- `IX_IncomingPersonContactRepresentativeTypes_PersonContactKey` (NONCLUSTERED): PersonContactKey

---

### IncomingPersonEmailAddresses

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonEmailAddressesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `EmailAddress` (nvarchar, 510, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `Note` (nvarchar, MAX, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSourceFileName` (nvarchar, 500, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonEmailAddresses_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonEmailAddresses_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonEmailAddresses_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingPersonEthnicities

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonEthnicitiesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `EthnicityCodeSystemIdentifier` (bigint, 8, Nullable)
- `EthnicityDisplayName` (nvarchar, 8000, Nullable)
- `EthnicityIdentifier` (bigint, 8, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonEthnicities_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonEthnicities_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonEthnicities_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonEthnicities_ProvenanceSourceIdentifier` (NONCLUSTERED): ProvenanceSourceIdentifier

---

### IncomingPersonIdentifiers

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonIdentifiersKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TypeDisplayName` (nvarchar, 8000, Nullable)
- `TypeIdentifier` (bigint, 8, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `Value` (nvarchar, 100, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonIdentifiers_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonIdentifiers_TypeIdentifier` (NONCLUSTERED): TypeIdentifier, Value, IncomingPersonKey
- `IX_IncomingPersonIdentifiers_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonIdentifiers_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonIdentifiers_Value` (NONCLUSTERED): Value

---

### IncomingPersonIncome

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonIncomeKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `IncomeSourceCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `IncomeSourceDisplayName` (nvarchar, 8000, NOT NULL)
- `IncomeSourceIdentifier` (bigint, 8, NOT NULL)
- `IsActive` (bit, 1, Nullable)
- `MonthlyAmount` (decimal, 9, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonIncome_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonIncome_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonIncome_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingPersonLanguages

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonLanguagesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `HumanLanguageCodeSystemIdentifier` (bigint, 8, Nullable)
- `HumanLanguageDisplayName` (nvarchar, 8000, Nullable)
- `HumanLanguageIdentifier` (bigint, 8, Nullable)
- `IsPrimary` (bit, 1, NOT NULL)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonLanguages_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonLanguages_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonLanguages_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingPersonLockIns

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonLockInsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `LockInCategoryCodeSystemIdentifier` (bigint, 8, Nullable)
- `LockInCategoryDisplayName` (nvarchar, 8000, Nullable)
- `LockInCategoryIdentifier` (bigint, 8, Nullable)
- `LockInDateRangeEndDate` (date, 3, Nullable)
- `LockInDateRangeStartDate` (date, 3, Nullable)
- `LockInTypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `LockInTypeDisplayName` (nvarchar, 8000, Nullable)
- `LockInTypeIdentifier` (bigint, 8, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `Description` (nvarchar, 500, Nullable)
- `ProviderIdentifier` (nvarchar, 40, Nullable)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonLockIns_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonLockIns_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonLockIns_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey

---

### IncomingPersonMedicaidNumbers

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonMedicaidNumbersKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `EffectiveDateRangeEndDate` (date, 3, Nullable)
- `EffectiveDateRangeStartDate` (date, 3, Nullable)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `StatusDisplayName` (nvarchar, 8000, NOT NULL)
- `StatusIdentifier` (bigint, 8, NOT NULL)
- `IsOriginal` (bit, 1, NOT NULL)
- `Value` (nvarchar, 40, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonMedicaidNumbers_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonMedicaidNumbers_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonMedicaidNumbers_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier
- `IX_IncomingPersonMedicaidNumbers_StatusIdentifier` (NONCLUSTERED): StatusIdentifier, Value

---

### IncomingPersonPhones

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonPhonesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `PhoneExtensionNumber` (nvarchar, 20, Nullable)
- `PhoneNumber` (nvarchar, 500, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TypeDisplayName` (nvarchar, 8000, Nullable)
- `TypeIdentifier` (bigint, 8, Nullable)
- `IsPrimary` (bit, 1, Nullable)
- `IsTextTelephone` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerEntityIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonPhones_CustomerEntityIdentifier` (NONCLUSTERED): CustomerEntityIdentifier
- `IX_IncomingPersonPhones_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonPhones_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey

---

### IncomingPersonRaces

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonRaceKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `RaceCodeSystemIdentifier` (bigint, 8, Nullable)
- `RaceDisplayName` (nvarchar, 8000, Nullable)
- `RaceIdentifier` (bigint, 8, Nullable)
- `IsPrimary` (bit, 1, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonRaces_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonRaces_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonRaces_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingPersonSpendDowns

**Row Count:** 0 (empty)

**Columns:**

- `IncomingPersonSpendDownsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `IncomingPersonKey` (uniqueidentifier, 16, Nullable)
- `PersonKey` (uniqueidentifier, 16, Nullable)
- `BaseDateRangeEndDate` (date, 3, Nullable)
- `BaseDateRangeStartDate` (date, 3, Nullable)
- `Amount` (decimal, 9, Nullable)
- `RemainingAmount` (decimal, 9, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Foreign Keys:**

- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingPersonSpendDowns_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `IX_IncomingPersonSpendDowns_PersonKey` (NONCLUSTERED): PersonKey
- `IX_IncomingPersonSpendDowns_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### IncomingProgramEnrollment

**Row Count:** 0 (empty)

**Columns:**

- `IncomingProgramEnrollmentKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `ProgramEnrollmentKey` (uniqueidentifier, 16, Nullable)
- `IncomingPersonKey` (uniqueidentifier, 16, NOT NULL)
- `IncomingOrganizationKey` (uniqueidentifier, 16, Nullable)
- `EnrollmentActionCode` (nvarchar, 20, NOT NULL)
- `EnrollmentActionDisplayName` (nvarchar, 200, NOT NULL)
- `EnrollmentReasonCode` (nvarchar, 20, Nullable)
- `EnrollmentReasonDisplayName` (nvarchar, 200, Nullable)
- `ProgramTypeCode` (nvarchar, 20, Nullable)
- `ProgramTypeDisplayName` (nvarchar, 200, Nullable)
- `EffectiveDate` (date, 3, Nullable)
- `EndDate` (date, 3, Nullable)
- `IsPrimary` (bit, 1, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `RecertificationDate` (date, 3, Nullable)
- `StatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `StatusDisplayName` (nvarchar, 8000, Nullable)
- `StatusIdentifier` (bigint, 8, Nullable)
- `StatusReasonCodeSystemIdentifier` (bigint, 8, Nullable)
- `StatusReasonDisplayName` (nvarchar, 8000, Nullable)
- `StatusReasonIdentifier` (bigint, 8, Nullable)
- `SuspensionStatusCodeSystemIdentifier` (bigint, 8, Nullable)
- `SuspensionStatusDisplayName` (nvarchar, 8000, Nullable)
- `SuspensionStatusIdentifier` (bigint, 8, Nullable)
- `SourceRecordIdentifier` (nvarchar, 200, Nullable)
- `ProvenanceSourceIdentifier` (nvarchar, 1000, Nullable)
- `ProvenanceTypeDisplayName` (nvarchar, 8000, NOT NULL)
- `ProvenanceTypeIdentifier` (bigint, 8, NOT NULL)
- `ProvenanceTypeCodeSystemIdentifier` (bigint, 8, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `IsAlreadyLinkedToProd` (bit, 1, NOT NULL)
- `CustomerProgramEnrollmentIdentifier` (nvarchar, 1000, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 1000, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)
- `LastSourceFileName` (nvarchar, 1000, NOT NULL)

**Foreign Keys:**

- `IncomingOrganizationKey` -> `[InterfaceModule].[IncomingOrganization].[IncomingOrganizationKey]`
- `IncomingPersonKey` -> `[InterfaceModule].[IncomingPerson].[IncomingPersonKey]`

**Indexes:**

- `IX_IncomingProgramEnrollment_IncomingOrganizationKey` (NONCLUSTERED): IncomingOrganizationKey
- `IX_IncomingProgramEnrollment_EffectiveDate` (NONCLUSTERED): EffectiveDate
- `IX_IncomingProgramEnrollment_ProgramEnrollmentKey` (NONCLUSTERED): ProgramEnrollmentKey
- `IX_IncomingProgramEnrollment_EnrollmentActionCode` (NONCLUSTERED): EnrollmentActionCode
- `IX_IncomingProgramEnrollment_ProvenanceSourceIdentifier` (NONCLUSTERED): ProvenanceSourceIdentifier
- `IX_IncomingProgramEnrollment_IsReadyToProcess` (NONCLUSTERED): IsReadyToProcess
- `IX_IncomingProgramEnrollment_IncomingPersonKey` (NONCLUSTERED): IncomingPersonKey
- `AK_IncomingProgramEnrollment_CustomerProgramEnrollmentIdentifier` (UNIQUE NONCLUSTERED): CustomerProgramEnrollmentIdentifier

---

### IncomingServiceLine

**Row Count:** 0 (empty)

**Columns:**

- `IncomingServiceLineKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `ServiceLineKey` (uniqueidentifier, 16, Nullable)
- `LineNumber` (nvarchar, 40, Nullable)
- `Version` (int, 4, Nullable)
- `Note` (nvarchar, MAX, Nullable)
- `RequestReceivedDate` (date, 3, Nullable)
- `ReviewedDate` (date, 3, Nullable)
- `ServiceAuthorizationKey` (uniqueidentifier, 16, Nullable)
- `ServiceDefinitionKey` (uniqueidentifier, 16, Nullable)
- `AuthorizedDurationLength` (decimal, 9, Nullable)
- `AuthorizedRateAmount` (decimal, 9, Nullable)
- `AuthorizedTotalCostAmount` (decimal, 9, Nullable)
- `AuthorizedTotalUnitCount` (decimal, 9, Nullable)
- `AuthorizedUnitCount` (decimal, 9, Nullable)
- `AuthorizedEffectiveDateEndDate` (date, 3, Nullable)
- `AuthorizedEffectiveDateStartDate` (date, 3, Nullable)
- `AuthorizedFrequencyDisplayName` (nvarchar, 8000, Nullable)
- `AuthorizedFrequencyIdentifier` (bigint, 8, Nullable)
- `AuthorizedFrequencyCodeSystemIdentifier` (bigint, 8, Nullable)
- `RequestedDurationLength` (decimal, 9, Nullable)
- `RequestedRateAmount` (decimal, 9, Nullable)
- `RequestedTotalCostAmount` (decimal, 9, Nullable)
- `RequestedTotalUnitCount` (decimal, 9, Nullable)
- `RequestedUnitCount` (decimal, 9, Nullable)
- `RequestedEffectiveDateEndDate` (date, 3, Nullable)
- `RequestedEffectiveDateStartDate` (date, 3, Nullable)
- `RequestedFrequencyDisplayName` (nvarchar, 8000, Nullable)
- `RequestedFrequencyIdentifier` (bigint, 8, Nullable)
- `RequestedFrequencyCodeSystemIdentifier` (bigint, 8, Nullable)
- `ResponseErrorNote` (nvarchar, MAX, Nullable)
- `ResponseErrorCode` (nvarchar, 30, Nullable)
- `ResponseOutcomeDisplayName` (nvarchar, 8000, Nullable)
- `ResponseOutcomeIdentifier` (bigint, 8, Nullable)
- `ResponseOutcomeCodeSystemIdentifier` (bigint, 8, Nullable)
- `TypeDisplayName` (nvarchar, 8000, Nullable)
- `TypeIdentifier` (bigint, 8, Nullable)
- `TypeCodeSystemIdentifier` (bigint, 8, Nullable)
- `UtilizationDate` (date, 3, Nullable)
- `UtilizationUsedUnitCount` (decimal, 9, Nullable)
- `EntityCreatedAccountIdentifier` (nvarchar, 508, Nullable)
- `EntityCreatedTimestamp` (datetime2, 8, Nullable)
- `EntityCreatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `EntityUpdatedAccountIdentifier` (nvarchar, 508, Nullable)
- `EntityUpdatedTimestamp` (datetime2, 8, Nullable)
- `EntityUpdatedUserContextKey` (uniqueidentifier, 16, Nullable)
- `HasResponseMessages` (bit, 1, NOT NULL)
- `HasFatalError` (bit, 1, NOT NULL)
- `IsReadyToProcess` (bit, 1, NOT NULL)
- `CustomerPersonIdentifier` (nvarchar, 100, NOT NULL)
- `LastSynchronizationTimestamp` (datetime2, 8, NOT NULL)
- `HashChecksumValue` (varbinary, 64, Nullable)

**Indexes:**

- `IX_IncomingServiceLine_ServiceDefinitionKey` (NONCLUSTERED): ServiceDefinitionKey
- `IX_IncomingServiceLine_ServiceAuthorizationKey` (NONCLUSTERED): ServiceAuthorizationKey
- `IX_IncomingServiceLine_CustomerPersonIdentifier` (NONCLUSTERED): CustomerPersonIdentifier

---

### InterfaceBatch

**Row Count:** 11 rows

**Columns:**

- `InterfaceBatchKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CategoryName` (nvarchar, 200, Nullable)
- `FolderPathName` (nvarchar, 2000, NOT NULL)
- `TotalFilesCount` (int, 4, NOT NULL)
- `TotalSuccessCount` (int, 4, NOT NULL)
- `TotalFailCount` (int, 4, NOT NULL)
- `CreatedDateTimestamp` (datetime2, 8, NOT NULL)
- `IsProcessed` (bit, 1, NOT NULL)
- `ProcessedDateTimestamp` (datetime2, 8, Nullable)
- `IsArchived` (bit, 1, NOT NULL)
- `ArchivedFolderName` (nvarchar, 2000, Nullable)
- `ArchivedDateTimestamp` (datetime2, 8, Nullable)

**Indexes:**

- `IX_InterfaceBatch_CategoryName` (NONCLUSTERED): CategoryName

---

### InterfaceBatchFiles

**Row Count:** 11 rows

**Columns:**

- `InterfaceBatchFilesKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `InterfaceBatchKey` (uniqueidentifier, 16, NOT NULL)
- `InterfaceTableFileMappingKey` (uniqueidentifier, 16, NOT NULL)
- `FileName` (nvarchar, 400, NOT NULL)
- `CreatedDateTimestamp` (datetime2, 8, NOT NULL)
- `FileSizeLength` (bigint, 8, NOT NULL)
- `TotalRecordsCount` (int, 4, NOT NULL)
- `IsProcessed` (bit, 1, NOT NULL)
- `ProcessedDateTimestamp` (datetime2, 8, Nullable)
- `TotalProcessedCount` (int, 4, Nullable)
- `StatusName` (nvarchar, 20, Nullable)
- `TransferType` (nvarchar, 200, Nullable)

**Foreign Keys:**

- `InterfaceBatchKey` -> `[InterfaceModule].[InterfaceBatch].[InterfaceBatchKey]`
- `InterfaceTableFileMappingKey` -> `[InterfaceModule].[InterfaceTableFileMapping].[InterfaceTableFileMappingKey]`

---

### InterfaceBatchInformation

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchInformationKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `InterfaceBatchKey` (uniqueidentifier, 16, NOT NULL)
- `FileName` (nvarchar, 400, NOT NULL)
- `CreatedDateTimestamp` (datetime2, 8, NOT NULL)
- `FileSizeLength` (bigint, 8, NOT NULL)
- `TotalRecordsCount` (int, 4, NOT NULL)
- `IsProcessed` (bit, 1, NOT NULL)
- `ProcessedDateTimestamp` (datetime2, 8, Nullable)
- `TotalProcessedCount` (int, 4, Nullable)
- `StatusName` (nvarchar, 20, Nullable)
- `Note` (nvarchar, 4000, Nullable)
- `TransferType` (nvarchar, 200, Nullable)

**Foreign Keys:**

- `InterfaceBatchKey` -> `[InterfaceModule].[InterfaceBatch].[InterfaceBatchKey]`

---

### InterfaceBatchInformationIndexOperations

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchInformationIndexOperationsKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CategoryName` (nvarchar, 80, Nullable)
- `TableName` (nvarchar, 400, Nullable)
- `DropConstraintCommandName` (nvarchar, 2000, Nullable)
- `CreateConstraintCommandName` (nvarchar, 2000, Nullable)
- `IsDeleted` (bit, 1, NOT NULL)

---

### InterfaceBatchInformationTableFileMapping

**Row Count:** 0 (empty)

**Columns:**

- `InterfaceBatchInformationTableFileMappingKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CategoryName` (nvarchar, 80, Nullable)
- `TypeName` (nvarchar, 80, Nullable)
- `TableName` (nvarchar, 800, Nullable)
- `FileName` (nvarchar, 800, Nullable)
- `IsDeleted` (bit, 1, NOT NULL)

---

### InterfaceTableFileMapping

**Row Count:** 9 rows

**Columns:**

- `InterfaceTableFileMappingKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CategoryName` (nvarchar, 200, Nullable)
- `CustomerFileName` (nvarchar, 400, Nullable)
- `InternalFileName` (nvarchar, 400, Nullable)
- `InternalTableName` (nvarchar, 800, Nullable)
- `DaysToKeep` (tinyint, 1, Nullable)

**Indexes:**

- `AK_InterfaceTableFileMapping_CategoryName_CustomerFileName_InternalTableName` (UNIQUE NONCLUSTERED): CategoryName, CustomerFileName, InternalTableName

---

### ProcessExecution

**Row Count:** 0 (empty)

**Columns:**

- `ProcessExecutionKey` (int, 4, NOT NULL) **[PK]** [IDENTITY]
- `ProcessName` (nvarchar, 200, NOT NULL)
- `StatusName` (nvarchar, 100, NOT NULL)
- `StartTimestamp` (datetime2, 8, NOT NULL)
- `EndTimestamp` (datetime2, 8, Nullable)
- `DurationHourCount` (numeric, 13, Nullable)
- `DurationMinuteCount` (numeric, 9, Nullable)
- `DurationSecondCount` (numeric, 9, Nullable)
- `DurationMillisecondCount` (int, 4, Nullable)
- `CreatedTimestamp` (datetime2, 8, NOT NULL)
- `UpdatedTimestamp` (datetime2, 8, NOT NULL)
- `DataMigratedByUser` (sysname, 256, NOT NULL)

---

### ProcessExecutionStep

**Row Count:** 0 (empty)

**Columns:**

- `ProcessExecutionStepKey` (int, 4, NOT NULL) **[PK]** [IDENTITY]
- `ProcessExecutionKey` (int, 4, NOT NULL)
- `StepName` (nvarchar, 600, NOT NULL)
- `SchemaName` (sysname, 256, NOT NULL)
- `TableName` (sysname, 256, NOT NULL)
- `InitialRecordCount` (int, 4, NOT NULL)
- `FinalRecordCount` (int, 4, Nullable)
- `AffectedRecordCount` (int, 4, Nullable)
- `StartTimestamp` (datetime2, 8, NOT NULL)
- `EndTimestamp` (datetime2, 8, Nullable)
- `DurationHourCount` (numeric, 13, Nullable)
- `DurationMinuteCount` (numeric, 9, Nullable)
- `DurationSecondCount` (numeric, 9, Nullable)
- `DurationMillisecondCount` (int, 4, Nullable)
- `CreatedTimestamp` (datetime2, 8, NOT NULL)
- `UpdatedTimestamp` (datetime2, 8, NOT NULL)
- `DataMigratedByUser` (sysname, 256, NOT NULL)

**Foreign Keys:**

- `ProcessExecutionKey` -> `[InterfaceModule].[ProcessExecution].[ProcessExecutionKey]`

**Indexes:**

- `IX_ProcessExecutionStep_ProcessExecutionKey` (NONCLUSTERED): ProcessExecutionKey
- `AK_ProcessExecutionStep_ProcessExecutionKey_StepName` (UNIQUE NONCLUSTERED): ProcessExecutionKey, StepName

---

### ProcessLog

**Row Count:** 24,298,616 rows

**Columns:**

- `ProcessLogKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `LogTimestamp` (datetime2, 8, NOT NULL)
- `LoggerLevelName` (nvarchar, 100, NOT NULL)
- `Message` (nvarchar, MAX, NOT NULL)
- `Code` (nvarchar, 100, Nullable)
- `SourceDataIdentifier` (nvarchar, 510, Nullable)
- `AggregateKeyReference` (uniqueidentifier, 16, Nullable)
- `FieldName` (nvarchar, 800, Nullable)
- `ProcessStepName` (nvarchar, 400, Nullable)
- `CurrentUserName` (nvarchar, 400, NOT NULL)
- `CategoryName` (nvarchar, 200, Nullable)
- `InterfaceBatchKey` (uniqueidentifier, 16, Nullable)

**Indexes:**

- `IX_ProcessLog_ProcessStepName` (NONCLUSTERED): ProcessStepName
- `IX_ProcessLog_LogTimestamp` (NONCLUSTERED): LogTimestamp
- `IX_ProcessLog_AggregateKeyReference` (NONCLUSTERED): AggregateKeyReference

---

### VocabularyLookup

**Row Count:** 23 rows

**Columns:**

- `VocabularyLookupKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `CustomerSystemName` (nvarchar, 100, NOT NULL)
- `CustomerTableName` (nvarchar, 510, NOT NULL)
- `CustomerColumnName` (nvarchar, 510, NOT NULL)

**Indexes:**

- `AK_VocabularyLookup` (UNIQUE NONCLUSTERED): CustomerSystemName, CustomerTableName, CustomerColumnName

---

### VocabularyLookupDisplayNames

**Row Count:** 1,340 rows

**Columns:**

- `VocabularyLookupKey` (uniqueidentifier, 16, NOT NULL)
- `DisplayName` (nvarchar, 8000, NOT NULL)
- `Identifier` (nvarchar, 100, NOT NULL)
- `CodeSystemIdentifier` (nvarchar, 100, NOT NULL)
- `CustomerValue` (nvarchar, 8000, NOT NULL)

**Foreign Keys:**

- `VocabularyLookupKey` -> `[InterfaceModule].[VocabularyLookup].[VocabularyLookupKey]`

**Indexes:**

- `IX_VocabularyLookupDisplayNames_VocabularyLookupKey_Clustered` (CLUSTERED): VocabularyLookupKey
- `AK_VocabularyLookupKey_CustomerValue` (UNIQUE NONCLUSTERED): VocabularyLookupKey, CustomerValue

---

## Schema: `DatabaseAdministrationModule`

### UpgradeMigrationExecutionHistory

**Row Count:** 1 rows

**Columns:**

- `UpgradeMigrationExecutionHistoryKey` (uniqueidentifier, 16, NOT NULL) **[PK]**
- `DisplayName` (nvarchar, 200, Nullable)
- `WorkItemNumber` (nvarchar, 60, Nullable)
- `CreatedTimestamp` (datetime2, 8, Nullable)

**Indexes:**

- `IX_UpgradeMigrationExecutionHistory_CreatedTimestamp` (NONCLUSTERED): CreatedTimestamp
- `IX_UpgradeMigrationExecutionHistory_WorkItemNumber` (NONCLUSTERED): WorkItemNumber

---

## Views

| Schema | View Name |
|---|---|
| CommonModule | GenerateNEWIDView |
| CustomerInterfaceModule | FeaEligibilityLookupView |
| CustomerInterfaceModule | OutgoingInterfaceErrorsView |
| InterfaceModule | ProcessLogView |

