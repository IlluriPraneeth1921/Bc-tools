"""
pl-test: FastAPI application entry point.
Data pipeline verification tool for WI DHS Medicaid Provider File and future interfaces.
"""
from fastapi import FastAPI
from src.core.config import settings
from src.api import test_runs, files, compare, cleanup

app = FastAPI(
    title="pl-test",
    description="Data pipeline verification tool — verifies correctness of file processing across 4 pipeline stages.",
    version="0.1.0",
)

app.include_router(test_runs.router, prefix="/api/test-runs", tags=["Test Runs"])
app.include_router(files.router, prefix="/api/files", tags=["File Management"])
app.include_router(compare.router, prefix="/api/compare", tags=["Comparison"])
app.include_router(cleanup.router, prefix="/api/cleanup", tags=["Cleanup"])


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
