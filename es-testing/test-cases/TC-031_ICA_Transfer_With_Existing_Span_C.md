# TC-031: ICA Transfer — Active Span-C Exists in MMIS (S255 Condition 1)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-031 |
| Scenario | ICA Transfer after suspension synced — old Span-C exists in MMIS, must be deleted before recreating with new agency |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 6) → S200 → S250 (Condition 1) → S600 + S255 (Condition 1) → S310 + S610 |
| Business Rules | BR-D01-002, BR-D01-020, BR-D01-021, BR-D01-022 |
| Trigger | User transfers participant to a new ICA; participant previously had a bounded suspension synced to MMIS, so Span-C (post-suspension active span) exists in MMIS with old agency |
| Transaction Count | 3 MMIS transactions (S600: Close Span-C with old agency, S310: Delete old Span-C, S610: Create new Span-C with new agency) |
| Transaction Ordering | S600 (close current span at eff date - 1) → S310 (delete old Span-C) → S610 (create new active span) |
| Priority | High |
| Expected Outcome | Success (SU) |

---

## Purpose — Why This Test Exists

This test exercises **S255 Condition 1** — the only S255 path not covered by TC-003, TC-016, or TC-017.

S255 has 4 conditions:

| Condition | Status | Old Span Exists | Action | Covered By |
|-----------|--------|----------------|--------|------------|
| 1 | Active | Yes | S310 (delete) + S610 (create) | **THIS TEST (TC-031)** |
| 2 | Active | No | S610 (create only) | TC-003, TC-016, TC-017 |
| 3 | Suspended | Yes | S310 (delete) + S620 (create) | TC-017 |
| 4 | Suspended | No | S620 (create only) | TC-017 |

**Condition 1 fires when:** An ICA/FEA transfer occurs while the participant has an existing **post-suspension Active span (Span-C)** already synced to MMIS with the old agency's IDs. S255 must delete that old Span-C via S310 before creating the replacement with S610.

---

## Preconditions

1. Participant is currently Enrolled in IRIS with successful prior syncs
2. A **bounded suspension was previously added and synced** (TC-002 executed successfully) — producing 3 MMIS spans:
   - Span-A: Active, enrollment begin → suspension begin (closed)
   - Span-B: Suspended, suspension begin+1 → suspension end-1 (closed)
   - **Span-C: Active, suspension end → enrollment end (22991231) — exists in MMIS with OLD agency**
3. The suspension has ended (current date is after suspension end) — participant is currently in Span-C
4. User transfers participant to new ICA "Agency B" (Medicaid Provider ID = "9876543210")
5. Agency change effective date falls **within Span-C** (after suspension end, before enrollment end)
6. The key difference from TC-003: **Span-C already exists in MMIS** with old agency IDs, so S255 must route to Condition 1 (delete + recreate) rather than Condition 2 (create only)

---

## Database Setup (Pre-Execution State)

> **Prerequisites: TC-001 AND TC-002 must have been executed successfully.** The participant must have an active IRIS enrollment with a bounded suspension already synced, producing a Span-C in MMIS with old agency IDs.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK — used as FK throughout |
| `NameLastName` | e.g., "TESTLAST" | Maps to NameLast |
| `NameFirstName` | e.g., "TESTFIRST" | Maps to NameFirst |
| `BirthDate` | e.g., 1985-03-15 | Maps to DateBirth (CCYYMMDD) |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | Translated to M/F/U |

### 2. Existing Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | From TC-001 |
| `ProgramKey` | {IRIS Program GUID} | FK to Program |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | Enrollment begin |
| `EnrollmentDateRangeEndDate` | NULL | Sent as "22991231" |
| `StatusDisplayName` | "Enrolled" | Active enrollment |

### 3. Existing Suspension (bounded, synced) — From TC-002

| Column | Required Value | Notes |
|--------|----------------|-------|
| Suspension begin date | e.g., 2026-08-14 | Must be in the past |
| Suspension end date | e.g., 2026-09-14 | Must be in the past (suspension ended) |
| Synced to MMIS | Yes (SU response for all 3 spans) | TC-002 postcondition |

### 4. Existing MMIS Sync State (3 spans synced)

The following spans exist in MMIS after TC-002 execution:

| Span | Status | MMIS Begin | MMIS End | ICA | Synced? |
|------|--------|------------|----------|-----|---------|
| Span-A | Active (closed) | 2026-07-01 | 2026-08-14 | Agency A ("1234567890") | ✅ |
| Span-B | Suspended (closed) | 2026-08-15 | 2026-09-13 | Agency A ("1234567890") | ✅ |
| **Span-C** | **Active** | **2026-09-14** | **2299-12-31** | **Agency A ("1234567890")** | **✅ — THIS IS THE KEY** |

### 5. Current (Old) ICA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {OLD ICA Location GUID — Agency A} | Currently active |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | |
| `EffectiveDateRangeStartDate` | On or before enrollment begin | |
| `EffectiveDateRangeEndDate` | NULL (currently active) | Will be end-dated by transfer |

#### Old ICA Medicaid Provider ID

| Column | Required Value |
|--------|----------------|
| `Value` | **"1234567890"** |

### 6. New ICA Assignment (created by user action)

| Column | Required Value | Notes |
|--------|----------------|-------|
| `LocationKey` | {NEW ICA Location GUID — Agency B} | New agency |
| `PersonLocationAssignmentTypeDisplayName` | "ICA" | |
| `EffectiveDateRangeStartDate` | e.g., 2026-10-01 | Agency change effective date — WITHIN Span-C |
| `EffectiveDateRangeEndDate` | NULL | New active assignment |

#### New ICA Medicaid Provider ID

| Column | Required Value |
|--------|----------------|
| `Value` | **"9876543210"** |

### 7. FEA Assignment — `PersonModule.PersonLocationAssignment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonLocationAssignmentTypeDisplayName` | "FEA" | |
| `EffectiveDateRangeStartDate` | Same as enrollment begin | Must span enrollment period |
| `EffectiveDateRangeEndDate` | NULL | Active |

### 8. Pre-Execution Verification Query

```sql
-- Verify 3 sync transactions exist from TC-001 + TC-002
SELECT st.TransactionTypeCode, st.MmisEffectiveDate, st.MmisEndDate, st.ResponseStatusCode
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
ORDER BY st.Timestamp
-- Expected: At least 4 rows (TC-001 initial + TC-002's 3 spans), all with SU

-- Verify Span-C exists in MMIS (most recent active span)
-- The last SyncTransaction with TransactionTypeCode='O' and active status
-- should have MmisEffectiveDate = suspension end date and MmisEndDate = 2299-12-31

-- Verify current date is within Span-C date range
-- (participant is currently in the post-suspension active span)
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 6 (ICA assignment updated):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #6: Call S250_Location_Assignment_Update
2. **S200** — Scenario S200_003 (Enrollment with agency changes + existing suspension):
   - S200 calculates spans with the new agency from the effective date onward
   - Pre-change Span-C is split at agency change effective date
3. **S250** — Condition 1 (Span-B = current span is Active):
   - Action #1: Identify Span-B (current Span-C that contains the agency change date)
   - Action #2: Call S600 (Close current Span-C with end date = eff date - 1)
   - Action #3: Call S255 for each S200-calculated span from eff date onward
4. **S600** — Condition 1 (Active span):
   - Closes existing Span-C with old agency, TransactionType = C
5. **S255** — **Condition 1** (Active span, old-agency span EXISTS in MMIS):
   - **This is the key difference from TC-003** — Span-C was already sent to MMIS by TC-002 with old agency
   - Action #1: Call S310 to delete old Span-C (exact begin/end date match with Status=I)
   - Action #2: Call S610 to create new active span with new agency
6. **S610** — Creates new active enrollment span with new ICA/FEA

> **Note:** The question is whether S600 (which shortens the span) eliminates the need for S310. If S600's closure effectively "replaces" the old Span-C in MMIS such that no separate deletion is needed, then S255 would route to Condition 2 instead. This test will empirically determine which path Blue Compass takes.

---

## Request Payload Verification

### Transaction 1: Close Current Span (S600)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverProgramName | WaiverProgramName | "IRIS" | |
| WaiverAgencyID | WaiverAgencyID | "1234567890" | Old agency |
| TransactionType | TransactionType | "C" (Closure) | Shortening end date |
| DateEnrlEff | DateEnrlEff | Span-C begin date (2026-09-14 → "20260914") | Anchor |
| DateEnrlEnd | DateEnrlEnd | Agency change eff date - 1 (e.g., "20260930") | Shortened |
| Status | Status | "A" | Active span closure |
| StartReasonCode | StartReasonCode | "2P" (ICA Transfer) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | "2P" (ICA Transfer) | Per BR-D01-022 |
| FEAStatus | FEAStatus | "A" | Always A on closure |

### Transaction 2: Delete Old Span-C (S310) — IF S255 Condition 1 fires

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverAgencyID | WaiverAgencyID | "1234567890" | Old agency |
| TransactionType | TransactionType | "O" (Open) | Per BR-D01-021 — delete uses O with Status=I |
| DateEnrlEff | DateEnrlEff | Old Span-C begin date ("20260914") | Exact match |
| DateEnrlEnd | DateEnrlEnd | Old Span-C end date ("22991231") | Exact match |
| Status | Status | "I" (Inactivate) | Delete span |
| StartReasonCode | StartReasonCode | "2P" (ICA Transfer) | Caller-determined |
| StopReasonCode | StopReasonCode | "2W" (Reason Not Provided) | Per S310 actions |

### Transaction 3: Create New Active Span (S610)

| Field | JSON Element | Expected Value | Notes |
|-------|-------------|----------------|-------|
| WaiverAgencyID | WaiverAgencyID | "9876543210" | New agency |
| TransactionType | TransactionType | "O" (Open) | New span |
| DateEnrlEff | DateEnrlEff | Agency change eff date (e.g., "20261001") | New span begins |
| DateEnrlEnd | DateEnrlEnd | "22991231" | Inherited enrollment end |
| Status | Status | "A" (Active) | |
| StartReasonCode | StartReasonCode | "2P" (ICA Transfer) | Per BR-D01-022 |
| StopReasonCode | StopReasonCode | Not Required | End date is 22991231 |
| FEAStatus | FEAStatus | "A" | Active |

> **Alternative (if S255 routes to Condition 2 instead):** Transaction 2 (S310) would be absent, and only 2 transactions total would be sent (S600 + S610). The test execution will determine the actual behavior.

---

## Expected MMIS Response

| Transaction | ResponseStatus | Verification |
|-------------|---------------|--------------|
| Transaction 1 (S600 Close) | "SU" | Span-C shortened to eff date - 1 |
| Transaction 2 (S310 Delete) | "SU" | Old Span-C inactivated |
| Transaction 3 (S610 Create) | "SU" | New span created with new agency |

---

## Database Verification (Post-Execution State)

### 1. `CustomerProgramEnrollmentModule.SyncTransaction`

```sql
SELECT st.TransactionTypeCode, st.MmisEffectiveDate, st.MmisEndDate, st.ResponseStatusCode
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
ORDER BY st.Timestamp DESC
```

Expected: **3 new rows** (or 2 if S255 routes to Condition 2)

| Row | TransactionType | Status | MmisEffectiveDate | MmisEndDate | WaiverAgencyID |
|-----|----------------|--------|-------------------|-------------|----------------|
| S600 | C | A | Span-C begin | eff date - 1 | "1234567890" (old) |
| S310 | O | I | Span-C begin | 22991231 | "1234567890" (old) |
| S610 | O | A | eff date | 22991231 | "9876543210" (new) |

### 2. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages`

| Expected Result | Notes |
|-----------------|-------|
| **No rows returned** | All transactions successful |

### 3. `ProgramEnrollmentModule.ProgramEnrollment` (status unchanged)

| Column | Expected Value |
|--------|----------------|
| `StatusDisplayName` | "Enrolled" |

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Conflict Status chip | Not displayed |
| Last Sync timestamp | Updated |
| Response Status display | "SU" |
| MMIS Errors table | Empty |

---

## Pass Criteria

1. All transactions sent in correct order with expected field values
2. MMIS responds with "SU" for each transaction
3. Old Span-C is either deleted (S310) or effectively replaced by S600's closure
4. New active span exists in MMIS with new agency IDs from the agency change effective date
5. No error messages stored
6. Enrollment remains "Enrolled"

---

## Failure Criteria

- S310 returns FL (old span not found) — may indicate S600 already handled it
- S610 returns FL with error 9127 (overlapping enrollment) — old span not properly removed
- WaiverAgencyID mismatch in any transaction
- Transaction ordering incorrect (MMIS rejects overlap)

---

## Related Test Cases

- TC-001: New IRIS Enrollment (prerequisite)
- TC-002: Enrolled → Suspended (prerequisite — creates the Span-C in MMIS)
- TC-003: ICA Transfer — Active, no prior suspension (exercises S255 Condition 2)
- TC-016: FEA Transfer — same pattern as TC-003 (S255 Condition 2)
- TC-017: ICA Transfer During Suspension (exercises S255 Conditions 3/4)
