"""
pl-test: FastAPI application entry point.
Data pipeline verification tool for WI DHS Medicaid Provider File and future interfaces.
"""
import logging
from fastapi import FastAPI
from src.core.config import settings
from src.core.database import db, DatabaseManager
from src.core.db_migration import ensure_test_verification_tables
from src.api import test_runs, files, compare, cleanup

logger = logging.getLogger(__name__)

app = FastAPI(
    title="pl-test",
    description="Data pipeline verification tool — verifies correctness of file processing across 4 pipeline stages.",
    version="0.1.0",
)

app.include_router(test_runs.router, prefix="/api/test-runs", tags=["Test Runs"])
app.include_router(files.router, prefix="/api/files", tags=["File Management"])
app.include_router(compare.router, prefix="/api/compare", tags=["Comparison"])
app.include_router(cleanup.router, prefix="/api/cleanup", tags=["Cleanup"])


@app.on_event("startup")
async def startup_event():
    """On startup, check Interface DB for TestVerification schema/tables and create if missing."""
    try:
        ensure_test_verification_tables()
        logger.info("TestVerification schema/tables verified.")
    except Exception as e:
        logger.warning(f"Auto-migration check failed (non-fatal): {e}")


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "pl-test",
        "version": "0.1.0",
        "status": "running",
        "database_server": settings.DB_SERVER,
        "interface_db": settings.INTERFACE_DB_NAME,
        "carity_db": settings.CARITY_DB_NAME,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}


@app.get("/api/db-status", tags=["Health"])
async def db_status():
    """Return database connection info and connectivity status for both databases."""
    interface_ok = False
    carity_ok = False
    interface_error = None
    carity_error = None

    try:
        db.get_connection(DatabaseManager.INTERFACE)
        interface_ok = True
    except Exception as e:
        interface_error = str(e)

    try:
        db.get_connection(DatabaseManager.CARITY)
        carity_ok = True
    except Exception as e:
        carity_error = str(e)

    return {
        "interface_db": {
            "server": settings.DB_SERVER,
            "database": settings.INTERFACE_DB_NAME,
            "connected": interface_ok,
            "error": interface_error,
        },
        "carity_db": {
            "server": settings.DB_SERVER,
            "database": settings.CARITY_DB_NAME,
            "connected": carity_ok,
            "error": carity_error,
        },
    }
