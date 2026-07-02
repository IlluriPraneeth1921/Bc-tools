-- ============================================================
-- Stored Procedure: dbo.test_ResetPersonToPristineState
--
-- Purpose: Resets a target person to match the blueprint person
--          1829357f-3e6c-44df-a0a9-b47b00f112e4 exactly.
--
-- Strategy:
--   1. Delete ALL enrollment data, ISPs, extra location/staff assignments
--   2. Re-insert ISP structure by copying from blueprint with new keys
--   3. Substitute target-specific identity fields (name, DOB, Medicaid#)
--
-- Parameters:
--   @PersonKey UNIQUEIDENTIFIER - The target PersonKey to reset
--   @DryRun   BIT              - 1 = report only, 0 = execute (default: 1)
--
-- Usage:
--   EXEC dbo.test_ResetPersonToPristineState
--     @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd', @DryRun = 0;
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO
SET ANSI_NULLS ON;
GO

CREATE OR ALTER PROCEDURE dbo.test_ResetPersonToPristineState
    @PersonKey UNIQUEIDENTIFIER,
    @DryRun BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Blueprint person (pristine reference)
    DECLARE @BlueprintPersonKey UNIQUEIDENTIFIER = '1829357f-3e6c-44df-a0a9-b47b00f112e4';
    DECLARE @BlueprintCaseKey UNIQUEIDENTIFIER = '304F388C-DF86-4DC2-8CDF-B47B00F11335';
    DECLARE @BlueprintPcpKey UNIQUEIDENTIFIER = '7C0ECDC3-24FA-4CD7-B916-B47B00F376C5';

    -- Validate target
    IF @PersonKey IS NULL BEGIN RAISERROR('PersonKey cannot be NULL.', 16, 1); RETURN -1; END
    IF NOT EXISTS (SELECT 1 FROM PersonModule.Person WHERE PersonKey = @PersonKey)
    BEGIN PRINT 'ERROR: Person not found.'; RETURN -1; END

    DECLARE @CaseKey UNIQUEIDENTIFIER;
    SELECT @CaseKey = CaseKey FROM CaseModule.[Case] WHERE PersonKey = @PersonKey;
    IF @CaseKey IS NULL BEGIN PRINT 'ERROR: Case not found.'; RETURN -1; END

    -- Target identity (for ISP contact info substitution)
    DECLARE @TargetFirstName NVARCHAR(200), @TargetLastName NVARCHAR(200);
    DECLARE @TargetBirthDate DATE, @TargetMedicaidNo NVARCHAR(20);
    SELECT @TargetFirstName = NameFirstName, @TargetLastName = NameLastName,
           @TargetBirthDate = BirthDate
    FROM PersonModule.Person WHERE PersonKey = @PersonKey;

    SELECT @TargetMedicaidNo = Value FROM PersonModule.PersonMedicaidNumbers
    WHERE PersonKey = @PersonKey AND StatusDisplayName = 'Active';

    DECLARE @Now DATETIME2 = GETUTCDATE();

    PRINT '=== RESET TO PRISTINE STATE ===';
    IF @DryRun = 1 PRINT '*** DRY RUN - NO CHANGES ***';
    PRINT 'Target PersonKey: ' + CAST(@PersonKey AS NVARCHAR(36));
    PRINT 'Target CaseKey:   ' + CAST(@CaseKey AS NVARCHAR(36));
    PRINT 'Blueprint:        ' + CAST(@BlueprintPersonKey AS NVARCHAR(36));
    PRINT '';

    IF @DryRun = 1
    BEGIN
        DECLARE @ec INT;
        SELECT @ec = COUNT(*) FROM ProgramEnrollmentModule.ProgramEnrollment WHERE CaseKey = @CaseKey;
        PRINT 'Enrollments to delete: ' + CAST(@ec AS NVARCHAR(10));
        SELECT @ec = COUNT(*) FROM PersonCenteredPlanModule.PersonCenteredPlan WHERE CaseKey = @CaseKey;
        PRINT 'ISPs to delete: ' + CAST(@ec AS NVARCHAR(10));
        PRINT '';
        PRINT 'Post-reset: will match blueprint exactly.';
        PRINT '*** Re-run with @DryRun = 0 ***';
        RETURN 0;
    END

    BEGIN TRY
        BEGIN TRANSACTION;

        -- ==========================================================
        -- PART A: DELETE ALL PROGRAM ENROLLMENT DATA
        -- ==========================================================
        PRINT '--- Part A: Enrollment Cleanup ---';

        DELETE stm FROM CustomerProgramEnrollmentModule.SyncTransactionMessages stm
        JOIN CustomerProgramEnrollmentModule.SyncTransaction st ON st.SyncTransactionKey = stm.SyncTransactionKey
        JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
        JOIN ProgramEnrollmentModule.ProgramEnrollment pe ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        WHERE pe.CaseKey = @CaseKey;
        PRINT '  SyncTransactionMessages: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE st FROM CustomerProgramEnrollmentModule.SyncTransaction st
        JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee ON pee.ProgramEnrollmentExtensionKey = st.ProgramEnrollmentExtensionKey
        JOIN ProgramEnrollmentModule.ProgramEnrollment pe ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        WHERE pe.CaseKey = @CaseKey;
        PRINT '  SyncTransaction: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE peem FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtensionMessages peem
        JOIN CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee ON pee.ProgramEnrollmentExtensionKey = peem.ProgramEnrollmentExtensionKey
        JOIN ProgramEnrollmentModule.ProgramEnrollment pe ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        WHERE pe.CaseKey = @CaseKey;
        PRINT '  ExtensionMessages: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM CustomerProgramEnrollmentModule.SuccessTransaction WHERE CaseKey = @CaseKey;
        PRINT '  SuccessTransaction: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE pee FROM CustomerProgramEnrollmentModule.ProgramEnrollmentExtension pee
        JOIN ProgramEnrollmentModule.ProgramEnrollment pe ON pe.ProgramEnrollmentKey = pee.ProgramEnrollmentKey
        WHERE pe.CaseKey = @CaseKey;
        PRINT '  ProgramEnrollmentExtension: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE sr FROM ProgramEnrollmentModule.SynchronizationRecord sr
        JOIN ProgramEnrollmentModule.ProgramEnrollment pe ON pe.ProgramEnrollmentKey = sr.ProgramEnrollmentKey
        WHERE pe.CaseKey = @CaseKey;
        PRINT '  SynchronizationRecord: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE pes FROM ProgramEnrollmentModule.ProgramEnrollmentSuspension pes
        JOIN ProgramEnrollmentModule.ProgramEnrollment pe ON pe.ProgramEnrollmentKey = pes.ProgramEnrollmentKey
        WHERE pe.CaseKey = @CaseKey;
        PRINT '  ProgramEnrollmentSuspension: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        DELETE FROM ProgramEnrollmentModule.ProgramEnrollment WHERE CaseKey = @CaseKey;
        PRINT '  ProgramEnrollment: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
        PRINT '';

        -- ==========================================================
        -- PART B: DELETE ALL ISPs AND CHILDREN
        -- (Delete ALL - will rebuild from blueprint in Part F)
        -- ==========================================================
        PRINT '--- Part B: ISP Cleanup (delete all) ---';

        -- Collect all PCP keys for this case
        DECLARE @AllPcps TABLE (K UNIQUEIDENTIFIER);
        INSERT INTO @AllPcps SELECT PersonCenteredPlanKey
        FROM PersonCenteredPlanModule.PersonCenteredPlan WHERE CaseKey = @CaseKey;

        IF (SELECT COUNT(*) FROM @AllPcps) > 0
        BEGIN
            -- Delete CaseActivityInstance records for entities being removed
            DELETE FROM CaseActivityModule.CaseActivityInstance
            WHERE CaseKey = @CaseKey AND ClrTypeDisplayName IN ('Person Centered Plan', 'Budget Ledger', 'Service Authorization');

            -- Delete extra CaseCustomFormInstances (keep only IRIS Intake + LTC Needs Assessment like blueprint)
            DELETE FROM CaseActivityModule.CaseActivityInstance
            WHERE CaseKey = @CaseKey AND ClrTypeDisplayName = 'Case Custom Form Instance'
              AND CaseActivityKeyReference IN (
                  SELECT CaseCustomFormInstanceKey FROM CustomFormModule.CaseCustomFormInstance
                  WHERE CaseKey = @CaseKey AND FormTypeDisplayName NOT IN ('IRIS Intake', 'LTC Needs Assessment')
              );
            UPDATE CustomFormModule.CaseCustomFormInstance SET PreviousCaseCustomFormInstanceKey = NULL
            WHERE CaseKey = @CaseKey AND FormTypeDisplayName NOT IN ('IRIS Intake', 'LTC Needs Assessment');
            DELETE FROM CustomFormModule.CaseCustomFormInstance
            WHERE CaseKey = @CaseKey AND FormTypeDisplayName NOT IN ('IRIS Intake', 'LTC Needs Assessment');
            PRINT '  Extra forms removed';

            -- Clear Meeting.AppointmentKey before deleting Appointments (FK_Meeting_Appointment)
            UPDATE PersonCenteredPlanModule.Meeting SET AppointmentKey = NULL
            WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            -- Delete CompletionContext/Requirements for these PCPs
            DELETE FROM CompletionModule.Requirement WHERE CompletionContextKey IN (
                SELECT CompletionContextKey FROM CompletionModule.CompletionContext
                WHERE AggregateKeyReference IN (SELECT K FROM @AllPcps));
            DELETE FROM CompletionModule.CompletionContext WHERE AggregateKeyReference IN (SELECT K FROM @AllPcps);

            -- Delete Signatures/SignatureContext for these PCPs
            -- Must clear FK on PCP FIRST
            UPDATE PersonCenteredPlanModule.PersonCenteredPlan SET SignatureContextKey = NULL
            WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM SignatureModule.Signature WHERE SignatureContextKey IN (
                SELECT SignatureContextKey FROM SignatureModule.SignatureContext
                WHERE CaseActivityKeyReference IN (SELECT K FROM @AllPcps));
            DELETE FROM SignatureModule.SignatureContext WHERE CaseActivityKeyReference IN (SELECT K FROM @AllPcps);

            -- Delete Appointments that reference these PCPs
            DELETE FROM AppointmentModule.AppointmentAttributes WHERE AppointmentKey IN (SELECT AppointmentKey FROM AppointmentModule.Appointment WHERE CaseKey = @CaseKey);
            DELETE FROM AppointmentModule.AppointmentRecurrence WHERE AppointmentKey IN (SELECT AppointmentKey FROM AppointmentModule.Appointment WHERE CaseKey = @CaseKey);
            DELETE FROM AppointmentModule.Appointment WHERE CaseKey = @CaseKey;

            -- Break self-referencing FKs
            UPDATE PersonCenteredPlanModule.PersonCenteredPlan
            SET PreviousPersonCenteredPlanKey = NULL, OriginalPersonCenteredPlanKey = PersonCenteredPlanKey
            WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            -- PcpExtension tree
            DECLARE @ExtKeys TABLE (K UNIQUEIDENTIFIER);
            INSERT INTO @ExtKeys SELECT PersonCenteredPlanExtensionKey
            FROM CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlanContact
            WHERE EmergencyBackupPlanKey IN (SELECT EmergencyBackupPlanKey FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlan WHERE PersonCenteredPlanExtensionKey IN (SELECT K FROM @ExtKeys));
            -- Delete MedicalEquipmentSupplies (child of MedicalNeeds)
            DELETE FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeedsMedicalEquipmentSupplies
            WHERE EmergencyBackupPlanMedicalNeedsKey IN (
                SELECT EmergencyBackupPlanMedicalNeedsKey FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds
                WHERE EmergencyBackupPlanKey IN (SELECT EmergencyBackupPlanKey FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlan WHERE PersonCenteredPlanExtensionKey IN (SELECT K FROM @ExtKeys))
            );
            -- Break circular FK: EBP <-> EBPMedicalNeeds
            UPDATE CustomerPersonCenteredPlanModule.EmergencyBackupPlan
            SET EmergencyBackupPlanMedicalNeedsKey = NULL
            WHERE PersonCenteredPlanExtensionKey IN (SELECT K FROM @ExtKeys);
            -- Now safe to delete MedicalNeeds
            DELETE FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds
            WHERE EmergencyBackupPlanKey IN (SELECT EmergencyBackupPlanKey FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlan WHERE PersonCenteredPlanExtensionKey IN (SELECT K FROM @ExtKeys));
            -- Now safe to delete EmergencyBackupPlan
            DELETE FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlan WHERE PersonCenteredPlanExtensionKey IN (SELECT K FROM @ExtKeys);
            DELETE FROM CustomerPersonCenteredPlanModule.WhereILive WHERE PersonCenteredPlanExtensionKey IN (SELECT K FROM @ExtKeys);
            DELETE FROM CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            PRINT '  PcpExtension tree: done';

            -- PlannedService tree
            DECLARE @PSK TABLE (K UNIQUEIDENTIFIER);
            INSERT INTO @PSK SELECT PlannedServiceKey FROM PersonCenteredPlanModule.PlannedService WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PlannedServiceAttributes WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.PlannedServiceScopes WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.PlannedServiceNeedTypes WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.PlannedServiceSupportsProvided WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.PlannedServiceProviderInvitations WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.PlannedServiceOtherProviders WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.GoalService WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.MilestoneService WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM CustomerPersonCenteredPlanModule.AmendmentPlannedService WHERE PlannedServiceReferencePlannedServiceKey IN (SELECT K FROM @PSK) OR PlannedServiceReferenceOriginalPlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM CustomerPersonCenteredPlanModule.OneTimeExpensePlannedService WHERE PlannedServiceReferencePlannedServiceKey IN (SELECT K FROM @PSK) OR PlannedServiceReferenceOriginalPlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM ServiceAuthorizationModule.Decision WHERE ServiceLineKey IN (SELECT ServiceLineKey FROM ServiceAuthorizationModule.ServiceLine WHERE PlannedServiceKey IN (SELECT K FROM @PSK));
            DELETE FROM ServiceAuthorizationModule.ServiceUtilization WHERE ServiceLineKey IN (SELECT ServiceLineKey FROM ServiceAuthorizationModule.ServiceLine WHERE PlannedServiceKey IN (SELECT K FROM @PSK));
            DELETE FROM InterfaceModule.IncomingServiceLine WHERE ServiceLineKey IN (SELECT ServiceLineKey FROM ServiceAuthorizationModule.ServiceLine WHERE PlannedServiceKey IN (SELECT K FROM @PSK));
            DELETE FROM ServiceAuthorizationModule.ServiceLine WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            -- Delete orphaned ServiceAuthorizations and their children for this case
            DELETE FROM ServiceAuthorizationModule.SupportedService WHERE ServiceAuthorizationKey IN (SELECT ServiceAuthorizationKey FROM ServiceAuthorizationModule.ServiceAuthorization WHERE CaseKey = @CaseKey);
            DELETE FROM ServiceAuthorizationModule.ServiceAuthorizationOtherProviders WHERE ServiceAuthorizationKey IN (SELECT ServiceAuthorizationKey FROM ServiceAuthorizationModule.ServiceAuthorization WHERE CaseKey = @CaseKey);
            DELETE FROM ServiceAuthorizationModule.ServiceAuthorization WHERE CaseKey = @CaseKey;
            UPDATE PersonCenteredPlanModule.PlannedService SET PreviousPlannedServiceKey = NULL, OriginalPlannedServiceKey = PlannedServiceKey WHERE PlannedServiceKey IN (SELECT K FROM @PSK);
            DELETE FROM PersonCenteredPlanModule.PlannedService WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            PRINT '  PlannedService tree: done';

            -- Goal tree
            DECLARE @GK TABLE (K UNIQUEIDENTIFIER);
            INSERT INTO @GK SELECT GoalKey FROM PersonCenteredPlanModule.Goal WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.GoalDomain WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.GoalService WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.GoalConsiderations WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.GoalNaturalSupports WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.NeedGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.StrengthGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.InterventionGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.RiskGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.ImportantFactorGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.BarrierGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.MilestoneGoal WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM CustomerPersonCenteredPlanModule.AmendmentPlannedServiceGoals WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM CustomerPersonCenteredPlanModule.OneTimeExpensePlannedServiceGoals WHERE GoalKey IN (SELECT K FROM @GK);
            UPDATE PersonCenteredPlanModule.Goal SET PreviousGoalKey = NULL, OriginalGoalKey = GoalKey WHERE GoalKey IN (SELECT K FROM @GK);
            DELETE FROM PersonCenteredPlanModule.Goal WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            PRINT '  Goal tree: done';

            -- Other trees (SupportTeamMember, AboutMe, Domain, Need, Risk, etc.)
            DELETE FROM PersonCenteredPlanModule.SupportTeamMemberRepresentativeTypes WHERE SupportTeamMemberKey IN (SELECT SupportTeamMemberKey FROM PersonCenteredPlanModule.SupportTeamMember WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.SupportTeamMember SET PreviousSupportTeamMemberKey=NULL, OriginalSupportTeamMemberKey=SupportTeamMemberKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.SupportTeamMember WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.AboutMeDescriptionDescriptionItems WHERE AboutMeDescriptionKey IN (SELECT AboutMeDescriptionKey FROM PersonCenteredPlanModule.AboutMeDescription WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.AboutMeDescription SET PreviousAboutMeDescriptionKey=NULL, OriginalAboutMeDescriptionKey=AboutMeDescriptionKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.AboutMeDescription WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DECLARE @DK TABLE (K UNIQUEIDENTIFIER);
            INSERT INTO @DK SELECT DomainKey FROM PersonCenteredPlanModule.Domain WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.DomainNeed WHERE DomainKey IN (SELECT K FROM @DK);
            DELETE FROM PersonCenteredPlanModule.GoalDomain WHERE DomainKey IN (SELECT K FROM @DK);
            DELETE FROM PersonCenteredPlanModule.BarrierDomain WHERE DomainKey IN (SELECT K FROM @DK);
            UPDATE PersonCenteredPlanModule.Domain SET PreviousDomainKey=NULL, OriginalDomainKey=DomainKey WHERE DomainKey IN (SELECT K FROM @DK);
            DELETE FROM PersonCenteredPlanModule.Domain WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DECLARE @NK TABLE (K UNIQUEIDENTIFIER);
            INSERT INTO @NK SELECT NeedKey FROM PersonCenteredPlanModule.Need WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.NeedGoal WHERE NeedKey IN (SELECT K FROM @NK);
            DELETE FROM PersonCenteredPlanModule.StrengthNeed WHERE NeedKey IN (SELECT K FROM @NK);
            DELETE FROM PersonCenteredPlanModule.BarrierNeed WHERE NeedKey IN (SELECT K FROM @NK);
            DELETE FROM PersonCenteredPlanModule.DomainNeed WHERE NeedKey IN (SELECT K FROM @NK);
            DELETE FROM PersonCenteredPlanModule.NeedUnmetNeedCategories WHERE NeedKey IN (SELECT K FROM @NK);
            UPDATE PersonCenteredPlanModule.Need SET PreviousNeedKey=NULL, OriginalNeedKey=NeedKey WHERE NeedKey IN (SELECT K FROM @NK);
            DELETE FROM PersonCenteredPlanModule.Need WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.RiskGoal WHERE RiskKey IN (SELECT RiskKey FROM PersonCenteredPlanModule.Risk WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.Risk SET PreviousRiskKey=NULL, OriginalRiskKey=RiskKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.Risk WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.StrengthNeed WHERE StrengthKey IN (SELECT StrengthKey FROM PersonCenteredPlanModule.Strength WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.StrengthGoal WHERE StrengthKey IN (SELECT StrengthKey FROM PersonCenteredPlanModule.Strength WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.Strength SET PreviousStrengthKey=NULL, OriginalStrengthKey=StrengthKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.Strength WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.InterventionGoal WHERE InterventionKey IN (SELECT InterventionKey FROM PersonCenteredPlanModule.Intervention WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.Intervention SET PreviousInterventionKey=NULL, OriginalInterventionKey=InterventionKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.Intervention WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.ImportantFactorGoal WHERE ImportantFactorKey IN (SELECT ImportantFactorKey FROM PersonCenteredPlanModule.ImportantFactor WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.ImportantFactor SET PreviousImportantFactorKey=NULL, OriginalImportantFactorKey=ImportantFactorKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.ImportantFactor WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.BarrierDomain WHERE BarrierKey IN (SELECT BarrierKey FROM PersonCenteredPlanModule.Barrier WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.BarrierNeed WHERE BarrierKey IN (SELECT BarrierKey FROM PersonCenteredPlanModule.Barrier WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.BarrierGoal WHERE BarrierKey IN (SELECT BarrierKey FROM PersonCenteredPlanModule.Barrier WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.Barrier SET PreviousBarrierKey=NULL, OriginalBarrierKey=BarrierKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.Barrier WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            -- Meeting tree
            DELETE FROM PersonCenteredPlanModule.MeetingAttendee WHERE MeetingKey IN (SELECT MeetingKey FROM PersonCenteredPlanModule.Meeting WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.MeetingPreference WHERE MeetingKey IN (SELECT MeetingKey FROM PersonCenteredPlanModule.Meeting WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.FollowingUpAppointment WHERE MeetingKey IN (SELECT MeetingKey FROM PersonCenteredPlanModule.Meeting WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.Meeting SET PreviousMeetingKey=NULL, OriginalMeetingKey=MeetingKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.Meeting WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.MyPlanToAddressSafetyNeedsServicesOffered WHERE MyPlanToAddressSafetyNeedsKey IN (SELECT MyPlanToAddressSafetyNeedsKey FROM PersonCenteredPlanModule.MyPlanToAddressSafetyNeeds WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.MyPlanToAddressSafetyNeedsNeedsIWillAddress WHERE MyPlanToAddressSafetyNeedsKey IN (SELECT MyPlanToAddressSafetyNeedsKey FROM PersonCenteredPlanModule.MyPlanToAddressSafetyNeeds WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.MyPlanToAddressSafetyNeeds WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.MyLifeTodayDescriptionRoutines WHERE MyLifeTodayDescriptionKey IN (SELECT MyLifeTodayDescriptionKey FROM PersonCenteredPlanModule.MyLifeTodayDescription WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.MyLifeTodayDescription WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.SurveySurveyItems WHERE SurveyKey IN (SELECT SurveyKey FROM PersonCenteredPlanModule.Survey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            UPDATE PersonCenteredPlanModule.Survey SET PreviousSurveyKey=NULL, OriginalSurveyKey=SurveyKey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.Survey WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            DELETE FROM PersonCenteredPlanModule.MilestoneService WHERE MilestoneKey IN (SELECT MilestoneKey FROM PersonCenteredPlanModule.Milestone WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.MilestoneGoal WHERE MilestoneKey IN (SELECT MilestoneKey FROM PersonCenteredPlanModule.Milestone WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps));
            DELETE FROM PersonCenteredPlanModule.Milestone WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            -- Remaining leaf tables
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanAdditionalSimpleQuestionItems WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanProviders WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanChangeReasons WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanMonitoring WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanMedicationReviews WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanOtherAgendaItems WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlanAboutMeDescriptions WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM CustomerPersonCenteredPlanModule.BudgetAmendment WHERE PersonCenteredPlanReferencePersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM CustomerPersonCenteredPlanModule.OneTimeExpense WHERE PersonCenteredPlanReferencePersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM CustomerHcbsSettingsRuleModificationModule.HcbsSettingsRuleModification WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM CustomerRiskAgreementModule.RiskAgreement WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            DELETE FROM ServiceImplementationPlanModule.ServiceImplementationPlan WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);

            -- Finally delete the PCP records
            DELETE FROM PersonCenteredPlanModule.PersonCenteredPlan WHERE PersonCenteredPlanKey IN (SELECT K FROM @AllPcps);
            PRINT '  PersonCenteredPlan deleted: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
        END
        PRINT '';

        -- ==========================================================
        -- PART B2: DELETE AND REBUILD BUDGET LEDGERS
        -- ==========================================================
        PRINT '--- Part B2: BudgetLedger Cleanup & Rebuild ---';

        -- Delete target's budget data
        DELETE FROM BudgetManagementModule.BudgetEntryServiceDefinitions
        WHERE BudgetEntryKey IN (SELECT BudgetEntryKey FROM BudgetManagementModule.BudgetEntry
            WHERE BudgetLedgerKey IN (SELECT BudgetLedgerKey FROM BudgetManagementModule.BudgetLedger WHERE CaseKey = @CaseKey));
        DELETE FROM BudgetManagementModule.BudgetEntry
        WHERE BudgetLedgerKey IN (SELECT BudgetLedgerKey FROM BudgetManagementModule.BudgetLedger WHERE CaseKey = @CaseKey);
        DELETE FROM BudgetManagementModule.BudgetLedger WHERE CaseKey = @CaseKey;
        PRINT '  Deleted target BudgetLedger/Entry data';

        -- Rebuild from blueprint: BudgetLedger
        DECLARE @NewBudgetLedgerKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO BudgetManagementModule.BudgetLedger (
            BudgetLedgerKey, Version, IsDiscarded, MonthlyBudgetAmount, MonthlyBudgetChangeReason,
            OverviewChangedDate, OverviewChangeReason,
            OverviewEffectiveDateRangeEndDate, OverviewEffectiveDateRangeStartDate,
            OverviewLevelOfCareEffectiveDate, OverviewProgramKey,
            TotalAmount, TotalAmendmentBudget, TotalMonthlyBaseBudget,
            CaseKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewBudgetLedgerKey, 1, IsDiscarded, MonthlyBudgetAmount, MonthlyBudgetChangeReason,
            OverviewChangedDate, OverviewChangeReason,
            OverviewEffectiveDateRangeEndDate, OverviewEffectiveDateRangeStartDate,
            OverviewLevelOfCareEffectiveDate, OverviewProgramKey,
            TotalAmount, TotalAmendmentBudget, TotalMonthlyBaseBudget,
            @CaseKey,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM BudgetManagementModule.BudgetLedger
        WHERE CaseKey = @BlueprintCaseKey;
        PRINT '  BudgetLedger: 1';

        -- Rebuild from blueprint: BudgetEntry (copy all entries with new keys)
        INSERT INTO BudgetManagementModule.BudgetEntry (
            BudgetEntryKey, Version, BudgetLedgerKey,
            Amount, Comment, CoveredDays, EffectiveDateRangeEndDate, EffectiveDateRangeStartDate,
            EntryTypeCodeSystemIdentifier, EntryTypeDisplayName, EntryTypeIdentifier,
            IsChange, IsHistorical, ProratedAmount,
            ProvenanceSourceIdentifier, ProvenanceTypeCodeSystemIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier,
            TotalDaysInMonth,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), Version, @NewBudgetLedgerKey,
            Amount, Comment, CoveredDays, EffectiveDateRangeEndDate, EffectiveDateRangeStartDate,
            EntryTypeCodeSystemIdentifier, EntryTypeDisplayName, EntryTypeIdentifier,
            IsChange, IsHistorical, ProratedAmount,
            ProvenanceSourceIdentifier, ProvenanceTypeCodeSystemIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier,
            TotalDaysInMonth,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM BudgetManagementModule.BudgetEntry
        WHERE BudgetLedgerKey = 'FA583AB6-229A-4DE9-B3ED-B47B00F1323B';
        PRINT '  BudgetEntry: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
        PRINT '';

        -- ==========================================================
        -- PART C: RESET LOCATION ASSIGNMENTS
        -- ==========================================================
        PRINT '--- Part C: LocationAssignment Cleanup ---';
        DECLARE @KeepLoc TABLE (K UNIQUEIDENTIFIER);
        INSERT INTO @KeepLoc SELECT TOP 1 PersonLocationAssignmentKey
        FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey AND PersonLocationAssignmentTypeDisplayName = 'ICA' ORDER BY EntityCreatedTimestamp ASC;
        INSERT INTO @KeepLoc SELECT PersonLocationAssignmentKey FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey AND PersonLocationAssignmentTypeDisplayName = 'FEA';
        INSERT INTO @KeepLoc SELECT PersonLocationAssignmentKey FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey AND PersonLocationAssignmentTypeDisplayName = 'Waiver Service Provider';

        UPDATE PersonModule.PersonLocationAssignment SET TransferredFromPersonLocationAssignmentKey = NULL WHERE CaseKey = @CaseKey AND TransferredFromPersonLocationAssignmentKey NOT IN (SELECT K FROM @KeepLoc);
        UPDATE IntakeReferralModule.IntakeReferral SET ReferralSourcePersonLocationAssignmentKey = NULL WHERE ReferralSourcePersonLocationAssignmentKey IN (SELECT PersonLocationAssignmentKey FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey AND PersonLocationAssignmentKey NOT IN (SELECT K FROM @KeepLoc));
        DELETE FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey AND PersonLocationAssignmentKey NOT IN (SELECT K FROM @KeepLoc);
        PRINT '  Extra removed: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
        UPDATE PersonModule.PersonLocationAssignment SET EffectiveDateRangeEndDate = NULL, TransferredFromPersonLocationAssignmentKey = NULL
        WHERE PersonLocationAssignmentKey IN (SELECT K FROM @KeepLoc) AND PersonLocationAssignmentTypeDisplayName = 'ICA' AND EffectiveDateRangeEndDate IS NOT NULL;
        PRINT '  ICA reopened';
        PRINT '';

        -- ==========================================================
        -- PART D: RESET STAFF MEMBER ASSIGNMENTS
        -- ==========================================================
        PRINT '--- Part D: StaffMemberAssignment Cleanup ---';
        DECLARE @KeepStaff TABLE (K UNIQUEIDENTIFIER);
        INSERT INTO @KeepStaff SELECT TOP 1 PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey AND AssignmentLocationTypeDisplayName = 'ICA' AND EffectiveDateRangeEndDate IS NULL ORDER BY EntityCreatedTimestamp ASC;
        INSERT INTO @KeepStaff SELECT TOP 1 PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey AND AssignmentLocationTypeDisplayName = 'ICA' AND EffectiveDateRangeEndDate IS NOT NULL ORDER BY EntityCreatedTimestamp ASC;
        INSERT INTO @KeepStaff SELECT PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey AND AssignmentLocationTypeDisplayName <> 'ICA';

        UPDATE PersonModule.PersonStaffMemberAssignment SET TransferredFromPersonStaffMemberAssignmentKey = NULL WHERE CaseKey = @CaseKey AND TransferredFromPersonStaffMemberAssignmentKey NOT IN (SELECT K FROM @KeepStaff);
        UPDATE IntakeReferralModule.IntakeReferral SET ReferralSourcePersonStaffMemberAssignmentKey = NULL WHERE ReferralSourcePersonStaffMemberAssignmentKey IN (SELECT PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey AND PersonStaffMemberAssignmentKey NOT IN (SELECT K FROM @KeepStaff));
        DELETE FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey AND PersonStaffMemberAssignmentKey NOT IN (SELECT K FROM @KeepStaff);
        PRINT '  Extra removed: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
        PRINT '';

        -- ==========================================================
        -- PART F: REBUILD ISP FROM BLUEPRINT
        -- Copy blueprint ISP structure with new keys, substituting
        -- target-specific identity fields.
        -- Uses a key mapping table to translate blueprint keys to new keys.
        -- ==========================================================
        PRINT '--- Part F: Rebuild ISP from blueprint ---';

        -- Key mapping: blueprint key -> new key
        DECLARE @KeyMap TABLE (OldKey UNIQUEIDENTIFIER, NewKey UNIQUEIDENTIFIER);

        -- Generate new PCP key
        DECLARE @NewPcpKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO @KeyMap VALUES (@BlueprintPcpKey, @NewPcpKey);

        -- Insert PersonCenteredPlan (copy all columns from blueprint, replace keys)
        INSERT INTO PersonCenteredPlanModule.PersonCenteredPlan (
            PersonCenteredPlanKey, Version, CaseKey, ProgramKey,
            OriginalPersonCenteredPlanKey, PreviousPersonCenteredPlanKey,
            EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            ContactInformationMedicaidNumber, ContactInformationNameFirstName, ContactInformationNameLastName,
            ContactInformationBirthDate,
            BudgetAllocatedAmount, BudgetRequestedAmount, BudgetAuthorizedAmount,
            TotalCostWaiverCostAmount, TotalCostNonWaiverCostAmount,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewPcpKey, 1, @CaseKey, ProgramKey,
            @NewPcpKey, NULL,
            EffectiveDateRangeStartDate, EffectiveDateRangeEndDate,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            @TargetMedicaidNo, @TargetFirstName, @TargetLastName,
            @TargetBirthDate,
            BudgetAllocatedAmount, BudgetRequestedAmount, BudgetAuthorizedAmount,
            TotalCostWaiverCostAmount, TotalCostNonWaiverCostAmount,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.PersonCenteredPlan
        WHERE PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  PersonCenteredPlan: 1';

        -- PcpExtension
        DECLARE @NewPcpExtKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension (
            PersonCenteredPlanExtensionKey, Version, PersonCenteredPlanKey,
            LtcNeedsAssessmentDisplayName, LtcNeedsAssessmentKeyReference,
            RiskAgreementDisplayName, RiskAgreementKeyReference,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewPcpExtKey, 1, @NewPcpKey,
            LtcNeedsAssessmentDisplayName, NULL,
            RiskAgreementDisplayName, RiskAgreementKeyReference,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension
        WHERE PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  PcpExtension: 1';

        -- EmergencyBackupPlan (insert with NULL MedicalNeedsKey first due to circular FK)
        DECLARE @NewEBPKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @NewEBPMedNeedsKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO CustomerPersonCenteredPlanModule.EmergencyBackupPlan (
            EmergencyBackupPlanKey, Version, PersonCenteredPlanExtensionKey,
            EmergencyBackupPlanMedicalNeedsKey,
            AdditionalInformationDescription,
            BehavioralNeedsHasBehavioralSupportPlanCodeSystemIdentifier,
            BehavioralNeedsHasBehavioralSupportPlanDisplayName,
            BehavioralNeedsHasBehavioralSupportPlanIdentifier,
            GeneralInformationAllergiesDescription,
            GeneralInformationLivingSituationCodeSystemIdentifier,
            GeneralInformationLivingSituationDisplayName,
            GeneralInformationLivingSituationIdentifier,
            GeneralInformationPreferredHospitalName,
            PharmacyAndMedicationsComments, PharmacyAndMedicationsMedicationsDescription, PharmacyAndMedicationsPharmacyName,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewEBPKey, 1, @NewPcpExtKey,
            NULL,  -- Insert with NULL first, update after MedicalNeeds is inserted
            AdditionalInformationDescription,
            BehavioralNeedsHasBehavioralSupportPlanCodeSystemIdentifier,
            BehavioralNeedsHasBehavioralSupportPlanDisplayName,
            BehavioralNeedsHasBehavioralSupportPlanIdentifier,
            GeneralInformationAllergiesDescription,
            GeneralInformationLivingSituationCodeSystemIdentifier,
            GeneralInformationLivingSituationDisplayName,
            GeneralInformationLivingSituationIdentifier,
            GeneralInformationPreferredHospitalName,
            PharmacyAndMedicationsComments, PharmacyAndMedicationsMedicationsDescription, PharmacyAndMedicationsPharmacyName,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlan
        WHERE PersonCenteredPlanExtensionKey = '898DEB6A-BE64-4721-8218-B47B00F3774C';

        -- EmergencyBackupPlanMedicalNeeds
        INSERT INTO CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds (
            EmergencyBackupPlanMedicalNeedsKey, Version, EmergencyBackupPlanKey,
            AdditionalMedicalNotes, MapcAgencyName,
            PrimaryMedicalProviderPersonContactKeyReference,
            PrimaryMedicalProviderPersonNameFirstName, PrimaryMedicalProviderPersonNameLastName,
            PrimaryMedicalProviderPrimaryPhoneNumberNumber,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewEBPMedNeedsKey, 1, @NewEBPKey,
            AdditionalMedicalNotes, MapcAgencyName,
            NULL, -- PersonContactKeyReference (blueprint-specific)
            PrimaryMedicalProviderPersonNameFirstName, PrimaryMedicalProviderPersonNameLastName,
            PrimaryMedicalProviderPrimaryPhoneNumberNumber,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlanMedicalNeeds
        WHERE EmergencyBackupPlanKey = 'B82EB667-E8EF-4786-B83D-B47B00F3774C';

        -- Now set the circular FK on EmergencyBackupPlan
        UPDATE CustomerPersonCenteredPlanModule.EmergencyBackupPlan
        SET EmergencyBackupPlanMedicalNeedsKey = @NewEBPMedNeedsKey
        WHERE EmergencyBackupPlanKey = @NewEBPKey;

        -- EmergencyBackupPlanContact (3 records)
        INSERT INTO CustomerPersonCenteredPlanModule.EmergencyBackupPlanContact (
            EmergencyBackupPlanContactKey, Version, EmergencyBackupPlanKey,
            CanHelpWithDescription, CategoryCodeSystemIdentifier, CategoryDisplayName, CategoryIdentifier,
            ContactTypeCodeSystemIdentifier, ContactTypeDisplayName, ContactTypeIdentifier,
            EmergencySituationCodeSystemIdentifier, EmergencySituationDisplayName, EmergencySituationIdentifier,
            PersonNameFirstName, PersonNameLastName, PhoneNumber,
            RelationshipTypeCodeSystemIdentifier, RelationshipTypeDisplayName, RelationshipTypeIdentifier,
            PersonContactKeyReference,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), 1, @NewEBPKey,
            CanHelpWithDescription, CategoryCodeSystemIdentifier, CategoryDisplayName, CategoryIdentifier,
            ContactTypeCodeSystemIdentifier, ContactTypeDisplayName, ContactTypeIdentifier,
            EmergencySituationCodeSystemIdentifier, EmergencySituationDisplayName, EmergencySituationIdentifier,
            PersonNameFirstName, PersonNameLastName, PhoneNumber,
            RelationshipTypeCodeSystemIdentifier, RelationshipTypeDisplayName, RelationshipTypeIdentifier,
            NULL, -- PersonContactKeyReference (blueprint-specific)
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlanContact
        WHERE EmergencyBackupPlanKey = 'B82EB667-E8EF-4786-B83D-B47B00F3774C';
        PRINT '  EmergencyBackupPlan tree: done';

        -- WhereILive
        INSERT INTO CustomerPersonCenteredPlanModule.WhereILive (
            WhereILiveKey, Version, PersonCenteredPlanExtensionKey,
            ImportanceOfWhereYouLiveDescription, LivingSituationTypeCodeSystemIdentifier,
            LivingSituationTypeDisplayName, LivingSituationTypeIdentifier,
            OtherArrangementsDescription, SatisfactionWithLivingArrangementNote,
            SatisfactionWithLivingArrangementValueCodeSystemIdentifier,
            SatisfactionWithLivingArrangementValueDisplayName,
            SatisfactionWithLivingArrangementValueIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), 1, @NewPcpExtKey,
            ImportanceOfWhereYouLiveDescription, LivingSituationTypeCodeSystemIdentifier,
            LivingSituationTypeDisplayName, LivingSituationTypeIdentifier,
            OtherArrangementsDescription, SatisfactionWithLivingArrangementNote,
            SatisfactionWithLivingArrangementValueCodeSystemIdentifier,
            SatisfactionWithLivingArrangementValueDisplayName,
            SatisfactionWithLivingArrangementValueIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM CustomerPersonCenteredPlanModule.WhereILive
        WHERE PersonCenteredPlanExtensionKey = '898DEB6A-BE64-4721-8218-B47B00F3774C';
        PRINT '  WhereILive: done';

        -- Domain (6 records) - use pre-generated keys so OriginalDomainKey = DomainKey (self-ref FK)
        DECLARE @DomainMap TABLE (OldKey UNIQUEIDENTIFIER, NewKey UNIQUEIDENTIFIER, NameId BIGINT);
        DECLARE @DomainStaging TABLE (
            NewKey UNIQUEIDENTIFIER DEFAULT NEWID(),
            Description NVARCHAR(MAX), NameDisplayName NVARCHAR(MAX), NameIdentifier BIGINT,
            NameCodeSystemIdentifier BIGINT, ProvenanceSourceIdentifier NVARCHAR(1000),
            ProvenanceTypeDisplayName NVARCHAR(MAX), ProvenanceTypeIdentifier BIGINT,
            ProvenanceTypeCodeSystemIdentifier BIGINT,
            EntityCreatedUserContextKey UNIQUEIDENTIFIER, EntityUpdatedUserContextKey UNIQUEIDENTIFIER
        );
        INSERT INTO @DomainStaging (Description, NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey)
        SELECT Description, NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.Domain WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

        INSERT INTO PersonCenteredPlanModule.Domain (
            DomainKey, Version, PersonCenteredPlanKey, Description,
            OriginalDomainKey, PreviousDomainKey,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NewKey, 1, @NewPcpKey, Description,
            NewKey, NULL, -- OriginalDomainKey = self
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM @DomainStaging;

        INSERT INTO @DomainMap (OldKey, NewKey, NameId)
        SELECT d.DomainKey, ds.NewKey, ds.NameIdentifier
        FROM @DomainStaging ds
        JOIN PersonCenteredPlanModule.Domain d ON d.NameIdentifier = ds.NameIdentifier AND d.PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  Domain: 6';

        -- Need (3 records) - track mappings for DomainNeed/NeedGoal
        DECLARE @NeedMap TABLE (OldKey UNIQUEIDENTIFIER, NewKey UNIQUEIDENTIFIER, NameIdentifier BIGINT);
        DECLARE @NeedStaging TABLE (
            NewKey UNIQUEIDENTIFIER DEFAULT NEWID(),
            Comment NVARCHAR(MAX), Description NVARCHAR(MAX), StatusDescription NVARCHAR(MAX),
            NameDisplayName NVARCHAR(MAX), NameIdentifier BIGINT, NameCodeSystemIdentifier BIGINT,
            ProvenanceSourceIdentifier NVARCHAR(1000), ProvenanceTypeDisplayName NVARCHAR(MAX),
            ProvenanceTypeIdentifier BIGINT, ProvenanceTypeCodeSystemIdentifier BIGINT,
            StatusDisplayName NVARCHAR(MAX), StatusIdentifier BIGINT, StatusCodeSystemIdentifier BIGINT,
            EntityCreatedUserContextKey UNIQUEIDENTIFIER, EntityUpdatedUserContextKey UNIQUEIDENTIFIER
        );
        INSERT INTO @NeedStaging (Comment, Description, StatusDescription,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey)
        SELECT Comment, Description, StatusDescription,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.Need WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

        INSERT INTO PersonCenteredPlanModule.Need (
            NeedKey, Version, PersonCenteredPlanKey, Comment, Description,
            OriginalNeedKey, PreviousNeedKey, StatusDescription,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NewKey, 1, @NewPcpKey, Comment, Description,
            NewKey, NULL, StatusDescription, -- OriginalNeedKey = self
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM @NeedStaging;

        -- Build need map by matching on NameIdentifier
        INSERT INTO @NeedMap (OldKey, NewKey, NameIdentifier)
        SELECT bp.NeedKey, ns.NewKey, ns.NameIdentifier
        FROM @NeedStaging ns
        JOIN PersonCenteredPlanModule.Need bp ON bp.NameIdentifier = ns.NameIdentifier AND bp.PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  Need: 3';

        -- DomainNeed (3 records) - link first domain (Community Integration, 3800003) to all needs
        DECLARE @FirstDomainKey UNIQUEIDENTIFIER;
        SELECT @FirstDomainKey = DomainKey FROM PersonCenteredPlanModule.Domain
        WHERE PersonCenteredPlanKey = @NewPcpKey AND NameIdentifier = 3800003;

        INSERT INTO PersonCenteredPlanModule.DomainNeed (
            DomainNeedKey, Version, DomainKey, NeedKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT NEWID(), 1, @FirstDomainKey, NewKey,
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1',
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1'
        FROM @NeedMap;
        PRINT '  DomainNeed: 3';

        -- Goal (1 record)
        DECLARE @NewGoalKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO PersonCenteredPlanModule.Goal (
            GoalKey, Version, PersonCenteredPlanKey, Description,
            OriginalGoalKey, PreviousGoalKey, ProgressPercentage, ProgressReviewNote,
            StatusDate, OutcomeNote, TargetDate,
            WaiverProviderDescription, NaturalSupportsDescription, NoLongerNeedSupportNote, NonWaiverServiceDescription,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            DoesThisGoalAddressNeedDisplayName, DoesThisGoalAddressNeedIdentifier, DoesThisGoalAddressNeedCodeSystemIdentifier,
            DoesThisGoalHaveBarrierDisplayName, DoesThisGoalHaveBarrierIdentifier, DoesThisGoalHaveBarrierCodeSystemIdentifier,
            NaturalSupportsAvailableDisplayName, NaturalSupportsAvailableIdentifier, NaturalSupportsAvailableCodeSystemIdentifier,
            NonWaiverServiceAvailableDisplayName, NonWaiverServiceAvailableIdentifier, NonWaiverServiceAvailableCodeSystemIdentifier,
            WaiverProviderNeededDisplayName, WaiverProviderNeededIdentifier, WaiverProviderNeededCodeSystemIdentifier,
            PriorityDisplayName, PriorityIdentifier, PriorityCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewGoalKey, 1, @NewPcpKey, Description,
            @NewGoalKey, NULL, ProgressPercentage, ProgressReviewNote,
            StatusDate, OutcomeNote, TargetDate,
            WaiverProviderDescription, NaturalSupportsDescription, NoLongerNeedSupportNote, NonWaiverServiceDescription,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            DoesThisGoalAddressNeedDisplayName, DoesThisGoalAddressNeedIdentifier, DoesThisGoalAddressNeedCodeSystemIdentifier,
            DoesThisGoalHaveBarrierDisplayName, DoesThisGoalHaveBarrierIdentifier, DoesThisGoalHaveBarrierCodeSystemIdentifier,
            NaturalSupportsAvailableDisplayName, NaturalSupportsAvailableIdentifier, NaturalSupportsAvailableCodeSystemIdentifier,
            NonWaiverServiceAvailableDisplayName, NonWaiverServiceAvailableIdentifier, NonWaiverServiceAvailableCodeSystemIdentifier,
            WaiverProviderNeededDisplayName, WaiverProviderNeededIdentifier, WaiverProviderNeededCodeSystemIdentifier,
            PriorityDisplayName, PriorityIdentifier, PriorityCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.Goal WHERE PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  Goal: 1';

        -- NeedGoal (link Goal to Need 3 = Medical Equipment/Supplies, NameId 4900013)
        DECLARE @Need3Key UNIQUEIDENTIFIER;
        SELECT @Need3Key = NewKey FROM @NeedMap WHERE NameIdentifier = 4900013;
        INSERT INTO PersonCenteredPlanModule.NeedGoal (NeedGoalKey, Version, NeedKey, GoalKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
        VALUES (NEWID(), 1, @Need3Key, @NewGoalKey, 'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1', 'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1');
        PRINT '  NeedGoal: 1';

        -- PlannedService (1 record)
        DECLARE @NewPSKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO PersonCenteredPlanModule.PlannedService (
            PlannedServiceKey, Version, PersonCenteredPlanKey,
            OriginalPlannedServiceKey, PreviousPlannedServiceKey,
            RateAmount, RateInputAmountValue, TotalCostValue, TotalUnitCount, UnitCount, DurationLength, HourPerWeekCount,
            EffectiveDateStartDate, EffectiveDateEndDate,
            FrequencyTypeDisplayName, FrequencyTypeIdentifier, FrequencyTypeCodeSystemIdentifier,
            ServiceDefinitionKey, ServiceName,
            ServiceProcedureCodeDisplayName, ServiceProcedureCodeIdentifier, ServiceProcedureCodeCodeSystemIdentifier,
            ProviderLocationKey,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            IsNeedManualMassAdjustment,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewPSKey, 1, @NewPcpKey,
            @NewPSKey, NULL,
            RateAmount, RateInputAmountValue, TotalCostValue, TotalUnitCount, UnitCount, DurationLength, HourPerWeekCount,
            EffectiveDateStartDate, EffectiveDateEndDate,
            FrequencyTypeDisplayName, FrequencyTypeIdentifier, FrequencyTypeCodeSystemIdentifier,
            ServiceDefinitionKey, ServiceName,
            ServiceProcedureCodeDisplayName, ServiceProcedureCodeIdentifier, ServiceProcedureCodeCodeSystemIdentifier,
            ProviderLocationKey,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            IsNeedManualMassAdjustment,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.PlannedService WHERE PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  PlannedService: 1';

        -- GoalService
        INSERT INTO PersonCenteredPlanModule.GoalService (GoalServiceKey, Version, GoalKey, PlannedServiceKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
        VALUES (NEWID(), 1, @NewGoalKey, @NewPSKey, 'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1', 'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1');
        PRINT '  GoalService: 1';

        -- ServiceAuthorization + ServiceLine + Decision (links PlannedService to Budget)
        DECLARE @NewSAKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @NewSLKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO ServiceAuthorizationModule.ServiceAuthorization (
            ServiceAuthorizationKey, Version, CaseKey, ProgramKey,
            PersonCenteredPlanKeyReference, ProvenanceSourceIdentifier,
            CaseManagerName, OriginalServiceAuthorizationKeyReference, ServiceAuthorizationNumber,
            CreateByServiceAuthorizationTypeDisplayName, CreateByServiceAuthorizationTypeIdentifier, CreateByServiceAuthorizationTypeCodeSystemIdentifier,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            ProviderReferenceLocationKey, ProviderReferenceName, ProviderReferenceNationalProviderIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewSAKey, 1, @CaseKey, ProgramKey,
            @NewPcpKey, CAST(@NewPcpKey AS NVARCHAR(36)),
            CaseManagerName, NULL, ServiceAuthorizationNumber,
            CreateByServiceAuthorizationTypeDisplayName, CreateByServiceAuthorizationTypeIdentifier, CreateByServiceAuthorizationTypeCodeSystemIdentifier,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            ProviderReferenceLocationKey, ProviderReferenceName, ProviderReferenceNationalProviderIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM ServiceAuthorizationModule.ServiceAuthorization
        WHERE ServiceAuthorizationKey = '7B655E96-356B-49C2-80E2-B47B00F4F9AA';

        INSERT INTO ServiceAuthorizationModule.ServiceLine (
            ServiceLineKey, Version, ServiceAuthorizationKey, PlannedServiceKey, ServiceDefinitionKey,
            IsNeedManualMassAdjustment, LineNumber, Note, RequestReceivedDate, ReviewedDate,
            AuthorizedDurationLength, AuthorizedRateAmount, AuthorizedTotalCostAmount, AuthorizedTotalUnitCount, AuthorizedUnitCount,
            AuthorizedEffectiveDateEndDate, AuthorizedEffectiveDateStartDate,
            AuthorizedFrequencyDisplayName, AuthorizedFrequencyIdentifier, AuthorizedFrequencyCodeSystemIdentifier,
            RequestedDurationLength, RequestedRateAmount, RequestedTotalCostAmount, RequestedTotalUnitCount, RequestedUnitCount,
            RequestedEffectiveDateEndDate, RequestedEffectiveDateStartDate,
            RequestedFrequencyDisplayName, RequestedFrequencyIdentifier, RequestedFrequencyCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewSLKey, 1, @NewSAKey, @NewPSKey, ServiceDefinitionKey,
            IsNeedManualMassAdjustment, LineNumber, Note, RequestReceivedDate, ReviewedDate,
            AuthorizedDurationLength, AuthorizedRateAmount, AuthorizedTotalCostAmount, AuthorizedTotalUnitCount, AuthorizedUnitCount,
            AuthorizedEffectiveDateEndDate, AuthorizedEffectiveDateStartDate,
            AuthorizedFrequencyDisplayName, AuthorizedFrequencyIdentifier, AuthorizedFrequencyCodeSystemIdentifier,
            RequestedDurationLength, RequestedRateAmount, RequestedTotalCostAmount, RequestedTotalUnitCount, RequestedUnitCount,
            RequestedEffectiveDateEndDate, RequestedEffectiveDateStartDate,
            RequestedFrequencyDisplayName, RequestedFrequencyIdentifier, RequestedFrequencyCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM ServiceAuthorizationModule.ServiceLine
        WHERE ServiceLineKey = '6766E363-F4D6-4EB2-AFB2-B47B00F4F9ED';

        INSERT INTO ServiceAuthorizationModule.Decision (
            DecisionKey, Version, ServiceLineKey, ClaimNote, DecisionDate,
            SupervisorName, SupervisorReviewDate,
            ReasonDisplayName, ReasonIdentifier, ReasonCodeSystemIdentifier,
            ReviewedByDisplayName, ReviewedByKeyReference,
            ReviewNeededDisplayName, ReviewNeededIdentifier, ReviewNeededCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), 1, @NewSLKey, ClaimNote, DecisionDate,
            SupervisorName, SupervisorReviewDate,
            ReasonDisplayName, ReasonIdentifier, ReasonCodeSystemIdentifier,
            ReviewedByDisplayName, ReviewedByKeyReference,
            ReviewNeededDisplayName, ReviewNeededIdentifier, ReviewNeededCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM ServiceAuthorizationModule.Decision
        WHERE ServiceLineKey = '6766E363-F4D6-4EB2-AFB2-B47B00F4F9ED';
        PRINT '  ServiceAuthorization + ServiceLine + Decision: done';

        -- Intervention (1 record)
        DECLARE @NewIntKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO PersonCenteredPlanModule.Intervention (
            InterventionKey, Version, PersonCenteredPlanKey, Description,
            OriginalInterventionKey, PreviousInterventionKey,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewIntKey, 1, @NewPcpKey, Description,
            @NewIntKey, NULL,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.Intervention WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

        -- InterventionGoal
        INSERT INTO PersonCenteredPlanModule.InterventionGoal (InterventionGoalKey, Version, InterventionKey, GoalKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
        VALUES (NEWID(), 1, @NewIntKey, @NewGoalKey, 'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1', 'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1');
        PRINT '  Intervention + InterventionGoal: done';

        -- PersonCenteredPlanProviders
        INSERT INTO PersonCenteredPlanModule.PersonCenteredPlanProviders (
            PersonCenteredPlanKey, LocationKey,
            AssignmentTypeCodeSystemIdentifier, AssignmentTypeDisplayName, AssignmentTypeIdentifier
        )
        SELECT @NewPcpKey, LocationKey,
            AssignmentTypeCodeSystemIdentifier, AssignmentTypeDisplayName, AssignmentTypeIdentifier
        FROM PersonCenteredPlanModule.PersonCenteredPlanProviders
        WHERE PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  PcpProviders: 1';

        -- Meeting
        DECLARE @NewMeetKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO PersonCenteredPlanModule.Meeting (
            MeetingKey, Version, PersonCenteredPlanKey,
            OriginalMeetingKey, PreviousMeetingKey, SignatureContextKey,
            AppointmentDisplayName, AppointmentKey,
            ChoseAttendeesDescription, MeetingTimeAndLocationDisagreedDescription, NarrativeNote, UnwantedAttendeesDescription,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewMeetKey, 1, @NewPcpKey,
            @NewMeetKey, NULL, NULL,
            AppointmentDisplayName, NULL,
            ChoseAttendeesDescription, MeetingTimeAndLocationDisagreedDescription, NarrativeNote, UnwantedAttendeesDescription,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.Meeting WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

        -- MeetingPreference
        INSERT INTO PersonCenteredPlanModule.MeetingPreference (
            MeetingPreferenceKey, Version, MeetingKey,
            CaseManagersDescriptionNote, Comments, DidAskForHelpWithMyMeetingDescription,
            InformedAdvocateCanAttendDescription, NeedHelpPlanningMeetingDescription,
            OtherDescription, WantToHaveAtMeetingDescription, WhyNotNoteDescription,
            DidAskHelpWithMyMeetTypeDisplayName, DidAskHelpWithMyMeetTypeIdentifier, DidAskHelpWithMyMeetTypeCodeSystemIdentifier,
            DidDecideToReceiveAnAdvocateDisplayName, DidDecideToReceiveAnAdvocateIdentifier, DidDecideToReceiveAnAdvocateCodeSystemIdentifier,
            DidFacilitateMyMeetingDisplayName, DidFacilitateMyMeetingIdentifier, DidFacilitateMyMeetingCodeSystemIdentifier,
            DidParticipateInMyMeetingDisplayName, DidParticipateInMyMeetingIdentifier, DidParticipateInMyMeetingCodeSystemIdentifier,
            DidReceiveThisHelpDisplayName, DidReceiveThisHelpIdentifier, DidReceiveThisHelpCodeSystemIdentifier,
            ReasonWhyTypeDisplayName, ReasonWhyTypeIdentifier, ReasonWhyTypeCodeSystemIdentifier,
            WasInformedAdvocateCanAttendDisplayName, WasInformedAdvocateCanAttendIdentifier, WasInformedAdvocateCanAttendCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), 1, @NewMeetKey,
            CaseManagersDescriptionNote, Comments, DidAskForHelpWithMyMeetingDescription,
            InformedAdvocateCanAttendDescription, NeedHelpPlanningMeetingDescription,
            OtherDescription, WantToHaveAtMeetingDescription, WhyNotNoteDescription,
            DidAskHelpWithMyMeetTypeDisplayName, DidAskHelpWithMyMeetTypeIdentifier, DidAskHelpWithMyMeetTypeCodeSystemIdentifier,
            DidDecideToReceiveAnAdvocateDisplayName, DidDecideToReceiveAnAdvocateIdentifier, DidDecideToReceiveAnAdvocateCodeSystemIdentifier,
            DidFacilitateMyMeetingDisplayName, DidFacilitateMyMeetingIdentifier, DidFacilitateMyMeetingCodeSystemIdentifier,
            DidParticipateInMyMeetingDisplayName, DidParticipateInMyMeetingIdentifier, DidParticipateInMyMeetingCodeSystemIdentifier,
            DidReceiveThisHelpDisplayName, DidReceiveThisHelpIdentifier, DidReceiveThisHelpCodeSystemIdentifier,
            ReasonWhyTypeDisplayName, ReasonWhyTypeIdentifier, ReasonWhyTypeCodeSystemIdentifier,
            WasInformedAdvocateCanAttendDisplayName, WasInformedAdvocateCanAttendIdentifier, WasInformedAdvocateCanAttendCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.MeetingPreference
        WHERE MeetingKey = 'BB4B8513-2659-44AF-A776-B47B00F376C5';
        PRINT '  Meeting + MeetingPreference: done';

        -- Appointment (linked to PCP via ActivityKeyReference)
        -- Delete existing appointments for this case
        DELETE FROM AppointmentModule.AppointmentAttributes WHERE AppointmentKey IN (SELECT AppointmentKey FROM AppointmentModule.Appointment WHERE CaseKey = @CaseKey);
        DELETE FROM AppointmentModule.AppointmentRecurrence WHERE AppointmentKey IN (SELECT AppointmentKey FROM AppointmentModule.Appointment WHERE CaseKey = @CaseKey);
        DELETE FROM AppointmentModule.Appointment WHERE CaseKey = @CaseKey;

        -- Insert from blueprint, replacing CaseKey and ActivityKeyReference
        DECLARE @NewApptKey UNIQUEIDENTIFIER = NEWID();
        INSERT INTO AppointmentModule.Appointment (
            AppointmentKey, Version, CaseKey, ExceptionReasonDescription, HasRecurring,
            IsDateTimeRangeApproximate, Note, SubjectName,
            ActivityKeyReference, ActivityClrTypeDisplayName, ActivityClrTypeFullName,
            AreaDisplayName, AreaIdentifier, AreaCodeSystemIdentifier,
            CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            DateTimeRangeEndDateTime, DateTimeRangeStartDateTime,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            @NewApptKey, 1, @CaseKey, ExceptionReasonDescription, HasRecurring,
            IsDateTimeRangeApproximate, Note, SubjectName,
            @NewPcpKey, ActivityClrTypeDisplayName, ActivityClrTypeFullName,
            AreaDisplayName, AreaIdentifier, AreaCodeSystemIdentifier,
            CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            DateTimeRangeEndDateTime, DateTimeRangeStartDateTime,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM AppointmentModule.Appointment
        WHERE CaseKey = @BlueprintCaseKey;
        PRINT '  Appointment: 1';

        -- Update Meeting.AppointmentKey to point to the new appointment
        UPDATE PersonCenteredPlanModule.Meeting
        SET AppointmentKey = @NewApptKey
        WHERE MeetingKey = @NewMeetKey;

        -- MyPlanToAddressSafetyNeeds
        INSERT INTO PersonCenteredPlanModule.MyPlanToAddressSafetyNeeds (
            MyPlanToAddressSafetyNeedsKey, Version, PersonCenteredPlanKey,
            MyBackupPlanNote, MyPlanToAddressNeedsNote,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT NEWID(), 1, @NewPcpKey,
            MyBackupPlanNote, MyPlanToAddressNeedsNote,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.MyPlanToAddressSafetyNeeds
        WHERE PersonCenteredPlanKey = @BlueprintPcpKey;
        PRINT '  MyPlanToAddressSafetyNeeds: 1';

        -- AboutMeDescription (11 records) - staging for self-ref FK
        DECLARE @AboutMeStaging TABLE (
            NewKey UNIQUEIDENTIFIER DEFAULT NEWID(),
            CategoryDisplayName NVARCHAR(MAX), CategoryIdentifier BIGINT, CategoryCodeSystemIdentifier BIGINT,
            TypeDisplayName NVARCHAR(MAX), TypeIdentifier BIGINT, TypeCodeSystemIdentifier BIGINT,
            EntityCreatedUserContextKey UNIQUEIDENTIFIER, EntityUpdatedUserContextKey UNIQUEIDENTIFIER
        );
        INSERT INTO @AboutMeStaging (CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey)
        SELECT CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey
        FROM PersonCenteredPlanModule.AboutMeDescription WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

        INSERT INTO PersonCenteredPlanModule.AboutMeDescription (
            AboutMeDescriptionKey, Version, PersonCenteredPlanKey,
            OriginalAboutMeDescriptionKey, PreviousAboutMeDescriptionKey, DomainKey,
            CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NewKey, 1, @NewPcpKey,
            NewKey, NULL, NULL, -- OriginalKey = self
            CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey
        FROM @AboutMeStaging;
        PRINT '  AboutMeDescription: 11';

        -- CompletionContext + Requirements (marks the ISP as 100% complete/activated)
        DECLARE @NewCompCtxKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @BlueprintCompCtxKey UNIQUEIDENTIFIER = '0F5340AF-96CC-4ED4-9AA8-B47B00F376F2';

        INSERT INTO CompletionModule.CompletionContext (
            CompletionContextKey, Version, AggregateKeyReference, AggregateName, CompletionPercentage
        )
        VALUES (@NewCompCtxKey, 1, @NewPcpKey, 'PersonCenteredPlanModule.PersonCenteredPlan', 100.0);

        INSERT INTO CompletionModule.Requirement (
            RequirementKey, Version, IsComplete, CompletionContextKey,
            CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            ReasonDescription, RuleName, WeightValue
        )
        SELECT
            NEWID(), Version, IsComplete, @NewCompCtxKey,
            CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            ReasonDescription, RuleName, WeightValue
        FROM CompletionModule.Requirement
        WHERE CompletionContextKey = @BlueprintCompCtxKey;
        PRINT '  CompletionContext + Requirements: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- SignatureContext + Signatures (activates/signs the plan)
        DECLARE @NewSigCtxKey UNIQUEIDENTIFIER = NEWID();
        DECLARE @BlueprintSigCtxKey UNIQUEIDENTIFIER = 'AC689BB6-3B28-446B-AA45-B47B00F37ABF';

        INSERT INTO SignatureModule.SignatureContext (
            SignatureContextKey, Version, CaseActivityKeyReference, PreviousSignatureContextKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        VALUES (@NewSigCtxKey, 1, @NewPcpKey, NULL,
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1',
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1');

        INSERT INTO SignatureModule.Signature (
            SignatureKey, Version, CredentialsDescription, DocumentSentToMeDate,
            DoesSignatureHasBeenVerified, FileKey, IsRequired, Note, PreviousSignatureKey,
            PrintName, SecondAttemptToObtainSignatureDate, SignatureRequestedDate, SignedDate, Title, WitnessName,
            SignatureContextKey,
            CertifyMessageDisplayName, CertifyMessageIdentifier, CertifyMessageCodeSystemIdentifier,
            LocationDisplayName, LocationKey,
            MethodOfSharingDocumentDisplayName, MethodOfSharingDocumentIdentifier, MethodOfSharingDocumentCodeSystemIdentifier,
            SignatureObtainedDisplayName, SignatureObtainedIdentifier, SignatureObtainedCodeSystemIdentifier,
            SignatureTypeDisplayName, SignatureTypeIdentifier, SignatureTypeCodeSystemIdentifier,
            SignerTypeDisplayName, SignerTypeIdentifier, SignerTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey,
            AttemptsMadeDescription
        )
        SELECT
            NEWID(), 1, CredentialsDescription, DocumentSentToMeDate,
            DoesSignatureHasBeenVerified, NULL, IsRequired, Note, NULL,
            PrintName, SecondAttemptToObtainSignatureDate, SignatureRequestedDate, SignedDate, Title, WitnessName,
            @NewSigCtxKey,
            CertifyMessageDisplayName, CertifyMessageIdentifier, CertifyMessageCodeSystemIdentifier,
            LocationDisplayName, LocationKey,
            MethodOfSharingDocumentDisplayName, MethodOfSharingDocumentIdentifier, MethodOfSharingDocumentCodeSystemIdentifier,
            SignatureObtainedDisplayName, SignatureObtainedIdentifier, SignatureObtainedCodeSystemIdentifier,
            SignatureTypeDisplayName, SignatureTypeIdentifier, SignatureTypeCodeSystemIdentifier,
            SignerTypeDisplayName, SignerTypeIdentifier, SignerTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey,
            AttemptsMadeDescription
        FROM SignatureModule.Signature
        WHERE SignatureContextKey = @BlueprintSigCtxKey;

        -- Update PCP to point to the new SignatureContext
        UPDATE PersonCenteredPlanModule.PersonCenteredPlan
        SET SignatureContextKey = @NewSigCtxKey
        WHERE PersonCenteredPlanKey = @NewPcpKey;
        PRINT '  SignatureContext + Signatures: done';

        -- CaseActivityInstance registrations (UI activity registry)
        DECLARE @NextCaiId BIGINT;
        SELECT @NextCaiId = ISNULL(MAX(Identifier), 0) FROM CaseActivityModule.CaseActivityInstance;

        -- Register the new PCP
        SET @NextCaiId = @NextCaiId + 1;
        INSERT INTO CaseActivityModule.CaseActivityInstance (
            CaseActivityInstanceKey, Version, CaseActivityKeyReference, CaseKey,
            RegistrationStatusEnum, IsActive, Identifier, ProgramKeyReference,
            ActivityTypeDisplayName, ActivityTypeIdentifier, ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName, ClrTypeDisplayName, ClrTypeFullName,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey, IsSharedWithPerson
        )
        SELECT
            NEWID(), 1, @NewPcpKey, @CaseKey,
            RegistrationStatusEnum, IsActive, @NextCaiId, ProgramKeyReference,
            ActivityTypeDisplayName, ActivityTypeIdentifier, ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName, ClrTypeDisplayName, ClrTypeFullName,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey, IsSharedWithPerson
        FROM CaseActivityModule.CaseActivityInstance
        WHERE CaseActivityKeyReference = @BlueprintPcpKey AND CaseKey = @BlueprintCaseKey;

        -- Register the new BudgetLedger
        SET @NextCaiId = @NextCaiId + 1;
        INSERT INTO CaseActivityModule.CaseActivityInstance (
            CaseActivityInstanceKey, Version, CaseActivityKeyReference, CaseKey,
            RegistrationStatusEnum, IsActive, Identifier, ProgramKeyReference,
            ActivityTypeDisplayName, ActivityTypeIdentifier, ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName, ClrTypeDisplayName, ClrTypeFullName,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey, IsSharedWithPerson
        )
        SELECT
            NEWID(), 1, @NewBudgetLedgerKey, @CaseKey,
            RegistrationStatusEnum, IsActive, @NextCaiId, ProgramKeyReference,
            ActivityTypeDisplayName, ActivityTypeIdentifier, ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName, ClrTypeDisplayName, ClrTypeFullName,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey, IsSharedWithPerson
        FROM CaseActivityModule.CaseActivityInstance
        WHERE CaseActivityKeyReference = 'FA583AB6-229A-4DE9-B3ED-B47B00F1323B' AND CaseKey = @BlueprintCaseKey;

        -- Register the new ServiceAuthorization
        SET @NextCaiId = @NextCaiId + 1;
        INSERT INTO CaseActivityModule.CaseActivityInstance (
            CaseActivityInstanceKey, Version, CaseActivityKeyReference, CaseKey,
            RegistrationStatusEnum, IsActive, Identifier, ProgramKeyReference,
            ActivityTypeDisplayName, ActivityTypeIdentifier, ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName, ClrTypeDisplayName, ClrTypeFullName,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey, IsSharedWithPerson
        )
        SELECT
            NEWID(), 1, @NewSAKey, @CaseKey,
            RegistrationStatusEnum, IsActive, @NextCaiId, ProgramKeyReference,
            ActivityTypeDisplayName, ActivityTypeIdentifier, ActivityTypeCodeSystemIdentifier,
            ClrTypeAssemblyQualifiedName, ClrTypeDisplayName, ClrTypeFullName,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey, IsSharedWithPerson
        FROM CaseActivityModule.CaseActivityInstance
        WHERE CaseActivityKeyReference = '7B655E96-356B-49C2-80E2-B47B00F4F9AA' AND CaseKey = @BlueprintCaseKey;
        PRINT '  CaseActivityInstance registrations: done';

        PRINT '  ISP rebuild complete!';
        PRINT '';

        -- ==========================================================
        -- COMMIT
        -- ==========================================================
        COMMIT TRANSACTION;
        PRINT '=== RESET COMPLETE ===';
        PRINT 'Person now matches blueprint: 1829357f-3e6c-44df-a0a9-b47b00f112e4';
        RETURN 0;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrSev INT = ERROR_SEVERITY();
        DECLARE @ErrState INT = ERROR_STATE();
        PRINT '';
        PRINT '=== ERROR - TRANSACTION ROLLED BACK ===';
        PRINT 'Error: ' + @Err;
        PRINT 'Line:  ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'PersonKey: ' + CAST(@PersonKey AS NVARCHAR(36));
        RAISERROR(@Err, @ErrSev, @ErrState);
        RETURN -1;
    END CATCH
END
GO

-- ============================================================
-- USAGE:
-- EXEC dbo.test_ResetPersonToPristineState @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd', @DryRun = 0;
-- ============================================================
