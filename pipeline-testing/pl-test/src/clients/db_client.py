"""
SQL Server database client for connecting to Raw Staging, Staged, Carity,
and TestVerification databases.
"""
import pyodbc
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
from config.settings import (
    RAW_STAGING_DB_HOST, RAW_STAGING_DB_PORT, RAW_STAGING_DB_NAME,
    RAW_STAGING_DB_USER, RAW_STAGING_DB_PASSWORD,
    STAGED_DB_HOST, STAGED_DB_PORT, STAGED_DB_NAME,
    STAGED_DB_USER, STAGED_DB_PASSWORD,
    CARITY_DB_HOST, CARITY_DB_PORT, CARITY_DB_NAME,
    CARITY_DB_USER, CARITY_DB_PASSWORD,
    VERIFICATION_DB_HOST, VERIFICATION_DB_PORT, VERIFICATION_DB_NAME,
    VERIFICATION_DB_USER, VERIFICATION_DB_PASSWORD,
)


class DatabaseClientError(Exception):
    """Raised when a database operation fails."""
    pass


class DatabaseClient:
    """
    Manages connections to SQL Server databases used in the pipeline.
    Provides query execution, parameterized inserts, and connection pooling.
    """

    # Named database targets
    RAW_STAGING = "raw_staging"
    STAGED = "staged"
    CARITY = "carity"
    VERIFICATION = "verification"

    _connection_configs = {
        RAW_STAGING: {
            "host": RAW_STAGING_DB_HOST,
            "port": RAW_STAGING_DB_PORT,
            "database": RAW_STAGING_DB_NAME,
            "user": RAW_STAGING_DB_USER,
            "password": RAW_STAGING_DB_PASSWORD,
        },
        STAGED: {
            "host": STAGED_DB_HOST,
            "port": STAGED_DB_PORT,
            "database": STAGED_DB_NAME,
            "user": STAGED_DB_USER,
            "password": STAGED_DB_PASSWORD,
        },
        CARITY: {
            "host": CARITY_DB_HOST,
            "port": CARITY_DB_PORT,
            "database": CARITY_DB_NAME,
            "user": CARITY_DB_USER,
            "password": CARITY_DB_PASSWORD,
        },
        VERIFICATION: {
            "host": VERIFICATION_DB_HOST,
            "port": VERIFICATION_DB_PORT,
            "database": VERIFICATION_DB_NAME,
            "user": VERIFICATION_DB_USER,
            "password": VERIFICATION_DB_PASSWORD,
        },
    }

    def __init__(self):
        self._connections: Dict[str, pyodbc.Connection] = {}

    def _build_connection_string(self, target: str) -> str:
        """Build an ODBC connection string for the specified database target."""
        import os
        config = self._connection_configs.get(target)
        if config is None:
            raise DatabaseClientError(f"Unknown database target: {target}")

        driver = os.environ.get("ODBC_DRIVER", "ODBC Driver 18 for SQL Server")
        return (
            f"DRIVER={{{driver}}};"
            f"SERVER={config['host']},{config['port']};"
            f"DATABASE={config['database']};"
            f"UID={config['user']};"
            f"PWD={config['password']};"
            f"TrustServerCertificate=yes;"
            f"Connection Timeout=30;"
        )

    def get_connection(self, target: str) -> pyodbc.Connection:
        """
        Get or create a connection to the specified database target.

        Args:
            target: One of RAW_STAGING, STAGED, CARITY, VERIFICATION.

        Returns:
            An active pyodbc Connection object.
        """
        if target in self._connections:
            try:
                # Test if connection is still alive
                self._connections[target].cursor().execute("SELECT 1")
                return self._connections[target]
            except (pyodbc.Error, pyodbc.ProgrammingError):
                # Connection is dead, remove it
                self._connections.pop(target, None)

        try:
            conn_str = self._build_connection_string(target)
            conn = pyodbc.connect(conn_str)
            self._connections[target] = conn
            return conn
        except pyodbc.Error as e:
            raise DatabaseClientError(
                f"Failed to connect to {target} database: {e}"
            ) from e

    @contextmanager
    def cursor(self, target: str):
        """
        Context manager that yields a cursor for the specified database.
        Commits on success, rolls back on exception.

        Usage:
            with db_client.cursor(DatabaseClient.CARITY) as cur:
                cur.execute("SELECT * FROM ...")
        """
        conn = self.get_connection(target)
        cur = conn.cursor()
        try:
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cur.close()

    def execute_query(self, target: str, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """
        Execute a SELECT query and return results as a list of dictionaries.

        Args:
            target: Database target (RAW_STAGING, STAGED, CARITY, VERIFICATION).
            query: SQL query string (use ? for parameters).
            params: Optional tuple of parameter values.

        Returns:
            List of row dictionaries (column_name → value).
        """
        with self.cursor(target) as cur:
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            return [dict(zip(columns, row)) for row in rows]

    def execute_scalar(self, target: str, query: str, params: tuple = None) -> Any:
        """
        Execute a query and return a single scalar value.

        Args:
            target: Database target.
            query: SQL query that returns a single value.
            params: Optional parameters.

        Returns:
            The scalar value from the first column of the first row, or None.
        """
        with self.cursor(target) as cur:
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)
            row = cur.fetchone()
            return row[0] if row else None

    def execute_non_query(self, target: str, query: str, params: tuple = None) -> int:
        """
        Execute an INSERT, UPDATE, or DELETE statement.

        Args:
            target: Database target.
            query: SQL statement.
            params: Optional parameters.

        Returns:
            Number of rows affected.
        """
        with self.cursor(target) as cur:
            if params:
                cur.execute(query, params)
            else:
                cur.execute(query)
            return cur.rowcount

    def execute_many(self, target: str, query: str, param_list: List[tuple]) -> int:
        """
        Execute a parameterized statement for multiple rows (batch insert).

        Args:
            target: Database target.
            query: SQL statement with ? placeholders.
            param_list: List of tuples, one per row.

        Returns:
            Total number of rows affected.
        """
        with self.cursor(target) as cur:
            cur.fast_executemany = True
            cur.executemany(query, param_list)
            return cur.rowcount

    def execute_stored_procedure(self, target: str, proc_name: str,
                                 params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Execute a stored procedure and return results.

        Args:
            target: Database target.
            proc_name: Fully qualified stored procedure name.
            params: Dictionary of parameter names → values.

        Returns:
            List of row dictionaries if the proc returns a result set, else empty list.
        """
        with self.cursor(target) as cur:
            if params:
                param_str = ", ".join(f"@{k} = ?" for k in params.keys())
                query = f"EXEC {proc_name} {param_str}"
                cur.execute(query, tuple(params.values()))
            else:
                cur.execute(f"EXEC {proc_name}")

            if cur.description:
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                return [dict(zip(columns, row)) for row in rows]
            return []

    def test_connection(self, target: str) -> bool:
        """
        Test connectivity to the specified database.

        Returns:
            True if connection succeeds, False otherwise.
        """
        try:
            self.get_connection(target)
            return True
        except DatabaseClientError:
            return False

    def close_all(self) -> None:
        """Close all open database connections."""
        for target, conn in self._connections.items():
            try:
                conn.close()
            except Exception:
                pass
        self._connections.clear()

    def __del__(self):
        self.close_all()
