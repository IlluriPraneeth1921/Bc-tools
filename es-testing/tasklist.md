# Task List — ES Testing Automation

## TODO

### Automate Carity Database Cleanup (Pre-Test)

**Priority:** High  
**Context:** Currently, Carity's `ProgramEnrollment` table must be manually cleaned before running TC-001 from scratch. The MMIS side is handled by the TC-008 Referral Withdrawn flow (automated), but the Carity side still requires human intervention.

**Current manual steps:**
1. Run SQL scripts to delete enrollment records from Carity (see `scripts/cleanup-enrollment-data.sql`)
2. Tables to clean:
   - `ProgramEnrollmentModule.ProgramEnrollment` — delete the participant's IRIS enrollment row
   - `CustomerProgramEnrollmentModule.ProgramEnrollmentExtension` — delete extension record
   - `CustomerProgramEnrollmentModule.SyncTransaction` — delete sync history
   - `CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages` — delete error messages

**Goal:** Create an automated step (either a Playwright helper that calls a DB cleanup API, or a pre-test script that connects to the Carity database directly) to reset the Carity-side enrollment data before TC-001 runs.

**Constraints:**
- Only clean up after MMIS state has been reset (TC-008 Referral Withdrawn must succeed first)
- Must be safe to run idempotently (no-op if data already clean)
- Should be scoped to the test participant only (PersonKey = `c7a3862e-f166-466d-a5fb-b4670130aebd`)

---

## DONE

- [x] TC-001 checks MMIS Snapshot before starting (waiver enrollment state)
- [x] TC-001 uses TC-008 (Referral Withdrawn) to reset MMIS if not pristine
- [x] Created reusable `mmis-snapshot.ts` helper for checking MMIS waiver state
- [x] Created reusable `reset-enrollment.ts` helper (TC-008 pattern) for resetting via withdrawal
- [x] Updated participant name from "TWO TESTFEI" to "THREE TESTFEI"
- [x] Updated `.env` with person name fields
