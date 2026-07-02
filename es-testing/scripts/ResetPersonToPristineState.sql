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
    @BlueprintPersonKey UNIQUEIDENTIFIER = '1829357f-3e6c-44df-a0a9-b47b00f112e4',
    @DryRun BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- Derive blueprint keys dynamically
    DECLARE @BlueprintCaseKey UNIQUEIDENTIFIER;
    SELECT @BlueprintCaseKey = CaseKey FROM CaseModule.[Case] WHERE PersonKey = @BlueprintPersonKey;
    IF @BlueprintCaseKey IS NULL BEGIN PRINT 'ERROR: Blueprint Case not found.'; RETURN -1; END

    DECLARE @BlueprintPcpKey UNIQUEIDENTIFIER;
    SELECT TOP 1 @BlueprintPcpKey = PersonCenteredPlanKey
    FROM PersonCenteredPlanModule.PersonCenteredPlan
    WHERE CaseKey = @BlueprintCaseKey AND TypeDisplayName = 'Initial'
    ORDER BY EntityCreatedTimestamp DESC;
    IF @BlueprintPcpKey IS NULL BEGIN PRINT 'ERROR: Blueprint ISP not found.'; RETURN -1; END

    -- Derive other blueprint keys dynamically
    DECLARE @BlueprintPcpExtKey UNIQUEIDENTIFIER;
    SELECT @BlueprintPcpExtKey = PersonCenteredPlanExtensionKey
    FROM CustomerPersonCenteredPlanModule.PersonCenteredPlanExtension WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

    DECLARE @BlueprintEBPKey UNIQUEIDENTIFIER;
    SELECT @BlueprintEBPKey = EmergencyBackupPlanKey
    FROM CustomerPersonCenteredPlanModule.EmergencyBackupPlan WHERE PersonCenteredPlanExtensionKey = @BlueprintPcpExtKey;

    DECLARE @BlueprintMeetingKey UNIQUEIDENTIFIER;
    SELECT @BlueprintMeetingKey = MeetingKey
    FROM PersonCenteredPlanModule.Meeting WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

    DECLARE @BlueprintSAKey UNIQUEIDENTIFIER;
    SELECT @BlueprintSAKey = ServiceAuthorizationKey
    FROM ServiceAuthorizationModule.ServiceAuthorization WHERE CaseKey = @BlueprintCaseKey;

    DECLARE @BlueprintSLKey UNIQUEIDENTIFIER;
    SELECT @BlueprintSLKey = ServiceLineKey
    FROM ServiceAuthorizationModule.ServiceLine WHERE ServiceAuthorizationKey = @BlueprintSAKey;

    DECLARE @BlueprintBudgetLedgerKey UNIQUEIDENTIFIER;
    SELECT @BlueprintBudgetLedgerKey = BudgetLedgerKey
    FROM BudgetManagementModule.BudgetLedger WHERE CaseKey = @BlueprintCaseKey AND IsDiscarded = 0;

    DECLARE @BlueprintCompCtxKey UNIQUEIDENTIFIER;
    SELECT @BlueprintCompCtxKey = CompletionContextKey
    FROM CompletionModule.CompletionContext WHERE AggregateKeyReference = @BlueprintPcpKey;

    DECLARE @BlueprintSigCtxKey UNIQUEIDENTIFIER;
    SELECT @BlueprintSigCtxKey = SignatureContextKey
    FROM PersonCenteredPlanModule.PersonCenteredPlan WHERE PersonCenteredPlanKey = @BlueprintPcpKey;

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
            WHERE CaseKey = @CaseKey AND ClrTypeDisplayName IN ('Person Centered Plan', 'Budget Ledger', 'Service Authorization', 'Program Enrollment');

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
        WHERE BudgetLedgerKey = @BlueprintBudgetLedgerKey;
        PRINT '  BudgetEntry: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));
        PRINT '';

        -- ==========================================================
        -- PART B3: DELETE AND REBUILD FORMS (CaseCustomFormInstance)
        -- ==========================================================
        PRINT '--- Part B3: Forms Cleanup & Rebuild ---';

        -- Collect target's CustomFormInstanceKeys
        DECLARE @TargetCFI TABLE (K UNIQUEIDENTIFIER);
        INSERT INTO @TargetCFI SELECT CustomFormInstanceKey
        FROM CustomFormModule.CaseCustomFormInstance WHERE CaseKey = @CaseKey;

        -- Collect target's FieldAnswerBaseKeys
        DECLARE @TargetFAB TABLE (K UNIQUEIDENTIFIER);
        INSERT INTO @TargetFAB SELECT FieldAnswerBaseKey
        FROM CustomFormModule.FieldAnswerBase WHERE CustomFormInstanceKey IN (SELECT K FROM @TargetCFI);

        -- Delete answer children
        DELETE FROM CustomFormModule.SimpleMultiSelectFieldAnswerAnswers WHERE SimpleMultiSelectFieldAnswerKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.SimpleSingleSelectFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.TextFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.DateFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.NumericFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.TimeFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.LikertScaleFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.AggregateSingleSelectFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        DELETE FROM CustomFormModule.SimpleMultiSelectFieldAnswer WHERE FieldAnswerBaseKey IN (SELECT K FROM @TargetFAB);
        -- Break self-ref FK on FieldAnswerBase
        UPDATE CustomFormModule.FieldAnswerBase SET PreviousFieldAnswerBaseKey = NULL WHERE CustomFormInstanceKey IN (SELECT K FROM @TargetCFI);
        DELETE FROM CustomFormModule.FieldAnswerBase WHERE CustomFormInstanceKey IN (SELECT K FROM @TargetCFI);
        -- Delete CaseActivityInstance for forms
        DELETE FROM CaseActivityModule.CaseActivityInstance
        WHERE CaseKey = @CaseKey AND ClrTypeDisplayName = 'Case Custom Form Instance';
        -- Break self-ref on CaseCustomFormInstance and CustomFormInstance
        UPDATE CustomFormModule.CaseCustomFormInstance SET PreviousCaseCustomFormInstanceKey = NULL WHERE CaseKey = @CaseKey;
        DELETE FROM CustomFormModule.CaseCustomFormInstance WHERE CaseKey = @CaseKey;
        UPDATE CustomFormModule.CustomFormInstance SET PreviousCustomFormInstanceKey = NULL WHERE CustomFormInstanceKey IN (SELECT K FROM @TargetCFI);
        DELETE FROM CustomFormModule.CustomFormInstance WHERE CustomFormInstanceKey IN (SELECT K FROM @TargetCFI);
        PRINT '  Forms deleted';

        -- Rebuild from blueprint: 2 forms (IRIS Intake + LTC Needs Assessment)
        -- For each form: CustomFormInstance → CaseCustomFormInstance → FieldAnswerBase → typed answers
        DECLARE @BlueprintCFI TABLE (OldCFIKey UNIQUEIDENTIFIER, NewCFIKey UNIQUEIDENTIFIER, OldCCFIKey UNIQUEIDENTIFIER, NewCCFIKey UNIQUEIDENTIFIER, FormType NVARCHAR(MAX));
        INSERT INTO @BlueprintCFI (OldCFIKey, NewCFIKey, OldCCFIKey, NewCCFIKey, FormType)
        SELECT ccfi.CustomFormInstanceKey, NEWID(), ccfi.CaseCustomFormInstanceKey, NEWID(), ccfi.FormTypeDisplayName
        FROM CustomFormModule.CaseCustomFormInstance ccfi WHERE ccfi.CaseKey = @BlueprintCaseKey;

        -- Insert CustomFormInstance records
        INSERT INTO CustomFormModule.CustomFormInstance (
            CustomFormInstanceKey, Version, AggregateKeyReference, CustomFormDefinitionKey,
            PreviousCustomFormInstanceKey, ScoreValue, ScoreRangeDisplayName, ScoreRangeKeyReference,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            bc.NewCFIKey, 1, NULL, cfi.CustomFormDefinitionKey,
            NULL, cfi.ScoreValue, cfi.ScoreRangeDisplayName, cfi.ScoreRangeKeyReference,
            'feiadmin', @Now, cfi.EntityCreatedUserContextKey,
            'feiadmin', @Now, cfi.EntityUpdatedUserContextKey
        FROM @BlueprintCFI bc
        JOIN CustomFormModule.CustomFormInstance cfi ON cfi.CustomFormInstanceKey = bc.OldCFIKey;

        -- Insert CaseCustomFormInstance records
        INSERT INTO CustomFormModule.CaseCustomFormInstance (
            CaseCustomFormInstanceKey, Version, CustomFormInstanceKey,
            PreviousCaseCustomFormInstanceKey, ProgramKey, CaseKey,
            FormTypeDisplayName, FormTypeIdentifier, FormTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            bc.NewCCFIKey, 1, bc.NewCFIKey,
            NULL, ccfi.ProgramKey, @CaseKey,
            ccfi.FormTypeDisplayName, ccfi.FormTypeIdentifier, ccfi.FormTypeCodeSystemIdentifier,
            'feiadmin', @Now, ccfi.EntityCreatedUserContextKey,
            'feiadmin', @Now, ccfi.EntityUpdatedUserContextKey
        FROM @BlueprintCFI bc
        JOIN CustomFormModule.CaseCustomFormInstance ccfi ON ccfi.CaseCustomFormInstanceKey = bc.OldCCFIKey;
        PRINT '  Forms inserted';

        -- Insert FieldAnswerBase + typed answers for each form
        -- Use a staging table to map old FAB keys to new ones
        DECLARE @FABMap TABLE (OldKey UNIQUEIDENTIFIER, NewKey UNIQUEIDENTIFIER, OldCFIKey UNIQUEIDENTIFIER, NewCFIKey UNIQUEIDENTIFIER);
        INSERT INTO @FABMap (OldKey, NewKey, OldCFIKey, NewCFIKey)
        SELECT fab.FieldAnswerBaseKey, NEWID(), fab.CustomFormInstanceKey, bc.NewCFIKey
        FROM CustomFormModule.FieldAnswerBase fab
        JOIN @BlueprintCFI bc ON bc.OldCFIKey = fab.CustomFormInstanceKey;

        INSERT INTO CustomFormModule.FieldAnswerBase (
            FieldAnswerBaseKey, Version, CustomFormElementDefinitionBaseKey, IndexNumber,
            PreviousFieldAnswerBaseKey, CustomFormInstanceKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey, IsRequired
        )
        SELECT
            fm.NewKey, fab.Version, fab.CustomFormElementDefinitionBaseKey, fab.IndexNumber,
            NULL, fm.NewCFIKey,
            'feiadmin', @Now, fab.EntityCreatedUserContextKey,
            'feiadmin', @Now, fab.EntityUpdatedUserContextKey, fab.IsRequired
        FROM @FABMap fm
        JOIN CustomFormModule.FieldAnswerBase fab ON fab.FieldAnswerBaseKey = fm.OldKey;

        -- Copy typed answers using the key mapping
        INSERT INTO CustomFormModule.TextFieldAnswer (FieldAnswerBaseKey, Note)
        SELECT fm.NewKey, tfa.Note
        FROM CustomFormModule.TextFieldAnswer tfa
        JOIN @FABMap fm ON fm.OldKey = tfa.FieldAnswerBaseKey;

        INSERT INTO CustomFormModule.DateFieldAnswer (FieldAnswerBaseKey, DateTime)
        SELECT fm.NewKey, dfa.DateTime
        FROM CustomFormModule.DateFieldAnswer dfa
        JOIN @FABMap fm ON fm.OldKey = dfa.FieldAnswerBaseKey;

        INSERT INTO CustomFormModule.SimpleSingleSelectFieldAnswer (FieldAnswerBaseKey, OptionCode, OptionDisplayName, OptionDisplayOrderNumber, OptionScore)
        SELECT fm.NewKey, ssfa.OptionCode, ssfa.OptionDisplayName, ssfa.OptionDisplayOrderNumber, ssfa.OptionScore
        FROM CustomFormModule.SimpleSingleSelectFieldAnswer ssfa
        JOIN @FABMap fm ON fm.OldKey = ssfa.FieldAnswerBaseKey;

        INSERT INTO CustomFormModule.SimpleMultiSelectFieldAnswer (FieldAnswerBaseKey)
        SELECT fm.NewKey
        FROM CustomFormModule.SimpleMultiSelectFieldAnswer smsfa
        JOIN @FABMap fm ON fm.OldKey = smsfa.FieldAnswerBaseKey;

        INSERT INTO CustomFormModule.SimpleMultiSelectFieldAnswerAnswers (SimpleMultiSelectFieldAnswerKey, Code, DisplayName, DisplayOrderNumber, Score, IsRequired)
        SELECT fm.NewKey, smsfaa.Code, smsfaa.DisplayName, smsfaa.DisplayOrderNumber, smsfaa.Score, smsfaa.IsRequired
        FROM CustomFormModule.SimpleMultiSelectFieldAnswerAnswers smsfaa
        JOIN @FABMap fm ON fm.OldKey = smsfaa.SimpleMultiSelectFieldAnswerKey;
        PRINT '  FieldAnswers copied';

        -- Register forms in CaseActivityInstance
        DECLARE @NextFormCaiId BIGINT;
        SELECT @NextFormCaiId = ISNULL(MAX(Identifier), 0) FROM CaseActivityModule.CaseActivityInstance;

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
            NEWID(), 1, bc.NewCCFIKey, @CaseKey,
            cai.RegistrationStatusEnum, cai.IsActive, @NextFormCaiId + ROW_NUMBER() OVER (ORDER BY cai.EntityCreatedTimestamp), cai.ProgramKeyReference,
            cai.ActivityTypeDisplayName, cai.ActivityTypeIdentifier, cai.ActivityTypeCodeSystemIdentifier,
            cai.ClrTypeAssemblyQualifiedName, cai.ClrTypeDisplayName, cai.ClrTypeFullName,
            cai.FormTypeDisplayName, cai.FormTypeIdentifier, cai.FormTypeCodeSystemIdentifier,
            cai.ProvenanceSourceIdentifier, cai.ProvenanceTypeDisplayName, cai.ProvenanceTypeIdentifier, cai.ProvenanceTypeCodeSystemIdentifier,
            'feiadmin', @Now, cai.EntityCreatedUserContextKey,
            'feiadmin', @Now, cai.EntityUpdatedUserContextKey, cai.IsSharedWithPerson
        FROM @BlueprintCFI bc
        JOIN CaseActivityModule.CaseActivityInstance cai ON cai.CaseActivityKeyReference = bc.OldCCFIKey AND cai.CaseKey = @BlueprintCaseKey;
        PRINT '  Form CaseActivityInstances registered';
        PRINT '';

        -- ==========================================================
        -- PART C: RESET LOCATION ASSIGNMENTS (delete all + rebuild)
        -- ==========================================================
        PRINT '--- Part C: LocationAssignment Reset ---';
        -- Delete WorkflowInstances for existing assignments
        DELETE FROM WorkflowModule.WorkflowInstance WHERE AggregateKeyReference IN (
            SELECT PersonLocationAssignmentKey FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey);
        UPDATE PersonModule.PersonLocationAssignment SET TransferredFromPersonLocationAssignmentKey = NULL WHERE CaseKey = @CaseKey;
        UPDATE IntakeReferralModule.IntakeReferral SET ReferralSourcePersonLocationAssignmentKey = NULL
        WHERE ReferralSourcePersonLocationAssignmentKey IN (SELECT PersonLocationAssignmentKey FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey);
        DELETE FROM CaseActivityModule.CaseActivityInstance WHERE CaseKey = @CaseKey AND ClrTypeDisplayName = 'Person Location Assignment';
        DELETE FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey;

        INSERT INTO PersonModule.PersonLocationAssignment (
            PersonLocationAssignmentKey, Version, LocationKey, Note, TransferredFromPersonLocationAssignmentKey,
            CaseKey, ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EffectiveDateRangeEndDate, EffectiveDateRangeStartDate,
            InitiatedStaffMemberDisplayName, InitiatedStaffMemberKey,
            PersonLocationAssignmentTypeDisplayName, PersonLocationAssignmentTypeIdentifier, PersonLocationAssignmentTypeCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey, IsProgramManagingLocation
        )
        SELECT
            NEWID(), 1, LocationKey, Note, NULL,
            @CaseKey, ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EffectiveDateRangeEndDate, EffectiveDateRangeStartDate,
            InitiatedStaffMemberDisplayName, InitiatedStaffMemberKey,
            PersonLocationAssignmentTypeDisplayName, PersonLocationAssignmentTypeIdentifier, PersonLocationAssignmentTypeCodeSystemIdentifier,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey, IsProgramManagingLocation
        FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @BlueprintCaseKey;
        PRINT '  Rebuilt: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Create WorkflowInstance for each location assignment (required for UI visibility)
        DELETE FROM WorkflowModule.WorkflowInstance WHERE AggregateKeyReference IN (
            SELECT PersonLocationAssignmentKey FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey);
        INSERT INTO WorkflowModule.WorkflowInstance (
            WorkflowInstanceKey, Version, Comment, WorkflowBindingIdentifier, WorkflowDefinitionIdentifier,
            AggregateKeyReference, AggregateClrTypeDisplayName, AggregateClrTypeFullName,
            CurrentStateDisplayName, CurrentStateName,
            WorkflowTransitionReasonDisplayName, WorkflowTransitionReasonIdentifier, WorkflowTransitionReasonCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), 1, NULL, 'PersonLocationAssignmentWorkflowBindingIdentifier', 'PersonLocationAssignmentWorkflowDefinition',
            pla.PersonLocationAssignmentKey, 'Person Location Assignment',
            'Wpc.Core.Domain.PersonModule.Assignment.PersonLocationAssignmentAggregate.PersonLocationAssignment',
            CASE WHEN pla.EffectiveDateRangeEndDate IS NULL THEN 'Active' ELSE 'Inactive' END,
            CASE WHEN pla.EffectiveDateRangeEndDate IS NULL THEN 'ActiveState' ELSE 'InactiveState' END,
            NULL, NULL, NULL,
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1',
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1'
        FROM PersonModule.PersonLocationAssignment pla WHERE pla.CaseKey = @CaseKey;
        PRINT '  WorkflowInstances for locations created';

        -- Register new location assignments in CaseActivityInstance
        DECLARE @NextLocCaiId BIGINT;
        SELECT @NextLocCaiId = ISNULL(MAX(Identifier), 0) FROM CaseActivityModule.CaseActivityInstance;
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
            NEWID(), 1, pla.PersonLocationAssignmentKey, @CaseKey,
            'Registered', NULL, @NextLocCaiId + ROW_NUMBER() OVER (ORDER BY pla.EffectiveDateRangeStartDate), NULL,
            'Person Location Assignment', 11500002, 1,
            'Wpc.Core.Domain.PersonModule.Assignment.PersonLocationAssignmentAggregate.PersonLocationAssignment, Wpc.Core.Domain, Version=4.43.0.0, Culture=neutral, PublicKeyToken=null',
            'Person Location Assignment',
            'Wpc.Core.Domain.PersonModule.Assignment.PersonLocationAssignmentAggregate.PersonLocationAssignment',
            NULL, NULL, NULL,
            NULL, 'Manual Entry', 12800002, 1,
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1',
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1', NULL
        FROM PersonModule.PersonLocationAssignment pla WHERE pla.CaseKey = @CaseKey;

        PRINT '';

        -- ==========================================================
        -- PART D: RESET STAFF MEMBER ASSIGNMENTS (delete all + rebuild)
        -- ==========================================================
        PRINT '--- Part D: StaffMemberAssignment Reset ---';
        -- Delete WorkflowInstances for existing staff assignments
        DELETE FROM WorkflowModule.WorkflowInstance WHERE AggregateKeyReference IN (
            SELECT PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey);
        UPDATE PersonModule.PersonStaffMemberAssignment SET TransferredFromPersonStaffMemberAssignmentKey = NULL WHERE CaseKey = @CaseKey;
        UPDATE IntakeReferralModule.IntakeReferral SET ReferralSourcePersonStaffMemberAssignmentKey = NULL
        WHERE ReferralSourcePersonStaffMemberAssignmentKey IN (SELECT PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey);
        DELETE FROM CaseActivityModule.CaseActivityInstance WHERE CaseKey = @CaseKey AND ClrTypeDisplayName = 'Person Staff Member Assignment';
        DELETE FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey;

        INSERT INTO PersonModule.PersonStaffMemberAssignment (
            PersonStaffMemberAssignmentKey, Version, IsPrimaryAssignment, Note, TransferredFromPersonStaffMemberAssignmentKey,
            CaseKey, AssignedLocationDisplayName, AssignedLocationKey, AssignedStaffMemberDisplayName, AssignedStaffMemberKey,
            AssignmentLocationSubtypeDisplayName, AssignmentLocationSubtypeIdentifier, AssignmentLocationSubtypeCodeSystemIdentifier,
            AssignmentLocationTypeDisplayName, AssignmentLocationTypeIdentifier, AssignmentLocationTypeCodeSystemIdentifier,
            AssignmentTypeSystemRoleDisplayName, AssignmentTypeSystemRoleKey,
            EffectiveDateRangeEndDate, EffectiveDateRangeStartDate,
            InitiatedStaffMemberDisplayName, InitiatedStaffMemberKey,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey, IsMemberOfCircleOfSupport
        )
        SELECT
            NEWID(), 1, IsPrimaryAssignment, Note, NULL,
            @CaseKey, AssignedLocationDisplayName, AssignedLocationKey, AssignedStaffMemberDisplayName, AssignedStaffMemberKey,
            AssignmentLocationSubtypeDisplayName, AssignmentLocationSubtypeIdentifier, AssignmentLocationSubtypeCodeSystemIdentifier,
            AssignmentLocationTypeDisplayName, AssignmentLocationTypeIdentifier, AssignmentLocationTypeCodeSystemIdentifier,
            AssignmentTypeSystemRoleDisplayName, AssignmentTypeSystemRoleKey,
            EffectiveDateRangeEndDate, EffectiveDateRangeStartDate,
            InitiatedStaffMemberDisplayName, InitiatedStaffMemberKey,
            'feiadmin', @Now, EntityCreatedUserContextKey,
            'feiadmin', @Now, EntityUpdatedUserContextKey, IsMemberOfCircleOfSupport
        FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @BlueprintCaseKey;
        PRINT '  Rebuilt: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

        -- Create WorkflowInstance for each staff assignment
        DELETE FROM WorkflowModule.WorkflowInstance WHERE AggregateKeyReference IN (
            SELECT PersonStaffMemberAssignmentKey FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey);
        INSERT INTO WorkflowModule.WorkflowInstance (
            WorkflowInstanceKey, Version, Comment, WorkflowBindingIdentifier, WorkflowDefinitionIdentifier,
            AggregateKeyReference, AggregateClrTypeDisplayName, AggregateClrTypeFullName,
            CurrentStateDisplayName, CurrentStateName,
            WorkflowTransitionReasonDisplayName, WorkflowTransitionReasonIdentifier, WorkflowTransitionReasonCodeSystemIdentifier,
            EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
            EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey
        )
        SELECT
            NEWID(), 1, NULL, 'PersonStaffMemberAssignmentWorkflowBindingIdentifier', 'PersonStaffMemberAssignmentWorkflowDefinition',
            psma.PersonStaffMemberAssignmentKey, 'Person Staff Member Assignment',
            'Wpc.Core.Domain.PersonModule.Assignment.PersonStaffMemberAssignmentAggregate.PersonStaffMemberAssignment',
            CASE WHEN psma.EffectiveDateRangeEndDate IS NULL THEN 'Active' ELSE 'Inactive' END,
            CASE WHEN psma.EffectiveDateRangeEndDate IS NULL THEN 'ActiveState' ELSE 'InactiveState' END,
            NULL, NULL, NULL,
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1',
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1'
        FROM PersonModule.PersonStaffMemberAssignment psma WHERE psma.CaseKey = @CaseKey;
        PRINT '  WorkflowInstances for staff created';

        -- Register new staff assignments in CaseActivityInstance
        DECLARE @NextStaffCaiId BIGINT;
        SELECT @NextStaffCaiId = ISNULL(MAX(Identifier), 0) FROM CaseActivityModule.CaseActivityInstance;
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
            NEWID(), 1, psma.PersonStaffMemberAssignmentKey, @CaseKey,
            'Registered', NULL, @NextStaffCaiId + ROW_NUMBER() OVER (ORDER BY psma.EffectiveDateRangeStartDate), NULL,
            'Person Staff Member Assignment', 11500003, 1,
            'Wpc.Core.Domain.PersonModule.Assignment.PersonStaffMemberAssignmentAggregate.PersonStaffMemberAssignment, Wpc.Core.Domain, Version=4.43.0.0, Culture=neutral, PublicKeyToken=null',
            'Person Staff Member Assignment',
            'Wpc.Core.Domain.PersonModule.Assignment.PersonStaffMemberAssignmentAggregate.PersonStaffMemberAssignment',
            NULL, NULL, NULL,
            NULL, 'Manual Entry', 12800002, 1,
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1',
            'feiadmin', @Now, 'C1C76C36-5C5F-4727-8347-B47B00EFD9C1', NULL
        FROM PersonModule.PersonStaffMemberAssignment psma WHERE psma.CaseKey = @CaseKey;

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
        WHERE PersonCenteredPlanExtensionKey = @BlueprintPcpExtKey;

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
        WHERE EmergencyBackupPlanKey = @BlueprintEBPKey;

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
        WHERE EmergencyBackupPlanKey = @BlueprintEBPKey;
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
        WHERE PersonCenteredPlanExtensionKey = @BlueprintPcpExtKey;
        PRINT '  WhereILive: done';

        -- Domain (6 records) - use pre-generated keys so OriginalDomainKey = DomainKey (self-ref FK)
        DECLARE @DomainMap TABLE (OldKey UNIQUEIDENTIFIER, NewKey UNIQUEIDENTIFIER, NameId BIGINT);
        DECLARE @DomainStaging TABLE (
            NewKey UNIQUEIDENTIFIER,
            Description NVARCHAR(MAX), NameDisplayName NVARCHAR(MAX), NameIdentifier BIGINT,
            NameCodeSystemIdentifier BIGINT, ProvenanceSourceIdentifier NVARCHAR(1000),
            ProvenanceTypeDisplayName NVARCHAR(MAX), ProvenanceTypeIdentifier BIGINT,
            ProvenanceTypeCodeSystemIdentifier BIGINT,
            EntityCreatedUserContextKey UNIQUEIDENTIFIER, EntityUpdatedUserContextKey UNIQUEIDENTIFIER
        );
        INSERT INTO @DomainStaging (NewKey, Description, NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey)
        SELECT NEWID(), Description, NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
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
            NewKey UNIQUEIDENTIFIER,
            Comment NVARCHAR(MAX), Description NVARCHAR(MAX), StatusDescription NVARCHAR(MAX),
            NameDisplayName NVARCHAR(MAX), NameIdentifier BIGINT, NameCodeSystemIdentifier BIGINT,
            ProvenanceSourceIdentifier NVARCHAR(1000), ProvenanceTypeDisplayName NVARCHAR(MAX),
            ProvenanceTypeIdentifier BIGINT, ProvenanceTypeCodeSystemIdentifier BIGINT,
            StatusDisplayName NVARCHAR(MAX), StatusIdentifier BIGINT, StatusCodeSystemIdentifier BIGINT,
            EntityCreatedUserContextKey UNIQUEIDENTIFIER, EntityUpdatedUserContextKey UNIQUEIDENTIFIER
        );
        INSERT INTO @NeedStaging (NewKey, Comment, Description, StatusDescription,
            NameDisplayName, NameIdentifier, NameCodeSystemIdentifier,
            ProvenanceSourceIdentifier, ProvenanceTypeDisplayName, ProvenanceTypeIdentifier, ProvenanceTypeCodeSystemIdentifier,
            StatusDisplayName, StatusIdentifier, StatusCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey)
        SELECT NEWID(), Comment, Description, StatusDescription,
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
        WHERE ServiceAuthorizationKey = @BlueprintSAKey;

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
        WHERE ServiceLineKey = @BlueprintSLKey;

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
        WHERE ServiceLineKey = @BlueprintSLKey;
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
        WHERE MeetingKey = @BlueprintMeetingKey;
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
            NewKey UNIQUEIDENTIFIER,
            CategoryDisplayName NVARCHAR(MAX), CategoryIdentifier BIGINT, CategoryCodeSystemIdentifier BIGINT,
            TypeDisplayName NVARCHAR(MAX), TypeIdentifier BIGINT, TypeCodeSystemIdentifier BIGINT,
            EntityCreatedUserContextKey UNIQUEIDENTIFIER, EntityUpdatedUserContextKey UNIQUEIDENTIFIER
        );
        INSERT INTO @AboutMeStaging (NewKey, CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
            TypeDisplayName, TypeIdentifier, TypeCodeSystemIdentifier,
            EntityCreatedUserContextKey, EntityUpdatedUserContextKey)
        SELECT NEWID(), CategoryDisplayName, CategoryIdentifier, CategoryCodeSystemIdentifier,
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
        WHERE CaseActivityKeyReference = @BlueprintBudgetLedgerKey AND CaseKey = @BlueprintCaseKey;

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
        WHERE CaseActivityKeyReference = @BlueprintSAKey AND CaseKey = @BlueprintCaseKey;
        PRINT '  CaseActivityInstance registrations: done';

        PRINT '  ISP rebuild complete!';
        PRINT '';

        -- ==========================================================
        -- COMMIT
        -- ==========================================================
        COMMIT TRANSACTION;
        PRINT '=== RESET COMPLETE ===';
        PRINT 'Person now matches blueprint: ' + CAST(@BlueprintPersonKey AS NVARCHAR(36));
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

