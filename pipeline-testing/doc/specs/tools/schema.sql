-- ============================================================
-- Run this against EACH database:
--   1. USE [WiDHS.QcPhi.Interface.Carity]
--   2. USE [WiDHS.QcPhi.Carity]
-- Then copy/paste each output into a separate file.
-- ============================================================

-- 1. ALL TABLES WITH ROW COUNTS
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    p.rows AS 'RowCount'
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
ORDER BY s.name, t.name;

-- 2. ALL COLUMNS WITH DATA TYPES
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    c.column_id AS OrdinalPosition,
    c.name AS ColumnName,
    tp.name AS DataType,
    c.max_length AS MaxLength,
    c.precision AS Precision,
    c.scale AS Scale,
    c.is_nullable AS IsNullable,
    c.is_identity AS IsIdentity,
    dc.definition AS DefaultValue
FROM sys.columns c
JOIN sys.tables t ON c.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.types tp ON c.user_type_id = tp.user_type_id
LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
ORDER BY s.name, t.name, c.column_id;

-- 3. PRIMARY KEYS
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    i.name AS PKName,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
    ic.key_ordinal AS KeyOrdinal
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.is_primary_key = 1
ORDER BY s.name, t.name, ic.key_ordinal;

-- 4. FOREIGN KEYS
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    fk.name AS FKName,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
    rs.name AS ReferencedSchema,
    rt.name AS ReferencedTable,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
JOIN sys.tables t ON fk.parent_object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
JOIN sys.tables rt ON fk.referenced_object_id = rt.object_id
JOIN sys.schemas rs ON rt.schema_id = rs.schema_id
ORDER BY s.name, t.name, fk.name;

-- 5. INDEXES (non-PK)
SELECT 
    s.name AS SchemaName,
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique AS IsUnique,
    COL_NAME(ic.object_id, ic.column_id) AS ColumnName,
    ic.key_ordinal AS KeyOrdinal,
    ic.is_included_column AS IsIncluded
FROM sys.indexes i
JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
JOIN sys.tables t ON i.object_id = t.object_id
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE i.is_primary_key = 0 AND i.type > 0
ORDER BY s.name, t.name, i.name, ic.key_ordinal;

-- 6. VIEWS
SELECT 
    s.name AS SchemaName,
    v.name AS ViewName,
    m.definition AS ViewDefinition
FROM sys.views v
JOIN sys.schemas s ON v.schema_id = s.schema_id
JOIN sys.sql_modules m ON v.object_id = m.object_id
ORDER BY s.name, v.name;