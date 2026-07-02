-- Execute reset:
--EXEC dbo.test_ResetPersonToPristineState @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd', @DryRun = 0;
EXEC dbo.test_ResetPersonToPristineState
    @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd',
    @BlueprintPersonKey = '9b9a7a67-8baa-4b8b-b31d-b47b012b5e46',
    @DryRun = 0;

--EXEC dbo.test_DeleteProgramEnrollmentByPersonKey @PersonKey = 'c7a3862e-f166-466d-a5fb-b4670130aebd';

--EXEC [dbo].[test_SetMMISStatusSuccess] @ProgramEnrollmentKey = '2534e87e-f335-4308-85de-b47a00f10da1';