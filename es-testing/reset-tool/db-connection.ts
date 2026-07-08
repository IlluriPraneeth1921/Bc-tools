/**
 * Database Connection — Hybrid Windows Auth strategy.
 *
 * Strategy:
 *   1. Try msnodesqlv8 (native driver) for true Windows Integrated Auth
 *      — uses current Windows session, no credentials needed.
 *   2. If msnodesqlv8 is not available, fall back to tedious NTLM auth
 *      — requires domain, username, and password from the user.
 */
import * as sql from 'mssql';

let pool: sql.ConnectionPool | null = null;
let usingNativeDriver = false;

/**
 * Detect whether msnodesqlv8 is available at runtime.
 */
function isNativeDriverAvailable(): boolean {
  try {
    require.resolve('msnodesqlv8');
    // Also verify the mssql/msnodesqlv8 sub-module is available
    require.resolve('mssql/msnodesqlv8');
    return true;
  } catch {
    return false;
  }
}

export function getNativeDriverStatus(): boolean {
  return isNativeDriverAvailable();
}

export interface ConnectionOptions {
  server: string;
  database: string;
  /** Required only for NTLM fallback */
  domain?: string;
  /** Required only for NTLM fallback */
  username?: string;
  /** Required only for NTLM fallback */
  password?: string;
}

/**
 * Connect to SQL Server using the best available auth method.
 * Returns the connected pool.
 */
export async function connect(opts: ConnectionOptions): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  if (isNativeDriverAvailable()) {
    // Use mssql/msnodesqlv8 sub-module for true Windows Integrated Auth.
    // Pass a raw ODBC connection string to match exactly what SSMS uses.
    const nativeSql = require('mssql/msnodesqlv8');
    const connectionString =
      `Driver={ODBC Driver 17 for SQL Server};` +
      `Server=${opts.server};` +
      `Database=${opts.database};` +
      `Trusted_Connection=yes;` +
      `Encrypt=yes;` +
      `TrustServerCertificate=yes;`;

    const config = {
      connectionString,
      pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
      requestTimeout: 60_000,
      connectionTimeout: 30_000,
    };

    pool = await new nativeSql.ConnectionPool(config).connect();
    usingNativeDriver = true;
    return pool!;
  }

  // Fallback: tedious with NTLM authentication
  if (!opts.domain || !opts.username || !opts.password) {
    throw new Error(
      'msnodesqlv8 is not available. NTLM fallback requires domain, username, and password.'
    );
  }

  const config: sql.config = {
    server: opts.server,
    database: opts.database,
    authentication: {
      type: 'ntlm',
      options: {
        domain: opts.domain,
        userName: opts.username,
        password: opts.password,
      },
    },
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
    requestTimeout: 60_000,
  };

  pool = await new sql.ConnectionPool(config).connect();
  usingNativeDriver = false;
  return pool;
}

/**
 * Execute a SQL query and return results.
 */
export async function query(sqlText: string): Promise<sql.IResult<any>> {
  if (!pool || !pool.connected) {
    throw new Error('Not connected. Call connect() first.');
  }
  return pool.request().query(sqlText);
}

/**
 * Execute a SQL query with parameters.
 */
export async function queryWithParams(
  sqlText: string,
  params: Record<string, { type: any; value: any }>
): Promise<sql.IResult<any>> {
  if (!pool || !pool.connected) {
    throw new Error('Not connected. Call connect() first.');
  }
  const request = pool.request();
  for (const [name, param] of Object.entries(params)) {
    request.input(name, param.type, param.value);
  }
  return request.query(sqlText);
}

/**
 * Close the connection pool.
 */
export async function disconnect(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

/**
 * Returns whether the current connection is using the native driver.
 */
export function isUsingNativeDriver(): boolean {
  return usingNativeDriver;
}
