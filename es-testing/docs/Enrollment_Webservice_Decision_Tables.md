# Enrollment Webservice Decision Tables

**Feature:** Enrollment Service  
**Source:** Enrollment_Webservice_Decision_Tables_20260622.xlsx  
**Last Updated:** Various dates per sheet (most recent: 07/18/2026)

---

## Table of Contents

- [S100 — Start (Processing Flow Initialization)](#s100--start)
- [S200 — Calculate MMIS IRIS Spans](#s200--calculate-mmis-iris-spans)
- [S210 — Calculate MMIS SDPC Spans](#s210--calculate-mmis-sdpc-spans)
- [S220 — Enroll Add/Update](#s220--enroll-addupdate)
- [S230 — Suspense Update](#s230--suspense-update)
- [S240 — Suspense Add](#s240--suspense-add)
- [S250 — Location Assignment Update](#s250--location-assignment-update)
- [S255 — Resend Span with New Agency](#s255--resend-span-with-new-agency)
- [S300 — Create New Enrollment Span](#s300--create-new-enrollment-span)
- [S310 — Delete Enrollment Span](#s310--delete-enrollment-span)
- [S340 — Enrollment End Date Change to Earlier Date](#s340--enrollment-end-date-change-to-earlier-date)
- [S350 — Enrollment End Date Change to Later Date](#s350--enrollment-end-date-change-to-later-date)
- [S360 — Create Enrollment Span After Suspension](#s360--create-enrollment-span-after-suspension)
- [S400 — Update Span-A End Date](#s400--update-span-a-end-date)
- [S410 — Delete Suspense Span](#s410--delete-suspense-span)
- [S440 — Suspense End Date Change to Earlier Date](#s440--suspense-end-date-change-to-earlier-date)
- [S445 — Suspense End Date Change to Later Date](#s445--suspense-end-date-change-to-later-date)
- [S470 — Update Span-A End Date to Later Date](#s470--update-span-a-end-date-to-later-date)
- [S500 — Close Span-A Before Suspense](#s500--close-span-a-before-suspense)
- [S510 — Add Suspense Span](#s510--add-suspense-span)
- [S520 — Create Span-C After Suspense](#s520--create-span-c-after-suspense)
- [S600 — Close Span-B for Agency Change](#s600--close-span-b-for-agency-change)
- [S610 — Create Active Span with New Agency](#s610--create-active-span-with-new-agency)
- [S620 — Create Suspended Span with New Agency](#s620--create-suspended-span-with-new-agency)
- [S700 — Address-Only Update](#s700--address-only-update)

---

## S100 — Start

**Description:** This page represents the initialization of processing flow.  
**Last Update:** 03/18/2026

### Conditions

| # | Condition | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|-----------|---|---|---|---|---|---|---|---|---|----|----|
| 1 | A new IRIS enrollment table entry is added | Y | N | N | N | N | N | N | N | N | N | N |
| 2 | An existing IRIS enrollment table entry is updated | N | Y | N | N | N | N | N | N | N | N | N |
| 3 | A new IRIS suspension table entry is added | N | N | Y | N | N | N | N | N | N | N | N |
| 4 | An existing IRIS suspension table entry is updated | N | N | N | Y | N | N | N | N | N | N | N |
| 5 | A participant's FEA assignment is updated | N | N | N | N | Y | N | N | N | N | N | N |
| 6 | A participant's ICA assignment is updated | N | N | N | N | N | Y | N | N | N | N | N |
| 7 | A new SDPC enrollment table entry is added | N | N | N | N | N | N | Y | N | N | N | N |
| 8 | An existing SDPC enrollment table entry is updated | N | N | N | N | N | N | N | Y | N | N | N |
| 9 | A new SDPC suspension table entry is added | N | N | N | N | N | N | N | N | Y | N | N |
| 10 | An existing SDPC suspension table entry is updated | N | N | N | N | N | N | N | N | N | Y | N |
| 11 | A participant's residential address is updated (IRIS only — SDPCEnrollmentRequest does not include address fields) | N | N | N | N | N | N | N | N | N | N | Y |

### Actions

| # | Action | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|--------|---|---|---|---|---|---|---|---|---|----|----|
| 1 | Call S200_Calculate_MMIS_IRIS_Spans | X | X | X | X | X | X | | | | | X |
| 2 | Call S210_Calculate_MMIS_SDPC_Spans | | | | | | | X | X | X | X | |
| 3 | Call S220_Enroll_Add_Update | X | X | | | | | X | X | | | |
| 4 | Call S240_Suspense_Add | | | X | | | | | | X | | |
| 5 | Call S230_Suspense_Update | | | | X | | | | | | X | |
| 6 | Call S250_Location_Assignment_Update | | | | | X | X | | | | | |
| 7 | Call S700_Address_Only_Update | | | | | | | | | | | X |
| 8 | End | X | X | X | X | X | X | X | X | X | X | X |

### Scenario Notes

1. **S100_001** — New IRIS Enrollment: User added a new IRIS enrollment table entry. Action #1 calculates MMIS IRIS spans. Action #3 processes the new enrollment.
2. **S100_002** — Updated IRIS Enrollment: User updated an existing IRIS enrollment table entry. Action #1 calculates MMIS IRIS spans. Action #3 processes the enrollment update. Note: when an existing enrollment entry is updated from 'Disenrolled' to 'Enrolled' status, this condition applies and S220 routes to Condition 7.
3. **S100_003** — New IRIS Suspension: User added a new IRIS suspension table entry. Action #1 calculates MMIS IRIS spans. Action #4 processes the new suspension.
4. **S100_004** — Updated IRIS Suspension: User updated an existing IRIS suspension table entry. Action #1 calculates MMIS IRIS spans. Action #5 processes the suspension update.
5. **S100_005** — FEA Change: User updated a participant's FEA assignment (IRIS only — FEA/ICA assignments do not apply to SDPC). Action #1 calculates MMIS IRIS spans. Action #6 processes the agency change.
6. **S100_006** — ICA Change: User updated a participant's ICA assignment (IRIS only — FEA/ICA assignments do not apply to SDPC). Action #1 calculates MMIS IRIS spans. Action #6 processes the agency change.
7. **S100_007** — New SDPC Enrollment: User added a new SDPC enrollment table entry. Action #2 calculates MMIS SDPC spans. Action #3 processes the new enrollment.
8. **S100_008** — Updated SDPC Enrollment: User updated an existing SDPC enrollment table entry. Action #2 calculates MMIS SDPC spans. Action #3 processes the enrollment update. Note: when an existing SDPC enrollment entry is updated from 'Disenrolled' to 'Enrolled' status, this condition applies and S220 routes to Condition 7.
9. **S100_009** — New SDPC Suspension: User added a new SDPC suspension table entry. Action #2 calculates MMIS SDPC spans. Action #4 processes the new suspension.
10. **S100_010** — Updated SDPC Suspension: User updated an existing SDPC suspension table entry. Action #2 calculates MMIS SDPC spans. Action #5 processes the suspension update.
11. **S100_011** — Address Update (IRIS only): User updated a participant's residential address. Action #1 calculates MMIS IRIS spans. Action #7 sends the address-only update for the IRIS MMIS span that includes the current date, if one exists. If no S200-calculated span includes the current date (participant is disenrolled or has no active MMIS enrollment as of today), no MMIS transaction is sent. Only S200 is called (not S210) because the SDPCEnrollmentRequest API does not include address fields.

---

## S200 — Calculate MMIS IRIS Spans

**Description:** Calculate the current MMIS enrollment and suspense spans for the IRIS participant by translating BC enrollment, suspension, and agency assignment data into the equivalent MMIS flat-span model.  
**Last Update:** 03/17/2026

### Conditions

| # | Condition | 1 | 2 | 3 | 4 |
|---|-----------|---|---|---|---|
| 1 | BC IRIS enrollment span exists for the participant | Y | Y | Y | Y |
| 2 | BC enrollment has one or more suspension records | N | Y | N | Y |
| 3 | BC enrollment has ICA/FEA assignment changes within the enrollment period | N | N | Y | Y |

### Actions

| # | Action | 1 | 2 | 3 | 4 |
|---|--------|---|---|---|---|
| 1 | Load BC enrollment span dates (begin date, end date) | X | X | X | X |
| 2 | Load all BC suspension spans (begin date, end date) ordered by begin date | | X | | X |
| 3 | Load all ICA/FEA assignments with effective date ranges, ordered by effective date | | | X | X |
| 4 | Build base MMIS spans from enrollment and suspension boundaries | X | X | X | X |
| 5 | Split spans at agency change boundaries | | | X | X |
| 6 | Assign ICA and FEA Medicaid Provider IDs to each calculated span | X | X | X | X |
| 7 | Set FEA dates on each span to match the span begin/end dates | X | X | X | X |
| 8 | Store the ordered list of calculated MMIS spans for use by downstream decision tables | X | X | X | X |
| 9 | Return to Calling Step | X | X | X | X |

### Scenario Notes

1. **S200_001** — Enrollment only, no suspensions, no agency changes. A single MMIS span is calculated: Active, BC enrollment begin to BC enrollment end (if null send 12/31/2299). The ICA and FEA assigned at the enrollment begin date are used.
2. **S200_002** — Enrollment with suspensions, no agency changes. The enrollment span is split at each suspension boundary: Active (enrollment begin → suspension begin), Suspended (suspension begin + 1 → suspension end), Active (suspension end + 1 → enrollment end or next suspension begin). If a suspension has no end date, BC sends 12/31/2299 to MMIS as the suspension end date — no Span-C is created. Multiple suspensions with real end dates produce alternating Active/Suspended/Active segments.
3. **S200_003** — Enrollment with agency changes, no suspensions. The enrollment span is split at each agency change effective date: the pre-change span ends on (effective date - 1) with the old ICA/FEA, and a new span begins on the effective date with the new ICA/FEA.
4. **S200_004** — Enrollment with both suspensions and agency changes. Suspension boundaries are applied first to create the base Active/Suspended segments, then agency change boundaries split any span that contains an agency change effective date. Each resulting span gets the ICA/FEA that was effective at that span's begin date.

---

## S210 — Calculate MMIS SDPC Spans

**Description:** Calculate the current MMIS enrollment and suspense spans for the SDPC participant by translating BC enrollment and suspension data into the equivalent MMIS flat-span model.  
**Last Update:** 03/18/2026

### Conditions

| # | Condition | 1 | 2 |
|---|-----------|---|---|
| 1 | BC SDPC enrollment span exists for the participant | Y | Y |
| 2 | BC enrollment has one or more suspension records | N | Y |

### Actions

| # | Action | 1 | 2 |
|---|--------|---|---|
| 1 | Load BC SDPC enrollment span dates (begin date, end date) | X | X |
| 2 | Load all BC suspension spans (begin date, end date) ordered by begin date | | X |
| 3 | Build base MMIS spans from enrollment and suspension boundaries | X | X |
| 4 | Assign SDPC Agency Medicaid Provider ID to each calculated span | X | X |
| 5 | Store the ordered list of calculated MMIS spans for use by downstream decision tables | X | X |
| 6 | Return to Calling Step | X | X |

### Scenario Notes

1. **S210_001** — Enrollment only, no suspensions. A single MMIS span is calculated: Active, BC enrollment begin to BC enrollment end (if null send 12/31/2299). The single SDPC Oversight Agency is used for the span.
2. **S210_002** — Enrollment with suspensions. The enrollment span is split at each suspension boundary: Active (enrollment begin → suspension begin), Suspended (suspension begin + 1 → suspension end), Active (suspension end + 1 → enrollment end or next suspension begin). If a suspension has no end date, BC sends 12/31/2299 to MMIS as the suspension end date — no Span-C is created. Multiple suspensions with real end dates produce alternating Active/Suspended/Active segments.

---

## S220 — Enroll Add/Update

**Description:** This page represents logic for adding or updating enrollment records in Blue Compass.  
**Last Update:** 06/11/2026

### Conditions

| # | Condition | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|-----------|---|---|---|---|---|---|---|
| 1 | New Enrollment Added | Y | N | N | N | N | N | N |
| 2 | BC Enrollment begin date changed to earlier date | N | Y | N | N | N | N | N |
| 3 | BC Enrollment begin date changed to later date | N | N | Y | N | N | N | N |
| 4 | BC Enrollment end date changed to an earlier date | N | N | N | Y | N | N | N |
| 5 | BC Enrollment end date changed to a later date | N | N | N | N | Y | N | N |
| 6 | BC Enrollment status changed from 'Enrolled' to 'Referral Withdrawn' | N | N | N | N | N | Y | N |
| 7 | BC Enrollment status changed from 'Disenrolled' to 'Enrolled' | N | N | N | N | N | N | Y |

### Actions

| # | Action | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|--------|---|---|---|---|---|---|---|
| 1 | Identify Span-B: the MMIS Active Span that is directly changed by the BC change | | X | X | X | X | X | |
| 2 | Call S300 to Send a new enrollment span (with the new BC Enrolled span dates) | X | | | | | | X |
| 3 | Call S310 to Send an Inactivate request to delete existing MMIS Span-B | | | | | | X | |
| 4 | Call S310 to delete existing MMIS Span-B (exact begin/end date match) | | X | X | | | | |
| 5 | Call S300 to create a new enrollment span with the new BC enrollment begin date and existing end date | | X | X | | | | |
| 6 | Call S340 to Send an update for Span-B with a new earlier end date and existing begin date (as the anchor) | | | | X | | | |
| 7 | Call S350 to Send an update for Span-B with a new later end date and existing begin date (as the anchor) | | | | | X | | |
| 8 | Return to Calling Step | X | X | X | X | X | X | X |

### Scenario Notes

1. **S220_001** — New Enrollment Added. Action #2 sends a new enrollment span to MMIS.
2. **S220_002** — Enrollment begin date changed to earlier date. Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new earlier begin date and existing end date.
3. **S220_003** — Enrollment begin date changed to later date. Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new later begin date and existing end date.
4. **S220_004** — Enrollment end date changed to an earlier date. Span-B is the S200-Calculated MMIS span with the latest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #6 updates Span-B with the new earlier end date.
5. **S220_005** — Enrollment end date changed to a later date. Span-B is the S200-Calculated MMIS span with the latest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #7 updates Span-B with the new later end date.
6. **S220_006** — Enrollment status changed from 'Enrolled' to 'Referral Withdrawn'. There is only one S200-Calculated MMIS span with an Active Status (dates would match the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #3 sends an Inactivate request to delete Span-B.
7. **S220_007** — Enrollment status changed from 'Disenrolled' to 'Enrolled'. The Disenrolled span exists only in BC — MMIS has no span for this period. No Span-B identification is needed. Action #2 sends a new enrollment span to MMIS opening at the Disenrolled span begin date with end date 12/31/2299. StartReasonCode = 2L (New Enrollment). StopReasonCode is Not Required.

---

## S230 — Suspense Update

**Description:** This page represents logic for updating suspense records in Blue Compass.  
**Last Update:** 06/21/2026

### Conditions

| # | Condition | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|-----------|---|---|---|---|---|---|---|
| 1 | BC Suspension begin date changed to earlier date | Y | N | N | N | N | N | N |
| 2 | BC Suspension begin date changed to later date | N | Y | N | N | N | N | N |
| 3 | BC Suspension end date changed from a valid date to an earlier valid date | N | N | Y | N | N | N | N |
| 4 | BC Suspension end date changed from a valid date to a later valid date | N | N | N | Y | N | N | N |
| 5 | BC Suspension deleted | N | N | N | N | Y | N | N |
| 6 | BC Suspension end date changed from null to a valid date | N | N | N | N | N | Y | N |
| 7 | BC Suspension end date changed from a valid date to null | N | N | N | N | N | N | Y |

### Actions

| # | Action | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|--------|---|---|---|---|---|---|---|
| 1 | Identify Span-B: the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date) | X | X | X | X | X | X | X |
| 2 | Identify Span-A: the S200-Calculated MMIS span that immediately precedes Span-B | X | X | | | X | | |
| 3 | Identify Span-C: the S200-Calculated MMIS span that immediately succeeds Span-B | | | X | X | X | | X |
| 4 | Call S400 to update Span-A end date (backfill gap) | X | | | | | | |
| 5 | Call S410 to delete existing Span-B from MMIS | X | X | X | | X | | |
| 6 | Call S310 to delete existing Span-C from MMIS | X | | X | X | | | X |
| 7 | Call S300 to recreate Span-A with new begin/end dates | X | | | | | | |
| 8 | Call S510 to create new suspense span with new begin date | X | X | | | | | |
| 9 | Call S510 to recreate Span-B with original begin date and new earlier end date | | | X | | | | |
| 10 | Call S520 to create new active enrollment span (Span-C) | X | | X | | | | |
| 11 | Call S400 to extend Span-A end date to fill gap | | X | | | | | |
| 12 | Call S445 to extend Span-B end date to new later date | | | | X | | | X |
| 13 | Call S520 to create new Span-C with new begin date | | | | X | | | |
| 14 | Call S410 to delete Span-B | | | | | X | | |
| 15 | Call S470 to update Span-A with new later end date | | | | | X | | |
| 16 | Call S440 to shorten Span-B end date | | | | | | X | |
| 17 | Call S520 to create new Span-C after shortened suspension | | | | | | X | |

### Scenario Notes

1. **S230_001** — Suspense begin date changed to earlier date. Span-B is the changed suspense span. Span-A precedes Span-B. Span-C succeeds Span-B. Action #5 deletes existing Span-B. Action #6 deletes existing Span-C. Action #7 recreates Span-A. Action #8 creates new Span-B with earlier begin date. Action #10 recreates Span-C. Order: S400 first (update Span-A), S410 second (delete Span-B), S300 third (recreate Span-A), S510 last (create new Span-B). 4 MMIS transactions.
2. **S230_002** — Suspense begin date changed to later date. Span-B is the changed suspense span. Span-A precedes Span-B. Action #5 deletes existing Span-B. Action #8 creates new suspense span with new later begin date and existing end date. Action #11 extends Span-A end date to backfill the gap. Order: S410 first (delete old Span-B), then S510 (create new Span-B), then S400 (extend Span-A). 3 MMIS transactions.
3. **S230_003** — Suspense end date changed from a valid date to an earlier valid date. Span-B is the changed suspense span. Span-C succeeds Span-B. Action #5 deletes existing Span-B (exact begin/end date match, Status I). Action #6 deletes existing Span-C (exact begin/end date match, Status I). Action #9 recreates Span-B with original begin date and new earlier end date (new BC suspension end date [offset: -1 day]). Action #10 creates new active enrollment span (Span-C) with begin date = (Span-B's MMIS end date + 1 = new BC suspension end date) and end date from original Span-C. Order: S410 first (delete Span-B), S310 second (delete Span-C), S510 third (recreate Span-B), S520 last (recreate Span-C). 4 MMIS transactions.
4. **S230_004** — Suspense end date changed from a valid date to a later valid date. Span-B is the changed suspense span. Span-C succeeds Span-B. Action #6 deletes existing Span-C. Action #12 extends Span-B end date to new later BC suspension end date [offset: -1 day]. Action #13 creates new active enrollment span (Span-C) with begin date = (Span-B's MMIS end date + 1 = new BC suspension end date) and end date from original Span-C. Order: S310 first (delete old Span-C), then S445 (extend Span-B), then S520 (create new Span-C). 3 MMIS transactions.
5. **S230_005** — Suspense deleted. Span-B is the deleted suspense span. Span-A precedes Span-B. Span-C succeeds Span-B. Action #14 deletes Span-B. Action #15 updates Span-A with new later end date to close the gap. Order: S410 first (delete Span-B), then S470 (extend Span-A). 2 MMIS transactions.
6. **S230_006** — Suspense end date changed from null to a valid date. Span-B is the suspense span with end date 12/31/2299 (no Span-C exists because the suspension previously had no end date). Action #16 shortens Span-B end date to the new BC suspension end date [offset: -1 day] using existing begin date as anchor (TransactionType C). Action #17 creates new active enrollment span (Span-C) with begin date = new BC suspension end date (participant is treated as active on this date) and end date = Span-A's original end date. Order: S440 first (shorten Span-B), then S520 (create Span-C). 2 MMIS transactions.
7. **S230_007** — Suspense end date changed from a valid date to null. Span-B is the changed suspense span. Span-C succeeds Span-B. Action #6 deletes existing Span-C (exact begin/end date match, Status I). Action #12 extends Span-B end date to 12/31/2299 using existing begin date as anchor (TransactionType O). Order: S310 first (delete Span-C), then S445 (extend Span-B to 12/31/2299). 2 MMIS transactions.

---

## S240 — Suspense Add

**Description:** This page represents logic for adding suspense records in Blue Compass.  
**Last Update:** 06/17/2026

### Conditions

| # | Condition | 1 | 2 | 3 |
|---|-----------|---|---|---|
| 1 | New suspense record has an end date | Y | N | - |
| 2 | Suspension span is at least 3 calendar days (end date - begin date >= 2 days) | Y | Y | N |

### Actions

| # | Action | 1 | 2 | 3 |
|---|--------|---|---|---|
| 1 | Identify Span-A: the MMIS Enrollment Span that includes the new BC suspense begin date | X | X | |
| 2 | Call S500 to send a request to set the end date for Span-A to the new BC suspense begin date (participant is treated as active on this date) | X | X | |
| 3 | Call S520 to send an Active/Open Span-C (with begin date = BC suspense end date, participant is treated as active on this date) and end date from Span-A | X | | |
| 4 | Call S510 to send an add request for the new suspense span (Span-B) with begin date = (BC suspense begin date [offset: +1 day]) and end date = BC suspense end date [offset: -1 day] | X | X | |
| 5 | Surface an error to the user: Suspension span is too short to produce a valid MMIS suspense window. No MMIS transaction sent. | | | X |
| 6 | Return to Calling Step | X | X | X |

### Scenario Notes

1. **S240_001** — New suspense record has an end date and meets the 3-day minimum duration. Span-A is the MMIS Enrollment Span that includes the new BC suspense begin date. Action #1 identifies Span-A. Action #2 closes Span-A. Action #3 creates Span-C after suspension. Action #4 adds the new suspense span (Span-B) with begin date = BC suspense begin date [offset: +1 day] and end date = BC suspension end date [offset: -1 day]. 3 MMIS transactions.
2. **S240_002** — New suspense record does not have an end date (open-ended suspensions are always valid). Span-A is the MMIS Enrollment Span. Action #1 identifies Span-A. Action #2 closes Span-A. Action #4 adds the new suspense span (Span-B) with end date 12/31/2299 (BC null suspension end date is sent to MMIS as 12/31/2299). No Span-C is created because there is no suspension end date. 2 MMIS transactions.
3. **S240_003** — Suspension span is fewer than 3 calendar days (end date - begin date < 2 days). Applying the +1 begin and -1 end offsets would produce a zero-day or negative-day MMIS suspense window. Action #5 surfaces an error to the user. No MMIS transaction sent. Confirmed by Richard Ward (DHS) on 06/17/2026.

---

## S250 — Location Assignment Update

**Description:** This page represents logic for changes to FEA or ICA. The pre-calculated MMIS spans must already be available. S250 closes the affected span, then processes each pre-calculated span from the agency change effective date onward.  
**Last Update:** 03/20/2026

### Conditions

| # | Condition | 1 | 2 |
|---|-----------|---|---|
| 1 | New ICA or FEA is assigned | Y | Y |
| 2 | Span-B (the MMIS span containing the agency change effective date) has Active status | Y | N |
| 3 | Span-B has Suspended status | N | Y |

### Actions

| # | Action | 1 | 2 |
|---|--------|---|---|
| 1 | Identify Span-B: the existing MMIS span that contains the agency change effective date | X | X |
| 2 | Call S600 to send an update for Span-B with a new earlier end date = (agency change effective date - 1) and existing begin date (as the anchor) | X | X |
| 3 | Call S255 for each S200-calculated-MMIS span from the agency change effective date onward (in order) | X | X |
| 4 | Return to Calling Step | X | X |

### Scenario Notes

1. **S250_001** — Span-B is Active. Action #1 identifies Span-B. Action #2 closes Span-B at (effective date - 1) with old agency. Action #3 iterates S200-Calculated spans from the effective date onward, calling S255 for each. Typically produces one S255 call for a single active span.
2. **S250_002** — Span-B is Suspended. Action #1 identifies Span-B. Action #2 closes Span-B at (effective date - 1) with old agency. Action #3 iterates S200-Calculated spans from the effective date onward, calling S255 for each. Typically produces two S255 calls: first for the new suspended span, then for the post-suspension active span (if S200 calculated one).

---

## S255 — Resend Span with New Agency

**Description:** IRIS only: For a single pre-calculated MMIS span, conditionally delete the old-agency span then create the new-agency span.  
**Last Update:** 03/20/2026

### Conditions

| # | Condition | 1 | 2 | 3 | 4 |
|---|-----------|---|---|---|---|
| 1 | MMIS span (pre-calculated in S200) has Active status | Y | Y | N | N |
| 2 | MMIS span (pre-calculated in S200) has Suspended status | N | N | Y | Y |
| 3 | A matching MMIS span exists with the old agency (needs delete-then-recreate) | Y | N | Y | N |

### Actions

| # | Action | 1 | 2 | 3 | 4 |
|---|--------|---|---|---|---|
| 1 | Call S310 to delete the existing MMIS span with the old agency (exact begin/end date match required) | X | | X | |
| 2 | Call S610 to create the active span with the new ICA/FEA. Begin date and end date come from the S200-calculated span | X | X | | |
| 3 | Call S620 to create the suspended span with the new ICA/FEA. Begin date and end date come from the S200-calculated span | | | X | X |
| 4 | Return to Calling Step | X | X | X | X |

### Scenario Notes

1. **S255_001** — Active span, old-agency span exists in MMIS. Typical Span-C replacement: post-suspension active span exists in MMIS with old agency. Action #1 deletes existing span. Action #2 creates active span with new agency.
2. **S255_002** — Active span, no old-agency span in MMIS. Typical first span after S600: S600 shortened the old span, and the new active span does not yet exist. Action #2 creates active span with new agency.
3. **S255_003** — Suspended span, old-agency span exists in MMIS. Action #1 deletes existing span with old agency. Action #3 creates suspended span with new agency.
4. **S255_004** — Suspended span, no old-agency span in MMIS. Action #3 creates suspended span with new agency.

---

## S300 — Create New Enrollment Span

**Description:** Send a request to add a new enrollment span with begin date = BC enrollment begin date and end date = BC enrollment end date (if null send 12/31/2299).  
**Last Update:** 06/20/2026

### Conditions

| # | Condition | 1 | 2 | 3 |
|---|-----------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction | N | Y | N |

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the BC enrollment begin date | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the new BC Enrolled span begin date | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC Enrolled span end date | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to 2L (New Enrollment) | StartReasonCode |
| 8 | Set StopReasonCode. Not Required (end date is 12/31/2299 for new enrollment) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the BC enrollment begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the new BC Enrolled span begin date | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC Enrolled span end date | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the new BC Enrolled span begin date | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC Enrolled span end date | DateSDPCEnd |
| 16 | Set Status to A (Active) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S300_001** — IRIS: Create new IRIS enrollment span. TransactionType = O, Status = A. StartReasonCode = 2L (New Enrollment). StopReasonCode is Not Required (end date is 12/31/2299).
2. **S300_002** — SDPC: Create new SDPC enrollment span. TransactionType = A, Status = A.
3. **S300_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S310 — Delete Enrollment Span

**Description:** Send a request to inactivate an existing MMIS span with existing begin date and existing end date (exact match required).  
**Last Update:** 07/18/2026

### Conditions

| # | Condition | 1 | 2 | 3 |
|---|-----------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction | N | Y | N |

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the existing MMIS span begin date | DateEnrlEff |
| 5 | Set DateEnrlEnd to the existing MMIS span end date | DateEnrlEnd |
| 6 | Set Status to I (Inactivate) | Status |
| 7 | Set StartReasonCode — value is caller-determined: 2I (S230 Scenario 1), 2L for S220 Scenarios 2/3, S220 Scenario 6, S230 Scenarios 3/4, S255 Scenarios 1/3 | StartReasonCode |
| 8 | Set StopReasonCode — value is caller-determined: 2B (S220 Scenarios 2/3), 2I (S230 Scenario 1), 2W (S220 Scenario 6, S230 Scenarios 3/4, S255 Scenarios 1/3), or null (when end date is 12/31/2299) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date | FEAEffectiveDate |
| 11 | Set FEAEndDate to the existing MMIS span end date | FEAEndDate |
| 12 | Set FEAStatus to I (Inactivate) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the existing MMIS span end date | DateSDPCEnd |
| 16 | Set Status to I (Inactivate) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S310_001** — IRIS: Delete existing IRIS enrollment span. TransactionType = O, Status = I. StartReasonCode = 2L. StopReasonCode = 2W.
2. **S310_002** — SDPC: Delete existing SDPC enrollment span. TransactionType = A, Status = I.
3. **S310_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S340 — Enrollment End Date Change to Earlier Date

**Description:** Send an update request for Span-B with new earlier end date and existing MMIS Span-B begin date (as the anchor).  
**Last Update:** 03/08/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date | WaiverAgencyID |
| 3 | Set TransactionType to C (Closure) | TransactionType |
| 4 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor) | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC Enrolled span end date | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to the BC disenrollment reason code (same as StopReasonCode) | StartReasonCode |
| 8 | Set StopReasonCode to the BC disenrollment reason code (from StatusReasonDisplayName) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor) | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC Enrolled span end date | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC Enrolled span end date | DateSDPCEnd |
| 16 | Set Status to A (Active) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S340_001** — IRIS: TransactionType = C, Status = A. StartReasonCode = BC disenrollment reason code. StopReasonCode = BC StatusReasonDisplayName (disenrollment reason).
2. **S340_002** — SDPC: TransactionType = C, Status = A.
3. **S340_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S350 — Enrollment End Date Change to Later Date

**Description:** Send an update request for Span-B with new later end date and existing MMIS Span-B begin date (as the anchor). If most current span is a suspension, call S360 instead.  
**Last Update:** 03/08/2026

### Conditions

| # | Condition | 1 | 2 | 3 | 4 | 5 |
|---|-----------|---|---|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction | Y | Y | N | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction | N | N | Y | Y | N |
| 3 | Most current MMIS span within the BC Enrollment dates is a suspension | Y | N | Y | N | N |

### Actions

| # | Action | 1 | 2 | 3 | 4 | 5 |
|---|--------|---|---|---|---|---|
| 1 | Call S360 Create New Enrollment to Succeed Suspension | X | | X | | |
| 2 | Set WaiverProgramName to "IRIS" | | X | | X | |
| 3 | Set WaiverAgencyID to the ID of the ICA Agency at the MMIS span begin date | | X | | | |
| 4 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | | X | | X | |
| 5 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor) | | X | | | |
| 6 | Set DateEnrlEnd to the new BC Enrolled span end date | | X | | | |
| 7 | Set Status to A (Active) | | X | | | |
| 8 | Set StartReasonCode to 2L (New Enrollment) | X | | | | |
| 9 | Set StopReasonCode. Not Required | X | | | | |
| 10-13 | Set WaiverFEA, FEAEffectiveDate, FEAEndDate, FEAStatus (IRIS fields) | | X | | | |
| 14-18 | Set SDPCAgencyID, DateSDPCEffective, DateSDPCEnd, Status, WorkerID (SDPC fields) | | | | X | |
| 19 | Return to Calling Step | X | X | X | X | X |

### Scenario Notes

1. **S350_001** — IRIS: End date change to later date, most current MMIS span is a suspension. Action #1 calls S360 to create enrollment span after suspension. StartReasonCode = 2L. StopReasonCode is Not Required.
2. **S350_002** — IRIS: End date change to later date. TransactionType = A, Status = A.
3. **S350_003** — SDPC: End date change to later date, most current MMIS span is a suspension. Action #1 calls S360.
4. **S350_004** — SDPC: End date change to later date. TransactionType = A, Status = A.
5. **S350_005** — Neither IRIS nor SDPC transaction. No action taken.

---

## S360 — Create Enrollment Span After Suspension

**Description:** Send a request to add a new active enrollment span (Span-C) with begin date = BC suspension end date and end date = BC enrollment end date.  
**Last Update:** 06/21/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span DateEnrlEff date | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the BC suspension end date (the participant is treated as active on this date) | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC Enrolled span end date | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension) | StartReasonCode |
| 8 | Set StopReasonCode. Not Required (end date is typically 12/31/2299) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency at the MMIS span begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the BC suspension end date (active on this date) | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC Enrolled span end date | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the BC suspension end date (active on this date) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC Enrolled span end date | DateSDPCEnd |
| 16 | Set Status to A (Active) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S360_001** — IRIS: Create new IRIS enrollment span after suspension. TransactionType = O, Status = A. StartReasonCode = 2Q (Enrollment from Suspension). StopReasonCode is Not Required.
2. **S360_002** — SDPC: Create new SDPC enrollment span after suspension. TransactionType = A, Status = A.
3. **S360_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S400 — Update Span-A End Date

**Description:** Send an update request for Span-A with new end date = (Span-B's new begin date - 1) and existing MMIS Span-A begin date (as the anchor).  
**Last Update:** 03/18/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the existing Span-A ID of the ICA Agency | WaiverAgencyID |
| 3 | Set TransactionType to C (Closure) | TransactionType |
| 4 | Set DateEnrlEff to Span-A's existing Active MMIS span begin date (as the anchor) | DateEnrlEff |
| 5 | Set DateEnrlEnd to (Span-B's New Begin Date - 1) | DateEnrlEnd |
| 6 | Set Status to Span-A's original value (possible values: A, I, or S) | Status |
| 7 | Set StartReasonCode to 2I (Suspended) | StartReasonCode |
| 8 | Set StopReasonCode to 2I (Suspended) | StopReasonCode |
| 9 | Set WaiverFEA to the existing Span-A ID of the FEA Agency | WaiverFEA |
| 10 | Set FEAEffectiveDate to the existing Active MMIS span begin date (as the anchor) | FEAEffectiveDate |
| 11 | Set FEAEndDate to (Span-B's New Begin Date - 1) | FEAEndDate |
| 12 | Set FEAStatus to Span-A's original value (possible values: A, I, or S) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to Span-A's existing MMIS span begin date (as the anchor) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to (Span-B's New Begin Date - 1) | DateSDPCEnd |
| 16 | Set Status to Span-A's original value (possible values: A, I, or S) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S400_001** — IRIS: TransactionType = C, Status = A. StartReasonCode = 2I. StopReasonCode = 2I (Suspended).
2. **S400_002** — SDPC: TransactionType = C, Status = A.
3. **S400_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S410 — Delete Suspense Span

**Description:** Send a request to inactivate Span-B with existing MMIS Span-B begin date and existing Span-B end date (exact match required).  
**Last Update:** 07/18/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the existing MMIS span begin date | DateEnrlEff |
| 5 | Set DateEnrlEnd to the existing MMIS span end date | DateEnrlEnd |
| 6 | Set Status to I (Inactivate) | Status |
| 7 | Set StartReasonCode to 2L (New Enrollment) | StartReasonCode |
| 8 | Set StopReasonCode to 2W (Reason Not Provided in Source System) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date | FEAEffectiveDate |
| 11 | Set FEAEndDate to the existing MMIS span end date | FEAEndDate |
| 12 | Set FEAStatus to I (Inactivate) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the existing MMIS span end date | DateSDPCEnd |
| 16 | Set Status to I (Inactivate) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S410_001** — IRIS: Delete existing IRIS suspense span. TransactionType = O, Status = I. StartReasonCode = 2L. StopReasonCode = 2W.
2. **S410_002** — SDPC: Delete existing SDPC suspense span. TransactionType = A, Status = I.
3. **S410_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S440 — Suspense End Date Change to Earlier Date

**Description:** Send an update request for Span-B with new earlier end date and existing MMIS Span-B begin date (as the anchor).  
**Last Update:** 06/22/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency at the MMIS span begin date | WaiverAgencyID |
| 3 | Set TransactionType to C (Closure) | TransactionType |
| 4 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor) | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC suspension end date [offset: -1 day] | DateEnrlEnd |
| 6 | Set Status to S (Suspended) | Status |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension) | StartReasonCode |
| 8 | Set StopReasonCode to 2W (Reason Not Provided in Source System) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency at the MMIS span begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor) | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC suspension end date [offset: -1 day] | FEAEndDate |
| 12 | Set FEAStatus to S (Suspended) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC suspension end date [offset: -1 day] | DateSDPCEnd |
| 16 | Set Status to S (Suspended) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S440_001** — IRIS: TransactionType = C, Status = S. StartReasonCode = 2Q. StopReasonCode = 2W.
2. **S440_002** — SDPC: TransactionType = C, Status = S.
3. **S440_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S445 — Suspense End Date Change to Later Date

**Description:** Send an update request for Span-B with new later end date and existing MMIS Span-B begin date (as the anchor). TransactionType O (extending, not shortening).  
**Last Update:** 06/21/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency at the MMIS span begin date | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor) | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC suspension end date [offset: -1 day] | DateEnrlEnd |
| 6 | Set Status to S (Suspended) | Status |
| 7 | Set StartReasonCode to 2I (Suspended) | StartReasonCode |
| 8 | Set StopReasonCode to 2I (Suspended) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency at the MMIS span begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor) | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC suspension end date [offset: -1 day] | FEAEndDate |
| 12 | Set FEAStatus to S (Suspended) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC suspension end date [offset: -1 day] | DateSDPCEnd |
| 16 | Set Status to S (Suspended) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S445_001** — IRIS: TransactionType = O, Status = S. StartReasonCode = 2I. StopReasonCode = 2I.
2. **S445_002** — SDPC: TransactionType = A, Status = S.
3. **S445_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S470 — Update Span-A End Date to Later Date

**Description:** Send an update request for Span-A with new later end date = (Span-C's begin date - 1) and existing MMIS Span-A begin date (as the anchor).  
**Last Update:** 03/16/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the existing Span-A ID of the ICA Agency | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to Span-A's existing MMIS span begin date (as the anchor) | DateEnrlEff |
| 5 | Set DateEnrlEnd to (Span-C's Begin Date - 1) | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension) | StartReasonCode |
| 8 | Set StopReasonCode. Not Required (end date is being extended to fill gap after suspension deletion) | StopReasonCode |
| 9 | Set WaiverFEA to the existing Span-A ID of the FEA Agency | WaiverFEA |
| 10 | Set FEAEffectiveDate to Span-A's existing MMIS span begin date (as the anchor) | FEAEffectiveDate |
| 11 | Set FEAEndDate to (Span-C's Begin Date - 1) | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to Span-A's existing MMIS span begin date (as the anchor) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to (Span-C's Begin Date - 1) | DateSDPCEnd |
| 16 | Set Status to A (Active) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S470_001** — IRIS: TransactionType = O, Status = A. StartReasonCode = 2Q. StopReasonCode is Not Required.
2. **S470_002** — SDPC: TransactionType = A, Status = A.
3. **S470_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S500 — Close Span-A Before Suspense

**Description:** Send an update request for Span-A with new end date = BC suspense begin date and existing MMIS Span-A begin date (as the anchor).  
**Last Update:** 03/16/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the existing Span-A ID of the ICA Agency | WaiverAgencyID |
| 3 | Set TransactionType to C (Closure) | TransactionType |
| 4 | Set DateEnrlEff to Span-A's existing MMIS span begin date (as the anchor) | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC suspense begin date (participant is treated as active on this date) | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to 2I (Suspended) | StartReasonCode |
| 8 | Set StopReasonCode to 2I (Suspended) | StopReasonCode |
| 9 | Set WaiverFEA to the existing Span-A ID of the FEA Agency | WaiverFEA |
| 10 | Set FEAEffectiveDate to Span-A's existing MMIS span begin date (as the anchor) | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC suspense begin date (active on this date) | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to Span-A's existing MMIS span begin date (as the anchor) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC suspense begin date (active on this date) | DateSDPCEnd |
| 16 | Set Status to A (Active) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S500_001** — IRIS: TransactionType = C, Status = A. StartReasonCode = 2I. StopReasonCode = 2I (Suspended).
2. **S500_002** — SDPC: TransactionType = C, Status = A.
3. **S500_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S510 — Add Suspense Span

**Description:** Send a request to add a new suspense span (Span-B) with begin date = (BC suspense begin date + 1) and end date = BC suspense end date minus one calendar day.  
**Last Update:** 06/21/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the new BC suspense begin date | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the new BC suspense begin date [offset: +1 day] | DateEnrlEff |
| 5 | Set DateEnrlEnd to the new BC suspense end date [offset: -1 day] | DateEnrlEnd |
| 6 | Set Status to S (Suspended) | Status |
| 7 | Set StartReasonCode to 2I (Suspended) | StartReasonCode |
| 8 | Set StopReasonCode to 2I (Suspended) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the new BC suspense begin date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the new BC suspense begin date [offset: +1 day] | FEAEffectiveDate |
| 11 | Set FEAEndDate to the new BC suspense end date [offset: -1 day] | FEAEndDate |
| 12 | Set FEAStatus to S (Suspended) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the new BC suspense begin date [offset: +1 day] | DateSDPCEffective |
| 15 | Set DateSDPCEnd to the new BC suspense end date [offset: -1 day] | DateSDPCEnd |
| 16 | Set Status to S (Suspended) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S510_001** — IRIS: Add new IRIS suspense span. TransactionType = O, Status = S. StartReasonCode = 2I. StopReasonCode = 2I.
2. **S510_002** — SDPC: Add new SDPC suspense span. TransactionType = A, Status = S.
3. **S510_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S520 — Create Span-C After Suspense

**Description:** Send a request to add a new active enrollment span (Span-C) with begin date = BC suspense end date and end date = Span-A's pre-update end date.  
**Last Update:** 06/21/2026

### Actions (IRIS — Column 1)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at (BC suspense end date) | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC | TransactionType |
| 4 | Set DateEnrlEff to the BC suspense end date (the participant is treated as active on this date) | DateEnrlEff |
| 5 | Set DateEnrlEnd to Span-A's pre-update end date | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension) | StartReasonCode |
| 8 | Set StopReasonCode. Not Required (end date is typically 12/31/2299) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the BC suspense end date | WaiverFEA |
| 10 | Set FEAEffectiveDate to the BC suspense end date (active on this date) | FEAEffectiveDate |
| 11 | Set FEAEndDate to Span-A's pre-update end date | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Actions (SDPC — Column 2)

| # | Action | Data Element |
|---|--------|--------------|
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency | SDPCAgencyID |
| 14 | Set DateSDPCEffective to the BC suspense end date (active on this date) | DateSDPCEffective |
| 15 | Set DateSDPCEnd to Span-A's pre-update end date | DateSDPCEnd |
| 16 | Set Status to A (Active) | Status |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes | WorkerID |

### Scenario Notes

1. **S520_001** — IRIS: Create active IRIS enrollment span (Span-C) after suspension. TransactionType = O, Status = A. StartReasonCode = 2Q (Enrollment from Suspension). StopReasonCode is Not Required.
2. **S520_002** — SDPC: Create active SDPC enrollment span (Span-C) after suspension. TransactionType = A, Status = A.
3. **S520_003** — Neither IRIS nor SDPC transaction. No action taken.

---

## S600 — Close Span-B for Agency Change

**Description:** IRIS only: Send an update request for Span-B with new end date = (agency change effective date - 1) and existing MMIS Span-B begin date (as the anchor).  
**Last Update:** 03/19/2026

### Conditions

| # | Condition | 1 | 2 |
|---|-----------|---|---|
| 1 | Current MMIS IRIS enrollment span for the participant has Active status | Y | N |
| 2 | Current MMIS IRIS enrollment span for the participant has Suspended status | N | Y |

### Actions

| # | Action | Data Element | 1 | 2 |
|---|--------|--------------|---|---|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName | X | X |
| 2 | Set WaiverAgencyID to the existing Span-B ID of the ICA Agency (pre-update ICA) | WaiverAgencyID | X | X |
| 3 | Set TransactionType to C (Closure) | TransactionType | X | X |
| 4 | Set DateEnrlEff to Span-B's existing MMIS span begin date (as the anchor) | DateEnrlEff | X | X |
| 5 | Set DateEnrlEnd to (agency change effective date - 1) | DateEnrlEnd | X | X |
| 6 | Set Status to A (Active) | Status | X | |
| 7 | Set Status to S (Suspended) | Status | | X |
| 8 | Set StartReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed | StartReasonCode | X | X |
| 9 | Set StopReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed | StopReasonCode | X | X |
| 10 | Set WaiverFEA to the existing Span-B ID of the FEA Agency (pre-update FEA) | WaiverFEA | X | X |
| 11 | Set FEAEffectiveDate to Span-B's existing MMIS span begin date (as the anchor) | FEAEffectiveDate | X | X |
| 12 | Set FEAEndDate to (agency change effective date - 1) | FEAEndDate | X | X |
| 13 | Set FEAStatus to A (Active) | FEAStatus | X | |
| 14 | Set FEAStatus to A (Active). Note: WISITS production data confirms FEAStatus is always A when closing a span, even when Status=S | FEAStatus | | X |

### Scenario Notes

1. **S600_001** — IRIS Active span: Close Span-B for agency change. TransactionType = C, Status = A. StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode = 2P or 2R.
2. **S600_002** — IRIS Suspended span: Close Span-B for agency change. TransactionType = C, Status = S. FEAStatus = A (always Active on closures, even when Status=S). StartReasonCode = 2P or 2R. StopReasonCode = 2W (Reason Not Provided in Source System).

---

## S610 — Create Active Span with New Agency

**Description:** IRIS only: Send a request to add a new active enrollment span with begin date = agency change effective date, end date = S200-Calculated span end date, and new ICA/FEA.  
**Last Update:** 06/20/2026

### Actions

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the new ICA Agency assigned to the participant (post-update ICA) | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) | TransactionType |
| 4 | Set DateEnrlEff to the agency change effective date | DateEnrlEff |
| 5 | Set DateEnrlEnd to the S200-calculated span end date | DateEnrlEnd |
| 6 | Set Status to A (Active) | Status |
| 7 | Set StartReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed | StartReasonCode |
| 8 | Set StopReasonCode. Not Required (end date is typically 12/31/2299 for new agency span) | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the new FEA Agency assigned to the participant (post-update FEA) | WaiverFEA |
| 10 | Set FEAEffectiveDate to the agency change effective date | FEAEffectiveDate |
| 11 | Set FEAEndDate to the S200-calculated span end date | FEAEndDate |
| 12 | Set FEAStatus to A (Active) | FEAStatus |

### Scenario Notes

1. **S610_001** — IRIS: Create new active enrollment span with new ICA/FEA. TransactionType = O, Status = A. StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode is Not Required.

---

## S620 — Create Suspended Span with New Agency

**Description:** IRIS only: Send a request to add a new suspended span with begin date = agency change effective date, end date = S200-Calculated span end date, and new ICA/FEA.  
**Last Update:** 03/19/2026

### Actions

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 2 | Set WaiverAgencyID to the ID of the new ICA Agency assigned to the participant (post-update ICA) | WaiverAgencyID |
| 3 | Set TransactionType to O (Open) | TransactionType |
| 4 | Set DateEnrlEff to the agency change effective date | DateEnrlEff |
| 5 | Set DateEnrlEnd to Span-B's pre-update end date | DateEnrlEnd |
| 6 | Set Status to S (Suspended) | Status |
| 7 | Set StartReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed | StartReasonCode |
| 8 | Set StopReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed | StopReasonCode |
| 9 | Set WaiverFEA to the ID of the new FEA Agency assigned to the participant (post-update FEA) | WaiverFEA |
| 10 | Set FEAEffectiveDate to the agency change effective date | FEAEffectiveDate |
| 11 | Set FEAEndDate to Span-B's pre-update end date | FEAEndDate |
| 12 | Set FEAStatus to S (Suspended) | FEAStatus |

### Scenario Notes

1. **S620_001** — IRIS: Create new suspended span with new ICA/FEA. TransactionType = O, Status = S. StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode = 2P or 2R.

---

## S700 — Address-Only Update

**Description:** Send an address-only update for the current MMIS span using the same begin and end dates, with updated address fields and the StartReasonCode that corresponds to how the span originally began.  
**Last Update:** 06/22/2026

### Conditions

| # | Condition | 1 | 2 |
|---|-----------|---|---|
| 1 | The S200-calculated span list contains a span whose date range includes the current date (participant is currently enrolled or suspended) | Y | N |

### Actions (Column 1 — Current span exists)

| # | Action | Data Element |
|---|--------|--------------|
| 1 | Identify the current span from the S200-calculated span list: the span whose date range includes the current date (current date falls between span begin date and span end date, inclusive). This may be an Active or Suspended span. | n/a |
| 2 | Set WaiverProgramName to "IRIS" | WaiverProgramName |
| 3 | Set WaiverAgencyID to the existing ICA Agency ID from the current span | WaiverAgencyID |
| 4 | Set TransactionType to O (Open) | TransactionType |
| 5 | Set DateEnrlEff to the current span's begin date | DateEnrlEff |
| 6 | Set DateEnrlEnd to the current span's end date | DateEnrlEnd |
| 7 | Set Status to the current span's status (A or S) | Status |
| 8 | Set StartReasonCode to the reason code that corresponds to how the current span originally began: 2L if new enrollment or Disenrolled→Enrolled reinstatement; 2Q if post-suspension return; 2P if ICA transfer; 2R if FEA transfer | StartReasonCode |
| 9 | Set StopReasonCode to: null if span end date is 12/31/2299; 2I if span is Suspended with any other valid end date. Preserves original stop reason in MMIS. | StopReasonCode |
| 10 | Set WaiverFEA to the existing FEA Agency ID from the current span | WaiverFEA |
| 11 | Set FEAEffectiveDate to the current span's begin date | FEAEffectiveDate |
| 12 | Set FEAEndDate to the current span's end date | FEAEndDate |
| 13 | Set FEAStatus to the current span's status (A or S) | FEAStatus |
| 14 | Populate address fields with the participant's new residential address | Address fields |

### Scenario Notes

1. **S700_001** — IRIS address update, current span exists. TransactionType = O, Status = current span's status (A or S). StartReasonCode is derived from how the span originally began — not hardcoded to 2L. StopReasonCode is Not Required.
2. **S700_002** — No current span. The S200-calculated span list contains no span whose date range includes the current date — the participant is disenrolled or has no active MMIS enrollment as of today. No MMIS transaction is sent. Return to calling step.

---

## Key Reference: Reason Codes

| Code | Meaning |
|------|---------|
| 2B | Begin Date Changed |
| 2I | Suspended |
| 2L | New Enrollment |
| 2P | ICA Transfer |
| 2Q | Enrollment from Suspension |
| 2R | FEA Transfer |
| 2W | Reason Not Provided in Source System |

## Key Reference: Transaction Types

| Code | Meaning | Used By |
|------|---------|---------|
| O | Open | IRIS |
| C | Closure | IRIS & SDPC |
| A | Add/Update | SDPC |

## Key Reference: Status Codes

| Code | Meaning |
|------|---------|
| A | Active |
| I | Inactivate |
| S | Suspended |

## Key Reference: Date Offset Rules

- **BC Suspension Begin Date → MMIS Span-B Begin Date:** +1 day offset (participant is treated as active on the BC suspension begin date itself)
- **BC Suspension End Date → MMIS Span-B End Date:** -1 day offset (participant is treated as active on the BC suspension end date itself)
- **BC Suspension End Date → MMIS Span-C Begin Date:** No offset (participant is treated as active on the BC suspension end date)
- **BC Suspension Begin Date → MMIS Span-A End Date:** No offset (participant is treated as active on the BC suspension begin date)
- **Null BC end dates** are sent to MMIS as **12/31/2299**
- **Minimum suspension duration:** 3 calendar days (end date - begin date >= 2 days) to produce valid MMIS window after offsets
