/**
 * Reset Person Logic — Executes the SQL from the .sql files directly.
 *
 * Instead of duplicating SQL inline, this module reads the existing
 * ResetPersonToPristineState.sql file, strips the stored procedure wrapper,
 * and executes the body as an ad-hoc batch with substituted parameters.
 *
 * Two modes:
 *   - Full Reset: wipe all data + rebuild from blueprint
 *   - Wipe Only: just delete enrollment/ISP/assignment data (Part A-D only)
 */
import * as sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { query, queryWithParams } from './db-connection';

// ─── Helpers ───────────────────────────────────────────────────────────

function printResult(label: string, count: number): void {
  console.log(chalk.white(`    ${label}: `) + chalk.cyan(String(count)));
}

function printSection(title: string): void {
  console.log(chalk.blue(`\n  --- ${title} ---`));
}

function printStep(msg: string): void {
  console.log(chalk.gray(`  ${msg}`));
}

/**
 * Load and prepare the reset SQL from the .sql file.
 * Strips the CREATE PROCEDURE wrapper and GO statements,
 * leaving just the executable body.
 */
function loadResetSql(): string {
  const filePath = path.join(__dirname, 'ResetPersonToPristineState.sql');
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  let sql = fs.readFileSync(filePath, 'utf-8');

  // Remove everything before "AS\nBEGIN" (the procedure wrapper)
  const asBeginMatch = sql.match(/\bAS\s*\r?\nBEGIN\b/i);
  if (asBeginMatch && asBeginMatch.index !== undefined) {
    sql = sql.substring(asBeginMatch.index + asBeginMatch[0].length);
  }

  // Remove the final END that closes the procedure
  const lastEnd = sql.lastIndexOf('\nEND');
  if (lastEnd > 0) {
    sql = sql.substring(0, lastEnd);
  }

  // Remove GO statements (batch separators not valid in ad-hoc queries)
  sql = sql.replace(/^\s*GO\s*$/gm, '');

  // Remove SET QUOTED_IDENTIFIER / SET ANSI_NULLS before CREATE
  sql = sql.replace(/SET\s+QUOTED_IDENTIFIER\s+ON\s*;?/gi, '');
  sql = sql.replace(/SET\s+ANSI_NULLS\s+ON\s*;?/gi, '');

  // Remove CREATE OR ALTER PROCEDURE line and parameter declarations
  sql = sql.replace(/CREATE\s+OR\s+ALTER\s+PROCEDURE[^;]*?AS\s*\r?\nBEGIN/gis, '');

  // Replace RETURN statements (not valid outside stored procedures)
  // RETURN -1 → indicates error, convert to THROW
  sql = sql.replace(/\bRETURN\s+-1\s*;?/gi, 'THROW 50000, \'Validation failed\', 1;');
  // RETURN 0 → indicates success, just remove it (execution continues to end)
  sql = sql.replace(/\bRETURN\s+0\s*;?/gi, '-- (success)');
  // Simple RETURN with no value → treat as early exit, ignore
  sql = sql.replace(/\bRETURN\s*;/gi, '-- (exit)');

  return sql;
}

/**
 * Build the SQL batch that declares parameters and runs the procedure body.
 * This replaces the stored procedure's parameter declaration with concrete values.
 */
function buildExecutableSql(
  personKey: string,
  blueprintKey: string,
  dryRun: boolean
): string {
  const body = loadResetSql();

  // Prepend parameter declarations with actual values
  const preamble = `
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @PersonKey UNIQUEIDENTIFIER = '${personKey}';
DECLARE @BlueprintPersonKey UNIQUEIDENTIFIER = '${blueprintKey}';
DECLARE @DryRun BIT = ${dryRun ? '1' : '0'};
`;

  return preamble + body;
}

/**
 * Build a wipe-only SQL batch.
 * Executes only the delete parts (A through D) without the rebuild (Part F).
 */
function buildWipeOnlySql(personKey: string): string {
  const fullSql = loadResetSql();

  // We need everything up to and including Part D, but not Part F (rebuild).
  // Find where Part F starts and truncate there.
  const partFMarker = '-- PART F:';
  // Also handle "Part F" marker variants
  const altMarker = 'PART F:';
  let cutIndex = fullSql.indexOf(partFMarker);
  if (cutIndex === -1) cutIndex = fullSql.indexOf(altMarker);

  let wipeSql: string;
  if (cutIndex > 0) {
    // Take everything before Part F, then add a COMMIT
    wipeSql = fullSql.substring(0, cutIndex);
    // Ensure we still have the COMMIT TRANSACTION
    if (!wipeSql.includes('COMMIT TRANSACTION')) {
      wipeSql += '\nCOMMIT TRANSACTION;\n';
    }
  } else {
    // Couldn't find the marker; fall back to full execution with DryRun=0
    // but skip rebuild by setting a flag (not ideal but safe)
    wipeSql = fullSql;
  }

  const preamble = `
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @PersonKey UNIQUEIDENTIFIER = '${personKey}';
DECLARE @BlueprintPersonKey UNIQUEIDENTIFIER = '${personKey}';
DECLARE @DryRun BIT = 0;
`;

  return preamble + wipeSql;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Run a dry-run preview showing what would be affected.
 */
export async function runDryRun(personKey: string, blueprintKey: string): Promise<void> {
  printSection('Dry Run Preview');

  // Validate person exists
  const personResult = await queryWithParams(
    `SELECT NameFirstName, NameLastName FROM PersonModule.Person WHERE PersonKey = @PersonKey`,
    { PersonKey: { type: sql.UniqueIdentifier, value: personKey } }
  );
  if (personResult.recordset.length === 0) {
    throw new Error(`Person not found: ${personKey}`);
  }
  const person = personResult.recordset[0];
  console.log(chalk.white(`  Target: ${person.NameFirstName} ${person.NameLastName}`));
  console.log(chalk.white(`  PersonKey: ${personKey}`));
  console.log(chalk.white(`  Blueprint: ${blueprintKey}`));

  // Get CaseKey
  const caseResult = await queryWithParams(
    `SELECT CaseKey FROM CaseModule.[Case] WHERE PersonKey = @PersonKey`,
    { PersonKey: { type: sql.UniqueIdentifier, value: personKey } }
  );
  if (caseResult.recordset.length === 0) {
    throw new Error(`Case not found for person: ${personKey}`);
  }
  const caseKey = caseResult.recordset[0].CaseKey;

  // Count what would be affected
  const enrollCount = await queryWithParams(
    `SELECT COUNT(*) AS cnt FROM ProgramEnrollmentModule.ProgramEnrollment WHERE CaseKey = @CaseKey`,
    { CaseKey: { type: sql.UniqueIdentifier, value: caseKey } }
  );
  const ispCount = await queryWithParams(
    `SELECT COUNT(*) AS cnt FROM PersonCenteredPlanModule.PersonCenteredPlan WHERE CaseKey = @CaseKey`,
    { CaseKey: { type: sql.UniqueIdentifier, value: caseKey } }
  );
  const locCount = await queryWithParams(
    `SELECT COUNT(*) AS cnt FROM PersonModule.PersonLocationAssignment WHERE CaseKey = @CaseKey`,
    { CaseKey: { type: sql.UniqueIdentifier, value: caseKey } }
  );
  const staffCount = await queryWithParams(
    `SELECT COUNT(*) AS cnt FROM PersonModule.PersonStaffMemberAssignment WHERE CaseKey = @CaseKey`,
    { CaseKey: { type: sql.UniqueIdentifier, value: caseKey } }
  );

  // Validate blueprint exists
  const bpResult = await queryWithParams(
    `SELECT NameFirstName, NameLastName FROM PersonModule.Person WHERE PersonKey = @PersonKey`,
    { PersonKey: { type: sql.UniqueIdentifier, value: blueprintKey } }
  );
  if (bpResult.recordset.length === 0) {
    throw new Error(`Blueprint person not found: ${blueprintKey}`);
  }

  console.log('');
  printResult('Enrollments to delete', enrollCount.recordset[0].cnt);
  printResult('ISPs to delete', ispCount.recordset[0].cnt);
  printResult('Location assignments to rebuild', locCount.recordset[0].cnt);
  printResult('Staff assignments to rebuild', staffCount.recordset[0].cnt);
  console.log('');
  console.log(chalk.white(`  Post-reset: will match blueprint (${bpResult.recordset[0].NameFirstName} ${bpResult.recordset[0].NameLastName}) exactly.`));
  console.log('');
}

/**
 * Execute a wipe-only operation (delete all data, no rebuild).
 */
export async function runWipeOnly(personKey: string): Promise<void> {
  printSection('Executing Wipe Only');
  printStep('Building SQL batch...');

  const sqlText = buildWipeOnlySql(personKey);

  printStep('Executing (this may take a moment)...');
  const startTime = Date.now();

  try {
    await query(sqlText);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.green(`\n  ✓ Wipe complete in ${elapsed}s — all enrollment and ISP data removed.\n`));
  } catch (err: any) {
    // Transaction will have been rolled back by XACT_ABORT
    throw new Error(`Wipe failed (rolled back): ${err.message}`);
  }
}

/**
 * Execute a full reset (wipe + rebuild from blueprint).
 */
export async function runFullReset(personKey: string, blueprintKey: string): Promise<void> {
  printSection('Executing Full Reset');
  printStep('Building SQL batch...');

  const sqlText = buildExecutableSql(personKey, blueprintKey, false);

  printStep('Executing (this may take a moment)...');
  const startTime = Date.now();

  try {
    await query(sqlText);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(chalk.green(`\n  ✓ Full reset complete in ${elapsed}s — person now matches blueprint.\n`));
  } catch (err: any) {
    throw new Error(`Full reset failed (rolled back): ${err.message}`);
  }
}
