# WI DHS MES CMM — ICD-D01 Enrollment Service V6.0 — Complete Context Document

> **Source:** FG 2_WI DHS MES CMM_ICD-D01_Enrollment Service_V6.0_Unsubmitted Updates.xlsx
> **Generated:** 2026-06-26
> **Purpose:** Self-contained reference so the Excel file does not need to be re-opened.

---

## 1. Version History

| Date | Author | Comment |
|------|--------|---------|
| 2025-05-09 | Yaw Adu-Boahene | v1.0 Initial Document Delivery |
| 2025-05-16 | Veronica Williams | V1.0 Submitted to DHS |
| 2025-06-11 | Yaw Adu-Boahene | v2.0 Updates to address DHS comments (BR-D01-001, BR-D01-007) |
| 2025-06-26 | Michael Hodge | v3.0 Updates to address DHS comments (BR-D01-007) |
| 2025-07-15 | Yaw Adu-Boahene | v4.0 Updates — TransactionType and ErrorType allowable values |
| 2025-07-24 | Michael Hodge | v5.0 Updates — BR-D01-007 revised, Start-Stop Reasons replaced, Recertification date mappings updated |
| 2025-08-13 | Veronica Williams | v5.0 approved by DHS |
| 2025-12-02 | Michael Hodge | v6.0 Updates (see details below) |

### v6.0 Change Details

- Requirements tab — Added R388, R411, R444, R455, R469.
- Whole Document — Changed references to "XML" to instead reference "JSON" (to align with the GainwellConnect version of the API).
- EnrollmentRequest tab — Txn Source — Updated value to "CMMRT" per Gainwell email 10/29/2025; removed T_RE_CDE_SOURCE reference.
- EnrollmentRequest tab — Start Reason Code: Added mapping for reasons from ProgramEnrollment table.
- SDPCEnrollmentRequest tab — Txn Source — Updated value to "CMMRT"; removed T_RE_CDE_SOURCE reference.
- Reference List Values tab — Removed T_RE_CDE_SOURCE table.
- Error Codes and Description tab — Added "Notes" column; added additional codes from Gainwell.
- Business Rules tab — Added BR-D01-016.
- EnrollmentResponse tab — IdUniqueClient — Added mapping for Medicaid ID swap scenario.
- Business Rules tab — Removed BR-D01-008 (enrollment request triggered by user updating enrollment record, not date of death).
- SDPCEnrollmentRequest — IdUniqueClient — Updated mapping: from PersonModule.PersonMedicaidNumbers.Value.
- EnrollmentRequest tab — Updated AddressNode/AdditionalAddressNode Address 1 to pull from PhysicalAddressCareOfName.
- EnrollmentResponse and SDPCEnrollmentResponse tabs — Replaced placeholder target table/column names with Blue Compass values.
- Business Rules tab — Added BR-D01-017 through BR-D01-024.
- EnrollmentRequest tab — Updated Recertification Completion Date mapping to use same date as DateEnrlEff.

---

## 2. Interface Context

| Item | Details |
|------|---------|
| Purpose | Case Management system sends requests to MMIS to communicate program enrollment and participant information |
| External System | Wisconsin MMIS |
| Direction | Both (Inbound/Outbound) |
| Transfer Protocol | Webservice (REST API) |
| Endpoint | GainwellConnect |
| Connectivity | SSH Key |
| File Type | JSON |
| Frequency | Real-time |
| Timing | n/a |
| Retry Procedure | TBD. Gainwell Connect help desk: (833) 289-0630 |
| Matching Field (Inbound) | Member ID |
| File Type (Full/Delta) | Delta |
| Last-Edit Field | n/a |
| Deletion Handling | n/a |
| Update Handling | n/a |
| Multi-file Linking | n/a |
| File Naming | n/a |

---

## 3. Requirements

| ID | Description | Notes |
|----|-------------|-------|
| R370 | Data exchanges must comply with CMS security and HIPAA transaction standards. | |
| R385 | Must include various data exchange methods to support program-specific business needs. | |
| R386 | Must allow import and integration of data from multiple sources to support program-specific Care Management System rules. | "Response from MMIS" |
| R388 | Must include matching logic that uses multiple key identifiers when integrating with other data sources. | |
| R394 | Must utilize real-time notification to authorized users in the event of data exchange error or failure. | |
| R411 | Must collect and maintain program-specific reason codes for provider and participant enrollments and disenrollments. Must identify, collect, and maintain authorization status codes and other codes as directed by DHS. | |
| R443 | Must support the ability to create, update or inactivate program enrollment information real-time in MES systems. | |
| R444 | Must incorporate other MES system eligibility and enrollment editing into the Care Management System program enrollment solution. | |
| R455 | Must automate participant authorization changes triggered by program-specific events (case changes, eligibility/functional screen changes, provider changes, reference data changes, service rate changes) as approved by DHS. | |
| R469 | Must support the ability to create, update or inactivate SDPC enrollment information real-time in MES systems. | |
| Exhibit J | 1. MMIS: a. IRIS Enrollment — Two-way real-time web service sharing enrollment info. When a participant is updated in Care Management, a real-time transaction is sent to MMIS which responds with success/failure. b. SDPC Enrollment — Similar to IRIS but a distinct enrollment type. | |

---

## 4. Business Rules

| BR # | Description | Source |
|------|-------------|--------|
| BR-D01-001 | When a participant's "Waiver Enrollment" status change occurs in Blue Compass, the Enrollment Request webservice should be triggered. Applicable status changes: enrollment scheduled, enrollment suspension, change from suspended to enrolled, and involuntary disenrollment. (See "Waiver Enrollment Scenarios.docx") | 20250423 Meeting |
| BR-D01-002 | When a "Waiver Enrolled" participant is transferred to a new FEA or ICA (location assignment), the Enrollment Request webservice should be triggered. | 20250423 Meeting |
| BR-D01-003 | When an update occurs to applicable Participant Address data elements in "Address Node" or "Additional Address Node", the Enrollment Request webservice should be triggered. | 20250423 Meeting |
| BR-D01-004 | When an update occurs to mapped data elements for "FEA Effective Dates" or "FEA Status", the Enrollment Request webservice should be triggered. | 20250423 Meeting |
| BR-D01-005 | The most current "IRIS" Enrollment Span found under "Waiver Enrollment Node" should be sent in the Enrollment Request, even when there's no enrollment change (e.g., Address Change). | 20250423 Meeting |
| BR-D01-006 | When a user updates any mapped data element under the "Demographic Node", the Enrollment Request webservice should NOT be triggered. | 20250423 Meeting |
| BR-D01-007 | When a "Waiver Enrollment" span is end-dated in Blue Compass, an Enrollment webservice request will be triggered to communicate the update to MMIS. | 20250423 Meeting |
| BR-D01-008 | **REMOVED.** The enrollment request will be triggered by a user updating the enrollment record, not by a user populating the "date of death" field on the person profile. | 20250423 Meeting |
| BR-D01-009 | Responses received from MMIS via Enrollment Response webservice should be displayed on the UI for user review. | 20250423 Meeting |
| BR-D01-010 | A participant enrollment span will not be made active unless "Response Status" = "SU" (success) or "SE" (success with errors) is received via the Enrollment Response webservice. | 20250507 Meeting |
| BR-D01-011 | When a participant's SDPC "Waiver Enrollment" status change occurs in Blue Compass, the SDPC Enrollment Request webservice should be triggered. Applicable status changes: enrollment scheduled, enrollment suspension, change from suspended to enrolled, and involuntary disenrollment. | 20250423 Meeting |
| BR-D01-012 | When there is an update to mapped data elements for "SDPC Agency" or "Effective Enrollment Dates", the SDPC Enrollment Request webservice should be triggered. | 20250423 Meeting |
| BR-D01-013 | When a user updates any mapped data element under the "Demographic Node", the SDPC Enrollment Request webservice should NOT be triggered. | 20250423 Meeting |
| BR-D01-014 | Responses received from MMIS via SDPC Enrollment Response should be displayed on the UI for user review. | 20250423 Meeting |
| BR-D01-015 | A participant enrollment span will not be made active unless "Response Status" = "SU" (success) is received via the SDPC Enrollment Response webservice. | 20250507 Meeting |
| BR-D01-016 | If MMIS has a different Medicaid ID on file, the value sent in EnrollmentRequest IdUniqueClient will be returned in EnrollmentResponse SubmittedClientID, and the participant's current Medicaid ID will be returned in EnrollmentResponse IdUniqueClient. The participant's current Medicaid ID should be updated and a notification generated. | n/a |
| BR-D01-017 | When a suspension span is sent to MMIS, the suspension start date must be the Blue Compass suspension start date **plus one calendar day** (participant may have received services on the suspension begin date). The preceding MMIS active span is closed with end date = BC suspension start date. | 20250807 Meeting; 20260617 Meeting |
| BR-D01-018 | When a suspension span is sent to MMIS, the suspension end date must be the Blue Compass suspension end date **minus one calendar day** (participant may have received services on the suspension end date). The MMIS active span after suspense is opened with begin date = BC suspension end date. | 20260617 Meeting |
| BR-D01-019 | Before sending MMIS transactions for a new/updated suspension, Blue Compass must verify the suspension span is **at least 3 calendar days long**. Fewer than 3 days produces an invalid MMIS window. If < 3 days, do not send any MMIS transactions and display an error to the user. | 20260617 Meeting |
| BR-D01-020 | The MMIS Status field value (A, I, or S) is determined by transaction context, not direct mapping from BC enrollment status. **Active (A):** all enrollment span transactions (new enrollments, date changes, closures, post-suspension spans). **Suspended (S):** all suspension span transactions. **Inactive (I):** exclusively to delete a span from MMIS (Referral Withdrawn or removing old-agency span during transfer). BC "Disenrolled" → Status A + TransactionType C (Closure), NOT Status I. | Start-Stop Reasons tab; Decision Tables |
| BR-D01-021 | The MMIS TransactionType field value: **IRIS (EnrollmentRequest):** Open (O) for new span, extending end date, moving begin date, deleting span (with Status I). Closure (C) for shortening end date. **SDPC (SDPCEnrollmentRequest):** Add/Update (A) where IRIS uses Open (O). Closure (C) for shortening end date. | n/a |
| BR-D01-022 | StartReasonCode and StopReasonCode are determined by enrollment scenario: (1) Initial enrollment: Start=2L. (2) Enrolled→Suspended: Stop=2I, Start=2I. (3) Suspended→Enrolled: Stop=2Q, Start=2Q. (4) FEA Transfer: Start=2R, Stop=2R. (5) ICA Transfer: Start=2P, Stop=2P. (6) Disenrollment: Stop determined by BC StatusReasonDisplayName — see Start-Stop Reasons tab. | Start-Stop Reasons tab; AI #334 |
| BR-D01-023 | The residential address sent in Address Node ("IR") is the person's active, primary residential address. If no active primary Physical address exists, omit the Address Node. | |
| BR-D01-024 | The mailing address sent in Additional Address Node ("IM") is the person's active Mailing address. Use primary Mailing address first; if no primary, select active mailing with most recent update date. If no active Mailing address exists, omit the Additional Address Node. | |

---

## 5. EnrollmentRequest (IRIS) — Field Layout

**JSON Root Path:** `ProcessEnrollment\enrollmentRequest\`

### 5.1 Transaction Node

| Field | JSON Element | Type | Len | Req | Default/Values | Source | Mapping Notes |
|-------|-------------|------|-----|-----|----------------|--------|---------------|
| Txn Source | TxnSource | CHAR | 5 | R | "CMMRT" | System Generated | Set to "CMMRT" |
| Txn Date | TxnDate | NUM | 8 | R | | System Generated | CCYYMMDD |
| Txn Time | TxnTime | NUM | 6 | R | | System Generated | HHMMSS |
| Txn Ref Id | TxnRefId | CHAR | 10 | R | | System Generated | S + incremental number, starting from "S000000001" |

### 5.2 Demographic Node

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Id Unique Client | IdUniqueClient | CHAR | 10 | R | PersonModule.PersonMedicaidNumbers.Value | Member ID = MAID | BR-D01-006 |
| Name Last | NameLast | CHAR | 60 | R | PersonModule.Person.NameLastName | First 20 chars used for matching | BR-D01-006 |
| Name First | NameFirst | CHAR | 35 | R | PersonModule.Person.NameFirstName | First 15 chars used for matching | BR-D01-006 |
| Name Mi | NameMi | CHAR | 25 | O | PersonModule.Person.NameMiddleName | | BR-D01-006 |
| Name Suffix | NameSuffix | CHAR | 3 | O | PersonModule.Person.NameSuffixName | Must be in T_RE_CDE_NAME_SUFFIX | BR-D01-006 |
| Date Birth | DateBirth | NUM | 8 | R | PersonModule.Person.BirthDate | CCYYMMDD | BR-D01-006 |
| Num Ssn | NumSsn | NUM | 9 | R | PersonModule.PersonIdentifiers.Value | Zero-padded at beginning | BR-D01-006 |
| Sex | Sex | CHAR | 1 | R | PersonModule.Person.GenderDisplayName | Translate to M/F/U. See Valid Value Mapping "MMIS Gender" | BR-D01-006 |

### 5.3 Address Node (Residential — "IR")

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Address Type | AddressType | CHAR | 2 | C | PersonModule.PersonAddress.AddressTypeDisplayName | "IR" = IRIS Residential. If included, Address2/City/State/ZipCode/County are required. | BR-D01-023 |
| Address 1 | Address1 | CHAR | 30 | C | PersonModule.PersonAddress.PhysicalAddressCareOfName | Care Of line. If empty, populate with spaces. | BR-D01-003, BR-D01-023 |
| Address 2 | Address2 | CHAR | 30 | C | PersonModule.PersonAddress.PhysicalAddressFirstStreetAddress | Street address (required) | BR-D01-003, BR-D01-023 |
| Address 3 | Address3 | CHAR | 30 | C | PersonModule.PersonAddress.PhysicalAddressSecondStreetAddress | Apt/Lot. If empty, populate with spaces. | BR-D01-003, BR-D01-023 |
| City | City | CHAR | 18 | C | PersonModule.PersonAddress.PhysicalAddressCityName | | BR-D01-003, BR-D01-023 |
| State | State | CHAR | 2 | C | PersonModule.PersonAddress.PhysicalAddressStateProvinceDisplayName | Translate to 2-char MMIS state code (65 codes) | BR-D01-003, BR-D01-023 |
| Zip Code | ZipCode | NUM | 5 | C | PersonModule.PersonAddress.PhysicalAddressPostalCode | First 5 chars; remaining 4 → ZipCode4 | BR-D01-003, BR-D01-023 |
| Zip Code 4 | ZipCode4 | NUM | 4 | C | (derived from PostalCode) | Chars 6-9 of postal code | |
| County | County | CHAR | 2 | C | PersonModule.PersonAddress.PhysicalAddressCountyAreaDisplayName | Translate to 2-digit MMIS county code (83 codes). Default '00' if not found. | BR-D01-003, BR-D01-023 |
| Num Phone | NumPhone | NUM | 10 | C | PersonModule.PersonPhones.PhoneNumber | Primary phone (IsPrimary=true). If no primary, priority: Home→Cell→Work. | BR-D01-003 |
| Ind Phone | IndPhone | CHAR | 1 | C | PersonModule.PersonPhones.TypeDisplayName | Translate to H/C/W | BR-D01-003 |

### 5.4 Additional Address Node (Mailing — "IM")

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Additional Address Type | AdditionalAddressType | CHAR | 2 | C | PersonModule.PersonAddress.AddressTypeDisplayName | "IM" = IRIS Mailing. If included, Address2/City/State/ZipCode/County are required. | BR-D01-024 |
| Additional Address 1 | AdditionalAddress1 | CHAR | 30 | C | PersonModule.PersonAddress.PhysicalAddressCareOfName (Mailing) | Care Of line. If empty, send spaces. | BR-D01-003, BR-D01-024 |
| Additional Address 2 | AdditionalAddress2 | CHAR | 30 | C | PersonModule.PersonAddress.PhysicalAddressFirstStreetAddress (Mailing) | Street address (required) | BR-D01-003, BR-D01-024 |
| Additional Address 3 | AdditionalAddress3 | CHAR | 30 | C | PersonModule.PersonAddress.PhysicalAddressSecondStreetAddress (Mailing) | Apt/Lot. If empty, send spaces. | BR-D01-003, BR-D01-024 |
| Additional City | AdditionalCity | CHAR | 18 | C | PersonModule.PersonAddress.PhysicalAddressCityName (Mailing) | | BR-D01-003, BR-D01-024 |
| Additional State | AdditionalState | CHAR | 2 | C | PersonModule.PersonAddress.PhysicalAddressStateProvinceDisplayName (Mailing) | Translate to 2-char MMIS state code | BR-D01-003, BR-D01-024 |
| Additional Zip Code | AdditionalZipCode | NUM | 5 | C | PersonModule.PersonAddress.PhysicalAddressPostalCode (Mailing) | First 5 chars; remaining 4 → AdditionalZipCode4 | BR-D01-003, BR-D01-024 |
| Additional Zip Code 4 | AdditionalZipCode4 | NUM | 4 | C | (derived) | | |
| Additional County | AdditionalCounty | CHAR | 2 | C | PersonModule.PersonAddress.PhysicalAddressCountyAreaDisplayName (Mailing) | Translate to 2-digit MMIS county code. Default '00' if not found. | BR-D01-003, BR-D01-024 |
| Additional Num Phone | AdditionalNumPhone | NUM | 10 | C | PersonModule.PersonPhones.PhoneNumber | Priority: Home→Cell→Work. Send a different number than Address Node primary. | BR-D01-003 |
| Additional Ind Phone | AdditionalIndPhone | CHAR | 1 | C | PersonModule.PersonPhones.TypeDisplayName | Translate to H/C/W | BR-D01-003 |

### 5.5 Waiver Enrollment Node

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Waiver Program Name | WaiverProgramName | CHAR | 10 | R | ProgramModule.Program.DisplayName | Always "IRIS" | BR-D01-005 |
| Waiver Agency ID | WaiverAgencyID | CHAR | 25 | R | OrganizationModule.LocationIdentifiers.Value | ICA Medicaid Provider ID. Lookup: PersonLocationAssignment (type="ICA", active) → LocationKey → LocationIdentifiers (type="Medicaid Provider ID") → Value | BR-D01-002 |
| Transaction Type | TransactionType | CHAR | 1 | R | System Generated | "O"=Open, "C"=Closure. See BR-D01-021. Set to "O" when Status is "I" (Inactive). | BR-D01-021 |
| Date Enrl Eff | DateEnrlEff | NUM | 8 | R | ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate | CCYYMMDD. Date offset rules for suspense per BR-D01-017, BR-D01-019. | BR-D01-017, BR-D01-019 |
| Date Enrl End | DateEnrlEnd | NUM | 8 | R | ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate | CCYYMMDD. Send "12/31/2299" for null end date. Date offset rules for suspense per BR-D01-018, BR-D01-019. | BR-D01-018, BR-D01-019 |
| Status | Status | CHAR | 1 | R | ProgramEnrollmentModule.ProgramEnrollment.StatusDisplayName | "A"=Active, "I"=Inactive, "S"=Suspended. See BR-D01-020. | BR-D01-001, BR-D01-020 |
| Worker ID | WorkerID | CHAR | 8 | R | OrganizationModule.StaffMember.NameFirstName + NameLastName | Lookup: PersonStaffMemberAssignment (role="ICA - IRIS Consultant Level 1" or "Level 2") → StaffMember. Format: {Initial}.{LastName}, truncate to 8 chars. | |
| Start Reason Code | StartReasonCode | CHAR | 2 | R | ProgramEnrollmentModule.ProgramEnrollment.StatusReasonDisplayName | Per BR-D01-022 scenario rules. See Start-Stop Reasons tab. | BR-D01-022 |
| Stop Reason Code | StopReasonCode | CHAR | 2 | R | ProgramEnrollmentModule.ProgramEnrollment.StatusReasonDisplayName | Per BR-D01-022 scenario rules. See Start-Stop Reasons tab. | BR-D01-022 |
| Recertification Due Date | RecertificationDueDate | NUM | 8 | R | PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate | CCYYMMDD | |
| Recertification Completion Date | RecertificationCompletionDate | NUM | 8 | R | ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate | CCYYMMDD. Set to same date as DateEnrlEff. | |
| County of Responsibility | CountyofResponsibility | CHAR | 2 | O | PersonModule.PersonAttributes.ValueDisplayName | Translate to 2-digit MMIS county code. Default '00' if not found. | |

### 5.6 Waiver Parental Fee Node (NOT SENT)

| Field | JSON Element | Type | Len | Notes |
|-------|-------------|------|-----|-------|
| Waiver Parental Fee | WaiverParentalFee | NUM | 7,2 | This segment is not sent. First 5 = dollars, last 2 = cents (implied decimal). |
| Parental Fee Effective Date | ParentalFeeEffectiveDate | NUM | 8 | CCYYMMDD |
| Parental Fee End Date | ParentalFeeEndDate | NUM | 8 | CCYYMMDD |
| Parental Fee Status | ParentalFeeStatus | CHAR | 1 | A=Active, I=Inactive, S=Suspended |

### 5.7 ISP Node (NOT SENT)

| Field | JSON Element | Type | Len | Notes |
|-------|-------------|------|-----|-------|
| Individual Service Plan | IndividualServicePlan | CHAR | 1 | This segment is not sent. I=Initial, R=Recertification, U=Update |
| ISP Completion Date | ISPCompletionDate | NUM | 8 | CCYYMMDD |
| ISP Status | ISPStatus | CHAR | 1 | A=Active, I=Inactive, S=Suspended |

### 5.8 HSV Node (NOT SENT)

| Field | JSON Element | Type | Len | Notes |
|-------|-------------|------|-----|-------|
| Health And Safety Verification | HealthAndSafetyVerification | CHAR | 1 | This segment is not sent. |
| HSV Completion Date | HSVCompletionDate | NUM | 8 | CCYYMMDD |
| HSV Status | HSVStatus | CHAR | 1 | A=Active, I=Inactive, S=Suspended |

### 5.9 FEA Node

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Waiver FEA | WaiverFEA | CHAR | 15 | R | OrganizationModule.OrganizationIdentifiers.Value | Lookup: PersonLocationAssignment (type="FEA", active) → LocationKey → LocationIdentifiers (type="Medicaid Provider ID") → Value | BR-D01-002 |
| FEA Effective Date | FEAEffectiveDate | NUM | 8 | R | PersonModule.PersonLocationAssignment.EffectiveDateRangeStartDate | CCYYMMDD | BR-D01-004 |
| FEA End Date | FEAEndDate | NUM | 8 | R | PersonModule.PersonLocationAssignment.EffectiveDateRangeEndDate | CCYYMMDD. Send "12/31/2299" for active enrollment. | BR-D01-004, BR-D01-007 |
| FEA Status | FEAStatus | CHAR | 1 | R | OrganizationModule.Location.StatusDisplayName | A=Active, I=Inactive, S=Suspended | BR-D01-004 |

### 5.10 Waiver Budget Node (NOT SENT)

| Field | JSON Element | Type | Len | Notes |
|-------|-------------|------|-----|-------|
| Waiver Budget Type | WaiverBudgetType | CHAR | 1 | This segment is not sent. M=Monthly, A=Amended |
| Waiver Budget Amount | WaiverBudgetAmount | NUM | 7,2 | Implied decimal |
| Budget Effective Date | BudgetEffectiveDate | NUM | 8 | CCYYMMDD |
| Budget End Date | BudgetEndDate | NUM | 8 | CCYYMMDD |
| Budget Status | BudgetStatus | CHAR | 1 | A=Active, I=Inactive |

---

## 6. EnrollmentResponse (IRIS) — Field Layout

**JSON Root Path:** `ProcessEnrollmentResult\`

### 6.1 Transaction Response Node

| Field | JSON Element | Type | Len | Req | Target Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Txn Ref Id | TxnRefId | CHAR | 10 | R | ProgramEnrollmentExtension.TxnRefId; SyncTransaction.TxnRefId | Echoed from request | |
| Id Unique Client | IdUniqueClient | CHAR | 10 | R | ProgramEnrollmentExtension.IdUniqueClientIdentifier; SyncTransaction.IdUniqueClientIdentifier; PersonModule.PersonMedicaidNumbers.Value | If new Medicaid ID returned: set new ID effective date = current date, end-date previous ID = current date - 1. | BR-D01-016 |
| Submitted Client ID | SubmittedClientID | CHAR | 10 | R | ProgramEnrollmentExtension.SubmittedClientId; SyncTransaction.SubmittedClientId | Echoed from request | |

### 6.2 Waiver Enrollment Response Node

| Field | JSON Element | Type | Len | Req | Values | Target Table.Column | Related BRs |
|-------|-------------|------|-----|-----|--------|---------------------|-------------|
| Response Status | ResponseStatus | CHAR | 2 | R | SU=Success, SE=Success with Errors, FL=Fail | ProgramEnrollmentExtension.ResponseStatusCode; SyncTransaction.ResponseStatusCode | BR-D01-009, BR-D01-010 |
| Waiver Program Name | WaiverProgramName | CHAR | 10 | R | IRIS | n/a (not captured) | |
| Transaction Type | TransactionType | CHAR | 1 | R | O=Open, C=Closure | ProgramEnrollmentExtension.TransactionTypeCode; SyncTransaction.TransactionTypeCode | |
| Effective Date | EffectiveDate | STRING | 8 | R | CCYYMMDD | ProgramEnrollmentExtension.MmisEffectiveDate; SyncTransaction.MmisEffectiveDate | |
| End Date | EndDate | STRING | 8 | R | CCYYMMDD | ProgramEnrollmentExtension.MmisEndDate; SyncTransaction.MmisEndDate | |

### 6.3 Error Segment Node (0..unbounded)

| Field | JSON Element | Type | Len | Req | Target Table.Column | Related BRs |
|-------|-------------|------|-----|-----|---------------------|-------------|
| Error Code | ErrorCode | STRING | 4 | C | ProgramEnrollmentExtensionMessages.Code; SyncTransactionMessages.Code | BR-D01-009 |
| Error Description | ErrorDescription | CHAR | 75 | C | ProgramEnrollmentExtensionMessages.Description; SyncTransactionMessages.Description | BR-D01-009 |
| Error Type | ErrorType | CHAR | 2 | C | ProgramEnrollmentExtensionMessages.ErrorTypeCode; SyncTransactionMessages.ErrorTypeCode | BR-D01-009 |

**Error Type Values:** 01=Reject Record, 03=Reject Segment, 04=Reject Field

### 6.4 ProgramEnrollmentExtension — Generated Fields (Blue Compass)

| Column | Data Type | Required | Description |
|--------|-----------|----------|-------------|
| ProgramEnrollmentExtensionKey | uniqueidentifier | R | System-generated PK |
| Version | int | R | Row version |
| HasConflict | bit | R | Response conflicts with current enrollment state |
| LastChangeTypeCode | nvarchar(50) | O | Type of enrollment change that triggered last sync |
| LastSuspensionChangeTypeCode | nvarchar(50) | O | Type of suspension change that triggered last sync |
| LastSynchronizedTimestamp | datetime2 | O | Most recent sync with MMIS |
| PreUpdateBeginDate | date | O | Enrollment begin date before update |
| PreUpdateEndDate | date | O | Enrollment end date before update |
| PreUpdateSuspensionStartDate | date | O | Suspension start date before update |
| ProgramEnrollmentKey | uniqueidentifier | R | FK to ProgramEnrollment |
| SiTransactionKeyReference | nvarchar(50) | O | SI transaction reference key |
| EntityCreated/Updated fields | various | R | System audit fields |

### 6.5 SyncTransaction — Generated Fields (Blue Compass)

| Column | Data Type | Required | Description |
|--------|-----------|----------|-------------|
| SyncTransactionKey | uniqueidentifier | R | System-generated PK |
| Version | int | R | Row version |
| ChangeTypeCode | nvarchar(50) | O | Type of enrollment change |
| PreUpdateSuspensionEndDate | date | O | Suspension end date before update |
| PreUpdateSuspensionStartDate | date | O | Suspension start date before update |
| ProgramEnrollmentExtensionKey | uniqueidentifier | R | FK to ProgramEnrollmentExtension |
| RequestJsonTextFile | nvarchar(MAX) | O | Full JSON request payload sent to MMIS |
| SiTransactionKeyReference | nvarchar(50) | O | SI transaction reference key |
| SuspensionChangeTypeCode | nvarchar(50) | O | Type of suspension change |
| Timestamp | datetime2 | R | Transaction timestamp |
| EntityCreated/Updated fields | various | R | System audit fields |

---

## 7. SDPCEnrollmentRequest — Field Layout

**JSON Root Path:** `SDPCEnrollmentRequest\`

### 7.1 Transaction Node

| Field | JSON Element | Type | Len | Req | Default/Values | Source | Mapping Notes |
|-------|-------------|------|-----|-----|----------------|--------|---------------|
| Txn Source | TxnSource | CHAR | 5 | R | "CMMRT" | System Generated | Set to "CMMRT" |
| Txn Date | TxnDate | CHAR | 8 | R | | System Generated | CCYYMMDD |
| Txn Time | TxnTime | CHAR | 6 | R | | System Generated | HHMMSS |
| Txn Ref Id | TxnRefId | CHAR | 10 | R | | System Generated | S + incremental number, starting from "S000000001" |

### 7.2 Demographic Node

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Id Unique Client | IdUniqueClient | CHAR | 10 | R | PersonModule.PersonMedicaidNumbers.Value | Member ID = MAID | BR-D01-013 |
| Name Last | NameLast | CHAR | 60 | R | PersonModule.Person.NameLastName | First 20 chars used for matching | BR-D01-013 |
| Name First | NameFirst | CHAR | 35 | R | PersonModule.Person.NameFirstName | First 15 chars used for matching | BR-D01-013 |
| Name Mi | NameMi | CHAR | 25 | O | PersonModule.Person.NameMiddleName | | BR-D01-013 |
| Date Birth | DateBirth | NUM | 8 | R | PersonModule.Person.BirthDate | CCYYMMDD | BR-D01-013 |
| Num Ssn | NumSsn | CHAR | 9 | R | PersonModule.PersonIdentifiers.Value | Zero-padded at beginning | BR-D01-013 |
| Sex | Sex | CHAR | 1 | R | PersonModule.Person.GenderDisplayName | Translate to M/F/U | BR-D01-013 |

### 7.3 SDPC Enrollment Node (0..unbounded)

| Field | JSON Element | Type | Len | Req | Source Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Waiver Program Name | WaiverProgramName | CHAR | 10 | R | ProgramEnrollmentModule.ProgramEnrollment.DisplayName | Always "IRIS" | |
| SDPC Agency ID | SDPCAgencyID | CHAR | 25 | R | OrganizationModule.LocationIdentifiers.Value | Lookup: PersonLocationAssignment (type="SDPC", active) → LocationKey → LocationIdentifiers (type="Medicaid Provider ID") → Value | BR-D01-012 |
| Transaction Type | TransactionType | CHAR | 1 | R | System Generated | "A"=Add/Update, "C"=Closure. See BR-D01-021. | BR-D01-021 |
| Date SDPC Effective | DateSDPCEffective | NUM | 8 | R | ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate | CCYYMMDD. Date offset rules for suspense per BR-D01-017, BR-D01-019. | BR-D01-012, BR-D01-017, BR-D01-019 |
| Date SDPC End | DateSDPCEnd | NUM | 8 | R | ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate | CCYYMMDD. Send "12/31/2299" for null end date. Date offset rules per BR-D01-018, BR-D01-019. | BR-D01-012, BR-D01-018, BR-D01-019 |
| Status | Status | CHAR | 1 | R | ProgramEnrollmentModule.ProgramEnrollment.StatusDisplayName | "A"=Active, "I"=Inactive, "S"=Suspended. See BR-D01-020. | BR-D01-011, BR-D01-020 |
| Worker ID | WorkerID | CHAR | 15 | R | OrganizationModule.StaffMember.NameFirstName + NameLastName | Lookup: PersonStaffMemberAssignment (role="SDPC Nurse", IsPrimary=true) → StaffMember. Format: {Initial}.{LastName}, truncate to 15 chars. | |

---

## 8. SDPCEnrollmentResponse — Field Layout

**JSON Root Path:** `ProcessSDPCEnrollmentResult\`

### 8.1 Transaction Node

| Field | JSON Element | Type | Len | Req | Target Table.Column | Mapping Notes | Related BRs |
|-------|-------------|------|-----|-----|---------------------|---------------|-------------|
| Txn Ref Id | TxnRefId | CHAR | 10 | R | ProgramEnrollmentExtension.TxnRefId; SyncTransaction.TxnRefId | Echoed from request | |
| Id Unique Client | IdUniqueClient | CHAR | 10 | R | ProgramEnrollmentExtension.IdUniqueClientIdentifier; SyncTransaction.IdUniqueClientIdentifier | | BR-D01-016 |

### 8.2 SDPC Enrollment Response Node (0..unbounded)

| Field | JSON Element | Type | Len | Req | Values | Target Table.Column | Related BRs |
|-------|-------------|------|-----|-----|--------|---------------------|-------------|
| Response Status | ResponseStatus | CHAR | 2 | R | SU=Success, FL=Fail | ProgramEnrollmentExtension.ResponseStatusCode; SyncTransaction.ResponseStatusCode | BR-D01-014, BR-D01-015 |
| Waiver Program Name | WaiverProgramName | CHAR | 10 | R | | n/a (not captured) | |
| SDPC Agency ID | SDPCAgencyID | CHAR | 25 | R | | n/a (not captured, echoed from request) | |
| Transaction Type | TransactionType | CHAR | 1 | R | A=Add/Update, C=Closure | ProgramEnrollmentExtension.TransactionTypeCode; SyncTransaction.TransactionTypeCode | |
| Date SDPC Effective | DateSDPCEffective | CHAR | 8 | R | CCYYMMDD | ProgramEnrollmentExtension.MmisEffectiveDate; SyncTransaction.MmisEffectiveDate | |
| Date SDPC End | DateSDPCEnd | CHAR | 8 | R | CCYYMMDD | ProgramEnrollmentExtension.MmisEndDate; SyncTransaction.MmisEndDate | |
| Status | Status | CHAR | 1 | R | A, I, S | n/a (echoed, not captured) | |
| Worker ID | WorkerID | CHAR | 15 | R | | n/a (echoed, not captured) | |

### 8.3 Error Segment Node (0..unbounded)

| Field | JSON Element | Type | Len | Req | Target Table.Column | Related BRs |
|-------|-------------|------|-----|-----|---------------------|-------------|
| Error Code | ErrorCode | CHAR | 4 | O | ProgramEnrollmentExtensionMessages.Code; SyncTransactionMessages.Code | BR-D01-014 |
| Error Description | ErrorDescription | CHAR | 75 | O | ProgramEnrollmentExtensionMessages.Description; SyncTransactionMessages.Description | BR-D01-014 |

**Note:** SDPC response does not include ErrorType field (unlike IRIS response).

### 8.4 SDPC ProgramEnrollmentExtension — Generated Fields

Same structure as IRIS (Section 6.4) with the addition of:
- **SubmittedClientId** (nvarchar 10, O): Stores the Medicaid ID originally submitted in the request.

### 8.5 SDPC SyncTransaction — Generated Fields

Same structure as IRIS (Section 6.5) with:
- **SubmittedClientId** (nvarchar 10, O): Stores the Medicaid ID originally submitted in the request.

---

## 9. Start-Stop Reason Codes

### 9.1 Scenario-Based Reason Code Assignment (per BR-D01-022)

| Scenario | Close Existing Span | Open New Span |
|----------|-------------------|---------------|
| **Initial Enrollment** | — | StartReasonCode = **2L** |
| **Enrolled → Suspended** | StopReasonCode = **2I** | StartReasonCode = **2I**, StopReasonCode = **2I** |
| **Suspended → Enrolled** | StopReasonCode = **2Q** | StartReasonCode = **2Q** |
| **FEA Transfer (Enrolled)** | StopReasonCode = **2R** | StartReasonCode = **2R** |
| **FEA Transfer (Suspended)** | StopReasonCode = **2R** | StartReasonCode = **2R**, StopReasonCode = **2I** |
| **ICA Transfer (Enrolled)** | StopReasonCode = **2P** | StartReasonCode = **2P** |
| **ICA Transfer (Suspended)** | StopReasonCode = **2P** | StartReasonCode = **2P**, StopReasonCode = **2I** |
| **Disenrollment** | StopReasonCode = per StatusReasonDisplayName (see 9.2) | — |

### 9.2 Complete MMIS Reason Code Reference

| Code | Description | Type (S=Start, T=Stop, B=Both) |
|------|-------------|------|
| 2B | Budget Authority Abuse/Mismanagement | T |
| 2C | Employer Authority Abuse/Mismanagement | T |
| 2E | Program Recertification Not Completed | T |
| 2F | Customer Service Issue with FEA | T |
| 2I | Suspended | B |
| 2L | New Enrollment | S |
| 2M | Failure to Utilize IRIS Funding | T |
| 2O | Program Noncompliance | T |
| 2P | ICA Transfer | B |
| 2Q | Enrollment from Suspension | S |
| 2R | FEA Transfer | B |
| 2W | Reason Not Provided in Source System | T |
| 64 | DOD (Deceased) | T |
| 65 | No Medicaid Eligibility | T |
| 66 | Not Functionally Eligible | T |
| 67 | Released from Incarceration | S |
| 70 | Moved to Another Service Region | T |
| 72 | No Reason Provided | T |
| 7A | Provider Network Concern/Access Concern | T |
| 7B | Services/Care Plan Concern | T |
| 7C | Choosing New Option | T |
| 7D | Choosing FFS MA | T |
| 7E | Dissatisfied with Cost Share | T |
| 7F | No Contact or No Longer Accepting Services | T |
| 7H | Unable to Assure Member Safety | T |
| 7J | Nonpayment of Cost Share | T |
| 7K | Invalid Setting | T |
| 7L | Customer Service Issue with MCO/ICA | T |
| 7M | NH/Hospice Services/Institutional Care | T |
| 7N | No Annual Screen Completed | T |
| 7R | Disenroll due to Waiver Enrollment Update | T |
| 7S | Credible Allegation of Fraud | T |
| 7T | Noncompliance with EVV Requirements | T |

### 9.3 Disenrollment Stop Reason Codes (subset used for Disenrollment scenario)

Per the Start-Stop Reasons tab, the following codes are valid **StopReasonCodes for disenrollment**: 2B, 2C, 2F, 2M, 2O, 2W, 64, 65, 70, 72, 7A, 7B, 7C, 7D, 7E, 7F, 7H, 7J, 7K, 7L, 7N, 7S

### 9.4 Notice Mapping (from Appendix C — IRIS Enrollment/Disenrollment Reason Codes)

| Notice ID | Notice Name | Frequency | Reason Codes |
|-----------|-------------|-----------|--------------|
| MGD-9730-R | Confirmation Notice Exclude | — | 2Q (Enrollment from Suspension) |
| MGD-9730-R | IRIS Confirmation Notice | Weekly | 2L (New Enrollment) |
| MGD-9740-R | IRIS Loss of MA Eligibility Notice (F-02753) | N/A | 65, 7K |
| MGD-9750-R | IRIS Loss of Functional Eligibility Notice (F-02752) | N/A | 66, 7N |
| MGD-9760-R | IRIS Participant Requested Disenrollment (F-02754) | Weekly | 70, 72, 2F, 7A, 7B, 7C, 7D, 7E, 7L |
| MGD-9770-R | IRIS ICA Requested Disenrollment (F-02756) | Weekly | 2O, 2B, 2C, 7F, 7H, 7J, 2M, 7S, 7T |

---

## 10. Reference List Values

### 10.1 T_RE_CDE_ADR_USAGE (Address Usage Codes)

| Code | Description |
|------|-------------|
| A | Prior Authorization |
| E | Emergency Contact |
| H | Household Residence |
| P | PHI Address |
| PY | SDX Representative Payee |
| R | CARES Residential address |
| Z | Work |
| SM | SDX Mailing Address |
| AP | HDAP |
| K | Katie Beckett Address |
| F | FosterCare Residential Address |
| **IM** | **IRIS Mailing Address** |
| **IR** | **IRIS Residential Address** |

### 10.2 T_CDE_PHONE (Phone Type Codes)

| SAK | Code | Description | MMIS Mapping |
|-----|------|-------------|--------------|
| 1 | A | Fax | — |
| 2 | B | No Phone | — |
| 3 | C | Cellular | **C** (Mobile) |
| 4 | F | Friend | — |
| 5 | H | Home | **H** (Home) |
| 6 | N | Neighbor | — |
| 7 | O | Other | — |
| 8 | P | Pager | — |
| 9 | R | Relative | — |
| 10 | S | Spouse Work | — |
| 11 | W | Work | **W** (Work) |
| 12 | U | Unknown | — |

**MMIS Phone Type mapping:** H=Home, C=Mobile, W=Work

### 10.3 T_RE_CDE_NAME_SUFFIX

| Code | Description |
|------|-------------|
| I | THE FIRST |
| II | THE SECOND |
| III | THE THIRD |
| IV | THE FOURTH |
| JR | JUNIOR |
| SR | SENIOR |
| V | THE FIFTH |
| VI | THE SIXTH |
| VII | THE SEVENTH |

---

## 11. Error Codes and Descriptions

### 11.1 GainwellConnect API Errors (All APIs)

| Code | Description |
|------|-------------|
| 1008 | BusinessFlow: does not have a value in the enumeration |
| 1013 | AdditionalModuleTransactionId: may only be 50 characters long |
| 1028 | StateCode: is missing but it is required |
| 1034 | RequestTimestamp: is an invalid date-time |

### 11.2 Enrollment-Specific Error Codes

| Code | Description | Applies To | Blue Compass Source (Carity DB) |
|------|-------------|------------|--------------------------------|
| 9101 | THE MAID IS MISSING OR INVALID | SDPC Only | `PersonModule.PersonMedicaidNumbers.Value` — Active Medicaid ID |
| 9102 | MEMBER NOT FOUND IN INTERCHANGE | SDPC Only | N/A — MMIS internal lookup failure |
| 9103 | LAST NAME IS MISSING | SDPC Only | `PersonModule.Person.NameLastName` |
| 9104 | FIRST NAME IS MISSING | SDPC Only | `PersonModule.Person.NameFirstName` |
| 9105 | SSN IS MISSING OR INVALID | SDPC Only | `PersonModule.PersonIdentifiers.Value` (Type="Social Security Number") |
| 9106 | DATE OF BIRTH IS MISSING OR INVALID | SDPC Only | `PersonModule.Person.BirthDate` |
| 9107 | GENDER CODE IS INVALID (NOT M, F, OR U) | SDPC Only | `PersonModule.Person.BirthAssignedGenderDisplayName` → M/F/U |
| 9108 | ADDRESS TYPE IS INVALID OR MISSING | Both | `PersonModule.PersonAddress.AddressTypeDisplayName` → "IR" |
| 9109 | STREET ADDRESS 2 IS MISSING | Both | `PersonModule.PersonAddress.PhysicalAddressFirstStreetAddress` (Residential, IsPrimary=1) |
| 9110 | CITY IS MISSING | Both | `PersonModule.PersonAddress.PhysicalAddressCityName` (Residential) |
| 9111 | STATE IS MISSING OR INVALID | Both | `PersonModule.PersonAddress.PhysicalAddressStateProvinceDisplayName` → 2-char code |
| 9112 | ZIPCODE IS MISSING OR INVALID | Both | `PersonModule.PersonAddress.PhysicalAddressPostalCode` (first 5 chars) |
| 9113 | COUNTY IS MISSING OR INVALID | Both | `PersonModule.PersonAddress.PhysicalAddressCountyAreaDisplayName` → 2-digit code |
| 9114 | PHONE TYPE IS MISSING | Both | `PersonModule.PersonPhones.TypeDisplayName` (primary) → H/C/W |
| 9115 | PHONE NUMBER IS MISSING OR INVALID | Both | `PersonModule.PersonPhones.PhoneNumber` (IsPrimary=1) |
| 9116 | ADDITIONAL ADDRESS TYPE IS INVALID OR MISSING | Both | `PersonModule.PersonAddress.AddressTypeDisplayName` (Mailing) → "IM" |
| 9117 | ADDITIONAL STREET ADDRESS 2 IS MISSING | Both | `PersonModule.PersonAddress.PhysicalAddressFirstStreetAddress` (Mailing) |
| 9118 | ADDITIONAL CITY IS MISSING | Both | `PersonModule.PersonAddress.PhysicalAddressCityName` (Mailing) |
| 9119 | ADDITIONAL STATE IS MISSING OR INVALID | Both | `PersonModule.PersonAddress.PhysicalAddressStateProvinceDisplayName` (Mailing) |
| 9120 | ADDITIONAL ZIPCODE IS MISSING OR INVALID | Both | `PersonModule.PersonAddress.PhysicalAddressPostalCode` (Mailing, first 5) |
| 9121 | ADDITIONAL COUNTY IS MISSING OR INVALID | Both | `PersonModule.PersonAddress.PhysicalAddressCountyAreaDisplayName` (Mailing) |
| 9122 | ADDITIONAL PHONE TYPE IS MISSING | Both | `PersonModule.PersonPhones.TypeDisplayName` (secondary) |
| 9123 | ADDITIONAL PHONE NUMBER IS MISSING OR INVALID | Both | `PersonModule.PersonPhones.PhoneNumber` (secondary) |
| 9124 | THE COUNTY OF RESPONSIBILITY IS INVALID | Both | `PersonModule.PersonAttributes.ValueDisplayName` (Type="County of Responsibility") |
| 9125 | THE WAIVER PROGRAM IS MISSING OR INVALID | SDPC Only | `ProgramModule.Program.DisplayName` |
| 9126 | THE WAIVER AGENCY ID IS MISSING OR INVALID | Both | `OrganizationModule.LocationIdentifiers.Value` via PersonLocationAssignment (type="ICA") |
| 9127 | INCOMING WAIVER ENROLLMENT OVERLAPS ENROLLMENT FOR THE SAME WAIVER PROGRAM | Both | N/A — MMIS state: overlapping span for same program |
| 9128 | INCOMING WAIVER ENROLLMENT OVERLAPS ENROLLMENT FOR ANOTHER WAIVER PROGRAM | Both | N/A — MMIS state: overlapping span for another program |
| 9129 | THE WAIVER ENROLLMENT EFFECTIVE DATE IS MISSING OR INVALID | Both | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeStartDate` |
| 9130 | THE WAIVER ENROLLMENT END DATE IS MISSING OR INVALID | Both | `ProgramEnrollmentModule.ProgramEnrollment.EnrollmentDateRangeEndDate` |
| 9131 | THE WAIVER ENROLLMENT END DATE CANNOT BE BEFORE THE EFFECTIVE DATE | Both | EnrollmentDateRangeEndDate < EnrollmentDateRangeStartDate |
| 9132 | THE WAIVER ENROLLMENT STATUS IS MISSING OR INVALID | Both | `ProgramEnrollmentModule.ProgramEnrollment.StatusDisplayName` → A/I/S |
| 9133 | THE WORKER ID IS INVALID OR MISSING | SDPC Only | `PersonModule.PersonStaffMemberAssignment` → WorkerID |
| 9134 | THE START REASON CODE IS MISSING OR INVALID | Both | System-generated per BR-D01-022 (2L, 2I, 2P, 2Q, 2R) |
| 9135 | THE STOP REASON CODE IS INVALID | Both | System-generated per BR-D01-022 |
| 9136 | THE RECERTIFICATION COMPLETION DATE IS MISSING OR INVALID | Both | EnrollmentDateRangeStartDate (RecertCompletionDate = DateEnrlEff) |
| 9137 | THE RECERTIFICATION DUE DATE IS INVALID | Both | `PersonCenteredPlanModule.PersonCenteredPlan.EffectiveDateRangeEndDate` |
| 9138 | THE PARENTAL FEE AMOUNT IS MISSING OR INVALID | Both | N/A — Parental Fee NOT SENT |
| 9139 | THE PARENTAL FEE EFFECTIVE DATE IS MISSING OR INVALID | Both | N/A — Parental Fee NOT SENT |
| 9140 | THE PARENTAL FEE END DATE IS MISSING OR INVALID | Both | N/A — Parental Fee NOT SENT |
| 9141 | THE PARENTAL FEE STATUS IS MISSING OR INVALID | Both | N/A — Parental Fee NOT SENT |
| 9142 | INCOMING PARENTAL FEE DATES DO NOT SPAN THE ENROLLMENT PERIOD | Both | N/A — Parental Fee NOT SENT |
| 9143 | INCOMING PARENTAL FEE STATUS DOES NOT MATCH THE WAIVER ENROLLMENT STATUS | Both | N/A — Parental Fee NOT SENT |
| 9144 | INDIVIDUAL SERVICE PLAN TYPE IS MISSING OR INVALID | Both | N/A — ISP segment NOT SENT |
| 9145 | THE INDIVIDUAL SERVICE PLAN COMPLETION DATE IS MISSING OR INVALID | Both | N/A — ISP segment NOT SENT |
| 9146 | INDIVIDUAL SERVICE PLAN STATUS IS MISSING OR INVALID | Both | N/A — ISP segment NOT SENT |
| 9147 | INCOMING ISP STATUS DOES NOT MATCH THE WAIVER ENROLLMENT STATUS | Both | N/A — ISP segment NOT SENT |
| 9148 | THE HEALTH AND SAFETY VERIFICATION TYPE IS MISSING OR INVALID | Both | N/A — HSV segment NOT SENT |
| 9149 | THE HEALTH AND SAFETY VERIFICATION COMPLETION DATE IS MISSING OR INVALID | Both | N/A — HSV segment NOT SENT |
| 9150 | THE HEALTH AND SAFETY VERIFICATION STATUS IS MISSING OR INVALID | Both | N/A — HSV segment NOT SENT |
| 9151 | INCOMING HSV STATUS DOES NOT MATCH THE WAIVER ENROLLMENT STATUS | Both | N/A — HSV segment NOT SENT |
| 9152 | THE ID OF THE FISCAL EMPLOYER AGENCY IS MISSING OR INVALID | Both | `OrganizationModule.LocationIdentifiers.Value` via PersonLocationAssignment (type="FEA") |
| 9153 | THE EFFECTIVE DATE OF THE FISCAL EMPLOYER AGENCY IS MISSING OR INVALID | Both | `PersonModule.PersonLocationAssignment.EffectiveDateRangeStartDate` (FEA) |
| 9154 | THE END DATE OF THE FISCAL EMPLOYER AGENCY IS MISSING OR INVALID | Both | `PersonModule.PersonLocationAssignment.EffectiveDateRangeEndDate` (FEA) |
| 9155 | THE FISCAL EMPLOYER AGENCY STATUS IS MISSING OR INVALID | Both | FEA Location StatusDisplayName → A/I/S |
| 9156 | INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD | Both | FEA dates vs enrollment period mismatch |
| 9157 | INCOMING FEA STATUS DOES NOT MATCH THE WAIVER ENROLLMENT STATUS | Both | FEA status vs enrollment status mismatch |
| 9158 | THE WAIVER BUDGET TYPE IS MISSING OR INVALID | Both | N/A — Budget segment NOT SENT |
| 9159 | THE WAIVER BUDGET AMOUNT IS MISSING OR MUST BE GREATER THAN 0 | Both | N/A — Budget segment NOT SENT |
| 9160 | THE WAIVER BUDGET EFFECTIVE DATE IS MISSING OR INVALID | Both | N/A — Budget segment NOT SENT |
| 9161 | THE WAIVER BUDGET END DATE IS MISSING OR INVALID | Both | N/A — Budget segment NOT SENT |
| 9162 | THE WAIVER BUDGET STATUS IS MISSING OR INVALID | Both | N/A — Budget segment NOT SENT |
| 9163 | INCOMING WAIVER BUDGET DATES DO NOT SPAN THE ENROLLMENT PERIOD | Both | N/A — Budget segment NOT SENT |
| 9164 | INCOMING BUDGET STATUS DOES NOT MATCH THE WAIVER ENROLLMENT STATUS | Both | N/A — Budget segment NOT SENT |
| 9165 | THE SUSPENSION PERIOD CANNOT BE GREATER THAN 90 DAYS | Both | Suspension duration > 90 days (from ProgramEnrollmentSuspension dates) |
| 9166 | THE SUSPENSION EFFECTIVE DATE CANNOT BE GREATER THAN 365 DAYS IN THE PAST | Both | Suspension effective date > 365 days in past |
| 9167 | THE SUSPENSION EFFECTIVE DATE CANNOT BE GREATER THAN 90 DAYS IN THE FUTURE | Both | Suspension effective date > 90 days in future |
| 9168 | NO WAIVER ENROLLMENT FOUND TO SUSPEND | Both | N/A — MMIS state: no enrollment span to suspend |
| 9169 | NO MATCHING WAIVER ENROLLMENT FOUND TO INACTIVATE | Both | N/A — MMIS state: no span to inactivate |
| 9170 | UNIQUE MEMBER CANNOT BE IDENTIFIED | SDPC Only | N/A — MMIS internal |
| 9171 | NO WAIVER ENROLLMENT FOUND TO CLOSE | Both | N/A — MMIS state: no span to close |
| 9172 | INCOMING WAIVER AGENCY OVERLAPS ENROLLMENT UNDER A DIFFERENT AGENCY | Both | N/A — MMIS state: agency overlap |
| 9173 | INCOMING WAIVER ENROLLMENT OVERLAPS WITH MCO ENROLLMENT | Both | N/A — MMIS state: MCO overlap |
| 9174 | INCOMING WAIVER ENROLLMENT OVERLAPS WITH HMO ENROLLMENT | Both | N/A — MMIS state: HMO overlap |
| 9175 | SUSPENSION NOT ALLOWED | Both | N/A — MMIS business rule |
| 9176 | PARENTAL FEE NOT ALLOWED | Both | N/A — segments NOT SENT |
| 9177 | INDIVIDUAL SERVICE PLAN NOT ALLOWED | Both | N/A — segments NOT SENT |
| 9178 | HEALTH AND SAFETY VERIFICATION NOT ALLOWED | Both | N/A — segments NOT SENT |
| 9179 | FISCAL EMPLOYER AGENCY IS NOT ALLOWED | Both | N/A — segments NOT SENT |
| 9180 | WAIVER BUDGET NOT ALLOWED | Both | N/A — segments NOT SENT |
| 9181 | THE MEMBER DOES NOT FALL WITHIN THE AGE RANGE OF THE WAIVER PROGRAM | Both | N/A — MMIS validates age from BirthDate |
| 9182 | INCOMING WAIVER ENROLLMENT OVERLAPS ENROLLMENT FOR THE SAME WAIVER AGENCY | Both | N/A — MMIS state: same agency overlap |
| 9183 | THE MEMBER DOES NOT HAVE VALID LEVEL OF CARE ON FILE | Both | N/A — MMIS internal: level of care |
| 9184 | THE MEMBER DOES NOT HAVE VALID FINANCIAL ELIGIBILITY ON FILE | Both | N/A — MMIS internal: financial eligibility |
| 9185 | INVALID RECORD LENGTH | Both | N/A — Technical: malformed payload |
| 9186 | TRANSACTION SOURCE IS INVALID OR MISSING | SDPC Only | TxnSource = "CMMRT" (system-generated) |
| 9187 | TRANSACTION TIME STAMP IS MISSING | SDPC Only | TxnDate + TxnTime (system-generated) |
| 9188 | TRANSACTION REFERENCE ID IS MISSING | SDPC Only | TxnRefId (system-generated) |
| 9189 | A STOP REASON CODE IS REQUIRED WHEN THE END DATE DOES NOT EQUAL 12/31/2299 | Both | StopReasonCode required when EndDate ≠ "22991231" |
| 9190 | RECERTIFICATION COMPLETION DATE CANNOT BE BEFORE ENROLLMENT EFFECTIVE DATE | Both | Should not occur (RecertCompletion = DateEnrlEff) |
| 9191 | RECERTIFICATION COMPLETION DATE CANNOT BE AFTER ENROLLMENT END DATE | Both | Should not occur (RecertCompletion = DateEnrlEff) |
| 9192 | INVALID TRANSACTION TYPE | SDPC Only | TransactionType (system-generated) |
| 9193 | INVALID TRANSACTION | SDPC Only | N/A — MMIS internal |
| 9194 | PARENTAL FEE SEGMENT IS MISSING | Both | N/A — segments NOT SENT or expected by MMIS |
| 9195 | INDIVIDUAL SERVICE PLAN SEGMENT IS MISSING | Both | N/A — segments NOT SENT or expected by MMIS |
| 9196 | HEALTH AND SAFETY VERIFICATION SEGMENT IS MISSING | Both | N/A — segments NOT SENT or expected by MMIS |
| 9197 | FISCAL EMPLOYER AGENCY SEGMENT IS MISSING | Both | N/A — segments NOT SENT or expected by MMIS |
| 9198 | WAIVER BUDGET SEGMENT IS MISSING | Both | N/A — segments NOT SENT or expected by MMIS |
| 9199 | RECERTIFICATION COMPLETION DATE CANNOT BE IN THE FUTURE | Both | EnrollmentDateRangeStartDate in the future (ISP start must be past) |
| 9200 | THE ADDRESS TYPE DOES NOT MATCH THE INCOMING SOURCE | Both | AddressType translation mismatch |
| 9201 | CLOSURE RECORD WITH INACTIVE STATUS NOT ALLOWED | Both | TransactionType="C" with Status="I" conflict |
| 9202 | RECERTIFICATION DUE DATE CANNOT BE BEFORE THE ENROLLMENT EFFECTIVE DATE | Both | ISP end < enrollment start |
| 9203 | RECERTIFICATION DUE DATE CANNOT BE BEYOND THE ENROLLMENT END DATE | Both | ISP end > enrollment end |
| 9204 | RECERTIFICATION DUE DATE CANNOT BE IN PAST FOR AN ONGOING/FUTURE ENROLLMENT | Both | ISP end in past but enrollment ongoing |
| 9205 | CANNOT ENROLL DUE TO OVERLAPPING PEND LIST RECORD ON FILE | Both | N/A — MMIS state: pend/wait list blocking |
| 9206 | CANNOT ENROLL DUE TO OVERLAPPING WAIT LIST RECORD ON FILE | Both | N/A — MMIS state: pend/wait list blocking |
| 9210 | SDPC AGENCY ID IS MISSING OR INVALID | SDPC Only | SDPC Agency LocationIdentifiers.Value |
| 9211 | INCOMING SDPC ENROLLMENT OVERLAPS EXISTING SDPC ENROLLMENT | SDPC Only | N/A — MMIS state: SDPC overlap |
| 9212 | SDPC ENROLLMENT EFFECTIVE DATE IS MISSING OR INVALID | SDPC Only | EnrollmentDateRangeStartDate (SDPC) |
| 9213 | SDPC ENROLLMENT END DATE IS MISSING OR INVALID | SDPC Only | EnrollmentDateRangeEndDate (SDPC) |
| 9214 | SDPC ENROLLMENT END DATE CANNOT BE BEFORE THE EFFECTIVE DATE | SDPC Only | SDPC end < start |
| 9215 | SDPC ENROLLMENT STATUS IS MISSING OR INVALID | SDPC Only | SDPC StatusDisplayName → A/I/S |
| 9216 | INCOMING SDPC DATES DO NOT FALL WITHIN THE WAIVER ENROLLMENT PERIOD | SDPC Only | SDPC dates outside parent IRIS period |
| 9217 | NO MATCHING SDPC ENROLLMENT FOUND TO INACTIVATE | SDPC Only | N/A — MMIS state |
| 9218 | SDPC ENROLLMENT NOT FOUND TO CLOSE | SDPC Only | N/A — MMIS state |
| 9219 | SDPC ENROLLMENT OVERLAPS MULTIPLE SDPC ENROLLMENT SEGMENTS | SDPC Only | N/A — MMIS state |
| 9997 | MEMBER NOT AVAILABLE IN FSIA | SDPC Only | N/A — MMIS internal |
| 9999 | SERVICE UNAVAILABLE | SDPC Only | N/A — MMIS system error |

---

## 12. Error Handling (Placeholder — To Be Populated During Development)

### System Errors
| Code | Error Message | Corrective Action |
|------|---------------|-------------------|
| SE-001-001 | TBD | TBD |
| SE-001-002 | TBD | TBD |
| SE-001-003 | TBD | TBD |

### Rule Violations
| Code | Error Message | Corrective Action | Related BRs |
|------|---------------|-------------------|-------------|
| RV-001-001 | TBD | TBD | |
| RV-001-002 | TBD | TBD | |
| RV-001-003 | TBD | TBD | |

---

## 13. Key Implementation Notes

1. **High End Date:** Use "12/31/2299" (CCYYMMDD = 22991231) when an enrollment or FEA end date is null (active/open-ended).
2. **Suspension Date Offsets (BR-D01-017/018/019):**
   - MMIS suspension start = BC suspension start + 1 day
   - MMIS suspension end = BC suspension end - 1 day
   - Minimum BC suspension span: 3 calendar days (otherwise do not send)
3. **Status/TransactionType Logic (BR-D01-020/021):**
   - Disenrolled → Status=A, TransactionType=C (NOT Status=I)
   - Status=I is exclusively for deleting a span (Referral Withdrawn or old agency in transfer)
   - IRIS uses O/C; SDPC uses A/C for TransactionType
4. **Medicaid ID Swap (BR-D01-016):** When response IdUniqueClient ≠ request IdUniqueClient, update stored Medicaid ID and generate notification.
5. **Address Selection (BR-D01-023/024):**
   - Address Node = active, primary residential address (omit if none)
   - Additional Address Node = active mailing address (primary first, else most recent; omit if none)
6. **Segments NOT Sent:** Waiver Parental Fee, ISP, HSV, Waiver Budget nodes are defined in the layout but are not sent in current implementation.
7. **SDPC Response Acceptance:** Only "SU" activates enrollment (no "SE" for SDPC, unlike IRIS which accepts both "SU" and "SE").

---

*End of document.*
