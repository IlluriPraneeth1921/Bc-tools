SELECT	 
		[PersonLookup].PersonKey
,		[PersonLookup].ActiveMedicaidNumber
--,		[Case].*
--,		[CaseCustomFormInstance].*
,		[CustomFormInstance].*
FROM	[PersonModule].[PersonLookup]
JOIN	[CaseModule].[Case]
ON		[Case].PersonKey = [PersonLookup].PersonKey
JOIN	[CustomFormModule].[CaseCustomFormInstance]
ON		[Case].CaseKey = [CaseCustomFormInstance].CaseKey
JOIN	[CustomFormModule].[CustomFormInstance]
ON		[CustomFormInstance].CustomFormInstanceKey = [CaseCustomFormInstance].CustomFormInstanceKey
WHERE	[PersonLookup].ActiveMedicaidNumber = '4774443560';

SELECT	*
FROM	[WiDHS.Qc.Interface.Carity].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm]
WHERE	MemberId = '4774443560';

SELECT	* 
FROM	[WiDHS.Qc.Interface.Carity].[CustomerLookupModule].[CustomFormInstanceLookup]
WHERE	PersonKey = '38A776A7-DD42-4F68-9AFD-8BDCD7B2D600';

SELECT	[InterfaceBatchKey],[RawText]
FROM	[WiDHS.Qc.Interface.Carity].[CustomerInterfaceModule].[LongTermCareFunctionalScreenFormRaw]
WHERE	RawText like '4774443560%'

--EXEC dbo.test_CreateLtcNeedsAssessmentCompleted @MedicaidNumber = '4774443560', @DryRun = 0;
--DELETE FROM [WiDHS.Qc.Interface.Carity].[CustomerInterfaceModule].[LongTermCareFunctionalScreenForm] WHERE MemberId = '4774443560';
--DELETE FROM [WiDHS.Qc.Interface.Carity].[CustomerLookupModule].[CustomFormInstanceLookup] WHERE PersonKey = '38A776A7-DD42-4F68-9AFD-8BDCD7B2D600';
--EXEC dbo.test_WipePersonCustomFormData @MedicaidNumber = '4774443560', @DryRun = 0;
