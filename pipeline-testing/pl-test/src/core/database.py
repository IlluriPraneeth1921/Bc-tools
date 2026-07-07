"""
Database connection management.
Provides connection pooling and query execution for both Interface and Carity databases.
"""
import pyodbc
from typing import List, Dict, Any, Optional
from contextlib import contextmanager
from src.core.config import settings


class DatabaseManager:
    """Manages pyodbc connections to the Interface and Carity databases."""

    INTERFACE = "interface"
    CARITY = "carity"

    def __init__(self):
        self._connections: Dict[str, pyodbc.Connection] = {}

    def _get_conn_str(self, target: str) -> str:
        if target == self.INTERFACE:
            return settings.interface_db_conn_str
        elif target == self.CARITY:
            return settings.carity_db_conn_str
        else:
            raise ValueError(f"Unknown database target: {target}")

    def get_connection(self, target: str) -> pyodbc.Connection:
        """Get or create a connection to the specified database."""
        if target in self._connections:
            try:
                self._connections[target].cursor().execute("SELECT 1")
                return self._connections[target]
            except (pyodbc.Error, pyodbc.ProgrammingError):
                self._connections.pop(target, None)

        conn = pyodbc.connect(self._get_conn_str(target))
        self._connections[target] = conn
        return conn

    @contextmanager
    def cursor(self, target: str):
        """Context manager yielding a cursor. Commits on success, rolls back on error."""
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
        """Execute SELECT, return list of dicts."""
        with self.cursor(target) as cur:
            cur.execute(query, params or ())
            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]

    def execute_scalar(self, target: str, query: str, params: tuple = None) -> Any:
        """Execute query, return single value."""
        with self.cursor(target) as cur:
            cur.execute(query, params or ())
            row = cur.fetchone()
            return row[0] if row else None

    def execute_non_query(self, target: str, query: str, params: tuple = None) -> int:
        """Execute INSERT/UPDATE/DELETE, return rowcount."""
        with self.cursor(target) as cur:
            cur.execute(query, params or ())
            return cur.rowcount

    def execute_many(self, target: str, query: str, param_list: List[tuple]) -> int:
        """Batch insert/update. Disables fast_executemany to avoid issues with NVARCHAR(MAX) columns."""
        with self.cursor(target) as cur:
            cur.executemany(query, param_list)
            return cur.rowcount

    def close_all(self):
        for conn in self._connections.values():
            try:
                conn.close()
            except Exception:
                pass
        self._connections.clear()


# Singleton instance
db = DatabaseManager()
