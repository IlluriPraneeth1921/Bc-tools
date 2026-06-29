# Enrollment Decision Tables

## Overview

This file is the single source of truth for all Blue Compass waiver enrollment decision tables. It replaces the CSV intermediary workflow — the Excel workbook is generated directly from this file.

**Context**: These tables represent the Blue Compass (sending system) perspective for interfacing with MMIS (receiving system) for waiver enrollment processing. Blue Compass must predict MMIS behavior to determine the correct transaction type and field population.

**Key principle**: MMIS uses non-overlapping, contiguous enrollment segments. BC suspensions appear as gaps between segments. Overlapping segments are rejected.

**Scenario Note Format Standard**: For all decision tables that work with date spans (S220, S230, S240, S250, S255, and downstream field-setting tables), scenario notes must follow this structure:
1. `Scenario: S###_### - ` prefix with a brief title describing the trigger.
2. Span identification — which S200/S210-Calculated MMIS spans are involved (Span-A, Span-B, Span-C) and how to identify them.
3. Action references — one sentence per action performed in the scenario, in execution order, using the format `Action #[number] [does what]` with a brief description derived from the action text.

---

## Core Knowledge: BC vs MMIS Data Model and Transaction Rules

This section is the authoritative reference for all enrollment decision table work. It must be consulted before adding or modifying any table.

### BC Data Model (Source)

Blue Compass stores enrollment and suspension data in **separate tables**:

- `[ProgramEnrollmentModule].[ProgramEnrollment]` — stores enrollment date spans (one row per enrolled period)
- `[ProgramEnrollmentModule].[ProgramEnrollmentSuspension]` — child table storing suspension date spans (one or more rows per enrollment)

A BC enrollment record has a begin date and an end date. A BC suspension record is a child of an enrollment and has its own begin and end date. These are independent rows in separate tables.

### MMIS Data Model (Target)

MMIS stores all enrollment and suspension data in a **single flat span table**. Each row represents one contiguous span and contains fields including enrollment begin, enrollment end, suspense start, suspense stop, enrollment start, enrollment stop, status (Active/Suspended/Inactive), and transaction type (Open/Closure).

MMIS enforces **non-overlapping, contiguous spans**. Any transaction that would create an overlap is rejected.

### The Translation Problem

Because BC uses two separate tables and MMIS uses one flat span table, every BC save event must be translated into one or more MMIS transactions that maintain MMIS's contiguous, non-overlapping span model. The decision tables exist to define exactly which MMIS transactions to generate for each BC change.

### MMIS Transaction Rules

**Anchor rule**: To modify an existing MMIS span's **end date**, the **begin date** must exactly match the existing span in MMIS (the begin date is the anchor). MMIS does not support using an end date as an anchor to modify a begin date. The only valid anchor pattern is: begin date anchor → change end date.

**Begin date change → delete and recreate**: To change a span's begin date (earlier or later), the existing span must be fully deleted (`Status: I` with exact begin/end date match) and a new span created with the new begin date. This applies to all span types (enrollment, suspension, Span-C). The delete+create pattern replaces the prior assumption that an end date could serve as an anchor for begin date changes.

**Make-room rule (end date later)**: To extend a span's end date to a later date, if there is a succeeding span, you must first send a transaction to move the **succeeding span's begin date** later to make room. Order matters — move the succeeding span first, then extend the target span. Note: since begin date changes now require delete+create, "moving" the succeeding span means deleting it and recreating it with the new begin date.

**Overlap rejection**: MMIS will reject any transaction that creates an overlap with an existing span. BC must predict and prevent this by sending make-room transactions in the correct order before the primary change.

**Status I = full delete**: `Status: I (Inactive)` is used exclusively to fully delete a span from MMIS. It is not used for normal end-dating or closures. The begin and end dates in the request must exactly match the existing MMIS span.

**Referral Withdrawn = delete**: When a BC enrollment status changes to 'Referral Withdrawn', it means the enrollment span should never have existed. The correct MMIS action is to send `Status: I` to fully delete the span — not a Closure. This is distinct from a normal end-date change. A Referral Withdrawn can only occur before the enrollment begin date — the participant never reached the point where the enrollment started, so there will only ever be a single MMIS span (the future-dated enrollment) to delete. Suspensions and Span-C cannot exist because the enrollment period never began.

**TransactionType C (Closure)**: Used to shorten (bring in) the end date of an existing span to an earlier date. The existing begin date is the anchor. Status reflects the span's current state (A or S). Confirmed by Gainwell on 03/18/2026: Closure = bringing in a new end date.

**TransactionType O (Open)**: Used to create a new span or extend a span's end date to a later date. The rule is: if you are adding a new segment or not shortening the end date, use Open. This applies regardless of whether the dates are in the past or future. Confirmed by Gainwell on 03/18/2026: Open = adding a new segment. **IRIS uses O (Open); SDPC uses A (Add/Update) for the same purpose.** Both use C (Closure) for shortening end dates. WISITS production data confirms: 9,728 successful SDPC transactions use A/C, not O/C.

**TransactionType O (Open) + Status A**: Used to create a new active span or extend an active span's end date to a later date.

**TransactionType O (Open) + Status S**: Used to create a new suspended span or extend a suspended span's end date to a later date.

### BC Suspension → MMIS Translation

Blue Compass stores the suspension begin date as the actual date the suspension takes effect (the date the user enters). However, because the participant could have received services earlier on that day, the MMIS suspension span begin date is sent as **BC suspension begin date + 1** (the first full day the participant could not receive services). The BC suspension begin date itself becomes the last day of the preceding active enrollment span.

When a user adds a suspension in BC, BC must generate **two MMIS transactions**:
1. Update the existing active MMIS enrollment span: set its end date to the **BC suspension begin date** (not begin date - 1), using the existing MMIS span begin date as the anchor. This ends the active enrollment span on the suspension date — the last day the participant could have received services.
2. Send a new suspended span: begin date = **BC suspension begin date + 1**, end date = **BC suspension end date − 1**, `Status: S`, `TransactionType: O`.

If the suspension has an end date, a third transaction is also required:
3. Send a new active enrollment span: begin date = **BC suspension end date** (not +1 — the participant is treated as active on the suspension end date and could have received services that day), end date = the original enrollment end date (typically 12/31/2299), `Status: A`, `TransactionType: O`.

**Example**: User enters suspension begin date 03/01/2025 and end date 06/01/2025 in Blue Compass.
- Span-A (Active) end date → **03/01/2025** (participant could receive services on 03/01)
- Span-B (Suspended) begin date → **03/02/2025** (first full day of suspension)
- Span-B (Suspended) end date → **05/31/2025** (BC suspension end date − 1)
- Span-C (Active) begin date → **06/01/2025** (BC suspension end date — participant active on this day)

**Suspension minimum duration rule:** Before sending any MMIS transactions for a new or updated suspension, BC must verify that the suspension span is at least 3 calendar days (begin date to end date inclusive). Applying the +1 begin offset and the -1 end offset to a 1-day or 2-day suspension produces a zero-day or negative-day MMIS suspense window, which is invalid. If `(BC suspension end date - BC suspension begin date) < 2 days`, BC must not send transactions to MMIS and should surface an error to the user. A 3-day span (e.g., Monday through Wednesday) is the minimum that produces a valid 1-day MMIS suspense window (Tuesday). Confirmed by Richard Ward (DHS) on 06/17/2026. See S240 Scenario 3.

### Initial Enrollment → MMIS Translation

When a new BC enrollment is created, BC sends one MMIS transaction:
- `DateEnrlEff` = BC enrollment begin date
- `DateEnrlEnd` = 12/31/2299 (MMIS high end date — always used for open-ended enrollments)
- `Status: A`, `TransactionType: O`
- `WaiverAgencyID` = ICA Medicaid Provider ID assigned at the enrollment begin date
- `WaiverFEA` = FEA Medicaid Provider ID assigned at the enrollment begin date
- FEA dates must exactly span the enrollment dates

### Agency / FEA Change → MMIS Translation

A participant always has both an ICA and an FEA assignment. Each MMIS enrollment span carries a specific ICA/FEA combination. When either the ICA or the FEA changes (e.g., ICA-001 → ICA-002, or FEA-001 → FEA-002), BC must end the current enrollment span that carries the old ICA/FEA combination and create a new span with the new ICA/FEA combination. Both the ICA and FEA are always sent on every transaction — even if only one of them changed, the other carries forward unchanged.

BC must generate two MMIS transactions:
1. Close the existing span: set end date to `(agency change effective date - 1)`, using the existing span begin date as the anchor. The transaction carries the **old** (pre-update) ICA and FEA values. `TransactionType: C`, `Status: A` (or `S` if the span is suspended).
2. Open a new span: begin date = agency change effective date, end date = 12/31/2299 (or the enrollment/suspension end date), with the **new** ICA/FEA combination. The unchanged agency carries forward at its current value. `TransactionType: O`, `Status: A` (or `S` if suspended).

If the agency change occurs during a suspended span and a post-suspension active enrollment span (Span-C) exists, BC must also:
3. Inactivate the existing Span-C: send `Status: I` with the exact existing Span-C begin and end dates and the **old** ICA/FEA values. This deletes the stale-agency span.
4. Create a new Span-C: same begin and end dates as the deleted span, with the **new** ICA/FEA combination. `TransactionType: O`, `Status: A`.

This is necessary because the entire post-suspension active span inherits the new agency — the agency change effective date falls within the suspension period, not within Span-C itself.

The new FEA dates must exactly span the new enrollment span dates. If they do not, MMIS will reject the transaction (Scenario 18 / 19 pattern).

### Key Constraints

- MMIS high end date: `12/31/2299` — always used for open-ended (no planned closure) enrollment spans.
- **Null end date rule (enrollment)**: Whenever a BC enrollment end date is null, the value sent to MMIS is `12/31/2299`. This applies to enrollment spans only. A BC enrollment end date of 12/31/2299 is treated as "no end date" for business logic purposes.
- **Null end date rule (suspension)**: When BC stores a null suspension end date, BC sends `12/31/2299` to MMIS. No Span-C is created for a null-end suspension — the participant is indefinitely suspended in MMIS until the user sets a suspension end date in BC. Confirmed by Gainwell dev testing (Xianwei Wang, 2026-05-18).
- FEA child segment dates must span the full enrollment segment dates or MMIS will reject.
- Waiver agencies/ICAs/FEAs cannot overlap within a waiver program.
- `Status: I` requires exact begin and end date match to the existing MMIS span.
- Suspension span begin date in MMIS is **BC suspension begin date + 1** — the first full day the participant could not receive services. The BC suspension begin date itself is the last day of the preceding active span (the participant could have received services earlier that day).
- Suspension span end date in MMIS is **BC suspension end date − 1** — the participant is treated as active on the BC suspension end date (could have received services the day they returned from e.g. hospital). The post-suspension active span (Span-C) begins on the BC suspension end date itself.
- BC UI should prevent users from creating changes that would leave suspension dates outside the enrollment span.

### Span-C Pattern (Post-Suspension Active Enrollment)

**When a suspension exists in BC, BC will always send a post-suspension active enrollment span (Span-C) to MMIS with end date = 12/31/2299.** This bridges the gap between BC's data model (single enrollment span + child suspension records) and MMIS's flat span model. MMIS will always have Span-A (active) → Span-B (suspended) → Span-C (active through 12/31/2299) for any enrollment with a suspension that has an end date. This is a new BC pattern — WISITS does not currently send Span-C. Today, WISITS sends two transactions when a suspension ends: one to move the suspension end date back, and then a new Open request to create the enrollment span. With BC, Span-C will already exist in MMIS, so an update using the high-end date (12/31/2299) as the anchor is used instead of creating a new span. Confirmed by DHS and Gainwell on 03/18/2026. DHS noted that enrollment reporting may need to be updated to account for Span-C, since current reporting only pulls the most recent segment.

### Suspension Duration — IRIS Policy vs MMIS Constraint

**The 90-day suspension limit is an IRIS program policy rule, not an MMIS system constraint.** If a participant has been suspended for 90 days, IRIS policy requires disenrollment. However, WISITS previously sent a **120-day** suspension span to MMIS to provide a buffer beyond the 90-day policy limit. Gainwell has confirmed that the 90-day MMIS suspension rejection rule has been turned off — MMIS will no longer reject suspension spans based on duration. The 90-day limit remains an IRIS program policy that BC should enforce through business rules, but MMIS will accept suspension spans of any duration. BC should determine the appropriate suspension end date to send — the 120-day convention was a WISITS implementation detail. Confirmed by DHS on 03/18/2026; 90-day rule turned off confirmed by Gainwell.

### Suspension Span — End Date Handling

**When BC stores a null suspension end date, BC sends `12/31/2299` (the MMIS high end date) to MMIS.** The BC UI does not enforce a maximum suspension duration, so users may enter any end date or leave it blank. The value sent to MMIS is always the raw BC value — no cap or calculation is applied.

- If BC stores a **null** suspension end date → send `12/31/2299` to MMIS.
- If BC stores an **explicit** end date → send that date as-is.

This rule applies to all suspension transactions: S240 (new suspension), S230 Scenario 3 (end date changed to earlier), and S230 Scenario 4 (end date changed to later).

**Consequence of null end date:** When a suspension has no end date, MMIS will have Span-A (active, ending on BC suspension begin date) → Span-B (suspended, ending 12/31/2299). No Span-C is created because there is no post-suspension enrollment to follow. The participant is indefinitely suspended in MMIS. To resume enrollment, the user must set a suspension end date in BC, which triggers S230 to update Span-B and create Span-C.

Confirmed by Gainwell dev testing (Xianwei Wang, 2026-05-18): MMIS accepts `12/31/2299` as a suspension span end date (`Status: S`, `TransactionType: O`, `DateEnrlEnd: "22991231"`).

- S240 Scenario 2 (suspension without end date) sends `12/31/2299` to MMIS. No Span-C is created.
- S230 Scenarios 3 and 4 (suspension end date changed to earlier/later) apply when the user changes an existing end date to a different explicit date; the raw BC value is sent.

### Transaction Sequencing — One Span Per API Call

**Each MMIS API call contains exactly one enrollment span.** When a BC save event produces multiple MMIS transactions (e.g., S500 + S520 + S510 for a new suspension, or S310 + S300 for a begin date change), each transaction is a separate API call sent in sequence. The decision tables define the order in which those calls must be made — the order is mandatory because MMIS enforces non-overlapping contiguous spans and will reject any call that creates an overlap with an existing span.

Only the span(s) directly affected by the BC change are sent. Historical spans that are not being modified are not re-sent.

---

### Address-Only Update → MMIS Translation

When a participant's residential address changes in BC, BC must send the updated address to MMIS. This is done by resending the current MMIS span with the exact same begin and end dates, `TransactionType: O (Open)`, and the span's current status (A or S), but with the new address fields. MMIS will accept this and update the address without modifying the enrollment dates. No date changes are needed. Confirmed by Gainwell on 03/18/2026.

### Recertification Completion Date — MMIS Field Rule

**The `RecertificationCompleteDate` field is required in every MMIS enrollment transaction.** MMIS will reject the transaction if this field is omitted. The field is not meaningful to MMIS for business logic purposes — it is stored but not used for eligibility or claims processing. Confirmed by Kim Jewett (DHS) on 06/17/2026.

**Rule:** Set `RecertificationCompleteDate` = the enrollment segment begin date (`DateEnrlEff`) for the transaction being sent.

- For a new enrollment (S300): `RecertificationCompleteDate` = BC enrollment begin date
- For a post-suspension enrollment span (S360, S520): `RecertificationCompleteDate` = the span begin date (BC suspension end date + 1)
- For a new agency span (S610): `RecertificationCompleteDate` = the agency change effective date

**Why this rule:** Sending the plan begin date (the BC recertification/plan start date) as the `RecertificationCompleteDate` consistently generates MMIS warning error 9190: "recertification completion date cannot be before enrollment effective date." This occurs because the plan begin date is often in the future (for scheduled enrollments) or predates the current enrollment segment (for return-from-suspension transactions). Using the enrollment segment begin date (`DateEnrlEff`) matches the segment it is being sent on, eliminating the warning without affecting MMIS processing. Confirmed by Richard Ward (DHS) and the development team on 06/17/2026.

**Warning vs. rejection:** Error 9190 is a warning, not a hard rejection — MMIS returns "success with errors" and the enrollment is processed. However, the warning is displayed to the BC user and can be mistaken for a real error. Using `DateEnrlEff` as the value eliminates the warning for all transaction types except scheduled future enrollments, where a warning may still occur if the enrollment begin date is in the future at the time of the transaction.

**SDPC:** The `SDPCEnrollmentRequest` API does not include a recertification date field. This rule applies to IRIS transactions only.

---

### IRIS vs SDPC — FEA/ICA Assignment Rule

**FEA and ICA assignments only affect IRIS enrollments.** Changes to a participant's FEA or ICA assignment do not trigger any MMIS transaction for SDPC enrollment records. SDPC enrollments do not have FEA or ICA agency assignments. Therefore, S100 does not include SDPC FEA/ICA scenarios — only IRIS FEA/ICA changes (Conditions 5 and 6) route to S250.

### Disenrollment Workflow — BC User Actions

**When a participant is disenrolled (including death), the BC user performs two actions:**
1. End-date the enrollment span (set the enrollment end date to the disenrollment date)
2. Create a new "Disenrolled" span in BC (this is a BC-only record for tracking purposes)

**BC does not send the Disenrolled span to MMIS.** The only MMIS transaction is the enrollment end date change, which routes through S220 Condition 4 (end date changed to earlier date) → S340 (Closure transaction). This applies to all disenrollment scenarios including participant death — the MMIS transaction is the same (end-date the enrollment span).

**"Inactive" is not a valid BC enrollment status.** The only use of Status I (Inactive) is in MMIS transactions to fully delete a span that should never have existed (e.g., Referral Withdrawn). Normal disenrollments use Closure with Status A to end-date the span, not Status I.

### Reason Codes

- **Reason 2L**: Always used for initial enrollment (new enrollment added), address-only updates, enrollment end date extensions, and span deletions (Status I).
- **Reason 2I**: Used for enrolled-to-suspended transitions (closing active span and opening suspended span).
- **Reason 2Q**: Used for suspended-to-enrolled transitions (closing suspended span and opening active span).
- **Reason 2P**: Used for ICA transfer transitions (closing old-agency span and opening new-agency span).
- **Reason 2R**: Used for FEA transfer transitions (closing old-agency span and opening new-agency span).
- **Reason 2W**: Used as StopReasonCode on span deletions (Status I) and when closing a suspended span (suspended-to-enrolled).
- **Disenrollment reason codes**: The same BC disenrollment reason code (e.g., 64=DOD, 7C=Choosing New Option) is used for both StartReasonCode and StopReasonCode on disenrollment closure transactions.
- **StopReasonCode null rule**: StopReasonCode must be null when the span end date is 12/31/2299 (open-ended). When the span has any other end date, a StopReasonCode is required — MMIS will reject with error 9189 ("A Stop Reason Code is required when the end date does not equal 12/31/2299") if it is omitted.

These reason codes will appear in the transaction data but are not reflected in the span diagrams. Confirmed during 03/18/2026 meeting.

### BC UI Constraints — Enrollment and Suspension Boundaries

**The BC UI will not allow an enrollment to be shortened to have an end date that falls within a suspension.** The enrollment end date can be set to the same date as a suspension end date (making them coincide), but it cannot fall between the suspension begin and end dates. This prevents scenarios where a suspension would extend beyond the enrollment period.

**Implication for decision tables:** S220 Condition 4 (enrollment end date changed to earlier date) does not need to handle the case where the new end date falls within a suspension — the BC UI prevents this. The only valid scenario is where the new enrollment end date is either before the suspension begins or equal to the suspension end date.

### ICA and FEA Changes — Separate Records, Separate Saves

**An ICA change and an FEA change cannot occur in the same save operation** because they are separate records in BC (PersonLocationAssignment). However, a new ICA and a new FEA can be assigned with the same effective date — this would be two separate saves and two separate MMIS transactions.

**Implication for decision tables:** S100 Conditions 5 (FEA change) and 6 (ICA change) are correctly modeled as separate, mutually exclusive events. If both ICA and FEA change with the same effective date, S100 will fire twice (once for each save), and S250 will process each change independently. The second transaction will close the span created by the first transaction and create a new span with the updated agency. This is the correct behavior — each save triggers a complete close/open cycle.

### MMIS Span End Dates Must Reflect BC Data

**MMIS spans can only be created based on existing BC spans.** End dates on new MMIS spans are derived from S200/S210 calculated spans, which in turn derive from BC enrollment and suspension dates. No MMIS span end date should be hardcoded — it must trace back to a BC source value.

This means:
- When S250 (agency change) creates a new span after closing the old one, the new span's end date comes from the corresponding S200-calculated span, not a hardcoded value like 12/31/2299.
- If the BC enrollment end date is null (open-ended), S200 will have calculated the span with end date 12/31/2299 — so the value is still correct, but it flows through S200 rather than being assumed by the field-setting table.
- If the BC enrollment has a real end date, the S200-calculated span will carry that date, and the field-setting table will use it.
- This principle applies to all field-setting tables that create new spans: S300, S360, S520, S610, S620.

---

## SHEETS Config

```python
SHEETS = [

    ('S100.csv', 'S100_Start',                        'Enrollment Service', 'This page represents the initialization of processing flow'),
    ('S200.csv', 'S200_Calculate_MMIS_IRIS_Spans',    'Enrollment Service', 'Calculate the current MMIS enrollment and suspense spans for the IRIS participant'),
    ('S210.csv', 'S210_Calculate_MMIS_SDPC_Spans',    'Enrollment Service', 'Calculate the current MMIS enrollment and suspense spans for the SDPC participant'),
    ('S220.csv', 'S220_Enroll_Add_Update',            'Enrollment Service', 'This page represents logic for adding or updating enrollment records in Blue Compass'),
    ('S230.csv', 'S230_Suspense_Update',              'Enrollment Service', 'This page represents logic for updating suspense records in Blue Compass'),
    ('S240.csv', 'S240_Suspense_Add',                 'Enrollment Service', 'This page represents logic for adding suspense records in Blue Compass'),
    ('S250.csv', 'S250_Location_Assignment_Update',   'Enrollment Service', 'This page represents logic for changes to FEA or ICA'),
    ('S255.csv', 'S255_Resend_Span_New_Agency',       'Enrollment Service', 'IRIS only: For a single pre-calculated MMIS span, conditionally delete the old-agency span then create the new-agency span'),
    ('S300.csv', 'S300_Create_New_Enroll_Span',       'Enrollment Service', 'Send a request to add a new enrollment span'),
    ('S310.csv', 'S310_Delete_Enroll_Span',           'Enrollment Service', 'Send a request to inactivate an existing MMIS span'),
    # S320 RETIRED — superseded by S310+S300 (delete+create). MMIS does not support end date as anchor for begin date changes.
    # S330 RETIRED — superseded by S310+S300 (delete+create). MMIS does not support end date as anchor for begin date changes.
    ('S340.csv', 'S340_Update_Enroll_End_Earlier',    'Enrollment Service', 'Send a request to update enrollment end date to earlier date'),
    ('S350.csv', 'S350_Update_Enroll_End_Later',      'Enrollment Service', 'Send a request to update enrollment end date to later date'),
    ('S360.csv', 'S360_Create_Enrollment_After_Suspension', 'Enrollment Service', 'Create New Enrollment to Succeed Suspension'),
    ('S400.csv', 'S400_Update_Span_A_End_Date',       'Enrollment Service', 'Send an update request for Span-A with new end date'),
    ('S410.csv', 'S410_Delete_Suspense_Span',         'Enrollment Service', 'Send a request to inactivate an existing MMIS span'),
    # S420 RETIRED — superseded by S410+S510 (delete+create). MMIS does not support end date as anchor for begin date changes.
    # S430 RETIRED — superseded by S410+S510 (delete+create). MMIS does not support end date as anchor for begin date changes.
    ('S440.csv', 'S440_Update_Suspense_End_Earlier',  'Enrollment Service', 'Send a request to update a suspense end date to an earlier date'),
    ('S445.csv', 'S445_Update_Suspense_End_Later',    'Enrollment Service', 'Send a request to update a suspense end date to a later date (TransactionType O)'),
    # S450 RETIRED — superseded by S310+S520 (delete+create). MMIS does not support end date as anchor for begin date changes.
    # S460 RETIRED — superseded by S310+S520 (delete+create). MMIS does not support end date as anchor for begin date changes.
    ('S470.csv', 'S470_Update_Span_A_End_Later',       'Enrollment Service', 'Send an update request for Span-A with new later end date = (Span-C Begin Date - 1)'),
    ('S500.csv', 'S500_Close_Span_A_Before_Suspense', 'Enrollment Service', 'Send a request to set the end date for Span-A to the new BC suspense begin date'),
    ('S510.csv', 'S510_Add_Suspense_Span',            'Enrollment Service', 'Send an add request for the new suspense span (Span-B) with begin date = (BC suspense begin date + 1) and end date = BC suspense end date minus one calendar day'),
    ('S520.csv', 'S520_Create_Span_C_After_Suspense', 'Enrollment Service', 'Send an Active/Open Span-C after the new suspension with begin date = BC suspense end date'),  # no +1 — participant is active on BC suspension end date
    ('S600.csv', 'S600_Close_Span_B_For_Agency_Change', 'Enrollment Service', 'IRIS only: Send an update request for Span-B with end date = (agency change effective date - 1), using existing Span-B begin date as the anchor'),
    ('S610.csv', 'S610_Create_Active_Span_New_Agency', 'Enrollment Service', 'IRIS only: Send a new active enrollment span with the new ICA/FEA, begin date = agency change effective date, end date = S200-calculated span end date'),
    ('S620.csv', 'S620_Create_Suspended_Span_New_Agency', 'Enrollment Service', 'IRIS only: Send a new suspended span (Span-C) with the new ICA/FEA, begin date = agency change effective date, end date = Span-B pre-update end date'),
    ('S700.csv', 'S700_Address_Only_Update',              'Enrollment Service', 'Send an address-only update for the current MMIS span using the same begin/end dates and TransactionType O (Open)'),
]
```

---

<!-- S000 removed — superseded by S100 (IRIS + SDPC) -->

---

## S100 — Start / Processing Flow Initialization (IRIS + SDPC)

**File**: `S100.csv`
**Sheet**: `S100_Start`
**Title**: `S100_Start`
**Feature**: `Enrollment Service`
**Description**: `This page represents the initialization of processing flow`
**Last Update**: `03/18/2026`
**Scenarios**: 11

### Conditions

| # | Description | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|-------------|---|---|---|---|---|---|---|---|---|----|----|----|
| 1 | A new IRIS enrollment table entry is added. | Y | N | N | N | N | N | N | N | N | N | N |
| 2 | An existing IRIS enrollment table entry is updated. | N | Y | N | N | N | N | N | N | N | N | N |
| 3 | A new IRIS suspension table entry is added. | N | N | Y | N | N | N | N | N | N | N | N |
| 4 | An existing IRIS suspension table entry is updated. | N | N | N | Y | N | N | N | N | N | N | N |
| 5 | A participant's FEA assignment is updated. | N | N | N | N | Y | N | N | N | N | N | N |
| 6 | A participant's ICA assignment is updated. | N | N | N | N | N | Y | N | N | N | N | N |
| 7 | A new SDPC enrollment table entry is added. | N | N | N | N | N | N | Y | N | N | N | N |
| 8 | An existing SDPC enrollment table entry is updated. | N | N | N | N | N | N | N | Y | N | N | N |
| 9 | A new SDPC suspension table entry is added. | N | N | N | N | N | N | N | N | Y | N | N |
| 10 | An existing SDPC suspension table entry is updated. | N | N | N | N | N | N | N | N | N | Y | N |
| 11 | A participant's residential address is updated (IRIS only — SDPCEnrollmentRequest does not include address fields). | N | N | N | N | N | N | N | N | N | N | Y |

### Actions

| # | Description | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|-------------|---|---|---|---|---|---|---|---|---|----|----|----|
| 1 | Call S200_Calculate_MMIS_IRIS_Spans | X | X | X | X | X | X | | | | | X |
| 2 | Call S210_Calculate_MMIS_SDPC_Spans | | | | | | | X | X | X | X | |
| 3 | Call S220_Enroll_Add_Update | X | X | | | | | X | X | | | |
| 4 | Call S240_Suspense_Add | | | X | | | | | | X | | |
| 5 | Call S230_Suspense_Update | | | | X | | | | | | X | |
| 6 | Call S250_Location_Assignment_Update | | | | | X | X | | | | | |
| 7 | Call S700_Address_Only_Update | | | | | | | | | | | X |
| 8 | End | X | X | X | X | X | X | X | X | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S100_001 - New IRIS Enrollment - user added a new IRIS enrollment table entry. Action #1 calculates MMIS IRIS spans. Action #3 processes the new enrollment. |
| 2 | Scenario: S100_002 - Updated IRIS Enrollment - user updated an existing IRIS enrollment table entry. Action #1 calculates MMIS IRIS spans. Action #3 processes the enrollment update. Note: when an existing enrollment entry is updated from 'Disenrolled' to 'Enrolled' status, this condition applies and S220 routes to Condition 7. |
| 3 | Scenario: S100_003 - New IRIS Suspension - user added a new IRIS suspension table entry. Action #1 calculates MMIS IRIS spans. Action #4 processes the new suspension. |
| 4 | Scenario: S100_004 - Updated IRIS Suspension - user updated an existing IRIS suspension table entry. Action #1 calculates MMIS IRIS spans. Action #5 processes the suspension update. |
| 5 | Scenario: S100_005 - FEA Change - user updated a participant's FEA assignment (IRIS only — FEA/ICA assignments do not apply to SDPC). Action #1 calculates MMIS IRIS spans. Action #6 processes the agency change. |
| 6 | Scenario: S100_006 - ICA Change - user updated a participant's ICA assignment (IRIS only — FEA/ICA assignments do not apply to SDPC). Action #1 calculates MMIS IRIS spans. Action #6 processes the agency change. |
| 7 | Scenario: S100_007 - New SDPC Enrollment - user added a new SDPC enrollment table entry. Action #2 calculates MMIS SDPC spans. Action #3 processes the new enrollment. |
| 8 | Scenario: S100_008 - Updated SDPC Enrollment - user updated an existing SDPC enrollment table entry. Action #2 calculates MMIS SDPC spans. Action #3 processes the enrollment update. Note: when an existing SDPC enrollment entry is updated from 'Disenrolled' to 'Enrolled' status, this condition applies and S220 routes to Condition 7. |
| 9 | Scenario: S100_009 - New SDPC Suspension - user added a new SDPC suspension table entry. Action #2 calculates MMIS SDPC spans. Action #4 processes the new suspension. |
| 10 | Scenario: S100_010 - Updated SDPC Suspension - user updated an existing SDPC suspension table entry. Action #2 calculates MMIS SDPC spans. Action #5 processes the suspension update. |
| 11 | Scenario: S100_011 - Address Update (IRIS only) - user updated a participant's residential address. Action #1 calculates MMIS IRIS spans. Action #7 sends the address-only update for the IRIS MMIS span that includes the current date, if one exists. If no S200-calculated span includes the current date (participant is disenrolled or has no active MMIS enrollment as of today), no MMIS transaction is sent. Only S200 is called (not S210) because the SDPCEnrollmentRequest API does not include address fields. |

---

## S200 — Calculate MMIS IRIS Spans

**File**: `S200.csv`
**Sheet**: `S200_Calculate_MMIS_IRIS_Spans`
**Title**: `S200 Calculate MMIS IRIS Spans`
**Feature**: `Enrollment Service`
**Description**: `Calculate the current MMIS enrollment and suspense spans for the IRIS participant by translating BC enrollment, suspension, and agency assignment data into the equivalent MMIS flat-span model`
**Last Update**: `03/17/2026`
**Scenarios**: 4

### Conditions

| # | Description | 1 | 2 | 3 | 4 |
|---|-------------|---|---|---|---|
| 1 | BC IRIS enrollment span exists for the participant | Y | Y | Y | Y |
| 2 | BC enrollment has one or more suspension records | N | Y | N | Y |
| 3 | BC enrollment has ICA/FEA assignment changes within the enrollment period | N | N | Y | Y |

### Actions

| # | Description | 1 | 2 | 3 | 4 |
|---|-------------|---|---|---|---|
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

| # | Note |
|---|------|
| 1 | Scenario: S200_001 - Enrollment only, no suspensions, no agency changes. A single MMIS span is calculated: Active, BC enrollment begin to BC enrollment end (if null send 12/31/2299). The ICA and FEA assigned at the enrollment begin date are used. Action #1 loads enrollment dates. Action #4 builds a single MMIS span. Action #6 assigns ICA and FEA. Action #7 sets FEA dates to match the span. Action #8 stores the calculated span list. |
| 2 | Scenario: S200_002 - Enrollment with suspensions, no agency changes. The enrollment span is split at each suspension boundary: Active (enrollment begin → suspension begin), Suspended (suspension begin + 1 → suspension end), Active (suspension end + 1 → enrollment end or next suspension begin). If a suspension has no end date, BC sends 12/31/2299 to MMIS as the suspension end date — no Span-C is created, and the S200-calculated span list will show Span-B ending 12/31/2299 with no succeeding span. Multiple suspensions with real end dates produce alternating Active/Suspended/Active segments. Action #1 loads enrollment dates. Action #2 loads suspension spans. Action #4 builds MMIS spans from enrollment and suspension boundaries. Action #6 assigns ICA and FEA. Action #7 sets FEA dates to match each span. Action #8 stores the calculated span list. |
| 3 | Scenario: S200_003 - Enrollment with agency changes, no suspensions. The enrollment span is split at each agency change effective date: the pre-change span ends on (effective date - 1) with the old ICA/FEA, and a new span begins on the effective date with the new ICA/FEA. Action #1 loads enrollment dates. Action #3 loads ICA/FEA assignments. Action #4 builds base MMIS spans. Action #5 splits spans at agency change boundaries. Action #6 assigns ICA and FEA. Action #7 sets FEA dates to match each span. Action #8 stores the calculated span list. |
| 4 | Scenario: S200_004 - Enrollment with both suspensions and agency changes. Suspension boundaries are applied first to create the base Active/Suspended segments, then agency change boundaries split any span that contains an agency change effective date. Each resulting span gets the ICA/FEA that was effective at that span's begin date. Action #1 loads enrollment dates. Action #2 loads suspension spans. Action #3 loads ICA/FEA assignments. Action #4 builds MMIS spans from enrollment and suspension boundaries. Action #5 splits spans at agency change boundaries. Action #6 assigns ICA and FEA. Action #7 sets FEA dates to match each span. Action #8 stores the calculated span list. |

### Notes

- **Purpose**: S200 translates the BC two-table model (ProgramEnrollment + ProgramEnrollmentSuspension) into the MMIS single flat-span model. The calculated spans represent what MMIS should have on file after all transactions are processed. Downstream tables (S220–S620) use these calculated spans to identify Span-A, Span-B, and Span-C for each scenario and determine which MMIS transactions to send.
- **BC Data Model**: BC stores enrollment in `ProgramEnrollmentModule.ProgramEnrollment` (one row per enrolled period) and suspensions in `ProgramEnrollmentModule.ProgramEnrollmentSuspension` (child rows with their own begin/end dates). ICA and FEA assignments are in `PersonModule.PersonLocationAssignment` with effective date ranges.
- **MMIS Data Model**: MMIS stores all enrollment and suspension data in a single flat span table. Each row is one contiguous span with a begin date, end date, status (A/S/I), ICA (WaiverAgencyID), and FEA (WaiverFEA). MMIS enforces non-overlapping, contiguous spans — any transaction that would create an overlap is rejected.
- **Action 4 — Build base MMIS spans**: This is the core translation step. Starting with the BC enrollment span, each suspension creates a split point: the Active span before the suspension ends on the BC suspension begin date (the last day the participant could have received services), the Suspended span covers (suspension begin + 1 → suspension end), and a new Active span begins on (suspension end + 1). This follows the pattern documented in Core Knowledge section "BC Suspension → MMIS Translation" and confirmed by Gainwell Scenario 21 and the Aug 7 2025 meeting minutes ("BC sends Suspension Start Date + 1").
- **Action 5 — Split spans at agency change boundaries**: For each ICA or FEA assignment change effective date that falls within a calculated span, that span is split into two: the first piece retains the pre-change agency and ends on (effective date - 1), the second piece begins on the effective date with the new agency. This follows the pattern documented in Core Knowledge section "Agency / FEA Change → MMIS Translation" and confirmed by Gainwell Scenarios 15/16/19.
- **Action 6 — Assign ICA and FEA**: Each span's ICA is looked up from `PersonModule.PersonLocationAssignment` where `PersonLocationAssignmentTypeDisplayName = "ICA"` and the span's begin date falls within the assignment's effective date range. The FEA is looked up the same way with `PersonLocationAssignmentTypeDisplayName = "FEA"`. The Medicaid Provider ID is retrieved from `OrganizationModule.LocationIdentifiers` where `TypeDisplayName = "MMIS Provider Number"` (per the ICD EnrollmentRequest mapping for WaiverAgencyID and WaiverFEA).
- **Action 7 — FEA dates must span the enrollment segment**: Per the MMIS constraint (Gainwell Scenarios 18/19, error code 9156 "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD"), the FEA effective date and end date on each span must exactly match that span's enrollment begin and end dates. This is set during span calculation so downstream tables can populate the FEANode correctly.
- **Action 8 — Store spans**: The ordered list of calculated spans is the primary output of S200. Each span contains: begin date, end date, status (A or S), ICA Medicaid Provider ID, FEA Medicaid Provider ID, FEA effective date, FEA end date. Downstream tables reference this list to identify which span is Span-A (preceding), Span-B (directly affected), and Span-C (succeeding) for the specific BC change being processed.
- **Procedural nature**: Actions 4, 5, 6, and 7 are inherently iterative (loop through suspensions, loop through agency changes, split spans). The decision table captures the high-level branching based on whether suspensions and agency changes exist, but the actual span-building logic within each scenario is algorithmic and will be implemented as code logic rather than further decision table decomposition.
- **IRIS only**: S200 applies only to IRIS enrollments. SDPC enrollments are handled by S210. Per the Core Knowledge section "IRIS vs SDPC — FEA/ICA Assignment Rule", FEA and ICA assignments only affect IRIS enrollments — SDPC enrollments do not have FEA or ICA agency assignments.

---

## S210 — Calculate MMIS SDPC Spans

**File**: `S210.csv`
**Sheet**: `S210_Calculate_MMIS_SDPC_Spans`
**Title**: `S210 Calculate MMIS SDPC Spans`
**Feature**: `Enrollment Service`
**Description**: `Calculate the current MMIS enrollment and suspense spans for the SDPC participant by translating BC enrollment and suspension data into the equivalent MMIS flat-span model`
**Last Update**: `03/18/2026`
**Scenarios**: 2

### Conditions

| # | Description | 1 | 2 |
|---|-------------|---|---|
| 1 | BC SDPC enrollment span exists for the participant | Y | Y |
| 2 | BC enrollment has one or more suspension records | N | Y |

### Actions

| # | Description | 1 | 2 |
|---|-------------|---|---|
| 1 | Load BC SDPC enrollment span dates (begin date, end date) | X | X |
| 2 | Load all BC suspension spans (begin date, end date) ordered by begin date | | X |
| 3 | Build base MMIS spans from enrollment and suspension boundaries | X | X |
| 4 | Assign SDPC Agency Medicaid Provider ID to each calculated span | X | X |
| 5 | Store the ordered list of calculated MMIS spans for use by downstream decision tables | X | X |
| 6 | Return to Calling Step | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S210_001 - Enrollment only, no suspensions. A single MMIS span is calculated: Active, BC enrollment begin to BC enrollment end (if null send 12/31/2299). The single SDPC Oversight Agency is used for the span. Action #1 loads enrollment dates. Action #3 builds a single MMIS span. Action #4 assigns SDPC Agency. Action #5 stores the calculated span list. |
| 2 | Scenario: S210_002 - Enrollment with suspensions. The enrollment span is split at each suspension boundary: Active (enrollment begin → suspension begin), Suspended (suspension begin + 1 → suspension end), Active (suspension end + 1 → enrollment end or next suspension begin). If a suspension has no end date, BC sends 12/31/2299 to MMIS as the suspension end date — no Span-C is created, and the S210-calculated span list will show Span-B ending 12/31/2299 with no succeeding span. Multiple suspensions with real end dates produce alternating Active/Suspended/Active segments. Action #1 loads enrollment dates. Action #2 loads suspension spans. Action #3 builds MMIS spans from enrollment and suspension boundaries. Action #4 assigns SDPC Agency. Action #5 stores the calculated span list. |

### Notes

- **SDPC only**: S210 applies only to SDPC enrollments. IRIS enrollments are handled by S200.
- **No FEA/ICA**: SDPC enrollments do not have FEA or ICA agency assignments. There is no FEA node in the `SDPCEnrollmentRequest` API.
- **Single SDPC agency**: There is only one SDPC Oversight Agency, so there are no agency changes and no need to split spans at agency boundaries. The `SDPCAgencyID` is looked up from `PersonLocationAssignment` where `PersonLocationAssignmentTypeDisplayName = "SDPC"`, then the Medicaid Provider ID is retrieved from `LocationIdentifiers` where `TypeDisplayName = "MMIS Provider Number"`.
- **No agency-change condition**: Unlike S200 (which has 3 conditions and 4 scenarios to handle ICA/FEA changes), S210 only needs 2 conditions and 2 scenarios because the agency dimension does not apply.
- **Simpler MMIS API**: SDPC uses `SDPCEnrollmentRequest` with `SDPCEnrollmentNode`. Each span needs: `SDPCAgencyID`, `DateSDPCEffective`, `DateSDPCEnd`, `Status`, `TransactionType`. TransactionType values are `O` (Open) and `C` (Closure) — same as IRIS.
- **Action 3 — Build base MMIS spans**: Same algorithm as S200 Action 4: starting with the BC enrollment span, each suspension creates a split point. Active span ends on the BC suspension begin date, Suspended span covers (suspension begin + 1 → suspension end), new Active span begins on (suspension end + 1). This follows the Core Knowledge "BC Suspension → MMIS Translation" pattern.
- **Action 4 — Assign SDPC Agency**: The same SDPC Agency Medicaid Provider ID is assigned to every calculated span. No date-range lookup is needed since there is only one SDPC agency.
- **Span output format**: Each calculated span contains: begin date, end date, status (A or S), SDPC Agency Medicaid Provider ID. Downstream tables reference this list to identify Span-A, Span-B, and Span-C for the specific BC change being processed.
- **Procedural nature**: Action 3 is iterative (loop through suspensions, split spans). The decision table captures the high-level branching, but the span-building logic is algorithmic and will be implemented as code.

---

## S220 — Enrollment Add / Update

**File**: `S220.csv`
**Sheet**: `S220_Enroll_Add_Update`
**Title**: `S220_Enroll_Add_Update`
**Feature**: `Enrollment Service`
**Description**: `This page represents logic for adding or updating enrollment records in Blue Compass`
**Last Update**: `06/11/2026`
**Scenarios**: 7

### Conditions

| # | Description | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|-------------|---|---|---|---|---|---|---|
| 1 | New Enrollment Added | Y | N | N | N | N | N | N |
| 2 | BC Enrollment begin date changed to earlier date | N | Y | N | N | N | N | N |
| 3 | BC Enrollment begin date changed to later date | N | N | Y | N | N | N | N |
| 4 | BC Enrollment end date changed to an earlier date | N | N | N | Y | N | N | N |
| 5 | BC Enrollment end date changed to a later date | N | N | N | N | Y | N | N |
| 6 | BC Enrollment status changed from 'Enrolled' to 'Referral Withdrawn' | N | N | N | N | N | Y | N |
| 7 | BC Enrollment status changed from 'Disenrolled' to 'Enrolled' | N | N | N | N | N | N | Y |

### Actions

| # | Description | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|-------------|---|---|---|---|---|---|---|
| 1 | Identify Span-B: the MMIS Active Span that is directly changed by the BC change (see the scenario note for how to identify). | | X | X | X | X | X | |
| 2 | Call S300 to Send a new enrollment span (with the new BC Enrolled span dates). | X | | | | | | X |
| 3 | Call S310 to Send a Inactivate request to delete existing MMIS Span-B with existing MMIS begin and end dates. | | | | | | X | |
| 4 | Call S310 to delete existing MMIS Span-B (exact begin/end date match). | | X | X | | | | |
| 5 | Call S300 to create a new enrollment span with the new BC enrollment begin date and existing end date. | | X | X | | | | |
| 6 | Call S340 to Send an update for Span-B with a new earlier end date and existing begin date (as the anchor). | | | | X | | | |
| 7 | Call S350 to Send an update for Span-B with a new later end date and existing begin date (as the anchor). | | | | | X | | |
| 8 | Return to Calling Step | X | X | X | X | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S220_001 - New Enrollment Added. Action #2 sends a new enrollment span to MMIS. |
| 2 | Scenario: S220_002 - Enrollment begin date changed to earlier date. If a BC enrollment begin date changed then Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new earlier begin date and existing end date. |
| 3 | Scenario: S220_003 - Enrollment begin date changed to later date. If a BC enrollment begin date changed then Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new later begin date and existing end date. |
| 4 | Scenario: S220_004 - Enrollment end date changed to an earlier date. If a BC enrollment end date changed then Span-B is the S200-Calculated MMIS span with the latest begin date and an Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #6 updates Span-B with the new earlier end date. |
| 5 | Scenario: S220_005 - Enrollment end date changed to a later date. If a BC enrollment end date changed then Span-B is the S200-Calculated MMIS span with the latest begin date and an Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #7 updates Span-B with the new later end date. |
| 6 | Scenario: S220_006 - Enrollment status changed from 'Enrolled' to 'Referral Withdrawn'. If BC Enrolled changes to Referral Withdrawn there is only one S200-Calculated MMIS span with an Active Status (dates would match the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #3 sends an Inactivate request to delete Span-B. |
| 7 | Scenario: S220_007 - Enrollment status changed from 'Disenrolled' to 'Enrolled'. The Disenrolled span exists only in BC — MMIS has no span for this period because the prior enrollment was already closed when the Disenrolled span was originally created. No Span-B identification is needed. Action #2 sends a new enrollment span to MMIS opening at the Disenrolled span begin date with end date 12/31/2299. StartReasonCode = 2L (New Enrollment). StopReasonCode is Not Required (end date is 12/31/2299). |

### Notes

- For changes, Span-B is always the MMIS span that is directly changed by the BC change, Span-A is the preceding MMIS span, and Span-C is the succeeding span.
- The UI should prevent user from updating an enrollment span that would leave part of a suspension span outside of the Enrolled span.
- Reason 2L - Always used for initial enrollment and for reinstating an enrollment changed from Disenrolled to Enrolled.
- Reason 2I - Always used for enrolled to suspended, or suspended to enrolled.
- When there is a suspense, the suspense span begin date sent to MMIS is BC suspension begin date + 1, because the participant could have received services on the BC suspension begin date.
- To inactivate, the MMIS span's begin and end date must match the request begin and end date. Same ICA and FEA agencies.
- I (Inactive) is only used to "Delete" a record at MMIS.
- Begin date changes require delete (S310) + create (S300) — MMIS does not support end date as anchor for begin date changes.
- When a BC enrollment status changes from Disenrolled to Enrolled, MMIS has no corresponding span for the disenrollment period — the prior enrolled span was already closed by the original disenrollment transaction. BC treats the reinstated enrollment as a new Open span.

---

## S230 — Suspense Update

**File**: `S230.csv`
**Sheet**: `S230_Suspense_Update`
**Title**: `S230_Suspense_Update`
**Feature**: `Enrollment Service`
**Description**: `This page represents logic for updating suspense records in Blue Compass`
**Last Update**: `06/21/2026`
**Scenarios**: 7

### Conditions

| # | Description | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|-------------|---|---|---|---|---|---|---|
| 1 | Suspense begin date changed to earlier date | Y | N | N | N | N | N | N |
| 2 | Suspense begin date changed to later date | N | Y | N | N | N | N | N |
| 3 | Suspense end date changed from a valid date less than 12/31/2299 to an earlier valid date | N | N | Y | N | N | N | N |
| 4 | Suspense end date changed from a valid date to a later valid date | N | N | N | Y | N | N | N |
| 5 | Suspense deleted | N | N | N | N | Y | N | N |
| 6 | Suspense end date changed from null to a valid date (Span-B end date in MMIS was 12/31/2299, no Span-C exists) | N | N | N | N | N | Y | N |
| 7 | Suspense end date changed from a valid date to null (Span-B end date in MMIS becomes 12/31/2299, Span-C must be deleted) | N | N | N | N | N | N | Y |

### Actions

| # | Description | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|-------------|---|---|---|---|---|---|---|
| 1 | Identify Span-B: the MMIS Suspense Span that was deleted or changed (match on pre-update begin date). | X | X | X | X | X | X | X |
| 2 | Identify Span-A: the MMIS Enrollment or Suspense Span that immediately precedes Span-B. | X | X | | | X | | |
| 3 | Identify Span-C: the MMIS Enrollment or Suspense Span that immediately succeeds Span-B. | | | X | X | X | | X |
| 4 | Call S310 to delete existing Span-A (exact begin/end date match, Status I). | X | | | | | | |
| 5 | Call S410 to delete existing Span-B (exact begin/end date match, Status I). | X | X | X | | | | |
| 6 | Call S310 to delete existing Span-C (exact begin/end date match, Status I). | | | X | X | | | X |
| 7 | Call S300 to recreate Span-A with begin date = Span-A original begin date and end date = (new BC suspension begin date - 1). | X | | | | | | |
| 8 | Call S510 to create a new suspense span with the new begin date = (new BC suspension begin date [offset: +1 day]) and existing end date. | X | X | | | | | |
| 9 | Call S510 to recreate Span-B with original begin date and new earlier end date. | | | X | | | | |
| 10 | Call S520 to create a new active enrollment span (Span-C) with begin date = (Span-B's new end date + 1) and end date from original Span-C. | | | X | | | | |
| 11 | Call S400 to send an update request for Span-A with existing begin date and new later end date = (Span-B's new begin date - 1). | | X | | | | | |
| 12 | Call S445 to send an update for Span-B with existing begin date (as the anchor) and new later end date. TransactionType O (Open) because we are extending the end date. | | | | X | | | X |
| 13 | Call S520 to create a new active enrollment span (Span-C) with begin date = (Span-B's new end date + 1) and end date from original Span-C. | | | | X | | | |
| 14 | Call S410 to send a delete/Inactivate request for old Span-B (with original dates). | | | | | X | | |
| 15 | Call S470 to send an update for Span-A with existing begin date and new end date = (Span-C's begin date - 1). | | | | | X | | |
| 16 | Call S440 to shorten Span-B end date to the new BC suspension end date [offset: -1 day] (TransactionType C, existing begin date as anchor). | | | | | | X | |
| 17 | Call S520 to create a new active enrollment span (Span-C) with begin date = new BC suspension end date (the participant is treated as active on this date) and end date = Span-A's original end date. | | | | | | X | |
| 18 | Return to Calling Step | X | X | X | X | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S230_001 - Suspense begin date changed to earlier date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-A is the S200-Calculated MMIS span that immediately precedes Span-B. Action #1 identifies Span-B. Action #2 identifies Span-A. Action #4 deletes existing Span-A from MMIS (exact begin/end date match, Status I) to make room for the new earlier suspension begin. Action #5 deletes existing Span-B from MMIS (exact begin/end date match, Status I). Action #7 recreates Span-A with original begin date and new end date = (new BC suspension begin date - 1). Action #8 creates a new suspense span with begin date = (new BC suspension begin date [offset: +1 day]) and existing end date. Order is mandatory: S310 first (delete Span-A), S410 second (delete Span-B), S300 third (recreate Span-A), S510 last (create new Span-B). 4 MMIS transactions. |
| 2 | Scenario: S230_002 - Suspense begin date changed to later date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-A is the S200-Calculated MMIS span that immediately precedes Span-B. Action #1 identifies Span-B. Action #2 identifies Span-A. Action #5 deletes existing Span-B from MMIS. Action #8 creates a new suspense span with the new later begin date and existing end date. Action #11 extends Span-A end date to backfill the gap. Order: S410 first (delete old Span-B, creates large gap), then S510 (create new Span-B), then S400 (extend Span-A to fill remaining gap). 3 MMIS transactions. |
| 3 | Scenario: S230_003 - Suspense end date changed from a valid date less than 12/31/2299 to an earlier valid date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #3 identifies Span-C. Action #5 deletes existing Span-B from MMIS (exact begin/end date match, Status I). Action #6 deletes existing Span-C from MMIS (exact begin/end date match, Status I). Action #9 recreates Span-B with original begin date and new earlier end date (new BC suspension end date [offset: -1 day]). Action #10 creates a new active enrollment span (Span-C) with begin date = (Span-B's MMIS end date + 1 = new BC suspension end date) and end date from original Span-C. Order is mandatory: S410 first (delete Span-B), S310 second (delete Span-C), S510 third (recreate Span-B with new end date), S520 last (recreate Span-C). 4 MMIS transactions. |
| 4 | Scenario: S230_004 - Suspense end date changed from a valid date to a later valid date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #3 identifies Span-C. Action #6 deletes existing Span-C from MMIS. Action #12 extends Span-B end date to the new later BC suspension end date [offset: -1 day]. Action #13 creates a new active enrollment span (Span-C) with begin date = (Span-B's MMIS end date + 1 = new BC suspension end date) and end date from original Span-C. Order: S310 first (delete old Span-C, creates gap), then S445 (extend Span-B end date), then S520 (create new Span-C). 3 MMIS transactions. |
| 5 | Scenario: S230_005 - Suspense deleted. Span-B is the S200-Calculated MMIS Suspense Span that was deleted (match on pre-update begin date). Span-A is the S200-Calculated MMIS span that immediately precedes Span-B. Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #2 identifies Span-A. Action #3 identifies Span-C. Action #14 deletes Span-B. Action #15 updates Span-A with a new later end date to close the gap. Order: S410 first (delete Span-B), then S470 (extend Span-A). 2 MMIS transactions. |
| 6 | Scenario: S230_006 - Suspense end date changed from null to a valid date. Span-B is the S200-Calculated MMIS Suspense Span with end date 12/31/2299 (no Span-C exists because the suspension previously had no end date). Action #1 identifies Span-B. Action #16 shortens Span-B end date to the new BC suspension end date [offset: -1 day] using existing begin date as anchor (TransactionType C). Action #17 creates a new active enrollment span (Span-C) with begin date = new BC suspension end date (the participant is treated as active on this date) and end date = Span-A's original end date. Order: S440 first (shorten Span-B), then S520 (create Span-C). 2 MMIS transactions. |
| 7 | Scenario: S230_007 - Suspense end date changed from a valid date to null. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #3 identifies Span-C. Action #6 deletes existing Span-C from MMIS (exact begin/end date match, Status I). Action #12 extends Span-B end date to 12/31/2299 using existing begin date as anchor (TransactionType O). Order: S310 first (delete Span-C), then S445 (extend Span-B to 12/31/2299). 2 MMIS transactions. |

---

## S240 — Suspense Add

**File**: `S240.csv`
**Sheet**: `S240_Suspense_Add`
**Title**: `S240_Suspense_Add`
**Feature**: `Enrollment Service`
**Description**: `This page represents logic for adding suspense records in Blue Compass`
**Last Update**: `06/17/2026`
**Scenarios**: 3

### Conditions

| # | Description | 1 | 2 | 3 |
|---|-------------|---|---|---|
| 1 | New suspense record has an end date | Y | N | - |
| 2 | Suspension span is at least 3 calendar days (end date - begin date >= 2 days) | Y | Y | N |

### Actions

| # | Description | 1 | 2 | 3 |
|---|-------------|---|---|---|
| 1 | Identify Span-A: the MMIS Enrollment Span that includes the new BC suspense begin date. | X | X | |
| 2 | Call S500 to Send a request to set the end date for Span-A to the new BC suspense begin date (the participant is treated as active on this date) | X | X | |
| 3 | Call S520 to Send an Active/Open Span-C (with begin date = BC suspense end date (the participant is treated as active on this date)) and end date from Span-A. | X | | |
| 4 | Call S510 to Send an add request for the new suspense span (Span-B) with begin date = (BC suspense begin date [offset: +1 day]) and end date = BC suspense end date [offset: -1 day]. | X | X | |
| 5 | Surface an error to the user: Suspension span is too short to produce a valid MMIS suspense window. No MMIS transaction sent. | | | X |
| 6 | Return to Calling Step | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S240_001 - New suspense record has an end date and meets the 3-day minimum duration. Span-A is the S200-Calculated MMIS Enrollment Span that includes the new BC suspense begin date. Action #1 identifies Span-A. Action #2 closes Span-A by setting its end date to the BC suspense begin date (the participant is treated as active on this date). Action #3 creates a new active enrollment span (Span-C) after the suspension with begin date = BC suspense end date (the participant is treated as active on this date). Action #4 adds the new suspense span (Span-B) with begin date = BC suspense begin date [offset: +1 day] and end date = BC suspension end date [offset: -1 day]. 3 MMIS transactions. |
| 2 | Scenario: S240_002 - New suspense record does not have an end date and meets the 3-day minimum duration check (open-ended suspensions are always valid because there is no end date to calculate against — only the begin-date +1 offset applies). Span-A is the S200-Calculated MMIS Enrollment Span that includes the new BC suspense begin date. Action #1 identifies Span-A. Action #2 closes Span-A by setting its end date to the BC suspense begin date (the participant is treated as active on this date). Action #4 adds the new suspense span (Span-B) with end date 12/31/2299 (BC null suspension end date is sent to MMIS as 12/31/2299). No Span-C is created because there is no suspension end date — the participant is indefinitely suspended in MMIS. 2 MMIS transactions. |
| 3 | Scenario: S240_003 - Suspension span is fewer than 3 calendar days (end date - begin date < 2 days). Applying the +1 begin and -1 end offsets would produce a zero-day or negative-day MMIS suspense window. Action #5 surfaces an error to the user. No MMIS transaction sent. Confirmed by Richard Ward (DHS) on 06/17/2026. |

---

## S250 — Location Assignment Update

**File**: `S250.csv`
**Sheet**: `S250_Location_Assignment_Update`
**Title**: `S250 Location Assignment Update`
**Feature**: `Enrollment Service`
**Description**: `This page represents logic for changes to FEA or ICA. The pre-calculated MMIS spans must already be available. S250 closes the affected span, then processes each pre-calculated span from the agency change effective date onward.`
**Last Update**: `03/20/2026`
**Scenarios**: 2

### Conditions

| # | Description | 1 | 2 |
|---|-------------|---|---|
| 1 | New ICA or FEA is assigned | Y | Y |
| 2 | Span-B (the MMIS span containing the agency change effective date) has Active status | Y | N |
| 3 | Span-B has Suspended status | N | Y |

### Actions

| # | Description | 1 | 2 |
|---|-------------|---|---|
| 1 | Identify Span-B: the existing MMIS span that contains the agency change effective date. | X | X |
| 2 | Call S600 to Send an update for Span-B with a new earlier end date = (agency change effective date - 1) and existing begin date (as the anchor). | X | X |
| 3 | Call S255 for each S200-calculated-MMIS span from the agency change effective date onward (in order). | X | X |
| 4 | Return to Calling Step | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S250_001 - Span-B is Active. Span-B is the S200-Calculated MMIS span that contains the agency change effective date. Action #1 identifies Span-B. Action #2 closes Span-B at (effective date - 1) with old agency. Action #3 iterates S200-Calculated spans from the effective date onward, calling S255 for each. Typically this produces one S255 call for a single active span. |
| 2 | Scenario: S250_002 - Span-B is Suspended. Span-B is the S200-Calculated MMIS span that contains the agency change effective date. Action #1 identifies Span-B. Action #2 closes Span-B at (effective date - 1) with old agency. Action #3 iterates S200-Calculated spans from the effective date onward, calling S255 for each. This typically produces two S255 calls: first for the new suspended span, then for the post-suspension active span (if S200 calculated one). |

### Notes

- **S200 drives the output**: S250 does not independently determine what spans to create. S200 has already calculated the complete target MMIS span list with the correct agencies. S250's job is to close the affected span and then dispatch S255 for each remaining span.
- **No hardcoded end dates**: All end dates on new spans come from S200's calculated spans, which derive from BC enrollment and suspension dates. See Core Knowledge section "MMIS Span End Dates Must Reflect BC Data".
- **Action 3 is iterative**: The number of spans from the effective date onward depends on S200's output. For a simple active enrollment, there is one span. For an enrollment with a suspension, there may be two or three spans (suspended + active, or active + suspended + active). S255 is called once per span.
- **S255 handles per-span logic**: Each S255 call determines whether the span needs a delete-then-recreate (old agency span exists in MMIS) or just a create (no old span), and routes to the correct field-setter (S610 for Active, S620 for Suspended).
- **IRIS only**: S250 applies only to IRIS enrollments. SDPC enrollments do not have FEA or ICA agency assignments. See Core Knowledge section "IRIS vs SDPC — FEA/ICA Assignment Rule".

---

## S255 — Resend Span with New Agency

**File**: `S255.csv`
**Sheet**: `S255_Resend_Span_New_Agency`
**Title**: `S255 Resend Span with New Agency`
**Feature**: `Enrollment Service`
**Description**: `IRIS only: For a single pre-calculated MMIS span, conditionally delete the old-agency span then create the new-agency span`
**Last Update**: `03/20/2026`
**Scenarios**: 4

### Conditions

| # | Description | 1 | 2 | 3 | 4 |
|---|-------------|---|---|---|---|
| 1 | MMIS span (pre-calculated in S200) has Active status | Y | Y | N | N |
| 2 | MMIS span (pre-calculated in S200) has Suspended status | N | N | Y | Y |
| 3 | A matching MMIS span exists with the old agency (needs delete-then-recreate) | Y | N | Y | N |

### Actions

| # | Description | 1 | 2 | 3 | 4 |
|---|-------------|---|---|---|---|
| 1 | Call S310 to delete the existing MMIS span with the old agency (exact begin/end date match required). | X | | X | |
| 2 | Call S610 to create the active span with the new ICA/FEA. Begin date and end date come from the S200-calculated span. | X | X | | |
| 3 | Call S620 to create the suspended span with the new ICA/FEA. Begin date and end date come from the S200-calculated span. | | | X | X |
| 4 | Return to Calling Step | X | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S255_001 - Active span, old-agency span exists in MMIS. This is the typical Span-C replacement scenario: the post-suspension active span exists in MMIS with the old agency. Action #1 deletes the existing span with the old agency. Action #2 creates the active span with the new agency. |
| 2 | Scenario: S255_002 - Active span, no old-agency span in MMIS. This is the typical first span after S600: S600 shortened the old span, and the new active span does not yet exist in MMIS. Action #2 creates the active span with the new agency. |
| 3 | Scenario: S255_003 - Suspended span, old-agency span exists in MMIS. An existing suspended span in MMIS has the old agency. Action #1 deletes the existing span with the old agency. Action #3 creates the suspended span with the new agency. |
| 4 | Scenario: S255_004 - Suspended span, no old-agency span in MMIS. The suspended span does not yet exist in MMIS. Action #3 creates the suspended span with the new agency. |

### Notes

- **Called by S250 Action 3**: S255 is called once per S200-calculated span from the agency change effective date onward. S250 iterates the spans in order; S255 handles the per-span logic.
- **S310 for delete**: S310 sends Status I with the exact existing begin and end dates and the old ICA/FEA. MMIS requires exact date match for inactivation.
- **S610 for active spans**: S610 creates a new active span with the new ICA/FEA. The begin date and end date come from the S200-calculated span — no hardcoded values.
- **S620 for suspended spans**: S620 creates a new suspended span with the new ICA/FEA. The begin date and end date come from the S200-calculated span.
- **Condition 3 — how to determine if old span exists**: Compare the S200-calculated span's date range against the pre-change MMIS span list. If an MMIS span exists with the same date range but the old agency, it needs delete-then-recreate. If no MMIS span exists for that date range (because S600 just shortened the preceding span and this is a new gap), only a create is needed.
- **IRIS only**: S255 applies only to IRIS enrollments. SDPC enrollments do not have FEA or ICA agency assignments.
- **No hardcoded end dates**: All dates come from S200's calculated spans. See Core Knowledge section "MMIS Span End Dates Must Reflect BC Data".

---

<!-- BATCH 2: S250–S009 (to be added) -->
## S300 — Create New Enrollment Span

**File**: `S300.csv`
**Sheet**: `S300_Create_New_Enroll_Span`
**Title**: `S300 Create new enrollment span`
**Feature**: `Enrollment Service`
**Description**: `Send a request to add a new enrollment span with begin date = BC enrollment begin date and end date = BC enrollment end date (if null send 12/31/2299)`
**Last Update**: `06/20/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the BC enrollment begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the new BC Enrolled span begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC Enrolled span end date. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2L (New Enrollment). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode. Not Required (end date is 12/31/2299 for new enrollment). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the BC enrollment begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the new BC Enrolled span begin date. | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC Enrolled span end date. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the new BC Enrolled span begin date. | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC Enrolled span end date. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to A (Active). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S300_001 - IRIS: Create new IRIS enrollment span. Begin date is BC enrollment begin date. End date is BC enrollment end date (if null send 12/31/2299). The TransactionType = O and the Status = A. StartReasonCode = 2L (New Enrollment). StopReasonCode is Not Required (end date is 12/31/2299). |
| 2 | Scenario: S300_002 - SDPC: Create new SDPC enrollment span. Begin date is BC enrollment begin date. End date is BC enrollment end date (if null send 12/31/2299). The TransactionType = A and the Status = A. |
| 3 | Scenario: S300_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- New Enrollment End date should be set to 12/31/2299
- Agency ID is the Medicaid Provider ID
- Reason 2L - Always used for initial enrollment
- RecertificationCompleteDate is IRIS-only and always equals DateEnrlEff (the new BC enrollment begin date) for this transaction. The SDPCEnrollmentRequest API does not include this field. See Core Knowledge section "Recertification Completion Date — MMIS Field Rule".

---

## S310 — Delete Enrollment Span

**File**: `S310.csv`
**Sheet**: `S310_Delete_Enroll_Span`
**Title**: `S310 Delete enrollment span`
**Feature**: `Enrollment Service`
**Description**: `Send a request to inactivate an existing MMIS span with existing begin date and existing end date (exact match required)`
**Last Update**: `07/18/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the existing MMIS span begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the existing MMIS span end date. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to I (Inactivate). | Status |  | X |  |  |
| 7 | Set StartReasonCode — value is caller-determined: 2I (S230 Scenario 1), 2L for S220 Scenarios 2/3, S220 Scenario 6, S230 Scenarios 3/4, S255 Scenarios 1/3. | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode — value is caller-determined: 2B (S220 Scenarios 2/3), 2I (S230 Scenario 1), 2W (S220 Scenario 6, S230 Scenarios 3/4, S255 Scenarios 1/3), or null (S220 Scenario 6, S230 Scenarios 3/4 and S255 Scenarios 1/3 when end date is 12/31/2299). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date. | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the existing MMIS span end date. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to I (Inactivate). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date. | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the existing MMIS span end date. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to I (Inactivate). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S310_001 - IRIS: Delete existing IRIS enrollment span. Begin date is existing MMIS Span-B begin date. End date is existing MMIS Span-B end date (exact match required). The TransactionType = O and the Status = I. StartReasonCode = 2L. StopReasonCode = 2W. |
| 2 | Scenario: S310_002 - SDPC: Delete existing SDPC enrollment span. Begin date is existing MMIS Span-B begin date. End date is existing MMIS Span-B end date (exact match required). The TransactionType = A and the Status = I. |
| 3 | Scenario: S310_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Agency ID is the Medicaid Provider ID
- To inactivate, the MMIS span's begin and end date must match the request begin and end date. Same ICA and FEA agencies.
- The StopReasonCode to send depends on the calling section. `2B` is used for S220 Scenarios 2 and 3 (enrollment begin date change). `2I` is used for S230 Scenario 1 (suspension begin date earlier, deleting Span-A). `2W` is used for S220 Scenario 6 (Referral Withdrawn), S230 Scenarios 3 and 4 (deleting Span-C), and S255 Scenarios 1 and 3 (deleting old agency span). `null` is used for S230 Scenarios 3 and 4 and S255 Scenarios 1 and 3 when the span end date is 12/31/2299.

---

## S320 — RETIRED — Update Enrollment Begin Date to Earlier Date

> **⚠️ RETIRED**: This table is superseded by the delete+create pattern (S310 → S300). MMIS does not support using an end date as an anchor to modify a begin date. S220 Scenarios 2 and 3 now call S310 (delete) followed by S300 (create) instead of S320/S330. Retained for historical reference only.

**File**: `S320.csv`
**Sheet**: `S320_Update_Enroll_Begin_Earlier`
**Title**: `S320 Enrollment begin date change to earlier date`
**Feature**: `Enrollment Service`
**Description**: `RETIRED — Send an update request for Span-B with new earlier begin date and existing MMIS Span-B end date (as the anchor)`
**Last Update**: `07/2026 (retired)`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the new begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the new BC Enrolled span begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the existing MMIS span end date (as the anchor). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the new begin date. | WaiverFEA |  | X |  |  |
| 8 | Set FEAEffectiveDate to the new BC Enrolled span begin date. | FEAEffectiveDate |  | X |  |  |
| 9 | Set FEAEndDate to the existing MMIS span end date (as the anchor). | FEAEndDate |  | X |  |  |
| 10 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 11 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 12 | Set DateSDPCEffective to the new BC Enrolled span begin date. | DateSDPCEffective |  |  | X |  |
| 13 | Set DateSDPCEnd to the existing MMIS span end date (as the anchor). | DateSDPCEnd |  |  | X |  |
| 14 | Set Status to A (Active). | Status |  |  | X |  |
| 15 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 16 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S320_001 - IRIS: Update IRIS enrollment begin date to earlier date. Begin date is new BC enrollment begin date. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = A. |
| 2 | Scenario: S320_002 - SDPC: Update SDPC enrollment begin date to earlier date. Begin date is new BC enrollment begin date. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = A. |
| 3 | Scenario: S320_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- UI would prevent a user from updating an enrollment begin or end date to overlap with another enrollment.
- What if a span is extended beyond the point where there is a different Agency? Would MMIS need 2 spans? What if it goes the other way and is shortened beyond an agency assignment, would we delete the span that is now outside of the current agency assignment and extend the previous assignment to fill the gap?

---

## S330 — RETIRED — Update Enrollment Begin Date to Later Date

> **⚠️ RETIRED**: This table is superseded by the delete+create pattern (S310 → S300). MMIS does not support using an end date as an anchor to modify a begin date. S220 Scenarios 2 and 3 now call S310 (delete) followed by S300 (create) instead of S320/S330. Retained for historical reference only.

**File**: `S330.csv`
**Sheet**: `S330_Update_Enroll_Begin_Later`
**Title**: `S330 Enrollment begin date change to later date`
**Feature**: `Enrollment Service`
**Description**: `RETIRED — Send an update request for Span-B with new later begin date and existing MMIS Span-B end date (as the anchor)`
**Last Update**: `07/2026 (retired)`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the new BC Enrolled span begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the existing MMIS span end date (as the anchor). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 8 | Set FEAEffectiveDate to the new BC Enrolled span begin date. | FEAEffectiveDate |  | X |  |  |
| 9 | Set FEAEndDate to the existing MMIS span end date (as the anchor). | FEAEndDate |  | X |  |  |
| 10 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 11 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 12 | Set DateSDPCEffective to the new BC Enrolled span begin date. | DateSDPCEffective |  |  | X |  |
| 13 | Set DateSDPCEnd to the existing MMIS span end date (as the anchor). | DateSDPCEnd |  |  | X |  |
| 14 | Set Status to A (Active). | Status |  |  | X |  |
| 15 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 16 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S330_001 - IRIS: Update IRIS enrollment begin date to later date. Begin date is new BC enrollment begin date. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = A. |
| 2 | Scenario: S330_002 - SDPC: Update SDPC enrollment begin date to later date. Begin date is new BC enrollment begin date. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = A. |
| 3 | Scenario: S330_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- UI would prevent a user from updating an enrollment begin or end date to overlap with another enrollment.
- UI will prevent user from updating the begin date of an enrollment span that leaves suspension dates outside of the enrollment span.

---

## S340 — Update Enrollment End Date to Earlier Date

**File**: `S340.csv`
**Sheet**: `S340_Update_Enroll_End_Earlier`
**Title**: `S340 Enrollment end date change to earlier date`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-B with new earlier end date and existing MMIS Span-B begin date (as the anchor)`
**Last Update**: `03/08/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to C (Closure). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC Enrolled span end date. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set StartReasonCode to the BC disenrollment reason code (same as StopReasonCode). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to the BC disenrollment reason code (from StatusReasonDisplayName). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC Enrolled span end date. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC Enrolled span end date. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to A (Active). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S340_001 - IRIS: Update IRIS enrollment end date to earlier date. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC enrollment end date. The TransactionType = C and the Status = A. StartReasonCode = BC disenrollment reason code (same as StopReasonCode). StopReasonCode = BC StatusReasonDisplayName (disenrollment reason). |
| 2 | Scenario: S340_002 - SDPC: Update SDPC enrollment end date to earlier date. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC enrollment end date. The TransactionType = C and the Status = A. |
| 3 | Scenario: S340_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- **FEAStatus is always A (Active) for disenrollment transactions**, regardless of whether the enrollment span being closed has Status A or Status S. WISITS production data confirms: all 98 TODISENROLLEDORDECEASED transactions send FEAStatus=A, including the 18 transactions that close a suspended span (Status=S). This means if a participant is disenrolled while suspended, the Closure transaction sends Status=S but FEAStatus=A.
- **StartReasonCode = StopReasonCode for disenrollment**: WISITS production data confirms all 98 disenrollment transactions use the same reason code for both Start and Stop (e.g., Start=64, Stop=64 for DOD; Start=7C, Stop=7C for Choosing New Option).

---

## S350 — Update Enrollment End Date to Later Date

**File**: `S350.csv`
**Sheet**: `S350_Update_Enroll_End_Later`
**Title**: `S350 Enrollment end date change to later date`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-B with new later end date and existing MMIS Span-B begin date (as the anchor). If most current span is a suspension, call S360 instead.`
**Last Update**: `03/08/2026`
**Scenarios**: 5

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 | 4 | 5 |
|---|-------------|-----------|-------------|---|---|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | Y | N | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | N | Y | Y | N |
| 3 | Most current MMIS span within the BC Enrollment dates is a suspension. |  |  | Y | N | Y | N | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 | 4 | 5 |
|---|-------------|-----------|-------------|---|---|---|---|---|
| 1 | Call S360 Create New Enrollment to Succeed Suspension | n/a |  | X |  | X |  |  |
| 2 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  |  | X |  | X |  |
| 3 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  |  | X |  |  |  |
| 4 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  |  | X |  | X |  |
| 5 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor). | DateEnrlEff |  |  | X |  |  |  |
| 6 | Set DateEnrlEnd to the new BC Enrolled span end date. | DateEnrlEnd |  |  | X |  |  |  |
| 7 | Set Status to A (Active). | Status |  |  | X |  |  |  |
| 8 | Set StartReasonCode to 2L (New Enrollment). | StartReasonCode |  | X |  |  |
| 9 | Set StopReasonCode. Not Required (end date is being extended to a later date). | StopReasonCode |  | X |  |  |
| 10 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  |  | X |  |  |  |
| 11 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  |  | X |  |  |  |
| 12 | Set FEAEndDate to the new BC Enrolled span end date. | FEAEndDate |  |  | X |  |  |  |
| 13 | Set FEAStatus to A (Active). | FEAStatus |  |  | X |  |  |  |
| 14 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  |  |  | X |  |
| 15 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  |  |  | X |  |
| 16 | Set DateSDPCEnd to the new BC Enrolled span end date. | DateSDPCEnd |  |  |  |  | X |  |
| 17 | Set Status to A (Active). | Status |  |  |  |  | X |  |
| 18 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  |  |  | X |  |
| 19 | Return to Calling Step | n/a |  | X | X | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S350_001 - IRIS: Enrollment end date change to later date and most current MMIS span is a suspension. Action #1 calls S360 to create enrollment span after suspension. StartReasonCode = 2L. StopReasonCode is Not Required. |
| 2 | Scenario: S350_002 - IRIS: Enrollment end date change to later date. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC enrollment end date. The TransactionType = A and the Status = A. |
| 3 | Scenario: S350_003 - SDPC: Enrollment end date change to later date and most current MMIS span is a suspension. Action #1 calls S360 to create enrollment span after suspension. |
| 4 | Scenario: S350_004 - SDPC: Enrollment end date change to later date. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC enrollment end date. The TransactionType = A and the Status = A. |
| 5 | Scenario: S350_005 - Neither IRIS nor SDPC transaction. No action taken. |

---

## S360 — Create New Enrollment to Succeed Suspension

**File**: `S360.csv`
**Sheet**: `S360_Create_Enrollment_After_Suspension`
**Title**: `S360 Create enrollment span after suspension`
**Feature**: `Enrollment Service`
**Description**: `Send a request to add a new active enrollment span (Span-C) with begin date = BC suspension end date and end date = BC enrollment end date`
**Last Update**: `06/21/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span DateEnrlEff date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the BC suspension end date (the participant is treated as active on this date). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC Enrolled span end date. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode. Not Required (end date is typically 12/31/2299 for post-suspension enrollment). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the BC suspension end date (the participant is treated as active on this date). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC Enrolled span end date. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the BC suspension end date (the participant is treated as active on this date). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC Enrolled span end date. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to A (Active). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S360_001 - IRIS: Create new IRIS enrollment span after suspension. Begin date is BC suspension end date (the participant is treated as active on this date). End date is BC enrollment end date. The TransactionType = O and the Status = A. StartReasonCode = 2Q (Enrollment from Suspension). StopReasonCode is Not Required. |
| 2 | Scenario: S360_002 - SDPC: Create new SDPC enrollment span after suspension. Begin date is BC suspension end date (the participant is treated as active on this date). End date is BC enrollment end date. The TransactionType = A and the Status = A. |
| 3 | Scenario: S360_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- RecertificationCompleteDate is IRIS-only and always equals DateEnrlEff (BC suspension end date) for this transaction. The SDPCEnrollmentRequest API does not include this field. See Core Knowledge section "Recertification Completion Date — MMIS Field Rule".

---

## S400 — Update Span-A End Date

**File**: `S400.csv`
**Sheet**: `S400_Update_Span_A_End_Date`
**Title**: `S400 Update Span-A end date`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-A with new end date = (Span-B's new begin date - 1) and existing MMIS Span-A begin date (as the anchor)`
**Last Update**: `03/18/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-A ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to C (Closure). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to Span-A's existing Active MMIS span begin date (as the anchor). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to (Span-B's New Begin Date - 1) | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to Span-A's original value (possible values include A, I, or S). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2I (Suspended). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to 2I (Suspended). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the existing Span-A ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the existing Active MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to (Span-B's New Begin Date - 1) | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to Span-A's original value (possible values include A, I, or S). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to Span-A's existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to (Span-B's New Begin Date - 1). | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to Span-A's original value (possible values include A, I, or S). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S400_001 - IRIS: Update Span-A end date for IRIS enrollment. Begin date is existing MMIS Span-A begin date (as the anchor). End date is (Span-B's new begin date - 1). The TransactionType = C and the Status = A. StartReasonCode = 2I. StopReasonCode = 2I (Suspended). |
| 2 | Scenario: S400_002 - SDPC: Update Span-A end date for SDPC enrollment. Begin date is existing MMIS Span-A begin date (as the anchor). End date is (Span-B's new begin date - 1). The TransactionType = C and the Status = A. |
| 3 | Scenario: S400_003 - Neither IRIS nor SDPC transaction. No action taken. |

---

## S410 — Delete Suspense Span

**File**: `S410.csv`
**Sheet**: `S410_Delete_Suspense_Span`
**Title**: `S410 Delete suspense span`
**Feature**: `Enrollment Service`
**Description**: `Send a request to inactivate Span-B with existing MMIS Span-B begin date and existing Span-B end date (exact match required)`
**Last Update**: `07/18/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the existing MMIS span begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the existing MMIS span end date. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to I (Inactivate). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2L (New Enrollment). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to 2W (Reason Not Provided in Source System). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date. | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the existing MMIS span end date. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to I (Inactivate). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date. | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the existing MMIS span end date. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to I (Inactivate). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S410_001 - IRIS: Delete existing IRIS suspense span. Begin date is existing MMIS Span-B begin date. End date is existing MMIS Span-B end date (exact match required). The TransactionType = O and the Status = I. StartReasonCode = 2L. StopReasonCode = 2W. |
| 2 | Scenario: S410_002 - SDPC: Delete existing SDPC suspense span. Begin date is existing MMIS Span-B begin date. End date is existing MMIS Span-B end date (exact match required). The TransactionType = A and the Status = I. |
| 3 | Scenario: S410_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Agency ID is the Medicaid Provider ID

---

## S420 — RETIRED — Update Span-B Begin Date to Earlier Date

> **⚠️ RETIRED**: This table is superseded by the delete+create pattern (S410 → S510). MMIS does not support using an end date as an anchor to modify a begin date. S230 Scenario 1 now calls S410 (delete) followed by S510 (create) instead of S420. Retained for historical reference only.

**File**: `S420.csv`
**Sheet**: `S420_Update_Span_B_Begin_Earlier`
**Title**: `S420 Suspense begin date change to earlier date`
**Feature**: `Enrollment Service`
**Description**: `RETIRED — Send an update request for Span-B with new earlier begin date and existing MMIS Span-B end date (as the anchor)`
**Last Update**: `07/2026 (retired)`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-B ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to Span-B's new BC begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to Span-B's existing MMIS span end date (as the anchor). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to Span-B's original value (possible values include A, I, or S). | Status |  | X |  |  |
| 7 | Set WaiverFEA to the existing Span-B ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 8 | Set FEAEffectiveDate to Span-B's new begin date. | FEAEffectiveDate |  | X |  |  |
| 9 | Set FEAEndDate to Span-B's existing MMIS span end date (as the anchor). | FEAEndDate |  | X |  |  |
| 10 | Set FEAStatus to Span-B's original value (possible values include A, I, or S). | FEAStatus |  | X |  |  |
| 11 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 12 | Set DateSDPCEffective to Span-B's new BC begin date. | DateSDPCEffective |  |  | X |  |
| 13 | Set DateSDPCEnd to Span-B's existing MMIS span end date (as the anchor). | DateSDPCEnd |  |  | X |  |
| 14 | Set Status to Span-B's original value (possible values include A, I, or S). | Status |  |  | X |  |
| 15 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 16 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S420_001 - IRIS: Update Span-B begin date to earlier date for IRIS enrollment. Begin date is new BC suspense begin date + 1. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = S. |
| 2 | Scenario: S420_002 - SDPC: Update Span-B begin date to earlier date for SDPC enrollment. Begin date is new BC suspense begin date + 1. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = S. |
| 3 | Scenario: S420_003 - Neither IRIS nor SDPC transaction. No action taken. |

---

## S430 — RETIRED — Update Span-B Begin Date to Later Date

> **⚠️ RETIRED**: This table is superseded by the delete+create pattern (S410 → S510). MMIS does not support using an end date as an anchor to modify a begin date. S230 Scenario 2 now calls S410 (delete) followed by S510 (create) instead of S430. Retained for historical reference only.

**File**: `S430.csv`
**Sheet**: `S430_Update_Span_B_Begin_Later`
**Title**: `S430 Suspense begin date change to later date`
**Feature**: `Enrollment Service`
**Description**: `RETIRED — Send an update request for Span-B with new later begin date and existing MMIS Span-B end date (as the anchor)`
**Last Update**: `07/2026 (retired)`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-B ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to Span-B's new BC begin date. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to Span-B's existing MMIS span end date (as the anchor). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to Span-B's original value (possible values include A, I, or S). | Status |  | X |  |  |
| 7 | Set WaiverFEA to the existing Span-B ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 8 | Set FEAEffectiveDate to Span-B's new begin date. | FEAEffectiveDate |  | X |  |  |
| 9 | Set FEAEndDate to Span-B's existing MMIS span end date (as the anchor). | FEAEndDate |  | X |  |  |
| 10 | Set FEAStatus to Span-B's original value (possible values include A, I, or S). | FEAStatus |  | X |  |  |
| 11 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 12 | Set DateSDPCEffective to Span-B's new BC begin date. | DateSDPCEffective |  |  | X |  |
| 13 | Set DateSDPCEnd to Span-B's existing MMIS span end date (as the anchor). | DateSDPCEnd |  |  | X |  |
| 14 | Set Status to Span-B's original value (possible values include A, I, or S). | Status |  |  | X |  |
| 15 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 16 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S430_001 - IRIS: Update Span-B begin date to later date for IRIS enrollment. Begin date is new BC suspense begin date + 1. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = S. |
| 2 | Scenario: S430_002 - SDPC: Update Span-B begin date to later date for SDPC enrollment. Begin date is new BC suspense begin date + 1. End date is existing MMIS Span-B end date (as the anchor). The TransactionType = O and the Status = S. |
| 3 | Scenario: S430_003 - Neither IRIS nor SDPC transaction. No action taken. |

---

## S440 — Update Suspense End Date to Earlier Date

**File**: `S440.csv`
**Sheet**: `S440_Update_Suspense_End_Earlier`
**Title**: `S440 Suspense end date change to earlier date`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-B with new earlier end date and existing MMIS Span-B begin date (as the anchor)`
**Last Update**: `06/22/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to C (Closure). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC suspension end date [offset: -1 day]. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to S (Suspended). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to 2W (Reason Not Provided in Source System). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC suspension end date [offset: -1 day]. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to S (Suspended). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC suspension end date [offset: -1 day]. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to S (Suspended). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S440_001 - IRIS: Update suspense end date to earlier date for IRIS enrollment. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC suspense end date [offset: -1 day]. The TransactionType = C and the Status = S. StartReasonCode = 2Q. StopReasonCode = 2W. |
| 2 | Scenario: S440_002 - SDPC: Update suspense end date to earlier date for SDPC enrollment. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC suspense end date [offset: -1 day]. The TransactionType = C and the Status = S. |
| 3 | Scenario: S440_003 - Neither IRIS nor SDPC transaction. No action taken. |

---

## S445 — Update Suspense End Date to Later Date

**File**: `S445.csv`
**Sheet**: `S445_Update_Suspense_End_Later`
**Title**: `S445 Suspense end date change to later date`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-B with new later end date and existing MMIS Span-B begin date (as the anchor). TransactionType O (extending, not shortening)`
**Last Update**: `06/21/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the MMIS span begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the existing MMIS span begin date (as the anchor). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC suspension end date [offset: -1 day]. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to S (Suspended). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2I (Suspended). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to 2I (Suspended). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the MMIS span begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC suspension end date [offset: -1 day]. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to S (Suspended). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC suspension end date [offset: -1 day]. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to S (Suspended). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S445_001 - IRIS: Update suspense end date to later date for IRIS enrollment. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC suspense end date [offset: -1 day]. The TransactionType = O and the Status = S. StartReasonCode = 2I. StopReasonCode = 2I. |
| 2 | Scenario: S445_002 - SDPC: Update suspense end date to later date for SDPC enrollment. Begin date is existing MMIS Span-B begin date (as the anchor). End date is new BC suspense end date [offset: -1 day]. The TransactionType = A and the Status = S. |
| 3 | Scenario: S445_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Called by S230 Scenario 4 (suspense end date changed to later date) and S230 Scenario 7 (suspense end date changed from a valid date to null — Span-B is extended to 12/31/2299). S230 Scenario 4 deletes existing Span-C (via S310), then extends Span-B's end date to the new later date (via S445), then creates a new Span-C (via S520). S230 Scenario 7 deletes existing Span-C (via S310), then extends Span-B's end date to 12/31/2299 (via S445) — no Span-C is created because the suspension now has no end date.
- S230 Scenario 4 required order: (1) call S310 to delete existing Span-C (creates gap), then (2) call S445 to extend Span-B's end date to fill part of the gap, then (3) call S520 to create new Span-C with begin date = (Span-B's new end date + 1). 3 MMIS transactions.
- TransactionType O (Open) is used because we are extending the end date of an existing span to a later date. Per the 03/18/2026 meeting, Open = adding a new segment or extending. Closure = bringing in (shortening) an end date.
- This is the counterpart to S440 (which shortens the suspense end date to an earlier date using Closure). S445 extends to a later date using Open.
- The anchor is Span-B's existing begin date. MMIS locates the span by matching on this begin date, then updates the end date to the new value.
- FEA dates are set to match the full extended Span-B date range.

---

## S450 — RETIRED — Update Span-C Begin Date to Later Date

> **⚠️ RETIRED**: This table is superseded by the delete+create pattern (S310 → S520). MMIS does not support using an end date as an anchor to modify a begin date. S230 Scenario 4 now calls S310 (delete Span-C) followed by S520 (create new Span-C) instead of S450. Retained for historical reference only.

**File**: `S450.csv`
**Sheet**: `S450_Update_Span_C_Begin_Later`
**Title**: `S450 Update Span-C begin date to later date`
**Feature**: `Enrollment Service`
**Description**: `RETIRED — Send an update request for Span-C with new later begin date = (Span-B's new end date + 1) and existing MMIS Span-C end date (as the anchor)`
**Last Update**: `07/2026 (retired)`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-C ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to (Span-B's new End Date + 1). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to Span-C's existing MMIS span end date (as the anchor). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set WaiverFEA to the existing Span-C ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 8 | Set FEAEffectiveDate to (Span-B's new End Date + 1). | FEAEffectiveDate |  | X |  |  |
| 9 | Set FEAEndDate to Span-C's existing MMIS span end date (as the anchor). | FEAEndDate |  | X |  |  |
| 10 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 11 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 12 | Set DateSDPCEffective to (Span-B's new End Date + 1). | DateSDPCEffective |  |  | X |  |
| 13 | Set DateSDPCEnd to Span-C's existing MMIS span end date (as the anchor). | DateSDPCEnd |  |  | X |  |
| 14 | Set Status to A (Active). | Status |  |  | X |  |
| 15 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 16 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S450_001 - IRIS: Update Span-C begin date to later date for IRIS enrollment. Begin date is (Span-B's new end date + 1). End date is existing MMIS Span-C end date (as the anchor). The TransactionType = O and the Status = A. |
| 2 | Scenario: S450_002 - SDPC: Update Span-C begin date to later date for SDPC enrollment. Begin date is (Span-B's new end date + 1). End date is existing MMIS Span-C end date (as the anchor). The TransactionType = O and the Status = A. |
| 3 | Scenario: S450_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Called by S230 Scenario 4 (suspense end date changed to later date). Before Span-B's end date is extended (via S440), Span-C's begin date must move later to make room.
- S230 Scenario 4 required order: (1) call S450 to move Span-C's begin date later (creating a gap), then (2) call S440 to extend Span-B's end date to fill the gap. This order is mandatory — reversing it would create an overlap and MMIS would reject the second transaction.
- Span-C is always an Active enrollment span (Status A) because it represents the enrollment period after the suspension.
- TransactionType O (Open) is used because we are moving the begin date of an existing span to a later date (same end date, later effective date).
- The anchor is Span-C's existing end date. MMIS locates the span by matching on this end date, then updates the begin date to the new value.
- FEA dates are set to match the full new Span-C date range. If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19).

---

## S460 — RETIRED — Update Span-C Begin Date to Earlier Date

> **⚠️ RETIRED**: This table is superseded by the delete+create pattern (S310 → S520). MMIS does not support using an end date as an anchor to modify a begin date. S230 Scenario 3 now calls S310 (delete Span-C) followed by S520 (create new Span-C) instead of S460. Retained for historical reference only.

**File**: `S460.csv`
**Sheet**: `S460_Update_Span_C_Begin_Earlier`
**Title**: `S460 Update Span-C begin date to earlier date`
**Feature**: `Enrollment Service`
**Description**: `RETIRED — Send an update request for Span-C with new earlier begin date = (Span-B's new end date + 1) and existing MMIS Span-C end date (as the anchor)`
**Last Update**: `07/2026 (retired)`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-C ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to (Span-B's new End Date + 1). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to Span-C's existing MMIS span end date (as the anchor). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set WaiverFEA to the existing Span-C ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 8 | Set FEAEffectiveDate to (Span-B's new End Date + 1). | FEAEffectiveDate |  | X |  |  |
| 9 | Set FEAEndDate to Span-C's existing MMIS span end date (as the anchor). | FEAEndDate |  | X |  |  |
| 10 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 11 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 12 | Set DateSDPCEffective to (Span-B's new End Date + 1). | DateSDPCEffective |  |  | X |  |
| 13 | Set DateSDPCEnd to Span-C's existing MMIS span end date (as the anchor). | DateSDPCEnd |  |  | X |  |
| 14 | Set Status to A (Active). | Status |  |  | X |  |
| 15 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 16 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S460_001 - IRIS: Update Span-C begin date to earlier date for IRIS enrollment. Begin date is (Span-B's new end date + 1). End date is existing MMIS Span-C end date (as the anchor). The TransactionType = O and the Status = A. |
| 2 | Scenario: S460_002 - SDPC: Update Span-C begin date to earlier date for SDPC enrollment. Begin date is (Span-B's new end date + 1). End date is existing MMIS Span-C end date (as the anchor). The TransactionType = O and the Status = A. |
| 3 | Scenario: S460_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Called by S230 Scenario 3 (suspense end date changed to earlier date). After Span-B's end date is shortened (via S440), Span-C's begin date must move earlier to backfill the gap.
- S230 Scenario 3 required order: (1) call S440 to shorten Span-B's end date, then (2) call S460 to move Span-C's begin date earlier. This order is safe because shortening Span-B first creates a gap, and moving Span-C earlier fills it — no overlap is created at any point.
- Span-C is always an Active enrollment span (Status A) because it represents the enrollment period after the suspension.
- TransactionType O (Open) is used because we are moving the begin date of an existing span to an earlier date (Gainwell Scenario 3 pattern — same end date, earlier effective date).
- The anchor is Span-C's existing end date. MMIS locates the span by matching on this end date, then updates the begin date to the new value.
- FEA dates are set to match the full new Span-C date range. If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19).

---

## S470 — Update Span-A End Date to Later Date (Suspense Deleted)

**File**: `S470.csv`
**Sheet**: `S470_Update_Span_A_End_Later`
**Title**: `S470 Update Span-A end date to later date`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-A with new later end date = (Span-C's begin date - 1) and existing MMIS Span-A begin date (as the anchor)`
**Last Update**: `03/16/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-A ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to Span-A's existing MMIS span begin date (as the anchor). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to (Span-C's Begin Date - 1). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode. Not Required (end date is being extended to fill gap after suspension deletion). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the existing Span-A ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to Span-A's existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to (Span-C's Begin Date - 1). | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to Span-A's existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to (Span-C's Begin Date - 1). | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to A (Active). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S470_001 - IRIS: Update Span-A end date to later date for IRIS enrollment after suspense deletion. Begin date is existing MMIS Span-A begin date (as the anchor). End date is (Span-C's begin date - 1). The TransactionType = O and the Status = A. StartReasonCode = 2Q. StopReasonCode is Not Required. |
| 2 | Scenario: S470_002 - SDPC: Update Span-A end date to later date for SDPC enrollment after suspense deletion. Begin date is existing MMIS Span-A begin date (as the anchor). End date is (Span-C's begin date - 1). The TransactionType = A and the Status = A. |
| 3 | Scenario: S470_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Called by S230 Scenario 5 (suspense deleted). After Span-B is deleted (via S410), Span-A's end date must be extended to close the gap left by the removed suspension.
- S230 Scenario 5 required order: (1) call S410 to delete Span-B, then (2) call S470 to extend Span-A's end date later. This order is mandatory — Span-B must be removed first to avoid an overlap when Span-A's end date is extended.
- Span-A is always an Active enrollment span (Status A) because it represents the enrollment period before the suspension.
- TransactionType O (Open) is used because we are extending the end date of an existing span to a later date (Gainwell Scenario 2 pattern — same effective date, extended end date).
- The anchor is Span-A's existing begin date. MMIS locates the span by matching on this begin date, then updates the end date to the new value.
- FEA dates are set to match the full new Span-A date range. If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19).
- After this transaction, MMIS will have Span-A (extended) contiguous with Span-C. The suspension gap no longer exists. Span-A and Span-C remain as two separate contiguous active spans — Span-C is not deleted or merged. To consolidate them into a single span would require a separate user action on the enrollment record.

---

## S500 — Close Span-A Before Suspense

**File**: `S500.csv`
**Sheet**: `S500_Close_Span_A_Before_Suspense`
**Title**: `S500 Close Span-A before suspense`
**Feature**: `Enrollment Service`
**Description**: `Send an update request for Span-A with new end date = BC suspense begin date and existing MMIS Span-A begin date (as the anchor)`
**Last Update**: `03/16/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the existing Span-A ID of the ICA Agency. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to C (Closure). | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to Span-A's existing MMIS span begin date (as the anchor). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC suspense begin date (the participant is treated as active on this date). | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2I (Suspended). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to 2I (Suspended). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the existing Span-A ID of the FEA Agency. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to Span-A's existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC suspense begin date (the participant is treated as active on this date). | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to Span-A's existing MMIS span begin date (as the anchor). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC suspense begin date (the participant is treated as active on this date). | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to A (Active). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S500_001 - IRIS: Close Span-A before suspense for IRIS enrollment. Begin date is existing MMIS Span-A begin date (as the anchor). End date is BC suspense begin date (the participant is treated as active on this date). The TransactionType = C and the Status = A. StartReasonCode = 2I. StopReasonCode = 2I (Suspended). |
| 2 | Scenario: S500_002 - SDPC: Close Span-A before suspense for SDPC enrollment. Begin date is existing MMIS Span-A begin date (as the anchor). End date is BC suspense begin date (the participant is treated as active on this date). The TransactionType = C and the Status = A. |
| 3 | Scenario: S500_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Called by S240 (Suspense Add) for both Scenario 1 (suspension with end date) and Scenario 2 (suspension without end date). This is always the first MMIS transaction when adding a new suspension.
- S240 required order: (1) call S500 to shorten Span-A, then (2) if the suspension has an end date, call S520 to add the post-suspension active enrollment span (Span-C), then (3) call S510 to add the new suspension span (Span-B). This order is mandatory — the active span must be shortened first to make room, and Span-C is created before Span-B so that the suspension span fills the gap between Span-A and Span-C.
- Span-A is always an Active enrollment span (Status A). It remains Active after this transaction — it is not being suspended or deleted, only shortened.
- TransactionType C (Closure) is used because we are shortening the end date of an existing span to an earlier date (Gainwell Scenario 8 pattern — same effective date, earlier end date via Closure).
- The anchor is Span-A's existing begin date. MMIS locates the span by matching on this begin date, then updates the end date to the new value.
- The new end date is the **BC suspense begin date** (not begin date - 1). Per the Aug 7 2025 meeting minutes, the participant could have received services on the BC suspension date, so that date is the last day of the active enrollment span.
- FEA dates are set to match the full shortened Span-A date range. If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19).
- This is the suspension-add counterpart to S400 (which shortens Span-A in the suspension-update context). The difference is the source of the new end date: S500 uses the BC suspense begin date, while S400 uses (Span-B's new begin date - 1).

---

## S510 — Add Suspense Span

**File**: `S510.csv`
**Sheet**: `S510_Add_Suspense_Span`
**Title**: `S510 Add suspense span`
**Feature**: `Enrollment Service`
**Description**: `Send a request to add a new suspense span (Span-B) with begin date = (BC suspense begin date + 1) and end date = BC suspense end date minus one calendar day`
**Last Update**: `06/21/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at the new BC suspense begin date. | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the new BC suspense begin date [offset: +1 day]. | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to the new BC suspense end date [offset: -1 day]. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to S (Suspended). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2I (Suspended). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode to 2I (Suspended). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the new BC suspense begin date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the new BC suspense begin date [offset: +1 day]. | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to the new BC suspense end date [offset: -1 day]. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to S (Suspended). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the new BC suspense begin date [offset: +1 day]. | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to the new BC suspense end date [offset: -1 day]. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to S (Suspended). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S510_001 - IRIS: Add new IRIS suspense span. Begin date is BC suspense begin date [offset: +1 day]. End date is BC suspense end date [offset: -1 day]. The TransactionType = O and the Status = S. StartReasonCode = 2I. StopReasonCode = 2I. |
| 2 | Scenario: S510_002 - SDPC: Add new SDPC suspense span. Begin date is BC suspense begin date [offset: +1 day]. End date is BC suspense end date [offset: -1 day]. The TransactionType = A and the Status = S. |
| 3 | Scenario: S510_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- Called by S240 (Suspense Add) for both Scenario 1 (suspension with end date) and Scenario 2 (suspension without end date). This is the third MMIS transaction when adding a suspension with an end date, or the second when there is no end date.
- S240 required order: (1) S500 shortens Span-A, then (2) if the suspension has an end date, S520 adds the post-suspension active enrollment span (Span-C), then (3) S510 adds the suspension span (Span-B).
- TransactionType O (Open) with Status S (Suspended) is the standard pattern for creating a new suspended span (Gainwell Scenario 21 — Grey segment).
- This is a new span creation, not a modification of an existing span. No anchor date is required.
- The suspension begin date sent to MMIS is **BC suspension begin date + 1** — the first full day the participant could not receive services. It is contiguous with Span-A's new end date: Span-A ends on the BC suspense begin date, Span-B begins on (BC suspense begin date + 1).
- MMIS enforces suspension constraints: effective date no more than 365 days in the past (error 9166), effective date no more than 90 days in the future (error 9167). These are MMIS-side validations — BC should validate before sending. Note: the 90-day suspension duration rejection rule has been turned off by Gainwell (separate from the 90-day future date constraint, which remains active).
- **Suspension duration note**: The 90-day MMIS suspension rejection rule has been turned off by Gainwell — MMIS will no longer reject suspension spans based on duration. The 90-day limit remains an IRIS program policy rule enforced through BC business rules. BC should determine the appropriate suspension end date — see Core Knowledge section "Suspension Duration — IRIS Policy vs MMIS Constraint".
- **Null end date resolution**: When BC stores a null suspension end date, the caller (S240) resolves it to `12/31/2299` before calling S510. S510 receives the resolved value and sets DateEnrlEnd/DateSDPCEnd accordingly. S510 itself does not perform null resolution — that is the caller's responsibility.
- The ICA and FEA agencies carry forward from the enrollment — the same agencies that were on Span-A apply to the suspension span.
- Reason code 2I is used for enrolled-to-suspended transitions (per S220 Notes).

---

## S520 — Create Span-C After Suspense

**File**: `S520.csv`
**Sheet**: `S520_Create_Span_C_After_Suspense`
**Title**: `S520 Create Span-C after suspense`
**Feature**: `Enrollment Service`
**Description**: `Send a request to add a new active enrollment span (Span-C) with begin date = BC suspense end date and end date = Span-A's pre-update end date`
**Last Update**: `06/21/2026`
**Scenarios**: 3

### Conditions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y | N | N |
| 2 | Creating an SDPC Enrollment MMIS Transaction |  |  | N | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 | 3 |
|---|-------------|-----------|-------------|---|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |  |
| 2 | Set WaiverAgencyID to the ID of the ICA Agency assigned to the participant at (BC suspense end date). | WaiverAgencyID |  | X |  |  |
| 3 | Set TransactionType to O (Open) for IRIS or A (Add/Update) for SDPC. | TransactionType |  | X | X |  |
| 4 | Set DateEnrlEff to the BC suspense end date (the participant is treated as active on this date). | DateEnrlEff |  | X |  |  |
| 5 | Set DateEnrlEnd to Span-A's pre-update end date. | DateEnrlEnd |  | X |  |  |
| 6 | Set Status to A (Active). | Status |  | X |  |  |
| 7 | Set StartReasonCode to 2Q (Enrollment from Suspension). | StartReasonCode |  | X |  |  |
| 8 | Set StopReasonCode. Not Required (end date is typically 12/31/2299 for post-suspension enrollment). | StopReasonCode |  | X |  |  |
| 9 | Set WaiverFEA to the ID of the FEA Agency assigned to the participant at the BC suspense end date. | WaiverFEA |  | X |  |  |
| 10 | Set FEAEffectiveDate to the BC suspense end date (the participant is treated as active on this date). | FEAEffectiveDate |  | X |  |  |
| 11 | Set FEAEndDate to Span-A's pre-update end date. | FEAEndDate |  | X |  |  |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |  |
| 13 | Set SDPCAgencyID to the ID of the SDPC Oversight Agency assigned to the participant. | SDPCAgencyID |  |  | X |  |
| 14 | Set DateSDPCEffective to the BC suspense end date (the participant is treated as active on this date). | DateSDPCEffective |  |  | X |  |
| 15 | Set DateSDPCEnd to Span-A's pre-update end date. | DateSDPCEnd |  |  | X |  |
| 16 | Set Status to A (Active). | Status |  |  | X |  |
| 17 | Set WorkerID to the worker ID associated with the SDPC changes. | WorkerID |  |  | X |  |
| 18 | Return to Calling Step | n/a |  | X | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S520_001 - IRIS: Create active IRIS enrollment span (Span-C) after suspension. Begin date is BC suspense end date (the participant is treated as active on this date). End date is Span-A's pre-update end date. The TransactionType = O and the Status = A. StartReasonCode = 2Q (Enrollment from Suspension). StopReasonCode is Not Required. |
| 2 | Scenario: S520_002 - SDPC: Create active SDPC enrollment span (Span-C) after suspension. Begin date is BC suspense end date (the participant is treated as active on this date). End date is Span-A's pre-update end date. The TransactionType = A and the Status = A. |
| 3 | Scenario: S520_003 - Neither IRIS nor SDPC transaction. No action taken. |

### Notes

- RecertificationCompleteDate is IRIS-only and always equals DateEnrlEff (BC suspension end date) for this transaction. The SDPCEnrollmentRequest API does not include this field. See Core Knowledge section "Recertification Completion Date — MMIS Field Rule".
- Called by S240 Scenario 1 only (suspension with end date). Not called for Scenario 2 (suspension without end date) because when a suspension has no end date, there is no post-suspension active enrollment to create.
- S240 required order: (1) S500 shortens Span-A, then (2) S520 creates the post-suspension active span (Span-C), then (3) S510 adds the suspension span (Span-B). Span-C is created before Span-B so that the suspension span fills the gap between Span-A and Span-C.
- After all three transactions, MMIS has: Span-A (active, shortened) → Span-B (suspended) → Span-C (active, new). All three are contiguous with no gaps or overlaps.
- TransactionType O (Open) with Status A (Active) is the standard pattern for creating a new active enrollment span.
- This is a new span creation, not a modification of an existing span. No anchor date is required.
- The end date is Span-A's **pre-update** end date — the value Span-A had before S500 shortened it. This is typically 12/31/2299 for open-ended enrollments. S240 must preserve this value before calling S500.
- Span-C begins the day after the suspension ends in MMIS terms. However, because MMIS receives the suspension end date as BC suspension end date − 1, Span-C's begin date (the BC suspension end date) is contiguous with Span-B's MMIS end date (BC suspension end date − 1).
- The ICA and FEA agencies are looked up as of the Span-C begin date, not the original Span-A begin date. If an agency change occurred during the suspension period, the post-suspension span should reflect the current assignment.
- Reason code 2Q is used for suspended-to-enrolled transitions.
- This is the suspension-add counterpart to S360 (which creates a post-suspension enrollment in the S350 enrollment-end-date-extended context). The key difference: S520 uses Span-A's pre-update end date, while S360 uses the new BC enrolled span end date.

---

## S600 — Close Span-B for Agency Change

**File**: `S600.csv`
**Sheet**: `S600_Close_Span_B_For_Agency_Change`
**Title**: `S600 Close Span-B for agency change`
**Feature**: `Enrollment Service`
**Description**: `IRIS only: Send an update request for Span-B with new end date = (agency change effective date - 1) and existing MMIS Span-B begin date (as the anchor)`
**Last Update**: `03/19/2026`
**Scenarios**: 2

### Conditions

| # | Description | Data Element |  | 1 | 2 |
|---|-------------|-----------|-------------|---|---|
| 1 | Current MMIS IRIS enrollment span for the participant has Active status |  |  | Y | N |
| 2 | Current MMIS IRIS enrollment span for the participant has Suspended status |  |  | N | Y |

### Actions

| # | Description | Data Element |  | 1 | 2 |
|---|-------------|-----------|-------------|---|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X | X |
| 2 | Set WaiverAgencyID to the existing Span-B ID of the ICA Agency (pre-update ICA). | WaiverAgencyID |  | X | X |
| 3 | Set TransactionType to C (Closure). | TransactionType |  | X | X |
| 4 | Set DateEnrlEff to Span-B's existing MMIS span begin date (as the anchor). | DateEnrlEff |  | X | X |
| 5 | Set DateEnrlEnd to (agency change effective date - 1). | DateEnrlEnd |  | X | X |
| 6 | Set Status to A (Active). | Status |  | X |  |
| 7 | Set Status to S (Suspended). | Status |  |  | X |
| 8 | Set StartReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed. | StartReasonCode |  | X | X |
| 9 | Set StopReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed. | StopReasonCode |  | X | X |
| 10 | Set WaiverFEA to the existing Span-B ID of the FEA Agency (pre-update FEA). | WaiverFEA |  | X | X |
| 11 | Set FEAEffectiveDate to Span-B's existing MMIS span begin date (as the anchor). | FEAEffectiveDate |  | X | X |
| 12 | Set FEAEndDate to (agency change effective date - 1). | FEAEndDate |  | X | X |
| 13 | Set FEAStatus to A (Active). | FEAStatus |  | X |  |
| 14 | Set FEAStatus to A (Active). Note: WISITS production data confirms FEAStatus is always A when closing a span, even when Status=S. | FEAStatus |  |  | X |
| 15 | Return to Calling Step | n/a |  | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S600_001 - IRIS Active span: Close Span-B for agency change. Begin date is existing MMIS Span-B begin date (as the anchor). End date is (agency change effective date - 1). The TransactionType = C and the Status = A. StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). |
| 2 | Scenario: S600_002 - IRIS Suspended span: Close Span-B for agency change. Begin date is existing MMIS Span-B begin date (as the anchor). End date is (agency change effective date - 1). The TransactionType = C and the Status = S. FEAStatus = A (always Active on closures, even when Status=S). StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode = 2W (Reason Not Provided in Source System). |

### Notes

- **FEAStatus is always A (Active) when closing a span for agency transfer**, regardless of whether the span being closed has Status A or Status S. WISITS production data confirms: all 9 suspended FEA transfer closures send FEAStatus=A. This matches the disenrollment pattern (S340).
- **StopReasonCode on suspended closure uses 2W**: When closing a suspended span for agency transfer, WISITS sends StopReasonCode=2W (Reason Not Provided in Source System) instead of the transfer reason code (2P/2R). The transfer reason code is used on the new span's StartReasonCode. This differs from active closures which use the transfer reason code for both Start and Stop.


- Called by S250 (Location Assignment Update) for both Scenario 1 (current span is Active), Scenario 2 (current span is Suspended with Span-C), and Scenario 3 (current span is Suspended without Span-C). This is always the first MMIS transaction when processing an agency change.
- S250 required order: (1) call S600 to close/shorten Span-B with the old agency, then (2) call S610 (if Active) or S620 (if Suspended) to create a new span with the new agency starting at the agency change effective date. If Suspended with a post-suspension Span-C, also (3) call S310 to inactivate the old Span-C, then (4) call S610 to recreate Span-C with the new agency. This order is mandatory — the existing span must be shortened first to make room for the new span, otherwise MMIS would reject the new span as an overlap (Gainwell Scenario 17 pattern — overlapping agency effective dates).
- TransactionType C (Closure) is used because we are shortening the end date of an existing span to an earlier date (Gainwell Scenarios 15/16/19 pattern — Closure record to end-date the existing agency's enrollment).
- The anchor is Span-B's existing begin date. MMIS locates the span by matching on this begin date, then updates the end date to the new value.
- Span-B's status is preserved in the transaction. If the current span is Active (Status A), the Closure transaction uses Status A. If the current span is Suspended (Status S), the Closure transaction uses Status S. This matches the Gainwell pattern where the Closure record's Status reflects the span's current state.
- The ICA (WaiverAgencyID) and FEA (WaiverFEA) must be the **pre-update** values — the agencies that were assigned before the change. These identify the existing MMIS span being modified.
- FEA dates are set to match the full shortened Span-B date range. If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19).
- This is the agency-change counterpart to S500 (which closes Span-A before a new suspension). The key differences: (1) S600 operates on a span that may be Active or Suspended, while S500 is always Active; (2) the new end date source is (agency change effective date - 1) vs the BC suspense begin date; (3) S600 uses the pre-update agency values, while S500 uses Span-A's existing agency values.
- After this transaction, MMIS will have Span-B shortened to end the day before the agency change. The succeeding span (created by S610 or S620) will begin on the agency change effective date with the new ICA and FEA.

---

## S610 — Create Active Enrollment Span with New Agency

**File**: `S610.csv`
**Sheet**: `S610_Create_Active_Span_New_Agency`
**Title**: `S610 Create active span with new agency`
**Feature**: `Enrollment Service`
**Description**: `IRIS only: Send a request to add a new active enrollment span with begin date = agency change effective date, end date = S200-Calculated span end date, and new ICA/FEA`
**Last Update**: `06/20/2026`
**Scenarios**: 1

### Conditions

| # | Description | Data Element |  | 1 |
|---|-------------|-----------|-------------|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y |

### Actions

| # | Description | Data Element |  | 1 |
|---|-------------|-----------|-------------|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X |
| 2 | Set WaiverAgencyID to the ID of the new ICA Agency assigned to the participant (post-update ICA). | WaiverAgencyID |  | X |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X |
| 4 | Set DateEnrlEff to the agency change effective date. | DateEnrlEff |  | X |
| 5 | Set DateEnrlEnd to the S200-calculated span end date. | DateEnrlEnd |  | X |
| 6 | Set Status to A (Active). | Status |  | X |
| 7 | Set StartReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed. | StartReasonCode |  | X |
| 8 | Set StopReasonCode. Not Required (end date is typically 12/31/2299 for new agency span). | StopReasonCode |  | X |
| 9 | Set WaiverFEA to the ID of the new FEA Agency assigned to the participant (post-update FEA). | WaiverFEA |  | X |
| 10 | Set FEAEffectiveDate to the agency change effective date. | FEAEffectiveDate |  | X |
| 11 | Set FEAEndDate to the S200-calculated span end date. | FEAEndDate |  | X |
| 12 | Set FEAStatus to A (Active). | FEAStatus |  | X |
| 13 | Return to Calling Step | n/a |  | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S610_001 - IRIS: Create new active enrollment span with new ICA/FEA. Begin date is agency change effective date. End date is S200-Calculated span end date. The TransactionType = O and the Status = A. StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode is Not Required. |

### Notes

- RecertificationCompleteDate is IRIS-only and always equals DateEnrlEff (the agency change effective date) for this transaction. See Core Knowledge section "Recertification Completion Date — MMIS Field Rule".
- Called by S255 (Scenarios 1 and 2) when the S200-calculated span has Active status. S255 handles the conditional delete (S310) before calling S610 if an old-agency span exists.
- S250 required order: (1) S600 closes/shortens Span-B with the old agency, then (2) S255 is called for each remaining span. Within S255, S310 (if needed) runs before S610. This order is mandatory — the old span must be removed first to make room, otherwise MMIS would reject the new span as an overlap (Gainwell Scenario 17 pattern).
- After all transactions, MMIS will have: Span-B (shortened, old agency) → new span(s) (new agency). The spans are contiguous: Span-B ends on (agency change effective date - 1), the first new span begins on the agency change effective date.
- TransactionType O (Open) with Status A (Active) is the standard pattern for creating a new active enrollment span (Gainwell Scenarios 15/16/19 — Yellow segment / Open record with new agency).
- This is a new span creation, not a modification of an existing span. No anchor date is required.
- The ICA (WaiverAgencyID) and FEA (WaiverFEA) must be the **post-update** (new) agency values — the agencies being assigned to the participant as of the change effective date.
- The end date comes from the S200-calculated span, which derives from the BC enrollment end date. For open-ended enrollments this will be 12/31/2299; for enrollments with a real end date, it will be that date. See Core Knowledge section "MMIS Span End Dates Must Reflect BC Data".
- FEA dates are set to match the full span date range (agency change effective date to the S200-calculated end date). If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19 — "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD").
- This is the agency-change counterpart to S520 (which creates Span-C after a new suspension) and S300 (which creates the initial enrollment span). The key differences: S610 creates a span using the new agency values and the agency change effective date as the begin date, while S300 uses the enrollment begin date and S520 uses (suspense end date + 1).
- Reason code 2I is used for agency change transitions (per Gainwell Scenarios 15/16 pattern — the new span under the new agency).

---

## S620 — Create Suspended Span with New Agency

**File**: `S620.csv`
**Sheet**: `S620_Create_Suspended_Span_New_Agency`
**Title**: `S620 Create suspended span with new agency`
**Feature**: `Enrollment Service`
**Description**: `IRIS only: Send a request to add a new suspended span with begin date = agency change effective date, end date = S200-Calculated span end date, and new ICA/FEA`
**Last Update**: `03/19/2026`
**Scenarios**: 1

### Conditions

| # | Description | Data Element |  | 1 |
|---|-------------|-----------|-------------|---|
| 1 | Creating an IRIS Enrollment MMIS Transaction |  |  | Y |

### Actions

| # | Description | Data Element |  | 1 |
|---|-------------|-----------|-------------|---|
| 1 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X |
| 2 | Set WaiverAgencyID to the ID of the new ICA Agency assigned to the participant (post-update ICA). | WaiverAgencyID |  | X |
| 3 | Set TransactionType to O (Open). | TransactionType |  | X |
| 4 | Set DateEnrlEff to the agency change effective date. | DateEnrlEff |  | X |
| 5 | Set DateEnrlEnd to Span-B's pre-update end date. | DateEnrlEnd |  | X |
| 6 | Set Status to S (Suspended). | Status |  | X |
| 7 | Set StartReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed. | StartReasonCode |  | X |
| 8 | Set StopReasonCode to 2P (ICA Transfer) if ICA changed, or 2R (FEA Transfer) if FEA changed. | StopReasonCode |  | X |
| 9 | Set WaiverFEA to the ID of the new FEA Agency assigned to the participant (post-update FEA). | WaiverFEA |  | X |
| 10 | Set FEAEffectiveDate to the agency change effective date. | FEAEffectiveDate |  | X |
| 11 | Set FEAEndDate to Span-B's pre-update end date. | FEAEndDate |  | X |
| 12 | Set FEAStatus to S (Suspended). | FEAStatus |  | X |
| 13 | Return to Calling Step | n/a |  | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S620_001 - IRIS: Create new suspended span with new ICA/FEA. Begin date is agency change effective date. End date is S200-Calculated span end date. The TransactionType = O and the Status = S. StartReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). StopReasonCode = 2P (ICA Transfer) or 2R (FEA Transfer). |

### Notes

- Called by S255 (Scenarios 3 and 4) when the S200-calculated span has Suspended status. S255 handles the conditional delete (S310) before calling S620 if an old-agency span exists.
- S250 required order: (1) S600 closes/shortens Span-B with the old agency, then (2) S255 is called for each remaining span. Within S255, S310 (if needed) runs before S620. This order is mandatory — the old span must be removed first to make room, otherwise MMIS would reject the new span as an overlap (Gainwell Scenario 17 pattern).
- After all transactions, MMIS will have: Span-B (shortened, old agency, Suspended) followed by new span(s) (new agency). The spans are contiguous: Span-B ends on (agency change effective date - 1), the first new span begins on the agency change effective date.
- TransactionType O (Open) with Status S (Suspended) is the standard pattern for creating a new suspended span (Gainwell Scenario 21 — Grey segment).
- This is a new span creation, not a modification of an existing span. No anchor date is required.
- The ICA (WaiverAgencyID) and FEA (WaiverFEA) must be the **post-update** (new) agency values — the agencies being assigned to the participant as of the change effective date.
- The end date is Span-B's **pre-update** end date — the value Span-B had before S600 shortened it. S250 must preserve this value before calling S600. This preserves the original suspension extent under the new agency.
- FEA dates are set to match the full Span-C date range (agency change effective date to Span-B's pre-update end date). If FEA dates do not span the enrollment segment, MMIS will reject with an edit (Gainwell Scenarios 18/19 — "INCOMING FEA DATES DO NOT SPAN THE WAIVER ENROLLMENT PERIOD").
- This is the suspended counterpart to S610 (which creates an active span for S255 Scenarios 1/2). The key differences: (1) S620 uses Status S instead of Status A; (2) S620 uses Span-B's pre-update end date instead of the S200-calculated enrollment end date; (3) S620 preserves the suspension period under the new agency, while S610 creates an active enrollment span.
- Reason code 2I is used for agency change transitions (per Gainwell Scenarios 15/16 pattern — the new span under the new agency).

---

## S700 — Address-Only Update

**File**: `S700.csv`
**Sheet**: `S700_Address_Only_Update`
**Title**: `S700 Address-only update`
**Feature**: `Enrollment Service`
**Description**: `Send an address-only update for the current MMIS span using the same begin and end dates, with updated address fields and the StartReasonCode that corresponds to how the span originally began.`
**Last Update**: `06/22/2026`
**Scenarios**: 2

### Conditions

| # | Description | Data Element |  | 1 | 2 |
|---|-------------|-----------|-------------|---|---|
| 1 | The S200-calculated span list contains a span whose date range includes the current date (participant is currently enrolled or suspended) |  |  | Y | N |

### Actions

| # | Description | Data Element |  | 1 | 2 |
|---|-------------|-----------|-------------|---|---|
| 1 | Identify the current span from the S200-calculated span list: the span whose date range includes the current date (current date falls between span begin date and span end date, inclusive). This may be an Active or Suspended span. | n/a |  | X |  |
| 2 | Set WaiverProgramName to "IRIS". | WaiverProgramName |  | X |  |
| 3 | Set WaiverAgencyID to the existing ICA Agency ID from the current span. | WaiverAgencyID |  | X |  |
| 4 | Set TransactionType to O (Open). | TransactionType |  | X |  |
| 5 | Set DateEnrlEff to the current span's begin date. | DateEnrlEff |  | X |  |
| 6 | Set DateEnrlEnd to the current span's end date. | DateEnrlEnd |  | X |  |
| 7 | Set Status to the current span's status (A or S). | Status |  | X |  |
| 8 | Set StartReasonCode to the reason code that corresponds to how the current span originally began: 2L if the span began as a new enrollment or Disenrolled→Enrolled reinstatement; 2Q if the span began as a post-suspension return; 2P if the span began due to an ICA transfer; 2R if the span began due to an FEA transfer. | StartReasonCode |  | X |  |
| 9 | Set StopReasonCode to the reason code that corresponds to how the current span will end: null if the span end date is 12/31/2299; 2I if the current span is Suspended with any other valid end date. This preserves the original stop reason in MMIS rather than overwriting it with an incorrect value. | StopReasonCode |  | X |  |
| 10 | Set WaiverFEA to the existing FEA Agency ID from the current span. | WaiverFEA |  | X |  |
| 11 | Set FEAEffectiveDate to the current span's begin date. | FEAEffectiveDate |  | X |  |
| 12 | Set FEAEndDate to the current span's end date. | FEAEndDate |  | X |  |
| 13 | Set FEAStatus to the current span's status (A or S). | FEAStatus |  | X |  |
| 14 | Populate address fields with the participant's new residential address. | Address fields |  | X |  |
| 15 | Return to Calling Step | n/a |  | X | X |

### Scenario Notes

| # | Note |
|---|------|
| 1 | Scenario: S700_001 - IRIS address update, current span exists. Action #1 identifies the current span from the S200-calculated list as the span whose date range includes the current date. Begin date is the current span's begin date. End date is the current span's end date. The TransactionType = O and the Status = the current span's status (A or S). StartReasonCode is derived from how the span originally began — not hardcoded to 2L. StopReasonCode is Not Required. |
| 2 | Scenario: S700_002 - No current span. The S200-calculated span list contains no span whose date range includes the current date — the participant is disenrolled or has no active MMIS enrollment as of today. No MMIS transaction is sent. Return to calling step. |

### Notes

- Called by S100 Scenario 11 (participant's residential address is updated).
- **IRIS only**: The `SDPCEnrollmentRequest` API does not include address fields, so address-only updates only apply to IRIS enrollments. SDPC address changes are not sent to MMIS.
- This is not current WISITS functionality — it is a new capability for Blue Compass.
- The current span is identified from the S200-calculated span list as the span whose date range includes the current date. This may be an Active or Suspended span. If no S200-calculated span includes the current date (participant is disenrolled), no MMIS transaction is sent.
- **StartReasonCode derivation rule**: The StartReasonCode sent must match the reason code originally used when the current span's begin date was first established. Derive as follows: (1) if the span begin date equals the BC enrollment begin date and no prior suspension or agency change precedes it — use 2L; (2) if the span begin date equals a BC suspension end date (Span-C) — use 2Q; (3) if the span begin date equals an ICA transfer effective date — use 2P; (4) if the span begin date equals an FEA transfer effective date — use 2R. This preserves the original reason code in MMIS and prevents corruption of enrollment reporting (confirmed by Richard Ward, DHS, 06/17/2026).
- TransactionType O (Open) is used because no dates are being changed. Per the 03/18/2026 meeting, sending the same dates with Open and only a different address will work — MMIS will accept it and update the address.
- No date changes are made. The begin date and end date sent must exactly match the existing MMIS span.
- The status sent must match the span's current status (A for Active, S for Suspended).
- FEA dates must match the span dates (same constraint as all other transactions).

<!-- END OF TABLES -->
<!-- BATCH 4: S350–S019 (to be added) -->
<!-- BATCH 5: S400–S460 (to be added) -->
<!-- BATCH 6: S500–S520, S600–S620 (to be added) -->
