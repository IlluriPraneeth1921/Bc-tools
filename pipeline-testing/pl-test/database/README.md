# Database Scripts

## Target Database
`WiDHS.Qc.Interface.Carity.ToolTesting`

## Schema
All tables are created under the `[TestVerification]` schema.

## Execution Order

Run these scripts in numerical order on the target database:

1. `001_create_schema.sql` — Creates the `[TestVerification]` schema
2. `002_create_test_run.sql` — Creates the `TestRun` tracking table
3. `003_create_mismatch_report.sql` — Creates the `MismatchReport` table
4. `004_create_expected_state_stage1.sql` — Expected state for Stage 1 (raw lines)
5. `005_create_expected_state_stage2.sql` — Expected state for Stage 2 (parsed fields, EAV)
6. `006_create_expected_state_stage3.sql` — Expected state for Stage 3 (incoming/mapped, EAV)
7. `007_create_expected_state_stage4.sql` — Expected state for Stage 4 (final Carity, EAV)
8. `008_create_cleanup_procedures.sql` — Stored procedures for cleanup

## Notes

- Scripts are idempotent (safe to re-run — uses `IF NOT EXISTS` checks)
- EAV (Entity-Attribute-Value) pattern is used for Stage 2-4 expected state tables to avoid creating one table per record type
- The `RowKey` column in Stage 3/4 tables is a composite string key that distinguishes multiple rows for the same provider in the same target table (e.g., different address types)
