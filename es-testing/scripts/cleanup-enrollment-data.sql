-- ============================================================
-- CLEANUP SCRIPT: Remove all Program Enrollment records for participant 1430000013
--
-- Purpose: Reset participant to pristine state (no IRIS enrollments)
--          so TC-001 can be executed from a clean state.
--
-- Prerequisites:
--   1. Disenrollment must be confirmed by MMIS first (run PREREQ tests)
--   2. Verify participant MA ID = 1430000013
--
-- Run this AFTER disenrollment is confirmed by MMIS.
-- This is meant to be run MANUALLY against the F2 Carity database.
-- ============================================================

-- Step 0: Find the PersonKey for MA ID 1430000013
DECLARE @PersonKey UNIQUEIDENTIFIER;
DECLARE @CaseKey UNIQUEIDENTIFIER;

SELECT @PersonKey = pmn.PersonKey
FROM PersonModule.PersonMedicaidNumbers pmn
WHERE pmn.Value = '1430000013'
  AND pmn.StatusDisplayName = 'Active';

-- Get CaseKey from the person's enrollment records
SELECT @CaseKey = pe.CaseKey
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName = 'IRIS'
  AND pe.CaseKey IN (
    -- Find cases associated with this person
    SELECT DISTINCT CaseKey 
    FROM PersonModule.PersonLocationAssignment 
    WHERE PersonKey IS NOT NULL -- adjust if needed based on schema
  );

-- If CaseKey lookup is complex, use this alternative:
-- Find all IRIS ProgramEnrollmentKeys for this participant
SELECT @CaseKey = pe.CaseKey
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey IS NOT NULL;

PRINT 'PersonKey: ' + ISNULL(CAST(@PersonKey AS NVARCHAR(36)), 'NOT FOUND');
PRINT 'CaseKey: ' + ISNULL(CAST(@CaseKey AS NVARCHAR(36)), 'NOT FOUND');

-- ============================================================
-- Step 1: Delete MMIS sync error messages
-- ============================================================
DELETE peem
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages peem
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = peem.ProgramEnrollmentExtensionKey
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;

PRINT 'Deleted ProgramEnrollmentExtensionMessages';

-- ============================================================
-- Step 2: Delete MMIS sync transaction messages
-- ============================================================
DELETE stm
FROM CustomerProgramEnrollmentModule.SyncTransactionMessages stm
JOIN CustomerProgramEnrollmentModule.SyncTransaction st
  ON st.SyncTransactionKey = stm.SyncTransactionKey
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;

PRINT 'Deleted SyncTransactionMessages';

-- ============================================================
-- Step 3: Delete MMIS sync transactions
-- ============================================================
DELETE st
FROM CustomerProgramEnrollmentModule.SyncTransaction st
JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
  ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;

PRINT 'Deleted SyncTransaction records';

-- ============================================================
-- Step 4: Delete MMIS program enrollment extensions
-- ============================================================
DELETE pee
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;

PRINT 'Deleted ProgramEnrollmentExtension records';

-- ============================================================
-- Step 5: Delete program enrollment suspension records (if any)
-- ============================================================
DELETE pes
FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension pes
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pes.ProgramEnrollmentKey
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;

PRINT 'Deleted ProgramEnrollmentSuspension records';

-- ============================================================
-- Step 6: Delete program enrollment records
-- ============================================================
DELETE pe
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;

PRINT 'Deleted ProgramEnrollment records';

-- ============================================================
-- Step 7: Verify clean state
-- ============================================================
SELECT COUNT(*) AS RemainingEnrollments
FROM ProgramEnrollmentModule.ProgramEnrollment pe
JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
WHERE p.DisplayName IN ('IRIS', 'SDPC')
  AND pe.CaseKey = @CaseKey;
-- Expected: 0

SELECT COUNT(*) AS RemainingSyncRecords
FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
JOIN ProgramEnrollmentModule.ProgramEnrollment pe
  ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
WHERE pe.CaseKey = @CaseKey;
-- Expected: 0

PRINT '=== CLEANUP COMPLETE ===';
PRINT 'Participant 1430000013 is now in pristine state for TC-001 execution.';
