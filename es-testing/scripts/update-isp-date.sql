-- ============================================================
-- UPDATE ISP START DATE for participant 1430000013
--
-- Purpose: Change ISP (Person Centered Plan) start date to a past date
--          so MMIS doesn't reject with error 9199 
--          "RECERTIFICATION COMPLETION DATE CANNOT BE IN THE FUTURE"
--
-- The enrollment start date must match the ISP start date.
-- MMIS requires RecertificationCompletionDate (= enrollment start = ISP start) 
-- to NOT be in the future.
--
-- Change: 07/01/2026 → 06/01/2026
-- ============================================================

-- Find the PersonKey
DECLARE @PersonKey UNIQUEIDENTIFIER;

SELECT @PersonKey = pmn.PersonKey
FROM PersonModule.PersonMedicaidNumbers pmn
WHERE pmn.Value = '1430000013'
  AND pmn.StatusDisplayName = 'Active';

PRINT 'PersonKey: ' + ISNULL(CAST(@PersonKey AS NVARCHAR(36)), 'NOT FOUND');

-- View current ISP dates
SELECT pcp.PersonCenteredPlanKey,
       pcp.EffectiveDateRangeStartDate,
       pcp.EffectiveDateRangeEndDate
FROM PersonCenteredPlanModule.PersonCenteredPlan pcp
WHERE pcp.PersonKey = @PersonKey
   OR pcp.CaseKey IN (
       SELECT CaseKey FROM ProgramEnrollmentModule.ProgramEnrollment pe
       JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
       WHERE p.DisplayName = 'IRIS'
   );

-- Update ISP start date from 07/01/2026 to 06/01/2026
UPDATE pcp
SET pcp.EffectiveDateRangeStartDate = '2026-06-01'
FROM PersonCenteredPlanModule.PersonCenteredPlan pcp
WHERE pcp.EffectiveDateRangeStartDate = '2026-07-01'
  AND (pcp.PersonKey = @PersonKey
       OR pcp.CaseKey IN (
           SELECT CaseKey FROM ProgramEnrollmentModule.ProgramEnrollment pe
           JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
           WHERE p.DisplayName = 'IRIS'
       ));

-- Also update end date proportionally: 06/30/2027 → 05/31/2027 (optional, keep if preferred)
-- UPDATE pcp
-- SET pcp.EffectiveDateRangeEndDate = '2027-05-31'
-- FROM PersonCenteredPlanModule.PersonCenteredPlan pcp
-- WHERE pcp.EffectiveDateRangeEndDate = '2027-06-30'
--   AND pcp.PersonKey = @PersonKey;

-- Verify the update
SELECT pcp.PersonCenteredPlanKey,
       pcp.EffectiveDateRangeStartDate AS NewStartDate,
       pcp.EffectiveDateRangeEndDate AS EndDate
FROM PersonCenteredPlanModule.PersonCenteredPlan pcp
WHERE pcp.PersonKey = @PersonKey
   OR pcp.CaseKey IN (
       SELECT CaseKey FROM ProgramEnrollmentModule.ProgramEnrollment pe
       JOIN ProgramModule.Program p ON p.ProgramKey = pe.ProgramKey
       WHERE p.DisplayName = 'IRIS'
   );

PRINT '=== ISP date updated to 06/01/2026 ===';
PRINT 'Now update enrollment tests to use 06/01/2026 as start date.';
