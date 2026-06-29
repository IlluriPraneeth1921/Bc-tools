-- =============================================================================
-- MIGRATION: Copy LTC Needs Assessment Form Definition to ToolTesting
-- =============================================================================
-- Source: WiDHS.Qc.Carity
-- Target: WiDHS.Qc.Carity.ToolTestig
-- Form:   964B0DFB-ED99-4F5A-8449-B43C013B9062 (LTC Needs Assessment)
--
-- NOTE: UserContextKey FKs are set to NULL since SecurityModule.UserContext
-- records from production don't exist in ToolTesting.
-- =============================================================================

DECLARE @FormDefKey UNIQUEIDENTIFIER = '964B0DFB-ED99-4F5A-8449-B43C013B9062';
DECLARE @Now DATETIME2 = GETUTCDATE();
DECLARE @Account NVARCHAR(508) = N'MIGRATION-D12-SETUP';

-- Step 1: CustomFormDefinition (NULL out UserContext FKs)
IF NOT EXISTS (
    SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormDefinition]
    WHERE CustomFormDefinitionKey = @FormDefKey
)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormDefinition]
        (CustomFormDefinitionKey, Version, Description, DisplayName, IsActive,
         IsCreateIssueAllowed, IsScoringActive, Name, PreviousCustomFormDefinitionKey,
         TypeEnum, VersionNumber, WorkflowDefinitionIdentifier,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
    SELECT
        CustomFormDefinitionKey, Version, Description, DisplayName, IsActive,
        IsCreateIssueAllowed, IsScoringActive, Name, NULL,
        TypeEnum, VersionNumber, WorkflowDefinitionIdentifier,
        @Account, @Now, NULL,
        @Account, @Now, NULL
    FROM [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormDefinition]
    WHERE CustomFormDefinitionKey = @FormDefKey;

    PRINT 'Step 1: Copied CustomFormDefinition';
END
ELSE
    PRINT 'Step 1: CustomFormDefinition already exists — skipped';

-- Step 2: CustomFormNamespace
IF NOT EXISTS (
    SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormNamespace] ns
    INNER JOIN [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormNamespace] src
        ON ns.CustomFormNamespaceKey = src.CustomFormNamespaceKey
    WHERE src.CustomFormDefinitionKey = @FormDefKey
)
BEGIN
    INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormNamespace]
        (CustomFormNamespaceKey, Version, Code, CustomFormDefinitionKey,
         EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
         EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
    SELECT
        CustomFormNamespaceKey, Version, Code, CustomFormDefinitionKey,
        @Account, @Now, NULL,
        @Account, @Now, NULL
    FROM [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormNamespace]
    WHERE CustomFormDefinitionKey = @FormDefKey;

    PRINT 'Step 2: Copied CustomFormNamespace';
END
ELSE
    PRINT 'Step 2: CustomFormNamespace already exists — skipped';

-- Step 3: CustomFormElementDefinitionBase
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormElementDefinitionBase]
    (CustomFormElementDefinitionBaseKey, Version, Code, CustomFormDefinitionKey,
     CustomFormElementPrefillIdentifier, CustomFormNamespaceKey,
     DisplayName, HelpNote, IsHidden, IsReadOnly, IsScrollSpyShown,
     EntityCreatedAccountIdentifier, EntityCreatedTimestamp, EntityCreatedUserContextKey,
     EntityUpdatedAccountIdentifier, EntityUpdatedTimestamp, EntityUpdatedUserContextKey)
SELECT
    src.CustomFormElementDefinitionBaseKey, src.Version, src.Code, src.CustomFormDefinitionKey,
    src.CustomFormElementPrefillIdentifier, src.CustomFormNamespaceKey,
    src.DisplayName, src.HelpNote, src.IsHidden, src.IsReadOnly, src.IsScrollSpyShown,
    @Account, @Now, NULL,
    @Account, @Now, NULL
FROM [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormElementDefinitionBase] src
WHERE src.CustomFormDefinitionKey = @FormDefKey
  AND NOT EXISTS (
    SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormElementDefinitionBase] tgt
    WHERE tgt.CustomFormElementDefinitionBaseKey = src.CustomFormElementDefinitionBaseKey
  );

PRINT 'Step 3: Copied CustomFormElementDefinitionBase';

-- Step 4: SimpleSingleSelectFieldDefinition (explicit columns — avoid schema mismatch)
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[SimpleSingleSelectFieldDefinition]
    (CustomFormElementDefinitionBaseKey, IsRequired, IsScrollSpyShown, TypeEnum,
     SelectorCodeGroupCode, SelectorCodeGroupDisplayName, LoadTypeCode, LoadTypeDisplayName)
SELECT
    src.CustomFormElementDefinitionBaseKey, src.IsRequired, src.IsScrollSpyShown, src.TypeEnum,
    src.SelectorCodeGroupCode, src.SelectorCodeGroupDisplayName, src.LoadTypeCode, src.LoadTypeDisplayName
FROM [WiDHS.Qc.Carity].[CustomFormModule].[SimpleSingleSelectFieldDefinition] src
WHERE src.CustomFormElementDefinitionBaseKey IN (
    SELECT CustomFormElementDefinitionBaseKey
    FROM [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormElementDefinitionBase]
    WHERE CustomFormDefinitionKey = @FormDefKey
)
AND NOT EXISTS (
    SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[SimpleSingleSelectFieldDefinition] tgt
    WHERE tgt.CustomFormElementDefinitionBaseKey = src.CustomFormElementDefinitionBaseKey
);

PRINT 'Step 4: Copied SimpleSingleSelectFieldDefinition';

-- Step 5: SimpleSingleSelectFieldDefinitionOptions
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[SimpleSingleSelectFieldDefinitionOptions]
    (SimpleSingleSelectFieldDefinitionKey, Code, DisplayName, DisplayOrderNumber, Score)
SELECT
    src.SimpleSingleSelectFieldDefinitionKey, src.Code, src.DisplayName,
    src.DisplayOrderNumber, src.Score
FROM [WiDHS.Qc.Carity].[CustomFormModule].[SimpleSingleSelectFieldDefinitionOptions] src
WHERE src.SimpleSingleSelectFieldDefinitionKey IN (
    SELECT CustomFormElementDefinitionBaseKey
    FROM [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormElementDefinitionBase]
    WHERE CustomFormDefinitionKey = @FormDefKey
)
AND NOT EXISTS (
    SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[SimpleSingleSelectFieldDefinitionOptions] tgt
    WHERE tgt.SimpleSingleSelectFieldDefinitionKey = src.SimpleSingleSelectFieldDefinitionKey
      AND tgt.Code = src.Code
);

PRINT 'Step 5: Copied SimpleSingleSelectFieldDefinitionOptions';

-- Step 6: DateFieldDefinition
INSERT INTO [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[DateFieldDefinition]
    (CustomFormElementDefinitionBaseKey, IsRequired, IsScrollSpyShown)
SELECT
    src.CustomFormElementDefinitionBaseKey, src.IsRequired, src.IsScrollSpyShown
FROM [WiDHS.Qc.Carity].[CustomFormModule].[DateFieldDefinition] src
WHERE src.CustomFormElementDefinitionBaseKey IN (
    SELECT CustomFormElementDefinitionBaseKey
    FROM [WiDHS.Qc.Carity].[CustomFormModule].[CustomFormElementDefinitionBase]
    WHERE CustomFormDefinitionKey = @FormDefKey
)
AND NOT EXISTS (
    SELECT 1 FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[DateFieldDefinition] tgt
    WHERE tgt.CustomFormElementDefinitionBaseKey = src.CustomFormElementDefinitionBaseKey
);

PRINT 'Step 6: Copied DateFieldDefinition';

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'CustomFormDefinition' AS TableName, COUNT(*) AS RowCount
FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormDefinition]
WHERE CustomFormDefinitionKey = @FormDefKey
UNION ALL
SELECT 'CustomFormNamespace', COUNT(*)
FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormNamespace]
WHERE CustomFormDefinitionKey = @FormDefKey
UNION ALL
SELECT 'CustomFormElementDefinitionBase', COUNT(*)
FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormElementDefinitionBase]
WHERE CustomFormDefinitionKey = @FormDefKey
UNION ALL
SELECT 'SimpleSingleSelectFieldDefinition', COUNT(*)
FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[SimpleSingleSelectFieldDefinition]
WHERE CustomFormElementDefinitionBaseKey IN (
    SELECT CustomFormElementDefinitionBaseKey
    FROM [WiDHS.Qc.Carity.ToolTestig].[CustomFormModule].[CustomFormElementDefinitionBase]
    WHERE CustomFormDefinitionKey = @FormDefKey
);

PRINT 'Migration complete.';
GO
