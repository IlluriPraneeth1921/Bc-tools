/**
 * Database Helper — Executes SQL against the Carity database.
 *
 * Used for:
 * - Mocking MMIS responses when MMIS is unavailable
 * - Setting up precondition data (sync history, extension records)
 * - Verifying post-execution database state
 *
 * Connection uses Windows Integrated Security (trusted connection).
 */
import * as sql from 'mssql';

const DB_SERVER = process.env.DB_SERVER || 'mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com';
const DB_NAME = process.env.DB_NAME || 'WiDHS.F2.Carity';

let pool: sql.ConnectionPool | null = null;

/**
 * Gets or creates a connection pool to the Carity database.
 */
async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) return pool;

  const config: sql.config = {
    server: DB_SERVER,
    database: DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
    requestTimeout: 30_000,
  };

  pool = await new sql.ConnectionPool(config).connect();
  console.log(`[db] Connected to ${DB_SERVER}/${DB_NAME}`);
  return pool;
}

/**
 * Executes a SQL query and returns the result.
 */
export async function executeQuery(query: string): Promise<sql.IResult<any>> {
  const p = await getPool();
  return p.request().query(query);
}

/**
 * Executes a parameterized SQL query.
 */
export async function executeQueryWithParams(
  query: string,
  params: Record<string, { type: any; value: any }>
): Promise<sql.IResult<any>> {
  const p = await getPool();
  const request = p.request();
  for (const [name, param] of Object.entries(params)) {
    request.input(name, param.type, param.value);
  }
  return request.query(query);
}

/**
 * Mocks MMIS success response by calling the stored procedure.
 * Sets ProgramEnrollmentExtension to Success status for the given enrollment.
 *
 * @param programEnrollmentKey - The ProgramEnrollmentKey GUID
 * @returns true if the procedure executed successfully, false if it failed
 */
export async function mockMmisSuccess(programEnrollmentKey: string): Promise<boolean> {
  try {
    const p = await getPool();
    const result = await p.request()
      .input('ProgramEnrollmentKey', sql.UniqueIdentifier, programEnrollmentKey)
      .execute('[dbo].[test_SetMMISStatusSuccess]');

    console.log(`[db] mockMmisSuccess: Set Success for ProgramEnrollmentKey=${programEnrollmentKey}`);
    return true;
  } catch (err: any) {
    if (err.message?.includes('Could not find stored procedure')) {
      console.error(`[db] ERROR: Stored procedure [dbo].[test_SetMMISStatusSuccess] not found!`);
      console.error(`[db] Please create it in ${DB_NAME} database.`);
    } else if (err.message?.includes('No ProgramEnrollmentExtension row found')) {
      console.error(`[db] ERROR: No ProgramEnrollmentExtension row for key ${programEnrollmentKey}`);
    } else {
      console.error(`[db] ERROR executing mockMmisSuccess: ${err.message}`);
    }
    return false;
  }
}

/**
 * Mocks MMIS failed (FL) response with a conflict and error message.
 * Sets ProgramEnrollmentExtension to Error status with HasConflict = 1.
 *
 * @param programEnrollmentKey - The ProgramEnrollmentKey GUID
 * @param errorCode - MMIS error code (default: '9156')
 * @param errorDescription - Error description text
 * @returns true if the procedure executed successfully
 */
export async function mockMmisFailed(
  programEnrollmentKey: string,
  errorCode: string = '9156',
  errorDescription: string = 'FEA DATES DO NOT SPAN ENROLLMENT PERIOD'
): Promise<boolean> {
  try {
    const p = await getPool();
    await p.request()
      .input('ProgramEnrollmentKey', sql.UniqueIdentifier, programEnrollmentKey)
      .input('ErrorCode', sql.NVarChar(20), errorCode)
      .input('ErrorDescription', sql.NVarChar(sql.MAX), errorDescription)
      .execute('[dbo].[test_SetMMISStatusFailed]');

    console.log(`[db] mockMmisFailed: Set Error for key=${programEnrollmentKey}, code=${errorCode}`);
    return true;
  } catch (err: any) {
    if (err.message?.includes('Could not find stored procedure')) {
      console.error(`[db] ERROR: Stored procedure [dbo].[test_SetMMISStatusFailed] not found!`);
      console.error(`[db] Run scripts/createMMISMockProcedures.sql against the database.`);
    } else {
      console.error(`[db] ERROR executing mockMmisFailed: ${err.message}`);
    }
    return false;
  }
}

/**
 * Mocks MMIS warning (SE) response — success with errors.
 * Sets ProgramEnrollmentExtension to Warning status with HasConflict = 0.
 *
 * @param programEnrollmentKey - The ProgramEnrollmentKey GUID
 * @param errorCode - Warning/error code (default: '9199')
 * @param errorDescription - Warning description text
 * @returns true if the procedure executed successfully
 */
export async function mockMmisWarning(
  programEnrollmentKey: string,
  errorCode: string = '9199',
  errorDescription: string = 'ENROLLMENT PROCESSED WITH WARNINGS'
): Promise<boolean> {
  try {
    const p = await getPool();
    await p.request()
      .input('ProgramEnrollmentKey', sql.UniqueIdentifier, programEnrollmentKey)
      .input('ErrorCode', sql.NVarChar(20), errorCode)
      .input('ErrorDescription', sql.NVarChar(sql.MAX), errorDescription)
      .execute('[dbo].[test_SetMMISStatusWarning]');

    console.log(`[db] mockMmisWarning: Set Warning for key=${programEnrollmentKey}, code=${errorCode}`);
    return true;
  } catch (err: any) {
    if (err.message?.includes('Could not find stored procedure')) {
      console.error(`[db] ERROR: Stored procedure [dbo].[test_SetMMISStatusWarning] not found!`);
      console.error(`[db] Run scripts/createMMISMockProcedures.sql against the database.`);
    } else {
      console.error(`[db] ERROR executing mockMmisWarning: ${err.message}`);
    }
    return false;
  }
}

/**
 * Gets the ProgramEnrollmentKey from the enrollment detail page URL.
 * URL pattern: /programenrollments/programenrollment/{key}
 */
export function extractProgramEnrollmentKeyFromUrl(url: string): string | null {
  const match = url.match(/programenrollment\/([0-9a-f-]{36})/i);
  return match ? match[1] : null;
}

/**
 * Closes the database connection pool.
 * Call this in test afterAll() to clean up.
 */
export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('[db] Connection closed');
  }
}
