"""
Application configuration using pydantic-settings.
Reads from environment variables with .env file support.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # Database server (single server hosts both DBs)
    DB_SERVER: str = "mcs-mst-carity-v1-04065-appdb.cw1uwwm8ou9t.us-east-1.rds.amazonaws.com"

    # Database names
    INTERFACE_DB_NAME: str = "WiDHS.Qc.Interface.Carity.ToolTesting"
    CARITY_DB_NAME: str = "WiDHS.Qc.Carity.ToolTestig"

    # Authentication (Windows Integrated by default)
    DB_USE_TRUSTED_CONNECTION: bool = True
    DB_USERNAME: str = ""
    DB_PASSWORD: str = ""

    # Data isolation
    MCD_ID_PREFIX: str = "000000000"

    # Test data directory (relative to workspace root)
    DATA_DIR: str = ""

    # Interface type for ICD-D06
    DEFAULT_INTERFACE_TYPE: str = "icd_d06"

    # ICD-D12: CustomFormDefinitionKey for FSIA forms in Carity DB
    D12_CUSTOM_FORM_DEFINITION_KEY: str = "964B0DFB-ED99-4F5A-8449-B43C013B9062"

    # ODBC Driver version (18 in container, 17 or 18 locally)
    ODBC_DRIVER: str = "ODBC Driver 18 for SQL Server"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

    def get_connection_string(self, database: str) -> str:
        """Build ODBC connection string for the given database."""
        if self.DB_USE_TRUSTED_CONNECTION:
            return (
                f"DRIVER={{{self.ODBC_DRIVER}}};"
                f"SERVER={self.DB_SERVER};"
                f"DATABASE={database};"
                f"Trusted_Connection=yes;"
                f"TrustServerCertificate=yes;"
                f"Connection Timeout=30;"
            )
        else:
            return (
                f"DRIVER={{{self.ODBC_DRIVER}}};"
                f"SERVER={self.DB_SERVER};"
                f"DATABASE={database};"
                f"UID={self.DB_USERNAME};"
                f"PWD={self.DB_PASSWORD};"
                f"TrustServerCertificate=yes;"
                f"Connection Timeout=30;"
            )

    @property
    def interface_db_conn_str(self) -> str:
        return self.get_connection_string(self.INTERFACE_DB_NAME)

    @property
    def carity_db_conn_str(self) -> str:
        return self.get_connection_string(self.CARITY_DB_NAME)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
