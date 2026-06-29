# TC-032: Address Update — No Current MMIS Span (S700 Condition 2 — No Transaction)

## Test Case Metadata

| Attribute | Value |
|-----------|-------|
| Test Case ID | TC-032 |
| Scenario | Address Update when participant is disenrolled — no MMIS transaction sent |
| Test Participant MA ID | **1430000012** |
| Program Type | IRIS |
| Decision Table | S100 (Condition 11) → S200 → S700 (Condition 2) |
| Business Rules | BR-D01-003, BR-D01-005, BR-D01-023 |
| Trigger | User updates participant's residential address while participant is disenrolled |
| Transaction Count | 0 — No MMIS transaction sent |
| Transaction Ordering | N/A |
| Priority | Medium |
| Expected Outcome | No MMIS transaction — S700 Condition 2 path (no current span) |

---

## Purpose — Why This Test Exists

This test exercises **S700 Condition 2** — the negative path where no MMIS transaction
is fired because the participant has no active MMIS span covering the current date.

S700 has 2 conditions:

| Condition | Current Span Exists? | Action | Covered By |
|-----------|---------------------|--------|------------|
| 1 | Yes (span includes today) | Send address update transaction | TC-014 |
| 2 | No (participant disenrolled) | No transaction sent | **THIS TEST (TC-032)** |

Per the decision table: "No current span. The S200-calculated span list contains no span whose date range includes the current date — the participant is disenrolled or has no active MMIS enrollment as of today. No MMIS transaction is sent."

---

## Preconditions

1. Participant was previously Enrolled in IRIS and synced to MMIS (TC-001 executed)
2. Participant was subsequently **disenrolled** (TC-006 executed — end date set to earlier date, enrollment closed)
3. Current date is **after** the enrollment end date — no S200-calculated span includes today
4. No active enrollment exists in MMIS that covers the current date
5. User updates the participant's residential address in Blue Compass

---

## Database Setup (Pre-Execution State)

> **Prerequisites: TC-001 AND TC-006 must have been executed successfully.** The participant must have been enrolled and then disenrolled. Their MMIS enrollment span ends before today.

### 1. Person Demographics — `PersonModule.Person`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `PersonKey` | {test participant GUID} | PK |
| `NameLastName` | e.g., "TESTLAST" | |
| `NameFirstName` | e.g., "TESTFIRST" | |
| `BirthDate` | e.g., 1985-03-15 | |
| `BirthAssignedGenderDisplayName` | "Male", "Female", or "Unknown" | |

### 2. Enrollment — `ProgramEnrollmentModule.ProgramEnrollment`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ProgramEnrollmentKey` | {existing enrollment GUID} | From TC-001 |
| `ProgramKey` | {IRIS Program GUID} | |
| `EnrollmentDateRangeStartDate` | e.g., 2026-07-01 | |
| `EnrollmentDateRangeEndDate` | **e.g., 2026-08-31** | **Must be in the past** (disenrollment end date from TC-006) |
| `StatusDisplayName` | "Disenrolled" or "Enrolled" (span closed) | Post-TC-006 state |

### 3. Existing Sync State — `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension`

| Column | Required Value | Notes |
|--------|----------------|-------|
| `ResponseStatusCode` | "SU" | Prior successful syncs exist |
| `MmisEffectiveDate` | Enrollment begin | |
| `MmisEndDate` | **2026-08-31** (in the past) | Enrollment was closed via TC-006 |
| `TransactionTypeCode` | "C" | Closure transaction from TC-006 |

### 4. Updated Residential Address — `PersonModule.PersonAddress`

The user updates the address **before** test execution (this is the triggering event):

| Column | Updated Value | Notes |
|--------|--------------|-------|
| `AddressTypeDisplayName` | "Residential" | |
| `IsActive` | true | |
| `IsPrimary` | true | |
| `PhysicalAddressFirstStreetAddress` | **"999 NEW STREET"** | Changed from previous value |
| `PhysicalAddressCityName` | **"MILWAUKEE"** | Changed from previous value |
| `PhysicalAddressStateProvinceDisplayName` | "Wisconsin" | |
| `PhysicalAddressPostalCode` | "532011234" | |
| `PhysicalAddressCountyAreaDisplayName` | "Milwaukee" | |

### 5. Pre-Execution Verification

```sql
-- Verify enrollment end date is in the past (participant is disenrolled)
SELECT EnrollmentDateRangeEndDate, StatusDisplayName
FROM ProgramEnrollmentModule.ProgramEnrollment
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
-- Expected: EndDate < GETDATE(), Status indicates disenrolled/closed

-- Verify no S200-calculated span includes today
-- (conceptually: enrollment end < current date, no open-ended span exists)

-- Capture current SyncTransaction count for later comparison
SELECT COUNT(*) AS PreTestTxnCount
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

---

## Processing Flow (Decision Table Path)

1. **S100** — Condition 11 (Address updated, IRIS only):
   - Action #1: Call S200_Calculate_MMIS_IRIS_Spans
   - Action #7: Call S700_Address_Only_Update
2. **S200** — Calculates MMIS spans:
   - Enrollment span: 2026-07-01 → 2026-08-31 (past)
   - No calculated span includes the current date
3. **S700** — **Condition 2** (No current span exists):
   - S200-calculated span list contains NO span whose date range includes today
   - **No MMIS transaction is sent**
   - Return to calling step

---

## Request Payload Verification

**No request payload is generated.** S700 Condition 2 explicitly states: "No MMIS transaction is sent. Return to calling step."

---

## Expected Outcome

| Item | Expected |
|------|----------|
| MMIS Transaction Sent | **NONE** |
| SyncTransaction rows added | **0** (count unchanged from pre-execution) |
| ProgramEnrollmentExtension updated | **No change** (LastSynchronizedTimestamp unchanged) |
| Error messages | **None** |
| Address in database | Updated (new address saved normally) |

---

## Database Verification (Post-Execution State)

### 1. `CustomerProgramEnrollmentModule.SyncTransaction` — No new rows

```sql
SELECT COUNT(*) AS PostTestTxnCount
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
WHERE pee.ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Verification | Expected |
|--------------|----------|
| PostTestTxnCount | Same as PreTestTxnCount (no new transactions) |

### 2. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` — Unchanged

```sql
SELECT LastSynchronizedTimestamp, ResponseStatusCode
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension
WHERE ProgramEnrollmentKey = '{ProgramEnrollmentKey}'
```

| Column | Expected Value |
|--------|----------------|
| `LastSynchronizedTimestamp` | **Same as before test execution** (not updated) |
| `ResponseStatusCode` | Previous value (from TC-006) — unchanged |

### 3. `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` — No new messages

| Expected Result | Notes |
|-----------------|-------|
| No new rows added | No transaction = no response = no messages |

### 4. `PersonModule.PersonAddress` — Address IS updated in DB

```sql
SELECT PhysicalAddressFirstStreetAddress, PhysicalAddressCityName
FROM PersonModule.PersonAddress
WHERE PersonKey = '{PersonKey}' AND AddressTypeDisplayName = 'Residential'
  AND IsActive = 1 AND IsPrimary = 1
```

| Column | Expected Value |
|--------|----------------|
| `PhysicalAddressFirstStreetAddress` | "999 NEW STREET" (updated) |
| `PhysicalAddressCityName` | "MILWAUKEE" (updated) |

> **Important:** The address IS saved in Carity — it just doesn't trigger an MMIS transaction because there's no current span to update.

---

## UI Verification (Post-Execution)

| Element | Expected State |
|---------|----------------|
| Address saved in UI | Updated to new address |
| Last Sync timestamp | **NOT updated** (no sync occurred) |
| MMIS Errors table | No new errors |
| No "transaction sent" notification | Correct — no transaction was triggered |

---

## Pass Criteria

1. The address update is saved successfully in the Carity database
2. **No MMIS transaction is sent** (zero new SyncTransaction rows)
3. ProgramEnrollmentExtension.LastSynchronizedTimestamp remains unchanged
4. No error messages are displayed to the user
5. The system correctly identifies that no S200-calculated span includes today

---

## Failure Criteria

- A SyncTransaction row IS created (system incorrectly sent a transaction)
- MMIS returns any response (no call should have been made)
- Error displayed to user about address sync failure
- LastSynchronizedTimestamp changes (indicating a sync attempt)
- System throws an exception when processing the address change

---

## Related Test Cases

- TC-001: New IRIS Enrollment (prerequisite — enrollment must exist)
- TC-006: End Date → Earlier / Disenrollment (prerequisite — closes the enrollment)
- TC-014: Address-Only Update (positive path — S700 Condition 1, span exists, transaction sent)
