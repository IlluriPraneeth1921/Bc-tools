# Interface Testing Pain Points — Meeting Talking Points

**Date:** June 18, 2026  
**Goal:** Acknowledge pain points, propose immediate wins within current system, and connect to future vision.

---

## Pain Point #1: Multiple Field Scenarios (Multiple Data Elements)

**The Problem:** QAs manually log into QC and check every field on the mapping to verify it handles multiple data elements (multiple emails, Medicaid IDs, etc.).

**Quick Win (Now):**
- Create a **validation stored procedure** that checks all multi-value fields in a single pass
- Output: a results table showing field name, expected count, actual count, pass/fail
- QA runs one query after the interface completes instead of clicking through QC field-by-field

**Example approach:**
```sql
-- One proc that validates all multi-value fields post-import
EXEC dbo.ValidateMultiFieldScenarios @InterfaceName = 'CostShare', @RunID = @LastRunID
-- Returns: FieldName | Expected | Actual | Status
```

**Future State:** Validation rules defined as code (Great Expectations / dbt tests), run automatically as part of the pipeline. No manual checking.

---

## Pain Point #2: Data-Based Scenarios

**The Problem:** Amazon Q generates base scenarios, but QAs must manually think up and create specific edge cases.

**Quick Win (Now):**
- Build a **scenario library** — a shared table or spreadsheet of reusable test scenarios per interface, tagged by category (boundary, null, special chars, multi-value, etc.)
- Each scenario includes: input file row(s), expected outcome, and the validation query
- New interfaces start from the library instead of from scratch

**Future State:** Test scenarios are versioned Parquet fixture files in source control. Adding a scenario = adding a row to a file. CI runs them all automatically on every change.

---

## Pain Point #3: Data Length Check (Outbound)

**The Problem:** QAs test each field individually, run prerequisite data, check length, then clean up the DB. One field per run.

**Quick Win (Now):**
- **Batch all length checks into one test run.** Create a single test file with one row that has max-length values in ALL fields simultaneously
- Write one validation query that checks all field lengths in a single pass:

```sql
-- Validate all field lengths in one shot
SELECT 
    ColumnName,
    MaxAllowedLength,
    ActualMaxLength,
    CASE WHEN ActualMaxLength > MaxAllowedLength THEN 'FAIL' ELSE 'PASS' END AS Status
FROM dbo.InterfaceFieldLengthCheck(@InterfaceName)
```

- **One run, one cleanup** instead of N runs and N cleanups

**Future State:** Schema enforcement at ingestion (Iceberg schema evolution + Pydantic validation). Oversized data is caught and routed to a dead-letter queue before it ever hits a table.

---

## Pain Point #4: Required Fields

**The Problem:** Same as #3 — test each required field individually (by omitting it), run, validate, cleanup, repeat.

**Quick Win (Now):**
- Generate **N test files programmatically** (one per required field with that field nulled/missing), then run them all in a batch
- Or: use a single test file with ALL required fields missing, and validate that the error report catches every one
- Automate the cleanup with a single **reset script** that restores the DB to baseline state

```powershell
# Generate all required-field test files at once
foreach ($field in $requiredFields) {
    New-TestFile -Interface $interfaceName -NullField $field -OutputPath "$testDir\missing_$field.csv"
}
# Run batch, then single cleanup
```

**Future State:** Schema validation is declarative (nullable/not-null defined in Iceberg schema). The pipeline rejects bad records and logs them — no manual test cycle needed.

---

## Pain Point #5: Data Type Validation

**The Problem:** Running queries manually to check datatypes of all fields.

**Quick Win (Now):**
- This should be a **one-time automated check** — a stored proc or script that compares the staging table schema against the interface mapping spec:

```sql
-- Compare actual schema vs expected spec
SELECT 
    spec.FieldName,
    spec.ExpectedType,
    col.DATA_TYPE AS ActualType,
    CASE WHEN spec.ExpectedType != col.DATA_TYPE THEN 'MISMATCH' ELSE 'OK' END AS Status
FROM dbo.InterfaceSpec spec
JOIN INFORMATION_SCHEMA.COLUMNS col 
    ON col.TABLE_NAME = spec.StagingTable AND col.COLUMN_NAME = spec.FieldName
WHERE spec.InterfaceName = @InterfaceName
```

- Run once after table creation or schema change. Not per test cycle.

**Future State:** Schema drift detection is automated (we already have a design for this — see `schema-drift-detection-options.md`). Schema changes are caught at ingestion time.

---

## Pain Point #6: Synchronization (5-10 min waits)

**The Problem:** Interface action takes 5-10 min to commit, then data sync jobs take another 5-10 min. All serial. QAs sit and wait.

**Quick Win (Now):**
- Add a **completion polling script** — instead of QAs watching and guessing, a PowerShell script that polls for completion and notifies (or kicks off the next step):

```powershell
# Poll until interface completes, then trigger sync
while (-not (Test-InterfaceComplete -RunID $runID)) {
    Start-Sleep -Seconds 30
}
Write-Host "Interface complete. Starting sync..."
Start-DataSyncJobs -Interface $interfaceName
# Poll sync completion
while (-not (Test-SyncComplete -RunID $runID)) {
    Start-Sleep -Seconds 30
}
Write-Host "Ready for validation."
```

- QAs can work on other things instead of watching the screen
- Even better: **chain the steps in JAMS** so interface → sync → validation notification is one triggered workflow

**Future State:** Airflow DAG handles all orchestration with sensors and task dependencies. "Wait for completion" is built into the pipeline definition. No manual polling.

---

## Pain Point #7: Test Evidence

**The Problem:** Screenshots of DB, UI, JAMS jobs after every test run. Can only capture after all bugs resolved. Very manual.

**Quick Win (Now):**
- Replace screenshots with **automated evidence scripts** that produce output files:
  - DB state → query results exported to HTML or CSV
  - JAMS job status → pull from JAMS API/logs into a summary file
  - UI state → if truly needed, use a simple Selenium/Playwright script for the critical screens
- Package all evidence into a dated folder per test run automatically

```powershell
# Auto-generate test evidence package
$evidencePath = "\\share\TestEvidence\$interfaceName\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Export-QueryResults -Query $validationQuery -OutputPath "$evidencePath\db_state.html"
Export-JAMSStatus -JobName $jamsJob -OutputPath "$evidencePath\jams_status.html"
```

- Evidence is consistent, reproducible, and doesn't require "clean runs" for screenshots

**Future State:** Pipeline observability is built in — every run produces lineage, data quality reports, and audit logs automatically. Evidence = pipeline metadata.

---

## Summary Slide / Closing

| Pain Point | Root Cause | Quick Win | Effort |
|---|---|---|---|
| Multi-field validation | Manual UI checking | Batch validation proc | 1-2 days |
| Data scenarios | No reusable library | Scenario library/templates | 2-3 days |
| Data length checks | One-field-per-run | Batch length validation | 1 day |
| Required fields | One-field-per-run + cleanup | Programmatic test file generation + reset script | 2 days |
| Data type checks | Manual queries | Schema comparison proc | 1 day |
| Synchronization waits | No automation of wait/notify | Polling script or JAMS chaining | 1-2 days |
| Test evidence | Manual screenshots | Automated evidence export scripts | 2-3 days |

**Total estimated effort for quick wins: ~2 weeks of focused work**

---

## Key Message

> "We don't have to live with this pain. The quick wins give us immediate relief within our current system. The modern platform we're building eliminates these problems by design — validation is code, orchestration is automated, and evidence is a byproduct of the pipeline, not a separate manual process. Every hour we invest in the quick wins teaches us patterns we'll carry forward."

---

## Offer to the Team

- I can help build the batch validation procs and reset scripts
- I can help design the scenario library structure
- I can pair with someone on the evidence automation
- These quick wins also serve as a bridge — they demonstrate the patterns the modern platform will formalize

---

## Discovery Questions — Understanding Current Workflows

> **Goal for this meeting:** Listen and gather information about how the team currently approaches this work so we can shape future training around their real workflows.

### On Their Current Process

- How much of the setup/teardown is scripted vs. done manually in SSMS or QC?
- When you "clean up the DB after each run" — is that a standard reset script, or are you writing ad-hoc DELETE/UPDATE statements each time?
- Are the interface mappings documented somewhere centralized, or does each QA reference their own copy?
- When a test fails, how do you track it? (spreadsheet, email, Jira, just re-run later?)
- How do you know when an interface run is "done"? Are you watching a screen, checking a log, or polling a table?

### On Their Skills and Tooling

- Are you writing PowerShell, SQL, or both to do this work?
- Do you have any shared scripts or utilities across the team, or is everyone rolling their own?
- How comfortable are you with source control (checking scripts into a repo vs. saving to a shared drive)?
- What tools do you use day-to-day beyond SSMS and QC? (JAMS console, file shares, Excel, etc.)
- Is anyone on the team already automating parts of this? If so, what does that look like?

### On What Would Help Them Most

- If you could automate just one of those 7 pain points tomorrow, which would you pick?
- What does your "I'm about to test an interface" checklist look like today — is it written down or tribal knowledge?
- Where do you spend the most time waiting vs. actively doing something?
- What's the most frustrating part of a typical test cycle that we haven't already discussed?

---

## Connecting to Training

These questions help map their current state against the training curriculum. Key connections to watch for:

| What they describe | Training topic it maps to |
|---|---|
| Manual DB cleanup scripts | Week 2: Functions + Error Handling (reusable reset functions) |
| One-field-at-a-time testing | Week 3-4: Loops, data structures, batch processing |
| Ad-hoc validation queries | Week 5-6: Data validation patterns, Great Expectations |
| No shared scripts / tribal knowledge | Week 7+: Source control, shared libraries, documentation as code |
| Waiting for interface completion | Week 9-10: Orchestration (Airflow sensors, task dependencies) |
| Manual evidence gathering | Week 11+: Automated reporting, pipeline observability |

Listen for patterns where their manual repetition aligns with something Python/automation solves naturally. These become the strongest motivating examples in future lessons.

---

## Meeting Notes (fill in during/after the call)

**Attendees:**

**Key takeaways:**

- 

**Current tools/scripts they mentioned:**

- 

**Biggest pain (in their words):**

- 

**Ideas for training content based on this conversation:**

- 

**Follow-up items:**

- 
