# WiDHS Enrollment Service - Scenario Diagrams

Visual examples showing the full lifecycle of enrollment changes — from MMIS starting state through Blue Compass changes to MMIS transactions and resulting end state.

**Date:** June 28, 2026

---

## Table of Contents

- [S220_001 - New Enrollment Added](#scenario-s220_001_iris-s220s300---iris-new-enrollment-added)
- [S220_002 - Enrollment Begin Date Changed to Earlier Date](#scenario-s220_002_iris-s220s310s300---iris-enrollment-begin-date-changed-to-earlier-date)
- [S220_003 - Enrollment Begin Date Changed to Later Date](#scenario-s220_003_iris-s220s310s300---iris-enrollment-begin-date-changed-to-later-date)
- [S220_004 - Enrollment End Date Changed to Earlier Date (Disenrollment)](#scenario-s220_004_iris-s220s340---iris-enrollment-end-date-changed-to-earlier-date-disenrollment)
- [S220_005a - Enrollment End Date Changed to Later Date (No Suspension)](#scenario-s220_005a_iris-s220s350---iris-enrollment-end-date-changed-to-later-date-no-suspension)
- [S220_005b - Enrollment End Date Changed to Later Date (With Suspension)](#scenario-s220_005b_iris-s220s350s360---iris-enrollment-end-date-changed-to-later-date-with-suspension)
- [S220_006 - Enrollment Deleted (Referral Withdrawn)](#scenario-s220_006_iris-s220s310---iris-enrollment-deleted-referral-withdrawn)
- [S220_007 - Enrollment Reinstated (Disenrolled to Enrolled)](#scenario-s220_007_iris-s220s300---iris-enrollment-reinstated-disenrolled-to-enrolled)
- [S220_008 - Disenrolled Span Created (Real Reason Code Sent)](#scenario-s220_008_iris-s220s345---iris-disenrolled-span-created-real-reason-code-sent)
- [S230_001 - Suspense Begin Date Changed to Earlier Date](#scenario-s230_001_iris-s230s400s410s510---iris-suspense-begin-date-changed-to-earlier-date)
- [S230_002 - Suspense Begin Date Changed to Later Date](#scenario-s230_002_iris-s230s410s510s400---iris-suspense-begin-date-changed-to-later-date)
- [S230_003 - Suspense End Date Changed to Earlier Date](#scenario-s230_003_iris-s230s440s310s520---iris-suspense-end-date-changed-to-earlier-date)
- [S230_004 - Suspense End Date Changed to Later Date](#scenario-s230_004_iris-s230s310s445s520---iris-suspense-end-date-changed-to-later-date)
- [S230_005 - Suspense Deleted](#scenario-s230_005_iris-s230s410s470---iris-suspense-deleted)
- [S230_006 - Suspense End Date Set from Null to Real Date](#scenario-s230_006_iris-s230s440s520---iris-suspense-end-date-set-from-null-to-real-date)
- [S230_007 - Suspense End Date Changed from Real to Null](#scenario-s230_007_iris-s230s310s445---iris-suspense-end-date-changed-from-real-to-null)
- [S240_001 - New Suspension Added (With End Date)](#scenario-s240_001_iris-s240s500s510s520---iris-new-suspension-added-with-end-date)
- [S240_002 - New Suspension Added (No End Date)](#scenario-s240_002_iris-s240s500s510---iris-new-suspension-added-no-end-date)
- [S250_001 - ICA Change (Current Span Active)](#scenario-s250_001_iris-s250s600s255s610---iris-ica-change-current-span-active)
- [S250_002 - FEA Change (Current Span Suspended)](#scenario-s250_002_iris-s250s600s255s620s310s610---iris-fea-change-current-span-suspended)

---


## Scenario: S220_001_IRIS (S220/S300) - IRIS New Enrollment Added

1. **MMIS Before:** No span exists.
2. **BC Before:** No enrollment exists.
3. **BC Change:** User adds an IRIS enrollment (03/15/25–12/31/2299). First enrollment for this participant.
4. **Txn 1:** S300 — Create new enrollment span (Type: O, Status: A, Start Reason: 2L, Stop Reason: not required).
5. **MMIS After:** Span-A Active (03/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_001 - New Enrollment Added. Action #2 sends a new enrollment span to MMIS.

---

## Scenario: S220_001_SDPC (S220/S300) - SDPC New Enrollment Added

1. **MMIS Before:** No span exists.
2. **BC Before:** No enrollment exists.
3. **BC Change:** User adds an SDPC enrollment (03/15/25–12/31/2299). First enrollment for this participant.
4. **Txn 1:** S300 — Create new enrollment span (Type: A, Status: A).
5. **MMIS After:** Span-A Active (03/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_001 - New Enrollment Added. Action #2 sends a new enrollment span to MMIS.

---


## Scenario: S220_002_IRIS (S220/S310/S300) - IRIS Enrollment Begin Date Changed to Earlier Date

1. **MMIS Before:** Span-B Active (03/15/25–12/31/2299).
2. **BC Before:** IRIS enrollment (03/15/25–12/31/2299).
3. **BC Change:** User changes enrollment begin date from 03/15/25 to 02/01/25. Enrollment starts earlier.
4. **Txn 1:** S310 — Delete existing span (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **Txn 2:** S300 — Create span with new begin date (Type: O, Status: A, Start Reason: 2L, Stop Reason: not required).
6. **MMIS After:** Span-B Active (02/01/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_002 - Enrollment begin date changed to earlier date. If a BC enrollment begin date changed then Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new earlier begin date and existing end date.

---

## Scenario: S220_002_SDPC (S220/S310/S300) - SDPC Enrollment Begin Date Changed to Earlier Date

1. **MMIS Before:** Span-B Active (03/15/25–12/31/2299).
2. **BC Before:** SDPC enrollment (03/15/25–12/31/2299).
3. **BC Change:** User changes enrollment begin date from 03/15/25 to 02/01/25. Enrollment starts earlier.
4. **Txn 1:** S310 — Delete existing span (Type: A, Status: I).
5. **Txn 2:** S300 — Create span with new begin date (Type: A, Status: A).
6. **MMIS After:** Span-B Active (02/01/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_002 - Enrollment begin date changed to earlier date. If a BC enrollment begin date changed then Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new earlier begin date and existing end date.

---


## Scenario: S220_003_IRIS (S220/S310/S300) - IRIS Enrollment Begin Date Changed to Later Date

1. **MMIS Before:** Span-B Active (02/01/25–12/31/2299).
2. **BC Before:** IRIS enrollment (02/01/25–12/31/2299).
3. **BC Change:** User changes enrollment begin date from 02/01/25 to 03/15/25. Enrollment starts later.
4. **Txn 1:** S310 — Delete existing span (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **Txn 2:** S300 — Create span with new begin date (Type: O, Status: A, Start Reason: 2L, Stop Reason: not required).
6. **MMIS After:** Span-B Active (03/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_003 - Enrollment begin date changed to later date. If a BC enrollment begin date changed then Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new later begin date and existing end date.

---

## Scenario: S220_003_SDPC (S220/S310/S300) - SDPC Enrollment Begin Date Changed to Later Date

1. **MMIS Before:** Span-B Active (02/01/25–12/31/2299).
2. **BC Before:** SDPC enrollment (02/01/25–12/31/2299).
3. **BC Change:** User changes enrollment begin date from 02/01/25 to 03/15/25. Enrollment starts later.
4. **Txn 1:** S310 — Delete existing span (Type: A, Status: I).
5. **Txn 2:** S300 — Create span with new begin date (Type: A, Status: A).
6. **MMIS After:** Span-B Active (03/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_003 - Enrollment begin date changed to later date. If a BC enrollment begin date changed then Span-B is the S200-Calculated MMIS span with the earliest begin date and Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #4 deletes existing Span-B from MMIS. Action #5 creates a new enrollment span with the new later begin date and existing end date.

---


## Scenario: S220_004_IRIS (S220/S340) - IRIS Enrollment End Date Changed to Earlier Date (Disenrollment)

1. **MMIS Before:** Span-B Active (01/01/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299).
3. **BC Change:** User changes enrollment end date from 12/31/2299 to 06/30/25. Participant disenrolled.
4. **Txn 1:** S340 — Shorten end date via Closure (Type: C, Status: A, Start Reason: 2W, Stop Reason: 2W). Placeholder — real reason code not yet known.
5. **MMIS After:** Span-B Active (01/01/25–06/30/25). See next scenario for Step 2 (real reason code).

> **Enrollment Decision Table Reference:**
> Scenario: S220_004 - Enrollment end date changed to an earlier date. If a BC enrollment end date changed then Span-B is the S200-Calculated MMIS span with the latest begin date and an Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #6 updates Span-B with the new earlier end date.

---

## Scenario: S220_004_SDPC (S220/S340) - SDPC Enrollment End Date Changed to Earlier Date

1. **MMIS Before:** Span-B Active (01/01/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299).
3. **BC Change:** User changes enrollment end date from 12/31/2299 to 06/30/25. Participant disenrolled.
4. **Txn 1:** S340 — Shorten end date via Closure (Type: C, Status: A).
5. **MMIS After:** Span-B Active (01/01/25–06/30/25).

> **Enrollment Decision Table Reference:**
> Scenario: S220_004 - Enrollment end date changed to an earlier date. If a BC enrollment end date changed then Span-B is the S200-Calculated MMIS span with the latest begin date and an Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #6 updates Span-B with the new earlier end date.

---


## Scenario: S220_005a_IRIS (S220/S350) - IRIS Enrollment End Date Changed to Later Date (No Suspension)

1. **MMIS Before:** Span-B Active (01/01/25–06/30/25).
2. **BC Before:** IRIS enrollment (01/01/25–06/30/25).
3. **BC Change:** User changes enrollment end date from 06/30/25 to 12/31/2299. Enrollment reopened.
4. **Txn 1:** S350 — Extend end date (Type: O, Status: A, Start Reason: 2L, Stop Reason: not required).
5. **MMIS After:** Span-B Active (01/01/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_005 - Enrollment end date changed to a later date. If a BC enrollment end date changed then Span-B is the S200-Calculated MMIS span with the latest begin date and an Active status (within the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #7 updates Span-B with the new later end date.

---

## Scenario: S220_005b_IRIS (S220/S350/S360) - IRIS Enrollment End Date Changed to Later Date (With Suspension)

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25). No Span-C.
2. **BC Before:** IRIS enrollment (01/01/25–06/30/25), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes enrollment end date from 06/30/25 to 12/31/2299. Post-suspension span now needed.
4. **Txn 1:** S350 — Extend Span-A end date (Type: O, Status: A, Start Reason: 2L, Stop Reason: not required).
5. **Txn 2:** S360 — Create post-suspension enrollment span (Type: O, Status: A, Start Reason: 2Q, Stop Reason: not required).
6. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_005 - Enrollment end date changed to a later date. Action #1 identifies Span-B. Action #7 updates Span-B with the new later end date.

---


## Scenario: S220_005a_SDPC (S220/S350) - SDPC Enrollment End Date Changed to Later Date (No Suspension)

1. **MMIS Before:** Span-B Active (01/01/25–06/30/25).
2. **BC Before:** SDPC enrollment (01/01/25–06/30/25).
3. **BC Change:** User changes enrollment end date from 06/30/25 to 12/31/2299. Enrollment reopened.
4. **Txn 1:** S350 — Extend end date (Type: A, Status: A).
5. **MMIS After:** Span-B Active (01/01/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_005 - Enrollment end date changed to a later date. Action #1 identifies Span-B. Action #7 updates Span-B with the new later end date.

---

## Scenario: S220_005b_SDPC (S220/S350/S360) - SDPC Enrollment End Date Changed to Later Date (With Suspension)

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25). No Span-C.
2. **BC Before:** SDPC enrollment (01/01/25–06/30/25), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes enrollment end date from 06/30/25 to 12/31/2299. Post-suspension span now needed.
4. **Txn 1:** S350 — Extend Span-A end date (Type: A, Status: A).
5. **Txn 2:** S360 — Create post-suspension enrollment span (Type: A, Status: A).
6. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_005 - Enrollment end date changed to a later date. Action #1 identifies Span-B. Action #7 updates Span-B with the new later end date.

---


## Scenario: S220_006_IRIS (S220/S310) - IRIS Enrollment Deleted (Referral Withdrawn)

1. **MMIS Before:** Span-B Active (03/15/25–12/31/2299).
2. **BC Before:** IRIS enrollment (03/15/25–12/31/2299).
3. **BC Change:** User changes enrollment status to Referral Withdrawn. Enrollment removed entirely.
4. **Txn 1:** S310 — Delete enrollment span (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **MMIS After:** No spans remain.

> **Enrollment Decision Table Reference:**
> Scenario: S220_006 - Enrollment status changed from 'Enrolled' to 'Referral Withdrawn'. If BC Enrolled changes to Referral Withdrawn there is only one S200-Calculated MMIS span with an Active Status (dates would match the pre-update BC Enrolled span). Action #1 identifies Span-B. Action #3 sends an Inactivate request to delete Span-B.

---

## Scenario: S220_006_SDPC (S220/S310) - SDPC Enrollment Deleted (Referral Withdrawn)

1. **MMIS Before:** Span-B Active (03/15/25–12/31/2299).
2. **BC Before:** SDPC enrollment (03/15/25–12/31/2299).
3. **BC Change:** User changes enrollment status to Referral Withdrawn. Enrollment removed entirely.
4. **Txn 1:** S310 — Delete enrollment span (Type: A, Status: I).
5. **MMIS After:** No spans remain.

> **Enrollment Decision Table Reference:**
> Scenario: S220_006 - Enrollment status changed from 'Enrolled' to 'Referral Withdrawn'. Action #1 identifies Span-B. Action #3 sends an Inactivate request to delete Span-B.

---


## Scenario: S220_007_IRIS (S220/S300) - IRIS Enrollment Reinstated (Disenrolled to Enrolled)

1. **MMIS Before:** No MMIS span exists for the Disenrolled period.
2. **BC Before:** Disenrolled span (03/15/25–12/31/2299) in BC only.
3. **BC Change:** User changes enrollment status from Disenrolled to Enrolled. Participant re-activated.
4. **Txn 1:** S300 — Create new enrollment span (Type: O, Status: A, Start Reason: 2L, Stop Reason: not required).
5. **MMIS After:** Span-A Active (03/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S220_007 - Enrollment status changed from 'Disenrolled' to 'Enrolled'. The Disenrolled span exists only in BC — MMIS has no span for this period because the prior enrollment was already closed when the Disenrolled span was originally created. No Span-B identification is needed. Action #2 sends a new enrollment span to MMIS opening at the Disenrolled span begin date with end date 12/31/2299. StartReasonCode = 2L (New Enrollment). StopReasonCode is Not Required (end date is 12/31/2299).

---

## Scenario: S220_008_IRIS (S220/S345) - IRIS Disenrolled Span Created (Real Reason Code Sent)

1. **MMIS Before:** Span-B Active (01/01/25–06/30/25) with 2W/2W placeholder reason (from Example 6/S340).
2. **BC Before:** IRIS enrollment end-dated 06/30/25. No Disenrolled span yet.
3. **BC Change:** User creates a Disenrolled span starting 06/30/25 and selects disenrollment reason (e.g. Deceased).
4. **Txn 1:** S345 — Re-send Closure with real reason codes (Type: C, Status: A, Start Reason: 64, Stop Reason: 64).
5. **MMIS After:** Span-B Active (01/01/25–06/30/25) with real reason code 64 (Deceased).
6. **Note:** IRIS only — SDPC has no stop reason codes. SDPC disenrollment is complete at S340.

> **Enrollment Decision Table Reference:**
> Scenario: S220_008 - New Disenrolled span created in BC (IRIS only). Span-B is the S200-Calculated MMIS Active span with the latest begin date — this is the enrolled span that was end dated before the disenrolled span was created. Action #1 identifies Span-B. Action #8 calls S345 to re-send the Closure with the real translated disenrollment reason codes.

---


## Scenario: S230_001_IRIS (S230/S400/S410/S510) - IRIS Suspense Begin Date Changed to Earlier Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension begin date from 03/01/25 to 02/01/25. Suspension starts earlier.
4. **Txn 1:** S400 — Shorten Span-A end date to 02/01/25 (Type: C, Status: A, Start Reason: 2I, Stop Reason: 2I).
5. **Txn 2:** S410 — Delete existing Span-B (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
6. **Txn 3:** S510 — Create new Span-B with earlier begin 02/02/25 (Type: O, Status: S, Start Reason: 2I, Stop Reason: 2I).
7. **MMIS After:** Span-A Active (01/01/25–02/01/25), Span-B Suspended (02/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_001 - Suspense begin date changed to earlier date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-A is the S200-Calculated MMIS span that immediately precedes Span-B. Action #1 identifies Span-B. Action #2 identifies Span-A. Action #4 deletes existing Span-A from MMIS. Action #5 deletes existing Span-B from MMIS. Action #7 recreates Span-A with original begin date and new end date = (new BC suspension begin date - 1). Action #8 creates a new suspense span with begin date = (new BC suspension begin date [offset: +1 day]) and existing end date. Order is mandatory: S310 first (delete Span-A), S410 second (delete Span-B), S300 third (recreate Span-A), S510 last (create new Span-B). 4 MMIS transactions.

---

## Scenario: S230_001_SDPC (S230/S400/S410/S510) - SDPC Suspense Begin Date Changed to Earlier Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension begin date from 03/01/25 to 02/01/25. Suspension starts earlier.
4. **Txn 1:** S400 — Shorten Span-A end date to 02/01/25 (Type: C, Status: A).
5. **Txn 2:** S410 — Delete existing Span-B (Type: A, Status: I).
6. **Txn 3:** S510 — Create new Span-B with earlier begin 02/02/25 (Type: A, Status: S).
7. **MMIS After:** Span-A Active (01/01/25–02/01/25), Span-B Suspended (02/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_001 - Same logic as IRIS variant above.

---


## Scenario: S230_002_IRIS (S230/S410/S510/S400) - IRIS Suspense Begin Date Changed to Later Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension begin date from 03/01/25 to 04/01/25. Suspension starts later.
4. **Txn 1:** S410 — Delete existing Span-B (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **Txn 2:** S510 — Create new Span-B with later begin 04/02/25 (Type: O, Status: S, Start Reason: 2I, Stop Reason: 2I).
6. **Txn 3:** S400 — Extend Span-A end date to 04/01/25 (Type: O, Status: A, Start Reason: 2I, Stop Reason: 2I).
7. **MMIS After:** Span-A Active (01/01/25–04/01/25), Span-B Suspended (04/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_002 - Suspense begin date changed to later date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-A is the S200-Calculated MMIS span that immediately precedes Span-B. Action #1 identifies Span-B. Action #2 identifies Span-A. Action #5 deletes existing Span-B from MMIS. Action #8 creates a new suspense span with the new later begin date and existing end date. Action #11 extends Span-A end date to backfill the gap. Order: S410 first (delete old Span-B, creates large gap), then S510 (create new Span-B), then S400 (extend Span-A to fill remaining gap). 3 MMIS transactions.

---

## Scenario: S230_002_SDPC (S230/S410/S510/S400) - SDPC Suspense Begin Date Changed to Later Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension begin date from 03/01/25 to 04/01/25. Suspension starts later.
4. **Txn 1:** S410 — Delete existing Span-B (Type: A, Status: I).
5. **Txn 2:** S510 — Create new Span-B with later begin 04/02/25 (Type: A, Status: S).
6. **Txn 3:** S400 — Extend Span-A end date to 04/01/25 (Type: A, Status: A).
7. **MMIS After:** Span-A Active (01/01/25–04/01/25), Span-B Suspended (04/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_002 - Same logic as IRIS variant above.

---


## Scenario: S230_003_IRIS (S230/S440/S310/S520) - IRIS Suspense End Date Changed to Earlier Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension end date from 05/31/25 to 04/15/25. Suspension ends earlier.
4. **Txn 1:** S440 — Shorten Span-B end date to 04/14/25 (Type: C, Status: S, Start Reason: 2Q, Stop Reason: 2W).
5. **Txn 2:** S310 — Delete existing Span-C (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
6. **Txn 3:** S520 — Create new Span-C with begin 04/15/25 (Type: O, Status: A, Start Reason: 2Q, Stop Reason: not required).
7. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–04/14/25), Span-C Active (04/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_003 - Suspense end date changed from a valid date less than 12/31/2299 to an earlier valid date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #3 identifies Span-C. Action #5 deletes existing Span-B. Action #6 deletes existing Span-C. Action #9 recreates Span-B with original begin date and new earlier end date. Action #10 creates a new active enrollment span (Span-C) with begin date = new BC suspension end date and end date from original Span-C. Order: S410 first (delete Span-B), S310 second (delete Span-C), S510 third (recreate Span-B), S520 last (recreate Span-C). 4 MMIS transactions.

---

## Scenario: S230_003_SDPC (S230/S440/S310/S520) - SDPC Suspense End Date Changed to Earlier Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension end date from 05/31/25 to 04/15/25. Suspension ends earlier.
4. **Txn 1:** S440 — Shorten Span-B end date to 04/14/25 (Type: C, Status: S).
5. **Txn 2:** S310 — Delete existing Span-C (Type: A, Status: I).
6. **Txn 3:** S520 — Create new Span-C with begin 04/15/25 (Type: A, Status: A).
7. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–04/14/25), Span-C Active (04/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_003 - Same logic as IRIS variant above.

---


## Scenario: S230_004_IRIS (S230/S310/S445/S520) - IRIS Suspense End Date Changed to Later Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension end date from 05/31/25 to 07/15/25. Suspension extended.
4. **Txn 1:** S310 — Delete existing Span-C (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **Txn 2:** S445 — Extend Span-B end date to 07/14/25 (Type: O, Status: S, Start Reason: 2I, Stop Reason: 2I).
6. **Txn 3:** S520 — Create new Span-C with begin 07/15/25 (Type: O, Status: A, Start Reason: 2Q, Stop Reason: not required).
7. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–07/14/25), Span-C Active (07/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_004 - Suspense end date changed from a valid date to a later valid date. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #3 identifies Span-C. Action #6 deletes existing Span-C. Action #12 extends Span-B end date to the new later BC suspension end date [offset: -1 day]. Action #13 creates a new active enrollment span (Span-C). Order: S310 first (delete old Span-C), then S445 (extend Span-B end date), then S520 (create new Span-C). 3 MMIS transactions.

---

## Scenario: S230_004_SDPC (S230/S310/S445/S520) - SDPC Suspense End Date Changed to Later Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User changes suspension end date from 05/31/25 to 07/15/25. Suspension extended.
4. **Txn 1:** S310 — Delete existing Span-C (Type: A, Status: I).
5. **Txn 2:** S445 — Extend Span-B end date to 07/14/25 (Type: A, Status: S).
6. **Txn 3:** S520 — Create new Span-C with begin 07/15/25 (Type: A, Status: A).
7. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–07/14/25), Span-C Active (07/15/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_004 - Same logic as IRIS variant above.

---


## Scenario: S230_005_IRIS (S230/S410/S470) - IRIS Suspense Deleted

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User deletes the suspension record. Suspension removed entirely.
4. **Txn 1:** S410 — Delete Span-B (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **Txn 2:** S470 — Extend Span-A end date to 05/30/25 (Type: O, Status: A, Start Reason: 2Q, Stop Reason: not required).
6. **MMIS After:** Span-A Active (01/01/25–05/30/25), Span-C Active (05/31/25–12/31/2299). Two contiguous active spans.

> **Enrollment Decision Table Reference:**
> Scenario: S230_005 - Suspense deleted. Span-B is the S200-Calculated MMIS Suspense Span that was deleted (match on pre-update begin date). Span-A immediately precedes Span-B. Span-C immediately succeeds Span-B. Action #1 identifies Span-B. Action #2 identifies Span-A. Action #3 identifies Span-C. Action #14 deletes Span-B. Action #15 updates Span-A with a new later end date to close the gap. Order: S410 first (delete Span-B), then S470 (extend Span-A). 2 MMIS transactions.

---

## Scenario: S230_005_SDPC (S230/S410/S470) - SDPC Suspense Deleted

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User deletes the suspension record. Suspension removed entirely.
4. **Txn 1:** S410 — Delete Span-B (Type: A, Status: I).
5. **Txn 2:** S470 — Extend Span-A end date to 05/30/25 (Type: A, Status: A).
6. **MMIS After:** Span-A Active (01/01/25–05/30/25), Span-C Active (05/31/25–12/31/2299). Two contiguous active spans.

> **Enrollment Decision Table Reference:**
> Scenario: S230_005 - Same logic as IRIS variant above.

---


## Scenario: S230_006_IRIS (S230/S440/S520) - IRIS Suspense End Date Set from Null to Real Date

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–12/31/2299). No Span-C.
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–open/null end date).
3. **BC Change:** User sets suspension end date to 05/31/25. Participant returns from indefinite suspension.
4. **Txn 1:** S440 — Shorten Span-B end date from 12/31/2299 to 05/30/25 (Type: C, Status: S, Start Reason: 2Q, Stop Reason: 2W).
5. **Txn 2:** S520 — Create new Span-C from 05/31/25 (Type: O, Status: A, Start Reason: 2Q, Stop Reason: not required).
6. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S230_006 - Suspense end date changed from null to a valid date. Span-B is the S200-Calculated MMIS Suspense Span with end date 12/31/2299 (no Span-C exists because the suspension previously had no end date). Action #1 identifies Span-B. Action #16 shortens Span-B end date to the new BC suspension end date [offset: -1 day] using existing begin date as anchor (TransactionType C). Action #17 creates a new active enrollment span (Span-C) with begin date = new BC suspension end date and end date = Span-A's original end date. Order: S440 first (shorten Span-B), then S520 (create Span-C). 2 MMIS transactions.

---

## Scenario: S230_007_IRIS (S230/S310/S445) - IRIS Suspense End Date Changed from Real to Null

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25).
3. **BC Change:** User clears suspension end date (sets to null). Participant now indefinitely suspended.
4. **Txn 1:** S310 — Delete existing Span-C (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
5. **Txn 2:** S445 — Extend Span-B end date to 12/31/2299 (Type: O, Status: S, Start Reason: 2I, Stop Reason: 2I).
6. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–12/31/2299). No Span-C — indefinitely suspended.

> **Enrollment Decision Table Reference:**
> Scenario: S230_007 - Suspense end date changed from a valid date to null. Span-B is the S200-Calculated MMIS Suspense Span that was changed (match on pre-update begin date). Span-C is the S200-Calculated MMIS span that immediately succeeds Span-B. Action #1 identifies Span-B. Action #3 identifies Span-C. Action #6 deletes existing Span-C from MMIS. Action #12 extends Span-B end date to 12/31/2299. Order: S310 first (delete Span-C), then S445 (extend Span-B to 12/31/2299). 2 MMIS transactions.

---


## Scenario: S240_001_IRIS (S240/S500/S510/S520) - IRIS New Suspension Added (With End Date)

1. **MMIS Before:** Span-A Active (01/01/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299).
3. **BC Change:** User adds suspension (03/01/25–05/31/25). Single active span splits into three.
4. **Txn 1:** S500 — Shorten Span-A end date to 03/01/25 (Type: C, Status: A, Start Reason: 2I, Stop Reason: 2I).
5. **Txn 2:** S510 — Create suspension span 03/02/25–05/30/25 (Type: O, Status: S, Start Reason: 2I, Stop Reason: 2I).
6. **Txn 3:** S520 — Create post-suspension span 05/31/25–12/31/2299 (Type: O, Status: A, Start Reason: 2Q, Stop Reason: not required).
7. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S240_001 - New suspense record has an end date and meets the 3-day minimum duration. Span-A is the S200-Calculated MMIS Enrollment Span that includes the new BC suspense begin date. Action #1 identifies Span-A. Action #2 closes Span-A by setting its end date to the BC suspense begin date. Action #3 creates a new active enrollment span (Span-C) after the suspension with begin date = BC suspense end date. Action #4 adds the new suspense span (Span-B) with begin date = BC suspense begin date [offset: +1 day] and end date = BC suspension end date [offset: -1 day]. 3 MMIS transactions.

---

## Scenario: S240_001_SDPC (S240/S500/S510/S520) - SDPC New Suspension Added (With End Date)

1. **MMIS Before:** Span-A Active (01/01/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299).
3. **BC Change:** User adds suspension (03/01/25–05/31/25). Single active span splits into three.
4. **Txn 1:** S500 — Shorten Span-A end date to 03/01/25 (Type: C, Status: A).
5. **Txn 2:** S510 — Create suspension span 03/02/25–05/30/25 (Type: A, Status: S).
6. **Txn 3:** S520 — Create post-suspension span 05/31/25–12/31/2299 (Type: A, Status: A).
7. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–05/30/25), Span-C Active (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S240_001 - Same logic as IRIS variant above.

---


## Scenario: S240_002_IRIS (S240/S500/S510) - IRIS New Suspension Added (No End Date)

1. **MMIS Before:** Span-A Active (01/01/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299).
3. **BC Change:** User adds suspension with begin date 03/01/25 and no end date. Indefinite suspension.
4. **Txn 1:** S500 — Shorten Span-A end date to 03/01/25 (Type: C, Status: A, Start Reason: 2I, Stop Reason: 2I).
5. **Txn 2:** S510 — Create open-ended suspension span 03/02/25–12/31/2299 (Type: O, Status: S, Start Reason: 2I, Stop Reason: 2I).
6. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–12/31/2299). No Span-C.

> **Enrollment Decision Table Reference:**
> Scenario: S240_002 - New suspense record does not have an end date and meets the 3-day minimum duration check (open-ended suspensions are always valid because there is no end date to calculate against — only the begin-date +1 offset applies). Span-A is the S200-Calculated MMIS Enrollment Span that includes the new BC suspense begin date. Action #1 identifies Span-A. Action #2 closes Span-A by setting its end date to the BC suspense begin date. Action #4 adds the new suspense span (Span-B) with end date 12/31/2299 (BC null suspension end date is sent to MMIS as 12/31/2299). No Span-C is created because there is no suspension end date — the participant is indefinitely suspended in MMIS. 2 MMIS transactions.

---

## Scenario: S240_002_SDPC (S240/S500/S510) - SDPC New Suspension Added (No End Date)

1. **MMIS Before:** Span-A Active (01/01/25–12/31/2299).
2. **BC Before:** SDPC enrollment (01/01/25–12/31/2299).
3. **BC Change:** User adds suspension with begin date 03/01/25 and no end date. Indefinite suspension.
4. **Txn 1:** S500 — Shorten Span-A end date to 03/01/25 (Type: C, Status: A).
5. **Txn 2:** S510 — Create open-ended suspension span 03/02/25–12/31/2299 (Type: A, Status: S).
6. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended (03/02/25–12/31/2299). No Span-C.

> **Enrollment Decision Table Reference:**
> Scenario: S240_002 - Same logic as IRIS variant above.

---


## Scenario: S250_001_IRIS (S250/S600/S255/S610) - IRIS ICA Change (Current Span Active)

1. **MMIS Before:** Span-B Active (01/01/25–12/31/2299) with ICA-001, FEA-001.
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), ICA assignment ICA-001.
3. **BC Change:** User assigns new ICA-002 effective 04/01/25. FEA-001 unchanged. Active span splits at ICA boundary.
4. **Txn 1:** S600 — Close span with old ICA to 03/31/25 (Type: C, Status: A, Start Reason: 2P, Stop Reason: 2P).
5. **Txn 2:** S610 — Create new span with ICA-002 from 04/01/25 (Type: O, Status: A, Start Reason: 2P, Stop Reason: not required).
6. **MMIS After:** Span-B Active ICA-001 (01/01/25–03/31/25), Span-C Active ICA-002 (04/01/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S250_001 - Span-B is Active. Span-B is the S200-Calculated MMIS span that contains the agency change effective date. Action #1 identifies Span-B. Action #2 closes Span-B at (effective date - 1) with old agency. Action #3 iterates S200-Calculated spans from the effective date onward, calling S255 for each. Typically this produces one S255 call for a single active span.

---

## Scenario: S250_002_IRIS (S250/S600/S255/S620/S310/S610) - IRIS FEA Change (Current Span Suspended)

1. **MMIS Before:** Span-A Active (01/01/25–03/01/25), Span-B Suspended FEA-001 (03/02/25–05/30/25), Span-C Active FEA-001 (05/31/25–12/31/2299).
2. **BC Before:** IRIS enrollment (01/01/25–12/31/2299), suspension (03/01/25–05/31/25), FEA assignment FEA-001.
3. **BC Change:** User assigns new FEA-002 effective 05/01/25. ICA-001 unchanged. Suspended span splits at FEA boundary.
4. **Txn 1:** S600 — Close suspended span with old FEA to 04/30/25 (Type: C, Status: S, Start Reason: 2R, Stop Reason: 2W).
5. **Txn 2:** S620 — Create new suspended span with FEA-002 from 05/01/25–05/30/25 (Type: O, Status: S, Start Reason: 2R, Stop Reason: 2R).
6. **Txn 3:** S310 — Delete old Span-C with FEA-001 (Type: O, Status: I, Start Reason: 2L, Stop Reason: 2W).
7. **Txn 4:** S610 — Create new Span-D Active with FEA-002 from 05/31/25 (Type: O, Status: A, Start Reason: 2R, Stop Reason: not required).
8. **MMIS After:** Span-A Active (01/01/25–03/01/25), Span-B Suspended FEA-001 (03/02/25–04/30/25), Span-C Suspended FEA-002 (05/01/25–05/30/25), Span-D Active FEA-002 (05/31/25–12/31/2299).

> **Enrollment Decision Table Reference:**
> Scenario: S250_002 - Span-B is Suspended. Span-B is the S200-Calculated MMIS span that contains the agency change effective date. Action #1 identifies Span-B. Action #2 closes Span-B at (effective date - 1) with old agency. Action #3 iterates S200-Calculated spans from the effective date onward, calling S255 for each. This typically produces two S255 calls: first for the new suspended span, then for the post-suspension active span (if S200 calculated one).

---
