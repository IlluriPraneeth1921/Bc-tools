---
inclusion: manual
---

# VocabularyModule — Carity Coded Value System

Reference for understanding and querying the centralized vocabulary/code system in the Carity database (`WiDHS.F2.Carity`). The VocabularyModule implements a normalized coded value pattern used across all domain modules for dropdowns, status fields, reason codes, and classification values.

---

## Architecture Overview

Carity does NOT use simple lookup tables per domain. Instead, it uses a **single shared vocabulary system** where all coded values across the entire application are stored in a normalized structure. Domain tables reference vocabulary entries via a triple of columns:

```
{FieldName}CodeSystemIdentifier  (bigint)  → identifies the code system
{FieldName}DisplayName           (nvarchar) → cached human-readable label
{FieldName}Identifier            (bigint)  → the specific concept ID within the code system
```

This triple pattern appears throughout the database (e.g., `TransactionStatusCodeSystemIdentifier`, `TransactionStatusDisplayName`, `TransactionStatusIdentifier`).

---

## Key Tables

### VocabularyModule.CodeSystem (5 rows)

The top-level registry of all code systems. Each code system groups related concepts.

| Column | Purpose |
|--------|---------|
| `CodeSystemKey` | PK (uniqueidentifier) |
| (other columns) | Name, version info |

**Important:** The `CodeSystemIdentifier` used in domain tables (e.g., `= 7`) is a numeric identifier that maps to a CodeSystem row. For WiDHS/Carity custom codes, `CodeSystemIdentifier = 7` is the primary code system.

### VocabularyModule.Concept (140,966 rows)

Individual coded concepts. This is NOT a traditional ID/DisplayName table.

| Column | Purpose |
|--------|---------|
| `ConceptKey` | PK (uniqueidentifier) |
| `Code` | Short code value (nvarchar) — e.g., "1", "SU", "FL" |
| `InternalName` | Machine-friendly name |
| `CodeSystemDisplayName` | Which code system this belongs to (e.g., "Carity") |
| `CodeSystemKey` | FK to CodeSystem |

**Note:** The `Concept` table does NOT have an `Identifier` or `DisplayName` column directly. Those values come from related tables (ValueSetMember, Term).

### VocabularyModule.ValueSet (793 rows)

Named sets of concepts — equivalent to "dropdown option lists" in the UI.

### VocabularyModule.ValueSetMember (140,882 rows)

The actual membership of concepts in value sets. This is where you find the `DisplayName` and numeric identifiers used in domain tables.

| Column | Purpose |
|--------|---------|
| `ValueSetKey` | FK to ValueSet |
| `ConceptIdentifier` | The numeric ID used in domain table `{Field}Identifier` columns |
| `DisplayName` | The human-readable label cached in domain table `{Field}DisplayName` columns |

### VocabularyModule.Term (141,692 rows)

Language-specific labels for concepts.

---

## How Domain Tables Reference Vocabulary

When you see a domain table column pattern like:

```sql
TransactionStatusCodeSystemIdentifier = 7
TransactionStatusDisplayName = 'Success'
TransactionStatusIdentifier = 6600003
```

This means:
- Code System 7 (Carity's custom vocabulary)
- Concept with identifier `6600003`
- Whose display name is "Success"

The `DisplayName` is **denormalized** (cached) in the domain table for query performance. The authoritative value lives in `ValueSetMember.DisplayName`.

---

## Known Code Values (Enrollment Service)

### Transaction Status (used in ProgramEnrollmentExtension)

| Identifier | DisplayName | MMIS Code | Meaning |
|-----------|-------------|-----------|---------|
| 6600001 | Error | FL | MMIS rejected the transaction |
| 6600003 | Success | SU | MMIS accepted the transaction |
| 6600004 | Warning | SE | MMIS accepted with errors/warnings |

All use `CodeSystemIdentifier = 7`.

### Conflict Status Reason (used in ProgramEnrollmentExtension)

| Identifier | DisplayName | HasConflict |
|-----------|-------------|-------------|
| 6410001 | MMIS Synchronization Failed | true (1) |
| 6410002 | MMIS Synchronization Succeeded | false (0) |
| 6410003 | MMIS Synchronization Succeeded With Errors | false (0) |

All use `CodeSystemIdentifier = 7`.

### MMIS Response Status Codes (in SyncTransaction.ResponseStatusCode)

| Code | StatusDisplayName | Meaning |
|------|-------------------|---------|
| SU | Success | Transaction accepted |
| SE | Warning | Accepted with errors (enrollment still processed) |
| FL | Error | Transaction rejected |

---

## Querying Vocabulary Values

### Find all concepts for a specific domain field

If you see a domain column using identifier `6600003` with CodeSystem `7`, find related values:

```sql
-- Find all TransactionStatus values (siblings of 6600003)
SELECT vsm.ConceptIdentifier, vsm.DisplayName, vs.DisplayName AS ValueSetName
FROM [VocabularyModule].[ValueSetMember] vsm
JOIN [VocabularyModule].[ValueSet] vs ON vs.ValueSetKey = vsm.ValueSetKey
WHERE vsm.ValueSetKey = (
    SELECT ValueSetKey FROM [VocabularyModule].[ValueSetMember]
    WHERE ConceptIdentifier = 6600003
)
ORDER BY vsm.ConceptIdentifier;
```

### Find what a specific identifier maps to

```sql
SELECT vsm.ConceptIdentifier, vsm.DisplayName, vs.DisplayName AS ValueSetName
FROM [VocabularyModule].[ValueSetMember] vsm
JOIN [VocabularyModule].[ValueSet] vs ON vs.ValueSetKey = vsm.ValueSetKey
WHERE vsm.ConceptIdentifier = 6600003;
```

### Search by display name

```sql
SELECT vsm.ConceptIdentifier, vsm.DisplayName, vs.DisplayName AS ValueSetName
FROM [VocabularyModule].[ValueSetMember] vsm
JOIN [VocabularyModule].[ValueSet] vs ON vs.ValueSetKey = vsm.ValueSetKey
WHERE vsm.DisplayName LIKE '%Synchronization%'
ORDER BY vsm.ConceptIdentifier;
```

### Find all values for a known value set name

```sql
SELECT vsm.ConceptIdentifier, vsm.DisplayName
FROM [VocabularyModule].[ValueSetMember] vsm
JOIN [VocabularyModule].[ValueSet] vs ON vs.ValueSetKey = vsm.ValueSetKey
WHERE vs.DisplayName = 'Transaction Status'  -- or whatever the value set is called
ORDER BY vsm.ConceptIdentifier;
```

---

## How to Add/Use Vocabulary Values in Test Scripts

When writing SQL scripts that set coded values (like the MMIS mock procedures), always use the full triple:

```sql
UPDATE [SomeModule].[SomeTable]
SET
    [FieldCodeSystemIdentifier] = 7,          -- Always 7 for Carity custom
    [FieldDisplayName]          = 'Success',  -- Cached display name
    [FieldIdentifier]           = 6600003     -- Concept identifier
WHERE ...
```

**Never set just the DisplayName** — the application reads the Identifier for logic and the DisplayName for UI rendering. Both must be consistent.

---

## Relationship to ProgramEnrollmentExtensionMessages

Error/warning messages stored in `ProgramEnrollmentExtensionMessages` use a simpler structure (not vocabulary-based):

| Column | Example Values | Purpose |
|--------|---------------|---------|
| `ClassificationCode` | 'Hard', 'Success' | Error severity classification |
| `Code` | '9156', '9171', 'SU', 'TIMEOUT' | MMIS error code or status |
| `Description` | 'FEA DATES DO NOT SPAN...' | Human-readable error text |
| `ErrorTypeCode` | '01', null | Error type (null for success) |
| `Timestamp` | datetime2 | When the message was recorded |

These codes come directly from the MMIS response — they are NOT VocabularyModule concepts.

---

## Tips

1. **CodeSystemIdentifier = 7** is the Carity custom vocabulary. Almost all WiDHS-specific codes use this.
2. **Identifiers are stable** — they don't change across environments. `6600003` always means "Success".
3. **DisplayNames can vary** slightly between environments. Always reference by Identifier in code.
4. **The Concept table lacks DisplayName** — use ValueSetMember for human-readable names.
5. **When discovering new codes**, query existing rows in the domain table to find the pattern, then look up siblings in ValueSetMember.
